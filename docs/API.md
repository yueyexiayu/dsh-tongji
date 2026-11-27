# Host 路由契约

本文件写给两类人：要改 `src/ui/client/*` 调用点的人，和要在 Host 侧新增或修改路由的人。所有条目都按本仓库源码、测试与 README 落字；核不到的显式标「未验证」。

Host 路由是面板唯一的数据入口：Client 不直接读会话日志，也不调用模型，全部经由 `/api/tongji/*`（`src/host/index.ts:1-16`）。路由实现分两处——沿用上游面板的 13 条在 `src/ui/host/`，tongji 自有的 `usage`、`ssh` 在 `src/host/`（`src/host/index.ts:34-41`）。

## 共同约定

### 路径、注册与方法

- 前缀固定 `/api/tongji/`。客户端常量写在 `src/ui/client/apiRoutes.ts:1-27`，**不带前导斜杠**（`api/tongji/detail`），按页面相对路径解析成同一 URL；Host 侧常量带前导斜杠（如 `src/ui/host/detail.ts:13`）。
- POST 路由统一走 `mountPostRoute` → `registerPostRoute`：`methods: ['POST']`、`requestBody: 'buffered'`（`src/ui/host/postRoute.ts:71-81`、`src/ui/host/connection.ts:22-36`）。GET 路由只有 `usage`、`ssh` 两条，直接 `connection.fetch.register({ methods: ['GET'], requestBody: 'buffered' })`（`src/host/usageRoute.ts:55-59`、`src/ui/host/sshRoute.ts:211-215`）。
- 路由内部不再读 `request.method`，也不读请求头：全仓库只有两处读 URL 查询参数（`src/host/usageRoute.ts:60`、`src/ui/host/sshRoute.ts:216`）。方法不匹配由宿主转发层拦截，**未验证**其具体响应。
- 路由是否注册取决于宿主服务是否就绪。`mountPostRoute` 用 `ctx.inject(deps, …)` 包住注册，依赖未齐时该条不出现，也不会返回错误（`src/ui/host/postRoute.ts:73-79`）；`usage` 在缺少 `connection.fetch.register` 或 `sessionQuery` 时直接 return（`src/host/usageRoute.ts:44`）。每条的依赖见下方逐条小节。

### 请求体

POST 路由的 body 必须是 JSON：`readBody` 解析失败即回 `tongji/bad-request` / `body is not JSON`（`src/ui/host/postRoute.ts:52-58`）。客户端统一发 `content-type: application/json`（`src/ui/client/route.ts:26-31`）。`recom`、`version`、`backfill` 不看 body，客户端仍发 `{}` 或空 body（`src/ui/client/components/recomCard.tsx:38-42`、`src/ui/client/versionSource.ts:51`、`src/ui/client/overviewSource.ts:392`）。

### 响应信封（三种，别混用）

| 形状 | 用于 | 出处 |
| --- | --- | --- |
| `{ ok: true, value: … }` / `{ ok: false, error: { code, message } }` | 13 条 POST 路由 | `src/ui/host/postRoute.ts:27-50` |
| `{ ok: true, coverage: … }` | `backfill`（没有 `value`） | `src/ui/host/backfill.ts:317-321` |
| `{ error: { code, message, retryable } }` | `usage`、`ssh` 两条 GET | `src/host/usageRoute.ts:13-18`、`src/ui/host/sshRoute.ts:191-193` |

`value` 允许为 `null`，语义是「这条现在没有数据」，不是失败（例如会话不存在、宿主缺 `sessionQuery`、冷读被堆内存闸门拦下：`src/ui/host/fleet.ts:597-599`、`src/ui/host/detail.ts:114-115`、`src/ui/host/coldRead.ts:21-38`）。客户端据此区分「空」与「读失败」（`src/ui/client/route.ts:49-64`）。

### HTTP 状态与缓存头

- 13 条 POST 路由的成败都用 HTTP 200 表达：`reply` / `failure` 都走 `Response.json(...)` 且未传 `status`（`src/ui/host/postRoute.ts:27-29`、`45-50`）。这是按源码推断的行为，测试未断言 POST 路由状态码（`tests/` 下只有 `usage`、`ssh` 的状态断言）。
- GET 路由用真实状态码：`usage` 400/404/422/499/500/503，`ssh` 499/503（`src/host/usageRoute.ts:20-26,61,66`、`src/ui/host/sshRoute.ts:239-241`；测试见 `tests/usage.test.js:86-107`）。
- 全部响应带 `cache-control: no-store`（`src/ui/host/postRoute.ts:28`、`src/host/usageRoute.ts:11`、`src/ui/host/sshRoute.ts:33`）。
- 客户端把「`!response.ok`」和「`ok !== true`」都算失败，抛 `RouteError`（`src/ui/client/route.ts:32-41`），所以 POST 路由的 200 + `ok:false` 在客户端仍表现为异常，不会静默当成空数据。

### 错误码

POST 路由的码由 `failure()` 产出，自 `v0.1.17` 起统一为 `tongji/*`，旧 `dsh-context/*` 前缀在归一化处被改写成 `tongji/*`（`src/ui/host/postRoute.ts:38-50`，README.md:137）。

| 错误码 | 含义 | 出现处 |
| --- | --- | --- |
| `tongji/bad-request` | body 非 JSON，或缺必填参数 | `src/ui/host/postRoute.ts:56`；逐条见下 |
| `gateway/internal` | 处理中抛出异常，`message` 为 `String(err)` | `src/ui/host/detail.ts:148`、`fleet.ts:688,725`、`facts.ts:325`、`headsRoute.ts:161`、`snapshotRoute.ts:139`、`overview.ts:506`、`attachment.ts:244`、`versionRoute.ts:34`、`delta.ts:137`、`commandPages.ts:147` |
| `invalid-session-id` | `usage` 缺 `sessionId`（HTTP 400，`retryable:false`） | `src/host/usageRoute.ts:61` |
| `session-not-found` / `session-corrupt` / `persistence-failed` / `invalid-observation` / `usage-unavailable` | 会话查询错误映射（404/422/503/500/503） | `src/host/usageRoute.ts:20-26` |
| `request-aborted` | `usage` 请求被取消（HTTP 499） | `src/host/usageRoute.ts:66` |
| `tongji/request-aborted` / `tongji/ssh-unavailable` | `ssh` 取消（499）/失败（503） | `src/ui/host/sshRoute.ts:239-241` |

注意两点现状，不要当成笔误去「统一」：`usage` 的码**不带**前缀且多一个 `retryable` 字段；`ssh` 的码带前缀。测试固定了 `usage` 的这两种形状（`tests/usage.test.js:100-106`）。

### 鉴权与来源限制

插件层没有任何鉴权、Origin/Referer 校验、会话令牌或限流代码——`src/ui/host/` 与 `src/host/` 里不存在读 `request.headers` 的逻辑（grep 结果为空）。可访问性完全由宿主的 `connection.fetch` 服务决定，该服务的实现不在本仓库：**未验证**。

### 折叠上限（影响放回字段的条数）

8 个上限来自配置，默认值见 `src/ui/host/config.ts:4-13`：`maxRequestSteps` 1500、`maxKeptTurns` 300、`maxEvents` 400、`maxNodes` 2000、`maxArchiveNodes` 400、`maxFileOps` 400、`maxCommands` 400、`maxCommandChars` 4096。各条路由另有自己的硬上限，见下。

## 总表

按源码实测计数为 **15 条**——14 条由 `*_ROUTE` 常量定义，1 条（`usage`）用字面量注册。README.md:66 现已同步为「共 15 条…`usage`、`ssh`」；此前提交里的该行只列 14 条并漏掉 `ssh`（`git diff README.md` 可见这次修正）。

```text
src/ui/host/versionRoute.ts:7      version
src/ui/host/skills.ts:8            skills
src/ui/host/recoms.ts:5            recom
src/ui/host/fleet.ts:20            fleet
src/ui/host/attachment.ts:10       attachment
src/ui/host/detail.ts:13           detail
src/ui/host/delta.ts:16            delta
src/ui/host/facts.ts:16            facts
src/ui/host/headsRoute.ts:11       heads
src/ui/host/commandPages.ts:13     commands
src/ui/host/snapshotRoute.ts:8     snapshot
src/ui/host/overview.ts:46         overview
src/ui/host/backfill.ts:14         backfill
src/ui/host/sshRoute.ts:31         ssh
src/host/usageRoute.ts:56          usage（字面量 '/api/tongji/usage'）
```

`ssh` 由 `src/host/index.ts:38-39` 在合并入口里注册（先 `registerUsageRoute`，再 `registerSshRoute`），因此它在版本基线短路之前就存在，低版本宿主也拿得到。`AGENTS.md` 第 7 节的文档清单同样已写作「15 条」。

| # | 方法 | 路径 | Host 常量 | Client 常量 / 调用点 | 必填入参 |
| --- | --- | --- | --- | --- | --- |
| 1 | POST | `/api/tongji/version` | `src/ui/host/versionRoute.ts:7` | `apiRoutes.ts:25`；`versionSource.ts:51` | 无 |
| 2 | POST | `/api/tongji/skills` | `src/ui/host/skills.ts:8` | `apiRoutes.ts:15`；`skills.ts:27-35` | 无（`sessionId`/`cwd` 可选） |
| 3 | POST | `/api/tongji/recom` | `src/ui/host/recoms.ts:5` | `apiRoutes.ts:11`；`recomCard.tsx:38` | 无 |
| 4 | POST | `/api/tongji/fleet` | `src/ui/host/fleet.ts:20` | `apiRoutes.ts:13`；`fleetDetail.ts:227-261` | `sessionId` 或 `batch` |
| 5 | POST | `/api/tongji/attachment` | `src/ui/host/attachment.ts:10` | `apiRoutes.ts:19`；`attachmentSource.ts:26` | `sessionId`、`attachmentId` |
| 6 | POST | `/api/tongji/detail` | `src/ui/host/detail.ts:13` | `apiRoutes.ts:1`；`timelineSource.ts:152`、`agentHeads.ts:18-23` | `sessionId` |
| 7 | POST | `/api/tongji/delta` | `src/ui/host/delta.ts:16` | `apiRoutes.ts:3`；`timelineSource.ts:217-222` | `sessionId`、`seq`、`baseSeq` |
| 8 | POST | `/api/tongji/facts` | `src/ui/host/facts.ts:16` | `apiRoutes.ts:5`；`timelineSource.ts:235-240` | `sessionId` |
| 9 | POST | `/api/tongji/heads` | `src/ui/host/headsRoute.ts:11` | `apiRoutes.ts:7`；`agentHeads.ts:38-40` | `ids` |
| 10 | POST | `/api/tongji/commands` | `src/ui/host/commandPages.ts:13` | `apiRoutes.ts:9`；`commandPages.ts:64-69` | `sessionId` |
| 11 | POST | `/api/tongji/snapshot` | `src/ui/host/snapshotRoute.ts:8` | `apiRoutes.ts:21`（无调用点） | 无 |
| 12 | POST | `/api/tongji/overview` | `src/ui/host/overview.ts:46` | `apiRoutes.ts:23`；`overviewSource.ts:286` | `part` |
| 13 | POST | `/api/tongji/backfill` | `src/ui/host/backfill.ts:14` | `apiRoutes.ts:17`；`overviewSource.ts:392`（裸 `fetch`，不解析 body） | 无 |
| 14 | GET | `/api/tongji/usage` | `src/host/usageRoute.ts:56`（字面量，无导出常量） | `turnUsage.tsx:51`（本地常量）、`:158`（请求） | 查询参数 `sessionId` |
| 15 | GET | `/api/tongji/ssh` | `src/ui/host/sshRoute.ts:31` | `apiRoutes.ts:27`；`sshCard.tsx:99` | 查询参数 `sessionId`（可缺省） |

`snapshot` 是服务端已注册、客户端未接线的接口（`src/ui/host/snapshotRoute.ts:79-82` 注册；`src/ui/client/apiRoutes.ts:21` 只导出常量）。它当前没有真实消费方，改动前先确认还要不要留。

## 逐条契约

### 1. POST /api/tongji/version

依赖 `connection`（`src/ui/host/versionRoute.ts:10-14`）。返回最新 release 与本地版本。

入参：无（body 被忽略）。

返回 `value` 字段（`src/ui/host/versionRoute.ts:19-32`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ready` | boolean | 是否取到最新版本号（= `value !== null`，`src/ui/host/catalog.ts:101`） |
| `failed` | boolean | 最近一次拉取是否失败 |
| `checkedAt` | number | 最近一次拉取时间（ms epoch） |
| `current` | string \| null | 本地插件版本，读 `package.json`（`src/ui/host/catalog.ts:116-126`），失败为 `null` |
| `harness` | string \| null | 探测到的 DSH 版本，探测不到为 `null`（README.md:139） |
| `updateAvailable` | boolean \| null | 两侧都有版本号时才给出，否则 `null` |
| `latest` | string（可缺省） | 无最新版本号时整个字段不出现 |

错误：仅 `gateway/internal`（`src/ui/host/versionRoute.ts:33-35`）。Client 的解码器丢弃 `harness` 字段，只用 `ready/failed/checkedAt/current/latest` 并自行重算 `updateAvailable`（`src/ui/client/versionSource.ts:23-39`）。

### 2. POST /api/tongji/skills

依赖 `connection`（`src/ui/host/skills.ts:111-114`）。列出技能目录。

入参：`sessionId?`、`cwd?`（`src/ui/host/skills.ts:120-124`）。给了 `sessionId` 会先读会话头拿 `cwd` 与 `agentPreset`，`cwd` 以会话头为准（`src/ui/host/skills.ts:41-70,123-124`）。

返回 `value`：`{ skills: SkillInfo[] }`，`SkillInfo = { name, description, path?, source? }`（`src/ui/shared/types.ts:65-70`）。最多 500 条（`src/ui/host/skills.ts:10,136`）。读不到注册表时 `value` 为 `null`（`src/ui/host/skills.ts:117,144`）。

错误：无专用错误码；读注册表或解析 body 抛异常都被吞掉并回 `value: null`（`src/ui/host/skills.ts:140-144`）。只有 body 非 JSON 会得到 `tongji/bad-request`（`src/ui/host/postRoute.ts:55-57`）。

### 3. POST /api/tongji/recom

依赖 `connection`（`src/ui/host/recoms.ts:58-62`）。返回推荐位清单，Host 侧带 1 小时成功缓存 / 30 秒失败退避（`src/ui/host/recoms.ts:7-9,64-69`）。

入参：无。返回 `{ ok: true, value: Recom[], degraded }`——`degraded` 在 `value` 之外，`value` 是裸数组（`src/ui/host/recoms.ts:65,69`）。`Recom` 形状见 `src/ui/shared/recoms.ts:8-16`。

错误：没有错误分支。两个来源都失败时回内置条目 + `degraded: true`（`src/ui/host/recoms.ts:24-37`，README.md:138）。

### 4. POST /api/tongji/fleet

依赖 `connection`（`src/ui/host/fleet.ts:579-583`）；缺 `sessionQuery` 时回 `value: null`。编队视图用一个接口承载四种请求（`src/ui/host/fleet.ts:677-727`）。

| body | 语义 | 返回 `value` |
| --- | --- | --- |
| `{ sessionId, summary: true }` | 会话摘要 | `FleetSummary`（`src/ui/shared/types.ts:138-145`） |
| `{ sessionId }` / `{ sessionId, history: true }` / `{ sessionId, full: true }` | 子代理详情 | `FleetDetail`（`src/ui/shared/types.ts:111-120`） |
| `{ batch: { ids: string[], mode, rootId? } }` | 批量取详情 | `FleetBatchValue`（`src/ui/shared/types.ts:153-157`） |

参数细节：`full` 优先于 `history`（`src/ui/host/fleet.ts:28-31`）；批量最多 16 个 id，去重、空串丢弃（`src/ui/host/fleet.ts:26,508-522`）；`mode` 只认 `history`，其余按 `preview`（`src/ui/host/fleet.ts:521`）。文本裁剪：`preview` 保留 80 条消息、单条 400 字，首条提示词 1600 字、末条回复 300 字；`history` 不截条数但仍截字符；`full` 都不截（`src/ui/host/fleet.ts:22-26,235-248`）。被截断时 `truncated: true`。

错误：缺 `sessionId`（且不是 `batch`）→ `tongji/bad-request` / `missing sessionId`；处理异常 → `gateway/internal`（`src/ui/host/fleet.ts:693-695,688,725`）。

### 5. POST /api/tongji/attachment

依赖 `connection`（`src/ui/host/attachment.ts:207-212`）。把会话事件里的附件引用解析成 Host 上的文件路径。

入参：`sessionId`、`attachmentId`，缺任一即 `tongji/bad-request`（`src/ui/host/attachment.ts:218-223`）。

返回 `value`：`{ path: string }` 或 `null`。`path` 是**宿主文件系统的绝对路径**（`src/ui/host/attachment.ts:237`），图片会先落一个预览别名再返回（`src/ui/host/attachment.ts:84-117`）。以下情况返回 `null`：缺 `sessionQuery`、事件里找不到该 `attachmentId`、宿主附件服务缺少对应的 `fileHostPath` / `imageHostPath`、冷读被闸门拦下（`src/ui/host/attachment.ts:225-242`）。

错误：仅 `gateway/internal`（`src/ui/host/attachment.ts:244`）。

### 6. POST /api/tongji/detail

依赖 `connection`、`sessions`；宿主没有 `sessions.get` 时 handler 返回 `undefined`，该条不注册（`src/ui/host/detail.ts:87-90`、`src/ui/host/postRoute.ts:73-76`）。

入参：`sessionId`（必填）、`head?`（`true` 时只回头部）。缺 `sessionId` → `tongji/bad-request`（`src/ui/host/detail.ts:100-103`）。

返回 `value`：

- `head: true` → `{ rev: number, head: Snapshot }`（`src/ui/host/detail.ts:23-25,109`）。命中冷缓存且当时没存 `head` 时可能只有 `{ rev }`（`src/ui/host/detail.ts:126-130`）。
- 否则 → `ContextTimelineDetail`（`src/ui/shared/types.ts:265-278`）。
- 活会话但投影状态还没建好、或冷读被拦 → `value: null`（`src/ui/host/detail.ts:107-111,114-116`）。

错误：`tongji/bad-request`、`gateway/internal`（`src/ui/host/detail.ts:102,148`）。

### 7. POST /api/tongji/delta

依赖 `connection`、`sessions`（`src/ui/host/delta.ts:83-88`）。算某一步相对基线的上下文增量。

入参：`sessionId`（string）、`seq`（number \| null）、`baseSeq`（number \| null）。三者缺一即 `tongji/bad-request` / `sessionId, seq and baseSeq are required`（`src/ui/host/delta.ts:99-103`）。数字必须是安全整数且 ≥ 0，否则同样按缺参处理（`src/ui/host/delta.ts:29-32`）。

`seq: null` 表示「最新视图」，此时返回里 `viewNodes` 被清空（`src/ui/host/delta.ts:48`）；`baseSeq: null` 表示没有基线。

返回 `value`：`ContextDelta`（`src/ui/shared/delta.ts:6-21`）：`added`、`viewNodes`、`viewHeader`、`viewSystem`、`system`、`tools`、`header`、`counts`、`tokens`、`removedCounts`、`tokenUp`、`tokenDown`、`items`、`total`。`value` 可为 `null`（`src/ui/host/delta.ts:109,115`）。

错误：`tongji/bad-request`、`gateway/internal`（`src/ui/host/delta.ts:102,137`）。

### 8. POST /api/tongji/facts

依赖 `connection`（`src/ui/host/facts.ts:247-252`）。按「部件」拉时间线的局部，用来替掉整份 `detail`。

入参：`sessionId`（必填）、`parts?`、`window?`。

- `parts` 白名单：`head`、`series`、`stats`、`requests`、`nodes`、`events`、`files`、`commands`、`spans`、`jobs`；不传或全不合法时按全集处理（`src/ui/host/facts.ts:28-30,78-91`）。
- `window` 六个字段 `requestsTail`、`nodesTail`、`eventsTail`、`filesTail`、`commandsTail`、`spansTail`，逐项 `Math.min(上限, Math.max(1, floor(v)))`；缺省取折叠上限（`src/ui/host/facts.ts:33-46,65-76`）。

返回 `value`（`src/ui/host/facts.ts:200-229`）：`rev`、`live`、`asOfSeq?`、`parts`、`missing?`，活会话还可能带 `cwd`（`src/ui/host/facts.ts:295-298`）。`parts` 里只会出现被请求且能给的部件；活投影与详情状态 `detailRev` 不一致时，详情类部件与 `series` 被列进 `missing` 且不返回（`src/ui/host/facts.ts:210-221`）。

错误：`tongji/bad-request` / `missing sessionId`、`gateway/internal`（`src/ui/host/facts.ts:282,325`）。

### 9. POST /api/tongji/heads

依赖 `connection`、`sessionQuery`、`sessions`、`sessionProjectionCache`、`sessionProjections`（`src/ui/host/headsRoute.ts:85-89`）。批量取头部快照，供子代理树用。

入参：`ids: string[]`，去重、丢空串、最多 64 个（`src/ui/host/headsRoute.ts:13,21-33`）；空数组 → `tongji/bad-request` / `missing ids`（`src/ui/host/headsRoute.ts:109`）。

返回 `value`：`Record<sessionId, { head: Snapshot, asOfSeq?: number }>`（`src/ui/host/headsRoute.ts:35-42,159`）。取不到的 id 直接不出现在结果里，不报错。三条取值路径依次是活投影 → 投影缓存 → 冷读折叠（`src/ui/host/headsRoute.ts:125-157`）。

错误：`tongji/bad-request`、`gateway/internal`（`src/ui/host/headsRoute.ts:109,161`）。

### 10. POST /api/tongji/commands

依赖 `connection`、`sessionQuery`（`src/ui/host/commandPages.ts:108-112`）。命令执行列表的历史分页。

入参：`sessionId`（必填）、`beforeSeq?`（非负有限数）、`limit?`。`limit` 夹到 1–1000，缺省 400（`src/ui/host/commandPages.ts:15-16,130-132`）。

返回 `value`：`CommandPage = { commands: CommandRecord[], atStart: boolean, total: number }`（`src/ui/shared/types.ts:282-286`）。`atStart` 表示再往前没有更多；`total` 是折叠里保留的命令总数（`src/ui/host/commandPages.ts:54-64`）。`value` 可为 `null`（观察结果不是对象或缺 `events`，`src/ui/host/commandPages.ts:83,137`）。

错误：缺 `sessionId`、`beforeSeq` 非法 → `tongji/bad-request`（`src/ui/host/commandPages.ts:124-129`）；异常 → `gateway/internal`（`:147`）。

### 11. POST /api/tongji/snapshot

依赖 `connection`、`sessionQuery`、`sessions`、`sessionProjectionCache`、`sessionProjections`（`src/ui/host/snapshotRoute.ts:79-83`）。一次列出多个会话的紧凑投影。

入参：`ids?: string[]`、`revision?: string`。`ids` 超过 256 个 → `tongji/bad-request` / `at most 256 ids per request`（`src/ui/host/snapshotRoute.ts:10,66-75,101-103`）；非数组或空数组按「全部会话」处理。

返回：`{ ok: true, value, revision }`，命中相同 `revision` 时额外带 `unchanged: true` 且 `value` 为 `{}`（`src/ui/host/snapshotRoute.ts:110-112,136-137`）。注意 `revision` / `unchanged` 在**信封顶层**，不在 `value` 里——`overview` 放在 `value` 里，两者不一致。

`value` 是 `Record<sessionId, { contextTimeline?, contextActivity? }>`；`contextTimeline` 被裁剪成 `ok`、`current`、`contextWindow`、`counts{turns,steps}`、`cost`、部分 `timing`（`tools` 恒为 `{}`）、`lastUser` 与三个生成量；`contextActivity` 原样透传（`src/ui/host/snapshotRoute.ts:12-63,128-135`）。

错误：`tongji/bad-request`、`gateway/internal`（`src/ui/host/snapshotRoute.ts:102,139`）。

### 12. POST /api/tongji/overview

依赖 `connection`、`sessionQuery`、`sessions`、`sessionProjectionCache`、`sessionProjections`（`src/ui/host/overview.ts:277-281`）。跨会话总览，按 `part` 分四次读。

入参（`OverviewRequest`，`src/ui/shared/types.ts:561-569`）：

| 字段 | 取值 | 缺省 |
| --- | --- | --- |
| `part` | `summary` / `days` / `page` / `tally` | 必填，非法即 `tongji/bad-request` / `unknown overview part`（`src/ui/host/overview.ts:66,134,499`） |
| `revision` | 上次返回的 `revision`，最长 200 字符 | 无 |
| `scope.range` | `today` / `7d` / `30d` / `{ start, end }` | `30d`（`src/ui/host/overview.ts:74-90`） |
| `scope.coverage` | `all` / `active` / `archived` | `all` |
| `scope.day` | `YYYY-MM-DD` | 无 |
| `scope.group` / `scope.query` | 分组键 / 搜索串（截到 500 字符） | 无（`src/ui/host/overview.ts:48,103`） |
| `sort` | `recent` / `tokens` / `context` | `recent` |
| `page` | 非负整数 | 0 |
| `tally` | `skills` / `tools` / `cmds` | `skills` |
| `pick` | `{ field, name }` | 无（`src/ui/host/overview.ts:113-119`） |

返回 `value`（`src/ui/shared/types.ts:650-675`）：四种 part 对应 `summary` / `days` / `page` / `tally` 之一，都带 `revision`；`revision` 与请求一致且该请求已服务过时回 `{ revision, unchanged: true }`（`src/ui/host/overview.ts:446-449`）。逐字段形状见 `types.ts:583-648`。

错误：`tongji/bad-request`、`gateway/internal`（`src/ui/host/overview.ts:499,506`）。

### 13. POST /api/tongji/backfill

依赖 `connection`（`src/ui/host/backfill.ts:312-316`）；真正的折叠跑在另一组依赖上（`sessionQuery`、`sessionProjectionCache`、`sessionPersistence`、`sessions`，`src/ui/host/backfill.ts:323-337`）。

入参：无（body 被忽略）。每次调用触发一轮补算请求并立刻返回当前覆盖度（`src/ui/host/backfill.ts:317-321`）。

返回：`{ ok: true, coverage: BackfillCoverage }`——**没有 `value`**，与其余 POST 路由不同。`BackfillCoverage = { complete, remaining, failed, running, total, covered, unsupported }`（`src/ui/shared/types.ts:528-536`）。

错误：无专用错误分支；该 handler 不会回 `ok:false`。Client 端是裸 `fetch` 后丢弃响应，只把它当触发器（`src/ui/client/overviewSource.ts:386-395`）。

### 14. GET /api/tongji/usage

tongji 自有路由，注册在合并入口的最前面，宿主版本过低时也保留（`src/host/index.ts:34-41`）。依赖 `connection.fetch.register` 与 `sessionQuery`，缺一个就整条不注册（`src/host/usageRoute.ts:44`）。

入参：查询参数 `sessionId`（必填）。缺失或空串 → HTTP 400 + `{ error: { code: 'invalid-session-id', message: '缺少 sessionId', retryable: false } }`（`src/host/usageRoute.ts:60-61`；测试 `tests/usage.test.js:104-106`）。

返回：**不是** `{ ok, value }` 信封，而是 `{ turns, total }`（`src/host/usageRoute.ts:63-64`、`src/host/usage.js:203-211`）：

- `turns`：`Record<turnKey, Bucket>`，`turnKey` 是轮次号字符串或 `unassigned`（`src/host/usage.js:160-164`）；每个 `Bucket` 含 `input`、`output`、`read`、`write`、`samples`、`unknown`、`cacheInput`、`cacheSamples`、`cacheMissing`、`steps`（`src/host/usage.js:1,6,209`）。`steps` 是按步骤的同一组字段。
- `total`：同一组字段的汇总，`steps` 固定为 `{}`（`src/host/usage.js:203-211`）。

错误映射见上文错误码表；`retryable` 由 `code !== 'invalid-session-id'` 决定，所以 499/5xx 都是 `true`（`src/host/usageRoute.ts:13-26`）。失败会写一条 `logger.warn`（`:67`）。

### 15. GET /api/tongji/ssh

tongji 自有路由（`src/ui/host/sshRoute.ts:201-215`），只读本地 `~/.ssh/config`、`which ssh` 与命令文本，不发起连接（`src/ui/host/sshRoute.ts:1-15`）。

入参：查询参数 `sessionId`，**可缺省**。缺省或宿主没有 `sessionQuery` 时仍回 200，`connections: []`、`events: 0`，只给 `client` 与 `hosts`（`src/ui/host/sshRoute.ts:220-222`；测试 `tests/sshRoute.test.js:101-102`）。

返回 `SshPayload`（`src/ui/host/sshRoute.ts:37-42`）：`client`（ssh 可执行文件路径，找不到为空串）、`hosts`（`SshHostConfig[] = { alias, hostName, user, port }`，上限 24 条，`src/ui/shared/sshTargets.ts:10-15,25`）、`connections`（`SshConnection[] = { host, ok, count, turn, seq }`，按 `seq` 倒序，上限 20 条，`src/ui/shared/sshTargets.ts:17-23,27`、`src/ui/host/sshRoute.ts:141-145`）、`events`（本次扫描的事件数）。

错误：`tongji/request-aborted`（499）、`tongji/ssh-unavailable`（503，`retryable: true`）（`src/ui/host/sshRoute.ts:238-242`）。

## 本契约的边界

### 哪些数是估算

- `current.*` 的上下文占用、构成比例与图片 token 都是估算：文本按 4 字符/token，图片按 14px 分块网格；只有供应商上报占用与官方 breakdown 同时存在时，构成卡才不显示「估算」（README.md:44）。估算实现见 `src/ui/shared/estimate.ts`、`src/ui/shared/imageTokens.ts`。
- `usage` 的 `turns` / `total` 只统计日志里带合法 `usage` 的 `assistant/message` / `assistant/attempt`；无 usage 的轮次只让 `unknown` 加一，不补数（`src/host/usage.js:16-32,92-105`）。`cacheInput` / `cacheSamples` / `cacheMissing` 只在供应商报了 `cacheReadTokens` 时才有意义（`src/host/usage.js:25-31`）。
- `overview` 的 `tokens`、`turns`、`cacheHit`、`parts` 来自同一套折叠与估算，不是账单值。

### 哪些字段可能为 `null` / 缺省

- 所有 POST 路由的 `value` 都可能为 `null`：会话查询不可用、活投影未建好、冷读被堆内存闸门拦下、事件不是数组（`src/ui/host/coldRead.ts:21-38`、`src/ui/host/detail.ts:107-116`、`src/ui/host/facts.ts:288,323`、`src/ui/host/headsRoute.ts:152-157` 例外——那条是「键不出现」）。
- `version`：`current`、`harness`、`updateAvailable` 可为 `null`，`latest` 可缺省（`src/ui/host/versionRoute.ts:18-31`）。
- `detail` 的 `head: true` 分支可能只回 `{ rev }`，没有 `head`（`src/ui/host/detail.ts:126-130`）。
- `facts` 的 `asOfSeq` 可缺省，`missing` 数组可缺省（`src/ui/host/facts.ts:222-228`）。
- `overview` 的 `summary` 内 `cacheHit`、`tokenParts`、`timing` 可为 `null`（`src/ui/shared/types.ts:583-596`）。
- `fleet` 的 `descriptor`、`initialPrompt`、`lastReply`、`roster`、`delegations`、`messagesTotal` 都是可选键（`src/ui/shared/types.ts:111-120`）。

### 哪些接口只在特定 DSH 版本可用

代码内置基线 `0.2.0-rc.2`（`src/ui/shared/version.ts:1`）。`apply` 先注册 `version`、`recom`、`skills`、`fleet`、`attachment`，再做基线判断；低于基线时注册三条回退投影后直接 return（`src/ui/host/index.ts:42-52`）。因此：

| 宿主版本 | 可用的 `/api/tongji/*` |
| --- | --- |
| ≥ `0.2.0-rc.2` | 全部 15 条（各自依赖满足时） |
| < `0.2.0-rc.2` | `version`、`recom`、`skills`、`fleet`、`attachment`、`usage`、`ssh`；`detail`、`delta`、`facts`、`heads`、`commands`、`snapshot`、`overview`、`backfill` 不注册 |

`usage`、`ssh` 在合并入口里先于上游 `apply` 注册，所以不受基线短路影响（`src/host/index.ts:34-41`）。README.md:72 记录同一基线。

### 未验证的点

1. **HTTP 方法不匹配时的响应**：插件只声明 `methods`，实际拦截在宿主的 `connection.fetch`，其状态码与 body 不在本仓库（`src/ui/host/connection.ts:1-10` 只声明了 `register` 的入参形状）。
2. **POST 路由错误一律 HTTP 200**：由源码推断（`src/ui/host/postRoute.ts:27-29,45-50`），没有测试断言；实机抓包未做。
3. **访问控制**：宿主是否按会话/来源限制这些路径，未验证；插件层无任何校验。
4. **`snapshot` 的真实消费方**：仓库内没有调用点，是否有外部（宿主或其他插件）在用，未验证。
5. **`fleet` 的 `counts` 缓存**：`readAt` 来自 Host 进程内的桶，跨重启后首屏可能缺键（`src/ui/host/fleet.ts:524-560`）；实机行为未逐项验证。
6. **`overview` 的磁盘缓存**：`identityMode` 依赖 `sessionPersistence.stat`，该能力缺失时走另一条分支（`src/ui/host/overview.ts:413-419,431-481`）；两条分支的实机差异未验证。
