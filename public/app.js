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
      achieve: '成就 · 连击', bioclock: 'AI 生物钟', weekly: 'AI 战报',
      streakCap: '连续活跃', bestCap: '最长', dayUnit: '天',
      unlockedToast: '成就解锁',
      burnEmpty: '预计耗尽', burnExhausted: '额度已近耗尽', burnWait: '正在记录燃烧速率…', burnSafe: '按此节奏可撑到重置',
      clockTypes: { early: '早起型 · 清晨效率拉满', steady: '稳健型 · 白天稳定输出', owl: '夜猫子型 · 深夜灵感爆发', midnight: '修仙型 · 凌晨才是主场' },
      weekTitles: ['静默蓄力中', '稳步输出中', '高速引擎全开', 'Token 风暴过境', '神话级算力附体'],
      posterHeadline: '⚡ codexU 战报', posterTokens: 'TOKENS · 本周消耗',
      posterCards: ['等效价值', '活跃天数', '会话数', '连击', '主战场', '主力模型'],
      posterFoot: 'codexU-web · 数据仅存本机，无任何上传',
      genPoster: '生成本周战报', savePoster: '保存图片', closePoster: '关闭',
      ses: ' 会话',
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
      achieve: 'Achievements · Streak', bioclock: 'AI Body Clock', weekly: 'AI Weekly Report',
      streakCap: 'day streak', bestCap: 'best', dayUnit: 'd',
      unlockedToast: 'Achievement unlocked',
      burnEmpty: 'est. depletion', burnExhausted: 'quota nearly exhausted', burnWait: 'measuring burn rate…', burnSafe: 'pace survives until reset',
      clockTypes: { early: 'Early bird · peaks at dawn', steady: 'Steady · reliable by day', owl: 'Night owl · bursts at night', midnight: 'Midnight mode · owns the small hours' },
      weekTitles: ['Charging quietly', 'Steady output', 'Full throttle', 'Token storm incoming', 'Mythic compute engaged'],
      posterHeadline: '⚡ codexU Report', posterTokens: 'TOKENS · THIS WEEK',
      posterCards: ['Equiv. value', 'Active days', 'Sessions', 'Streak', 'Main project', 'Main model'],
      posterFoot: 'codexU-web · all data stays local',
      genPoster: 'Generate weekly report', savePoster: 'Save image', closePoster: 'Close',
      ses: ' ses',
    },
  };
  let LANG = 'zh';
  const t = (k) => (I18N[LANG] && I18N[LANG][k]) || k;

  // 成就文案（zh/en），与后端 id 对应
  const ACH_TEXT = {
    zh: {
      spark: ['初次火花', '消耗第一个 Token'],
      million: ['百万俱乐部', '累计 Token 突破 1M'],
      ten_million: ['千万引擎', '累计 Token 突破 10M'],
      hundred_million: ['亿级传说', '累计 Token 突破 100M'],
      billion: ['十亿王座', '累计 Token 突破 1B'],
      streak3: ['三日连燃', '连续活跃 3 天'],
      streak7: ['七日不熄', '连续活跃 7 天'],
      streak30: ['月度永动机', '连续活跃 30 天'],
      night_owl: ['夜枭', '凌晨 0–3 点贡献超 25% 用量'],
      early_bird: ['晨型人', '清晨 6–9 点贡献超 25% 用量'],
      parallel: ['多开狂魔', '单日并行 5 个以上会话'],
      wool10: ['初薅羊毛', '等效价值达 $10'],
      wool100: ['百刀羊毛手', '等效价值达 $100'],
      wool1000: ['千刀巨擘', '等效价值达 $1000'],
      explorer: ['项目探索者', '涉足 5 个以上项目'],
      tamer: ['模型驯兽师', '使用过 3 种以上模型'],
    },
    en: {
      spark: ['First Spark', 'Spend your first token'],
      million: ['Million Club', 'Reach 1M total tokens'],
      ten_million: ['10M Engine', 'Reach 10M total tokens'],
      hundred_million: ['100M Legend', 'Reach 100M total tokens'],
      billion: ['Billion Throne', 'Reach 1B total tokens'],
      streak3: ['3-Day Flame', '3-day activity streak'],
      streak7: ['7-Day Blaze', '7-day activity streak'],
      streak30: ['Perpetual Motion', '30-day activity streak'],
      night_owl: ['Night Owl', '>25% usage between 0–3 AM'],
      early_bird: ['Early Bird', '>25% usage between 6–9 AM'],
      parallel: ['Parallel Maniac', '5+ sessions in one day'],
      wool10: ['First Wool', 'Reach $10 equiv. value'],
      wool100: ['Wool Master', 'Reach $100 equiv. value'],
      wool1000: ['Wool Tycoon', 'Reach $1000 equiv. value'],
      explorer: ['Explorer', 'Work across 5+ projects'],
      tamer: ['Model Tamer', 'Use 3+ different models'],
    },
  };
  let LATEST = null; // 最近一次完整数据（周报用）

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

  // 金额格式化：千分位 + 两位小数，避免用 K/M/B 缩写造成单位歧义
  function fmtMoney(n, decimals) {
    if (n == null || isNaN(n)) return '0';
    const d = decimals == null ? 2 : decimals;
    const neg = Number(n) < 0;
    const fixed = Math.abs(Number(n)).toFixed(d);
    const [int, frac] = fixed.split('.');
    const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + (frac != null ? withSep + '.' + frac : withSep);
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
    document.getElementById('todayValue').textContent = '¥' + fmtMoney(today.cny);
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
      div.appendChild(burnLineFor(w));
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
      `<div class="k">${t('wool')}</div><div class="v">$${fmtMoney(value.usd)}<span class="cny">≈ ¥${fmtMoney(value.cny)}</span></div>`;
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
    el.innerHTML = rank.length
      ? rank
          .map(
            (r, idx) =>
              `<div class="row">` +
              `<div class="row-top"><span class="idx">${idx + 1}</span><span class="name" title="${escapeHtml(r.model || r.project)}">${escapeHtml(r.model || r.project)}</span>` +
              `<span class="val">${fmtFn(r)}</span></div>` +
              `<span class="mini"><i style="width:${(((r[valKey] || 0) / max) * 100).toFixed(1)}%"></i></span>` +
              `</div>`
          )
          .join('')
      : '<div class="empty">—</div>';
  }

  // ---------- 原创玩法：成就 / 生物钟 / 战报 / 燃烧倒计时 ----------
  function fmtDur(ms) {
    if (ms <= 0) return '0m';
    const mins = Math.floor(ms / 60000);
    const dd = Math.floor(mins / 1440), hh = Math.floor((mins % 1440) / 60), mm = mins % 60;
    if (dd > 0) return `${dd}d ${hh}h`;
    if (hh > 0) return `${hh}h ${mm}m`;
    return `${mm}m`;
  }

  // 燃烧倒计时：每秒刷新所有带 data-at 的 .burn-line
  let burnTimer = null;
  function tickBurn() {
    document.querySelectorAll('.burn-line').forEach((el) => {
      const at = Number(el.dataset.at);
      if (!at) return;
      const diff = at - Date.now();
      if (diff <= 0) {
        el.textContent = '⚠ ' + t('burnExhausted');
        el.classList.add('hot');
      } else {
        el.textContent =
          '⏳ ' + t('burnEmpty') + ' ' + fmtDur(diff) + (el.dataset.safe === '1' ? ' · ' + t('burnSafe') : '');
        el.classList.toggle('hot', diff < 3600000);
      }
    });
  }
  function startBurnTicker() {
    if (!burnTimer) burnTimer = setInterval(tickBurn, 1000);
    tickBurn();
  }

  function burnLineFor(w) {
    const line = document.createElement('div');
    line.className = 'burn-line';
    const b = w.burn;
    if (!b) { line.textContent = ''; return line; }
    if (b.exhausted) {
      line.textContent = '⚠ ' + t('burnExhausted');
      line.classList.add('hot');
    } else if (b.depletedAt) {
      line.dataset.at = b.depletedAt;
      line.dataset.safe = b.beforeReset ? '0' : '1';
    } else {
      line.textContent = '⏱ ' + t('burnWait');
      line.classList.add('dim');
    }
    return line;
  }

  function renderAchievements(stats) {
    const s = stats.streaks;
    const lvl = s.current >= 14 ? 3 : s.current >= 7 ? 2 : s.current >= 1 ? 1 : 0;
    document.getElementById('streakBox').innerHTML =
      `<div class="flame lvl${lvl}${s.todayActive ? '' : ' dim'}">🔥</div>` +
      `<div class="flame-meta">` +
      `<div class="flame-n">×${s.current}</div>` +
      `<div class="flame-cap">${t('streakCap')} · ${t('bestCap')} ${s.best}${t('dayUnit')}</div>` +
      `<div class="flame-cap">${s.activeDays}/${s.totalDays} ${t('dayUnit')}</div>` +
      `</div>`;
    const txt = ACH_TEXT[LANG] || ACH_TEXT.zh;
    const unlocked = stats.achievements.filter((a) => a.unlocked).length;
    document.getElementById('achCount').textContent = `${unlocked}/${stats.achievements.length}`;
    document.getElementById('badgeGrid').innerHTML = stats.achievements
      .map((a) => {
        const pair = txt[a.id] || [a.id, ''];
        const prog = a.target === 1 ? (a.unlocked ? '100%' : '—') : Math.min(100, Math.round((a.cur / a.target) * 100)) + '%';
        return (
          `<div class="badge ${a.unlocked ? 'on' : 'off'}" data-ach="${a.id}" title="${escapeHtml(pair[1])} · ${prog}">` +
          `<span class="b-icon">${a.icon}</span><span class="b-name">${escapeHtml(pair[0])}</span>` +
          `<span class="b-prog">${a.unlocked ? '✓' : prog}</span></div>`
        );
      })
      .join('');
    celebrateNew(stats.achievements);
  }

  // 首次加载静默同步解锁记录，之后新解锁才触发庆祝
  let achInited = false;
  function celebrateNew(achievements) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem('cuw_unlocked') || '[]'); } catch (e) {}
    const ids = achievements.filter((a) => a.unlocked).map((a) => a.id);
    const fresh = ids.filter((id) => seen.indexOf(id) === -1);
    try { localStorage.setItem('cuw_unlocked', JSON.stringify(ids)); } catch (e) {}
    if (!achInited) { achInited = true; return; }
    fresh.forEach((id, i) => setTimeout(() => toastAchievement(id, achievements), i * 900));
  }

  function toastAchievement(id, achievements) {
    const a = achievements.find((x) => x.id === id);
    if (!a) return;
    const pair = (ACH_TEXT[LANG] || ACH_TEXT.zh)[id] || [id, ''];
    const el = document.createElement('div');
    el.className = 'ach-toast';
    el.innerHTML =
      `<span class="a-icon">${a.icon}</span>` +
      `<div class="a-txt"><div class="a-k">${t('unlockedToast')}</div>` +
      `<div class="a-name">${escapeHtml(pair[0])}</div>` +
      `<div class="a-desc">${escapeHtml(pair[1])}</div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    confettiBurst();
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4200);
    const badge = document.querySelector(`.badge[data-ach="${id}"]`);
    if (badge) badge.classList.add('pop');
  }

  function confettiBurst() {
    const colors = getColors(6);
    const box = document.createElement('div');
    box.className = 'confetti';
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('i');
      p.style.left = 50 + (Math.random() * 40 - 20) + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', Math.random() * 320 - 160 + 'px');
      p.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
      p.style.animationDelay = Math.random() * 0.25 + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2800);
  }

  function renderClock(circ) {
    Charts.drawClock(document.getElementById('clock'), circ.hours);
    document.getElementById('clockType').textContent =
      circ.type ? t('clockTypes')[circ.type] : t('noData');
    const peak = document.getElementById('clockPeak');
    if (circ.window) {
      const pad = (x) => String(x).padStart(2, '0');
      peak.textContent =
        `${LANG === 'zh' ? '黄金窗口' : 'golden window'} ${pad(circ.window[0])}:00–${pad((circ.window[1] + 1) % 24)}:00 · ${Math.round(circ.peakShare * 100)}%`;
    } else peak.textContent = '';
  }

  // ----- AI 战报（周报海报） -----
  function weekStats() {
    const d = LATEST;
    if (!d) return null;
    const last7 = d.trends.daily.slice(-7);
    const tokens = last7.reduce((a, x) => a + x.tokens, 0);
    const activeDays = last7.filter((x) => x.tokens > 0).length;
    const since = Date.now() - 7 * 86400000;
    const tasks7 = d.tasks.recent.filter((x) => x.updatedAt >= since);
    const proj = {};
    tasks7.forEach((x) => { const p = x.project || '—'; proj[p] = (proj[p] || 0) + (x.tokensUsed || x.tokens || 0); });
    const topP = Object.entries(proj).sort((a, b) => b[1] - a[1])[0];
    const models = {};
    tasks7.forEach((x) => { models[x.model] = (models[x.model] || 0) + 1; });
    const topM = Object.entries(models).sort((a, b) => b[1] - a[1])[0];
    const weekUsd = d.tokens.total > 0 ? (d.value.usd * tokens) / d.tokens.total : 0;
    return {
      tokens, activeDays, sessions: tasks7.length,
      topProject: topP ? topP[0] : '—', topModel: topM ? topM[0] : '—',
      usd: weekUsd, range: [last7[0].date, last7[last7.length - 1].date],
    };
  }

  function weekTitleOf(tokens) {
    const arr = t('weekTitles');
    const idx = tokens >= 2e8 ? 4 : tokens >= 5e7 ? 3 : tokens >= 1e7 ? 2 : tokens >= 1e6 ? 1 : 0;
    return arr[idx];
  }

  function renderWeekly() {
    const ws = weekStats();
    if (!ws) return;
    document.getElementById('weeklyPreview').innerHTML =
      `<div class="wk-tok">${fmt(ws.tokens)}</div>` +
      `<div class="wk-cap">${weekTitleOf(ws.tokens)}</div>` +
      `<div class="wk-sub">${ws.activeDays}/7 ${t('dayUnit')} · ${ws.sessions}${t('ses')}</div>`;
    document.getElementById('btnPoster').textContent = t('genPoster');
    document.getElementById('btnPosterSave').textContent = t('savePoster');
    document.getElementById('btnPosterClose').textContent = t('closePoster');
  }

  function openPoster() {
    const d = LATEST, ws = weekStats();
    if (!ws) return;
    const labels = t('posterCards');
    Charts.drawPoster(document.getElementById('poster'), {
      headline: t('posterHeadline'),
      rangeText: `${ws.range[0]} → ${ws.range[1]}`,
      weekTitle: weekTitleOf(ws.tokens) + ' · ' + d.leadership.tier,
      tokens: ws.tokens,
      tokensLabel: t('posterTokens'),
      cards: [
        [labels[0], '$' + fmtMoney(ws.usd)],
        [labels[1], ws.activeDays + ' / 7'],
        [labels[2], String(ws.sessions)],
        [labels[3], d.stats.streaks.current + ' ' + t('dayUnit')],
        [labels[4], ws.topProject],
        [labels[5], ws.topModel],
      ],
      footerLeft: t('posterFoot'),
      generatedText: new Date().toLocaleDateString(),
    });
    document.getElementById('posterModal').hidden = false;
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
      renderRank(d.rankings.models, 'modelRank', 'tokens', (r) => fmt(r.tokens) + (r.usd ? ` · $${fmtMoney(r.usd)}` : ''));
      renderRank(d.rankings.projects, 'projectRank', 'tokens', (r) => fmt(r.tokens) + ` · ${r.sessions}${t('ses')}`);
      // 原创玩法模块
      LATEST = d;
      if (d.stats) {
        renderAchievements(d.stats);
        renderClock(d.stats.circadian);
      }
      renderWeekly();
      startBurnTicker();
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
    if (e.key === 'Escape') document.getElementById('posterModal').hidden = true;
  });

  // 战报海报
  document.getElementById('btnPoster').onclick = openPoster;
  document.getElementById('btnPosterClose').onclick = () => {
    document.getElementById('posterModal').hidden = true;
  };
  document.getElementById('posterModal').onclick = (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  };
  document.getElementById('btnPosterSave').onclick = () => {
    const cv = document.getElementById('poster');
    cv.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'codexU-weekly-' + new Date().toISOString().slice(0, 10) + '.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  };

  // ---------- 启动 ----------
  (async function init() {
    await loadSettings();
    syncControls();
    await refresh();
    setInterval(refresh, 60000);
  })();
})();
