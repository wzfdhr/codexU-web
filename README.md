# codexU-web

Windows 版 **Codex / Claude 用量可视化仪表盘** —— 参考 [codexU](https://github.com/shanggqm/codexU/)（macOS 原生应用）改造的**本地 Web 版本**，适配 Windows，纯本地解析，**无任何数据上传**。

## 功能
- **今日概览**：今天用了多少 Token、等效花费、任务数、活跃项目，并与昨日对比（涨跌标识）。
- **额度预警**：任一额度窗口使用率 ≥80% 时顶栏红色置顶提醒（≥95% 临界告警更醒目）。
- **额度窗口**：从本机 Codex 日志还原 5h / 7d 额度利用率（日志峰值）。
- **Token 总览**：累计 / 输入 / 缓存命中 / 输出，以及按 API 单价估算的「羊毛进度」价值（＄ / ¥）。
- **AI 领导力**：基于近 28 天活跃一致性、规模、并发、广度计算的 0–100 评分与七级称号。
- **今日 / 近期任务**：聚合 Codex 与 Claude Code 的本机会话。
- **趋势**：近 180 天 Token 面积图（按模型）、每日活跃日历热力图。
- **排行**：模型排行（含估值）、项目排行。
- **个性化**：6 套配色、中英界面、深浅色外观，设置本地持久化。
- **隐私**：所有数据仅在本机读取与计算；不连接任何第三方，关闭 GitHub 更新检查。

## 运行
需要 Node.js（建议用托管运行时）。**最省事的方式：双击 `start.bat`**（自动清理端口、启动服务、打开浏览器）。

```bash
cd codexU-web
npm install          # 仅安装 sql.js（首次）
start.bat            # 一键启动（Windows 双击即可）
```

也可以手动启动：
```bash
node server.js       # 默认 http://localhost:8787
```
然后用浏览器打开 http://localhost:8787 即可。数据每 60 秒自动刷新，也可点「刷新」或按 Ctrl/⌘+U。
停止服务：双击 `stop.bat`，或直接关闭启动时弹出的服务控制台窗口。

> 服务默认监听 `0.0.0.0`：同一 WiFi 下的手机也能打开（启动时控制台会打印局域网地址，如 `http://192.168.x.x:8787`）。
> 若 `npm install` 离线失败，可改用项目内置的 Python 解析后端（见下方「离线兜底」）。

## 桌面应用（Electron 版）
项目支持打包为 Windows 桌面应用，独立窗口 + 系统托盘 + 开机自启 + 桌面通知。

### 直接使用（已打包好的 exe）
下载 `dist/codexU-web-portable-1.1.0.exe`（约 70 MB），**双击即用**，免安装、可拷贝到任何 Windows 机器。功能与 Web 版完全一致，开机自动后台常驻托盘。

### 自己开发/打包
```bash
cd codexU-web
npm install
npm run desktop            # 开发模式：启动 Electron 窗口
npm run pack               # 打包 Windows 便携版（dist/codexU-web-portable-*.exe）
npm run pack:installer     # 打包 Windows 安装版（dist/codexU-web-setup-*.exe）
```

### 桌面特性
- **系统托盘常驻**：关闭窗口后最小化到托盘，单击图标显示/隐藏，右键菜单含「刷新 / 开机自启 / 退出」。
- **开机自启**：`app.setLoginItemSettings({ openAtLogin: true })`，可在托盘菜单切换。
- **桌面通知**：主进程每 5 分钟轮询额度，任一窗口使用率 ≥80% 弹出系统通知（≥95% 为临界告警），同一窗口 30 分钟内不重复提醒。

### 架构
Electron 主进程 `main.js` **内嵌启动**现有 Node 后端 `server.js`（同进程内 listen 8787），`BrowserWindow` 加载 `http://localhost:8787`——后端解析逻辑零改动。所有数据仍纯本地解析、无上传。

> 打包时通过 `asarUnpack` 把 `sql.js/dist/sql-wasm.wasm` 留在 asar 外，确保 SQLite WASM 能正确加载。

## 离线单文件（推荐直接打开，免服务）
`public/standalone.html` 是**自包含单文件版**：已内联全部 CSS/JS 与当前数据快照（通过 `window.__BOOTSTRAP__` 首屏即时渲染，零网络依赖）。双击用任意浏览器打开即可看到完整仪表盘，无需启动 Node 服务、也不受预览面板网络限制。

```bash
node build_standalone.js   # 重新生成（刷新内置数据快照）
```

## 故障排查
- **预览面板空白**：WorkBuddy 预览面板是 https 环境，加载 `http://localhost` 会被浏览器「混合内容」策略拦截而整页白屏。解决：用**本机浏览器**直接打开 `public/standalone.html` 或访问 `http://localhost:8787`。
- **EADDRINUSE 端口占用**：旧进程未退出。用 PowerShell 释放：`Stop-Process -Id (Get-NetTCPConnection -LocalPort 8787 -State Listen).OwningProcess -Force`，再启动服务。

## 数据来源
- Codex：`~/.codex/state_5.sqlite`（threads / spawn_edges）与 `~/.codex/{sessions,archived_sessions}/rollout-*.jsonl`。
- Claude Code：`~/.claude/projects/**/*.jsonl`。
- 路径自动按 `%USERPROFILE%` 解析，适配 Windows。

## 口径说明
- **额度**：Codex 桌面端实时额度 % 需运行中的 App 才能取得；本工具从历史 rollout 日志中还原，显示为「本机日志峰值」。若日志均为 0，则标注为估算。
- **Token 拆分**：优先使用 rollout 中 `token_count` 事件的 `total_token_usage`（含缓存拆分）；个别旧会话缺失时回退到 `threads.tokens_used`。
- **羊毛进度**：依据 `lib/prices.js` 中的模型单价表估算，可在该文件按需调整。

## 项目结构
```
codexU-web/
  main.js              # Electron 主进程（托盘/自启/通知/窗口）
  server.js            # HTTP 服务 + 静态资源 + /api/*
  start.bat            # 一键启动 Web 版（清理端口+启动服务+开浏览器）
  stop.bat             # 停止 Web 版服务
  lib/                 # paths / prices / db(sql.js) / codex / claude / leadership / aggregate
  public/              # index.html / styles.css / app.js / charts.js / standalone.html
  build/icon.png       # 桌面应用图标（手写 PNG：深蓝底 + 闪电）
  scripts/make_icon.py # 图标生成脚本（Python，零依赖）
  data/settings.json   # 用户个性化设置
  dist/                # electron-builder 打包产物（生成后存在）
    codexU-web-portable-*.exe  # 便携版 exe（双击即用）
    win-unpacked/              # 解包目录（用于安装版构建）
```

## 离线兜底（Python 后端）
若 Node 依赖无法安装，可用托管 Python（已含 sqlite3）提供一个等价 API：
```bash
python -m http.server 8787   # 需配合 lib/ 的解析逻辑自行接线（或后续扩展）
```
当前默认交付为 Node 版；如需完整 Python 版可另行生成。

## License
MIT（与原项目一致）。
