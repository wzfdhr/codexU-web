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

  // ---------- 悬停提示 ----------
  let tipEl = null;
  function ensureTip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'chart-tip';
      tipEl.style.display = 'none';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, cx, cy) {
    const el = ensureTip();
    el.innerHTML = html;
    el.style.display = 'block';
    const r = el.getBoundingClientRect();
    let x = cx + 14, y = cy + 14;
    if (x + r.width > window.innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = cy - r.height - 14;
    el.style.left = Math.max(4, x) + 'px';
    el.style.top = Math.max(4, y) + 'px';
  }
  function hideTip() { if (tipEl) tipEl.style.display = 'none'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // paint(hi) 负责绘制高亮帧；hit(mx,my) 返回 { index, html } 或 null
  function bindHover(canvas, paint, hit) {
    if (canvas.__hoverCleanup) canvas.__hoverCleanup();
    let cur = -1;
    const move = (e) => {
      const rect = canvas.getBoundingClientRect();
      const info = hit(e.clientX - rect.left, e.clientY - rect.top);
      if (!info) { leave(); return; }
      canvas.style.cursor = 'pointer';
      if (info.index !== cur) { cur = info.index; paint(cur); }
      showTip(info.html, e.clientX, e.clientY);
    };
    const leave = () => {
      hideTip();
      canvas.style.cursor = 'default';
      if (cur !== -1) { cur = -1; paint(-1); }
    };
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseleave', leave);
    canvas.__hoverCleanup = () => {
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseleave', leave);
      canvas.__hoverCleanup = null;
    };
  }

  // 堆叠面积图（支持悬停查看每日明细）
  function drawArea(canvas, dates, series, colors) {
    const { ctx, w, h } = setup(canvas, 240);
    const padL = 8, padR = 8, padT = 10, padB = 22;
    const cw = w - padL - padR, ch = h - padT - padB;
    const n = dates.length;
    if (!n) return;
    const totals = new Array(n).fill(0);
    series.forEach((s) => { for (let i = 0; i < n; i++) totals[i] += (s.data[i] || 0); });
    const max = Math.max(1, ...totals);
    const x = (i) => padL + (i / Math.max(1, n - 1)) * cw;
    const y = (v) => padT + ch - (v / max) * ch;

    function paint(hi) {
      ctx.clearRect(0, 0, w, h);
      // 堆叠
      const cum = new Array(n).fill(0);
      series.forEach((s, si) => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) { const v = cum[i] + (s.data[i] || 0); const xx = x(i), yy = y(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        for (let i = n - 1; i >= 0; i--) { ctx.lineTo(x(i), y(cum[i])); }
        ctx.closePath();
        ctx.fillStyle = hexA(colors[si % colors.length], 0.78);
        ctx.fill();
        for (let i = 0; i < n; i++) cum[i] += (s.data[i] || 0);
      });
      // 月份网格
      ctx.fillStyle = cssVar('--muted', '#94a3b8');
      ctx.font = '10px ' + cssVar('--font', 'sans-serif'); ctx.textAlign = 'center';
      let lastM = '';
      for (let i = 0; i < n; i += Math.ceil(n / 8)) {
        const m = dates[i].slice(5);
        if (m !== lastM) { ctx.fillText(m, x(i), h - 6); lastM = m; }
      }
      // 悬停指示线 + 堆叠顶点标记
      if (hi >= 0 && hi < n) {
        const xx = x(hi);
        ctx.save();
        ctx.strokeStyle = cssVar('--text', '#1f2937');
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xx, padT); ctx.lineTo(xx, padT + ch); ctx.stroke();
        ctx.setLineDash([]);
        let run = 0;
        series.forEach((s, si) => {
          run += (s.data[hi] || 0);
          ctx.globalAlpha = 1;
          ctx.fillStyle = colors[si % colors.length];
          ctx.beginPath(); ctx.arc(xx, y(run), 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = cssVar('--panel', '#ffffff'); ctx.lineWidth = 1.5; ctx.stroke();
        });
        ctx.restore();
      }
    }
    paint(-1);

    bindHover(canvas, paint, (mx) => {
      if (mx < padL - 6 || mx > w - padR + 6) return null;
      const i = Math.max(0, Math.min(n - 1, Math.round(((mx - padL) / cw) * (n - 1))));
      const rows = series
        .map((s, si) => ({ name: s.name, v: s.data[i] || 0, c: colors[si % colors.length] }))
        .filter((r) => r.v > 0)
        .sort((a, b) => b.v - a.v)
        .map((r) => `<div class="tip-row"><span class="sw" style="background:${r.c}"></span><span class="tip-name">${esc(r.name)}</span><span class="tip-val">${fmt(r.v)}</span></div>`)
        .join('');
      const totalRow = `<div class="tip-row total"><span class="tip-name">Σ</span><span class="tip-val">${fmt(totals[i])}</span></div>`;
      return { index: i, html: `<div class="tip-title">${esc(dates[i])}</div>${rows || '<div class="tip-row"><span class="tip-name">—</span></div>'}${totalRow}` };
    });
  }

  // 日历热力图（最近 ~26 周，支持悬停查看当日 Token）
  function drawHeatmap(canvas, dailyArr) {
    const { ctx, w, h } = setup(canvas, 160);
    if (!dailyArr.length) { ctx.clearRect(0, 0, w, h); return; }
    const cell = Math.max(8, Math.min(16, Math.floor((w - 10) / 27)));
    const gap = 3;
    const max = Math.max(1, ...dailyArr.map((d) => d.v));
    const rects = dailyArr.map((d, i) => ({
      px: 6 + Math.floor(i / 7) * (cell + gap),
      py: 6 + (i % 7) * (cell + gap),
    }));

    function paint(hi) {
      ctx.clearRect(0, 0, w, h);
      dailyArr.forEach((d, i) => {
        const { px, py } = rects[i];
        const t = Math.log(1 + d.v) / Math.log(1 + max);
        ctx.fillStyle = t < 0.02 ? cssVar('--track', '#243049') : mixAccent(t);
        roundRect(ctx, px, py, cell, cell, 2); ctx.fill();
        if (i === hi) {
          ctx.strokeStyle = cssVar('--text', '#e5e7eb');
          ctx.lineWidth = 1.5;
          roundRect(ctx, px - 1.5, py - 1.5, cell + 3, cell + 3, 3); ctx.stroke();
        }
      });
    }
    paint(-1);

    bindHover(canvas, paint, (mx, my) => {
      for (let i = 0; i < dailyArr.length; i++) {
        const { px, py } = rects[i];
        if (mx >= px && mx <= px + cell && my >= py && my <= py + cell) {
          const d = dailyArr[i];
          return {
            index: i,
            html: `<div class="tip-title">${esc(d.date)}</div><div class="tip-row"><span class="tip-name">Token</span><span class="tip-val">${fmt(d.v)}</span></div>`,
          };
        }
      }
      return null;
    });
  }

  // 24h 生物钟表盘（0 点在正上方，顺时针；支持悬停）
  function drawClock(canvas, hours) {
    const { ctx, w, h } = setup(canvas, 216);
    const cx = w / 2, cy = h / 2 + 4;
    const R = Math.min(w, h) / 2 - 26;
    const inner = R * 0.46;
    const max = Math.max(1, ...hours);
    let peak = 0;
    for (let i = 1; i < 24; i++) if (hours[i] > hours[peak]) peak = i;

    function paint(hi) {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 24; i++) {
        const a0 = (i / 24) * Math.PI * 2 - Math.PI / 2 + 0.03;
        const a1 = ((i + 1) / 24) * Math.PI * 2 - Math.PI / 2 - 0.03;
        const t = hours[i] / max;
        const r1 = inner + (R - inner) * Math.max(t, 0.05);
        ctx.beginPath();
        ctx.strokeStyle = t < 0.03 ? cssVar('--track', '#eef2f7') : mixAccent(Math.max(t, 0.15));
        ctx.lineWidth = r1 - inner;
        ctx.lineCap = 'butt';
        ctx.arc(cx, cy, inner + (r1 - inner) / 2, a0, a1);
        ctx.stroke();
        if (i === hi) {
          ctx.beginPath();
          ctx.strokeStyle = cssVar('--text', '#1f2937');
          ctx.lineWidth = 1.5;
          ctx.arc(cx, cy, inner + (r1 - inner) / 2, a0, a1);
          ctx.stroke();
        }
      }
      // 内圈轨道
      ctx.beginPath();
      ctx.strokeStyle = cssVar('--track', '#eef2f7');
      ctx.lineWidth = 1;
      ctx.arc(cx, cy, inner - 7, 0, Math.PI * 2);
      ctx.stroke();
      // 峰值小时外沿标记
      const pa = ((peak + 0.5) / 24) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = cssVar('--text', '#1f2937');
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(pa) * (R + 10), cy + Math.sin(pa) * (R + 10));
      ctx.lineTo(cx + Math.cos(pa - 0.09) * (R + 3), cy + Math.sin(pa - 0.09) * (R + 3));
      ctx.lineTo(cx + Math.cos(pa + 0.09) * (R + 3), cy + Math.sin(pa + 0.09) * (R + 3));
      ctx.closePath();
      ctx.fill();
      // 刻度文字 0 / 6 / 12 / 18
      ctx.fillStyle = cssVar('--muted', '#94a3b8');
      ctx.font = '10px ' + cssVar('--font', 'sans-serif');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [0, 6, 12, 18].forEach((hh) => {
        const a = (hh / 24) * Math.PI * 2 - Math.PI / 2;
        ctx.fillText(String(hh), cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16));
      });
      // 中心文案
      ctx.fillStyle = cssVar('--text', '#1f2937');
      ctx.font = '800 20px ' + cssVar('--font', 'sans-serif');
      ctx.fillText(peak + ':00', cx, cy - 6);
      ctx.fillStyle = cssVar('--muted', '#94a3b8');
      ctx.font = '10px ' + cssVar('--font', 'sans-serif');
      ctx.fillText('peak', cx, cy + 12);
    }
    paint(-1);

    bindHover(canvas, paint, (mx, my) => {
      const dx = mx - cx, dy = my - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < inner - 8 || r > R + 6) return null;
      let ang = Math.atan2(dy, dx) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      const hr = Math.floor((ang / (Math.PI * 2)) * 24) % 24;
      return {
        index: hr,
        html: `<div class="tip-title">${hr}:00 – ${(hr + 1) % 24}:00</div><div class="tip-row"><span class="tip-name">Token</span><span class="tip-val">${fmt(hours[hr])}</span></div>`,
      };
    });
  }

  // 周报海报（固定 1080x1440，导出用）
  function drawPoster(canvas, p) {
    canvas.width = 1080; canvas.height = 1440;
    canvas.style.width = ''; canvas.style.height = '';
    const ctx = canvas.getContext('2d');
    const W = 1080, H = 1440;
    const acc = cssVar('--accent', '#0ea5a4'), acc2 = cssVar('--accent2', '#3b82f6'), acc3 = cssVar('--accent3', '#8b5cf6');

    // 背景：深色渐变 + 装饰光晕
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1a1035');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, c) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(c, 0.35)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    glow(180, 140, 360, acc);
    glow(920, 480, 320, acc3);
    glow(260, 1280, 380, acc2);

    // 顶部：品牌 + 周期
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px sans-serif';
    ctx.fillText(p.headline || 'codexU', 70, 130);
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.font = '28px sans-serif';
    ctx.fillText(p.rangeText, 70, 178);

    // 个人称号
    ctx.font = '30px sans-serif';
    ctx.fillStyle = hexA(acc, 0.9);
    ctx.fillText(p.weekTitle, 70, 268);

    // 主数据：本周 Token
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 132px sans-serif';
    ctx.fillText(fmt(p.tokens), 66, 420);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '26px sans-serif';
    ctx.fillText(p.tokensLabel || 'TOKENS', 70, 470);

    // 指标卡片区（文案由调用方传入以适配多语言）
    const cards = p.cards || [];
    const cw = (W - 140 - 2 * 24) / 3;
    cards.forEach((c, i) => {
      const x = 70 + (i % 3) * (cw + 24);
      const y = 540 + Math.floor(i / 3) * 210;
      ctx.fillStyle = 'rgba(255,255,255,.07)';
      roundRect(ctx, x, y, cw, 180, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2;
      roundRect(ctx, x, y, cw, 180, 26); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.font = '26px sans-serif';
      ctx.fillText(c[0], x + 30, y + 58);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 44px sans-serif';
      let txt = c[1];
      while (ctx.measureText(txt).width > cw - 56 && txt.length > 1) txt = txt.slice(0, -1);
      if (txt !== c[1]) txt += '…';
      ctx.fillText(txt, x + 30, y + 128);
    });

    // 底部签名
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = '24px sans-serif';
    ctx.fillText(p.footerLeft || 'codexU-web', 70, H - 70);
    ctx.textAlign = 'right';
    ctx.fillText(p.generatedText, W - 70, H - 70);
    ctx.textAlign = 'left';
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

  global.Charts = { drawRing, drawGauge, drawArea, drawHeatmap, drawClock, drawPoster, fmt, cssVar };
})(window);
