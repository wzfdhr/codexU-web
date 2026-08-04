<div align="center">

# ⚡ codexU-web

**Windows 版 Codex / Claude 用量可视化仪表盘**

本地 Web + Electron 桌面双形态，纯本地解析，**零数据上传**。

![platform](https://img.shields.io/badge/平台-Windows%2010%2F11-0ea5a4?style=flat-square)
![runtime](https://img.shields.io/badge/运行时-Node.js%2018%2B-3b82f6?style=flat-square)
![form](https://img.shields.io/badge/形态-Web%20%2B%20Electron%20桌面-8b5cf6?style=flat-square)
![privacy](https://img.shields.io/badge/隐私-100%25%20本地解析-16a34a?style=flat-square)
![license](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)

参考 [codexU](https://github.com/shanggqm/codexU/)（macOS 原生应用）改造，适配 Windows。

</div>

---

## 📸 预览

![仪表盘预览](docs/screenshot.svg)

> 上方为界面示意（数据来自真实本机日志）。支持 6 套配色 / 中英双语 / 深色模式。

## ✨ 功能特性

### 个人使用视角
- **今日概览**：今天用了多少 Token、等效花费、任务数、活跃项目，并与昨日对比（涨跌标识）——打开就知道"今天花了多少"。
- **额度预警**：任一额度窗口使用率 ≥80% 时顶栏红色置顶提醒（≥95% 临界告警更醒目）。
- **一键启动**：`start.bat` 双击即用（自动清理端口 → 启动服务 → 打开浏览器）。
- **桌面通知**：Electron 版每 5 分钟轮询额度，快用完时弹系统通知。
- **手机访问**：同一 WiFi 下手机浏览器可打开局域网地址。

### 仪表盘能力
- **额度窗口**：从本机 Codex 日志还原 5h / 7d 额度利用率（日志峰值）。
- **Token 总览**：累计 / 输入 / 缓存命中 / 输出，按 API 单价估算「羊毛进度」价值（＄ / ¥）。
- **AI 领导力**：基于近 28 天活跃一致性、规模、并发、广度计算的 0–100 评分与七级称号。
- **今日 / 近期任务**：聚合 Codex 与 Claude Code 的本机会话。
- **趋势**：近 180 天 Token 面积图（按模型）、每日活跃日历热力图，均支持鼠标悬停查看每日/每格明细。
- **排行**：模型排行（含估值）、项目排行。
- **个性化**：6 套配色、中英界面、深浅色外观，设置本地持久化。

### 原创玩法（codexU-web 独有）
- **成就 · 连击**：16 枚成就徽章（Token 里程碑 / 连击 / 生物钟人格 / 羊毛价值 / 广度），连击火焰随连续活跃天数升级（动画 + 光晕）；新解锁触发 toast + 彩带庆祝。
- **AI 生物钟**：24h 环形表盘展示各时段 Token 强度，自动归类人格（早起型 / 稳健型 / 夜猫子型 / 修仙型）并标出黄金窗口，支持悬停查看每小时明细。
- **AI 战报**：一键生成 1080×1440 周报海报（本周 Token / 等效价值 / 活跃天数 / 主战场 / 个人称号），可保存 PNG 分享。
- **燃烧速率预警**：持久化额度百分比快照，用真实测量的消耗速率预测各窗口耗尽时刻，额度卡内实时倒计时（重置后自动失效）。

## 🚀 快速开始

### 方式一：Electron 桌面版（推荐）
```bash
npm install            # 首次：仅安装 sql.js
npm run desktop        # 启动桌面窗口（托盘常驻 / 开机自启 / 额度通知）
npm run pack           # 打包 Windows 便携版 exe（dist/）
npm run pack:installer # 打包 Windows 安装版 exe
```

### 方式二：本地 Web
```bash
npm install
start.bat              # Windows 双击即可，自动启动服务并打开浏览器
```
或手动：`node server.js` → 访问 http://localhost:8787

> 服务默认监听 `0.0.0.0`，同一 WiFi 下手机也可访问（启动时控制台打印局域网地址）。

### 方式三：离线单文件
`public/standalone.html` 是自包含单文件版（内联全部 CSS/JS 与当前数据快照），双击用任意浏览器打开即可，零依赖。

```bash
node build_standalone.js   # 重新生成（刷新内置数据快照）
```

## 📦 桌面版特性

| 特性 | 说明 |
|---|---|
| 系统托盘常驻 | 关闭窗口最小化到托盘，单击显示/隐藏，右键菜单含刷新/自启/退出 |
| 开机自启 | `app.setLoginItemSettings({ openAtLogin })`，托盘菜单一键切换 |
| 桌面通知 | 主进程每 5 分钟轮询额度，≥80% 弹通知（≥95% 临界告警），30 分钟内不重复 |
| 单实例 | 重复启动只聚焦已有窗口 |

**架构**：Electron 主进程 `main.js` 内嵌启动 Node 后端 `server.js`（同进程 listen 8787），`BrowserWindow` 加载 `http://localhost:8787`——后端解析逻辑零改动。

## 📁 项目结构

```
codexU-web/
  main.js              # Electron 主进程（托盘/自启/通知/窗口）
  server.js            # HTTP 服务 + 静态资源 + /api/*
  start.bat / stop.bat # Web 版一键启动/停止
  lib/                 # paths / prices / db(sql.js) / codex / claude / leadership / stats / aggregate
  public/              # index.html / styles.css / app.js / charts.js / standalone.html
  docs/screenshot.svg  # 预览示意图（README 引用）
  build/icon.png       # 桌面应用图标
  scripts/make_icon.py # 图标生成脚本（Python，零依赖）
  data/settings.json   # 用户个性化设置
  data/burn_history.json # 额度燃烧速率快照（本机自动生成）
  dist/                # electron-builder 打包产物（生成后存在）
```

## 🔍 数据来源与口径

- **Codex**：`~/.codex/state_5.sqlite`（threads / spawn_edges）与 `~/.codex/{sessions,archived_sessions}/rollout-*.jsonl`
- **Claude Code**：`~/.claude/projects/**/*.jsonl`
- 路径自动按 `%USERPROFILE%` 解析，适配 Windows

| 口径 | 说明 |
|---|---|
| 额度 | 桌面端实时额度 % 需运行中的 App 才能取得；本工具从历史 rollout 日志还原，显示为「本机日志峰值」，无记录时标注估算 |
| Token 拆分 | 优先用 rollout `token_count` 事件的 `total_token_usage`（含缓存拆分）；缺失时回退 `threads.tokens_used` |
| 羊毛进度 | 依据 `lib/prices.js` 模型单价表估算，可按需调整 |

**性能**：token 统计直接从 SQLite 聚合（毫秒级）；rollout 只扫最近且 <100MB 的小文件取额度/拆分比例，接口响应 <1s（跳过 GB 级历史文件）。

## 🛠 故障排查

| 问题 | 解决 |
|---|---|
| 预览面板空白 | WorkBuddy 预览是 https 环境，加载 http://localhost 会被「混合内容」拦截；用本机浏览器打开 `public/standalone.html` 或 http://localhost:8787 |
| EADDRINUSE 端口占用 | PowerShell：`Stop-Process -Id (Get-NetTCPConnection -LocalPort 8787 -State Listen).OwningProcess -Force` |
| Electron 拒绝启动 | 终端 `env -u NODE_OPTIONS electron .`（NODE_OPTIONS=--use-system-ca 会冲突） |
| git push 报 CRYPT_E_REVOCATION_OFFLINE | `git config http.sslBackend openssl` |

## 🤝 贡献

欢迎 Issue / PR / Star。参考原项目：[shanggqm/codexU](https://github.com/shanggqm/codexU)

## 📄 License

[MIT](LICENSE) · 与原项目一致
