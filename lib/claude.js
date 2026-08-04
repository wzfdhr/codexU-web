'use strict';
const fs = require('fs');
const path = require('path');
const paths = require('./paths');

function dateKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function projectFromFolder(folderName) {
  // 文件夹名形如 C--Users-Administrator 或 E--my-game-godot-...
  return folderName.replace(/-/g, '/').replace(/^\//, '');
}

// 递归收集目录下所有 .jsonl
function walkJsonl(dir, out) {
  let stat;
  try { stat = fs.statSync(dir); } catch (e) { return; }
  if (stat.isDirectory()) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch (e) { return; }
    for (const e of entries) walkJsonl(path.join(dir, e), out);
  } else if (dir.endsWith('.jsonl')) {
    out.push(dir);
  }
}

function analyzeClaude() {
  const result = {
    tokens: { total: 0, input: 0, cached: 0, cacheWrite: 0, output: 0, reasoning: 0 },
    byModel: {},
    daily: {},
    modelDaily: {},
    hourly: {},
    tasks: [],
    modelsUsed: new Set(),
    fileCount: 0,
  };

  const files = [];
  walkJsonl(paths.claudeProjects, files);
  result.fileCount = files.length;

  // sessionId -> task 聚合
  const sessions = new Map();

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    const folder = path.basename(path.dirname(f));
    const project = projectFromFolder(folder);
    const lines = content.split('\n');
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      let o;
      try { o = JSON.parse(s); } catch (e) { continue; }
      const m = o.message;
      const u = m && m.usage;
      if (!u) continue;
      const input = Number(u.input_tokens) || 0;
      const output = Number(u.output_tokens) || 0;
      const cached = Number(u.cache_read_input_tokens) || 0;
      const cacheWrite = Number(u.cache_creation_input_tokens) || 0;
      const ts = dateKey(o.timestamp);
      const evMs = Date.parse(o.timestamp);
      if (!isNaN(evMs)) {
        const h = new Date(evMs).getHours();
        result.hourly[h] = (result.hourly[h] || 0) + (input + output + cached + cacheWrite);
      }
      const model = (m && m.model) || 'claude';
      result.modelsUsed.add(model);

      result.tokens.input += input;
      result.tokens.cached += cached;
      result.tokens.cacheWrite += cacheWrite;
      result.tokens.output += output;
      result.tokens.total += input + output + cached + cacheWrite;

      const mb = (result.byModel[model] = result.byModel[model] || {
        tokens: 0, input: 0, output: 0, cached: 0, cacheWrite: 0, count: 0,
      });
      mb.tokens += input + output + cached + cacheWrite;
      mb.input += input;
      mb.output += output;
      mb.cached += cached;
      mb.cacheWrite += cacheWrite;
      mb.count += 1;

      if (ts) {
        result.daily[ts] = (result.daily[ts] || 0) + (input + output + cached + cacheWrite);
        const md = (result.modelDaily[ts] = result.modelDaily[ts] || {});
        md[model] = (md[model] || 0) + (input + output + cached + cacheWrite);
      }

      const sid = o.sessionId || o.uuid || path.basename(f);
      if (sid) {
        const t = sessions.get(sid) || {
          id: sid, source: 'claude', project, title: null,
          model, tokens: 0, updatedAt: 0,
        };
        t.tokens += input + output + cached + cacheWrite;
        const evTs = Date.parse(o.timestamp) || 0;
        if (evTs > (t.updatedAt || 0)) t.updatedAt = evTs;
        if (!t.title && o.type === 'summary' && o.summary) t.title = o.summary;
        sessions.set(sid, t);
      }
    }
  }

  for (const t of sessions.values()) {
    if (!t.title) t.title = `${t.project} 会话`;
    t.isToday = dateKey(t.updatedAt) === dateKey(Date.now());
    result.tasks.push(t);
  }
  result.modelsUsed = Array.from(result.modelsUsed);
  return result;
}

module.exports = { analyzeClaude };
