'use strict';

function dateKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TIERS = [
  { min: 90, name: '传奇统帅' },
  { min: 75, name: 'AI 统帅' },
  { min: 60, name: '首席调度' },
  { min: 45, name: '资深调度' },
  { min: 30, name: '熟练指挥' },
  { min: 15, name: '初级调度' },
  { min: 0, name: '见习指挥' },
];

function tierOf(score) {
  return (TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1]).name;
}

// daily: {date: tokens}; tasks: [{updatedAt, source,...}]; spawnChildren: Set; modelsUsed: array
function computeLeadership(ctx, now) {
  now = now || Date.now();
  const windowMs = 28 * 24 * 3600 * 1000;
  const since = now - windowMs;
  const sinceKey = dateKey(since);

  // 合并每日 token（窗口内）
  const daily = ctx.daily || {};
  let totalTokens28 = 0;
  const activeDaySet = new Set();
  for (const [d, v] of Object.entries(daily)) {
    if (d >= sinceKey) {
      totalTokens28 += v;
      if (v > 0) activeDaySet.add(d);
    }
  }
  const activeDays = activeDaySet.size;

  // 窗口内任务
  const tasks28 = (ctx.tasks || []).filter((t) => t.updatedAt && t.updatedAt >= since);
  const totalSessions = tasks28.length;

  // 每日并发峰值
  const perDay = {};
  for (const t of tasks28) {
    const k = dateKey(t.updatedAt);
    if (k) perDay[k] = (perDay[k] || 0) + 1;
  }
  const peakPerDay = Object.values(perDay).reduce((a, b) => Math.max(a, b), 0);

  const spawnCount =
    typeof ctx.spawnChildren === 'number'
      ? ctx.spawnChildren
      : ctx.spawnChildren instanceof Set
      ? ctx.spawnChildren.size
      : Array.isArray(ctx.spawnChildren)
      ? ctx.spawnChildren.length
      : 0;
  const modelDiversity = (ctx.modelsUsed || []).length;

  const s_consistency = Math.min(activeDays / 24, 1) * 100;
  const s_scale = Math.min(totalSessions / 60, 1) * 100;
  const s_concurrency = Math.min(peakPerDay / 8, 1) * 100;
  const s_breadth = Math.min((spawnCount + modelDiversity) / 12, 1) * 100;

  const score = Math.round(
    s_consistency * 0.3 + s_scale * 0.3 + s_concurrency * 0.2 + s_breadth * 0.2
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    tier: tierOf(score),
    subscores: {
      consistency: Math.round(s_consistency),
      scale: Math.round(s_scale),
      concurrency: Math.round(s_concurrency),
      breadth: Math.round(s_breadth),
    },
    details: {
      activeDays,
      totalSessions,
      totalTokens28,
      peakPerDay,
      spawnCount,
      modelDiversity,
      windowDays: 28,
    },
  };
}

module.exports = { computeLeadership, tierOf, TIERS };
