# 测试：在哪、怎么跑、覆盖了什么、缺什么

本页数字全部来自 2026-11-28 在本机（Node `v26.13.1`、npm `11.20.0`）的实跑与源码清点；结论后面跟出处，跑不到或没核实的写「未验证」。

## 1. 一句话现状

- 只有一个 runner：`node --test`，没有 Jest / Vitest，没有覆盖率工具，没有 CI（仓库根目录无 `.github/`，也无 `scripts/`）。
- `tests/` 下 13 个 `*.test.js`，共产出 **61 个用例**，共 1382 行；实测 `npm test` 输出 `tests 61 / pass 61 / fail 0`（本机实跑，`duration_ms 310.8`）。
- 61 例里 **52 例跑的是构建产物**（`lib/index.js`、`lib/usage.js`、`lib/client.js`），**9 例直接读 `src/`**（`taskRollup` 5 例、`conversationSurface` 2 例、`sessionPanelStyles` 2 例）。所以改完 `src/` 不 `npm run build` 就 `npm test`，绿灯只说明旧产物没坏。

## 2. 测试在哪

| 文件 | 行数 | 用例 | 测什么 |
| --- | --- | --- | --- |
| `tests/client.test.js` | 457 | 7 | 浏览器 bundle 的模块契约与用量卡片行为 |
| `tests/usage.test.js` | 186 | 10 | 用量采集（含 2 例 Host endpoint） |
| `tests/jobs.test.js` | 113 | 8 | 后台作业事件折叠 |
| `tests/sshRoute.test.js` | 104 | 4 | `/api/tongji/ssh` 路由行为 |
| `tests/sshTargets.test.js` | 93 | 7 | SSH 配置与命令行的解析 |
| `tests/overviewCache.test.js` | 83 | 4 | 总览磁盘缓存的合并与上限 |
| `tests/seedCut.test.js` | 66 | 3 | fork 继承前缀的计费裁剪 |
| `tests/conversationSurface.test.js` | 59 | 2 | 会话面板 surface 标记 hook |
| `tests/failedAgents.test.js` | 56 | 4 | 子代理失败态与 wire schema |
| `tests/sessionPanelStyles.test.js` | 48 | 2 | 会话面板样式表的关键声明 |
| `tests/taskRollup.test.js` | 42 | 5 | 任务状态徽章归并优先级 |
| `tests/version.test.js` | 40 | 3 | 宿主版本探测 |
| `tests/fold.test.js` | 35 | 2 | 生命周期切口（`session/end-seed`） |

合计 13 个文件 / 1382 行 / 61 例（`cat tests/*.test.js | wc -l` 与逐文件 `node --test` 实测一致）。

## 3. 怎么跑

### 3.1 可直接复制的命令

```sh
# 只跑测试（测试文件由 shell 通配，新增文件自动纳入）
npm test

# 等价写法
node --test tests/*.test.js

# 只跑一个文件
node --test tests/jobs.test.js

# 按用例名过滤（已实测：命中 1 例）
node --test --test-name-pattern='lifecycle cut' tests/fold.test.js

# 产物语法检查（node --check 三个产物）
npm run check

# 类型检查（tsc --noEmit，只检查 src/，见 tsconfig.json 的 include）
npm run typecheck

# 改完 src/ 后的完整链路：先构建，再 check + typecheck + test
npm run build && npm run verify
```

脚本定义在 `package.json:19-23`：`build` = `tsdown`、`check` = `node --check lib/index.js && node --check lib/usage.js && node --check lib/client.js`、`test` = `node --test tests/*.test.js`、`typecheck` = `tsc --noEmit`、`verify` = `check && typecheck && test`。

本次只亲自实测了 `npm test`（61 通过、0 失败）；`npm run verify` 整条链路（含 `tsdown` 构建、`tsc --noEmit`）本轮**未由本文档复跑**，属未验证。`README.md:129` 记录的是另一轮实测（`build` 与 `verify` 都通过、61 例），与本页的用例数一致，但整链结论请以 `docs/ACCEPTANCE.md` 的记录为准。

### 3.2 顺序上容易踩的坑

1. 测试默认 import 产物：`tests/sshTargets.test.js:8` 从 `../lib/index.js` 导入，`tests/client.test.js:12` 读 `../lib/client.js` 的文本，`tests/usage.test.js:3` 从 `../lib/usage.js` 导入。
2. `lib/` 已入库（`git ls-files lib` 返回 `index.js`、`client.js`、`usage.js`、`index.d.ts`、`usage.d.ts`，`.gitignore` 也没忽略它），所以干净克隆**能直接** `npm test`——但测的就是仓库里那份产物。
3. 改了 `src/` 必须先 `npm run build`，否则 `npm test` 通过与否跟你的改动无关。`tsdown.config.ts:220` 也写明 `lib/usage.js` 是独立产物，因为 `tests/usage.test.js` 直接吃它。

## 4. 分层：四类测试

### 4.1 产物级：浏览器 bundle 契约（`tests/client.test.js`，7 例）

不加载 TypeScript 源码，而是把 `lib/client.js` 读成字符串、切出目标函数，再放进 `node:vm` 沙箱跑（`tests/client.test.js:12` 读文件、`:179` 的 `loadPlugin` 搭假 `window.__ModuleLoader__`）。断言的是 Desktop 真正加载的那份代码：

- 模块契约：`name` 为 `tongji`、`inject` 只有 `locale` + `slots`、7 个槽位各注册一次、禁止出现 `conversation.composer.bar` 与任何 `sidebar.right.*`（`tests/client.test.js:249`）。
- `conversation.view` 的 `context` 与 `fleet` 是两个独立注册、order 不同（`:286`）；统计面板标签自报 `t:tab.panel`（`:296`）。
- 用量卡：请求 `api/tongji/usage?sessionId=…`、5 秒轮询、卸载时清定时器（`:303`）；空会话不编数字（`:383`）；畸形 payload 直接拒绝而不是补零（`:414`）；轮次/步骤表按数值排序、未归属排最后（`:442`）。

### 4.2 Host endpoint 集成（6 例）

不启真宿主，而是伪造一个最小 `ctx`：`connection.fetch.register` 收集路由、`sessionQuery.observeSession` 返回假日志，然后用真实 `Request` 调 `route.fetch`（`tests/usage.test.js:69-79`、`tests/sshRoute.test.js:23-33`）。

- `tests/usage.test.js:63`：`/api/tongji/usage` 返回聚合结果，并在结束时 dispose 会话观察；同时锁住「路由先于上游半边注册」这个顺序（注释见 `tests/usage.test.js:66-68`）。
- `tests/usage.test.js:86`：缺 `sessionId` / 未知会话返回稳定错误码并写一条 warn（错误分支对应 `src/host/usageRoute.ts:65` 的 `invalid-session-id` 400）。
- `tests/sshRoute.test.js:37`：每次请求都重读 SSH 配置。
- `tests/sshRoute.test.js:52`：面板裁掉命令列表之后，折叠仍能统计到更早的 host。
- `tests/sshRoute.test.js:73`：失败调用记为失败、同一 host 重复次数累加。
- `tests/sshRoute.test.js:91`：会话观察被 dispose，`sessionId` 可省略。

### 4.3 折叠与统计的纯函数（39 例）

全部从 `lib/index.js` 的具名导出进入（`applyTimeline`、`createTimelineState`、`applyActivity`、`createActivityState`、`createOverviewCache`、`detectHarnessVersion`、`parseSshConfig` 等），只喂事件对象，不碰宿主：

- `fold` 2 例：`session/end-seed` 是生命周期切口，`inherited: true` 时只清成本、保住 53 轮/1386 步的计数与耗时（`tests/fold.test.js:13`、`:32`）。对应实现 `src/ui/host/fold.ts:337`。
- `jobs` 8 例：`job/registered` → `job/settled` 的登记与结算、`run_in_background` 标记、结果先到而记为 detached、无登记不造作业、`zsh` 与 `bash` 同构、命令仍缓冲时保留后台标记、同一作业重复登记只留一行（`tests/jobs.test.js:33`–`:109`）。
- `failedAgents` 4 例：`subagent-settled` 且 `stopReason: 'error'` 才进 `failedAgents`，正常完结不标；只标出错的那个；`wire.viewSchema` 接受失败标记但仍拒绝放宽 schema（`tests/failedAgents.test.js:24`–`:56`）。
- `seedCut` 3 例：fork 继承前缀只上面子、不记账（步骤/轮次/请求均 0）、`seedCut=0` 时全量记账、继承前缀不产生日桶（`tests/seedCut.test.js:30`、`:49`、`:57`；实现见 `src/ui/host/foldState.ts:381`、`src/ui/host/activity.ts:248`、`:379`）。
- `usage` 8 例（`usage.test.js` 里另外 2 例是 4.2 的 endpoint）：重试与后代只算一次、父历史不重复计、后代归创建轮、重复结算去重、外部/缺失子代理记未知、未归属轮单列、缓存读样本只算报过 cache-read 的、增量缓存只追加新事件、子会话读取受并发上限约束、非法用量值记 `unknown` 而不是污染总数、取消后不提交缓存（`tests/usage.test.js:26`–`:175`；实现 `src/host/usage.js:132`）。
- `overviewCache` 4 例：用内存文件系统（`tests/overviewCache.test.js:8`）验证单条保存不覆盖磁盘上的其它记录、replace 可缩容、条目上限按最近更新保留、字节上限即使没触发条目上限也会裁剪（`:36`、`:54`、`:65`、`:74`；实现 `src/ui/host/overviewCache.ts:212`）。
- `version` 3 例：在 `os.tmpdir()` 造假模块树，读运行树的版本而不是插件自己的依赖；插件目录内的树不算宿主；读不到只 warn 一次并保持「未知」（`tests/version.test.js:17`、`:25`、`:32`；实现 `src/ui/host/version.ts:140`）。
- `sshTargets` 7 例：配置里只取具体别名、丢通配与重复；配置读不出算空不是抛错；`ssh`/`scp` 命令行里选项值不当作目标；复制文案按 shell 加引号；endpoint 优先配置再退回别名（`tests/sshTargets.test.js:31`–`:80`；实现 `src/ui/shared/sshTargets.ts:37`、`:128`）。

### 4.4 直接读源码的 9 例

- `tests/taskRollup.test.js`（5 例）：从 `../src/ui/client/taskRollup.ts` 直接 import（`:9`），验证徽章优先级：无任务不给徽章、全部完成为 done、一个排队就回 pending、running 压过其余、计数可相加（`:13`–`:36`；实现 `src/ui/client/taskRollup.ts:19`）。这条能跑，是因为运行的 Node 能直接剥离 `.ts` 类型——最低 Node 版本**未验证**。
- `tests/conversationSurface.test.js`（2 例）：用 `typescript` 现场转译 `src/ui/client/components/useConversationSurface.ts`（`:7`），在沙箱里以假 `react` 跑，断言启用时给滚动容器加 `data-lc-surface`、停用时清掉（`:45`、`:52`）。
- `tests/sessionPanelStyles.test.js`（2 例）：把 `src/ui/client/styles/sessionPanel.css` 当文本读（`:5`）并解析声明块，锁住玻璃色变量只作用于含统计分栏的会话面板、且全文件没有 `backdrop-filter`（`:24`），以及面板宽度公式 `min(720px, calc(… * 0.375))` 与「探针」共用一份（`:35`）。

## 5. 覆盖到哪些源码

测试真正锁住的实现点（按出处）：

| 源码 | 被谁覆盖 |
| --- | --- |
| `src/ui/host/fold.ts:337`、`foldState.ts:381`、`activity.ts:248`/`:379`、`config.ts:4` | `fold`、`jobs`、`seedCut`、`failedAgents` |
| `src/ui/host/timeline.ts:374`（wire/schema） | `failedAgents:44` 的 `createContextTimelineDefinition` |
| `src/host/usage.js:132`、`src/host/usageRoute.ts:56` | `usage`（8 + 2 例） |
| `src/ui/host/sshRoute.ts:201`/`:212`、`src/ui/shared/sshTargets.ts:37`/`:128` | `sshRoute`、`sshTargets` |
| `src/ui/host/version.ts:140` | `version` |
| `src/ui/host/overviewCache.ts:212` | `overviewCache` |
| `src/ui/client/taskRollup.ts:19` | `taskRollup` |
| `src/ui/client/components/useConversationSurface.ts` | `conversationSurface` |
| `src/ui/client/styles/sessionPanel.css` | `sessionPanelStyles` |
| `lib/client.js` 的槽位注册与用量卡 | `client`（7 例） |

## 6. 明确没覆盖

1. **15 条 Host 路由里 13 条没有任何请求级测试。** `tests/` 里出现的 `api/tongji` 只有 `/usage` 与 `/ssh`（`tests/usage.test.js:77`、`tests/sshRoute.test.js:30`）。无覆盖：`version`（`src/ui/host/versionRoute.ts:7`）、`skills`（`skills.ts:8`）、`recom`（`recoms.ts:5`）、`fleet`（`fleet.ts:20`）、`attachment`（`attachment.ts:10`）、`detail`（`detail.ts:13`）、`delta`（`delta.ts:16`）、`facts`（`facts.ts:16`）、`heads`（`headsRoute.ts:11`）、`commands`（`commandPages.ts:13`）、`snapshot`（`snapshotRoute.ts:8`）、`overview`（`overview.ts:46`）、`backfill`（`backfill.ts:14`）。
2. **客户端界面基本没有测试。** `src/ui/client` 顶层 68 个文件、`components/` 下 81 个文件（含 63 个 `.tsx`），直接覆盖的只有 `taskRollup.ts` 与 `useConversationSurface.ts`；其余组件没有任何渲染测试（无 React Testing Library、无 jsdom 依赖）。
3. **后台折叠 worker 没测试。** `tests/` 里搜不到 `foldWorker` / `startFoldWorkerChannel`（`grep -rn 'foldWorker' tests/` 无命中），`src/ui/host/foldWorker.ts` 只有人工验证。
4. **一整片宿主模块没有对应测试文件**：`promptInjection.ts`、`i18n.ts` / `i18nZh.ts`、`recoms.ts`、`fleet.ts`、`skills.ts`、`overview*.ts`（`overview`、`overviewAggregate`、`overviewCorpus`、`overviewDecode`、`overviewScan`）、`catalog.ts`、`attribution.ts`、`stepIdentity.ts`、`coldRead.ts`、`headers.ts`、`projection.ts`、`record.ts`、`detailShadow.ts`、`delta.ts`、`backfill.ts`、`fallback.ts`。这些模块只能靠产物语法检查（`npm run check`）与人工实机验证兜。
5. **样式只锁了一个文件**：`src/` 下 25 个 `.css`，仅 `sessionPanel.css` 有断言（`tests/sessionPanelStyles.test.js:5`）。
6. **真实界面与版本次元没有自动化**：`README.md:133` 说真实 UI 只在 DSH `0.2.3-alpha.2` 上加载验证过，测试里没有任何宿主渲染；仓库 `AGENTS.md` 第 4 节要求改插件后完全退出 DSH 再打开，这一步只能人工做。
7. **没有覆盖率数字**：仓库没有 c8 / nyc / `--experimental-test-coverage` 的脚本，实际行覆盖率为**未验证**。

## 7. 已知不一致（读文档时请注意）

- 用例数口径：`README.md:129` / `README.en.md:129` 现在写的是 **61 例**，与本页实测一致；更早的副本（`v0.1.30` 那一版）写的是「45 例全绿」并按 3/4/2/3/3/8/22 分组，那个数字与分组在 13 个测试文件、61 例的现状下已不成立，看到旧副本时以本页为准。
- 路由条数：`README.md:66` 原写「共 14 条」且名单漏 `ssh`，2026-11-28 已改为 15 条（14 条走 `*_ROUTE` 常量，另加 `src/host/usageRoute.ts:56` 的字面量；`ssh` 定义在 `src/ui/host/sshRoute.ts:31`，注册于 `src/host/index.ts:38-39`）。
- `tests/version.test.js:9` 用 `mkdtempSync` 建临时模块树，测试内没有清理逻辑，每次运行会在系统临时目录留下 `tongji-version-*` 目录。

## 8. 加测试时怎么选层

- 改折叠/统计规则（`fold*`、`activity`、`usage` 归集、`overviewCache`）：写 4.3 那种纯函数用例，从 `lib/index.js` 导出进入，喂事件对象——先 `npm run build`。
- 改 Host 路由：照 `tests/usage.test.js:69` / `tests/sshRoute.test.js:23` 的假 `ctx` 写法，收集 `connection.fetch.register` 的路由再 `route.fetch(new Request(...))`，不要真启宿主。
- 改客户端 bundle 里能单独切出来的逻辑：照 `tests/client.test.js` 的 vm 沙箱；改能直接 import 的 `.ts` 工具函数：照 `tests/taskRollup.test.js:9` 直接吃 `src/`；改 CSS 关键声明：照 `tests/sessionPanelStyles.test.js` 解析文本。
- 纯组件渲染、`foldWorker`、未覆盖的 13 条路由目前没有可复用的测试骨架，加之前要先引入相应能力（渲染测试需要 jsdom 一类依赖，属新增依赖，需单独确认）。
