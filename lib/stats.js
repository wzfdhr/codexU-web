'use strict';
// 原创玩法层：连击火焰、AI 生物钟、成就系统、燃烧速率预测
// 全部基于已聚合的本机数据计算，不引入任何外部依赖。
const fs = require('fs');
const path = require('path');
const paths = require('./paths');

function ymdOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ===== 连击（streak）：连续活跃天数 =====
// dailySeries: [{date, tokens}] 按日期升序
function computeStreaks(dailySeries) {
  const active = new Set(dailySeries.filter((d) => d.tokens > 0).map((d) => d.date));
  const today = new Date();
  const todayYmd = ymdOf(today);

  // 当前连击：从今天（若今日未活跃则从昨天）往前数
  let cur = 0;
  const probe = new Date(today);
  if (!active.has(todayYmd)) probe.setDate(probe.getDate() - 1);
  while (active.has(ymdOf(probe))) {
    cur++;
    probe.setDate(probe.getDate() - 1);
  }

  // 最长连击：线性扫描
  let best = 0, run = 0, prev = null;
  for (const d of dailySeries) {
    if (d.tokens <= 0) { run = 0; prev = null; continue; }
    if (prev) {
      const diff = (Date.parse(d.date) - Date.parse(prev)) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d.date;
  }

  return {
    current: cur,
    best,
    activeDays: active.size,
    totalDays: dailySeries.length,
    todayActive: active.has(todayYmd),
  };
}

// ===== AI 生物钟：24h 活跃分布与人格分类 =====
// hourly: {hourIndex: tokens}
function computeCircadian(hourly) {
  const hours = new Array(24).fill(0);
  for (const [h, v] of Object.entries(hourly || {})) {
    const i = Number(h);
    if (i >= 0 && i < 24) hours[i] += v || 0;
  }
  const total = hours.reduce((a, b) => a + b, 0);
  if (total <= 0) return { hours, total, peakHour: null, peakShare: 0, window: null, type: null };

  let peakHour = 0;
  for (let i = 1; i < 24; i++) if (hours[i] > hours[peakHour]) peakHour = i;

  // 最活跃的连续 3 小时窗口
  let bestStart = 0, bestSum = -1;
  for (let i = 0; i < 24; i++) {
    const s = hours[i] + hours[(i + 1) % 24] + hours[(i + 2) % 24];
    if (s > bestSum) { bestSum = s; bestStart = i; }
  }
  const peakShare = total > 0 ? bestSum / total : 0;

  // 人格分类（按黄金窗口中心时刻）
  const center = (bestStart + 1) % 24;
  let type;
  if (center >= 5 && center <= 10) type = 'early';
  else if (center >= 11 && center <= 16) type = 'steady';
  else if (center >= 17 && center <= 23) type = 'owl';
  else type = 'midnight'; // 0~4 点

  return { hours, total, peakHour, peakShare, window: [bestStart, (bestStart + 2) % 24], type };
}

// ===== 成就系统 =====
// 只返回 id / icon / 进度，文案由前端按语言渲染
function computeAchievements(ctx) {
  const T = ctx.tokens || {};
  const total = T.total || 0;
  const out = [];
  const num = (id, icon, v, target) =>
    out.push({ id, icon, cur: Math.min(v, target), target, unlocked: v >= target });

  // 累计 Token 里程碑
  num('spark', '✨', total, 1);
  num('million', '🎯', total, 1e6);
  num('ten_million', '🚀', total, 1e7);
  num('hundred_million', '🌌', total, 1e8);
  num('billion', '👑', total, 1e9);

  // 连击
  num('streak3', '🔥', ctx.streaks.current, 3);
  num('streak7', '🌋', ctx.streaks.current, 7);
  num('streak30', '☄️', ctx.streaks.current, 30);

  // 生物钟人格
  const h = ctx.circadian.hours;
  const share = (from, to) => {
    let s = 0;
    for (let i = from; i <= to; i++) s += h[i];
    return ctx.circadian.total > 0 ? s / ctx.circadian.total : 0;
  };
  const nightShare = share(0, 3);
  const earlyShare = share(6, 9);
  const nightOn = ctx.circadian.total > 0 && nightShare >= 0.25;
  const earlyOn = ctx.circadian.total > 0 && earlyShare >= 0.25;
  out.push({ id: 'night_owl', icon: '🦉', cur: nightOn ? 1 : 0, target: 1, unlocked: nightOn });
  out.push({ id: 'early_bird', icon: '🐦', cur: earlyOn ? 1 : 0, target: 1, unlocked: earlyOn });

  // 并发：单日任务数峰值
  const perDay = {};
  for (const t of ctx.tasks || []) {
    if (!t.updatedAt) continue;
    const k = ymdOf(new Date(t.updatedAt));
    perDay[k] = (perDay[k] || 0) + 1;
  }
  const peak = Object.values(perDay).reduce((a, b) => Math.max(a, b), 0);
  num('parallel', '🐙', peak, 5);

  // 羊毛价值
  const usd = (ctx.value && ctx.value.usd) || 0;
  num('wool10', '🧶', usd, 10);
  num('wool100', '💰', usd, 100);
  num('wool1000', '💎', usd, 1000);

  // 广度
  num('explorer', '🧭', ctx.projectCount, 5);
  num('tamer', '🎭', ctx.modelCount, 3);

  return out;
}

// ===== 燃烧速率预测 =====
// 原理：把每次看到的额度百分比存成快照，与上一次快照做差值：
//   pctPerMin = Δ百分比 / Δ分钟，剩余百分比 / pctPerMin = 剩余分钟
// 这是真实测量出的消耗速率，而非均匀假设，重置后自动失效。
function loadBurnHistory() {
  try {
    const arr = JSON.parse(fs.readFileSync(paths.burnFile, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveBurnHistory(history) {
  try {
    fs.mkdirSync(path.dirname(paths.burnFile), { recursive: true });
    // 只保留最近 500 条快照
    fs.writeFileSync(paths.burnFile, JSON.stringify(history.slice(-500)), 'utf8');
  } catch (e) {}
}

// windows: 当前额度窗口；返回带 burn 字段的新数组
function predictBurn(windows, now) {
  now = now || Date.now();
  const history = loadBurnHistory();
  const out = (windows || []).map((w) => {
    const pct = w.usedPercent == null ? 0 : w.usedPercent;
    const burn = { pctPerMin: 0, depletedAt: null, beforeReset: false, exhausted: pct >= 97, measuring: false };

    // 找同一窗口（label + windowMinutes + 同一重置周期）的历史快照
    const prev = history
      .filter(
        (h) =>
          h.label === w.label &&
          h.windowMinutes === w.windowMinutes &&
          h.resetsAt === (w.resetsAt || null) &&
          h.ts < now - 5 * 60000 // 至少间隔 5 分钟，避免噪声
      )
      .sort((a, b) => b.ts - a.ts)[0];

    if (prev && pct >= prev.pct && pct < 97) {
      const mins = (now - prev.ts) / 60000;
      const delta = pct - prev.pct;
      if (delta >= 0.3 && mins > 0) {
        const pctPerMin = delta / mins;
        burn.pctPerMin = pctPerMin;
        burn.depletedAt = now + ((100 - pct) / pctPerMin) * 60000;
        burn.measuring = true;
        if (w.resetsAt) burn.beforeReset = burn.depletedAt < w.resetsAt;
      }
    }
    return { ...w, burn };
  });

  // 追加当前快照（每次构建都记一条）
  for (const w of windows || []) {
    if (w.usedPercent == null) continue;
    history.push({
      ts: now,
      label: w.label,
      windowMinutes: w.windowMinutes,
      pct: w.usedPercent,
      resetsAt: w.resetsAt || null,
    });
  }
  saveBurnHistory(history);
  return out;
}

module.exports = { computeStreaks, computeCircadian, computeAchievements, predictBurn };
