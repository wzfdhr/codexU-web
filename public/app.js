'use strict';
(function () {
  const I18N = {
    zh: {
      refresh: '刷新', quota: '额度窗口', tokens: 'Token 总览', leadership: 'AI 领导力',
      todayTasks: '今日任务', trend: 'Token 趋势（近 180 天）', heatmap: '每日活跃热力图',
      modelRank: '模型排行', projectRank: '项目排行', recentTasks: '近期任务',
      privacy: '所有数据均在本机解析，无任何上传。',
      total: '累计 Token', input: '输入', cached: '缓存命中', output: '输出',
      wool: '羊毛进度（API 等效价值）', noTask: '今日暂无活动任务',
      reset: '重置', tierOf: '评级', consistency: '一致性', scale: '规模', concurrency: '并发', breadth: '广度',
      sessions: '会话', updated: '更新于', estQuota: '（历史日志估算）', logPeak: '本机日志峰值',
      todayTitle: '今日概览', todayTokens: '今日 Token', todayValue: '今日花费（等效价值）',
      todayActive: '活跃项目', vsYest: '较昨日', noData: '无数据', avgPer: '每任务均值',
    },
    en: {
      refresh: 'Refresh', quota: 'Quota Windows', tokens: 'Token Overview', leadership: 'AI Leadership',
      todayTasks: "Today's Tasks", trend: 'Token Trend (180d)', heatmap: 'Daily Activity Heatmap',
      modelRank: 'Model Ranking', projectRank: 'Project Ranking', recentTasks: 'Recent Tasks',
      privacy: 'All data is parsed locally. Nothing is uploaded.',
      total: 'Total Tokens', input: 'Input', cached: 'Cache Hit', output: 'Output',
      wool: 'Wool Progress (API-equivalent value)', noTask: 'No active tasks today',
      reset: 'resets', tierOf: 'Tier', consistency: 'Consistency', scale: 'Scale', concurrency: 'Concurrency', breadth: 'Breadth',
      sessions: 'sessions', updated: 'Updated', estQuota: '(est. from logs)', logPeak: 'peak (local logs)',
      todayTitle: 'Today Overview', todayTokens: "Today's Tokens", todayValue: "Today's Cost (equiv.)",
      todayActive: 'Active Projects', vsYest: 'vs yesterday', noData: 'no data', avgPer: 'per task avg',
    },
  };
  let LANG = 'zh';
  const t = (k) => (I18N[LANG] && I18N[LANG][k]) || k;

  // ---------- 设置 ----------
  async function loadSettings() {
    try {
      const s = await fetch('/api/settings').then((r) => r.json());
      if (s && typeof s === 'object') {
        if (s.theme) document.documentElement.dataset.theme = s.theme;
        if (s.appearance) document.documentElement.dataset.appearance = s.appearance;
        if (s.lang) LANG = s.lang;
      }
    } catch (e) {}
    syncControls();
  }
  function syncControls() {
    document.getElementById('themeSel').value = document.documentElement.dataset.theme;
    document.getElementById('btnAppearance').textContent =
      document.documentElement.dataset.appearance === 'dark' ? '☀️' : '🌙';
    applyI18n();
  }
  function persist() {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: document.documentElement.dataset.theme,
        appearance: document.documentElement.dataset.appearance,
        lang: LANG,
      }),
    }).catch(() => {});
  }

  function applyI18n() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      el.textContent = t(k);
    });
    document.getElementById('appTitle').textContent = 'codexU-web';
    document.getElementById('appSub').textContent =
      LANG === 'zh' ? 'Codex / Claude 用量可视化 · 纯本地' : 'Codex / Claude usage · local-only';
  }

  // ---------- 颜色工具 ----------
  function getColors(n) {
    const v = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
    const base = [v('--accent', '#0ea5a4'), v('--accent2', '#3b82f6'), v('--accent3', '#8b5cf6'), v('--accent4', '#f59e0b')];
    const out = base.slice();
    let i = 0;
    while (out.length < n) {
      const hue = (i * 47 + 200) % 360;
      out.push(`hsl(${hue},65%,58%)`);
      i++;
    }
    return out;
  }

  // ---------- 渲染 ----------
  function fmt(n) {
    if (n == null) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }

  // 额度预警条：任一窗口用量超阈值时置顶提醒
  const ALERT_THRESHOLD = 80;
  function renderAlert(quota) {
    const bar = document.getElementById('alertBar');
    if (!quota.windows.length) { bar.hidden = true; return; }
    const worst = quota.windows.slice().sort((a, b) => (b.usedPercent || 0) - (a.usedPercent || 0))[0];
    const pct = worst.usedPercent || 0;
    if (pct < ALERT_THRESHOLD) { bar.hidden = true; return; }
    bar.hidden = false;
    const level = pct >= 95 ? 'critical' : 'warn';
    bar.className = 'alert-bar ' + level;
    bar.innerHTML =
      '<span class="alert-icon">⚠</span>' +
      '<span class="alert-text">' +
      (LANG === 'zh'
        ? `<b>${worst.label}</b> 已用 <b>${Math.round(pct)}%</b>，额度即将耗尽${pct >= 95 ? '，请留意！' : '，建议控制用量'}` +
          (worst.resetsAt && worst.resetsAt > Date.now() ? `（${t('reset')} ${new Date(worst.resetsAt).toLocaleString()}）` : '')
        : `<b>${worst.label}</b> at <b>${Math.round(pct)}%</b> — quota nearly exhausted` +
          (worst.resetsAt && worst.resetsAt > Date.now() ? ` (${t('reset')} ${new Date(worst.resetsAt).toLocaleString()})` : '')) +
      '</span>';
  }

  // 今日概览：今日 token / 花费 / 任务 / 项目，与昨日对比
  function renderToday(today) {
    if (!today) return;
    document.getElementById('todayDate').textContent = today.date;
    document.getElementById('todayTokens').textContent = fmt(today.tokens);
    document.getElementById('todayValue').textContent = '¥' + fmt(today.cny);
    document.getElementById('todayTasksN').textContent = today.tasks;
    document.getElementById('todayProjects').textContent = today.projects;

    const deltaTokens = document.getElementById('todayTokensDelta');
    const deltaValue = document.getElementById('todayValueDelta');
    const diffTokens = today.tokens - today.yesterdayTokens;
    const diffUsd = today.usd - today.yesterdayUsd;
    const diffPctT = today.yesterdayTokens > 0 ? (diffTokens / today.yesterdayTokens) * 100 : null;
    const diffPctU = today.yesterdayUsd > 0 ? (diffUsd / today.yesterdayUsd) * 100 : null;

    const arrow = (v) => (v > 0 ? '▲' : v < 0 ? '▼' : '—');
    const cls = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat');
    if (diffPctT == null) {
      deltaTokens.textContent = t('vsYest') + ' ' + t('noData');
      deltaTokens.className = 'delta flat';
    } else {
      deltaTokens.textContent = `${t('vsYest')} ${arrow(diffTokens)} ${Math.abs(diffPctT).toFixed(0)}%`;
      deltaTokens.className = 'delta ' + cls(diffTokens);
    }
    if (diffPctU == null) {
      deltaValue.textContent = t('vsYest') + ' ' + t('noData');
      deltaValue.className = 'delta flat';
    } else {
      deltaValue.textContent = `${t('vsYest')} ${arrow(diffUsd)} ${Math.abs(diffPctU).toFixed(0)}%`;
      deltaValue.className = 'delta ' + cls(diffUsd);
    }
    document.getElementById('todayProjectsN').textContent = today.tasks;
    document.getElementById('todayAvg').textContent =
      `${t('avgPer')} ${fmt(today.tasks ? today.tokens / today.tasks : 0)}`;
  }

  function renderQuota(quota) {
    const wrap = document.getElementById('quotaWrap');
    const tag = document.getElementById('quotaTag');
    wrap.innerHTML = '';
    if (!quota.windows.length) {
      tag.textContent = t('estQuota');
      wrap.innerHTML = '<div class="empty">' + (LANG === 'zh' ? '未在本机日志中找到额度记录' : 'No quota records found in local logs') + '</div>';
      return;
    }
    tag.textContent = t('logPeak');
    quota.windows.forEach((w) => {
      const pct = w.usedPercent == null ? 0 : w.usedPercent;
      const div = document.createElement('div');
      div.className = 'quota-item';
      const cv = document.createElement('canvas');
      cv.width = 110; cv.height = 110; cv.style.width = '110px'; cv.style.height = '110px';
      div.appendChild(cv);
      const label = document.createElement('div');
      label.className = 'quota-label';
      label.textContent = w.label;
      div.appendChild(label);
      if (w.resetsAt && w.resetsAt > Date.now()) {
        const sub = document.createElement('div');
        sub.className = 'quota-sub';
        sub.textContent = t('reset') + ' ' + new Date(w.resetsAt).toLocaleString();
        div.appendChild(sub);
      }
      if (w.limitName) {
        const sub2 = document.createElement('div');
        sub2.className = 'quota-sub';
        sub2.textContent = w.limitName;
        div.appendChild(sub2);
      }
      wrap.appendChild(div);
      Charts.drawRing(cv, pct, getColors(1)[0]);
    });
  }

  function renderTokens(tokens, value) {
    const stats = [
      [t('total'), fmt(tokens.total)],
      [t('input'), fmt(tokens.input)],
      [t('cached'), fmt(tokens.cached)],
      [t('output'), fmt(tokens.output)],
    ];
    document.getElementById('tokenStats').innerHTML = stats
      .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`)
      .join('');
    document.getElementById('woolBox').innerHTML =
      `<div class="k">${t('wool')}</div><div class="v">$${fmt(value.usd)}<span class="cny">≈ ¥${fmt(value.cny)}</span></div>`;
  }

  function renderLeadership(lead) {
    const cv = document.getElementById('gauge');
    Charts.drawGauge(cv, lead.score, getColors(1)[0]);
    const subs = [
      [t('consistency'), lead.subscores.consistency],
      [t('scale'), lead.subscores.scale],
      [t('concurrency'), lead.subscores.concurrency],
      [t('breadth'), lead.subscores.breadth],
    ];
    const bars = subs
      .map(
        ([n, v]) =>
          `<div class="subrow"><span class="name">${n}</span><span class="bar"><i style="width:${v}%"></i></span><span class="num">${v}</span></div>`
      )
      .join('');
    document.getElementById('leadMeta').innerHTML =
      `<div class="tier">${lead.tier}</div><div class="score">${t('tierOf')} · ${lead.score}/100</div>${bars}`;
  }

  function taskRow(ta) {
    const div = document.createElement('div');
    div.className = 'task';
    const dot = document.createElement('span');
    dot.className = 'dot ' + ta.source;
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `<div class="t">${escapeHtml(ta.title)}</div><div class="m">${ta.model} · ${escapeHtml(ta.project || '')}</div>`;
    const tok = document.createElement('div');
    tok.className = 'tok';
    tok.textContent = fmt(ta.tokensUsed || ta.tokens || 0);
    div.append(dot, body, tok);
    return div;
  }

  function renderTasks(today, recent) {
    const tl = document.getElementById('todayList');
    document.getElementById('todayCount').textContent = today.length + ' ' + (LANG === 'zh' ? '项' : '');
    tl.innerHTML = '';
    if (!today.length) tl.innerHTML = '<div class="empty">' + t('noTask') + '</div>';
    else today.slice(0, 12).forEach((x) => tl.appendChild(taskRow(x)));

    const rl = document.getElementById('recentList');
    rl.innerHTML = '';
    if (!recent.length) rl.innerHTML = '<div class="empty">—</div>';
    else recent.slice(0, 16).forEach((x) => rl.appendChild(taskRow(x)));
  }

  function renderTrend(trends) {
    const names = trends.topModels.concat(['__other']);
    const colors = getColors(names.length);
    const series = names.map((m) => ({ name: m === '__other' ? (LANG === 'zh' ? '其他' : 'Other') : m, data: trends.modelSeries[m] || [] }));
    Charts.drawArea(document.getElementById('area'), trends.dates, series, colors);
    const leg = document.getElementById('trendLegend');
    leg.innerHTML = series
      .map((s, i) => `<span class="li"><span class="sw" style="background:${colors[i]}"></span>${escapeHtml(s.name)}</span>`)
      .join('');
  }

  function renderHeat(daily) {
    const arr = daily.map((d) => ({ date: d.date, v: d.tokens }));
    Charts.drawHeatmap(document.getElementById('heat'), arr);
  }

  function renderRank(rank, elId, valKey, fmtFn) {
    const el = document.getElementById(elId);
    const max = Math.max(1, ...rank.map((r) => r[valKey] || 0));
    el.innerHTML = rank
      .map(
        (r) =>
          `<div class="row"><span class="name">${escapeHtml(r.model || r.project)}</span>` +
          `<span class="mini"><i style="width:${((r[valKey] || 0) / max) * 100}%"></i></span>` +
          `<span class="val">${fmtFn(r)}</span></div>`
      )
      .join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---------- 数据拉取 ----------
  async function refresh() {
    try {
      let d;
      if (window.__BOOTSTRAP__) {
        d = window.__BOOTSTRAP__;
        window.__BOOTSTRAP__ = null;
      } else {
        d = await fetch('/api/summary').then((r) => r.json());
      }
      renderAlert(d.quota);
      renderToday(d.today);
      renderQuota(d.quota);
      renderTokens(d.tokens, d.value);
      renderLeadership(d.leadership);
      renderTasks(d.tasks.today, d.tasks.recent);
      renderTrend(d.trends);
      renderHeat(d.trends.daily);
      renderRank(d.rankings.models, 'modelRank', 'tokens', (r) => fmt(r.tokens) + (r.usd ? ` · $${fmt(r.usd)}` : ''));
      renderRank(d.rankings.projects, 'projectRank', 'tokens', (r) => fmt(r.tokens) + ` · ${r.sessions}${LANG === 'zh' ? ' 会话' : ' ses'}`);
      document.getElementById('updated').textContent = t('updated') + ' ' + new Date(d.generatedAt).toLocaleTimeString();
      document.getElementById('footMeta').textContent =
        `${d.sources.codex.threadCount} Codex ${LANG === 'zh' ? '会话' : 'threads'} · ${d.sources.claude.fileCount} Claude ${LANG === 'zh' ? '文件' : 'files'}`;
    } catch (e) {
      document.getElementById('updated').textContent = 'error: ' + e.message;
    }
  }

  // ---------- 事件 ----------
  document.getElementById('btnRefresh').onclick = () => refresh();
  document.getElementById('themeSel').onchange = (e) => {
    document.documentElement.dataset.theme = e.target.value;
    persist();
    refresh();
  };
  document.getElementById('btnAppearance').onclick = () => {
    const cur = document.documentElement.dataset.appearance;
    document.documentElement.dataset.appearance = cur === 'dark' ? 'light' : 'dark';
    syncControls();
    persist();
    refresh();
  };
  document.getElementById('btnLang').onclick = () => {
    LANG = LANG === 'zh' ? 'en' : 'zh';
    syncControls();
    persist();
    refresh();
  };
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      refresh();
    }
  });

  // ---------- 启动 ----------
  (async function init() {
    await loadSettings();
    syncControls();
    await refresh();
    setInterval(refresh, 60000);
  })();
})();
