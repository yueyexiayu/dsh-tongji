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

`client/meta.ts` 的 `PLUGIN_NAME`、`PLUGIN_REPO`，`host/catalog.ts` 的版本检查，以及推荐位的数据源
都指向本仓库（`yueyexiayu/dsh-tongji`）与它的 latest release；上游仓库只作为来源记录留在本文件。
错误码统一为 `tongji/*`，`postRoute.failure()` 仍接受旧的 `dsh-context/*` 前缀并归一化，
避免同一份产物对外出现两种前缀。

同步上游时注意：上述改动都是本地修改，直接覆盖 `src/ui` 会丢失。改动点集中在上面列出的位置。
