/**
 * replacementDifficulty.js
 *
 * 0–100 replacement difficulty scoring for bottles, tobacco blends, and pipes.
 * Provides the canonical label, score, and reason for each item.
 *
 * Scale:
 *   0–15   Very Easy
 *   16–35  Easy
 *   36–55  Moderate
 *   56–75  Hard
 *   76–90  Very Hard
 *   91–100 Near Impossible
 */

// ---------------------------------------------------------------------------
// Label lookup
// ---------------------------------------------------------------------------

export const DIFFICULTY_BANDS = [
  { min: 0,  max: 15,  label: 'Very Easy',      color: '#4ade80' },
  { min: 16, max: 35,  label: 'Easy',            color: '#86efac' },
  { min: 36, max: 55,  label: 'Moderate',        color: '#fbbf24' },
  { min: 56, max: 75,  label: 'Hard',            color: '#fb923c' },
  { min: 76, max: 90,  label: 'Very Hard',       color: '#f87171' },
  { min: 91, max: 100, label: 'Near Impossible', color: '#c026d3' },
];

/**
 * Return the label band for a 0–100 score.
 * @param {number} score
 * @returns {{ label: string, color: string, min: number, max: number }}
 */
export function getDifficultyBand(score) {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  return DIFFICULTY_BANDS.find(b => s >= b.min && s <= b.max) || DIFFICULTY_BANDS[0];
}

// ---------------------------------------------------------------------------
// Bottle replacement difficulty
// ---------------------------------------------------------------------------

/**
 * Compute replacement difficulty for a whiskey/spirits bottle.
 * Returns { score, label, color, reason }.
 * @param {Object} bottle
 * @returns {{ score: number, label: string, color: string, reason: string }}
 */
export function computeBottleDifficulty(bottle = {}) {
  let score = 5; // floor: any in-production shelf bottle

  const status = (bottle.production_status || '').toLowerCase();

  // Production scarcity
  if (status === 'discontinued' || bottle.discontinued) score += 40;
  else if (status === 'allocated')                       score += 28;
  else if (status === 'limited edition')                 score += 20;
  else if (status === 'single cask')                     score += 18;

  // Bottle-specific scarcity flags
  if (bottle.is_unicorn || bottle.unicorn)               score += 25;
  if (bottle.export_only || bottle.is_travel_retail)     score += 12;
  if (bottle.is_exclusive || bottle.exclusive)           score += 12;

  // Batch type
  const batch = (bottle.batch_type || '').toLowerCase();
  if (batch === 'single_barrel' || batch === 'single barrel') score += 10;
  else if (batch === 'small_batch' || batch === 'small batch') score += 5;

  // Producer no longer active
  const producer = (bottle.producer_status || '').toLowerCase();
  if (producer.includes('closed') || producer.includes('defunct')) score += 20;
  else if (producer.includes('silent') || producer.includes('mothballed')) score += 14;

  // Age — older bottles are harder to source
  const age = Number(bottle.age);
  if (age >= 30)      score += 15;
  else if (age >= 25) score += 10;
  else if (age >= 18) score += 6;
  else if (age >= 12) score += 3;

  // Country / regional import difficulty
  const country = (bottle.country || '').toLowerCase();
  if (country === 'japan')  score += 8;
  if (country === 'taiwan') score += 6;

  // Manual override
  if (bottle.replacement_difficulty && !isNaN(Number(bottle.replacement_difficulty))) {
    score = Number(bottle.replacement_difficulty);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const band = getDifficultyBand(score);

  const reasons = [];
  if (status === 'discontinued' || bottle.discontinued) reasons.push('discontinued production');
  if (status === 'allocated')                           reasons.push('allocated release');
  if (bottle.is_unicorn || bottle.unicorn)              reasons.push('ultra-rare unicorn');
  if (producer.includes('closed') || producer.includes('defunct')) reasons.push('closed distillery');
  if (age >= 18)                                         reasons.push(`${age}-year age statement`);
  if (reasons.length === 0)                              reasons.push('standard in-production bottling');

  return { score, label: band.label, color: band.color, reason: reasons.join(', ') };
}

// ---------------------------------------------------------------------------
// Tobacco blend replacement difficulty
// ---------------------------------------------------------------------------

/**
 * Compute replacement difficulty for a tobacco blend.
 * Returns { score, label, color, reason }.
 * @param {Object} blend
 * @returns {{ score: number, label: string, color: string, reason: string }}
 */
export function computeBlendDifficulty(blend = {}) {
  let score = 5;

  const status = (blend.production_status || '').toLowerCase();

  // Production status
  if (blend.discontinued || status.includes('discontinue')) score += 42;
  if (blend.limited_batch || blend.is_limited || blend.is_limited_release) score += 20;
  if (blend.seasonal || blend.is_seasonal || status.includes('seasonal')) score += 14;
  if (blend.regional_exclusive || blend.region_exclusive) score += 16;

  // Manufacturer no longer active
  const makerStatus = (blend.manufacturer_status || blend.maker_status || '').toLowerCase();
  if (
    makerStatus === 'inactive' || makerStatus === 'defunct' ||
    makerStatus.includes('closed') || makerStatus.includes('no longer')
  ) score += 18;

  // Cellar age premium — aged stock that can't be replicated
  const cellarAge = Number(blend.cellar_age_years || blend.cellar_age || 0);
  if (cellarAge >= 10)     score += 18;
  else if (cellarAge >= 5) score += 11;
  else if (cellarAge >= 2) score += 5;

  // Rare blend type
  const rareTypes = ['latakia', 'oriental', 'perique', 'virginia flake', 'navy flake'];
  if (rareTypes.some(t => (blend.blend_type || '').toLowerCase().includes(t))) score += 8;

  // Manual override
  if (blend.replacement_difficulty && !isNaN(Number(blend.replacement_difficulty))) {
    score = Number(blend.replacement_difficulty);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const band = getDifficultyBand(score);

  const reasons = [];
  if (blend.discontinued || status.includes('discontinue')) reasons.push('discontinued');
  if (blend.limited_batch || blend.is_limited_release)      reasons.push('limited release');
  if (blend.seasonal || blend.is_seasonal)                  reasons.push('seasonal');
  if (blend.regional_exclusive)                             reasons.push('regional exclusive');
  if (makerStatus === 'inactive' || makerStatus === 'defunct') reasons.push('inactive manufacturer');
  if (cellarAge >= 5)                                       reasons.push(`${cellarAge}-year cellared stock`);
  if (reasons.length === 0)                                 reasons.push('regular production blend');

  return { score, label: band.label, color: band.color, reason: reasons.join(', ') };
}

// ---------------------------------------------------------------------------
// Pipe replacement difficulty
// ---------------------------------------------------------------------------

/**
 * Compute replacement difficulty for a tobacco pipe.
 * Returns { score, label, color, reason }.
 * @param {Object} pipe
 * @returns {{ score: number, label: string, color: string, reason: string }}
 */
export function computePipeDifficulty(pipe = {}) {
  // All pipes start at a minimum of 20 — no pipe is trivially replaceable
  let score = 20;

  // Production type
  const prodType = (pipe.production_type || '').toLowerCase();
  const isOneOff = !!(pipe.one_of_a_kind || pipe.is_one_of_a_kind || pipe.unique ||
    pipe.commissioned || prodType === 'one_off' || prodType === 'one-off');
  const isLimitedArtisan = prodType === 'limited_artisan_batch' || prodType === 'limited_artisan';
  const isArtisan = !!(pipe.is_custom || pipe.custom || pipe.artisan || pipe.is_handmade || pipe.handmade);

  if (isOneOff)              score += 50;
  else if (isLimitedArtisan) score += 35;
  else if (isArtisan)        score += 20;

  // Maker status
  const makerStatus = (pipe.maker_status || '').toLowerCase();
  const isMakerDeceased = !!(pipe.maker_deceased || makerStatus.includes('deceased') || makerStatus.includes('passed'));
  const isMakerRetired  = !!(pipe.maker_retired  || makerStatus === 'retired' || makerStatus.includes('no longer producing'));
  const isMakerInactive = !!(pipe.maker_inactive || makerStatus === 'inactive' || makerStatus === 'defunct' || makerStatus.includes('closed'));

  if (isMakerDeceased)      score += 20;
  else if (isMakerRetired)  score += 15;
  else if (isMakerInactive) score += 10;

  // Provenance / certification
  if (pipe.provenance || pipe.has_provenance || pipe.stamped || pipe.certified) score += 8;

  // Rarity material
  const material = (pipe.bowl_material || '').toLowerCase();
  if (material === 'meerschaum' || material.includes('meer')) score += 8;
  else if (material === 'morta')                               score += 6;

  // Age era
  const year = parseInt(pipe.year_made, 10);
  if (!isNaN(year)) {
    if (year < 1940)      score += 12;
    else if (year < 1960) score += 8;
    else if (year < 1980) score += 5;
  }

  // Manual override
  if (pipe.replacement_difficulty_override && !isNaN(Number(pipe.replacement_difficulty_override))) {
    score = Number(pipe.replacement_difficulty_override);
  } else if (pipe.replacement_difficulty && !isNaN(Number(pipe.replacement_difficulty))) {
    score = Number(pipe.replacement_difficulty);
  }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const band = getDifficultyBand(score);

  const reasons = [];
  if (isOneOff)          reasons.push('one-of-a-kind');
  if (isMakerDeceased)   reasons.push('maker deceased');
  if (isMakerRetired)    reasons.push('maker retired');
  if (isLimitedArtisan)  reasons.push('limited artisan batch');
  if (isArtisan)         reasons.push('artisan handmade');
  if (pipe.provenance)   reasons.push('documented provenance');
  if (!isNaN(year) && year < 1960) reasons.push(`made ${year}`);
  if (reasons.length === 0) reasons.push('factory production');

  return { score, label: band.label, color: band.color, reason: reasons.join(', ') };
}

// ---------------------------------------------------------------------------
// Unified dispatcher
// ---------------------------------------------------------------------------

/**
 * Compute replacement difficulty for any supported item type.
 * @param {Object} item
 * @param {'bottle'|'blend'|'pipe'|'tobacco'} itemType
 * @returns {{ score: number, label: string, color: string, reason: string }}
 */
export function computeReplacementDifficulty(item, itemType) {
  if (!item) return { score: 0, label: 'Unknown', color: '#6b7280', reason: 'No data' };
  const type = (itemType || '').toLowerCase();
  if (type === 'bottle')                 return computeBottleDifficulty(item);
  if (type === 'blend' || type === 'tobacco') return computeBlendDifficulty(item);
  if (type === 'pipe')                   return computePipeDifficulty(item);
  return { score: 0, label: 'Unknown', color: '#6b7280', reason: 'Unsupported item type' };
}
