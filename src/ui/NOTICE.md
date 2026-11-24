# src/ui 来源说明

`src/` 下的两部分代码来源不同，改动前请先分清。

## `src/host/usage.js`、`src/host/usageRoute.ts`、`src/host/index.ts`

tongji 自有代码。`usage.js` 是 tongji 原本的用量折叠算法（按轮次/步骤累计 token 与缓存命中），
`usageRoute.ts` 注册 `/api/tongji/usage`，`index.ts` 把两边合成一个 Cordis 入口。

## `src/ui/`

衍生自 [bowenliang123/dsh-context](https://github.com/bowenliang123/dsh-context) v0.84.1，
Apache License 2.0，原文见同目录 `LICENSE`。

改动记录：

- 插件标识由 `dsh-context` 改为 `tongji`（宿主 `name`、客户端 `name`、`NS`、侧栏与视图 tab 的 id/kind）
- 路由前缀 `api/dsh-context/*` → `api/tongji/*`
- 存储路径 `storages/dsh-context` → `storages/tongji`，`cache/dsh-context/previews` → `cache/tongji/previews`
- `icon.svg` 换成柱状图（原为 simple-icons 的表格图标）
- 侧栏标签改用独立键 `tab.stats`（显示为「统计」），`tab.context` 保留给视图内 tab 与弹窗
- 新增 `client/components/turnUsage.tsx` 与 `client/styles/turnUsage.css`：把 tongji 的每轮/每步用量
  渲染成面板底部的一张卡片，样式复用面板既有的 `.lc-card` / `.lc-stat` / `.lc-sl` 与语义色
- 0.1.17：自标识全部改为 `tongji`（`PLUGIN_NAME`、effect 标签、日志前缀、系统提示词 section 名、
  `tongji-sheet-` 元素 id）；错误码前缀 `dsh-context/*` → `tongji/*` 并保留旧前缀归一化
- 0.1.17：平台余额的本地存储键改为 `tongji:platform-balance`；旧键不再读取，重开面板即重建
- 0.1.17：版本检查由 npm registry 的 `dsh-context` 改为本仓库 GitHub Releases；
  `currentVersionOf()` 与 `host/version.ts` 的 `PLUGIN_ROOT` 改为按 `lib/index.js` 的相对路径取包根
- 0.1.17：仓库根新增 `LICENSE`（Apache-2.0），`package.json` 补 `author` / `license` / `homepage` / `repository`
- 0.1.18：删除未维护的 6 份词典（de / es / fr / ja / pt / ru），界面只保留中文与英文，
  其他界面语言由 DSH 语言服务回退到英文；`lib/client.js` 由 962 KB 降到 709 KB
- 0.1.19：界面只保留中文，删除英文词典；`en` 位置指向同一份中文词典，避免 DSH 切成英文时
  露出键名。`lib/client.js` 再降到 675 KB
- 0.1.20：版本守卫改为先读安装包（`app.asar/dsh/package.json`、macOS 包的 `Info.plist`），再读
  模块树；全都读不到时 `ctx.logger.warn` 一条并按「未知」处理，`/api/tongji/version` 增 `harness` 字段
- 0.1.20：面板工作区根改用 DSH 的 `workingDirectory` 投影（跟随目录切换），`facts` 载荷顶层增
  `cwd`；文件地址按 0.2.3 的口径自行拼出绝对路径，不再依赖随包固定的 `fileAddressFor`
- 0.1.20：`src/host/index.ts` 补出 `startFoldWorkerChannel` 与版本探测导出；删除已失效的
  `ui/host/sweep.ts`（状态版本 36→37 的行迁移）及只被它使用的 `deriveHeadState` 等死函数
- 0.1.22：Agent 网络卡片的徽章改为先看运行态：运行中的子 Agent 显示绿色的「进行中」，不再等它有自己的任务
  才出现文字；无任务且已结束的卡片回落到「已完成」，没有任务归属时不再渲染空白徽章。徽章的
  tooltip 仍给出任务总数的分项
- 0.1.21：余额与成本功能整体下线。删除 `ui/host/balance.ts`、`ui/host/cost.ts`、`ui/shared/pricing.ts`、
  `ui/client/balance.ts`、`ui/client/cost.ts`、`ui/client/costRefresh.ts`、
  `ui/client/components/balanceCapsule.tsx` 与 `/api/tongji/balance` 路由；面板不再显示余额、花费或
  价格，也不再请求 `models.dev` 价目表
- 0.1.21：目录服务只保留版本检查（本仓库 GitHub Releases），价目槽位与 `ModelBook` 一并移除；
  只服务于价格解析的 `ui/shared/priceIdentity.ts` 删除
- 0.1.21：token 记账独立为 `ui/shared/usage.ts`（`mergeCostUsage`、`billedTokensOf`），内部
  `SessionCostUsage`/`CostBucketTotals` 只是 token 桶的名字，不含金额；峰谷计价分桶（`isBeijingPeak`）
  删除，历史数据里的 `off` 桶仍会被读取求和；`TIMELINE_STATE_VERSION` 42→43，丢弃带价格的旧投影行
- 0.1.21：`src/host/index.ts` 不再导出随模块删除的 9 个价格/成本函数
- 0.1.23：数字口径改为可自证。附件图片 token 说明不再自称「DeepSeek 官方换算」，改为 14px 分块网格、与 Qwen2-VL 同口径；
  上下文构成卡新增 `approximate` 判定（仅供应商上报占用与官方 breakdown 同时在时才算实测），数字后统一显示「（估算）」；
  `tsconfig.json` 打开 `allowJs`，消除 `usageRoute.ts` 对 `host/usage.js` 的 TS7016
- 0.1.24：修复三处口径与数据完整性问题。总览磁盘缓存改为「读回旧文件再合并」，单条 worker 折叠不再整份覆盖
  （新增 4000 条 / 24 MB 上限，超限按最近更新时间保留）；fork 会话在 `session/end-seed` 一并清空轮次/步骤、
  耗时与请求列表，不再把父会话的历史算成本会话的工作；`usage` 聚合对 seeded root 也从继承前缀之后开始折叠，
  父历史不再重复计入。「7 天」总览改为含今天的 7 个自然日，每轮缓存命中率的 tooltip 分母与数值统一；
  上下文构成卡只有实际采用供应商上报占用时才判为实测。删除零引用的 `ui/shared/providers.ts`；
  `verify` 增加 `tsc --noEmit`；新增 6 例回归测试（缓存 4、折叠 2）
- 0.1.25：撤回 0.1.24 里对 `session/end-seed` 的清空改动。真实日志显示 DSH 每次恢复会话都会追加这个
  生命周期标记（`inherited` 表示当前对象生命周期的切点，不是「fork 继承结束」），在该点清空轮次、耗时与
  请求会把一个 53 轮 / 1386 步的会话在下次恢复后显示成 0。现在只清成本，计数与耗时保留，并由 2 例折叠
  测试锁定；真正的继承前缀只能按 `Session.inheritedEventCount` 裁剪，事件层判断不出来
- 0.1.26：继承前缀按 `Session.inheritedEventCount` 裁剪。投影的 `init(header, inheritedEventCount)` 把前缀长度写进
  `seedCut`：前缀内的事件照常进 surface / 上下文事件（模型确实看过），但不计入轮次、步骤、耗时、请求列表、
  生成量与日桶。`contextTimeline` 状态版本 43→44，`contextActivity` 7→8，总览缓存 `format` 1→2，旧口径行
  全部丢弃重建。`foldLog` 与 worker 折叠也接收该前缀长度。`inheritedEventCount` 指的是会话里**最后一次**
  继承标记（`session/end-seed` 且 `data.inherited === true`，DSH 要求它必须是最后一个这类标记）的位置：
  对 fork 会话就是复制父历史的结束点，恢复（resume）追加的无标记 `end-seed` 不会移动它。实测 9675 事件的
  fork 会话（标记在 seq 9663，其前 9662 条全部复制自父会话）：轮次 54→0、步骤 1387→0、请求 1387→0、
  surface 230 不变、日桶 token 233.2M→0。该会话 fork 后只起了一轮、且那轮没有助手回复，所以自己的轮次
  为 0；父的 54 轮仍记在父会话上。
- 0.1.27：右侧面板把「Agent 网络」从命令面板之后提到「Token 统计 / 耗时统计」之下、
  「当前上下文」之上，成为第三块。该块只在侧栏渲染，整页 tab 的顺序不变。
- 0.1.28：Agent 网络区分「已中断」。折叠层在写入 `subagent-settled` 通知时读 `stopReason`，把 `error`
  的子会话记进 `failedAgents`；徽章优先显示「已中断」（错误色），不再被任务 rollup 的 in_progress 盖成
  「进行中」。`contextTimeline` 状态版本 44→45。实测 `session-8ca623e4` 折叠后 `failedAgents` 只有
  `949f3d72`（metrics），另外三个 completed 不入表。

- 0.1.41：0.1.40 把工具条按钮直接注册到宿主占用的单槽位 `conversation.composer.bar`，与官方输入框的
  priority 0 注册冲突，导致 `dsh-client-ui-conversation` 启动失败并连带阻塞 `uiConversation`。现改挂官方
  输入框的列表子槽位 `conversation.input.left`，保留统计按钮，不再替换输入框本体。

- 0.1.40：0.1.39 的 dock 挂载点在本机实测里拿不到——页面渲染出的 slot 只有 `conversation.composer` 与
  `conversation.composer.bar`，`.lc-dock` 数量为 0，统计直接不显示。改挂 `conversation.composer.bar`
  （输入框上方工具条），放一个「统计」按钮，点击设 `modalStoreOf(sessionId).set(true)` 打开插件已有的
  全屏统计面板（宽、多列）。同时恢复 `conversation.session.panel.section` 右侧分栏，两个入口并存：
  分栏常驻、按钮给大视图。
- 0.1.39：统计换挂载点——从「会话面板分栏」改成 composer dock（输入框上方）里的一张折叠卡片，
  注册槽位 `conversation.composer.dock`。宽度跟随对话列（≤912px），展开后卡片两两并排，折叠状态
  记在 localStorage，与宿主的让位/宽度模型完全无关，不再挤压正文与 composer。来源是实测：把宿主
  `--panel-min-width` 改到 760px 后，面板确实 docked 760、正文 782，但 `composerSeat` 变成
  `display:none`、input 槽计数为 0（诊断读数 `seats 1: none 0×0` / `inputs 0 · chats 0`），
  输入框不再渲染；宿主那条「面板宽度=正文让位」的耦合拆不动。新增设置项「对话内统计卡片」，
  与「对话右侧统计分栏」二选一：`statsDock` 开启时不再注册 `conversation.session.panel.section`。
- 0.1.38：回滚 0.1.33–0.1.37 的面板加宽实验。那五版都在改写宿主的 `--panel-min-width`、
  `--dsh-chat-content-width-resolved`、`--dsh-chat-end-inset`，实测（多处用户截图 + 本机 1023×1423
  视口读数）会把正文列与 composer 推出可视区，最后一版甚至整屏错位。原因是 DSH 把「面板宽度」
  与「正文让位」绑成同一个量，单靠 CSS 变量拆不开。现在面板宽度、正文宽度、end inset 全部回到
  官方值，只保留一条无害的容器查询（面板自身 ≥470px 时卡片两两并排，官方宽度下不触发）。
  实测回滚后：`--dsh-chat-content-width-resolved` = 680px、`padding-inline-end` = 0px、
  composer seat rect = x 0 / 577×240（正常）。
- 0.1.37：把「正文左移」的核心规则从 `@media (min-width: 1100px)` 里拿出来。实测发现媒体查询不命中时
  （窗口缩放、判定宽度与预期不同），正文完全不左移，面板照样压住输入框——这正是「改了没反应」的原因。
  现在只要面板想停靠就生效，inset 用 `max(0px, …)` 兜底，窄窗口也算不出负值。
  实测（1023×1423 视口，刷新后）：`--dsh-chat-content-width-resolved` = 320px、`padding-inline-end` = 599px、
  composer seat rect = x 56 / 361×172（可见）。
- 0.1.36：0.1.35 用 `--dsh-conversation-viewport-width` 算 inset，实测该变量未测量时是 0px，
  算出的负值被浏览器丢弃，正文因此没有左移、输入框仍被面板挤掉。改为纯百分比：
  `--dsh-chat-end-inset: max(0px, calc(100% - 正文宽 - 48px))`，正文宽用变量
  （320/400/520px 按窗口分档），不依赖任何测量值。实测：900px 容器上该式解析为 532px，
  经自定义属性传递同样得到 532px。
- 0.1.35：换掉 0.1.34 的修法。官方把面板宽度和「正文让位」绑成同一个量（让位 = 48px + 最小宽度），
  让位过大时官方 inset 公式会把正文列连同贴底 composer 一起推出可视区。现在让位回到官方 348px
  （最小宽度 300px），改为直接接管 `--dsh-chat-end-inset`：正文宽 `clamp(320px, 视口−680px, 880px)`，
  inset = 视口 − 正文宽 − 48px，正文贴左、起点约 24px，右侧空间给面板（600–720px）。
- 0.1.34：修 0.1.33 的输入框消失：只抬了 `--panel-min-width` 却没压正文，面板要的让位（48px+最小宽度）
  超过 Chat 外框可给的空间，`--dsh-chat-end-inset` 把正文和 composer 推出可视区。现在把正文列
  一起收窄成 `clamp(320px, 视口宽−680px, 880px)`，使「起点 = 视口 − 让位 − 正文宽」恒为 32px；
  同时抬高 dockProbe 的 `--panel-min-width`（600px）让停靠判定与面板宽度一致，窗口窄于 1100px 保持
  官方行为。另加容器查询：面板内容 ≥470px 时卡片两两并排。
- 0.1.33：把 DSH 会话面板加宽到约 1.67 倍（360px → 最宽 600px，最窄 500px），并让正文列在
  面板停靠时收窄让位（列宽 −660px，最低 320px）。实现只在 `styles/sessionPanel.css` 里覆盖官方
  发布在 `[data-conversation-content]` 上的 `--panel-min-width`、`--dsh-chat-content-width-resolved`
  与面板宽度，不改 DSH 源码。窄窗口（<1080px）保持官方行为，避免正文被压窄而面板仍放不下。
- 0.1.32：统计再往前一步——注册 DSH 官方的 `conversation.session.panel.section`（会话面板分栏，
  id `tongji`、order 50），于是对话右侧的会话面板里多一个「统计」分栏，与右侧边栏无关；
  分栏模式隐藏只有宽屏才放得下的首行（用户消息 / 工具定义那块），其余卡片照旧。新增
  `statsSection` 设置（默认 show）控制这个分栏。「统计面板」视图标签页保留作宽屏细节视图。
- 0.1.31：统计面板从右侧栏标签页搬到会话主区标签页「统计面板」，右侧栏不再注册任何 tongji 入口
  （`sidebar.right.pane.tab` / `sidebar.right.pane.tab.title` 与 `sidebarRightTabs.register` 一并删除）。
  主区这一份补上原先只在侧栏出现的「Agent 网络」，并去掉只服务侧栏的 IntersectionObserver 懒加载、
  `dnaAllowed` 可见性门槛与未挂载早退。`defaultPlacement` 收敛为 `show` / `hide`，旧值
  `all` / `tab` / `sidebar` 仍按 `show` 解析；设置卡对应项改为显示/隐藏。
- 0.1.30：把「后台任务」卡片从页面底部（文件活动之后、命令面板之前）移到顶部——统计双卡
  （Token 统计 / 耗时统计）之后、Agent 网络之前。上下文整页与侧栏「统计」页共用同一份渲染，
  之前只在页面最底部出现，侧栏一打开看不到；移动后侧栏顶部即可见。
- 0.1.29：上下文视图新增「后台任务」卡片。Host 折叠层把 `job/registered` / `job/settled` 收进独立
  `jobs` 集合（运行中最多 20 条、总计 80 条），按 `toolCall.callId` 与命令记录关联；`run_in_background`
  参数、结果里的后台确认，或「结果已返回但作业未结束」都会标记为后台。`contextTimeline` 状态版本 45→46，
  facts 路由新增 `jobs` 分块，前端按块增量刷新。命令识别同时补上 `zsh`（按 bash 方言解析，记录保留工具名）。

`client/meta.ts` 的 `PLUGIN_NAME`、`PLUGIN_REPO`，`host/catalog.ts` 的版本检查，以及推荐位的数据源
都指向本仓库（`yueyexiayu/dsh-tongji`）与它的 latest release；上游仓库只作为来源记录留在本文件。
错误码统一为 `tongji/*`，`postRoute.failure()` 仍接受旧的 `dsh-context/*` 前缀并归一化，
避免同一份产物对外出现两种前缀。

同步上游时注意：上述改动都是本地修改，直接覆盖 `src/ui` 会丢失。改动点集中在上面列出的位置。
