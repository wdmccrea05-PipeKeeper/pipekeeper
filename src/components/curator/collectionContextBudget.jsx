/**
 * Collection Context Budget Manager
 */

import { filterAiEligibleItems } from '@/platform/aiEligibility';

const CHARS_PER_TOKEN = 4;
const MAX_INPUT_CHARS = 60000;
const SAFE_INPUT_CHARS = 40000;

const THRESHOLDS = {
  small: 30,
  standard: 100,
  large: 300,
};

export function selectContextMode(pipes = [], blends = [], bottles = [], logs = [], cigars = []) {
  const totalItems = pipes.length + blends.length + bottles.length + cigars.length;
  const totalActivity = logs.length;

  if (totalItems <= THRESHOLDS.small && totalActivity <= 200) return 'small';
  if (totalItems <= THRESHOLDS.standard && totalActivity <= 1000) return 'standard';
  if (totalItems <= THRESHOLDS.large && totalActivity <= 3000) return 'large';
  return 'huge';
}

export function estimatePayloadChars(payload) {
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 0;
  }
}

export function buildSafeCollectionContext(rawContext = {}) {
  const {
    pipes = [],
    blends = [],
    bottles = [],
    smokingLogs = [],
    tastingLogs = [],
    cigars = [],
    cigarSessions = [],
    userProfile = null,
  } = rawContext;

  const eligiblePipes = filterAiEligibleItems(pipes);
  const eligibleBlends = filterAiEligibleItems(blends);
  const eligibleBottles = filterAiEligibleItems(bottles);
  const eligibleCigars = filterAiEligibleItems(cigars);

  const mode = selectContextMode(
    eligiblePipes,
    eligibleBlends,
    eligibleBottles,
    [...smokingLogs, ...tastingLogs, ...cigarSessions],
    eligibleCigars,
  );

  const pipeStats = computePipeStats(eligiblePipes, smokingLogs);
  const blendStats = computeBlendStats(eligibleBlends, smokingLogs);
  const bottleStats = computeBottleStats(eligibleBottles, tastingLogs);
  const cigarStats = computeCigarStats(eligibleCigars, cigarSessions);
  const activitySummary = computeActivitySummary(smokingLogs, tastingLogs, cigarSessions);

  const candidateStats = {
    totalRaw: pipes.length + blends.length + bottles.length + cigars.length,
    totalEligible: eligiblePipes.length + eligibleBlends.length + eligibleBottles.length + eligibleCigars.length,
    excluded:
      (pipes.length - eligiblePipes.length) +
      (blends.length - eligibleBlends.length) +
      (bottles.length - eligibleBottles.length) +
      (cigars.length - eligibleCigars.length),
    pipes: { raw: pipes.length, eligible: eligiblePipes.length },
    blends: { raw: blends.length, eligible: eligibleBlends.length },
    bottles: { raw: bottles.length, eligible: eligibleBottles.length },
    cigars: { raw: cigars.length, eligible: eligibleCigars.length },
    logs: smokingLogs.length + tastingLogs.length + cigarSessions.length,
  };

  const pipesSummary = buildItemSummary(eligiblePipes, mode, 'pipe');
  const blendsSummary = buildItemSummary(eligibleBlends, mode, 'blend');
  const bottlesSummary = buildItemSummary(eligibleBottles, mode, 'bottle');
  const cigarsSummary = buildItemSummary(eligibleCigars, mode, 'cigar');

  return {
    mode,
    candidateStats,
    pipeStats,
    blendStats,
    bottleStats,
    cigarStats,
    activitySummary,
    pipesSummary,
    blendsSummary,
    bottlesSummary,
    cigarsSummary,
    userProfile,
    eligiblePipeIds: eligiblePipes.map((p) => p.id),
    eligibleBlendIds: eligibleBlends.map((b) => b.id),
    eligibleBottleIds: eligibleBottles.map((b) => b.id),
    eligibleCigarIds: eligibleCigars.map((c) => c.id),
  };
}

function buildItemSummary(items, mode, type) {
  if (!items.length) return [];

  if (mode === 'small') {
    return items.map((item) => formatItemFull(item, type));
  }

  if (mode === 'standard') {
    return items.map((item) => formatItemCompact(item, type));
  }

  if (mode === 'large') {
    return buildLargeModeSummary(items, type);
  }

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

  if (type === 'cigar') {
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      vitola: item.vitola,
      wrapper: item.wrapper,
      strength: item.strength || item.body,
      origin: item.origin || item.country,
      quantity: item.quantity,
      rating: item.rating,
      is_favorite: item.is_favorite,
      purchase_date: item.purchase_date,
    };
  }

  return { id: item.id, name: item.name };
}

function formatItemCompact(item, type) {
  if (type === 'pipe') {
    return {
      id: item.id,
      name: item.name,
      maker: item.maker || null,
      shape: item.shape || null,
      focus: item.focus || [],
      favorite: !!item.is_favorite,
    };
  }

  if (type === 'blend') {
    return {
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer || null,
      blend_type: item.blend_type || null,
      strength: item.strength || null,
      rating: item.rating || null,
      favorite: !!item.is_favorite,
    };
  }

  if (type === 'bottle') {
    return {
      id: item.id,
      name: item.name,
      distillery: item.distillery || null,
      type: item.type || item.whiskey_type || null,
      age: item.age || null,
      abv: item.abv || null,
      rating: item.rating || null,
    };
  }

  if (type === 'cigar') {
    return {
      id: item.id,
      name: item.name,
      brand: item.brand || null,
      vitola: item.vitola || null,
      wrapper: item.wrapper || null,
      strength: item.strength || item.body || null,
      quantity: item.quantity || null,
      rating: item.rating || null,
    };
  }

  return {
    id: item.id,
    name: item.name,
  };
}

function buildLargeModeSummary(items, type) {
  const notable = selectNotableItems(items, type, 25);
  return {
    _mode: 'large_summarized',
    _total: items.length,
    _note: `Showing ${notable.length} most notable items from ${items.length} total. Full stats provided separately.`,
    items: notable.map((item) => formatItemCompact(item, type)),
  };
}

function buildHugeModeSummary(items, type) {
  const notable = selectNotableItems(items, type, 15);
  const stats = computeTypeDistribution(items, type);
  return {
    _mode: 'huge_aggregate',
    _total: items.length,
    _note: `Showing ${notable.length} most notable items from ${items.length} total. Full stats provided separately.`,
    stats,
    top_items: notable.map((item) => formatItemCompact(item, type)),
  };
}

function selectNotableItems(items, type, limit) {
  const scored = items.map((item) => {
    let score = 0;
    if (item.is_favorite || item.favorite) score += 10;
    if (item.rating && item.rating > 3) score += item.rating * 2;
    if (item.estimated_value > 100) score += 3;
    if (item.purchase_date) {
      const daysAgo = (Date.now() - new Date(item.purchase_date).getTime()) / 86400000;
      if (daysAgo < 60) score += 4;
    }
    if (type === 'blend') {
      if (item.production_status === 'Discontinued') score += 3;
      const qty =
        (item.tin_total_quantity_oz || 0) +
        (item.bulk_total_quantity_oz || 0);
      if (qty > 8) score += 2;
    }
    if (type === 'pipe' && item.focus?.length > 0) {
      score += 2;
    }
    if (type === 'cigar') {
      if (item.quantity > 5) score += 2;
      if (item.vitola) score += 1;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
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
  } else if (type === 'cigar') {
    for (const item of items) {
      const key = item.wrapper || item.vitola || 'Unknown';
      dist[key] = (dist[key] || 0) + 1;
    }
  }
  return dist;
}

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
  const neverUsed = pipes.filter((p) => !usageCounts[p.id]).length;
  const usedLast30 = pipes.filter((p) => logDates[p.id] && now - logDates[p.id] < 30 * 86400000).length;
  const neglected = pipes.filter((p) => logDates[p.id] && now - logDates[p.id] > 60 * 86400000).length;

  return {
    count: pipes.length,
    neverUsed,
    usedLast30,
    neglected,
    focused: pipes.filter((p) => p.focus?.length > 0).length,
    unfocused: pipes.filter((p) => !p.focus?.length).length,
    favorites: pipes.filter((p) => p.is_favorite).length,
    totalBowlsSmoked: smokingLogs.length,
  };
}

function computeBlendStats(blends, smokingLogs = []) {
  if (!blends.length) return { count: 0 };

  const usageCounts = {};
  for (const log of smokingLogs) {
    if (log.blend_id) usageCounts[log.blend_id] = (usageCounts[log.blend_id] || 0) + (log.bowls_used || 1);
  }

  let totalOz = 0;
  let discontinuedCount = 0;
  let ratedCount = 0;
  let ratingSum = 0;

  for (const b of blends) {
    const oz =
      (b.tin_total_quantity_oz || 0) +
      (b.bulk_total_quantity_oz || 0) +
      (b.pouch_total_quantity_oz || 0);
    totalOz += oz;
    if (b.production_status === 'Discontinued') discontinuedCount++;
    if (b.rating) {
      ratedCount++;
      ratingSum += b.rating;
    }
  }

  return {
    count: blends.length,
    neverSmoked: blends.filter((b) => !usageCounts[b.id]).length,
    totalInventoryOz: Math.round(totalOz * 10) / 10,
    discontinuedCount,
    ratedCount,
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    favorites: blends.filter((b) => b.is_favorite).length,
  };
}

function computeBottleStats(bottles, tastingLogs = []) {
  if (!bottles.length) return { count: 0 };

  const tastedBottleIds = new Set(tastingLogs.map((l) => l.bottle_id).filter(Boolean));
  let ratedCount = 0;
  let ratingSum = 0;
  let totalValue = 0;

  for (const b of bottles) {
    if (b.rating) {
      ratedCount++;
      ratingSum += b.rating;
    }
    const val =
      b.collector_value ||
      b.aftermarket_price ||
      b.retail_price ||
      b.purchase_price ||
      0;
    totalValue += Number(val) || 0;
  }

  return {
    count: bottles.length,
    untasted: bottles.filter((b) => !tastedBottleIds.has(b.id)).length,
    tasted: tastedBottleIds.size,
    totalTastings: tastingLogs.length,
    ratedCount,
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    favorites: bottles.filter((b) => b.favorite).length,
    totalCollectionValue: Math.round(totalValue),
  };
}

function computeCigarStats(cigars = [], cigarSessions = []) {
  if (!cigars.length) return { count: 0 };

  const sessionCigarIds = new Set(cigarSessions.map((s) => s.cigar_id).filter(Boolean));
  let ratedCount = 0;
  let ratingSum = 0;
  let totalQuantity = 0;

  for (const c of cigars) {
    if (c.rating) {
      ratedCount++;
      ratingSum += c.rating;
    }
    totalQuantity += Number(c.quantity || 0);
  }

  const wrapperDist = {};
  for (const c of cigars) {
    const key = c.wrapper || 'Unknown';
    wrapperDist[key] = (wrapperDist[key] || 0) + 1;
  }

  return {
    count: cigars.length,
    totalQuantity,
    smoked: sessionCigarIds.size,
    neverSmoked: cigars.filter((c) => !sessionCigarIds.has(c.id)).length,
    totalSessions: cigarSessions.length,
    ratedCount,
    avgRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    favorites: cigars.filter((c) => c.is_favorite).length,
    wrapperDistribution: wrapperDist,
  };
}

function computeActivitySummary(smokingLogs = [], tastingLogs = [], cigarSessions = []) {
  const now = Date.now();
  const recent30 = smokingLogs.filter((l) => l.date && now - new Date(l.date).getTime() < 30 * 86400000).length;
  const recent30Tasting = tastingLogs.filter((l) => l.tasting_date && now - new Date(l.tasting_date).getTime() < 30 * 86400000).length;
  const recent30Cigar = cigarSessions.filter((l) => {
    const d = l.date || l.session_date || l.created_date;
    return d && now - new Date(d).getTime() < 30 * 86400000;
  }).length;

  return {
    totalSmokingLogs: smokingLogs.length,
    totalTastingLogs: tastingLogs.length,
    totalCigarSessions: cigarSessions.length,
    smokingLast30Days: recent30,
    tastingLast30Days: recent30Tasting,
    cigarSessionsLast30Days: recent30Cigar,
  };
}

export function buildPromptBlock(safeContext) {
  const {
    mode,
    candidateStats,
    pipeStats,
    blendStats,
    bottleStats,
    cigarStats,
    activitySummary,
    pipesSummary,
    blendsSummary,
    bottlesSummary,
    cigarsSummary,
  } = safeContext;

  const modeNote =
    mode !== 'small'
      ? `[Analysis Mode: ${mode.toUpperCase()} — ${candidateStats.totalEligible} eligible items from ${candidateStats.totalRaw} total${candidateStats.excluded > 0 ? `, ${candidateStats.excluded} AI-excluded` : ''}]\n`
      : '';

  const cigarStatsLine = cigarStats && cigarStats.count > 0
    ? `\nCigars: ${cigarStats.count} total | ${cigarStats.totalQuantity || 0} total qty | ${cigarStats.neverSmoked || 0} never smoked | ${cigarStats.totalSessions || 0} sessions logged`
    : '';

  const cigarActivityNote = activitySummary.totalCigarSessions > 0
    ? ` | ${activitySummary.totalCigarSessions} cigar sessions`
    : '';

  const statsBlock = `
COLLECTION STATISTICS:
Pipes: ${pipeStats.count} total | ${pipeStats.neverUsed || 0} never used | ${pipeStats.usedLast30 || 0} active last 30d | ${pipeStats.neglected || 0} neglected (60d+) | ${pipeStats.unfocused || 0} without specialization
Blends: ${blendStats.count} total | ${blendStats.neverSmoked || 0} never smoked | ${blendStats.totalInventoryOz || 0}oz inventory | ${blendStats.discontinuedCount || 0} discontinued
Bottles: ${bottleStats.count} total | ${bottleStats.untasted || 0} untasted | ${bottleStats.tasted || 0} tasted | ${bottleStats.totalTastings || 0} total tastings${cigarStatsLine}
Activity: ${activitySummary.totalSmokingLogs} pipe sessions | ${activitySummary.smokingLast30Days} last 30 days | ${activitySummary.totalTastingLogs} tasting notes${cigarActivityNote}`;

  const formatSection = (label, summary, count) => {
    if (!count) return `\n${label}: None`;
    if (Array.isArray(summary)) {
      return `\n${label} (${count} total):\n${summary
        .slice(0, 50)
        .map((s) => `- ${JSON.stringify(s)}`)
        .join('\n')}`;
    }
    return `\n${label} (${count} total, ${summary._mode || mode}):\nStats: ${JSON.stringify(
      summary.stats || {}
    )}\nNotable:\n${(summary.top_items || summary.items || [])
      .slice(0, 20)
      .map((s) => `- ${JSON.stringify(s)}`)
      .join('\n')}`;
  };

  return (
    modeNote +
    statsBlock +
    formatSection('PIPES', pipesSummary, pipeStats.count) +
    formatSection('TOBACCO BLENDS', blendsSummary, blendStats.count) +
    formatSection('WHISKEY BOTTLES', bottlesSummary, bottleStats.count) +
    (cigarStats && cigarStats.count > 0
      ? formatSection('CIGARS', cigarsSummary, cigarStats.count)
      : '')
  );
}

export function validateCandidateIds(aiReturnedIds, safeContext) {
  if (!Array.isArray(aiReturnedIds)) return [];
  const validIds = new Set([
    ...safeContext.eligiblePipeIds,
    ...safeContext.eligibleBlendIds,
    ...safeContext.eligibleBottleIds,
    ...(safeContext.eligibleCigarIds || []),
  ]);
  return aiReturnedIds.filter((id) => validIds.has(id));
}