/**
 * Collection Context Budget Manager
 * 
 * Determines the safest mode for passing collection data to the AI curator,
 * compresses large datasets into structured summaries, and guarantees no
 * silent truncation happens at the prompt level.
 * 
 * MODES:
 *   small    — < 30 items total  → pass full item list
 *   standard — 30-100 items      → pass summarized list with key fields only
 *   large    — 100-300 items     → pass compressed summaries + stats
 *   huge     — 300+ items        → pass aggregate stats + top candidates only
 */

import { filterAiEligibleItems } from '@/platform/aiEligibility';

// Token budget constants (conservative estimates)
const CHARS_PER_TOKEN = 4;
const MAX_INPUT_CHARS = 60000;   // ~15k tokens — safe for most models
const SAFE_INPUT_CHARS = 40000;  // ~10k tokens — preferred ceiling

// Item count thresholds per mode
const THRESHOLDS = {
  small: 30,
  standard: 100,
  large: 300,
};

/**
 * Determine which compression mode to use based on collection sizes
 */
export function selectContextMode(pipes = [], blends = [], bottles = [], logs = []) {
  const totalItems = pipes.length + blends.length + bottles.length;
  const totalActivity = logs.length;

  if (totalItems <= THRESHOLDS.small && totalActivity <= 200) return 'small';
  if (totalItems <= THRESHOLDS.standard && totalActivity <= 1000) return 'standard';
  if (totalItems <= THRESHOLDS.large && totalActivity <= 3000) return 'large';
  return 'huge';
}

/**
 * Estimate character count of a prompt payload
 */
export function estimatePayloadChars(payload) {
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

/**
 * Build a safe, mode-appropriate collection context for AI prompts.
 * Never silently truncates — always accounts for every item.
 * 
 * @param {object} rawContext - { pipes, blends, bottles, smokingLogs, tastingLogs, userProfile }
 * @returns {{ mode, summary, candidateStats, pipesSummary, blendsSummary, bottlesSummary, activitySummary }}
 */
export function buildSafeCollectionContext(rawContext = {}) {
  const {
    pipes = [],
    blends = [],
    bottles = [],
    smokingLogs = [],
    tastingLogs = [],
    userProfile = null,
  } = rawContext;

  // Always filter AI-excluded items first
  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  const eligibleBottles = filterAiEligibleItems(bottles);

  const mode = selectContextMode(eligiblePipes, eligibleBlends, eligibleBottles, [...smokingLogs, ...tastingLogs]);

  // Compute deterministic facts before AI sees anything
  const pipeStats = computePipeStats(eligiblePipes, smokingLogs);
  const blendStats = computeBlendStats(eligibleBlends, smokingLogs);
  const bottleStats = computeBottleStats(eligibleBottles, tastingLogs);
  const activitySummary = computeActivitySummary(smokingLogs, tastingLogs);

  const candidateStats = {
    totalRaw: pipes.length + blends.length + bottles.length,
    totalEligible: eligiblePipes.length + eligibleBlends.length + eligibleBottles.length,
    excluded: (pipes.length - eligiblePipes.length) + (blends.length - eligibleBlends.length) + (bottles.length - eligibleBottles.length),
    pipes: { raw: pipes.length, eligible: eligiblePipes.length },
    blends: { raw: blends.length, eligible: eligibleBlends.length },
    bottles: { raw: bottles.length, eligible: eligibleBottles.length },
    logs: smokingLogs.length + tastingLogs.length,
  };

  // Build mode-appropriate item representations
  const pipesSummary = buildItemSummary(eligiblePipes, mode, 'pipe');
  const blendsSummary = buildItemSummary(eligibleBlends, mode, 'blend');
  const bottlesSummary = buildItemSummary(eligibleBottles, mode, 'bottle');

  return {
    mode,
    candidateStats,
    pipeStats,
    blendStats,
    bottleStats,
    activitySummary,
    pipesSummary,
    blendsSummary,
    bottlesSummary,
    userProfile,
    // IDs for post-AI validation
    eligiblePipeIds: eligiblePipes.map(p => p.id),
    eligibleBlendIds: eligibleBlends.map(b => b.id),
    eligibleBottleIds: eligibleBottles.map(b => b.id),
  };
}

/**
 * Build item summary appropriate for the current mode
 */
function buildItemSummary(items, mode, type) {
  if (!items.length) return [];

  if (mode === 'small') {
    // Full detail for small collections
    return items.map(item => formatItemFull(item, type));
  }

  if (mode === 'standard') {
    // Key fields only
    return items.map(item => formatItemCompact(item, type));
  }

  if (mode === 'large') {
    // Statistical summary + top/notable items only
    return buildLargeModeSummary(items, type);
  }

  // huge mode — aggregate stats only, top 15 notable items
  return buildHugeModeSummary(items, type);
}

function formatItemFull(item, type) {
  if (type === 'pipe') {
    return {
      id: item.id,
      name: item.name,
      maker: item.maker,
      shape: item.shape,
      material: item.bowl_material,
      finish: item.finish,
      focus: item.focus,
      is_favorite: item.is_favorite,
      condition: item.condition,
      estimated_value: item.estimated_value,
      purchase_date: item.purchase_date,
    };
  }
  if (type === 'blend') {
    return {
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      blend_type: item.blend_type,
      strength: item.strength,
      cut: item.cut,
      flavor_notes: item.flavor_notes,
      rating: item.rating,
      is_favorite: item.is_favorite,
      production_status: item.production_status,
      tin_total_quantity_oz: item.tin_total_quantity_oz,
      bulk_total_quantity_oz: item.bulk_total_quantity_oz,
    };
  }
  if (type === 'bottle') {
    return {
      id: item.id,
      name: item.name,
      distillery: item.distillery,
      type: item.type || item.whiskey_type,
      region: item.region,
      age: item.age,
      abv: item.abv,
      rating: item.rating,
      is_favorite: item.favorite,
      purchase_price: item.purchase_price,
      retail_price: item.retail_price,
      purchase_date: item.purchase_date,
    };
  }
  return { id: item.id, name: item.name };
}

function formatItemCompact(item, type) {
  if (type === 'pipe') {
    return `${item.name}|${item.maker || '?'}|${item.shape || '?'}|${item.focus?.join(',') || 'none'}|fav:${item.is_favorite ? 'y' : 'n'}`;
  }
  if (type === 'blend') {
    return `${item.name}|${item.manufacturer || '?'}|${item.blend_type || '?'}|str:${item.strength || '?'}|rating:${item.rating || '?'}|fav:${item.is_favorite ? 'y' : 'n'}`;
  }
  if (type === 'bottle') {
    return `${item.name}|${item.distillery || '?'}|${item.type || item.whiskey_type || '?'}|age:${item.age || '?'}|abv:${item.abv || '?'}|rating:${item.rating || '?'}`;
  }
  return `${item.name}`;
}

function buildLargeModeSummary(items, type) {
  // Stats aggregate + top 25 notable items
  const notable = selectNotableItems(items, type, 25);
  return {
    _mode: 'large_summarized',
    _total: items.length,
    _note: `Showing ${notable.length} most notable items from ${items.length} total. Full stats provided separately.`,
    items: notable.map(item => formatItemCompact(item, type)),
  };
}

function buildHugeModeSummary(items, type) {
  // Top 15 most notable + aggregate stats
  const notable = selectNotableItems(items, type, 15);
  const stats = computeTypeDistribution(items, type);
  return {
    _mode: 'huge_aggregate',
    _total: items.length,
    _note: `Showing ${notable.length} most notable items from ${items.length} total. Use aggregate stats for analysis.`,
    stats,
    top_items: notable.map(item => formatItemCompact(item, type)),
  };
}

/**
 * Select most notable items for compressed context (favorites, rated, recent, valued)
 */
function selectNotableItems(items, type, limit) {
  const scored = items.map(item => {
    let score = 0;
    if (item.is_favorite || item.favorite) score += 10;
    if (item.rating && item.rating > 3) score += (item.rating * 2);
    if (item.estimated_value > 100) score += 3;
    if (item.purchase_date) {
      const daysAgo = (Date.now() - new Date(item.purchase_date).getTime()) / 86400000;
      if (daysAgo < 60) score += 4;
    }
    if (type === 'blend') {
      if (item.production_status === 'Discontinued') score += 3;
      const qty = (item.tin_total_quantity_oz || 0) + (item.bulk_total_quantity_oz || 0);
      if (qty > 8) score += 2;
    }
    if (type === 'pipe') {
      if (item.focus?.length > 0) score += 2;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.item);
}

function computeTypeDistribution(items, type) {
  const dist = {};
  if (type === 'pipe') {
    for (const item of items) {
      const key = item.shape || 'Unknown';
      dist[key] = (dist[key] || 0) + 1;
    }
  } else if (type === 'blend') {
    for (const item of items) {
      const key = item.blend_type || 'Unknown';
      dist[key] = (dist[key] || 0) + 1;
    }
  } else if (type === 'bottle') {
    for (const item of items) {
      const key = item.type || item.whiskey_type || 'Unknown';
      dist[key] = (dist[key] || 0) + 1;
    }
  }
  return dist;
}

// ─── Deterministic Stats Computers ───────────────────────────────────────────

function computePipeStats(pipes, smokingLogs = []) {
  if (!pipes.length) return { count: 0 };

  const usageCounts = {};
  for (const log of smokingLogs) {
    if (log.pipe_id) usageCounts[log.pipe_id] = (usageCounts[log.pipe_id] || 0) + (log.bowls_used || 1);
  }

  const logDates = {};
  for (const log of smokingLogs) {
    if (log.pipe_id && log.date) {
      const existing = logDates[log.pipe_id];
      const logDate = new Date(log.date).getTime();
      if (!existing || logDate > existing) logDates[log.pipe_id] = logDate;
    }
  }

  const now = Date.now();
  const neverUsed = pipes.filter(p => !usageCounts[p.id]).length;
  const usedLast30 = pipes.filter(p => logDates[p.id] && (now - logDates[p.id]) < 30 * 86400000).length;
  const neglected = pipes.filter(p => logDates[p.id] && (now - logDates[p.id]) > 60 * 86400000).length;

  const shapeDistribution = {};
  const materialDistribution = {};
  for (const p of pipes) {
    const shape = p.shape || 'Unknown';
    shapeDistribution[shape] = (shapeDistribution[shape] || 0) + 1;
    const mat = p.bowl_material || 'Unknown';
    materialDistribution[mat] = (materialDistribution[mat] || 0) + 1;
  }

  const focused = pipes.filter(p => p.focus?.length > 0).length;
  const unfocused = pipes.length - focused;
  const favorites = pipes.filter(p => p.is_favorite).length;
  const totalBowls = smokingLogs.length;

  return {
    count: pipes.length,
    neverUsed,
    usedLast30,
    neglected,
    focused,
    unfocused,
    favorites,
    totalBowlsSmoked: totalBowls,
    shapeDistribution,
    materialDistribution,
    mostUsedPipeId: Object.entries(usageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  };
}

function computeBlendStats(blends, smokingLogs = []) {
  if (!blends.length) return { count: 0 };

  const usageCounts = {};
  for (const log of smokingLogs) {
    if (log.blend_id) usageCounts[log.blend_id] = (usageCounts[log.blend_id] || 0) + (log.bowls_used || 1);
  }

  const typeDistribution = {};
  const strengthDistribution = {};
  let totalOz = 0;
  let discontinuedCount = 0;
  let ratedCount = 0;
  let ratingSum = 0;

  for (const b of blends) {
    const type = b.blend_type || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    const str = b.strength || 'Unknown';
    strengthDistribution[str] = (strengthDistribution[str] || 0) + 1;
    const oz = (b.tin_total_quantity_oz || 0) + (b.bulk_total_quantity_oz || 0) + (b.pouch_total_quantity_oz || 0);
    totalOz += oz;
    if (b.production_status === 'Discontinued') discontinuedCount++;
    if (b.rating) { ratedCount++; ratingSum += b.rating; }
  }

  const neverSmoked = blends.filter(b => !usageCounts[b.id]).length;

  return {
    count: blends.length,
    neverSmoked,
    totalInventoryOz: Math.round(totalOz * 10) / 10,
    discontinuedCount,
    ratedCount,
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    favorites: blends.filter(b => b.is_favorite).length,
    typeDistribution,
    strengthDistribution,
  };
}

function computeBottleStats(bottles, tastingLogs = []) {
  if (!bottles.length) return { count: 0 };

  const tastedBottleIds = new Set(tastingLogs.map(l => l.bottle_id).filter(Boolean));
  const typeDistribution = {};
  const regionDistribution = {};
  let ratedCount = 0;
  let ratingSum = 0;
  let totalValue = 0;

  for (const b of bottles) {
    const type = b.type || b.whiskey_type || 'Unknown';
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    const region = b.region || 'Unknown';
    regionDistribution[region] = (regionDistribution[region] || 0) + 1;
    if (b.rating) { ratedCount++; ratingSum += b.rating; }
    const val = b.collector_value || b.aftermarket_price || b.retail_price || b.purchase_price || 0;
    totalValue += Number(val) || 0;
  }

  const untasted = bottles.filter(b => !tastedBottleIds.has(b.id)).length;

  return {
    count: bottles.length,
    untasted,
    tasted: tastedBottleIds.size,
    totalTastings: tastingLogs.length,
    ratedCount,
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    favorites: bottles.filter(b => b.favorite).length,
    totalCollectionValue: Math.round(totalValue),
    typeDistribution,
    regionDistribution,
  };
}

function computeActivitySummary(smokingLogs = [], tastingLogs = []) {
  const now = Date.now();
  const recent30 = smokingLogs.filter(l => l.date && (now - new Date(l.date).getTime()) < 30 * 86400000).length;
  const recent30Tasting = tastingLogs.filter(l => l.tasting_date && (now - new Date(l.tasting_date).getTime()) < 30 * 86400000).length;

  const lastSmoke = smokingLogs.length > 0
    ? new Date(smokingLogs.reduce((latest, l) => {
        const d = new Date(l.date).getTime();
        return d > latest ? d : latest;
      }, 0)).toISOString().split('T')[0]
    : null;

  return {
    totalSmokingLogs: smokingLogs.length,
    totalTastingLogs: tastingLogs.length,
    smokingLast30Days: recent30,
    tastingLast30Days: recent30Tasting,
    lastSmokingDate: lastSmoke,
  };
}

/**
 * Build a prompt-ready text block from a safe context
 */
export function buildPromptBlock(safeContext) {
  const { mode, candidateStats, pipeStats, blendStats, bottleStats, activitySummary,
    pipesSummary, blendsSummary, bottlesSummary } = safeContext;

  const modeNote = mode !== 'small'
    ? `[Analysis Mode: ${mode.toUpperCase()} — ${candidateStats.totalEligible} eligible items from ${candidateStats.totalRaw} total${candidateStats.excluded > 0 ? `, ${candidateStats.excluded} AI-excluded` : ''}]\n`
    : '';

  const statsBlock = `
COLLECTION STATISTICS (deterministic facts — use these for factual claims):
Pipes: ${pipeStats.count} total | ${pipeStats.neverUsed || 0} never used | ${pipeStats.usedLast30 || 0} active last 30d | ${pipeStats.neglected || 0} neglected (60d+) | ${pipeStats.unfocused || 0} without specialization
Blends: ${blendStats.count} total | ${blendStats.neverSmoked || 0} never smoked | ${blendStats.totalInventoryOz || 0}oz inventory | ${blendStats.discontinuedCount || 0} discontinued
Bottles: ${bottleStats.count} total | ${bottleStats.untasted || 0} untasted | ${bottleStats.tasted || 0} tasted | ${bottleStats.totalTastings || 0} total tastings
Activity: ${activitySummary.totalSmokingLogs} smoking sessions | ${activitySummary.smokingLast30Days} last 30 days | ${activitySummary.totalTastingLogs} tasting notes`;

  const formatSection = (label, summary, count) => {
    if (!count) return `\n${label}: None`;
    if (Array.isArray(summary)) {
      return `\n${label} (${count} total):\n${summary.slice(0, 50).map(s => typeof s === 'string' ? `- ${s}` : `- ${JSON.stringify(s)}`).join('\n')}`;
    }
    return `\n${label} (${count} total, ${summary._mode || mode}):\nStats: ${JSON.stringify(summary.stats || {})}\nNotable: ${(summary.top_items || summary.items || []).slice(0, 20).join('\n')}`;
  };

  return modeNote + statsBlock
    + formatSection('PIPES', pipesSummary, pipeStats.count)
    + formatSection('TOBACCO BLENDS', blendsSummary, blendStats.count)
    + formatSection('WHISKEY BOTTLES', bottlesSummary, bottleStats.count);
}

/**
 * Validate that AI-returned item IDs exist in the eligible candidate pool.
 * Rejects hallucinated IDs. Returns only valid items.
 */
export function validateCandidateIds(aiReturnedIds, safeContext) {
  if (!Array.isArray(aiReturnedIds)) return [];
  const validIds = new Set([
    ...safeContext.eligiblePipeIds,
    ...safeContext.eligibleBlendIds,
    ...safeContext.eligibleBottleIds,
  ]);
  return aiReturnedIds.filter(id => validIds.has(id));
}