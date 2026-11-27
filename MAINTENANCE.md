# tongji 维护手册

面向“这台机器上这套 tongji 插件”的运维动作：数据在哪、怎么备份、怎么升级、怎么回滚、坏了怎么查。所有结论都标了出处；查不到的写「未验证」，不补齐、不猜测。

## 0. 当前口径（2026-11-28 实测）

| 项 | 值 | 证据 |
| --- | --- | --- |
| 插件版本 | `0.1.52` | `package.json:3`、`README.md:7` |
| 代码基线 | `cbccac0`（`main`，文档补齐提交；其父提交 `810c79a`） | `git rev-parse --short HEAD` |
| 最新 git tag | `v0.1.52`（共 51 个 tag，`v0.1.41`–`v0.1.51` 均已发布） | `git tag --list \| sort -V \| tail` |
| 运行中的 DSH | `0.2.3-alpha.2` | `PlistBuddy -c 'Print :CFBundleShortVersionString' "/Applications/DeepSeek Harness.app/Contents/Info.plist"` |
| 构建期 DSH 依赖 | `0.2.2-rc.5` | `package.json:33-40` |
| 代码内置最低基线 | `0.2.0-rc.2` | `src/ui/shared/version.ts:1` |
| 数据根 | `/Users/ning/.dsh`（`DSH_HOME` 已设置） | 环境变量实测 + `src/ui/host/overviewCache.ts:106-109` |

构建期依赖与运行版本不一致是本仓库的已知状态（`README.md:134`、`docs/ACCEPTANCE.md:18-22`），不是这次才出现的偏差。

## 1. 数据在哪

### 1.1 唯一的持久化数据文件：`overview-cache.v1.json`

跨会话总览的折叠结果写在 `<DSH_HOME>/storages/tongji/overview-cache.v1.json`。

- 路径推导：`DSH_HOME` 有值就用它，否则用 `~/.dsh`，再接 `storages/tongji/overview-cache.v1.json` —— `src/ui/host/overviewCache.ts:102-110`。
- 文件名固定 `overview-cache.v1.json`，口径版本放在文件里的 `format` 字段而不是文件名 —— `src/ui/host/overviewCache.ts:13-14`；当前 `format: 2`，`format: 1` 的行会被整份丢弃 —— 同上 `:9-11`、`:194-203`。
- 文件结构：`{ format, savedAt, sessions[] }`，每条是某会话的 `timeline`（上下文/用量汇总）、`activity`（按日活动）、`identity`（源会话日志的 path/size/mtime）—— `src/ui/host/overviewCache.ts:255`、`:145-192`。
- 上限：最多 4000 条、整份文件最多 24 MB，超限按 `updatedAt` 从新到旧保留 —— `src/ui/host/overviewCache.ts:23-25`、`:237-247`（`README.md:63` 同口径）。
- 写入方式：默认 `merge`（先读盘上已有记录，再覆盖本次刷新的会话），先写 `*.tmp` 再 `rename` 原子替换 —— `src/ui/host/overviewCache.ts:249-266`；`save()` 有 2 秒 debounce —— `:16`、`:370-390`。
- 只在需要时写：总览路由在 `identityMode` 且有 dirty/rebuilt 时才调用 `saveCache` —— `src/ui/host/overview.ts:481`；空闲 20 秒释放内存并 `flush` —— `src/ui/host/overview.ts:54`、`:240-257`、`:266-270`。

本机实测（`node` 读文件头得到）：**369,944 字节 / 178 条 / `format: 2` / `savedAt` 2026-11-26T00:39:46Z**，其中 178 条的 `identity` 全为 `null` —— 也就是说下次打开面板这些会话都要按需重建（`src/ui/host/overviewCache.ts:309-312`）。

### 1.2 图片预览缓存：`<DSH_HOME>/cache/tongji/previews`

打开带图片的消息时，插件把宿主的图片对象硬链接（失败则复制）到预览目录，供面板直接引用 —— `src/ui/host/attachment.ts:68-72`、`:104-113`。

- 目录由宿主图片对象的路径反推，形状必须是 `.../attachments/v1/...`，否则不生成 —— `src/ui/host/attachment.ts:68-72`。
- 清理规则：目录内子项 7 天 TTL（`PREVIEWS_TTL_MS`）、最多 512 个目录（`PREVIEWS_MAX_DIRS`）、每次生成后延迟 60 秒清扫 —— `src/ui/host/attachment.ts:12-16`、`:147-181`。
- 本机实测：`/Users/ning/.dsh/cache/tongji` **当前不存在**（还没产生过预览），属于正常状态而非故障。

### 1.3 只在内存里的东西（重启即丢）

Host 进程内没有第二份落盘数据。内存结构有：

| 结构 | 上限 | 证据 |
| --- | --- | --- |
| 总览 feed：`feed.sessions` / `warm` / `feed.rows` | 条目数＝DSH 会话列表里现存会话，**没有字节上限**；空闲 20 秒整体释放 | `src/ui/host/overview.ts:224`、`:230`、`:240-248`、`:54` |
| 请求结果去重表 `feed.served` | 128 个 key | `src/ui/host/overview.ts:64`、`:524-531` |
| `facts` 状态缓存 | 4 条 | `src/ui/host/facts.ts:32`、`:240-244` |
| `detail` 载荷缓存 | 4 条 | `src/ui/host/detail.ts:15`、`:80` |
| `delta` 状态缓存 | 2 条 | `src/ui/host/delta.ts:82` |
| `commands` 状态缓存 | 2 条 | `src/ui/host/commandPages.ts:20`、`:104-106` |
| `fleet` 折叠缓存 | 32 条 / 4 MB（唯一带字节上限的） | `src/ui/host/fleet.ts:430-431`、`:572-575` |

公共行为：按最近使用排序、超限先淘汰最旧（`src/ui/host/foldCache.ts:36-48`、`:55-66`），空闲 20 秒整表 `clear()`（`:18-34`），插件卸载时再清一次（`:49-53`）。

**「重启即丢、删缓存无害」的依据**：

1. `src/` 里唯一的 `writeFile` 调用点就是总览缓存的 `NODE_FS`（`src/ui/host/overviewCache.ts:47`、`:259`）；上面这些 Map 没有对应的落盘代码。
2. 缓存文件缺失、读失败、JSON 解析失败、`format` 不匹配，四条路径都直接返回空集而不是抛错 —— `src/ui/host/overviewCache.ts:229-235`、`:286-291`、`:194-203`。
3. 缓存内容全部由 DSH 的会话日志/投影推导（`overview.ts` 通过 `sessionQuery.listSessions` 与 `sessionProjections` 构建行，`src/ui/host/overview.ts:294-302`、`:475`），删掉只会触发重新折叠，不丢用户数据。

注意：`README.md:136` 说这份内存折叠缓存「约 5 MB」，仓库里没有对应常量，本次也没有复测内存占用——按未验证处理（见第 6 节）。

### 1.4 配置写在哪

- 插件自身不写配置文件：`src/` 内没有读写插件配置的代码路径。
- 插件页配置卡的每次修改都交给宿主的 `configForms` scope 落盘（`SettingsScopeLike.set` —— `src/ui/client/settings.ts:9-13`、`:175-189`），**具体落盘文件位置未验证**。
- profile 侧还有一层默认值：`~/.dsh/profiles/desktop/cordis.patch.yml:672-677` 显式写了 `defaultPlacement: all`，被旧值归一化成 `show`（`src/ui/host/config.ts:40-41`、`src/ui/client/settings.ts:77-81`）。排查入口开关时这层优先级要看。
- `promptPrefix` / `promptSuffix` 也是配置：会把文本拼到所有代理（含子代理）的系统提示词首尾 —— `src/ui/host/promptInjection.ts:35-53`；这一项改动的影响面比统计功能大得多。

## 2. 备份

只需要备份 1.1 那一个文件；1.2 的预览缓存是可再生的派生文件，不必备份。缓存本身也是派生数据，备份的价值是省掉重启后的重建时间，不是保住业务数据。

### 2.1 备份步骤

1. 完全退出 DSH（⌘Q）。运行中直接复制也能成功（写入是 `tmp` + `rename`），但 2 秒 debounce 意味着最近两秒的记录可能还没落盘（`src/ui/host/overviewCache.ts:16`、`:249-266`）。
2. 执行备份（路径用 `DSH_HOME` 守卫，避免拷错根）：

```sh
set -euo pipefail
ROOT="${DSH_HOME:-$HOME/.dsh}"
SRC="$ROOT/storages/tongji/overview-cache.v1.json"
DEST="$HOME/Desktop/tongji-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
if [ -f "$SRC" ]; then cp -p "$SRC" "$DEST/"; else echo "no cache at $SRC"; fi
```

3. 在同一个终端继续（`$DEST` 沿用上一步），校验备份可解析（不是 0 字节、不是半截 JSON）：

```sh
node -e "const j=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log('format',j.format,'sessions',j.sessions.length,'savedAt',new Date(j.savedAt).toISOString())" "$DEST/overview-cache.v1.json"
```

4. 顺带留一份配置面证据（配置本体在宿主里，位置未验证，至少记下 profile 的链接与 patch 覆盖）：

```sh
cp -p ~/.dsh/profiles/desktop/package.json "$DEST/profile-package.json"
grep -n -A5 '^- id: tongji' ~/.dsh/profiles/desktop/cordis.patch.yml > "$DEST/tongji-patch.txt" || true
```

### 2.2 恢复步骤

1. ⌘Q 退出 DSH。
2. `mkdir -p "$ROOT/storages/tongji"` 后把备份的 `overview-cache.v1.json` 复制回去。
3. 若备份来自旧版本，先确认 `format` 与当前代码一致：当前是 `2`（`src/ui/host/overviewCache.ts:11`）。不一致也不会坏，只会整份丢弃重建（`:194-203`）。
4. 重开 DSH。

## 3. 升级

### 3.1 本机改完源码后生效（四步）

1. `cd ~/.dsh/plugins/tongji`
2. `npm run build`（tsdown：`src/` → `lib/`，`package.json:19`；不要手改 `lib/`）
3. `npm run verify`（= `check` + `typecheck` + `test`，`package.json:23`），以实际输出的 `fail 0` 为准
4. ⌘Q 完全退出 DSH 再打开；插件由宿主加载，重开才生效（`README.md:97`、`AGENTS.md` §4）。不重启进程就不会加载新代码。

### 3.2 新机器 / 新 profile 安装

1. 放代码：`git clone https://github.com/yueyexiayu/dsh-tongji.git ~/.dsh/plugins/tongji`（`README.md:77`）；目录已存在时不要覆盖（`README.md:80`）。
2. 在 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 里加 `"tongji": "link:/Users/<用户名>/.dsh/plugins/tongji"`（`README.md:84-88`）。本机实测已在第 20 行：`~/.dsh/profiles/desktop/package.json:20`，`~/.dsh/profiles/desktop/node_modules/tongji` 是指向 `../../../plugins/tongji` 的符号链接。
3. 把 `"tongji"` 加进同文件 `dsh.profile.bundles`（`README.md:90`）；本机实测在 `~/.dsh/profiles/desktop/package.json:36`。
4. `cd ~/.dsh/profiles/desktop && pnpm install`（`README.md:92-95`）。
5. ⌘Q 重开。进入会话后「统计」在对话右侧会话面板分栏里，用标题栏的会话面板开关显隐（`README.md:97`）。

### 3.3 升级 DSH 之后必须重新对齐

构建期依赖钉在 `0.2.2-rc.5`（`package.json:33-40`），运行中的宿主已经是 `0.2.3-alpha.2`（Info.plist 实测），`README.md:134` 明确要求升级 DSH 后重新对齐并重建：

1. 记录新版本：`/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "/Applications/DeepSeek Harness.app/Contents/Info.plist"`。
2. 把 `package.json` 中 `@deepseek-ai/*` 的 `0.2.2-rc.5` 全部改成与宿主一致（`package.json:33-40`）。
3. `npm install`（或 `pnpm install`）让 `node_modules` 跟上。
4. `npm run build && npm run verify`，失败就先修类型/测试再谈界面。
5. ⌘Q 重开，按 3.4 逐项点验。

低于内置基线 `0.2.0-rc.2`（`src/ui/shared/version.ts:1`）时，插件会注册降级投影后**提前 return**（`src/ui/host/index.ts:47-52`），后面的 detail / delta / facts / commands / heads / overview / snapshot / 系统提示词注入全部不注册（`src/ui/host/index.ts:53-71`）。看到「面板在、数据空」，先查版本就是这个原因。

### 3.4 升级后 smoke 清单

| 检查点 | 预期 | 依据 |
| --- | --- | --- |
| `/api/tongji/version` | `current` 是插件版本，`harness` 是宿主版本（探测不到时为 `null`） | `src/ui/host/versionRoute.ts:19-31` |
| 对话右侧会话面板 | 出现「统计」分栏 | `src/ui/client/sessionPanel.ts:25`、`README.md:19` |
| 统计面板标签页 | 每轮用量 5 秒轮询、关闭即停 | `README.md:64` |
| 编队标签页 | 子代理树与 Agent 网络有数据 | `README.md:53` |
| 上下文洞察 | 今日/7 天/30 天总览有数 | `README.md:54` |
| 后台任务卡片 | 有运行中/后台作业时列出 | `README.md:48`；真实渲染未经复测，见第 6 节 |

## 4. 回滚

### 4.1 数据回滚：删掉重建

缓存是派生物，出问题直接删。**在 DSH 关闭时删**，避免运行中的进程把内存里的旧行再写回来（`src/ui/host/overview.ts:240-248`、`:266-270`）。

```sh
ROOT="${DSH_HOME:-$HOME/.dsh}"
printf '%s\n' "将删除：" "$ROOT/storages/tongji" "$ROOT/cache/tongji"
rm -rf "$ROOT/storages/tongji" "$ROOT/cache/tongji"
```

预期：重开 DSH 后目录被重新创建，总览先显示少量会话、随后逐步补全（折叠走 `backfill`，见 `src/ui/host/backfill.ts:461-522`）。残留的 `overview-cache.v1.json.tmp` 可以一并删除（`src/ui/host/overviewCache.ts:256-265`）。

### 4.2 回滚代码：按 tag 或按提交

先看清现实：**最新 tag 是 `v0.1.52`，与当前 `package.json` 版本一致**（`git tag --list | sort -V | tail` → `v0.1.52`）。要退回上一版用 `v0.1.51`（`git rev-list --count v0.1.51..HEAD` = 1 个提交，即本次文档补齐）。注意：本机 clone 若没跑过 `git fetch --tags`，`git tag` 只会显示到 `v0.1.40`，回滚前先同步 tag，否则会误以为「最新只有 0.1.40」。

1. 别把工作区改动弄丢——本仓库在本机长期是「脏工作区」：`lib/*` 被重新构建过、文档轮次里 `README.md` / `package.json` / `docs/*` 也在改。回滚前先自己看一眼当下状态，别照抄别人的清单：

```sh
cd ~/.dsh/plugins/tongji
git status --short
git stash push -u -m "pre-rollback $(date +%Y%m%d-%H%M%S)"
```

2. 选目标版本：
   - 回到最新 tag：`git checkout v0.1.52`；退回上一版用 `git checkout v0.1.51`
   - 回到某个更近的提交：从 `git log --oneline` 里按提交信息里的版本号挑，例如 `git checkout a819242`（该提交信息为 `fix: keep stats panel docked at default window sizes (v0.1.50)`）
3. 重建产物（`lib/` 是构建产物，不能手改，`AGENTS.md` §3）：`npm run build && npm run verify`。若目标 tag 的 `devDependencies` 与现有 `node_modules` 不一致，先在该提交上 `npm install`。
4. ⌘Q 完全退出 DSH 再打开，按 3.4 点验。
5. 回到主线：`git checkout main && git stash pop`，再 `npm run build` 一次让 `lib/` 与源码对齐。

### 4.3 回滚后的缓存兼容

缓存带口径版本：当前代码只认 `format: 2`（`src/ui/host/overviewCache.ts:11`），旧格式整份丢弃后重建（`:194-203`）。因此从 0.1.52 回滚到更早版本**不需要手工删缓存**；反过来旧缓存被新代码读到也一样自动重建。要立刻回到干净状态就按 4.1 删。

### 4.4 彻底停用（不是回滚版本，是摘掉插件）

1. ⌘Q 退出 DSH。
2. 在 `~/.dsh/profiles/desktop/package.json` 删掉 `"tongji": "link:..."`（`~/.dsh/profiles/desktop/package.json:20`）与 `dsh.profile.bundles` 里的 `"tongji"`（`:36`）。
3. `cd ~/.dsh/profiles/desktop && pnpm install`；顺手清掉 `cordis.patch.yml:672-677` 的 tongji 段。
4. 可选：按 4.1 删缓存目录。
5. 重开 DSH，确认面板入口消失。

## 5. 故障排查

每条按「现象 → 判断路径 → 处理」写，判断路径全部落在源码上。宿主日志由插件通过 `logger.warn/debug` 写入，日志文件位置未验证（见第 6 节），能拿到的证据以路由返回与配置文件为主。

### T1 版本探测失败：`/api/tongji/version` 的 `harness` 是 `null`

- 现象：接口返回 `harness: null`，宿主日志出现一条 `tongji: 未能探测运行中的 DSH 版本…`。
- 判断路径：探测顺序是「安装包清单（`app.asar/dsh/package.json`、`app/dsh/package.json`、`Resources/app.asar/dsh/package.json`）→ macOS 包 `Info.plist` → 运行中模块树 → `dshHomePath` 解析」，全失败才写 warn 并返回 `undefined` —— `src/ui/host/version.ts:140-159`、`:96-128`、`:161-170`；路由把 `undefined` 折成 `null` —— `src/ui/host/versionRoute.ts:26`。
- 实测旁证：用普通 `node` 读 `app.asar/dsh/package.json` 会报 `ENOTDIR`（`app.asar` 是一个文件），所以装包探测只有 Electron 主进程读得到 —— 这条限制写在 `src/ui/host/version.ts:91-95`。`Info.plist` 那条能读到 `0.2.3-alpha.2`。
- 处理：先确认 `Info.plist` 能读（命令见 3.3 第 1 步）；返回 `null` 不影响面板数据，只影响版本提示与降级判定。**注意 `undefined` ≠ 降级**：只有探测到版本且低于基线才走降级分支（`src/ui/host/index.ts:47`）。

### T2 面板在、数据全空（低版本 DSH）

- 现象：入口能点开，但用量/上下文/命令/总览都没有数据。
- 判断路径：宿主版本低于 `0.2.0-rc.2` 时，`apply` 注册完三个降级投影就 `return`（`src/ui/host/index.ts:47-52`），其后的 detail / delta / facts / commands / heads / overview / snapshot / 提示词注入都不会注册（`:53-71`）。降级投影里带着 `unsupported: { current, minimum }`（`src/ui/host/fallback.ts:35-46`），前端据此显示「不支持」。
- 处理：升级 DSH 到 ≥ `0.2.0-rc.2`（当前实测 `0.2.3-alpha.2`），重开。

### T3 对话右侧不出现「统计」分栏

- 现象：其它入口都在，只有右侧分栏（或只出现对话内统计卡片）。
- 判断路径，按顺序查：
  1. `statsSection` 必须是 `show` —— 分栏注册条件在 `src/ui/client/sessionPanel.ts:25`，默认 `show` 在 `src/ui/host/config.ts:51`。
  2. `statsDock` 与 `statsSection` 二选一：`statsDock` 开启时不再注册会话面板分栏 —— `src/ui/NOTICE.md:126`，开关在 `src/ui/client/composerDock.ts:18`、`src/ui/host/config.ts:52`。
  3. profile 里可能被 patch 覆盖：本机 `cordis.patch.yml:672-677` 写着 `defaultPlacement: all`，旧值被归一化为 `show`（`src/ui/host/config.ts:40-41`、`src/ui/client/settings.ts:77-81`）。`grep -n -A5 '^- id: tongji' ~/.dsh/profiles/desktop/cordis.patch.yml` 看一眼有没有人改成 `hide`。
  4. 配置卡写入被拒时会回落到 `show` 并重绘（`src/ui/client/settings.ts:179-188`）——若界面闪一下又变回去，是宿主侧写入失败。
  5. 分栏出现但宽度/挤压不对时，问题不在开关而在样式覆盖：现行实现把 `--tongji-panel-width` 设为 `min(720px, 对话视口 × 0.375)`，并用 `!important` 覆盖 `--panel-min-width`、面板 `width`/`max-width` —— `tests/sessionPanelStyles.test.js:40-48`、`src/ui/client/styles/sessionPanel.css`、`README.md:19`、`README.md:143`。改宽度必须同时改这条测试与 README 口径。
  6. 首页没有当前会话时，面板本来就不显示会话统计（`README.md:135`），别当成故障。
- 处理：先改配置卡，再查 patch，最后 ⌘Q 重开（配置在宿主启动时读取，热改可能不生效——这一条未验证）。

### T4 推荐位变成内置条目（`degraded: true`）

- 现象：推荐位只剩 DeepSeek 一条，接口返回带 `degraded: true`。
- 判断路径：先读 `raw.githubusercontent.com/yueyexiayu/dsh-tongji/main/data/recoms.json`，失败再读 `gh-proxy.org` 镜像，每条 5 秒超时；两次都拿不到就回内置 `DEFAULT_RECOM` 并标 `degraded` —— `src/ui/host/recoms.ts:23-37`、`src/ui/shared/recoms.ts:28-49`；降级后重试间隔退到 30 秒 —— `src/ui/host/recoms.ts:9`、`:64`。图标来自 `cdn.simpleicons.org`（`src/ui/shared/recoms.ts:36`），图标挂了只是图裂。
- 处理：先确认这台机器能否直连 GitHub；能连但仍降级就查是否被代理拦。其它面板不受影响（`README.md:65`）。

### T5 错误码对不上（`dsh-context/*` 与 `tongji/*`）

- 现象：前端匹配不到错误码，或日志里出现两种前缀。
- 判断路径：`postRoute.failure()` 会把旧前缀 `dsh-context/` 归一化成 `tongji/` —— `src/ui/host/postRoute.ts:38-50`；`tongji/bad-request`（缺 `sessionId`、body 非 JSON）在 `src/ui/host/facts.ts:282`、`src/ui/host/postRoute.ts:52-58`。
- 另一套错误体不在这个体系里：`usage` 路由自己写 `{ error: { code, message, retryable } }` 并带 HTTP 状态码，`code` **不带** `tongji/` 前缀（`session-not-found` / `usage-unavailable` 等）—— `src/host/usageRoute.ts:13-26`、`:61-68`。排查时先分清是哪一族路由。
- 处理：新代码只用 `tongji/*`（`AGENTS.md` §3.7）；看到 `dsh-context/` 说明是旧路径或旧客户端，不要照着它改新代码。

### T6 面板的工作区根与会话列表不一致

- 现象：同一会话，面板显示的 cwd 和 DSH 会话列表里的根不同，切过目录后尤其明显。
- 判断路径：面板的根取自 DSH 的 `workingDirectory` 投影（跟随目录切换），DSH 自己的会话列表仍用会话头里的根 —— `src/ui/host/facts.ts:127-136`、`README.md:140`。
- 处理：以面板的 `workingDirectory` 为准判断「这一轮在哪跑」；不要拿会话头去对。切换目录后投影多久刷新本次未复测（见第 6 节）。

### T7 总览数字不动 / 重启后重建很久

- 现象：总览长时间不更新，或重开 DSH 后要等很久才有数。
- 判断路径：
  1. 复用条件是源会话日志的 `path/size/mtime` 与缓存里 `identity` 完全一致，否则该会话标记为待重建 —— `src/ui/host/overviewCache.ts:299-328`、`:332-359`。本机缓存里 178 条的 `identity` 全为 `null`，所以重启后必然全量重建（`:309-312`）。
  2. 超过 3 万条事件的会话交给**单个**后台 worker 折叠；worker 忙时 `fold()` 直接抛 `fold worker is busy`，回退到 Host 线程并写一条 warn —— `src/ui/host/backfill.ts:67`、`:468`、`:497-500`，`src/ui/host/foldWorker.ts:157-161`（单实例：`pending` 只允许一个，`:115-123`）。
  3. 折叠是分片跑的：每片 2000 事件、单块预算 150 ms、每轮工作预算 8 秒后停 2 秒 —— `src/ui/host/backfill.ts:61-70`。
  4. 缓存写盘超限会截断到最近 `updatedAt` 的 4000 条 / 24 MB —— `src/ui/host/overviewCache.ts:237-247`。
- 处理：等它跑完比删缓存强（删了要从零重建）；确实怀疑缓存坏了再按 4.1 删。看 `tongji: projection backfill skipped` 与 `worker fold ... failed` 两条 warn 区分「读不了」还是「worker 失败」。

### T8 图片预览不显示 / 旧图消失

- 现象：附件卡片图裂，或历史会话里的预览某天消失了。
- 判断路径：预览路径由宿主图片对象路径反推，形状必须是 `.../attachments/v1/...`，否则直接返回 `null`（`src/ui/host/attachment.ts:68-72`）；硬链接失败转复制，都失败则返回 `null`（`:104-117`）。子项目录超过 7 天会被清掉、超过 512 个目录按 mtime 淘汰 —— `:12-16`、`:147-181`。
- 处理：重开面板会重新生成；仍不行就查 `<DSH_HOME>/cache/tongji/previews` 的权限与磁盘空间。老会话预览消失多为 TTL 到期，属设计行为。

### T9 打开大会话时整机发卡

- 判断路径：卡顿来自三处有上限的工作——冷读切片（`SLICE_EVENTS = 2000`、`BLOCK_BUDGET_MS = 150`）、单 worker 折叠（阈值 3 万事件）、以及前端的每 5 秒轮询（`README.md:64`）。相关常量：`src/ui/host/backfill.ts:59-70`。
- 处理：关掉面板即停止轮询；把 `overviewAutoSteps` 调到 `off` 或更小值（`src/ui/host/config.ts:48`）；`maxEvents` / `maxCommands` 等 8 个上限可降（`src/ui/host/config.ts:4-13`、`README.md:118`）。

## 6. 尚未验证

照实登记，不当成已通过：

1. **真实界面只在 `0.2.3-alpha.2` 上加载验证过**；更早的实机记录针对 v0.1.13 的旧面板，未覆盖上下文视图、Agent 网络与命令面板（`README.md:133`）。
2. **后台任务卡片的真实界面渲染未在本次改动上复测**，数据层只用真实会话日志折叠验证过（`README.md:142`）。插件改动需重开 DSH 才加载，谁的改动谁负责补这一屏。
3. **本机写入了什么，只有间接证据**：`README.md:133` 说插件会写入 `~/.dsh/storages/tongji/`；源码里确实只有总览缓存会落盘（`src/ui/host/overviewCache.ts:47`、`:259`）。除此之外**是否有别处写入，未验证**。
4. **内存占用「约 5 MB」未复测**（`README.md:136`）：仓库里没有对应常量，本次也没有量过 `feed.sessions` 的实际驻留大小。
5. **低版本 DSH 的降级路径未实机验证**：只在 `0.2.3-alpha.2` 上跑过构建与测试，`docs/ACCEPTANCE.md:60` 同样登记了这一条。
6. **缓存上限只有单测覆盖**：4000 条 / 24 MB 的裁剪逻辑有 4 例测试（`tests/overviewCache.test.js:36-84`），没有实机逼近上限的记录（`docs/ACCEPTANCE.md:61`）。
7. **崩溃与写盘失败未演练**：磁盘满、无权限、`rename` 中断都只有代码里的 `try/catch` 兜底（`src/ui/host/overviewCache.ts:256-265`），没有实测（`docs/ACCEPTANCE.md:62`）。
8. **配置落盘位置未验证**：配置卡经宿主 `configForms` 写入（`src/ui/client/settings.ts:9-13`、`:175-189`），具体文件没定位到；因此「备份配置」只能备份 profile 的 `package.json` 与 `cordis.patch.yml` 片段。
9. **宿主日志文件位置未验证**：插件用 `ctx.logger.warn/debug` 写日志（如 `src/ui/host/version.ts:154-156`、`src/ui/host/backfill.ts:499`），日志落在哪、怎么翻，本次没有确认。
10. **`docs/API.md` 的逐条契约未核对**：`README.md:66` 与 `AGENTS.md` 文档清单都写「15 条」，仓库里确实注册了 15 个路由常量（含 `/api/tongji/ssh` —— `src/ui/host/sshRoute.ts:31`）。但 `docs/API.md` 里的参数/返回/错误码是否与每条路由实现逐字一致，本手册没有逐条比对。
11. **本轮未重跑验证命令**：`README.md:129` 已声明 v0.1.52 下 `npm run build` 与 `npm run verify` 通过、61 例全绿，`docs/ACCEPTANCE.md:34` 有实跑输出；本手册只做静态核对（`tests/` 下 `test(...)` 实测 61 处），没有自己重跑 `npm run verify`，也没有 build。

---

维护本文件时的规矩：新结论必须带 `文件:行` 出处；实测数字写清采集命令；查不到的进第 6 节，不要从别处抄一个有数的版本。