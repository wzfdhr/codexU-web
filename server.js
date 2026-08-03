'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildData } = require('./lib/aggregate');
const paths = require('./lib/paths');

const PORT = process.env.PORT || 8787;
const PUBLIC = path.join(__dirname, 'public');

let cache = { data: null, ts: 0 };
const TTL = 30 * 1000;

async function getData(force) {
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < TTL) return cache.data;
  const data = await buildData();
  cache = { data, ts: now };
  return data;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
  const filePath = path.join(PUBLIC, safe);
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    const url = req.url.split('?')[0];
    const force = req.url.includes('force');
    if (url === '/api/summary' || url === '/api/data') {
      const data = await getData(force);
      return sendJSON(res, data);
    }
    if (url === '/api/refresh') {
      const data = await getData(true);
      return sendJSON(res, { ok: true, generatedAt: data.generatedAt });
    }
    if (url === '/api/settings') {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const s = JSON.parse(body);
            fs.mkdirSync(path.dirname(paths.settingsFile), { recursive: true });
            fs.writeFileSync(paths.settingsFile, JSON.stringify(s, null, 2));
            sendJSON(res, { ok: true, settings: s });
          } catch (e) {
            sendJSON(res, { ok: false, error: String(e) }, 400);
          }
        });
        return;
      }
      let s = {};
      try { s = JSON.parse(fs.readFileSync(paths.settingsFile, 'utf8')); } catch (e) {}
      return sendJSON(res, s);
    }
    if (url.startsWith('/api/')) {
      return sendJSON(res, { error: 'unknown endpoint' }, 404);
    }
    return serveStatic(req, res);
  } catch (e) {
    sendJSON(res, { error: String((e && e.stack) || e) }, 500);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`codexU-web 已启动: http://localhost:${PORT}`);
  console.log('数据来源: 本机 ~/.codex 与 ~/.claude （纯本地解析，无上传）');
  // 打印局域网地址，方便手机访问
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        console.log(`局域网访问: http://${ni.address}:${PORT}  （同一 WiFi 下的手机可打开）`);
      }
    }
  }
});
