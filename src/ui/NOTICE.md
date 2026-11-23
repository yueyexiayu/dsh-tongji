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

`client/meta.ts` 的 `PLUGIN_NAME`、`PLUGIN_REPO`，`host/catalog.ts` 的版本检查，以及推荐位的数据源
都指向本仓库（`yueyexiayu/dsh-tongji`）与它的 latest release；上游仓库只作为来源记录留在本文件。
错误码统一为 `tongji/*`，`postRoute.failure()` 仍接受旧的 `dsh-context/*` 前缀并归一化，
避免同一份产物对外出现两种前缀。

同步上游时注意：上述改动都是本地修改，直接覆盖 `src/ui` 会丢失。改动点集中在上面列出的位置。
