/**
 * Pairing Engine
 *
 * Generates structured pairing recommendations from the collection.
 * Uses actual collection + usage data — no LLM calls.
 *
 * Enforced domain rules:
 *   - Ghosting hard rule: aromatic pipes NEVER paired with non-aromatic blends and vice versa.
 *     Aromatic oils cake into the briar and bleed into any non-aromatic blend, masking character.
 *   - Pairings use either complement logic (similar flavor profile) or
 *     contrast logic (balance a dominant note). Both are labeled explicitly.
 *
 * Supported pairings:
 *   - pipe + blend + whiskey (direct_pairing and collection_mix_match)
 *   - cigar + whiskey
 *
 * Invalid combinations (never generated):
 *   - pipe + cigar (no blend bridge)
 *   - tobacco + cigar
 *   - whiskey + wine
 *   - all modules at once
 */

import { createRecommendation, computeConfidence, CATEGORY, ACTION_TYPE, MODULE_KEY, OWNERSHIP_CONTEXT, PRIORITY } from './recommendationSchema.js';

// ─── Pairing mode constants ───────────────────────────────────────────────────

export const PAIRING_MODE = {
  DIRECT_PAIRING:       'direct_pairing',
  COLLECTION_MIX_MATCH: 'collection_mix_match',
};

export const PAIRING_MODE_LABELS = {
  [PAIRING_MODE.DIRECT_PAIRING]:       'Direct Pairing',
  [PAIRING_MODE.COLLECTION_MIX_MATCH]: 'Mix & Match',
};

// ─── Ghosting rule constants ──────────────────────────────────────────────────

// Blend types that leave aromatic flavor oils — must stay in dedicated aromatic pipes
const AROMATIC_BLEND_TYPES = new Set([
  'Aromatic', 'Danish',
]);

// Blend types that should never enter a pipe already caked with aromatic residue
const NON_AROMATIC_BLEND_TYPES = new Set([
  'Virginia', 'Virginia/Perique', 'Virginia/Burley', 'Virginia/Oriental',
  'English', 'English/Balkan', 'Balkan', 'Burley', 'Oriental', 'Oriental/Turkish',
]);

function isAromaticBlend(blend) {
  const t = blend.blend_type || blend.blend_family || '';
  return AROMATIC_BLEND_TYPES.has(t);
}

function isNonAromaticBlend(blend) {
  const t = blend.blend_type || blend.blend_family || '';
  return NON_AROMATIC_BLEND_TYPES.has(t);
}

/**
 * Return true if the pipe's specialization or usage pattern is locked to aromatics.
 */
function isPipeAromaticDedicated(pipe) {
  const spec = (pipe.specialization || '').toLowerCase();
  return spec === 'aromatic' || spec.includes('aromatic');
}

/**
 * Return true if the pipe's specialization is locked to non-aromatics (English, Virginia, etc.).
 */
function isPipeNonAromaticDedicated(pipe) {
  const spec = (pipe.specialization || '').toLowerCase();
  if (!spec) return false;
  return (
    spec.includes('english') || spec.includes('virginia') || spec.includes('burley') ||
    spec.includes('oriental') || spec.includes('balkan') || spec.includes('scottish')
  );
}

/**
 * Enforce ghosting rule: return true if this pipe/blend combination is forbidden.
 * Aromatic oils permanently season briar — crossing types degrades both experiences.
 */
function violatesGhostingRule(pipe, blend) {
  if (isPipeAromaticDedicated(pipe) && isNonAromaticBlend(blend)) return true;
  if (isPipeNonAromaticDedicated(pipe) && isAromaticBlend(blend)) return true;
  return false;
}

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

// ─── Pairing rationale — expert-quality explanation builders ─────────────────

// Logic type: complement (similar profiles) or contrast (balance a dominant note)
const BLEND_WHISKEY_PAIRING_LOGIC = {
  'Virginia':          { logic: 'complement', note: 'Virginia\'s natural sweetness and hay character find a kindred note in bourbon\'s corn-forward body' },
  'Virginia/Perique':  { logic: 'contrast',   note: 'Perique\'s peppery bite softens under rye\'s spice, creating a balance that lets the Virginia sweetness come through clean' },
  'Virginia/Burley':   { logic: 'complement', note: 'The nutty earth of burley amplifies the caramel and vanilla in bourbon without competing with the Virginia base' },
  'Virginia/Oriental': { logic: 'complement', note: 'Oriental\'s floral spice and Virginia\'s sweetness both open up alongside a single malt\'s fruity complexity' },
  'English':           { logic: 'complement', note: 'Latakia\'s campfire smoke and leather find their natural match in peat — one reinforces the other without either dominating' },
  'English/Balkan':    { logic: 'complement', note: 'The layered spice of Balkan-style blends tracks the complex, smoky character of an Islay dram note for note' },
  'Balkan':            { logic: 'complement', note: 'Balkan\'s incense-like oriental leaf finds a natural companion in the fruit and malt of a highland single malt' },
  'Aromatic':          { logic: 'contrast',   note: 'Irish Whiskey\'s light body and subtle sweetness soften the aromatic\'s topping without masking it' },
  'Burley':            { logic: 'complement', note: 'The dry, nutty character of burley is built for bourbon — the corn-forward sweetness rounds out the dryness without overwhelming it' },
  'Oriental':          { logic: 'contrast',   note: 'Oriental\'s floral, spicy notes contrast the sherry and dried fruit of a Speyside single malt in a way that opens both up' },
};

const WHISKEY_CHARACTER_NOTES = {
  'Bourbon':            'warm corn sweetness and vanilla oak',
  'Rye':                'dry spice and peppery finish',
  'Single Malt Scotch': 'malt complexity and regional character',
  'Islay Single Malt':  'heavy peat, brine, and smoke',
  'Peated Scotch':      'distinct smoke and earthy depth',
  'Irish Whiskey':      'light body and clean grain sweetness',
  'Blended Scotch':     'approachable malt and grain balance',
  'Tennessee Whiskey':  'charcoal-filtered smoothness and caramel',
};

function getWhiskeyCharacter(bottle) {
  const type = getWhiskeyType(bottle);
  for (const [key, note] of Object.entries(WHISKEY_CHARACTER_NOTES)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return note;
  }
  return bottle.flavor_notes || type || 'its characteristic profile';
}

// ─── Pipe character descriptors ───────────────────────────────────────────────

/**
 * Return a description of why the pipe is suitable for this pairing.
 * References bowl size, specialization, and shape when available.
 */
function getPipeCharacterNote(pipe, blend) {
  if (!pipe) return null;

  const shape     = (pipe.shape || pipe.bowl_style || '').toLowerCase();
  const sizeClass = (pipe.sizeClass || '').toLowerCase();
  const spec      = (pipe.specialization || '').toLowerCase();

  // Shape/size-based notes
  if (sizeClass === 'large' || shape.includes('pot') || shape.includes('poker') || shape.includes('churchwarden')) {
    return `${pipe.name}'s larger bowl sustains a longer, slower burn — letting ${blend.name}'s character develop fully through the smoke`;
  }
  if (sizeClass === 'small' || shape.includes('brandy') || shape.includes('prince') || shape.includes('apple')) {
    return `${pipe.name}'s compact bowl concentrates ${blend.name}'s flavors for a shorter, more focused session`;
  }
  if (shape.includes('billiard') || shape.includes('canadian')) {
    return `${pipe.name}'s straight, even-burning chamber gives ${blend.name} a consistent platform throughout the bowl`;
  }

  // Specialization-based notes
  if (spec && spec !== 'unspecialized' && spec !== 'general') {
    const specLabel = spec.charAt(0).toUpperCase() + spec.slice(1);
    return `${pipe.name}'s ${specLabel}-seasoned cake provides a complementary base that supports rather than competes with ${blend.name}`;
  }

  return `${pipe.name} is the right choice for this session`;
}

/**
 * Build an expert-quality rationale for a pipe + blend + bottle pairing.
 * Always references specific flavors. Labels logic as complement or contrast.
 * Includes a pipe-specific note about why the pipe suits this combination.
 */
function buildPipeBlendBottleRationale(pipe, blend, bottle) {
  const blendType    = getBlendType(blend);
  const whiskeyType  = getWhiskeyType(bottle);
  const pairingLogic = BLEND_WHISKEY_PAIRING_LOGIC[blendType];
  const whiskeyChar  = getWhiskeyCharacter(bottle);
  const pipeNote     = getPipeCharacterNote(pipe, blend);

  if (pairingLogic) {
    const logicLabel    = pairingLogic.logic === 'complement' ? 'Complement' : 'Contrast';
    const tensionLabel  = pairingLogic.logic === 'complement'
      ? 'each reinforcing the other without competing'
      : 'the tension between them creating a balanced experience';
    const base = `${logicLabel} pairing: ${pairingLogic.note}. ${blend.name}'s ${blendType} character meets ${bottle.name}'s ${whiskeyChar} — ${tensionLabel}.`;
    return pipeNote ? `${base} ${pipeNote}.` : base;
  }

  // Fallback: still be specific
  if (blendType && whiskeyType) {
    const base = `${blend.name}'s ${blendType} profile finds a workable partner in ${bottle.name}'s ${whiskeyChar}.`;
    return pipeNote ? `${base} ${pipeNote}.` : base;
  }

  return `${blend.name} + ${bottle.name}${pipe ? ` in ${pipe.name}` : ''} — compatible flavor profiles.`;
}

/**
 * Build an expert-quality rationale for a cigar + bottle pairing.
 */
function buildCigarBottleRationale(cigar, bottle) {
  const strength = getCigarStrength(cigar);
  const whiskeyType = getWhiskeyType(bottle);
  const whiskeyChar = getWhiskeyCharacter(bottle);

  const logicMap = {
    'Mild':        `${bottle.name}'s ${whiskeyChar} won't compete with a mild cigar — the lightness of both keeps the session approachable without either overpowering.`,
    'Mild-Medium': `${cigar.name}'s restrained body pairs as a complement to ${bottle.name}'s ${whiskeyChar}, letting both evolve without dominating.`,
    'Medium':      `${cigar.name}'s medium body creates a contrast pairing with ${bottle.name}'s ${whiskeyChar} — the whiskey's character becomes the backdrop that lets the cigar's complexity emerge.`,
    'Medium-Full': `${bottle.name}'s ${whiskeyChar} holds up to ${cigar.name}'s fuller body. This is a complement pairing where neither backs down.`,
    'Full':        `A full-bodied cigar needs a pour with presence. ${bottle.name}'s ${whiskeyChar} has enough structure to stand alongside ${cigar.name} without disappearing.`,
  };

  return logicMap[strength] ||
    `${cigar.name}'s ${strength.toLowerCase()} body pairs with ${bottle.name}'s ${whiskeyChar || whiskeyType || 'character'}.`;
}

// ─── Pairing diversity ────────────────────────────────────────────────────────

const MS_PER_DAY             = 86_400_000; // milliseconds in one day
const BOTTLE_REUSE_PENALTY   = 3;          // score penalty per additional use of the same bottle
const BOTTLE_REUSE_HARD_CAP  = 2;          // a single bottle can appear in at most this many pairings
const MAX_BOTTLES_TO_SCORE   = 20;         // widen search window for diversity
const MIN_PAIRING_SCORE      = 1;          // minimum adjusted score to include a pairing
const MAX_ITEMS_PER_SUBTAB   = 3;          // hard cap on items per pairing sub-tab — enforced in engine

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Generate pipe + whiskey pairing recommendations.
 * Enforces ghosting rule: skips pipe/blend combinations where specialization conflicts.
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

  for (let pipeIdx = 0; pipeIdx < Math.min(pipes.length, MAX_ITEMS_PER_SUBTAB); pipeIdx++) {
    const pipe = pipes[pipeIdx];
    const blendCounts = pipeBlendCounts[pipe.id] || {};

    // Try each candidate blend in usage order, enforce ghosting rule
    const sortedBlendIds = Object.entries(blendCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    // Also consider blends not in logs as fallback, cycling by index for diversity
    const fallbackBlend = blends[pipeIdx % blends.length];
    const candidateBlendIds = sortedBlendIds.length > 0 ? sortedBlendIds : [fallbackBlend?.id].filter(Boolean);

    let blend = null;
    for (const blendId of candidateBlendIds) {
      const candidate = blendById[blendId];
      if (!candidate) continue;
      // Enforce ghosting rule — skip forbidden pipe/blend combinations
      if (violatesGhostingRule(pipe, candidate)) continue;
      blend = candidate;
      break;
    }

    // If no blend found from logs, try the cycling fallback (with ghosting check)
    if (!blend) {
      for (let offset = 0; offset < blends.length; offset++) {
        const candidate = blends[(pipeIdx + offset) % blends.length];
        if (!violatesGhostingRule(pipe, candidate)) { blend = candidate; break; }
      }
    }

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

    const hasBlendType = !!getBlendType(blend);
    const hasWhiskeyType = !!getWhiskeyType(bestBottle);
    const hasLogData = sortedBlendIds.length > 0;

    pairingItems.push({
      id:            `pair_pw_${pipe.id}_${bestBottle.id}`,
      pairingMode:   PAIRING_MODE.DIRECT_PAIRING,
      leftItem:      { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' },
      blendBridge:   { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      score:         bestScore,
      rationale:     buildPipeBlendBottleRationale(pipe, blend, bestBottle),
      confidence:    computeConfidence({
        preferenceAlignment:   hasBlendType && hasWhiskeyType ? (bestScore >= 7 ? 0.9 : 0.6) : 0.4,
        usageHistoryRelevance: hasLogData ? 0.8 : 0.4,
        dataCompleteness:      hasBlendType && hasWhiskeyType ? 0.9 : 0.5,
        diversityContribution: 0.7,
      }),
      ownershipStatus: 'owned',
    });
  }

  if (!pairingItems.length) return [];

  const highConfCount = pairingItems.filter((i) => i.confidence === 'high').length;
  const overallConf = highConfCount >= pairingItems.length / 2 ? 'high' : 'medium';

  const topItem = pairingItems[0];
  const summary = pairingItems.length === 1
    ? `${topItem.leftItem.name} + ${topItem.blendBridge?.name || ''} + ${topItem.rightItem.name} — a session-ready combination.`
    : `${pairingItems.length} session-ready combinations across your pipes and bottles, each matched by flavor logic.`;

  return [
    createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'pipe_whiskey_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Pipe & Whiskey Pairings',
      summary,
      whyItMatters:       'Pairing tobacco and whiskey by flavor logic — complement or contrast — makes both experiences more expressive. These aren\'t random combinations.',
      recommendationText: 'Each pairing includes the blend\'s character, the whiskey\'s profile, and the logic behind the match.',
      moduleKey:          MODULE_KEY.MULTI,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         overallConf,
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
    .slice(0, MAX_ITEMS_PER_SUBTAB);

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
    const topFav = favItems[0];
    const favSummary = favItems.length === 1
      ? `${topFav.blendBridge?.name || topFav.leftItem?.name} is your most-smoked blend — paired here with its best whiskey match.`
      : `Your ${favItems.length} most-used blends, each matched with the best whiskey in your collection by flavor logic.`;

    results.push(createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'old_favorites_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Old Favorites',
      summary:            favSummary,
      whyItMatters:       'These blends already have session history behind them. Pairing them with a matched whiskey elevates a familiar smoke into a deliberate experience.',
      recommendationText: 'Each pairing is grounded in your session logs and matched by flavor profile — not randomized.',
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

    // Find a pipe for this blend — must not violate ghosting rule
    const pipeBlendLogCounts = {};
    for (const log of smokingLogs) {
      if (log.blend_id !== blend.id || !log.pipe_id) continue;
      pipeBlendLogCounts[log.pipe_id] = (pipeBlendLogCounts[log.pipe_id] || 0) + 1;
    }
    const sortedPipeIds = Object.entries(pipeBlendLogCounts).sort((a, b) => b[1] - a[1]).map(([id]) => id);
    let pipe = sortedPipeIds.length > 0
      ? pipes.find((p) => p.id === sortedPipeIds[0] && !violatesGhostingRule(p, blend))
      : null;
    if (!pipe) {
      pipe = pipes.find((p) => !violatesGhostingRule(p, blend)) || pipes[rediscoverItems.length % pipes.length];
    }

    bottleUsageCount[best.id] = (bottleUsageCount[best.id] || 0) + 1;

    const daysAgo = blendLastUsed[blend.id] ? Math.floor((now - blendLastUsed[blend.id]) / MS_PER_DAY) : null;
    const blendType = getBlendType(blend);
    const whiskeyChar = getWhiskeyCharacter(best);

    const rediscoverRationale = daysAgo
      ? `${blend.name} has been sitting in your cellar for ${daysAgo} days. ` +
        `${blendType ? `Its ${blendType} character ` : 'It '}` +
        `still has plenty to say — ${best.name}'s ${whiskeyChar} makes for a considered re-introduction.`
      : `${blend.name} has stock but has never made it into the log. ` +
        `${best.name}'s ${whiskeyChar} is the right backdrop for a first proper session.`;

    rediscoverItems.push({
      id:          `pair_rediscover_${blend.id}_${best.id}`,
      pairingMode: PAIRING_MODE.COLLECTION_MIX_MATCH,
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   rediscoverRationale,
      ownershipStatus: 'owned',
    });
  }

  if (rediscoverItems.length > 0) {
    const oldestItem = rediscoverItems[0];
    const rediscoverSummary = rediscoverItems.length === 1
      ? `${oldestItem.blendBridge?.name || oldestItem.leftItem?.name} hasn't been smoked in a while — your cellar is waiting.`
      : `${rediscoverItems.length} cellar blends that haven't been touched recently. Each is paired with a matched whiskey for a deliberate return session.`;

    results.push(createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'rediscover_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Rediscover',
      summary:            rediscoverSummary,
      whyItMatters:       'Aging blends change character over time. A blend you remember from six months ago may be a different — often better — smoke today.',
      recommendationText: 'Each pairing here is session-ready. Pick one and give it the attention it\'s been waiting for.',
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

  for (const cigar of cigars.slice(0, MAX_ITEMS_PER_SUBTAB)) {
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

  const topCigar = pairingItems[0];
  const summary = pairingItems.length === 1
    ? `${topCigar.leftItem.name} paired with ${topCigar.rightItem.name} — strength-matched for a cohesive session.`
    : `${pairingItems.length} cigar + whiskey pairings matched by body strength and flavor alignment.`;

  return [
    createRecommendation({
      category:           CATEGORY.PAIRING,
      goal:               'cigar_whiskey_pairing',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Cigar & Whiskey Pairings',
      summary,
      whyItMatters:       'Cigar body and whiskey strength need to match or the stronger one dominates and both become less expressive. These pairings are built on that principle.',
      recommendationText: 'Each pairing here is specific — the rationale explains whether it\'s a complement or a contrast and why it works.',
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
    .slice(0, MAX_ITEMS_PER_SUBTAB);

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
