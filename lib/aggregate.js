'use strict';
const { analyzeCodex } = require('./codex');
const { analyzeClaude } = require('./claude');
const { computeLeadership } = require('./leadership');
const prices = require('./prices');

function dateList(daysBack) {
  const out = [];
  const now = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function mergeDaily(a, b) {
  const m = {};
  for (const [k, v] of Object.entries(a)) m[k] = (m[k] || 0) + v;
  for (const [k, v] of Object.entries(b)) m[k] = (m[k] || 0) + v;
  return m;
}

async function buildData() {
  const codex = await analyzeCodex();
  const claude = analyzeClaude();

  const tokens = {
    total: codex.tokens.total + claude.tokens.total,
    input: codex.tokens.input + claude.tokens.input,
    cached: codex.tokens.cached + claude.tokens.cached,
    cacheWrite: codex.tokens.cacheWrite + claude.tokens.cacheWrite,
    output: codex.tokens.output + claude.tokens.output,
    reasoning: codex.tokens.reasoning,
  };

  const byModel = {};
  for (const src of [codex.byModel, claude.byModel]) {
    for (const [model, v] of Object.entries(src)) {
      const t = (byModel[model] = byModel[model] || {
        tokens: 0, input: 0, output: 0, cached: 0, cacheWrite: 0, count: 0,
      });
      t.tokens += v.tokens; t.input += v.input; t.output += v.output;
      t.cached += v.cached; t.cacheWrite += v.cacheWrite; t.count += v.count;
    }
  }

  const daily = mergeDaily(codex.daily, claude.daily);
  const mergedTasks = [...codex.tasks, ...claude.tasks];

  // 价值估算（羊毛进度）
  let usd = 0;
  for (const [model, v] of Object.entries(byModel)) {
    usd += prices.estimateUsd(model, v.input, v.cached, v.output);
  }
  const value = { usd: Math.round(usd * 100) / 100, cny: Math.round(usd * prices.USD_CNY * 100) / 100 };

  // ===== 今日视角（个人使用核心） =====
  // 今日/昨日 token：直接取自 daily；价值用「每 token 均价 × 今日量」估算
  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yestYmd = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

  // 每模型均价（usd per token），用于今日价值估算
  const unitPrice = {};
  for (const [model, v] of Object.entries(byModel)) {
    if (v.tokens > 0) {
      unitPrice[model] = prices.estimateUsd(model, v.input, v.cached, v.output) / v.tokens;
    }
  }
  const dayValue = (ymd) => {
    let sum = 0;
    const md = (codex.modelDaily[ymd] || {});
    const mc = (claude.modelDaily[ymd] || {});
    const models = new Set([...Object.keys(md), ...Object.keys(mc)]);
    for (const m of models) {
      const tk = (md[m] || 0) + (mc[m] || 0);
      if (tk && unitPrice[m]) sum += tk * unitPrice[m];
    }
    return sum;
  };
  const todayUsd = dayValue(todayYmd);
  const yestUsd = dayValue(yestYmd);
  // 今日活跃项目（去重）
  const todayProjects = new Set();
  for (const t of mergedTasks) {
    if (t.isToday && t.project) todayProjects.add(t.project);
  }
  const todayInfo = {
    date: todayYmd,
    tokens: daily[todayYmd] || 0,
    yesterdayTokens: daily[yestYmd] || 0,
    usd: Math.round(todayUsd * 100) / 100,
    cny: Math.round(todayUsd * prices.USD_CNY * 100) / 100,
    yesterdayUsd: Math.round(yestUsd * 100) / 100,
    tasks: mergedTasks.filter((t) => t.isToday).length,
    projects: todayProjects.size,
  };

  // 领导力
  const leadership = computeLeadership({
    daily,
    tasks: mergedTasks,
    spawnChildren: codex.spawnChildren,
    modelsUsed: Array.from(new Set([...codex.modelsUsed, ...claude.modelsUsed])),
  });

  // 任务：今天 + 近期
  mergedTasks.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const todayTasks = mergedTasks.filter((t) => t.isToday);
  const recentTasks = mergedTasks.slice(0, 40);

  // 趋势：最近 180 天
  const DAYS = 180;
  const dl = dateList(DAYS);
  const dailySeries = dl.map((d) => ({ date: d, tokens: daily[d] || 0 }));

  // 模型面积图：取 Top8 模型 + other
  const topModels = Object.entries(byModel)
    .sort((a, b) => b[1].tokens - a[1].tokens)
    .slice(0, 8)
    .map((e) => e[0]);
  const modelSeries = {};
  for (const m of topModels) modelSeries[m] = dl.map((d) => (codex.modelDaily[d]?.[m] || claude.modelDaily[d]?.[m] || 0));
  modelSeries['__other'] = dl.map((d) => {
    let sum = 0;
    for (const [m, v] of Object.entries(byModel)) {
      if (!topModels.includes(m)) sum += (codex.modelDaily[d]?.[m] || claude.modelDaily[d]?.[m] || 0);
    }
    return sum;
  });

  // 项目排行（按任务 token）
  const projects = {};
  for (const t of mergedTasks) {
    const p = t.project || '(未知项目)';
    const e = (projects[p] = projects[p] || { project: p, tokens: 0, sessions: 0 });
    e.tokens += t.tokensUsed || t.tokens || 0;
    e.sessions += 1;
  }
  const projectRanking = Object.values(projects).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

  // 模型排行（含估值）
  const modelRanking = Object.entries(byModel)
    .map(([model, v]) => ({
      model,
      tokens: v.tokens,
      count: v.count,
      usd: Math.round(prices.estimateUsd(model, v.input, v.cached, v.output) * 100) / 100,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 10);

  const quota = codex.quota.windows.length
    ? codex.quota
    : { windows: [], estimated: true };

  return {
    generatedAt: Date.now(),
    sources: {
      codex: { threadCount: codex.threadCount, tokens: codex.tokens },
      claude: { fileCount: claude.fileCount, tokens: claude.tokens },
    },
    tokens,
    value,
    today: todayInfo,
    quota,
    leadership,
    tasks: { today: todayTasks, recent: recentTasks },
    trends: { daily: dailySeries, modelSeries, topModels, dates: dl },
    rankings: { projects: projectRanking, models: modelRanking },
  };
}

module.exports = { buildData };
