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

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Generate pipe + whiskey pairing recommendations.
 */
function generatePipeWhiskeyPairings(pipes, blends, bottles, smokingLogs) {
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

  for (const pipe of pipes.slice(0, 6)) {
    const blendCounts = pipeBlendCounts[pipe.id] || {};
    const topBlendId = Object.entries(blendCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const blend = topBlendId ? blendById[topBlendId] : blends[0];
    if (!blend) continue;

    let bestBottle = null;
    let bestScore = -1;

    for (const bottle of bottles.slice(0, 10)) {
      const score = scoreBlendBottlePairing(blend, bottle);
      if (score > bestScore) {
        bestScore = score;
        bestBottle = bottle;
      }
    }

    if (!bestBottle || bestScore < 3) continue;

    pairingItems.push({
      id:            `pair_pw_${pipe.id}_${bestBottle.id}`,
      pairingMode:   PAIRING_MODE.DIRECT_PAIRING,
      leftItem:      { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      blendBridge:   blend ? { type: 'blend', id: blend.id, name: blend.name } : null,
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
 * Generate cigar + whiskey pairing recommendations.
 */
function generateCigarWhiskeyPairings(cigars, bottles) {
  if (!cigars.length || !bottles.length) return [];

  const pairingItems = [];

  for (const cigar of cigars.slice(0, 6)) {
    let bestBottle = null;
    let bestScore = -1;

    for (const bottle of bottles.slice(0, 10)) {
      const score = scoreCigarBottlePairing(cigar, bottle);
      if (score > bestScore) {
        bestScore = score;
        bestBottle = bottle;
      }
    }

    if (!bestBottle || bestScore < 3) continue;

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

/**
 * Main pairing engine entry point.
 *
 * @param {object} context - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs }
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generatePairingRecommendations(context = {}) {
  const {
    pipes = [],
    blends = [],
    bottles = [],
    cigars = [],
    smokingLogs = [],
  } = context;

  const results = [];

  if (pipes.length > 0 && blends.length > 0 && bottles.length > 0) {
    results.push(...generatePipeWhiskeyPairings(pipes, blends, bottles, smokingLogs));
  }

  if (cigars.length > 0 && bottles.length > 0) {
    results.push(...generateCigarWhiskeyPairings(cigars, bottles));
  }

  return results;
}
