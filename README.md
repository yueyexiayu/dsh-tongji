<div align="center">
  <img src="docs/assets/hero.svg" width="100%" alt="tongji 插件：DSH 会话可观测性面板示意图" />
  <h1>tongji</h1>
  <p><strong>DSH 会话可观测性面板：用量、上下文、编队与洞察</strong></p>
  <p>本地 Desktop 插件。读取 DSH 会话统计快照、会话投影与会话日志，展示 token 用量、上下文构成、工具与命令活动、子代理编队和跨会话总览；不展示任何账户余额或费用。</p>
  <p><strong>简体中文</strong> · <a href="README.en.md">English</a></p>
  <p>Desktop 插件 · v0.1.43 · Apache-2.0</p>
  <p><a href="#功能面">功能面</a> · <a href="#数据来源与刷新">数据来源与刷新</a> · <a href="#安装">安装</a> · <a href="#配置">配置</a> · <a href="#构建与验证">构建与验证</a> · <a href="#限制">限制</a> · <a href="#许可">许可</a></p>
</div>

---

`tongji` 把会话的可观测性数据放进 DSH 界面。它只读本地会话数据，不发起模型调用，也不代替你执行工具；官方「统计」视图保持原样。

## 入口

| 入口 | 位置 | 内容 |
| --- | --- | --- |
| 统计 | 对话右侧的「会话面板」分栏（DSH 标题栏的会话面板开关可隐藏；面板宽度沿用 DSH 官方 300–360px，插件不再改写宿主布局） | 会话总计、每轮用量、缓存命中率、上下文构成、Agent 网络、后台任务、SSH 连接 |
| 统计面板 | 对话视图标签页（可关闭） | 同「统计」，另加上下文时间线、请求详情、工具定义、文件活动、命令执行、上下文事件 |
| 编队 | 对话视图标签页（可关闭） | 子代理树、Agent 网络图、任务与往来消息 |
| 上下文洞察 | 主页面 + 侧栏面板入口（可关闭） | 跨会话总览、趋势、技能目录、推荐位 |
| 上下文跳转 | 助手消息动作区 | 从某一轮跳到上下文视图中对应的位置 |
| 上下文弹窗 | 输入框浮层 | 输入时的上下文速览 |
| 插件设置卡 | 插件页「配置」 | 入口位置、视图默认值、系统提示词前后缀 |

## 语言

界面**只有中文**，词典只有一份（763 条），没有第二份文案需要维护。DSH 语言服务的回退链固定以 `en` 收尾（`FALLBACK_LOCALE`），所以 `en` 位置指向同一份中文词典：即使把 DSH 切成英文界面，面板显示的仍是中文，不会露出 `turnusage.title` 这类键名。插件列表卡片保留 `locale/zh.json` 与 `locale/en.json`（各 122 字节），那是 DSH 插件清单的元数据，不是面板界面。

## 功能面

### 用量

- 会话总计、每轮摘要、每步明细；轮次默认折叠，展开后才挂载步骤表。
- 未命中输入、缓存命中输入（附命中率）、累计输入（含缓存写入）、累计输出、累计总 token、主代理输出速度。
- 子代理用量归入创建它的主会话轮次（含其后代与重试），继承的历史不重复计入；无法定位创建轮次的用量单列为「未归属」，外部子代理或缺失用量标为未知。
- 只统计 token 与轮次，不换算金额：面板里没有余额、花费或价格，也不联网取价目表。

### 上下文

- 时间线：按步骤或轮次聚合，可切总量/增量、叠加耗时曲线、铺满一屏的总览模式，以及按请求逐条着色的 DNA 指纹模式。
- 请求详情：每次模型请求的上下文构成（系统提示词、工具定义、用户消息、注入内容、技能注入、助手输出）。
- 口径：上下文占用、构成比例与图片 token 都是估算——文本按 4 字符/token 的固定密度，图片按 14px 分块网格（与 Qwen2-VL 同口径；DeepSeek 未公开图像计费口径）。只有供应商上报的占用与官方 breakdown 同时在时，构成卡才不显示「估算」。
- 上下文事件：注入、压缩、剪枝、模型切换、模式切换。
- 工具定义与文件活动：工具 schema 的规模；文件读取/写入/搜索/图片操作、命中行数与行数变化。
- 命令执行：按失败/慢/后台筛选，展示退出码、stderr、截断标记、沙箱拒绝与超时，并可回跳到结果消息。
- 后台任务（统计双卡下方）：列出仍在运行或已脱离到后台的作业——命令摘要、状态、耗时、退出详情与作业 id，运行中置顶、耗时按秒刷新；数据来自会话日志的 `job/registered` / `job/settled` 事件，前台结束的作业只留在命令执行里。
- 附件预览与历史分页：更早历史通过官方会话查询接口按需分页加载，打开面板不会拉全量历史。

### 编队与洞察

- 编队：子代理树的层级、角色、任务徽章，Agent 网络图与往来消息事件。
- 洞察：跨会话总览（今日 / 7 天 / 30 天）、按日热力与趋势、技能目录、推荐位。

### 系统提示词

设置卡里的前缀/后缀会拼到所有会话系统提示词的最前/最后，对所有代理（含子代理）生效，默认留空；修改从下一轮对话开始应用。这是本插件权限最高的一处，不是统计功能。

## 数据来源与刷新

- 数据来自 DSH 的会话统计快照、`sessionProjections` 投影与会话日志；Host 侧按会话保留增量折叠缓存，内存缓存按最近使用顺序有界淘汰。超过 3 万条事件的会话交给**单个**后台 worker 折叠（同时只跑一个，忙时回退到 Host 线程）。
- 磁盘总览缓存一次只合并本次新增的会话，不再整份覆盖；条目按最近更新时间保留，上限 4000 条 / 24 MB。
- 面板打开时，每轮用量卡按 5 秒轮询；总览按其自身节奏刷新。面板关闭即停止轮询。
- 网络访问共三处，全部可降级：版本检查（本仓库的 GitHub Releases，失败只影响版本提示）、推荐位清单（`raw.githubusercontent.com`，失败回退 `gh-proxy.org` 镜像）、推荐位图标（`cdn.simpleicons.org`）。它们都不影响其余面板。
- Host 路由共 14 条，前缀 `/api/tongji/`：`version`、`skills`、`recom`、`fleet`、`attachment`、`detail`、`delta`、`facts`、`heads`、`commands`、`snapshot`、`overview`、`backfill`、`usage`。

## 安装

### 1. 前置条件

需要 DSH Desktop、本地插件目录和可编辑的 Desktop profile。代码内置基线 `0.2.0-rc.2`：低于该版本的 DSH 会降级为回退投影，部分面板不出现。

### 2. 放置插件文件

```sh
git clone https://github.com/yueyexiayu/dsh-tongji.git ~/.dsh/plugins/tongji
```

目录已存在时不要覆盖其中已有文件；先备份或换一个目录。

### 3. 注册到 Desktop profile

在 `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 中加入：

```json
"tongji": "link:/Users/你的用户名/.dsh/plugins/tongji"
```

并把 `"tongji"` 加进 `dsh.profile.bundles`。然后在 profile 目录安装依赖：

```sh
cd ~/.dsh/profiles/desktop
pnpm install
```

完全退出 DSH（⌘Q）再打开。进入会话后，「统计」是对话右侧会话面板里的一个分栏（用标题栏的会话面板开关显示或隐藏），右侧栏不再被占用；需要宽屏细节时再切到「统计面板」标签页。

## 配置

插件 ID、包名与 bundle 名均为 `tongji`，安装目录为 `~/.dsh/plugins/tongji`，profile 的依赖链接必须指向该目录。设置项写在插件页的配置卡里，也可以在 profile 的 cordis 配置里覆盖：

| 键 | 取值 | 作用 |
| --- | --- | --- |
| `defaultPlacement` | `show` / `hide` | 统计面板标签页是否显示（旧值 `all` / `tab` / `sidebar` 仍可读，按 `show` 处理） |
| `defaultGranularity` | `step` / `turn` | 趋势图粒度 |
| `defaultTrendMode` | `total` / `delta` | 趋势图看总量还是增量 |
| `defaultDeltaBase` | `step` / `turn` | 增量的对比基线 |
| `defaultToolSort` / `defaultFileSort` | 见面板选项 | 工具定义与文件活动排序 |
| `insightsEntry` | `show` / `hide` | 上下文洞察入口 |
| `defaultDurationCurve` | `show` / `hide` | 趋势图耗时曲线 |
| `overviewAutoSteps` | `100` / `200` / `300` / `off` | 自动总览步数 |
| `defaultOverviewRange` | `today` / `7d` / `30d` | 洞察默认时间范围 |
| `fleetTab` | `show` / `hide` | 编队标签页 |
| `statsSection` | `show` / `hide` | 对话右侧会话面板里的「统计」分栏 |
| `promptPrefix` / `promptSuffix` | 文本 | 注入系统提示词首尾，默认留空 |

另有 8 个上限（`maxRequestSteps`、`maxKeptTurns`、`maxEvents`、`maxNodes`、`maxArchiveNodes`、`maxFileOps`、`maxCommands`、`maxCommandChars`），用来限制单次折叠保留的数据量。

## 构建与验证

```sh
npm run build   # tsdown：src/ -> lib/（host 走 ESM，client 走浏览器 CJS 包装）
npm run verify  # node --check 三个产物 + tsc --noEmit + 全部测试
```

产物自包含：`lib/index.js` 只依赖 `node:` 内置与 `./usage.js`，`lib/client.js` 没有外部 `require`，运行时不需要 `node_modules`。

当前 `v0.1.30` 的实测结果：`npm run build` 与 `npm run verify` 通过（`verify` = 产物语法检查 + `tsc --noEmit` + 测试），测试 45 例全绿：3 例版本探测、4 例缓存合并与上限、2 例生命周期边界、3 例继承前缀（`seedCut`）、3 例子代理失败态、8 例作业折叠（登记/结算/后台标记/脱离检测，含 `zsh` 与缓冲命令）、22 例既有用例；原先的 10 例价格与成本用例随功能下线一并删除。

## 限制

- 服务端渲染之外的真实 UI 只在 DSH `0.2.3-alpha.2` 上加载验证过（插件会写入 `~/.dsh/storages/tongji/`）；更早的实机记录针对 v0.1.13 的旧面板，未覆盖上下文视图、Agent 网络与命令面板。
- 构建期依赖钉在 `0.2.2-rc.5`，与运行中的 DSH 版本可能不同；升级 DSH 后需要重新对齐并重建。
- 首页没有当前会话时，面板不显示会话统计。
- 折叠缓存按现存会话过滤，但没有按字节数设上限；本机当前约 5 MB。
- 错误码自 `v0.1.17` 起统一为 `tongji/*`，`dsh-context/*` 旧前缀仍会被归一化处理。
- 推荐位读取本仓库 `data/recoms.json`；该文件不存在时回落内置条目并标记为降级。
- 版本守卫先读安装包（`app.asar/dsh/package.json`、macOS 包的 `Info.plist`），再读模块树；全都读不到时写一条 warn 并按「未知」处理，`/api/tongji/version` 的 `harness` 字段返回 `null`。
- 面板的工作区根取自 DSH 的 `workingDirectory` 投影（跟随目录切换）；DSH 自己的会话列表仍用会话头里的根，切目录后两者可能不一致。
- 后台任务卡片只覆盖 DSH 作业事件能关联到命令的作业（`bash` / `zsh` / `pwsh` / `run_code` 中的命令）；命令面板里的「后台」计数还会把结果文本含后台确认的 `run_code` 记录算进去，两者可能对不上。
- 后台任务卡片的真实界面渲染未在本次改动上复测（插件改动需重开 DSH 才加载）；数据层已用真实会话日志折叠验证。

## 许可

本仓库以 Apache License 2.0 发布，全文见 [LICENSE](LICENSE)。

`src/ui/` 衍生自 [bowenliang123/dsh-context](https://github.com/bowenliang123/dsh-context) v0.84.1（Apache-2.0，版权归原作者），其许可证原文保留在 [`src/ui/LICENSE`](src/ui/LICENSE)，改动记录与来源见 [`src/ui/NOTICE.md`](src/ui/NOTICE.md)。`src/host/` 下是 tongji 自有代码。

## 社区

问题与建议请用 GitHub Issues（https://github.com/yueyexiayu/dsh-tongji/issues）。

<div align="center"><sub>为 DSH 会话提供可观测性面板 · <a href="README.en.md">Read in English →</a></sub></div>
