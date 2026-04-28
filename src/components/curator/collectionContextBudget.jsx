/**
 * collectionContextBudget.js
 *
 * Context sizing and compression helpers for Curator LLM workflows.
 *
 * Responsibilities:
 *   - Determine context mode (small / large / huge) based on collection size
 *   - Build a token-safe context object that covers ALL eligible items without
 *     silent truncation — larger modes compress summaries, not candidate pools
 *   - Expose eligible item ID arrays so CoverageAudit can verify completeness
 *
 * MODE THRESHOLDS
 *   small  < 30 total items AND < 100 total logs   → full detail per item
 *   large  < 200 items OR < 2000 logs              → summary rows per item
 *   huge   ≥ 200 items OR ≥ 2000 logs              → compressed batch summaries
 */

import { filterAiEligibleItems } from '@/platform/aiEligibility';

// ---------------------------------------------------------------------------
// Mode selection
// ---------------------------------------------------------------------------

/**
 * Determine the context compression mode for a given collection.
 *
 * @param {object[]} pipes
 * @param {object[]} blends
 * @param {object[]} bottles
 * @param {object[]} allLogs  — combined smoking + tasting logs
 * @returns {'small' | 'large' | 'huge'}
 */
export function selectContextMode(pipes, blends, bottles, allLogs) {
  const totalItems =
    (Array.isArray(pipes) ? pipes.length : 0) +
    (Array.isArray(blends) ? blends.length : 0) +
    (Array.isArray(bottles) ? bottles.length : 0);
  const totalLogs = Array.isArray(allLogs) ? allLogs.length : 0;

  if (totalItems >= 200 || totalLogs >= 2000) return 'huge';
  if (totalItems >= 30 || totalLogs >= 100) return 'large';
  return 'small';
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

/**
 * Build a token-safe collection context covering ALL eligible items.
 *
 * The returned object exposes:
 *   - mode                 — compression level
 *   - eligiblePipeIds      — all eligible pipe IDs (no truncation)
 *   - eligibleBlendIds     — all eligible blend IDs
 *   - eligibleBottleIds    — all eligible bottle IDs
 *   - pipeSummaries        — per-pipe summary rows
 *   - blendSummaries       — per-blend summary rows
 *   - bottleSummaries      — per-bottle summary rows
 *   - logStats             — aggregated log statistics (not raw logs)
 *
 * @param {{
 *   pipes?:       object[],
 *   blends?:      object[],
 *   bottles?:     object[],
 *   smokingLogs?: object[],
 *   tastingLogs?: object[],
 * }} rawContext
 * @returns {object}
 */
export function buildSafeCollectionContext(rawContext = {}) {
  const pipes = Array.isArray(rawContext.pipes) ? rawContext.pipes : [];
  const blends = Array.isArray(rawContext.blends) ? rawContext.blends : [];
  const bottles = Array.isArray(rawContext.bottles) ? rawContext.bottles : [];
  const wines = Array.isArray(rawContext.wines) ? rawContext.wines : [];
  const smokingLogs = Array.isArray(rawContext.smokingLogs) ? rawContext.smokingLogs : [];
  const tastingLogs = Array.isArray(rawContext.tastingLogs) ? rawContext.tastingLogs : [];
  const wineTastingLogs = Array.isArray(rawContext.wineTastingLogs) ? rawContext.wineTastingLogs : [];
  const allLogs = [...smokingLogs, ...tastingLogs];

  const mode = selectContextMode(pipes, blends, bottles, allLogs);

  // Eligible candidate pools — NEVER truncated
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  const eligibleBottles = filterAiEligibleItems(bottles);
  const eligibleWines = filterAiEligibleItems(wines);

  const eligiblePipeIds = eligiblePipes.map((p) => p.id);
  const eligibleBlendIds = eligibleBlends.map((b) => b.id);
  const eligibleBottleIds = eligibleBottles.map((b) => b.id);
  const eligibleWineIds = eligibleWines.map((w) => w.id);

  // ── Build summaries (detail level varies by mode) ────────────────────────
  const pipeSummaries = eligiblePipes.map((p) =>
    _pipeSummary(p, mode, smokingLogs)
  );

  const blendSummaries = eligibleBlends.map((b) =>
    _blendSummary(b, mode, smokingLogs)
  );

  const bottleSummaries = eligibleBottles.map((b) =>
    _bottleSummary(b, mode, tastingLogs)
  );

  const wineSummaries = eligibleWines.map((w) =>
    _wineSummary(w, mode, wineTastingLogs)
  );

  // ── Aggregated log stats (no raw log objects sent to LLM) ────────────────
  const logStats = _buildLogStats(smokingLogs, tastingLogs, pipes, blends, bottles);

  return {
    mode,
    eligiblePipeIds,
    eligibleBlendIds,
    eligibleBottleIds,
    eligibleWineIds,
    pipeSummaries,
    blendSummaries,
    bottleSummaries,
    wineSummaries,
    logStats,
    winePreferences: rawContext.winePreferences || null,
    wineNotes: rawContext.wineNotes || null,
    totals: {
      pipes: pipes.length,
      blends: blends.length,
      bottles: bottles.length,
      wines: wines.length,
      eligiblePipes: eligiblePipes.length,
      eligibleBlends: eligibleBlends.length,
      eligibleBottles: eligibleBottles.length,
      eligibleWines: eligibleWines.length,
      smokingLogs: smokingLogs.length,
      tastingLogs: tastingLogs.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Prompt block builder
// ---------------------------------------------------------------------------

/**
 * Serialize the safe context into a compact plain-text prompt block.
 * Keeps token count reasonable while retaining full candidate coverage.
 *
 * @param {object} safeContext — result of buildSafeCollectionContext
 * @returns {string}
 */
export function buildPromptBlock(safeContext) {
  if (!safeContext) return '';

  const lines = [
    `COLLECTION CONTEXT [mode: ${safeContext.mode}]`,
    `Totals: ${safeContext.totals?.pipes || 0} pipes, ${safeContext.totals?.blends || 0} blends, ${safeContext.totals?.bottles || 0} bottles, ${safeContext.totals?.wines || 0} wines`,
    `Eligible: ${safeContext.totals?.eligiblePipes || 0} pipes, ${safeContext.totals?.eligibleBlends || 0} blends, ${safeContext.totals?.eligibleBottles || 0} bottles, ${safeContext.totals?.eligibleWines || 0} wines`,
    `Logs: ${safeContext.totals?.smokingLogs || 0} smoking, ${safeContext.totals?.tastingLogs || 0} tasting`,
    '',
  ];

  if (safeContext.pipeSummaries?.length > 0) {
    lines.push('PIPES:');
    safeContext.pipeSummaries.forEach((s) => lines.push(`  - ${s}`));
    lines.push('');
  }

  if (safeContext.blendSummaries?.length > 0) {
    lines.push('TOBACCOS:');
    safeContext.blendSummaries.forEach((s) => lines.push(`  - ${s}`));
    lines.push('');
  }

  if (safeContext.bottleSummaries?.length > 0) {
    lines.push('BOTTLES:');
    safeContext.bottleSummaries.forEach((s) => lines.push(`  - ${s}`));
    lines.push('');
  }

  if (safeContext.wineSummaries?.length > 0) {
    lines.push('WINES:');
    safeContext.wineSummaries.forEach((s) => lines.push(`  - ${s}`));
    lines.push('');
  }

  if (safeContext.winePreferences) {
    const wp = safeContext.winePreferences;
    const parts = [];
    if (wp.styles?.length)          parts.push(`styles: ${wp.styles.join(', ')}`);
    if (wp.varietals?.length)        parts.push(`varietals: ${wp.varietals.join(', ')}`);
    if (wp.regions?.length)          parts.push(`regions: ${wp.regions.join(', ')}`);
    if (wp.drinking_goals?.length)   parts.push(`goals: ${wp.drinking_goals.join(', ')}`);
    if (wp.pairing_interests?.length) parts.push(`pairings: ${wp.pairing_interests.join(', ')}`);
    if (wp.flavor_profile?.length)   parts.push(`flavors: ${wp.flavor_profile.join(', ')}`);
    if (wp.cellar_strategy)          parts.push(`cellar: ${wp.cellar_strategy}`);
    if (wp.budget_everyday_max)      parts.push(`everyday budget: $${wp.budget_everyday_min || 0}–$${wp.budget_everyday_max}`);
    if (wp.budget_special_max)       parts.push(`special budget: $${wp.budget_special_min || 0}–$${wp.budget_special_max}`);
    if (wp.max_recommendation_price) parts.push(`max price: $${wp.max_recommendation_price}`);
    if (parts.length) {
      lines.push('WINE PREFERENCES:');
      parts.forEach((p) => lines.push(`  ${p}`));
      lines.push('');
    }
  }

  if (safeContext.wineNotes) {
    lines.push(`WINE NOTES: ${safeContext.wineNotes}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _pipeSummary(pipe, mode, smokingLogs) {
  const sessions = smokingLogs.filter((l) => l.pipe_id === pipe.id).length;
  if (mode === 'small') {
    return `[${pipe.id}] ${pipe.name || '—'} | ${pipe.maker || '—'} | shape: ${pipe.shape || '—'} | sessions: ${sessions}`;
  }
  return `[${pipe.id}] ${pipe.name || '—'} | sessions: ${sessions}`;
}

function _blendSummary(blend, mode, smokingLogs) {
  const sessions = smokingLogs.filter((l) => l.blend_id === blend.id).length;
  if (mode === 'small') {
    return `[${blend.id}] ${blend.name || '—'} | ${blend.blend_type || '—'} | oz: ${_blendOz(blend)} | sessions: ${sessions}`;
  }
  return `[${blend.id}] ${blend.name || '—'} | sessions: ${sessions}`;
}

function _bottleSummary(bottle, mode, tastingLogs) {
  const tastings = tastingLogs.filter((l) => l.bottle_id === bottle.id).length;
  if (mode === 'small') {
    return `[${bottle.id}] ${bottle.name || '—'} | ${bottle.type || '—'} | rating: ${bottle.rating || '—'} | tastings: ${tastings}`;
  }
  return `[${bottle.id}] ${bottle.name || '—'} | tastings: ${tastings}`;
}

function _blendOz(blend) {
  const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  return n(blend.tin_total_quantity_oz) + n(blend.bulk_total_quantity_oz) + n(blend.pouch_total_quantity_oz);
}

function _wineSummary(wine, mode, wineTastingLogs) {
  const tastings = wineTastingLogs.filter((l) => l.wine_id === wine.id).length;
  if (mode === 'small') {
    return `[${wine.id}] ${wine.name || '—'} | ${wine.producer || '—'} | ${wine.vintage || '—'} | ${wine.style || '—'} | qty: ${wine.quantity || 1} | tastings: ${tastings}`;
  }
  return `[${wine.id}] ${wine.name || '—'} | ${wine.vintage || '—'} | tastings: ${tastings}`;
}

function _buildLogStats(smokingLogs, tastingLogs, pipes, blends, bottles) {
  const pipeUsage = {};
  const blendUsage = {};
  smokingLogs.forEach((l) => {
    if (l.pipe_id) pipeUsage[l.pipe_id] = (pipeUsage[l.pipe_id] || 0) + 1;
    if (l.blend_id) blendUsage[l.blend_id] = (blendUsage[l.blend_id] || 0) + 1;
  });

  const bottleUsage = {};
  tastingLogs.forEach((l) => {
    if (l.bottle_id) bottleUsage[l.bottle_id] = (bottleUsage[l.bottle_id] || 0) + 1;
  });

  const topPipeId = Object.entries(pipeUsage).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topBlendId = Object.entries(blendUsage).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    totalSmokeSessions: smokingLogs.length,
    totalTastings: tastingLogs.length,
    uniquePipesUsed: Object.keys(pipeUsage).length,
    uniqueBlendsUsed: Object.keys(blendUsage).length,
    uniqueBottlesTasted: Object.keys(bottleUsage).length,
    topPipeId: topPipeId || null,
    topBlendId: topBlendId || null,
  };
}