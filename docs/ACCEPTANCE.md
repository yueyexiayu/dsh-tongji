# 验收报告

本文件记录每次交付前的真实验收：日期、版本、环境、命令、通过数。**不写「全部通过」**，只写可复现的数字与未覆盖项。

## 2026-11-28 · v0.1.52（文档补齐）

### 范围

本轮只改文档（`docs/` 六份 + 根 `AGENTS.md`、`CHANGELOG.md`、`MAINTENANCE.md`）与 `.gitignore`，代码路径未改动。因此验收按「构建与全量测试仍通过 + 文档与源码口径一致」判定。

### 环境（实测）

| 项 | 值 | 采集方式 |
| --- | --- | --- |
| 系统 | macOS 27.0.1 (26A434) arm64 | `sw_vers`、`uname -m` |
| Node | v26.13.1 | `node -v` |
| npm | 11.20.0 | `npm -v` |
| 运行中的 DSH | 0.2.3-alpha.2 | `PlistBuddy -c 'Print :CFBundleShortVersionString' "/Applications/DeepSeek Harness.app/Contents/Info.plist"` |
| 构建期 DSH 依赖 | 0.2.2-rc.5 | `package.json` 的 `devDependencies` |
| 代码基线 | `810c79a` | `git rev-parse --short HEAD` |

构建期依赖与运行中的 DSH 版本不同，这是本仓库的已知状态（见 README「限制」）。

### 命令与结果（实测）

```sh
npm run build
# ✔ Build complete in 1629ms
# ESM 产物：lib/index.js 357.74 kB、lib/usage.js 5.26 kB、lib/index.d.ts 287.50 kB、lib/usage.d.ts 1.36 kB
# 合计 4 files / 651.86 kB

npm run verify
# = npm run check（node --check 三个产物）&& npm run typecheck（tsc --noEmit）&& npm test
# tests 61 · suites 0 · pass 61 · fail 0 · skipped 0 · duration_ms 302
```

两条命令均退出码 0。`tsc --noEmit` 无输出（无类型错误）。

### 用例分布（13 个文件 / 61 例，与 `tests/` 实际一致）

| 文件 | 例数 |
| --- | --- |
| `tests/usage.test.js` | 10 |
| `tests/jobs.test.js` | 8 |
| `tests/client.test.js` | 7 |
| `tests/sshTargets.test.js` | 7 |
| `tests/taskRollup.test.js` | 5 |
| `tests/failedAgents.test.js` | 4 |
| `tests/overviewCache.test.js` | 4 |
| `tests/sshRoute.test.js` | 4 |
| `tests/seedCut.test.js` | 3 |
| `tests/version.test.js` | 3 |
| `tests/conversationSurface.test.js` | 2 |
| `tests/fold.test.js` | 2 |
| `tests/sessionPanelStyles.test.js` | 2 |

### 本轮未验收（照实登记）

1. **真实界面渲染**：插件改动需完全退出并重开 DSH 才加载，本轮为纯文档改动，未重开宿主，因此没有新的界面截图与逐面板点验。上一轮界面证据仍针对 `0.2.3-alpha.2`（README「限制」）。
2. **低版本 DSH 回退路径**：只在 `0.2.3-alpha.2` 上跑过构建与测试，未在实际安装的更低版本上验证「降级为回退投影」的表现。
3. **性能与容量**：没有做大数据量压力测试；缓存上限（4000 条 / 24 MB）只有单测覆盖，没有实机逼近上限的记录。
4. **异常恢复**：崩溃中断、写盘失败（磁盘满、无权限）没有实机演练。

## 历史记录

### v0.1.30（早期，已过期）

README 曾记录：「`npm run build` 与 `npm run verify` 通过……测试 45 例全绿」。该数字停留在 v0.1.30，此后新增用例未同步，`v0.1.51` 实测为 61 例。旧记录保留在 git 历史中，作为「口径曾经落后于代码」的实例。

## 复现方法

```sh
cd ~/.dsh/plugins/tongji
npm run build && npm run verify; echo "exit=$?"
```

预期：`exit=0`，`verify` 末尾出现 `fail 0`，例数与 `tests/` 下的 `test(...)` 调用总数一致。
