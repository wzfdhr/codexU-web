'use strict';
// codexU-web 桌面版 —— Electron 主进程
// 策略：内嵌启动现有 Node 后端（server.js），BrowserWindow 加载 http://localhost:8787，
// 后端解析逻辑零改动；提供系统托盘、开机自启、额度通知。

const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, shell } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 8787;
const NOTIFY_THRESHOLD = 80;      // 额度预警阈值
const NOTIFY_POLL_MS = 5 * 60 * 1000; // 每 5 分钟查一次额度

let win = null;
let tray = null;
let server = null;
let notifyCooldown = {}; // label -> last notify ts
let quitting = false;

// ---------- 内嵌启动后端 ----------
function startBackend() {
  return new Promise((resolve, reject) => {
    // 先探测端口是否已被占用（可能已有 node server.js 在跑）
    const probe = http.get({ host: '127.0.0.1', port: PORT, path: '/api/settings', timeout: 1200 }, (r) => {
      r.resume();
      resolve({ reused: true });
    });
    probe.on('error', () => {
      // 端口空闲，直接启动内嵌后端
      try {
        require('./server'); // server.js 内部会 listen 8787
        server = true;
        // 等待就绪
        waitReady().then(() => resolve({ reused: false }));
      } catch (e) {
        reject(e);
      }
    });
    probe.setTimeout(1200, () => {
      probe.destroy();
      try {
        require('./server');
        server = true;
        waitReady().then(() => resolve({ reused: false }));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function waitReady(attempts = 20) {
  return new Promise((resolve) => {
    const tryOnce = (n) => {
      const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/settings', timeout: 800 }, (r) => {
        r.resume();
        resolve();
      });
      req.on('error', () => {
        if (n <= 0) resolve();
        else setTimeout(() => tryOnce(n - 1), 300);
      });
      req.setTimeout(800, () => { req.destroy(); if (n <= 0) resolve(); else setTimeout(() => tryOnce(n - 1), 300); });
    };
    tryOnce(attempts);
  });
}

// ---------- 窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 620,
    icon: iconPath(),
    title: 'codexU-web · Codex/Claude 用量仪表盘',
    backgroundColor: '#f4f6fb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`http://localhost:${PORT}`);

  // 外部链接用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 关闭 = 最小化到托盘（常驻）
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => (win = null));
}

function iconPath() {
  // 打包后图标在 resources/app.asar 外层的 build/icon.png；开发时用 build/icon.png
  const candidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, 'build', 'icon.ico'),
  ];
  for (const p of candidates) {
    try {
      require('fs').accessSync(p);
      return p;
    } catch (e) {}
  }
  return undefined;
}

// ---------- 托盘 ----------
function createTray() {
  let img;
  const p = iconPath();
  if (p) {
    img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  }
  if (!img || img.isEmpty()) {
    img = nativeImage.createEmpty();
  }
  tray = new Tray(img);
  tray.setToolTip('codexU-web · 用量仪表盘');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开仪表盘', click: showWindow },
    { label: '刷新数据', click: () => { win && win.webContents.reload(); } },
    { type: 'separator' },
    { label: '开机自启', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (mi) => toggleAutoLaunch(mi.checked) },
    { type: 'separator' },
    { label: '退出', click: quitApp },
  ]));
  tray.on('click', showWindow);
}

function showWindow() {
  if (!win) createWindow();
  win.show();
  win.focus();
}

function toggleAutoLaunch(enable) {
  app.setLoginItemSettings({ openAtLogin: enable });
}

function quitApp() {
  quitting = true;
  app.quit();
}

// ---------- 额度通知 ----------
async function pollQuota() {
  try {
    const d = await fetch(`http://127.0.0.1:${PORT}/api/summary`).then((r) => r.json());
    const windows = (d.quota && d.quota.windows) || [];
    for (const w of windows) {
      const pct = w.usedPercent || 0;
      if (pct >= NOTIFY_THRESHOLD) {
        const key = w.windowMinutes;
        const now = Date.now();
        // 同一窗口 30 分钟内不重复提醒
        if (!notifyCooldown[key] || now - notifyCooldown[key] > 30 * 60 * 1000) {
          notifyCooldown[key] = now;
          sendNotification(w, pct);
        }
      }
    }
  } catch (e) {
    /* 后端暂时不可用则跳过 */
  }
}

function sendNotification(w, pct) {
  if (!Notification.isSupported()) return;
  const level = pct >= 95 ? 'critical' : 'warn';
  const n = new Notification({
    title: pct >= 95 ? '⚠ 额度即将耗尽！' : '⚠ 额度预警',
    body: `${w.label} 已用 ${Math.round(pct)}%${w.resetsAt && w.resetsAt > Date.now() ? `，将于 ${new Date(w.resetsAt).toLocaleString()} 重置` : ''}。`,
    silent: level === 'warn',
  });
  n.on('click', showWindow);
  n.show();
}

// ---------- 生命周期 ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWindow);

  app.whenReady().then(async () => {
    try {
      await startBackend();
    } catch (e) {
      console.error('后端启动失败:', e);
      dialogError(e);
    }
    createWindow();
    createTray();
    // 首次启动后延迟 30 秒再查额度，避免与首屏渲染抢资源
    setTimeout(pollQuota, 30 * 1000);
    setInterval(pollQuota, NOTIFY_POLL_MS);
  });

  app.on('window-all-closed', (e) => {
    // 不退出：常驻托盘
  });

  app.on('before-quit', () => {
    quitting = true;
    // 内嵌后端随进程退出，无需额外清理
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
}

function dialogError(e) {
  try {
    const { dialog } = require('electron');
    dialog.showErrorBox('codexU-web 启动失败', String((e && e.message) || e));
  } catch (err) {}
}
