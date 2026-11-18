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

`client/meta.ts` 里的 `PLUGIN_NAME`、`PLUGIN_REPO` 仍指向上游仓库，因为更新检查与插件信息卡需要它们
指向真实来源；这不是遗漏。

同步上游时注意：上述改动都是本地修改，直接覆盖 `src/ui` 会丢失。改动点集中在上面列出的位置。
