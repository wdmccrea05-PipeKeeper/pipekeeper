/**
 * Pairing Engine
 *
 * Generates structured pairing recommendations from the collection.
 * Uses actual collection + usage data — no LLM calls.
 *
 * Supported pairings:
 *   - pipe + whiskey (direct_pairing and collection_mix_match)
 *   - cigar + whiskey
 *
 * Invalid combinations (never generated):
 *   - pipe + cigar
 *   - tobacco + cigar
 *   - whiskey + wine
 *   - all modules at once
 */

import { createRecommendation, CATEGORY, ACTION_TYPE, MODULE_KEY, OWNERSHIP_CONTEXT, PRIORITY } from './recommendationSchema.js';

// ─── Pairing mode constants ───────────────────────────────────────────────────

export const PAIRING_MODE = {
  DIRECT_PAIRING:       'direct_pairing',
  COLLECTION_MIX_MATCH: 'collection_mix_match',
};

export const PAIRING_MODE_LABELS = {
  [PAIRING_MODE.DIRECT_PAIRING]:       'Direct Pairing',
  [PAIRING_MODE.COLLECTION_MIX_MATCH]: 'Mix & Match',
};

// ─── Flavor profile helpers ───────────────────────────────────────────────────

const TOBACCO_FLAVOR_TO_WHISKEY_TYPE = {
  'Virginia':          ['Bourbon', 'Single Malt Scotch'],
  'Virginia/Perique':  ['Bourbon', 'Rye'],
  'English':           ['Islay Single Malt', 'Peated Scotch', 'Single Malt Scotch'],
  'English/Balkan':    ['Islay Single Malt', 'Single Malt Scotch'],
  'Aromatic':          ['Bourbon', 'Irish Whiskey', 'Blended Scotch'],
  'Burley':            ['Bourbon', 'Tennessee Whiskey'],
  'Oriental':          ['Single Malt Scotch'],
  'Virginia/Burley':   ['Bourbon', 'Rye'],
  'Virginia/Oriental': ['Single Malt Scotch', 'Bourbon'],
};

const CIGAR_STRENGTH_TO_WHISKEY = {
  'Mild':         ['Irish Whiskey', 'Blended Scotch', 'Bourbon'],
  'Mild-Medium':  ['Bourbon', 'Irish Whiskey'],
  'Medium':       ['Bourbon', 'Rye', 'Single Malt Scotch'],
  'Medium-Full':  ['Bourbon', 'Single Malt Scotch', 'Rye'],
  'Full':         ['Islay Single Malt', 'Rye', 'Bourbon'],
};

function getWhiskeyType(bottle) {
  return bottle.type || bottle.whiskey_type || bottle.spirit_type || '';
}

function getBlendType(blend) {
  return blend.blend_type || blend.blend_family || '';
}

function getCigarStrength(cigar) {
  return cigar.strength || cigar.body || 'Medium';
}

/**
 * Score how well a blend pairs with a bottle.
 * Returns 0–10.
 */
function scoreBlendBottlePairing(blend, bottle) {
  const blendType = getBlendType(blend);
  const whiskeyType = getWhiskeyType(bottle);
  if (!blendType || !whiskeyType) return 3;

  const compatibleTypes = TOBACCO_FLAVOR_TO_WHISKEY_TYPE[blendType] || [];
  if (compatibleTypes.some((t) => whiskeyType.toLowerCase().includes(t.toLowerCase()))) return 8;

  // Partial match
  if (compatibleTypes.some((t) => t.toLowerCase().split(' ').some((w) => whiskeyType.toLowerCase().includes(w)))) return 5;

  return 2;
}

/**
 * Score how well a cigar pairs with a bottle.
 * Returns 0–10.
 */
function scoreCigarBottlePairing(cigar, bottle) {
  const strength = getCigarStrength(cigar);
  const whiskeyType = getWhiskeyType(bottle);
  if (!whiskeyType) return 3;

  const compatibleTypes = CIGAR_STRENGTH_TO_WHISKEY[strength] || ['Bourbon'];
  if (compatibleTypes.some((t) => whiskeyType.toLowerCase().includes(t.toLowerCase()))) return 8;

  return 3;
}

/**
 * Build a rationale string for a pipe + blend + bottle pairing.
 */
function buildPipeBlendBottleRationale(pipe, blend, bottle) {
  const blendType = getBlendType(blend);
  const whiskeyType = getWhiskeyType(bottle);
  const parts = [];
  if (blendType) parts.push(`${blend.name}'s ${blendType} character`);
  if (whiskeyType) parts.push(`pairs naturally with ${bottle.name}'s ${whiskeyType} profile`);
  if (pipe) parts.push(`served in ${pipe.name}`);
  return parts.length ? parts.join(' ') : `${blend.name} + ${bottle.name} — complementary flavors`;
}

/**
 * Build a rationale string for a cigar + bottle pairing.
 */
function buildCigarBottleRationale(cigar, bottle) {
  const strength = getCigarStrength(cigar);
  const whiskeyType = getWhiskeyType(bottle);
  return `${cigar.name}'s ${strength.toLowerCase()} strength complements ${bottle.name}'s ${whiskeyType || 'character'}`;
}

// ─── Pairing diversity ────────────────────────────────────────────────────────

const MS_PER_DAY            = 86_400_000; // milliseconds in one day
const BOTTLE_REUSE_PENALTY  = 3;          // score penalty per additional use of the same bottle
const BOTTLE_REUSE_HARD_CAP = 2;          // a single bottle can appear in at most this many pairings
const MAX_BOTTLES_TO_SCORE  = 20;         // widen search window for diversity
const MIN_PAIRING_SCORE     = 1;          // minimum adjusted score to include a pairing

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Generate pipe + whiskey pairing recommendations.
 */
function generatePipeWhiskeyPairings(pipes, blends, bottles, smokingLogs, bottleUsageCount) {
  if (!pipes.length || !bottles.length || !blends.length) return [];

  // Find most-used blends per pipe
  const pipeBlendCounts = {};
  for (const log of smokingLogs) {
    if (!log.pipe_id || !log.blend_id) continue;
    if (!pipeBlendCounts[log.pipe_id]) pipeBlendCounts[log.pipe_id] = {};
    pipeBlendCounts[log.pipe_id][log.blend_id] = (pipeBlendCounts[log.pipe_id][log.blend_id] || 0) + 1;
  }

  const blendById = Object.fromEntries(blends.map((b) => [b.id, b]));
  const pairingItems = [];

  for (let pipeIdx = 0; pipeIdx < Math.min(pipes.length, 6); pipeIdx++) {
    const pipe = pipes[pipeIdx];
    const blendCounts = pipeBlendCounts[pipe.id] || {};
    const topBlendId = Object.entries(blendCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Fallback blend: cycle through the blend list based on pipe index to avoid always using blends[0]
    const fallbackBlend = blendById[topBlendId] || blends[pipeIdx % blends.length];
    const blend = fallbackBlend;
    if (!blend) continue;

    let bestBottle = null;
    let bestScore = -1;

    for (const bottle of bottles.slice(0, MAX_BOTTLES_TO_SCORE)) {
      // Skip bottles that have hit the hard cap
      if ((bottleUsageCount[bottle.id] || 0) >= BOTTLE_REUSE_HARD_CAP) continue;

      const baseScore = scoreBlendBottlePairing(blend, bottle);
      const penalty   = (bottleUsageCount[bottle.id] || 0) * BOTTLE_REUSE_PENALTY;
      const score     = baseScore - penalty;
      if (score > bestScore) {
        bestScore  = score;
        bestBottle = bottle;
      }
    }

    if (!bestBottle || bestScore < MIN_PAIRING_SCORE) continue;

    bottleUsageCount[bestBottle.id] = (bottleUsageCount[bestBottle.id] || 0) + 1;

    pairingItems.push({
      id:            `pair_pw_${pipe.id}_${bestBottle.id}`,
      pairingMode:   PAIRING_MODE.DIRECT_PAIRING,
      leftItem:      { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' },
      blendBridge:   { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      score:         bestScore,
      rationale:     buildPipeBlendBottleRationale(pipe, blend, bestBottle),
      ownershipStatus: 'owned',
    });
  }

  if (!pairingItems.length) return [];

  return [
    createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'pipe_whiskey_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Pipe & Whiskey Pairings',
      summary:            `${pairingItems.length} pairing suggestion${pairingItems.length > 1 ? 's' : ''} based on your pipes and bottles`,
      whyItMatters:       'Matching blend character with whiskey profile enhances both experiences',
      recommendationText: 'Try these pairings in your next session',
      moduleKey:          MODULE_KEY.MULTI,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'medium',
      items:              pairingItems,
      actionPayload:      { type: 'pairing_suggestions', mode: 'pipe_whiskey' },
    }),
  ];
}

/**
 * Generate thematic "Old Favorites" and "Rediscover" pairing recommendations.
 * These use different selection logic to give different suggestions than the primary pairing.
 */
function generateThematicPairings(pipes, blends, bottles, smokingLogs, bottleUsageCount) {
  if (!pipes.length || !bottles.length || !blends.length) return [];

  // Build blend usage counts across all logs
  const blendUsageCount = {};
  const blendLastUsed   = {};
  const now = Date.now();
  for (const log of smokingLogs) {
    if (!log.blend_id) continue;
    blendUsageCount[log.blend_id] = (blendUsageCount[log.blend_id] || 0) + 1;
    const ts = log.date ? new Date(log.date).getTime() : 0;
    if (!blendLastUsed[log.blend_id] || ts > blendLastUsed[log.blend_id]) {
      blendLastUsed[log.blend_id] = ts;
    }
  }

  const results = [];

  // ── Old Favorites: most-smoked blends with a great bottle match ─────────────
  const topBlends = blends
    .filter((b) => (blendUsageCount[b.id] || 0) > 0)
    .sort((a, b) => (blendUsageCount[b.id] || 0) - (blendUsageCount[a.id] || 0))
    .slice(0, 4);

  const favItems = [];
  for (const blend of topBlends) {
    let best = null;
    let bestScore = -1;
    for (const bottle of bottles.slice(0, MAX_BOTTLES_TO_SCORE)) {
      if ((bottleUsageCount[bottle.id] || 0) >= BOTTLE_REUSE_HARD_CAP) continue;
      const score = scoreBlendBottlePairing(blend, bottle) - (bottleUsageCount[bottle.id] || 0) * BOTTLE_REUSE_PENALTY;
      if (score > bestScore) { bestScore = score; best = bottle; }
    }
    if (!best || bestScore < MIN_PAIRING_SCORE) continue;

    // Find best pipe for this blend from logs
    const pipeBlendCounts = {};
    for (const log of smokingLogs) {
      if (log.blend_id !== blend.id || !log.pipe_id) continue;
      pipeBlendCounts[log.pipe_id] = (pipeBlendCounts[log.pipe_id] || 0) + 1;
    }
    const topPipeId = Object.entries(pipeBlendCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const pipe = pipes.find((p) => p.id === topPipeId) || pipes[0];

    bottleUsageCount[best.id] = (bottleUsageCount[best.id] || 0) + 1;
    favItems.push({
      id:          `pair_fav_${blend.id}_${best.id}`,
      pairingMode: PAIRING_MODE.COLLECTION_MIX_MATCH,
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   buildPipeBlendBottleRationale(pipe, blend, best),
      ownershipStatus: 'owned',
    });
  }

  if (favItems.length > 0) {
    results.push(createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'old_favorites_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Old Favorites',
      summary:            `Your most-smoked blends paired with the best whiskey match`,
      whyItMatters:       'Revisit the blends you know and love with a complementary dram',
      recommendationText: 'A trusted pairing based on your session history',
      moduleKey:          MODULE_KEY.MULTI,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items:              favItems,
      actionPayload:      { type: 'pairing_suggestions', mode: 'old_favorites' },
    }));
  }

  // ── Rediscover: blends with stock but not smoked in 60+ days ────────────────
  const rediscoverBlends = blends
    .filter((b) => {
      if ((b.tin_total_quantity_oz || 0) <= 0) return false;
      const lastUsed = blendLastUsed[b.id];
      if (!lastUsed) return smokingLogs.length > 0; // never used when logs exist
      return (now - lastUsed) / MS_PER_DAY > 60;
    })
    .sort((a, b) => (blendLastUsed[a.id] || 0) - (blendLastUsed[b.id] || 0)) // oldest first
    .slice(0, 3);

  const rediscoverItems = [];
  for (const blend of rediscoverBlends) {
    let best = null;
    let bestScore = -1;
    for (const bottle of bottles.slice(0, MAX_BOTTLES_TO_SCORE)) {
      if ((bottleUsageCount[bottle.id] || 0) >= BOTTLE_REUSE_HARD_CAP) continue;
      const score = scoreBlendBottlePairing(blend, bottle) - (bottleUsageCount[bottle.id] || 0) * BOTTLE_REUSE_PENALTY;
      if (score > bestScore) { bestScore = score; best = bottle; }
    }
    if (!best || bestScore < MIN_PAIRING_SCORE) continue;

    const pipe = pipes[rediscoverItems.length % pipes.length];
    bottleUsageCount[best.id] = (bottleUsageCount[best.id] || 0) + 1;

    const daysAgo = blendLastUsed[blend.id] ? Math.floor((now - blendLastUsed[blend.id]) / MS_PER_DAY) : null;
    rediscoverItems.push({
      id:          `pair_rediscover_${blend.id}_${best.id}`,
      pairingMode: PAIRING_MODE.COLLECTION_MIX_MATCH,
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   daysAgo
        ? `${blend.name} hasn't been smoked in ${daysAgo} days — a great occasion to revisit it alongside ${best.name}`
        : `${blend.name} is waiting in your cellar — ${best.name} would pair well`,
      ownershipStatus: 'owned',
    });
  }

  if (rediscoverItems.length > 0) {
    results.push(createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'rediscover_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Rediscover',
      summary:            `${rediscoverItems.length} cellar blend${rediscoverItems.length > 1 ? 's' : ''} waiting to be revisited`,
      whyItMatters:       'Rotating through overlooked blends keeps your cellar active and your palate fresh',
      recommendationText: 'Give one of these a session tonight',
      moduleKey:          MODULE_KEY.MULTI,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'medium',
      items:              rediscoverItems,
      actionPayload:      { type: 'pairing_suggestions', mode: 'rediscover' },
    }));
  }

  return results;
}

/**
 * Generate cigar + whiskey pairing recommendations.
 */
function generateCigarWhiskeyPairings(cigars, bottles, bottleUsageCount) {
  if (!cigars.length || !bottles.length) return [];

  const pairingItems = [];

  for (const cigar of cigars.slice(0, 6)) {
    let bestBottle = null;
    let bestScore = -1;

    for (const bottle of bottles.slice(0, MAX_BOTTLES_TO_SCORE)) {
      if ((bottleUsageCount[bottle.id] || 0) >= BOTTLE_REUSE_HARD_CAP) continue;
      const baseScore = scoreCigarBottlePairing(cigar, bottle);
      const penalty   = (bottleUsageCount[bottle.id] || 0) * BOTTLE_REUSE_PENALTY;
      const score     = baseScore - penalty;
      if (score > bestScore) {
        bestScore  = score;
        bestBottle = bottle;
      }
    }

    if (!bestBottle || bestScore < MIN_PAIRING_SCORE) continue;

    bottleUsageCount[bestBottle.id] = (bottleUsageCount[bestBottle.id] || 0) + 1;

    pairingItems.push({
      id:            `pair_cw_${cigar.id}_${bestBottle.id}`,
      pairingMode:   PAIRING_MODE.DIRECT_PAIRING,
      leftItem:      { type: 'cigar', id: cigar.id, name: cigar.name, recordType: 'cigar' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      blendBridge:   null,
      score:         bestScore,
      rationale:     buildCigarBottleRationale(cigar, bestBottle),
      ownershipStatus: 'owned',
    });
  }

  if (!pairingItems.length) return [];

  return [
    createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'cigar_whiskey_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Cigar & Whiskey Pairings',
      summary:            `${pairingItems.length} pairing suggestion${pairingItems.length > 1 ? 's' : ''} from your cigars and bottles`,
      whyItMatters:       'Strength and flavor alignment between cigar and whiskey creates a more cohesive experience',
      recommendationText: 'Try these pairings for your next evening session',
      moduleKey:          MODULE_KEY.MULTI,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'medium',
      items:              pairingItems,
      actionPayload:      { type: 'pairing_suggestions', mode: 'cigar_whiskey' },
    }),
  ];
}

// ─── Preference filtering helpers ─────────────────────────────────────────────

/**
 * Build a set of disliked blend types and whiskey types from user preferences.
 * Preference input is derived from the tasteProfile (preferred types = liked; inverse inference).
 */
function buildPreferenceContext(preferences = null) {
  if (!preferences) return { dislikedBlendTypes: new Set(), dislikedWhiskeyTypes: new Set() };

  // Treat very low-rated blend/whiskey types as disliked (avg rating < 2.5)
  const dislikedBlendTypes  = new Set(preferences.disliked_blend_types  || []);
  const dislikedWhiskeyTypes = new Set(preferences.disliked_whiskey_types || []);

  return { dislikedBlendTypes, dislikedWhiskeyTypes };
}

function isBlendAcceptable(blend, dislikedBlendTypes) {
  if (!dislikedBlendTypes.size) return true;
  const type = getBlendType(blend);
  return !type || !dislikedBlendTypes.has(type);
}

function isBottleAcceptable(bottle, dislikedWhiskeyTypes) {
  if (!dislikedWhiskeyTypes.size) return true;
  const type = getWhiskeyType(bottle);
  return !type || !dislikedWhiskeyTypes.has(type);
}

// ─── Something New pairings ───────────────────────────────────────────────────

/**
 * Generate "Something New" pairing suggestions — blends or pipes the user hasn't tried
 * much, paired with a well-matched bottle.
 */
function generateSomethingNewPairings(pipes, blends, bottles, smokingLogs, bottleUsageCount, prefCtx) {
  if (!pipes.length || !bottles.length || !blends.length) return [];

  const blendUsageCount = {};
  for (const log of smokingLogs) {
    if (log.blend_id) blendUsageCount[log.blend_id] = (blendUsageCount[log.blend_id] || 0) + 1;
  }

  // Blends with little or no usage — "try these"
  const novelBlends = blends
    .filter((b) => {
      if (!isBlendAcceptable(b, prefCtx.dislikedBlendTypes)) return false;
      const usage = blendUsageCount[b.id] || 0;
      return usage <= 1; // never or rarely smoked
    })
    .sort((a, b) => (blendUsageCount[a.id] || 0) - (blendUsageCount[b.id] || 0))
    .slice(0, 4);

  if (!novelBlends.length) return [];

  const newItems = [];
  for (const blend of novelBlends) {
    let best = null;
    let bestScore = -1;

    for (const bottle of bottles.slice(0, MAX_BOTTLES_TO_SCORE)) {
      if (!isBottleAcceptable(bottle, prefCtx.dislikedWhiskeyTypes)) continue;
      if ((bottleUsageCount[bottle.id] || 0) >= BOTTLE_REUSE_HARD_CAP) continue;
      const score = scoreBlendBottlePairing(blend, bottle) - (bottleUsageCount[bottle.id] || 0) * BOTTLE_REUSE_PENALTY;
      if (score > bestScore) { bestScore = score; best = bottle; }
    }
    if (!best || bestScore < MIN_PAIRING_SCORE) continue;

    const pipe = pipes[newItems.length % pipes.length];
    bottleUsageCount[best.id] = (bottleUsageCount[best.id] || 0) + 1;

    newItems.push({
      id:          `pair_new_${blend.id}_${best.id}`,
      pairingMode: PAIRING_MODE.COLLECTION_MIX_MATCH,
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   `Expand your palate — ${blend.name} is a ${getBlendType(blend) || 'blend'} you haven't explored much yet`,
      ownershipStatus: 'owned',
    });
  }

  if (!newItems.length) return [];

  return [createRecommendation({
    category:           CATEGORY.PAIRING,
    goal:               'something_new_pairing',
    actionType:         ACTION_TYPE.ADVISORY,
    title:              'Something New',
    summary:            `${newItems.length} pairing${newItems.length > 1 ? 's' : ''} using blends you haven't explored yet`,
    whyItMatters:       'Expanding into less-used blends broadens your palate and makes full use of your collection',
    recommendationText: 'Try something outside your usual rotation',
    moduleKey:          MODULE_KEY.MULTI,
    ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
    priority:           PRIORITY.LOW,
    confidence:         'medium',
    items:              newItems,
    actionPayload:      { type: 'pairing_suggestions', mode: 'something_new' },
  })];
}

/**
 * Main pairing engine entry point.
 *
 * @param {object} context - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, preferences }
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generatePairingRecommendations(context = {}) {
  const {
    pipes = [],
    blends = [],
    bottles = [],
    cigars = [],
    smokingLogs = [],
    preferences = null,
  } = context;

  const prefCtx = buildPreferenceContext(preferences);

  // Apply preference filtering to source data
  const acceptableBlends  = blends.filter((b)  => isBlendAcceptable(b,  prefCtx.dislikedBlendTypes));
  const acceptableBottles = bottles.filter((b) => isBottleAcceptable(b, prefCtx.dislikedWhiskeyTypes));

  const results = [];
  // Shared bottle usage count — ensures diversity across all pairing types
  const bottleUsageCount = {};

  if (pipes.length > 0 && acceptableBlends.length > 0 && acceptableBottles.length > 0) {
    results.push(...generatePipeWhiskeyPairings(pipes, acceptableBlends, acceptableBottles, smokingLogs, bottleUsageCount));
  }

  if (cigars.length > 0 && acceptableBottles.length > 0) {
    results.push(...generateCigarWhiskeyPairings(cigars, acceptableBottles, bottleUsageCount));
  }

  // Thematic pairings — Old Favorites and Rediscover use different selection logic
  if (pipes.length > 0 && acceptableBlends.length > 0 && acceptableBottles.length > 0 && smokingLogs.length > 0) {
    results.push(...generateThematicPairings(pipes, acceptableBlends, acceptableBottles, smokingLogs, bottleUsageCount));
  }

  // Something New — unexplored blends paired with suitable bottles
  if (pipes.length > 0 && blends.length > 0 && acceptableBottles.length > 0) {
    results.push(...generateSomethingNewPairings(pipes, blends, acceptableBottles, smokingLogs, bottleUsageCount, prefCtx));
  }

  return results;
}
