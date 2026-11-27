# 变更日志

本文件按提交记录 tongji 的全部版本变更。所有条目都能在 git 历史里复查：括号内是该提交的短 hash，`git show <hash>` 即原文。

## 记录口径

- **版本号规则**：`0.1.x` 单行递增、每次交付把补丁位 +1（`0.1.9` → `0.1.10` → `0.1.11` …）。版本号写在 `package.json:3`，README 顶部另有一处声明（`README.md:7`、`README.en.md:7`），规则见 `AGENTS.md:45-46`。
- **tag 形式**：`v<version>`，指向 `package.json` 版本号相同的提交（15 个 tag 逐个用 `git show <tag>:package.json` 核对过）。`v0.1.14`、`v0.1.15` 是带说明的 annotated tag，其余为轻量 tag（`git for-each-ref refs/tags --format='%(refname:short) %(objecttype)'`）。
- **记录起点**：本文件于 2026-11-28 建立，回溯到首个提交 `5515882`（2026-11-01，tag `v0.1.1`），覆盖全部 56 个提交（`git rev-list --count HEAD`）。
- **生成方式**：`git tag --list | sort -V` 取版本清单；`git log --pretty=format:'%h %ad %s' --date=short` 取提交与日期；每个版本用 `git log --oneline <上一个 tag>..<本 tag>` 聚合该版本内的提交。没有 tag 的版本用 `git show <hash>:package.json` 复原版本号。
- **分类**：沿用 Keep a Changelog 的 Added / Changed / Fixed / Removed；同一分类内按提交从新到旧。中文标题的提交按原文，英文标题按原意简写，不扩写。
- **证据边界**：只写提交信息与 `git show --stat` 能支撑的内容。提交信息没讲清的，只写它能支撑的部分，不补功能描述。

## 未发布

当前 HEAD 为 `810c79a`（2026-11-25），相对最高 tag `v0.1.40` 有 12 个提交（`git log --oneline v0.1.40..HEAD`；`git describe --tags` 输出 `v0.1.40-12-g810c79a`）。这批提交把版本号从 0.1.41 一路推到 0.1.51；另有未提交的工作区改动把 `package.json:3` 提到 `0.1.52`（见文末「已知不一致」）。

### Changed

- 会话统计面板改成稳定的「左对话、右面板」布局并加宽为两列（`2033af5` 0.1.44、`208d7f8` 0.1.43）。
- 面板材质：先提高透明度（`feb618f` 0.1.45），后改用 clear glass（`696d4f2`）。

### Fixed

- 面板宽度与停靠的一组修复：随对话宽度缩放（`7c022f3` 0.1.46）、抬高面板最大宽度（`a0176c8` 0.1.47）、统计占比改为 37.5%（`a623036` 0.1.48）、覆盖宿主的宽度上限（`a23fa2a` 0.1.49）、默认窗口尺寸下保持停靠（`a819242` 0.1.50）。
- 不再替换官方 composer 工具条（`5979128` 0.1.41）；面板存在时保持 composer 可见（`b310eb5` 0.1.42）。
- 历史投影接受失败的子代理（`810c79a` 0.1.51；改动 `src/host/index.ts`、`src/ui/host/timeline.ts`、`tests/failedAgents.test.js`，版本号同步进 `package.json`）。

### Added

- 新增测例文件 `tests/sessionPanelStyles.test.js`（`a819242` 建立，`696d4f2` 在同一文件补 clear glass 断言）；两个提交都同时改 `src/ui/client/styles/sessionPanel.css`。

## v0.1.40 — 2026-11-24

区间 `v0.1.15..v0.1.40` 共 28 个提交。这段时间版本号逐次走过 0.1.16–0.1.40，但只有 0.1.40 打了 tag；每条末尾给出该提交当时的 `package.json` 版本，便于对齐提交信息里的 `(v0.1.x)` 标注。

### Added

- 面板新增 SSH 连接卡片（`e402c25`，0.1.30）。
- 新增后台任务卡片，命令识别覆盖 `zsh`（`4b3560c`，0.1.29）。
- Agent 网络区分「已中断」状态（`e8f816b`，0.1.28）。
- 折叠按 `inheritedEventCount` 裁剪继承前缀（`12eabf1`，0.1.26）。
- 运行中的子代理卡片显示「进行中」（`e35dc22`，0.1.22）。

### Changed

- 统计改挂 composer 工具条按钮，并恢复右侧分栏（`0d0ec6b`，0.1.40，本版本 tag）。
- 统计此前一度改挂 composer dock 折叠卡片（`12bf254`，0.1.39）。
- 回滚面板加宽实验，布局回到 DSH 官方值（`e21cc42`，0.1.38）。
- 统计挂进对话右侧的会话面板分栏（`214aaea`，0.1.32），并把会话面板加宽到约 1.67 倍（360 → 600px）（`9e08ab5`，0.1.33）。
- 统计面板改为对话视图标签页，取消右侧栏占用（`e0dbc37`，0.1.31）。
- Agent 网络提到第三块（`0609531`，0.1.27）。
- 界面文案先收敛为中英两份（`e0822a4`，0.1.18），随后只保留中文（`c388fc8`，0.1.19）。
- 对齐文档与元数据，把 `dsh-context` 残留改名，并补价格相关测试（`6b1fc94`，0.1.17）。
- 文档：入口表按主区单一统计面板重写（`f40095d`，0.1.31）；修正 0.1.26 的实测数字与 `inheritedEventCount` 语义（`50d171f`，0.1.26）。

### Fixed

- 修缓存覆盖写、fork 继承重复计数与三处口径问题（`567ef47`，0.1.24）。
- 撤回 end-seed 清空计数，只保留成本转移（`c33d1a0`，0.1.25）。
- 后台任务卡片移到统计双卡下方，侧栏打开即可见（`f3153ab`，0.1.30）。
- 修输入框消失，面板加宽到 600–720 并支持两列（`c028adb`，0.1.34）。
- 改接管 end inset，面板 600–720 且 composer 留在可视区（`5b76976`，0.1.35）。
- inset 改用百分比计算，正文与输入框稳定左移（`90fe961`，0.1.36）。
- 正文左移规则脱离 media，面板停靠即生效（`3fdd931`，0.1.37）。
- 估算标注改为如实标注，并删掉 DeepSeek 图像口径的说法（`6639e00`，0.1.23）。
- 对齐 DSH 0.2.3：版本探测、worker 导出、实时 cwd、文件地址（`0bb658b`，0.1.20）。
- 声明构建依赖并钉到 DSH 0.2.2-rc.5（`c38404d`，0.1.16）。

### Removed

- 余额与费用能力整块删除，只保留 token 与上下文统计（`174722f`，0.1.21）。

## v0.1.15 — 2026-11-18

### Added

- 区分上下文占比与任务状态：卡片百分比加「上下文」前缀，子 Agent 名旁加任务徽章（`73f4d5f`）。annotated tag 说明原文：「上下文占比标注与子 Agent 任务状态徽章」。

### Changed

- 纳入 tongji 的 TypeScript 源码与构建配置（`1e97923`，与上一提交同属本版本区间 `v0.1.14..v0.1.15`）。

## v0.1.14 — 2026-11-18

### Changed

- 重建 `lib` 产物并让测试适配合并后的 bundle（`a2ad0f1`）。annotated tag 说明原文：「按 src/ 重建 lib 产物，测试适配合并后的 bundle」。

## v0.1.13 — 2026-11-13

### Added

- 把缓存命中率挂到缓存输入旁（`d2e16aa`，提交标题 `Attach cache hit rate to cached input`）。

## v0.1.12 — 2026-11-13

### Added

- 在累计输入旁显示缓存命中率（`36382b0`，提交标题 `Show cache hit rate beside cumulative input`）。

## v0.1.11 — 2026-11-13

### Changed

- 澄清累计 token 用量口径（`f8b62a3`，提交标题 `Clarify cumulative token usage metrics`）。

## v0.1.10 — 2026-11-11

### Fixed

- 改进统计性能与诊断（`eb01f85`，提交标题 `Improve statistics performance and diagnostics`）；具体改了哪几处，提交信息没有展开。

## v0.1.9 — 2026-11-04

### Changed

- 插件界面打磨（`f129d87`，提交标题 `Polish plugin interface`）。

## v0.1.8 — 2026-11-04

### Fixed

- 打开统计时保留当前激活的侧栏（`37290a5`，提交标题 `Preserve active sidebar when opening statistics`）。

## v0.1.7 — 2026-11-03

### Fixed

- 修正缓存用量上报，并降低空闲轮询（`01a4ac8`，提交标题 `Fix cache usage reporting and reduce idle polling`）。

## v0.1.6 — 2026-11-03

### Changed

- 本地化插件清单信息（`b152d46`，提交标题 `Localize plugin listing information`）。

## v0.1.5 — 2026-11-01

### Fixed

- 轮次统计纳入子代理用量（`264ed17`，提交标题 `fix: include subagent usage in turn statistics`）。

## v0.1.4 — 2026-11-01

本版本含两个提交（`git log --oneline v0.1.2..v0.1.4`）。

### Fixed

- 去掉轮次卡片的强调条（`15741b3`，tag 指向该提交，提交标题 `fix: remove turn card accent bar`）。

### Changed

- 统计侧栏布局打磨（`ee6d767`，提交标题 `feat: polish statistics sidebar layout`）。

## v0.1.2 — 2026-11-01

### Fixed

- 加载完整的会话轮次历史（`2dafc6a`，提交标题 `fix: load complete session turn history`）。

## v0.1.1 — 2026-11-01

### Added

- 首个版本：发布 tongji 会话统计插件（`5515882`，提交标题 `feat: publish tongji session statistics plugin`）。`git show --stat 5515882` 显示该提交一次加入 `.gitignore`、`README.md`、`README.en.md`、`cordis.patch.yml`、`docs/assets/` 三张 SVG、`lib/client.js`、`lib/index.js`、`package.json`，共 10 个文件、449 行新增。

## 早期版本说明

v0.1.1–v0.1.13 期间每个版本只有 1–2 个提交，上面的条目直接取自提交标题，没有更细的逐条记录；逐条细节只能回到 `git show <hash>`。这段历史里没有 tag 的是 `v0.1.3`——`package.json` 在 `v0.1.2` 是 `0.1.2`、在 `v0.1.4` 是 `0.1.4`，中间不存在 `0.1.3`。0.1.16–0.1.39 同样没有 tag，版本号只保留在 `package.json` 的提交历史里（见 v0.1.40 一节）。

## 已知不一致

1. **README 的版本与用例数曾写旧**：我在 2026-11-28 06:01 读到 `README.md:129` 写的是「当前 `v0.1.30` 的实测结果 … 测试 45 例全绿」，而当时 `package.json:3` 已是 `0.1.51`，本机实测 `npm test`（命令见 `package.json:21`）输出 `tests 61 / pass 61 / fail 0`。同一次工作中再次读取时，该行与 `README.en.md:129` 已被改写为 `v0.1.52` / 61 例（两个文件 mtime 均为 2026-11-28 06:02，`git status` 显示为未提交修改），推断是并行任务同步修掉了这条，现场已不存在。此处保留登记以备回溯，README 未由本文件改动。
2. **tag 覆盖不全**：最高 tag 是 `v0.1.40`，但 `package.json:3` 当前写着 `0.1.52`（工作区未提交），HEAD 提交里是 `0.1.51`。0.1.41–0.1.50 的版本号只出现在提交标题的 `(v0.1.x)` 标注里，没有对应 tag，所以「未发布」一节按提交而不是按 tag 组织。
3. **一个版本号对应多个提交**：0.1.26 对应 `12eabf1` 与 `50d171f`，0.1.30 对应 `f3153ab` 与 `e402c25`，0.1.50 对应 `696d4f2` 与 `a819242`（后一对里 `696d4f2` 只改样式与测试，没有升版本）。本文件按提交列条目，因此同一版本会出现多条。
4. **`AGENTS.md` 引用的文档不齐**：`AGENTS.md:9-14` 与 `AGENTS.md:61-64` 指向 `docs/PRODUCT.md`、`docs/API.md`、`docs/TESTING.md`、`docs/DECISIONS.md`、`MAINTENANCE.md`。截至 2026-11-28 06:04 本机检查：`docs/` 下只有 `ACCEPTANCE.md`（06:02）、`DECISIONS.md`（06:03）与 `assets/`（历史文件），`docs/PRODUCT.md`、`docs/API.md`、`docs/TESTING.md`、`MAINTENANCE.md` 均不存在；而 `README.md:129` 已经链接 `docs/TESTING.md`。这几份是同一批并行任务正在新建的文件，此处登记的是当时快照，以仓库实际状态为准。
5. **未验证**：撰写时 `git status` 显示 `lib/client.js`、`lib/index.js`、`lib/index.d.ts`、`lib/usage.js`、`lib/usage.d.ts` 有未提交改动，另有 `README.md`、`README.en.md`、`package.json`、`.gitignore` 未提交。按任务约束本次没有执行 `npm run build`，因此无法确认这些 `lib` 产物与当前 `src/` 是否同步，也无法确认工作区里 `0.1.52` 的版本声明会不会随下一次提交落地。`npm test` 的 61 例结果只针对当前工作区代码，不代表 `lib` 产物与 `src` 的一致性。
6. **未验证**：v0.1.1–v0.1.13 各版本的实际功能范围只能从提交标题还原，没有对应的验收记录可查；`docs/ACCEPTANCE.md` 是本轮并行任务新建的文件，历史验收情况未在其中回溯核对。
