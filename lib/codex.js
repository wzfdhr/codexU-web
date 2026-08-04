'use strict';
// Codex 本地数据解析（纯本地，无上传）
//
// 数据口径说明（v2，适配新版 Codex 日志格式）：
// - 额度：只取「最新一条」token_count 事件的 rate_limits（按事件 timestamp），
//   跳过 null 窗口；新版 Codex 仅 primary（7 天）窗口，secondary 为 null。
//   历史峰值逻辑已废弃，杜绝过期幽灵窗口。
// - token 按天口径：用 token_count 事件 info.last_token_usage（本轮增量）按事件
//   timestamp 归属到天，避免把会话累计 tokens_used 整体算到最后更新日。
// - token 拆分：total_token_usage 现位于 payload.info 下（旧版在 payload 下），
//   字段名 cached_input_tokens / cache_write_input_tokens（兼容旧名）。
// - 价值：reasoning_output_tokens 含于 output_tokens，不重复计费。

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getThreads, getSpawnEdges } = require('./db');
const paths = require('./paths');

const MAX_ROLLOUT = 200 * 1024 * 1024; // 跳过 >200MB 的超大文件（GB 级历史会话）
const SCAN_DAYS = 180;                 // 扫描最近 180 天，覆盖趋势范围

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

// 归一化 rollout 路径：去掉 Windows 长路径前缀 \\?\
function normRolloutPath(p) {
  if (!p) return null;
  let s = String(p);
  if (s.startsWith('\\\\?\\')) {
    s = s.slice(4);
    if (s.startsWith('UNC\\')) s = '\\' + s.slice(3); // \\?\UNC\server\share -> \\server\share
  }
  return s;
}

function emptyModelStat() {
  return { input: 0, output: 0, cached: 0, cacheWrite: 0, reasoning: 0, count: 0 };
}

// 收集最近 SCAN_DAYS 天内、存在且未超大的 rollout 文件
function collectRolloutFiles(threads) {
  const cutoff = Date.now() - SCAN_DAYS * 86400 * 1000;
  const out = [];
  for (const t of threads) {
    const updated = t.updated_at_ms || (t.updated_at ? Number(t.updated_at) * 1000 : 0);
    if (!updated || updated < cutoff) continue;
    const fp = normRolloutPath(t.rollout_path);
    if (!fp) continue;
    let sz = Infinity;
    try {
      sz = fs.statSync(fp).size;
    } catch (e) {
      continue;
    }
    if (sz > MAX_ROLLOUT) continue;
    out.push({
      path: fp,
      threadId: t.id,
      model: t.model || '(未知模型)',
      size: sz,
      updated,
    });
  }
  // 优先扫描最近更新的文件（额度/拆分以最新为准）
  out.sort((a, b) => b.updated - a.updated);
  return out;
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
    hourly: {},
    tasks: [],
    quota: { windows: [], estimated: true, credits: null },
    spawnChildren: children.size,
    modelsUsed: new Set(),
  };

  const today = startOfDay(Date.now());

  // 任务列表：tokens 用会话累计 tokens_used 展示「会话规模」
  for (const t of threads) {
    const model = t.model || '(未知模型)';
    result.modelsUsed.add(model);
    const totalAcc = Number(t.tokens_used) || 0;
    const ts = t.updated_at_ms ? new Date(t.updated_at_ms) : null;
    result.tasks.push({
      source: 'codex',
      id: t.id,
      title: t.title || t.first_user_message || '(未命名会话)',
      model,
      project: t.cwd ? path.basename(t.cwd) : '',
      cwd: t.cwd || '',
      tokensUsed: totalAcc,
      tokens: totalAcc,
      updatedAt: t.updated_at_ms || 0,
      createdAt: t.created_at_ms || 0,
      isToday: ts ? startOfDay(ts.getTime()) === today : false,
    });
  }

  const files = collectRolloutFiles(threads);

  // 扫描容器
  const dailyInc = {};
  const modelDailyInc = {};
  const byModelInc = {};
  let latestQuota = null;  // { windows, ts, credits }

  for (const f of files) {
    const r = await scanRollout(f);
    if (r.scanned) {
      for (const [d, v] of Object.entries(r.daily)) dailyInc[d] = (dailyInc[d] || 0) + v;
      for (const [h, v] of Object.entries(r.hourly)) result.hourly[h] = (result.hourly[h] || 0) + v;
      for (const [d, mm] of Object.entries(r.modelDaily)) {
        const tgt = (modelDailyInc[d] = modelDailyInc[d] || {});
        for (const [m, v] of Object.entries(mm)) tgt[m] = (tgt[m] || 0) + v;
      }
      for (const [m, b] of Object.entries(r.byModel)) {
        const tgt = (byModelInc[m] = byModelInc[m] || emptyModelStat());
        tgt.input += b.input; tgt.output += b.output; tgt.cached += b.cached;
        tgt.cacheWrite += b.cacheWrite; tgt.reasoning += b.reasoning; tgt.count += b.count;
      }
    }
    if (r.quota && r.quotaTs != null) {
      if (!latestQuota || r.quotaTs > latestQuota.ts) {
        latestQuota = { windows: r.quota, ts: r.quotaTs, credits: r.credits };
      }
    }
  }

  result.daily = dailyInc;
  result.modelDaily = modelDailyInc;

  // byModel：tokens = input + output（与 total_tokens 口径一致：cached 含于 input，reasoning 含于 output）
  for (const [model, b] of Object.entries(byModelInc)) {
    result.byModel[model] = {
      input: b.input,
      output: b.output,
      cached: b.cached,
      cacheWrite: b.cacheWrite,
      reasoning: b.reasoning,
      tokens: b.input + b.output,
      count: b.count,
    };
    result.tokens.input += b.input;
    result.tokens.output += b.output;
    result.tokens.cached += b.cached;
    result.tokens.cacheWrite += b.cacheWrite;
    result.tokens.reasoning += b.reasoning;
  }
  result.tokens.total = result.tokens.input + result.tokens.output;

  // 额度：取最新一条事件的 rate_limits
  if (latestQuota && latestQuota.windows.length) {
    result.quota.windows = latestQuota.windows;
    result.quota.windows.sort((a, b) => a.windowMinutes - b.windowMinutes);
    result.quota.estimated = false;
    result.quota.credits = latestQuota.credits || null;
  }

  return result;
}

// 兼容新旧字段名
function pickCached(tu) {
  return Number(tu.cached_input_tokens ?? tu.cache_read_input_tokens) || 0;
}
function pickCacheWrite(tu) {
  return Number(tu.cache_write_input_tokens ?? tu.cache_creation_input_tokens) || 0;
}

function scanRollout(f) {
  return new Promise((resolve) => {
    const out = {
      scanned: false,
      daily: {},
      modelDaily: {},
      byModel: {},
      hourly: {},
      quota: null,
      quotaTs: null,
      credits: null,
    };
    let closed = false;
    const finish = () => { if (closed) return; closed = true; resolve(out); };

    let rl;
    try {
      rl = readline.createInterface({ input: fs.createReadStream(f.path) });
    } catch (e) {
      return finish();
    }

    rl.on('line', (line) => {
      const s = line.trim();
      if (!s) return;
      // 前缀过滤：只解析含额度/增量的行
      if (s.indexOf('"last_token_usage"') === -1 && s.indexOf('"rate_limits"') === -1) return;
      let o;
      try {
        o = JSON.parse(s);
      } catch (e) {
        return;
      }
      if (o.type !== 'event_msg' || !o.payload || o.payload.type !== 'token_count') return;

      const info = o.payload.info || {};
      const lu = info.last_token_usage;
      const evTs = Date.parse(o.timestamp) || 0;
      const model = f.model;

      // 本轮增量按事件时间归属到天
      if (lu) {
        const day = ymdFromMs(evTs);
        if (day) {
          const inc = Number(lu.total_tokens) || 0;
          out.daily[day] = (out.daily[day] || 0) + inc;
          const mm = (out.modelDaily[day] = out.modelDaily[day] || {});
          mm[model] = (mm[model] || 0) + inc;
          const b = (out.byModel[model] = out.byModel[model] || emptyModelStat());
          b.input += Number(lu.input_tokens) || 0;
          b.output += Number(lu.output_tokens) || 0;
          b.cached += pickCached(lu);
          b.cacheWrite += pickCacheWrite(lu);
          b.reasoning += Number(lu.reasoning_output_tokens) || 0;
          b.count += 1;
          const evHour = new Date(evTs).getHours();
          out.hourly[evHour] = (out.hourly[evHour] || 0) + inc;
          out.scanned = true;
        }
      }

      // 额度：取本文件内最新一条事件（事件时间最大）
      const rl2 = o.payload.rate_limits;
      if (rl2) {
        const wins = [];
        for (const key of ['primary', 'secondary']) {
          const w = rl2[key];
          if (!w || !w.window_minutes) continue;
          const up = typeof w.used_percent === 'number' ? w.used_percent
            : typeof w.usedPercent === 'number' ? w.usedPercent : null;
          if (up == null) continue;
          wins.push({
            label: labelForWindow(w.window_minutes),
            windowMinutes: w.window_minutes,
            usedPercent: up,
            resetsAt: w.resets_at != null ? Number(w.resets_at) * 1000 : null,
            limitName: w.limit_name || rl2.limit_name || null,
          });
        }
        if (wins.length && (out.quotaTs == null || evTs > out.quotaTs)) {
          out.quota = wins;
          out.quotaTs = evTs;
        }
        if (rl2.credits && (out.quotaTs == null || evTs >= (out.quotaTs || 0))) {
          out.credits = {
            balance: rl2.credits.balance != null ? Number(rl2.credits.balance) : null,
            unlimited: !!rl2.credits.unlimited,
            hasCredits: !!rl2.credits.has_credits,
          };
        }
      }
    });
    rl.on('close', finish);
    rl.on('error', finish);
  });
}

function labelForWindow(wm) {
  if (wm === 300) return '5 小时额度';
  if (wm === 10080) return '7 天额度';
  if (wm === 1440) return '24 小时额度';
  return `${wm} 分钟额度`;
}

module.exports = { analyzeCodex };
