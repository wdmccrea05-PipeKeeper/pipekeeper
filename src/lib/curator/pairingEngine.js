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
import { filterAiEligibleItems } from '../../platform/aiEligibility.js';

// ─── Pairing mode constants ───────────────────────────────────────────────────

export const PAIRING_MODE = {
  DIRECT_PAIRING:       'direct_pairing',
  COLLECTION_MIX_MATCH: 'collection_mix_match',
};

export const PAIRING_MODE_LABELS = {
  [PAIRING_MODE.DIRECT_PAIRING]:       'Direct Pairing',
  [PAIRING_MODE.COLLECTION_MIX_MATCH]: 'Mix & Match',
};

// ─── Pairing type labels ─────────────────────────────────────────────────────
export const PAIRING_TYPE = {
  COMPLEMENTARY: 'complementary',
  CONTRAST:      'contrast',
  AMPLIFICATION: 'amplification',
  EXPERIMENTAL:  'experimental',
};

export const PAIRING_TYPE_LABELS = {
  complementary: 'Complementary',
  contrast:      'Contrast',
  amplification: 'Amplification',
  experimental:  'Experimental',
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
 * Return a structured pipe description covering chamber, shape, and smoking behavior.
 * Returns { shortNote, whyNote } — both strings, never null.
 */
function getPipeCharacterNote(pipe, blend) {
  if (!pipe) return { shortNote: null, whyNote: null };

  const shape     = (pipe.shape || pipe.bowl_style || '').toLowerCase();
  const sizeClass = (pipe.sizeClass || '').toLowerCase();
  const spec      = (pipe.specialization || '').toLowerCase();
  const name      = pipe.name || 'This pipe';

  // Large / slow-burning shapes
  if (sizeClass === 'large' || shape.includes('pot') || shape.includes('poker') || shape.includes('churchwarden')) {
    return {
      shortNote: `${name}'s generous bowl sustains a slow, even burn`,
      whyNote:   `${name}'s larger chamber gives ${blend?.name || 'this blend'} room to open up gradually, preventing the rapid heat spikes that compress flavor in smaller bowls — ideal for a contemplative session.`,
    };
  }
  // Small / focused shapes
  if (sizeClass === 'small' || shape.includes('brandy') || shape.includes('prince') || shape.includes('apple')) {
    return {
      shortNote: `${name}'s compact bowl concentrates ${blend?.name || 'the blend'} into a shorter, more intense smoke`,
      whyNote:   `The tighter chamber of ${name} brings flavors forward quickly, making it suited for shorter sittings where you want immediate character rather than a long development arc.`,
    };
  }
  // Billiard / Canadian — the workhorse shape
  if (shape.includes('billiard') || shape.includes('canadian')) {
    return {
      shortNote: `${name}'s straight, even-burning billiard chamber delivers consistent smoke throughout`,
      whyNote:   `A billiard's straight draft means even airflow from top to bottom — ${blend?.name || 'this blend'} will smoke at the same character from light to dottle, making this shape the reliable benchmark.`,
    };
  }
  // Bent shapes
  if (shape.includes('bent') || shape.includes('calabash')) {
    return {
      shortNote: `${name}'s bent design keeps smoke cool over a longer session`,
      whyNote:   `The longer airpath of ${name} drops smoke temperature before it reaches the palate, softening any harshness and letting delicate flavor notes in ${blend?.name || 'this blend'} stay clear.`,
    };
  }
  // Specialization-based
  if (spec && spec !== 'unspecialized' && spec !== 'general') {
    const specLabel = spec.charAt(0).toUpperCase() + spec.slice(1);
    return {
      shortNote: `${name}'s ${specLabel}-seasoned cake reinforces rather than competes with this blend`,
      whyNote:   `${name} has been dedicated to ${specLabel} blends — the residual cake character in its walls is conditioned to support exactly this flavor profile, not undercut it.`,
    };
  }

  return {
    shortNote: `${name} is well-suited to this blend`,
    whyNote:   `${name}'s seasoned chamber provides a neutral backdrop, letting ${blend?.name || 'the blend'}'s own character drive the session.`,
  };
}

/**
 * Build an expert-quality, multi-dimensional rationale for a pipe + blend + bottle pairing.
 *
 * Covers all 5 required dimensions:
 *   1. Pipe logic    — chamber / shape / smoking behavior
 *   2. Blend logic   — flavor profile, body, role in the pairing
 *   3. Pour logic    — sweetness / spice / proof / finish / smoke / oak / texture
 *   4. Interaction   — complement or contrast, how flavors work together
 *   5. Session feel  — what the combined experience is like
 */
function buildPipeBlendBottleRationale(pipe, blend, bottle) {
  const blendType    = getBlendType(blend);
  const whiskeyType  = getWhiskeyType(bottle);
  const pairingLogic = BLEND_WHISKEY_PAIRING_LOGIC[blendType];
  const whiskeyChar  = getWhiskeyCharacter(bottle);
  const { shortNote: pipeShort, whyNote: pipeWhy } = getPipeCharacterNote(pipe, blend);

  const blendName   = blend?.name   || 'This blend';
  const bottleName  = bottle?.name  || 'This pour';

  if (pairingLogic) {
    const isComplement = pairingLogic.logic === 'complement';
    const interactionLabel = isComplement
      ? 'each reinforcing the other without either dominating'
      : 'the contrast sharpening both rather than softening either';
    const sessionFeel = isComplement
      ? 'The session stays cohesive from light to finish — neither the tobacco nor the pour pulls ahead.'
      : 'Expect a dynamic session where each sip resets the palate and each draw reclaims the room.';

    const parts = [];
    // Blend logic
    parts.push(`${blendName}'s ${blendType} character brings ${getBlendFlavorNote(blendType)} to the bowl.`);
    // Pour logic
    parts.push(`${bottleName} delivers ${whiskeyChar}.`);
    // Interaction logic
    parts.push(`${pairingLogic.note} — ${interactionLabel}.`);
    // Pipe logic
    if (pipeShort) parts.push(pipeShort + '.');
    // Session feel
    parts.push(sessionFeel);

    return parts.join(' ');
  }

  // Fallback: still be specific when we have data
  if (blendType && whiskeyType) {
    const parts = [
      `${blendName}'s ${blendType} profile — ${getBlendFlavorNote(blendType)} — finds a workable partner in ${bottleName}'s ${whiskeyChar}.`,
    ];
    if (pipeShort) parts.push(pipeShort + '.');
    return parts.join(' ');
  }

  return `${blendName} + ${bottleName}${pipe ? ` in ${pipe.name}` : ''} — compatible flavor profiles matched from your collection.`;
}

/**
 * Return a short, specific flavor descriptor for a blend type.
 */
function getBlendFlavorNote(blendType) {
  const notes = {
    'Virginia':          'natural sweetness, hay, and sometimes citrus or stone-fruit notes',
    'Virginia/Perique':  'Virginia sweetness cut by Perique\'s plum, fig, and black pepper complexity',
    'Virginia/Burley':   'a dry, nutty backbone balancing Virginia\'s natural sweetness',
    'Virginia/Oriental': 'floral spice and fruity complexity layered over Virginia\'s base',
    'English':           'Latakia smoke, leather, and earthy depth',
    'English/Balkan':    'layered Oriental spice, Latakia smoke, and complex incense character',
    'Balkan':            'incense-like Oriental leaf, toasted bread, and dried fruit',
    'Aromatic':          'cased sweetness, room note, and smooth accessibility',
    'Burley':            'dry nuttiness, cocoa bitterness, and earthy body',
    'Oriental':          'floral, slightly spicy, and exotic dried-leaf complexity',
  };
  return notes[blendType] || `${blendType} character`;
}

/**
 * Build an expert-quality rationale for a cigar + bottle pairing.
 * Covers blend strength, whiskey character, interaction logic, and session feel.
 */
function buildCigarBottleRationale(cigar, bottle) {
  const strength    = getCigarStrength(cigar);
  const whiskeyChar = getWhiskeyCharacter(bottle);
  const wrapper     = cigar.wrapper ? ` ${cigar.wrapper}-wrapped` : '';
  const cigarName   = cigar.name   || 'This cigar';
  const bottleName  = bottle.name  || 'This pour';

  const logicMap = {
    'Mild': (
      `${cigarName}'s${wrapper} mild body — delicate, often creamy with light cedar notes — finds an ideal companion in ${bottleName}'s ${whiskeyChar}. ` +
      `Neither overpowers the other; the pour's lighter frame lets the cigar's subtleties come forward. ` +
      `This is a complement pairing: approachable, cohesive, and well-suited to a relaxed session.`
    ),
    'Mild-Medium': (
      `${cigarName} sits in the mild-to-medium range — enough character to be interesting without the weight to demand a bold pour. ` +
      `${bottleName}'s ${whiskeyChar} meets it as a complement: similar in intensity, letting both develop across the smoke without either flattening out.`
    ),
    'Medium': (
      `${cigarName}'s medium body — likely earthy, woody, and with some spice in the transition — creates a contrast pairing with ${bottleName}'s ${whiskeyChar}. ` +
      `The whiskey's sweetness becomes the backdrop that lets the cigar's complexity come through in relief. ` +
      `Each sip resets the palate slightly, making the draw that follows feel more defined.`
    ),
    'Medium-Full': (
      `${cigarName} has enough presence — pepper, leather, and woody depth — to need a pour that won't disappear behind it. ` +
      `${bottleName}'s ${whiskeyChar} holds up without competing, making this a complement pairing where both deliver at full expression.`
    ),
    'Full': (
      `A full-bodied cigar like ${cigarName}${wrapper} needs a pour with genuine structure — anything lighter gets buried. ` +
      `${bottleName}'s ${whiskeyChar} has enough weight and finish length to stand alongside it. ` +
      `This isn't a subtle session — both elements are bold, and the pairing rewards that.`
    ),
  };

  return logicMap[strength] ||
    `${cigarName}'s ${strength.toLowerCase()} body is matched to ${bottleName}'s ${whiskeyChar || whiskeyChar || 'character'} for a session where both elements contribute equally.`;
}

/**
 * Return 'complement' | 'contrast' | null for a blend/bottle pairing.
 * Used to add the pairingType structured field to pairing items.
 */
function getPairingType(blend, bottle) {
  const blendType = getBlendType(blend);
  const logic = BLEND_WHISKEY_PAIRING_LOGIC[blendType];
  return logic ? logic.logic : null;
}

/**
 * Build a flavor interaction summary line (shown below the main rationale).
 * More specific than before — references actual blend and whiskey notes.
 */
function buildFlavorInteraction(blendOrCigar, bottle) {
  const blendType     = blendOrCigar?.blend_type || blendOrCigar?.blend_family || blendOrCigar?.type || '';
  const whiskeyType   = getWhiskeyType(bottle);
  const pairingLogic  = blendType ? BLEND_WHISKEY_PAIRING_LOGIC[blendType] : null;

  if (blendType && pairingLogic) {
    const logicWord = pairingLogic.logic === 'complement' ? 'Complementary' : 'Contrast';
    return `${logicWord}: ${blendType} × ${whiskeyType || 'whiskey'} — ${pairingLogic.note.split('.')[0].toLowerCase()}`;
  }
  if (blendType && whiskeyType) {
    return `${blendType} character meets ${whiskeyType} — flavor alignment by type logic`;
  }
  if (blendType) return `${blendType} profile drives the pairing`;

  // Cigar fallback
  const strength = blendOrCigar?.strength || blendOrCigar?.body || '';
  if (strength && whiskeyType) {
    const cigarPairingType = getCigarPairingType(blendOrCigar);
    const logicWord = cigarPairingType === 'complement' ? 'Complementary' : 'Contrast';
    return `${logicWord}: ${strength} body × ${whiskeyType} — intensity matched for balance`;
  }
  return null;
}

/**
 * Build a structural compatibility note.
 * References ABV and blend strength for a concrete structural read.
 */
function buildStructuralCompatibility(blend, bottle) {
  const abv       = Number(bottle?.abv) || 0;
  const strength  = blend?.strength || blend?.body || '';
  const blendType = getBlendType(blend);

  if (abv > 55 && (strength === 'Full' || blendType === 'English' || blendType === 'English/Balkan')) {
    return `Cask-strength proof (${abv}% ABV) pairs well with full-bodied smoke — both can sustain the intensity`;
  }
  if (abv > 50) {
    return `High-proof spirit (${abv}% ABV) stands up to the blend's weight without getting lost`;
  }
  if (abv > 43) {
    return `Standard cask proof (${abv}% ABV) — neither the smoke nor the pour overwhelms the other`;
  }
  if (abv > 0) {
    return `Approachable proof (${abv}% ABV) matches a gentler smoke profile — clean and balanced`;
  }
  return 'Spirit weight and smoke density are structurally compatible';
}

/**
 * Build a session outcome string based on pairing type and blend data.
 */
function buildPairingOutcome(pairingType, blend, bottle) {
  const blendType   = blend ? getBlendType(blend) : null;
  const whiskeyType = bottle ? getWhiskeyType(bottle) : null;

  if (pairingType === 'complement' || pairingType === 'complementary') {
    if (blendType === 'English' || blendType === 'English/Balkan') {
      return 'Smoke-forward, smoky-smooth session — Latakia and peat amplify each other through the finish';
    }
    if (blendType === 'Virginia') {
      return 'Sweet, warm session — Virginia brightness and bourbon sweetness stay cohesive from light to close';
    }
    return 'Cohesive session — similar profiles reinforce each other without competition';
  }
  if (pairingType === 'contrast') {
    if (blendType === 'Virginia/Perique') {
      return 'Balanced contrast — Perique\'s pepper note and the whiskey\'s spice create a clean, defined experience';
    }
    return 'Dynamic contrast — each element sharpens the other; the session stays interesting throughout';
  }
  if (pairingType === 'amplification') return 'Dominant notes amplified — bold, full delivery from first light to finish';
  if (pairingType === 'experimental')  return 'Unconventional pairing — results depend on palate; worth a deliberate session to evaluate';
  return 'Balanced, deliberate session pairing from your collection';
}

/**
 * Return 'complement' | 'contrast' for a cigar/bottle pairing.
 */
function getCigarPairingType(cigar) {
  const strength = getCigarStrength(cigar);
  // Mild-medium and medium-full are complement; medium body creates contrast
  const contrastStrengths = new Set(['Medium']);
  return contrastStrengths.has(strength) ? 'contrast' : 'complement';
}


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
      pairingType:   getPairingType(blend, bestBottle),
      leftItem:      { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' },
      blendBridge:   { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      score:         bestScore,
      rationale:     buildPipeBlendBottleRationale(pipe, blend, bestBottle),
      flavorInteraction:       buildFlavorInteraction(blend, bestBottle),
      structuralCompatibility: buildStructuralCompatibility(blend, bestBottle),
      outcome:                 buildPairingOutcome(getPairingType(blend, bestBottle), blend, bestBottle),
      confidenceLabel:         bestScore >= 7 ? 'High' : bestScore >= 4 ? 'Medium' : 'Experimental',
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
      pairingType: getPairingType(blend, best),
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   buildPipeBlendBottleRationale(pipe, blend, best),
      flavorInteraction:       buildFlavorInteraction(blend, best),
      structuralCompatibility: buildStructuralCompatibility(blend, best),
      outcome:                 buildPairingOutcome(getPairingType(blend, best), blend, best),
      confidenceLabel:         bestScore >= 7 ? 'High' : bestScore >= 4 ? 'Medium' : 'Experimental',
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
      pairingType: getPairingType(blend, best),
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   rediscoverRationale,
      flavorInteraction:       buildFlavorInteraction(blend, best),
      structuralCompatibility: buildStructuralCompatibility(blend, best),
      outcome:                 buildPairingOutcome(getPairingType(blend, best), blend, best),
      confidenceLabel:         bestScore >= 7 ? 'High' : bestScore >= 4 ? 'Medium' : 'Experimental',
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
      pairingType:   getCigarPairingType(cigar),
      leftItem:      { type: 'cigar', id: cigar.id, name: cigar.name, recordType: 'cigar' },
      rightItem:     { type: 'bottle', id: bestBottle.id, name: bestBottle.name, recordType: 'bottle' },
      blendBridge:   null,
      score:         bestScore,
      rationale:     buildCigarBottleRationale(cigar, bestBottle),
      flavorInteraction:       buildFlavorInteraction(cigar, bestBottle),
      structuralCompatibility: buildStructuralCompatibility(cigar, bestBottle),
      outcome:                 buildPairingOutcome(getCigarPairingType(cigar), cigar, bestBottle),
      confidenceLabel:         bestScore >= 7 ? 'High' : bestScore >= 4 ? 'Medium' : 'Experimental',
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

    const blendType = getBlendType(blend);
    const whiskeyChar = getWhiskeyCharacter(best);
    const pairingLogic = BLEND_WHISKEY_PAIRING_LOGIC[blendType];
    const logicLabel = pairingLogic ? (pairingLogic.logic === 'complement' ? 'Complement pairing' : 'Contrast pairing') : null;
    const novelRationale = logicLabel
      ? `${blend.name} hasn't seen much use yet. ${logicLabel}: ${pairingLogic.note}. ${best.name}'s ${whiskeyChar} sets the right backdrop for a first serious session.`
      : `${blend.name} is a ${blendType || 'blend'} waiting for its moment. ${best.name}'s ${whiskeyChar} makes it a worthwhile first session — give it the attention it hasn't had yet.`;

    newItems.push({
      id:          `pair_new_${blend.id}_${best.id}`,
      pairingMode: PAIRING_MODE.COLLECTION_MIX_MATCH,
      pairingType: getPairingType(blend, best),
      leftItem:    pipe ? { type: 'pipe', id: pipe.id, name: pipe.name, recordType: 'pipe' } : { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' },
      blendBridge: pipe ? { type: 'blend', id: blend.id, name: blend.name, recordType: 'blend' } : null,
      rightItem:   { type: 'bottle', id: best.id, name: best.name, recordType: 'bottle' },
      score:       bestScore,
      rationale:   novelRationale,
      flavorInteraction:       buildFlavorInteraction(blend, best),
      structuralCompatibility: buildStructuralCompatibility(blend, best),
      outcome:                 buildPairingOutcome(getPairingType(blend, best), blend, best),
      confidenceLabel:         bestScore >= 7 ? 'High' : bestScore >= 4 ? 'Medium' : 'Experimental',
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
    smokingLogs = [],
    preferences = null,
  } = context;

  // Exclude ai_excluded (collectible-only / hold-only) items from all pairing logic
  const pipes   = filterAiEligibleItems(context.pipes   || []);
  const blends  = filterAiEligibleItems(context.blends  || []);
  const bottles = filterAiEligibleItems(context.bottles || []);
  const cigars  = filterAiEligibleItems(context.cigars  || []);

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