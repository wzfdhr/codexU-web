'use strict';
// 纯 Canvas 自绘图表（无外部依赖，离线可用）。所有颜色由调用方传入以适配主题。
(function (global) {
  function setup(canvas, cssHeight) {
    const dpr = global.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentNode.clientWidth || 600;
    const h = cssHeight || canvas.clientHeight || 200;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // 环形进度
  function drawRing(canvas, percent, color) {
    const { ctx, w, h } = setup(canvas, 120);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 12;
    const pct = Math.max(0, Math.min(100, percent));
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.strokeStyle = cssVar('--track', '#eef2f7');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    const start = -Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, start + (pct / 100) * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = cssVar('--text', '#1f2937');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 22px ' + cssVar('--font', 'sans-serif');
    ctx.fillText(Math.round(pct) + '%', cx, cy - 4);
    ctx.fillStyle = cssVar('--muted', '#6b7280');
    ctx.font = '11px ' + cssVar('--font', 'sans-serif');
    ctx.fillText('used', cx, cy + 16);
  }

  // 半圆仪表
  function drawGauge(canvas, score, color) {
    const { ctx, w, h } = setup(canvas, 130);
    const cx = w / 2, cy = h - 14, r = Math.min(w / 2, h) - 16;
    const s = Math.max(0, Math.min(100, score));
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = cssVar('--track', '#243049');
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + (s / 100) * Math.PI); ctx.stroke();
    ctx.fillStyle = cssVar('--text', '#e5e7eb');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 28px ' + cssVar('--font', 'sans-serif');
    ctx.fillText(Math.round(s), cx, cy - 18);
    ctx.fillStyle = cssVar('--muted', '#94a3b8');
    ctx.font = '10px ' + cssVar('--font', 'sans-serif');
    ctx.fillText('0', cx - r + 6, cy + 12);
    ctx.fillText('100', cx + r - 12, cy + 12);
  }

  // 堆叠面积图
  function drawArea(canvas, dates, series, colors) {
    const { ctx, w, h } = setup(canvas, 240);
    ctx.clearRect(0, 0, w, h);
    const padL = 8, padR = 8, padT = 10, padB = 22;
    const cw = w - padL - padR, ch = h - padT - padB;
    const n = dates.length;
    if (!n) return;
    const totals = new Array(n).fill(0);
    series.forEach((s) => { for (let i = 0; i < n; i++) totals[i] += (s.data[i] || 0); });
    const max = Math.max(1, ...totals);
    const x = (i) => padL + (i / (n - 1)) * cw;
    const y = (v) => padT + ch - (v / max) * ch;
    // 堆叠
    const cum = new Array(n).fill(0);
    series.forEach((s, si) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const v = cum[i] + (s.data[i] || 0); const xx = x(i), yy = y(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      for (let i = n - 1; i >= 0; i--) { const v = cum[i]; ctx.lineTo(x(i), y(v)); }
      ctx.closePath();
      const c = colors[si % colors.length];
      ctx.fillStyle = hexA(c, 0.78);
      ctx.fill();
      for (let i = 0; i < n; i++) cum[i] += (s.data[i] || 0);
    });
    // 月份网格
    ctx.fillStyle = cssVar('--muted', '#94a3b8');
    ctx.font = '10px ' + cssVar('--font', 'sans-serif'); ctx.textAlign = 'center';
    let lastM = '';
    for (let i = 0; i < n; i += Math.ceil(n / 8)) {
      const d = dates[i]; const m = d.slice(5);
      if (m !== lastM) { ctx.fillText(m, x(i), h - 6); lastM = m; }
    }
  }

  // 日历热力图（最近 ~26 周）
  function drawHeatmap(canvas, dailyArr) {
    const { ctx, w, h } = setup(canvas, 160);
    ctx.clearRect(0, 0, w, h);
    if (!dailyArr.length) return;
    const cell = Math.max(8, Math.min(16, Math.floor((w - 10) / 27)));
    const gap = 3;
    const max = Math.max(1, ...dailyArr.map((d) => d.v));
    dailyArr.forEach((d, i) => {
      const col = Math.floor(i / 7), row = i % 7;
      const px = 6 + col * (cell + gap), py = 6 + row * (cell + gap);
      const t = Math.log(1 + d.v) / Math.log(1 + max);
      ctx.fillStyle = t < 0.02 ? cssVar('--track', '#243049') : mixAccent(t);
      roundRect(ctx, px, py, cell, cell, 2); ctx.fill();
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexA(hex, a) {
    const c = hex.replace('#', '');
    const n = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
    const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function mixAccent(t) {
    const a = cssVar('--accent', '#0ea5a4'), b = cssVar('--accent2', '#3b82f6');
    const pa = parse(a), pb = parse(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }
  function parse(hex) {
    const c = hex.replace('#', '');
    const n = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  global.Charts = { drawRing, drawGauge, drawArea, drawHeatmap, fmt, cssVar };
})(window);
