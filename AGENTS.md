# AGENTS.md · tongji 项目执行约定

在本仓库里改动代码或文档时遵守以下约定。全局规则（`~/.dsh/AGENTS.md`）优先于本文件；本文件只补本项目特有的事实与红线。

## 1. 先读什么

| 要做什么 | 先读 |
| --- | --- |
| 改功能 | `README.md` 的「功能面」与「限制」、`docs/PRODUCT.md`（能力边界与「不是什么」） |
| 改宿主路由 | `docs/API.md`（15 条 `/api/tongji/*` 的方法、参数、返回、错误码） |
| 改界面 | `docs/PRODUCT.md` 的非功能约束、`README.md` 的界面口径（中文单词典、面板宽度） |
| 改缓存或数据流 | `MAINTENANCE.md`（数据在哪、上限、怎么清、怎么回滚） |
| 加/改测试 | `docs/TESTING.md`（分层、命令、已知缺口） |
| 发文或交付 | `docs/ACCEPTANCE.md`（哪些验过、哪些没验）、`CHANGELOG.md` |

## 2. 命令

```sh
npm run build      # tsdown：src/ -> lib/（host 走 ESM，client 走浏览器 CJS 包装）
npm run check      # node --check 三个产物
npm run typecheck  # tsc --noEmit
npm test           # node --test tests/*.test.js
npm run verify     # check + typecheck + test（交付前必须全绿）
```

改动完成后跑 `npm run verify`，以实际输出（含用例数与 `fail 0`）为准，不凭印象说「通过了」。

## 3. 硬约束

1. **`lib/` 是构建产物，不手改。** 改 `src/` 后重新 build。产物自包含（`lib/index.js` 只依赖 `node:` 内置与 `./usage.js`，`lib/client.js` 无外部 `require`），不要为了省事往产物里塞运行时依赖。
2. **不引入金额。** 面板只统计 token 与轮次，不显示余额、花费、价格，不联网取价目表。这是功能红线，不是待办。
3. **只读本地数据。** Host 侧读会话统计快照、投影与日志；不发起模型调用，不代替用户执行工具。网络访问只有版本检查、推荐位清单与图标三处，且都必须可降级。
4. **界面只有中文一份词典。** 词典在 `src/ui/client/i18nZh.ts`，语言注册在 `src/ui/client/i18n.ts`；DSH 语言服务回退链以 `en` 收尾，所以 `en` 位置指向同一份中文词典，不要新增第二份文案。`locale/zh.json`、`locale/en.json` 是插件清单元数据，不是界面文案。
5. **统计分栏是比例分宽，会覆盖宿主变量。** 现行实现把 `--tongji-panel-width` 设为 `min(720px, 对话视口 × 0.375)`，并以 `!important` 覆盖 `--panel-min-width`、`--dsh-chat-content-width-resolved`、`--dsh-chat-end-inset`，`tests/sessionPanelStyles.test.js` 锁住了这些声明。改宽度必须同时改测试与 README 口径，不能只改 CSS。v0.1.38 曾回滚到官方宽度，之后又改回比例分栏，取舍见 `docs/DECISIONS.md` 的 ADR-005 / ADR-006。
6. **`src/ui/` 是衍生代码。** 上游 `bowenliang123/dsh-context` v0.84.1（Apache-2.0），改动时同步 `src/ui/NOTICE.md` 的来源与改动记录，并保留 `src/ui/LICENSE`。`src/host/` 是本仓库自有代码。
7. **错误码统一 `tongji/*`。** 旧 `dsh-context/*` 前缀只在归一化处兼容，不要在新代码里再用旧前缀。
8. **系统提示词前缀/后缀**（`promptPrefix` / `promptSuffix`）是本插件权限最高的一处，默认留空；改动它要单独说明影响范围（对所有代理含子代理生效）。

## 4. 必须重开宿主才能验证的改动

插件由 DSH Desktop 加载，改完代码后需要**完全退出 DSH（⌘Q）再打开**才生效。重启 DSH 桌面端由用户人工完成：先告知用户，不要自行重启。纯文档改动不需要重开。

## 5. 版本与提交

- 版本号在 `package.json` 的 `version`；README 顶部（`README.md`、`README.en.md`）各有一处版本声明，必须同步，不要只改其中一处。
- 交付到 GitHub 时递增补丁号（逢十进一：`0.1.9` 之后是 `0.1.10`，不是 `0.1.91` 之类的错位写法）；只本地提交不改版本。
- 提交信息用 `fix:` / `style:` / `docs:` 等前缀，与现有历史保持一致。
- 改动若触及文档所描述的行为（路由、上限、入口、命令），同一提交内更新对应文档，不要留下「代码已改、文档还写着旧值」的状态。

## 6. 诚实条款

- 不把未验证写成已通过；实机没跑过的写「未验证」并说明缺什么。
- 测试失败先区分代码、测试、环境、权限与外部服务原因，不靠新增兜底或重复实现掩盖失败。
- 已知不一致要登记（例如版本声明与实测用例数不一致），不要悄悄改数字了事。

## 7. 文档清单

| 文件 | 责任 |
| --- | --- |
| `README.md` / `README.en.md` | 是什么、怎么装、怎么跑、入口与限制 |
| `docs/PRODUCT.md` | 问题、用户与场景、能力边界、验收口径、非功能约束 |
| `docs/API.md` | 15 条 Host 路由契约与错误码 |
| `docs/TESTING.md` | 测试在哪、怎么跑、覆盖什么、没覆盖什么 |
| `docs/ACCEPTANCE.md` | 每次交付的实测记录与未验收项 |
| `MAINTENANCE.md` | 数据位置、备份、升级、回滚、故障排查 |
| `CHANGELOG.md` | 每个版本改了什么 |
| `docs/DECISIONS.md` | 关键取舍的背景、决定与后果 |
| `AGENTS.md` | 本文件 |
