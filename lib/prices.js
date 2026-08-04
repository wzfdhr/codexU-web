'use strict';
// 模型单价表（每 1M tokens 的 USD 估算价）。
// 这些是“羊毛进度”估值的参考价，可随时按真实账单调整。
// 命中规则：按 model 名包含的关键词匹配；未命中走 __default。

const USD_CNY = 7.2;

const PRICES = [
  { match: ['gpt-5.6-sol', 'gpt-5.6', '5.6-sol'], in: 5, cache: 1.25, out: 25 },
  { match: ['gpt-5.6-luna', '5.6-luna'], in: 5, cache: 1.25, out: 25 },
  { match: ['gpt-5.5', 'gpt-5.4', 'gpt-5.3'], in: 4, cache: 1, out: 20 },
  { match: ['gpt-5', 'codex'], in: 3, cache: 0.75, out: 15 },
  { match: ['claude-opus', 'opus'], in: 15, cache: 1.5, out: 75 },
  { match: ['claude-sonnet', 'sonnet'], in: 3, cache: 0.3, out: 15 },
  { match: ['claude-haiku', 'haiku'], in: 0.8, cache: 0.08, out: 4 },
  { match: ['claude'], in: 3, cache: 0.3, out: 15 },
];

const DEFAULT = { in: 3, cache: 0.3, out: 15 };

function priceFor(model) {
  if (!model) return DEFAULT;
  const m = String(model).toLowerCase();
  for (const p of PRICES) {
    if (p.match.some((k) => m.includes(k.toLowerCase()))) return p;
  }
  return DEFAULT;
}

// 根据输入/缓存/输出 token 估算 USD 成本
// 注意：input_tokens 已包含 cached_input_tokens（cached 是 input 的子集），
//       因此非缓存输入 = input - cached，避免与 cached 重复计费。
//       cacheWrite（缓存写入）按 cache 单价计费。
//       reasoning_output_tokens 已包含于 output_tokens，不单独计费。
function estimateUsd(model, inputTokens, cachedTokens, cacheWriteTokens, outputTokens) {
  const p = priceFor(model);
  const cached = Number(cachedTokens) || 0;
  const cacheWrite = Number(cacheWriteTokens) || 0;
  const nonCacheIn = Math.max(0, (Number(inputTokens) || 0) - cached);
  const inCost = (nonCacheIn / 1e6) * p.in;
  const cacheCost = ((cached + cacheWrite) / 1e6) * p.cache;
  const outCost = ((Number(outputTokens) || 0) / 1e6) * p.out;
  return inCost + cacheCost + outCost;
}

module.exports = { USD_CNY, priceFor, estimateUsd, PRICES, DEFAULT };
