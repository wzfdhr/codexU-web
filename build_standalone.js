'use strict';
const fs = require('fs');
const path = require('path');
const { buildData } = require('./lib/aggregate');

(async () => {
  const data = await buildData();
  const root = __dirname;
  const styles = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
  const charts = fs.readFileSync(path.join(root, 'public', 'charts.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');

  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  let body = bodyMatch ? bodyMatch[1] : '';
  // 去掉外部 script 引用（charts.js / app.js），改为内联
  body = body.replace(/<script[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/g, '');

  // 安全嵌入 JSON：转义 < 防止 </script> 提前闭合
  const safe = JSON.stringify(data).replace(/</g, '\\u003c');

  const out = `<!DOCTYPE html>
<html lang="zh" data-theme="aurora" data-appearance="light">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>codexU-web · 离线快照</title>
<style>${styles}</style>
</head>
<body>${body}
<script>${charts}</script>
<script>window.__BOOTSTRAP__ = ${safe};</script>
<script>${app}</script>
</body>
</html>`;

  const pubPath = path.join(root, 'public', 'standalone.html');
  fs.writeFileSync(pubPath, out, 'utf8');
  fs.copyFileSync(pubPath, path.join(root, 'standalone.html'));
  console.log('standalone.html 已生成，大小=', (out.length / 1024).toFixed(0), 'KB，累计 Token=', data.tokens.total);
})().catch((e) => {
  console.error('生成失败:', e);
  process.exit(1);
});
