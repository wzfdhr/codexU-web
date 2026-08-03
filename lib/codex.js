'use strict';
// Codex 本地数据解析（纯本地，无上传）
// 性能策略：token 总量/趋势/按模型拆分全部来自 state_5.sqlite 的 threads 表（毫秒级）；
// rollout JSONL 仅扫描「最近更新」的少量线程，用于真实额度(rate_limits)与 token 拆分比例，
// 并通过字符串前缀过滤避免逐行全量 JSON.parse。

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getThreads, getSpawnEdges } = require('./db');

function ymdFromMs(ms) {
  if (!ms) return null;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function startOfDay(ts) {
  const x = new Date(ts);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

async function analyzeCodex() {
  const threads = await getThreads();
  const spawnEdges = await getSpawnEdges();
  const children = new Set(spawnEdges.map((e) => e.child_thread_id));

  const result = {
    threadCount: threads.length,
    tokens: { total: 0, input: 0, output: 0, cached: 0, cacheWrite: 0, reasoning: 0 },
    byModel: {},
    daily: {},
    modelDaily: {},
    tasks: [],
    quota: { windows: [], estimated: true },
    spawnChildren: children.size,
    modelsUsed: new Set(),
  };

  const addModel = (model, tokens) => {
    if (!model) model = '(未知模型)';
    result.modelsUsed.add(model);
    const m = (result.byModel[model] = result.byModel[model] || { tokens: 0, count: 0 });
    m.tokens += tokens;
    m.count += 1;
  };

  const today = startOfDay(Date.now());
  for (const t of threads) {
    const model = t.model;
    const total = Number(t.tokens_used) || 0;
    if (!total) continue;
    result.tokens.total += total;
    addModel(model, total);
    const day = ymdFromMs(t.updated_at_ms);
    if (day) {
      result.daily[day] = (result.daily[day] || 0) + total;
      const md = (result.modelDaily[day] = result.modelDaily[day] || {});
      md[model] = (md[model] || 0) + total;
    }
    const ts = t.updated_at_ms ? new Date(t.updated_at_ms) : null;
    result.tasks.push({
      source: 'codex',
      id: t.id,
      title: t.title || '(未命名会话)',
      model: model || '(未知)',
      project: t.cwd ? path.basename(t.cwd) : '',
      cwd: t.cwd || '',
      tokensUsed: total,
      tokens: total,
      updatedAt: t.updated_at_ms || 0,
      createdAt: t.created_at_ms || 0,
      isToday: ts ? startOfDay(ts.getTime()) === today : false,
    });
  }

  // 仅扫描 rollout：取额度 + token 拆分比例。
  // 关键优化：跳过 >100MB 的巨型文件（部分历史会话可达数 GB），
  // 额度/拆分比例在任意会话都存在，小文件足以覆盖 5h/7d 窗口，避免 GB 级磁盘 I/O。
  const MAX_ROLLOUT = 100 * 1024 * 1024;
  const recent = threads
    .filter((t) => t.rollout_path && fs.existsSync(t.rollout_path))
    .map((t) => {
      let sz = Infinity;
      try {
        sz = fs.statSync(t.rollout_path).size;
      } catch (e) {}
      return { t, sz };
    })
    .filter((x) => x.sz < MAX_ROLLOUT)
    .sort((a, b) => (b.t.updated_at_ms || 0) - (a.t.updated_at_ms || 0))
    .slice(0, 12)
    .map((x) => x.t);

  const quotaMap = new Map();
  const ratioByModel = {};
  for (const t of recent) {
    await scanRollout(t.rollout_path, t.model, quotaMap, ratioByModel);
  }

  // 将 SQLite 的 total 摊到 input/output/cached/cacheWrite：
  // 优先用 rollout 真实拆分比例，未被覆盖的模型回退为整段计入 input，避免任何 NaN。
  for (const model of Object.keys(result.byModel)) {
    const bm = result.byModel[model];
    bm.input = 0;
    bm.output = 0;
    bm.cached = 0;
    bm.cacheWrite = 0;
  }
  for (const [model, r] of Object.entries(ratioByModel)) {
    const rTotal = r.input + r.output + r.cached + r.cacheWrite;
    if (!rTotal) continue;
    const bm = result.byModel[model];
    if (!bm) continue;
    const frac = bm.tokens / rTotal;
    bm.input = r.input * frac;
    bm.output = r.output * frac;
    bm.cached = r.cached * frac;
    bm.cacheWrite = r.cacheWrite * frac;
  }
  for (const model of Object.keys(result.byModel)) {
    const bm = result.byModel[model];
    if (bm.input === 0 && bm.output === 0 && bm.cached === 0 && bm.cacheWrite === 0) {
      bm.input = bm.tokens;
    }
  }
  // 重算汇总，保证与 byModel 一致（杜绝 NaN）
  result.tokens.input = 0;
  result.tokens.output = 0;
  result.tokens.cached = 0;
  result.tokens.cacheWrite = 0;
  for (const bm of Object.values(result.byModel)) {
    result.tokens.input += bm.input;
    result.tokens.output += bm.output;
    result.tokens.cached += bm.cached;
    result.tokens.cacheWrite += bm.cacheWrite;
  }

  for (const [wm, v] of quotaMap) {
    result.quota.windows.push({
      label: wm === 300 ? '5 小时额度' : wm === 10080 ? '7 天额度' : `${wm} 分钟额度`,
      windowMinutes: wm,
      usedPercent: v.usedPercent,
      resetsAt: v.resetsAt,
      limitName: v.limitName,
    });
  }
  result.quota.windows.sort((a, b) => a.windowMinutes - b.windowMinutes);
  if (result.quota.windows.length) result.quota.estimated = false;

  return result;
}

function scanRollout(fp, model, quotaMap, ratioByModel) {
  return new Promise((resolve) => {
    let closed = false;
    const finish = (reason) => {
      if (closed) return;
      closed = true;
      rl.close();
      resolve();
    };
    const rl = readline.createInterface({ input: fs.createReadStream(fp) });
    rl.on('line', (line) => {
      const s = line.trim();
      if (!s) return;
      // 前缀过滤：只解析可能含额度/拆分信息的行
      if (s.indexOf('"rate_limits"') === -1 && s.indexOf('"total_token_usage"') === -1) return;
      try {
        const o = JSON.parse(s);
        if (o.type !== 'event_msg' || !o.payload || o.payload.type !== 'token_count') return;
        const pld = o.payload;
        const rl2 = pld.rate_limits;
        if (rl2) {
          for (const key of ['primary', 'secondary']) {
            const w = rl2[key];
            if (!w || !w.window_minutes) continue;
            const up = typeof w.used_percent === 'number' ? w.used_percent
              : typeof w.usedPercent === 'number' ? w.usedPercent : null;
            if (up == null) continue;
            const cur = quotaMap.get(w.window_minutes);
            const evTs = Date.parse(o.timestamp) || 0;
            if (!cur || up > cur.usedPercent) {
              quotaMap.set(w.window_minutes, {
                usedPercent: up,
                resetsAt: w.resets_at != null ? Number(w.resets_at) * 1000 : null,
                limitName: w.limit_name || (cur ? cur.limitName : null),
                _ts: evTs,
              });
            }
          }
        }
        const tu = pld.total_token_usage;
        if (tu && model) {
          const r = (ratioByModel[model] = ratioByModel[model] || { input: 0, output: 0, cached: 0, cacheWrite: 0 });
          r.input += Number(tu.input_tokens) || 0;
          r.output += Number(tu.output_tokens) || 0;
          r.cached += Number(tu.cache_read_input_tokens) || 0;
          r.cacheWrite += Number(tu.cache_creation_input_tokens) || 0;
        }
      } catch (e) {
        /* 跳过坏行 */
      }
    });
    rl.on('close', () => finish('close'));
    rl.on('error', () => finish('error'));
  });
}

module.exports = { analyzeCodex };
