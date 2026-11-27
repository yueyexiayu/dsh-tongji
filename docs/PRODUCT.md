# tongji 产品说明

本文件说明 `tongji` 为什么存在、给谁用、做到哪、做到什么程度算合格，以及它与 DSH 官方统计视图、上游 `dsh-context` 的边界。所有结论都来自本仓库的源码、README、测试与包元数据，出处标在结论后；查不到的写在最后一节「未验证」。

## 1. 问题与代价

DSH 的一次会话会留下三类可观测痕迹：会话统计快照、`sessionProjections` 投影与会话日志；`tongji` 的 Host 侧就是把这三类数据折叠成面板（`README.md:5`、`README.md:62`、`src/host/index.ts:1-9`）。没有这层折叠时，代价是具体的：

1. **每轮花了多少 token 只能猜。** 未命中输入、缓存命中输入、累计输入/输出、主代理输出速度这些数字分散在事件流里：用量只在 `assistant/message` 事件的 `data.usage`，或流式 `chunk` 的 `usage` 记录上（`src/host/usage.js:16-32`）。没有折叠就没有每轮/每步的对照，缓存命中率也无从判断。
2. **上下文被谁吃掉看不出来。** 系统提示词、工具定义、用户消息、注入内容、技能注入、助手输出各占多少，需要按请求拆开上下文才能回答（`README.md:43`），而这正是面板「请求详情」在做的事。
3. **多代理与后台作业的状态会丢。** 子代理用量要归到创建它的主会话轮次，继承历史不能重复计入，定位不到创建轮次的要单列为「未归属」（`README.md:37`）；后台作业要从 `job/registered` / `job/settled` 事件重建（`README.md:48`）。手工做这件事既慢又容易把父会话历史重复计一遍——这正是回归测试在守的不变量（`tests/usage.test.js:26`、`tests/usage.test.js:38`）。
4. **跨会话复盘要重扫全部日志。** 今日 / 7 天 / 30 天趋势必须合并多会话数据，本插件为此维护一份磁盘总览缓存，且只合并本次新增的会话（`README.md:63`、`src/ui/host/overviewCache.ts:9-25`）；不缓存就等于每次打开都全量重扫。

需要说清的是：官方「统计」视图仍然存在且保持原样（`README.md:13`），本插件不是它的修补件，而是把上述派生数据作为增量能力放进界面。官方视图具体覆盖哪些字段，本仓库没有核对依据（见第 8 节）。

## 2. 用户与场景

用户是**在本机运行 DSH Desktop、并把插件注册进 desktop profile 的开发者**：安装路径固定为 `~/.dsh/plugins/tongji`，靠 profile 的 `link:` 依赖与 `dsh.profile.bundles` 加载（`README.md:72`、`README.md:82-97`）。插件只读本地会话数据，没有服务端、没有账号体系（`README.md:13`、`README.md:62`），所以不存在「团队共享报表」这类用户。

真实场景可以直接从入口表（`README.md:19-24`）与功能面推出，每个入口对应一个打开时机：

| 时机 | 打开什么 | 用户在看什么 |
| --- | --- | --- |
| 对话跑到一半，觉得这一轮变慢或变贵 | 对话右侧会话面板里的「统计」分栏（`README.md:19`） | 会话总计、每轮用量、缓存命中率；面板打开时每 5 秒轮询一次（`src/ui/client/components/turnUsage.tsx:173`，行为有测试守着 `tests/client.test.js:303`） |
| 怀疑上下文膨胀，要定位是哪一块 | 「统计面板」视图标签页（`README.md:20`） | 上下文时间线（总量/增量/DNA 指纹）、请求详情、工具定义规模、文件活动（`README.md:42-46`） |
| 命令失败或作业跑到后台 | 同上，「命令执行」与「后台任务」卡片（`README.md:47-48`） | 退出码、stderr、截断标记、沙箱拒绝、超时、作业 id 与耗时 |
| 跑多代理任务，想看谁在做什么 | 「编队」标签页（`README.md:21`） | 子代理树、角色、任务徽章、Agent 网络、往来消息（`README.md:53`） |
| 收工复盘或横向比较 | 主页面 + 侧栏「上下文洞察」（`README.md:22`） | 跨会话总览（今日 / 7 天 / 30 天）、按日热力与趋势、技能目录、推荐位（`README.md:54`） |
| 想回到某一轮的上下文现场 | 助手消息动作区（`README.md:23`）、输入框浮层（`README.md:24`） | 从一轮跳到上下文视图对应位置；输入时快速看一眼上下文 |
| 想给所有会话统一加约定 | 插件页「配置」的设置卡（`README.md:25`、`README.md:58`） | 前缀/后缀拼进系统提示词首尾，对所有代理含子代理生效，默认留空 |

入口位置本身是可配置的：`statsSection`、`fleetTab`、`insightsEntry`、`defaultPlacement` 等都写在设置卡或 cordis 配置里（`README.md:105-116`）。换句话说，这个插件默认「在对话旁边」，但不强迫用户一直看见它。

## 3. 能力边界

### 3.1 做什么

- **用量**：会话总计、每轮摘要、每步明细；轮次默认折叠，展开才挂载步骤表（`README.md:35`）。指标包括未命中输入、缓存命中输入（附命中率）、累计输入（含缓存写入）、累计输出、累计 token 总量、主代理输出速度（`README.md:36`）。
- **上下文**：时间线、请求详情、上下文事件（注入/压缩/剪枝/模型切换/模式切换）、工具定义与文件活动、命令执行、后台任务、附件预览与历史分页（`README.md:42-49`）。更早历史按官方会话查询接口分页加载，打开面板不拉全量（`README.md:49`）。
- **编队与洞察**：子代理树、Agent 网络图、往来消息；跨会话总览、趋势、技能目录、推荐位（`README.md:53-54`）。
- **Host 路由**：前缀 `/api/tongji/`，用 `connection.fetch.register` 注册；用量路由在缺少 `connection` / `sessionQuery` 服务时可以不注册，此时面板其余部分照常（`src/host/usageRoute.ts:39-44`、`src/host/usageRoute.ts:55-71`）。

### 3.2 不做什么（明确边界）

1. **不展示余额、花费、价格，也不联网取价目表。** 面板里没有金额字段（`README.md:5`、`README.md:38`）。这不是待办：0.1.21 已把余额与成本功能整体下线，删除 `/api/tongji/balance` 路由、`ui/host/balance.ts`、`ui/shared/pricing.ts` 等（`src/ui/NOTICE.md:43-52`）。界面词典里也查不到金额类文案（实测 `grep -n '余额\|花费\|价格\|金额' src/ui/client/i18nZh.ts` 无匹配）。残留的 `Cost*` 类型只是 token 桶的历史命名，不含金额（`src/ui/NOTICE.md:49-51`、`src/ui/host/foldMetering.ts:1`）。
2. **不发起模型调用，不代替用户执行工具。** Host 侧只调用 `sessionQuery.observeSession(id, { projectionMode: 'none' })` 读事件，取完立刻 `dispose`（`src/host/usageRoute.ts:46-53`）；README 同样声明只读（`README.md:13`）。
3. **不接管官方统计视图，不抢右侧栏，不占官方输入条。** 统计是会话面板里的一个 section（`src/ui/client/sessionPanel.ts:6-30`），测试断言没有任何 `sidebar.right.*` 注册，且不注册 `conversation.composer.bar`（`tests/client.test.js:277-283`）。
4. **不改写宿主组件结构，但在会话面板宽度上有 CSS 覆盖。** 这条要分开说：注册方式是插件槽位而不是改宿主组件（`src/ui/client/sessionPanel.ts:26-29`）；可 `src/ui/client/styles/sessionPanel.css:28-50` 确实覆盖了 `--panel-min-width`、`--dsh-chat-end-inset` 和面板宽（`min(720px, 37.5% 视口)`），并有测试锁定这些值（`tests/sessionPanelStyles.test.js:35-45`）。仓库 `AGENTS.md` 第 3 节第 5 条已把「比例分宽、用 `!important` 覆盖宿主变量」记成现行实现，并要求改宽度时同步改测试与 README。`README.md:19` 原写「沿用 DSH 官方 300–360px，插件不再改写宿主布局」，与实现冲突；2026-11-28 已按实现改正为「按对话视口 37.5% 分宽、上限 720px，并覆盖宿主变量」，登记见第 7 节。
5. **不是网络服务。** 全仓库只有三处出网，且都可降级：版本检查走本仓库 GitHub Releases（`src/ui/host/catalog.ts:10`）、推荐位清单 `raw.githubusercontent.com`，失败回退 `gh-proxy.org`（`src/ui/shared/recoms.ts:28-30`）、推荐位图标 `cdn.simpleicons.org`（`src/ui/shared/recoms.ts:36`）；三处都不影响其余面板（`README.md:65`）。
6. **不做多语言。** 只有一份中文词典，`en` 只是回退链上的同义指针（`src/ui/client/i18n.ts:5-14`、`README.md:29`）。

## 4. 验收口径

一个版本算「做成了」，要同时满足下面几条；任何一条只有文字没有输出，就不算。

1. **`npm run verify` 全绿。** 它等于 `node --check` 三个产物 + `tsc --noEmit` + `node --test tests/*.test.js`（`package.json:18-24`、`README.md:122-125`）；项目约定交付前必须真跑并看输出（仓库 `AGENTS.md` 第 2 节）。
2. **用例数与实测一致。** 当前仓库共 13 个测试文件、实测 61 个 `test(` 用例（`grep -o 'test(' tests/*.test.js | wc -l` → 61；分布：client 7、usage 10、jobs 8、sshTargets 7、taskRollup 5、failedAgents 4、overviewCache 4、sshRoute 4、seedCut 3、version 3、conversationSurface 2、fold 2、sessionPanelStyles 2）。`README.md:129` 记 `v0.1.52` 的 61 例、61 通过 / 0 失败，与实测计数一致；但该结论引用的是别人的一次运行输出，本文件没有复跑 `npm run verify`，只核对了用例条数。
3. **数据准确性可自证。** 估算值必须带「（估算）」；只有供应商上报占用与官方 breakdown 同时存在时才不标（`README.md:44`）。相应的负向约束也有测试：空会话不能编数字（`tests/client.test.js:383`）、畸形载荷不得被强转成 0（`tests/client.test.js:414`）、非法 usage 值变成 unknown 而不是污染合计（`tests/usage.test.js:163`）。
4. **缓存不变量成立。** 单条保存要保留磁盘上已有记录、替换保存可缩减、条目按最近更新时间保留、字节上限生效（`tests/overviewCache.test.js:36-74`）。
5. **版本声明自洽。** 截至本次核对，`package.json:3` 为 `0.1.52`，`README.md:7` 为 `v0.1.52`，一致；两份 README 各有一处版本声明需同步（仓库 `AGENTS.md` 第 5 节）。版本号随交付递增，读这份文档时请以文件当前值为准，不要照抄本节数字。
6. **面板可用性要实机确认。** 插件改动需完全退出 DSH（⌘Q）重开才加载（`README.md:97`、仓库 `AGENTS.md` 第 4 节）；「测试全绿」不等于「面板渲染正常」。此项当前状态见第 8 节。

## 5. 非功能约束

- **只读本地数据。** 读会话统计快照、投影与日志；`observeSession` 显式用 `projectionMode: 'none'` 并在 `finally` 里释放观察对象（`src/host/usageRoute.ts:47-52`）。写盘只有总览缓存一处（见下）。
- **内存上限。** Host 折叠按会话保留增量缓存，按最近使用顺序有界淘汰（`README.md:62`、`src/ui/host/foldCache.ts:42`）；超过 3 万条事件的会话交给**单个**后台 worker 折叠，同时只跑一个，忙时回退 Host 线程（`README.md:62`）。单次折叠保留量由 8 个上限控制：`maxRequestSteps 1500`、`maxKeptTurns 300`、`maxEvents 400`、`maxNodes 2000`、`maxArchiveNodes 400`、`maxFileOps 400`、`maxCommands 400`、`maxCommandChars 4096`（`src/ui/host/config.ts:4-12`、`README.md:118`）。用量折叠自带 128 会话缓存与 4 路并发（`src/host/usage.js:2-3`）。
- **磁盘上限。** 总览缓存 4000 条 / 24 MB，超限按最近更新时间保留（`src/ui/host/overviewCache.ts:22-25`、`README.md:63`），写在 `~/.dsh/storages/tongji/overview-cache.v1.json`（`src/ui/host/overviewCache.ts:14`、`src/ui/host/overviewCache.ts:104-109`），并且一次只合并本次新增的会话。已知缺口：折叠缓存按现存会话过滤，但没有按字节设上限，README 记录本机约 5 MB（`README.md:136`）。
- **估算口径固定且要标注。** 文本按 4 字符/token（`src/ui/shared/estimate.ts:1-12`），图片按 14px 分块网格、与 Qwen2-VL 同口径；DeepSeek 未公开图像计费口径，因此构成卡默认带「（估算）」（`README.md:44`）。
- **界面只有一份中文词典。** `DICTS = { en: DICT_ZH, zh: DICT_ZH }`，理由是 DSH 语言服务回退链以 `en` 收尾，只注册 `zh` 会露出键名（`src/ui/client/i18n.ts:5-14`）。`locale/zh.json`、`locale/en.json` 是插件清单元数据，不是界面文案（`README.md:29`）。实测中文词典 783 条键（`grep -c "^  '" src/ui/client/i18nZh.ts`）；README 原写 763 条，已于 2026-11-28 同步为 783。
- **版本基线。** 代码内置 `BASELINE_DSH_VERSION = '0.2.0-rc.2'`（`src/ui/shared/version.ts:1`、`README.md:72`）；低于基线时注册回退投影并提前返回，部分面板不出现（`src/ui/host/index.ts:47-52`）。构建期依赖钉在 `0.2.2-rc.5`（`package.json:33-40`），与运行中的 DSH 版本可能不同（`README.md:134`）。
- **轮询随面板生死。** 面板打开时每轮用量卡 5 秒轮询，关闭即停（`README.md:64`、`src/ui/client/components/turnUsage.tsx:173`）。
- **权限最高的一处要单独说明。** `promptPrefix` / `promptSuffix` 会把文本拼进所有会话系统提示词的首尾，对含子代理在内的所有代理生效，默认留空（`README.md:58`、`README.md:116`、`src/ui/host/promptInjection.ts:35-40`）。它不属于统计功能，改动必须单独交代影响范围。

## 6. 不是什么

**不是 DSH 官方统计视图的替代品。** 官方「统计」视图保持原样，本插件不修改它，只是在会话面板里追加一个 section，并另给一个可关闭的视图标签页（`README.md:13`、`src/ui/client/sessionPanel.ts:13-30`、`tests/client.test.js:296-302`）。插件自己的面板标签取自 `tab.panel`，文案是「统计面板」（`src/ui/client/i18nZh.ts:21`，行为有测试守着 `tests/client.test.js:296`）——与官方的「统计」视图名字相近，但不是同一个实现，读文档时别把官方视图的能力记到本插件账上。

**不是 `dsh-context` 本身，也不是它的发行版。** `src/ui/` 衍生自 [bowenliang123/dsh-context](https://github.com/bowenliang123/dsh-context) v0.84.1（Apache-2.0），许可证留在 `src/ui/LICENSE`；标识、路由前缀、存储路径、图标、词典与错误码前缀都已改写（`README.md:149`、`src/ui/NOTICE.md:10-20`）。`src/host/`（`usage.js`、`usageRoute.ts`、`index.ts`）是 tongji 自有代码，上游没有对应实现（`src/ui/NOTICE.md:5-8`）。所以「用量卡片」和「每轮/每步折叠」这类能力属于本仓库，出问题时不能拿上游文档解释。

**不是账单或计费工具。** 没有余额、花费、价格，也不联网取价目表（`README.md:5`、`README.md:38`、`src/ui/NOTICE.md:43-47`）。看到面板上的 token 数字，只能当**用量**读，不能当金额读。

**不是多语言产品，也不是服务。** 界面只有中文一份文案（`README.md:29`、`src/ui/client/i18n.ts:5-14`）；没有服务端、不写会话日志、不代替用户执行工具（`README.md:13`、`src/host/usageRoute.ts:46-53`）。

## 7. 已知不一致（登记，不悄悄改）

| 位置 | 文档写法 | 实测/源码 | 处理 |
| --- | --- | --- | --- |
| `README.md:19` | 曾写「沿用 DSH 官方 300–360px，插件不再改写宿主布局」 | 实际为 `min(720px, 37.5% 视口)`，并 `!important` 覆盖 `--panel-min-width`、`--dsh-chat-end-inset`（`src/ui/client/styles/sessionPanel.css:28-50`，`tests/sessionPanelStyles.test.js:40-45` 锁定） | **2026-11-28 已修正**：README:19 改为现行实现，限制节补第 143 行 |
| `README.md:66` | 曾写「Host 路由共 14 条」且名单漏 `ssh` | 源码注册 15 条：14 个 `*_ROUTE` 常量 + `src/host/usageRoute.ts:56` 的字面量，`ssh` 在 `src/host/index.ts:38-39` 注册 | **2026-11-28 已修正**：README 与 `AGENTS.md` 均改为 15 条 |
| `README.md:29` | 曾写词典 763 条；`locale` 两文件各 122 字节 | 实测 783 条键（`grep -c "^  '" src/ui/client/i18nZh.ts`）；`locale/zh.json` 125 字节、`locale/en.json` 133 字节 | **2026-11-28 已修正**：中英 README 同步新数字 |

上表三处均已在 2026-11-28 的文档补齐中修正，保留登记是为了留下「文档滞后于实现」的实例。本文所有 `README.md:行号` 按改动后的文件内容标注（`package.json` 版本 `0.1.52`），README 再增删行后需重新对齐。

## 8. 未验证

以下内容本仓库现有证据不足以确认，宁可留空也不编：

1. **DSH 官方统计视图具体覆盖哪些字段。** 仓库只声明「官方视图保持原样」（`README.md:13`），没有对照清单，因此第 1 节「没有插件时的代价」是从本插件新增能力反推的，不是对官方视图缺口的实测。
2. **当前版本的实机界面表现。** README 记录的实机验证版本是 DSH `0.2.3-alpha.2`（`README.md:133`）；本机运行中的 DSH 同为 `0.2.3-alpha.2`（`Info.plist` 的 `CFBundleShortVersionString` 实测），但面板在该版本上的渲染本轮未复测。
3. **后台任务卡片的真实渲染。** README 自述数据层已用真实日志折叠验证，界面渲染未在对应改动上复测（`README.md:142`）。
4. **低于 `0.2.0-rc.2` 基线的降级路径。** 代码路径存在（`src/ui/host/index.ts:47-52`），没有实机记录证明「哪些面板会消失」。
5. **折叠缓存当前实际占用。** `README.md:136` 说本机约 5 MB，属当时观测，本次未重新测量。
6. **`/api/tongji/*` 各路由的完整请求/返回契约。** 本文件只按需引用了用量与 SSH 两处；逐条方法、参数、返回与错误码应由 `docs/API.md` 承担（仓库 `AGENTS.md` 第 1 节、第 7 节），本文件不作为接口契约。
