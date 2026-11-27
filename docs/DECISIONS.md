# 关键取舍记录（ADR）

本文件记录 tongji 里已经落地的技术取舍：为什么这么选、代价是什么、证据在哪。状态一律为「已采纳」；被后续决定取代的条目在「背景」里写明取代关系，不删历史。

证据格式为 `路径:行号` 或 git 提交号。仓库内查不到实据的，写「未验证」，不补猜测。行号以 2026-11-28 复核时的工作树（基线提交 `cbccac0`，其父提交 `810c79a`；`package.json` 版本 `0.1.52`）为准。

---

## ADR-001 只统计 token 与轮次，不换算金额

**状态**：已采纳

**背景**：面板早期版本带余额与花费：`src/ui/host/balance.ts`、`src/ui/host/cost.ts`、`src/ui/shared/pricing.ts`、`src/ui/client/costRefresh.ts`、`balanceCapsule` 以及 `/api/tongji/balance` 路由都曾存在（`src/ui/NOTICE.md:43-52` 的 0.1.21 条目）。价格要联网取 `models.dev` 价目表，还要区分峰谷计价，而 DeepSeek 侧价格与计费口径会变，面板读到的 token 并不等于账单。

**决定**：余额、花费、价格三项整体下线，只保留 token 与轮次、缓存命中率等可直接由会话数据得出的指标；内部结构继续叫 `SessionCostUsage` / `CostBucketTotals`，但只装 token 桶，不含金额（`src/ui/host/foldMetering.ts:26-44`）。价目槽位与 `ModelBook` 一并移除，历史投影里带价格的旧行按版本丢弃（`TIMELINE_STATE_VERSION` 42→43，`src/ui/NOTICE.md:49-52`）。

**后果（含代价）**：

- 用户拿不到「这次会话花了多少钱」，只能自己按官方价目表换算；面板也不再是账单核对工具。
- 少了一整条网络依赖（价目表），面板在断网时与其他功能一样可用。
- 保留了 `cost` 这套命名，读代码时容易误以为有金额；改名会牵动折叠缓存格式，故没有改。
- 测试面收窄：原先 10 例价格与成本用例随功能下线删除，当前测试不再覆盖金额换算（`README.md:129`）。

**证据**：`README.md:38`、`README.md:129`、`src/ui/NOTICE.md:43-52`（0.1.21 的余额/成本下线记录）、`src/ui/host/foldMetering.ts:26-44`、提交 `174722f`（`feat: remove balance and cost entirely, keep token and context stats (v0.1.21)`，删除 `src/ui/client/balance.ts`、`src/ui/host/balance.ts` 等文件）。

---

## ADR-002 上下文与图片 token 用固定密度估算，只在供应商数据齐备时去掉「估算」标记

**背景**：上下文占用、构成比例和图片 token 没有一份完整的上游真值。DeepSeek 未公开图像计费口径，DSH 也不会对每个内容块给出 token 数；早先的文案自称「DeepSeek 官方换算」，属于无法自证的说法（提交 `6639e00` 的提交说明）。

**决定**：

- 文本按固定密度估算：`CHARS_PER_TOKEN = 4`，另加角色/块开销（`src/ui/shared/estimate.ts:1-11`）。
- 图片按 14px 分块网格、3 倍下采样、单图上限 1024 token 估算，明确写成与 Qwen2-VL 同口径（`src/ui/shared/imageTokens.ts:1-5`、`src/ui/shared/imageTokens.ts:95`）。
- 「估算」标记由 `headline.approximate` 控制：只有供应商上报的占用（`pressureTokens`）与官方 breakdown 同时存在、且当前占用确实取的是该采样值时才算实测，其余（投影补白、按 prompt 反推、`current.total`）一律标估算（`src/ui/client/headline.ts:38-55`）；标签渲染在 `src/ui/client/components/currentComposition.tsx:39`。

**后果（含代价）**：

- 中文与代码文本的字符/token 比并不稳定，长上下文里误差会累积，所以界面必须持续显示「估算」，不能当成精确值。
- 口径统一成一套可解释的算法（与 DSH 内置 tokenMeter 同一启发式，`src/ui/client/i18nZh.ts:508`），代价是没有按模型分别校准。
- 只有在拿到供应商采样时数字才「变准」，这依赖 DSH 投影提供 `pressureTokens` 与 `contextBreakdown`；两者缺一时界面会一直带「（估算）」。
- 图片估算与真实计费可能不一致，这是明示的已知偏差，不视为缺陷。

**证据**：`README.md:44`、`README.en.md:44`、`src/ui/shared/estimate.ts:1`、`src/ui/shared/imageTokens.ts:1-5`、`src/ui/client/headline.ts:41-44`、`src/ui/client/components/currentComposition.tsx:39`、`src/ui/client/i18nZh.ts:508`、`src/ui/client/i18nZh.ts:651`、提交 `6639e00`（`fix(stats): label estimates honestly and drop the DeepSeek image claim (v0.1.23)`）。

---

## ADR-003 界面只维护一份中文词典，`en` 指向同一份

**背景**：衍生代码原带多语言词典。0.1.18 先删掉 6 份未维护词典（de/es/fr/ja/pt/ru），0.1.19 再删英文词典（`src/ui/NOTICE.md:30-32`）。DSH 语言服务的回退链固定以 `en` 收尾（`FALLBACK_LOCALE = 'en'`），只注册 `zh` 时，界面语言一改成英文就会露出 `turnusage.title` 这类原始键名。

**决定**：只保留 `src/ui/client/i18nZh.ts` 一份文案，`DICTS` 里 `zh` 与 `en` 指向同一个对象（`src/ui/client/i18n.ts:14`）。改文案只改 `i18nZh.ts`（`src/ui/client/i18n.ts:5-12` 的注释即约定）。插件清单用的 `locale/zh.json`、`locale/en.json` 不算界面文案，只是 DSH 插件列表卡片的元数据（`README.md:29`）。

**后果（含代价）**：

- 英文界面用户看到的是中文面板——这是有意的取舍，换来零重复维护与更小的客户端包（`lib/client.js` 962 KB → 709 KB → 675 KB，`src/ui/NOTICE.md:30-33`）。
- 没有真正的本地化能力，对外分发时英文用户只能接受中文界面。
- 词典条数与 `locale` 文件字节数曾与 README 漂移（原文写 763 条、各 122 字节）：2026-11-28 实测 `i18nZh.ts` 783 条键、`locale/zh.json` 125 字节、`locale/en.json` 133 字节（`en.json` 里是英文标题），中英 README 已同步改正。本条保留为「数字没有随文件更新」的历史实例。
- 783 条是按 `grep -c "^  '" src/ui/client/i18nZh.ts` 统计的键行数，未做逐键唯一性校验：**未完全验证**。

**证据**：`README.md:29`、`src/ui/client/i18n.ts:5-16`、`src/ui/NOTICE.md:30-32`、提交 `c388fc8`（`chore(i18n): keep Chinese only`）、提交 `e0822a4`（`chore(i18n): keep Chinese and English only`）。

---

## ADR-004 系统提示词前缀/后缀：本插件权限最高的一处，默认留空

**背景**：插件需要一个能让指令对所有会话、所有代理生效的挂点。DSH 的 `systemPrompt` 以命名 section 加 order 排序，插件的注入会进到每一轮请求的系统提示词里，影响面比统计面板大得多。

**决定**：注册两个 section——`tongji:prompt-prefix` 排在 `HARNESS_IDENTITY` 之前 1000 位，`tongji:prompt-suffix` 排在 `DEPLOYMENT_PERSONA_SUFFIX` 之后 1000 位（`src/ui/host/promptInjection.ts:33-52`）。两者默认空串（`src/ui/host/config.ts:53-54`），空文本直接返回 `''` 而不写入空段（`src/ui/host/promptInjection.ts:26-31`）；文本按实时值读取，改设置后从下一轮开始生效，不需要重开会话（`README.md:58`）。设置卡里只有两个文本框（`src/ui/client/components/settingsCard.tsx:266-279`）。

**后果（含代价）**：

- 一次填写影响所有代理，包括子代理；写错内容会污染全部会话的系统提示词，且没有按会话或按代理的开关。
- 默认留空是刻意的安全边界：不填就等于插件不注入任何内容，行为与未安装该功能一致。
- 与统计数据不同，这里改的是模型可见的输入，属于功能红线；`AGENTS.md` 要求改动时单独说明影响范围（仓库根 `AGENTS.md` 第 3 节第 8 条）。
- 没有做长度上限或内容校验：配置 schema 只是 `z.string().default('')`（`src/ui/host/config.ts:53-54`），设置卡的文本行也没有 `maxLength`，用户填多长就注入多长——这是已知的、未加保护的入口。

**证据**：`README.md:58`、`src/ui/host/promptInjection.ts:33-52`、`src/ui/host/config.ts:53-54`、`src/ui/client/components/settingsCard.tsx:266-279`、`src/ui/client/i18nZh.ts:136-137`、仓库根 `AGENTS.md` §3.8。

---

## ADR-005 放弃改写宿主正文布局，把面板宽度回滚到 DSH 官方值

**背景**：0.1.33–0.1.37 为了让统计面板更宽，改写了 `--panel-min-width`、`content-width`、`end-inset` 等宿主变量，把面板推到 600–720px（`9e08ab5`、`c028adb`、`5b76976`、`90fe961`、`3fdd931`）。实机结果是正文与 composer 布局被破坏：输入框一度消失（`c028adb` 提交说明）、正文左移规则与 media 查询打架（`3fdd931`）。

**决定**：0.1.38 整体回滚加宽实验，布局回到 DSH 官方值，只保留面板内部的两列容器查询（提交 `e21cc42` 的提交说明与 `revert:` 标题）。这条决定当时写进约束（`README.md:19`、仓库根 `AGENTS.md` §3.5 的旧文案）；2026-11-28 起 README 与 `AGENTS.md` 已按 ADR-006 的实际实现改写成「比例分宽 + `!important` 覆盖宿主变量」，回滚结论只在「不破坏正文」这一层继续成立。

**后果（含代价）**：

- 面板在窄窗口里信息密度受限，卡片只能靠内部两列与折叠来容纳。
- 换来了正文、输入框与拖动宽度手柄不再被插件改坏，宿主升级时冲突面更小。
- 「DSH 官方 300–360px」这一区间来自宿主默认值，本仓库没有对应的断言或实测记录，属引用外部事实：**未验证**。
- 本条已被 ADR-006 部分取代：统计分栏后来又按比例覆盖了面板宽度，回滚结论只在「不破坏正文」这一层继续成立。

**证据**：`README.md:19`（2026-11-28 起为现行比例分宽口径）、仓库根 `AGENTS.md` §3.5、提交 `e21cc42`（`revert: 回滚面板加宽实验，布局回到 DSH 官方值`）、提交 `c028adb`、`3fdd931`、`9e08ab5`。

---

## ADR-006 统计分栏按对话列比例分宽，只覆盖统计面板必需的宿主变量

**背景**：回滚到官方宽度后，统计卡片在 300–360px 里挤成单列（0.1.43 起重新做分栏）。0.1.44–0.1.50 连续调整过窗口缩放、宿主宽度上限与默认窗口下的停靠行为（`208d7f8`、`2033af5`、`7c022f3`、`a0176c8`、`a623036`、`a23fa2a`、`a819242`）。

**决定**：面板宽度取对话可视宽度的 37.5%，上限 720px；只在 `[data-conversation-content]` 与 `[data-session-panel-probe]` 作用域内覆盖 `--panel-min-width`，并同步推算 `--dsh-chat-content-width-resolved` 与 `--dsh-chat-end-inset`；同时隐藏宿主的手动宽度手柄，避免两套宽度来源打架（`src/ui/client/styles/sessionPanel.css:23-55`）。这些覆盖有测试锁定（`tests/sessionPanelStyles.test.js:44-45`）。

**后果（含代价）**：

- 面板随窗口缩放，窄窗口不会留下固定宽度把正文挤走；但仍是改写宿主布局，宿主变量改名就会同时失效，需要跟着迁移。
- 只覆盖统计需要的几个变量，不改容器结构与交互，比 ADR-005 时期的全面接管收敛。
- **文档与实现曾不一致（2026-11-28 已修复）**：`README.md:19` 与仓库根 `AGENTS.md` §3.5 原写「沿用 DSH 官方 300–360px，插件不再改写宿主布局」，与 `sessionPanel.css:28-50` 的 37.5%/720px 覆盖矛盾；现已按实现改写为「比例分宽 + `!important` 覆盖」，并在 README「限制」补了一条说明。本条保留为口径漂移的实例。
- 本次没有在真实 DSH 窗口里复测分栏在 1280/1440 宽度下的表现（插件改动需重开 DSH 才加载）：**未验证**。

**证据**：`src/ui/client/styles/sessionPanel.css:23-55`、`tests/sessionPanelStyles.test.js:44-45`、提交 `208d7f8`、`2033af5`、`7c022f3`、`a0176c8`、`a623036`、`a23fa2a`、`a819242`（各提交标题分别对应分栏、缩放、宽度上限与默认窗口停靠）。

---

## ADR-007 磁盘总览缓存增量合并，设 4000 条 / 24 MB 上限，超大会话交给单个后台 worker

**背景**：早期写入是「用本次刷新的会话整份覆盖文件」。一条由 worker 折叠的会话就能把 5 MB / 2346 条的缓存塌成 1 条（提交 `567ef47` 的提交说明），总览因此反复重扫。折叠本身又会阻塞 Host 线程。

**决定**：

- 每次写入先读回磁盘上的旧文件再按会话 id 合并，只有持有全部冷会话的总览路由才用 replace 模式整份收缩（`src/ui/host/overviewCache.ts:225-266`）。
- 合并结果按 `updatedAt` 倒序保留，上限 4000 条 / 24 MB，超限时按比例收缩条目数（`src/ui/host/overviewCache.ts:23-25`、`src/ui/host/overviewCache.ts:237-247`）。
- 事件数超过 30000 的会话交给 worker 折叠（`src/ui/host/backfill.ts:67`、`src/ui/host/backfill.ts:468`）；worker 池只有单个槽位，忙时直接拒绝并回退到 Host 线程折叠（`src/ui/host/foldWorker.ts:156-169`、`src/ui/host/backfill.ts:499`）。

**后果（含代价）**：

- 写入多一次读盘与 JSON 解析，单次写盘成本上升；换来缓存不再被局部刷新截断。
- 4000 条 / 24 MB 是硬上限，会话极多的机器上老会话会被淘汰，下次总览需要重新扫描。
- 只跑一个 worker 意味着并发折叠退化为串行，忙时还要占用 Host 线程；选择它换取内存与线程数可控。
- 缓存有界不代表折叠缓存有界：按现存会话过滤但没有按字节数设上限（`README.md:136`）。
- 上限逻辑有回归测试覆盖（`tests/overviewCache.test.js:67`、`tests/overviewCache.test.js:76`），但测试用的是缩小后的 `maxEntries`/`maxBytes`，真实 24 MB 边界未跑过。

**证据**：`README.md:62-63`、`README.en.md:63`、`src/ui/host/overviewCache.ts:23-25`、`src/ui/host/overviewCache.ts:237-266`、`src/ui/host/backfill.ts:67`、`src/ui/host/backfill.ts:468-499`、`src/ui/host/foldWorker.ts:156-169`、`tests/overviewCache.test.js:67-76`、提交 `567ef47`（`fix: 修复缓存覆盖写、fork 继承重复计数与三处口径问题`）。

---

## ADR-008 `src/ui/` 作为衍生代码保留 Apache-2.0 许可与 NOTICE

**背景**：面板主体来自 `bowenliang123/dsh-context` v0.84.1，与本仓库自有代码混处一个 `src/`。衍生关系若不写明，后续改动会分不清哪些能改、哪些要跟随上游，也不满足 Apache-2.0 的署名与变更声明要求。

**决定**：`src/ui/` 明确标注为衍生自 `bowenliang123/dsh-context` v0.84.1（Apache-2.0，版权归原作者），许可证原文保留在 `src/ui/LICENSE`，来源与逐版本改动记录写在 `src/ui/NOTICE.md`；`src/host/` 声明为本仓库自有代码（`README.md:149`、`src/ui/NOTICE.md:10-13`）。整体仓库以 Apache-2.0 发布（`package.json` 的 `license`、`LICENSE`）。

**后果（含代价）**：

- 每个改动都要同步 `NOTICE.md`，改动成本比自有代码高；上游升级时需要人工比对。
- 换来了清晰的权属与可追溯的改动链（插件标识、路由前缀、存储路径、图标等逐条记录在 `src/ui/NOTICE.md:15` 起的逐版本改动记录）。
- 仓库内没有上游版本号的机器可读记录（仅 NOTICE 文本里的 `v0.84.1`），也没有上游同步脚本；上游是否已更新到更高版本：**未验证**。

**证据**：`README.md:149`、`README.en.md:149`、`src/ui/NOTICE.md:10-13`、`src/ui/LICENSE` 首行、`package.json`（`"license": "Apache-2.0"`）。

---

## ADR-009 错误码统一 `tongji/*` 前缀，旧 `dsh-context/*` 在归一化处兼容

**背景**：衍生代码自带 `dsh-context/*` 错误码，插件改名后如果只改新代码，客户端与旧路由会看到两种前缀，匹配逻辑要写两套。

**决定**：0.1.17 起新错误码统一为 `tongji/*`（如 `tongji/bad-request`、`tongji/request-aborted`、`tongji/ssh-unavailable`）；`failure()` 在出口处把旧前缀改写成新前缀，调用方只面对一种拼写（`src/ui/host/postRoute.ts:38-50`）。新代码不再使用旧前缀（仓库根 `AGENTS.md` §3.7）。

**后果（含代价）**：

- 兼容层永久保留在 `failure()` 里，旧前缀不会报错，也不会被清理；这是一处长期存在的过渡代码。
- 归一化只做前缀替换，不改 message 与 HTTP 状态，旧客户端按旧码匹配仍会失配。
- 各路由直接写字面量错误码（`src/ui/host/facts.ts:282`、`src/ui/host/sshRoute.ts:239-241`、`src/ui/host/snapshotRoute.ts:102` 等），没有集中的错误码枚举，容易拼错；这是当前状态，未做收敛。

**证据**：`README.md:137`、`README.en.md:137`、`src/ui/host/postRoute.ts:38-50`、`src/ui/host/facts.ts:282`、`src/ui/host/sshRoute.ts:239-241`、`src/ui/NOTICE.md:24-25`（0.1.17 改前缀条目）、仓库根 `AGENTS.md` §3.7。

