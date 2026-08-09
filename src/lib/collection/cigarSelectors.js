/**
 * cigarSelectors.js
 *
 * Canonical, pure selector functions for all CigarKeeper-derived metrics.
 *
 * Standardised definitions:
 *
 *  cigar_types           — distinct Cigar product records
 *  total_sticks          — total cigar inventory units (in single-stick equivalents)
 *  ready_to_smoke_count  — cigars in available/ready state
 *  humidor_count         — distinct HumidorLocation records
 *  collection_value      — total value of owned cigar inventory
 */

import { calculateCigarValue } from '@/utils/cigarValuation';
import { selectActiveCigars } from './activeFilters.js';

// ---------------------------------------------------------------------------
// Rarity / Collectibility scoring — WhiskeyKeeper/WineKeeper-style model
// ---------------------------------------------------------------------------

/** Prestige brand tiers (global cigar brands with known collector demand) */
const PRESTIGE_BRANDS = [
  // Cuban
  'cohiba', 'montecristo', 'trinidad', 'partagas', 'bolivar', 'romeo y julieta', 'h. upmann',
  'punch', 'ramon allones', 'por larrañaga', 'el rey del mundo', 'sancho panza', 'quai d\'orsay',
  // Nicaraguan premium
  'padron', 'perdomo', 'arturo fuente', 'my father', 'joya de nicaragua', 'drew estate',
  // Dominican/Honduran premium
  'davidoff', 'zino', 'macanudo', 'oliva', 'rocky patel', 'alec bradley', 'liga privada',
  'crowned heads', 'tatuaje', 'camacho', 'e.p. carrillo', 'avo', 'excalibur',
  // Boutique / ultra-premium
  'padrón', 'illusione', 'opus x', 'fuente fuente opus x', 'aniversario',
];

/** Prestige / rare wrapper leaf types */
const RARE_WRAPPERS = [
  'oscuro', 'maduro', 'rosado', 'colorado claro', 'candela', 'sun grown',
  'cameroon', 'connecticut broadleaf', 'habano', 'corojo', 'criollo',
  'pigtail', 'belicoso wrapper',
];

/** Rare / collectors-tier vitolas */
const RARE_VITOLAS = [
  'figurado', 'pyramid', 'belicoso', 'torpedo', 'diadema', 'gran toro', 'salomon',
  'perfecto', 'culebra', 'double figurado', 'a', 'presidente',
];

function matchesListCI(str, list) {
  if (!str) return false;
  const s = str.toLowerCase();
  return list.some((term) => s.includes(term.toLowerCase()));
}

function getCigarUnitValueForRarity(cigar) {
  const valuation = calculateCigarValue(cigar);
  return Number(valuation?.estimatedUnitValue || 0);
}

/**
 * Compute a cigar-specific 0–100 rarity/collectibility score.
 * Returns null when there is insufficient data (< 2 signals).
 *
 * Factor weights:
 *   brand reputation         — 22 pts max
 *   line / limited release   — 16 pts max
 *   production status        — 14 pts max
 *   market value             — 14 pts max
 *   age (aging_start_date)   — 10 pts max
 *   wrapper rarity           — 8 pts max
 *   vitola rarity            — 6 pts max
 *   origin / country         — 4 pts max
 *   quantity scarcity        — 4 pts max
 *   replacement difficulty   — 2 pts max
 */
export function getCigarRarityScore(cigar) {
  if (!cigar) return null;

  let totalPoints = 0;
  let signalCount = 0;

  // 1. Brand reputation — up to 22 pts
  if (cigar.brand) {
    signalCount++;
    if (matchesListCI(cigar.brand, PRESTIGE_BRANDS)) {
      totalPoints += 22;
    } else if (cigar.brand.length > 2) {
      totalPoints += 4; // Known brand, not prestige-listed
    }
  }

  // 2. Line + limited release status — up to 16 pts
  if (cigar.line || cigar.release_type) {
    signalCount++;
    const isLimitedLine = matchesListCI(cigar.line || '', ['limited', 'rare', 'exclusive', 'reserve', 'aniversario', 'opus', 'anniversary'])
      || matchesListCI(cigar.release_type || '', ['limited', 'rare', 'exclusive', 'special', 'annual', 'seasonal']);
    if (isLimitedLine) {
      totalPoints += 16;
    } else {
      totalPoints += 3;
    }
  }

  // 3. Production status — up to 14 pts
  if (cigar.production_status) {
    signalCount++;
    const ps = String(cigar.production_status).toLowerCase();
    if (ps === 'discontinued') totalPoints += 14;
    else if (ps === 'limited') totalPoints += 12;
    else if (ps === 'seasonal') totalPoints += 8;
    else if (ps === 'in_production' || ps === 'regular') totalPoints += 2;
  }

  // 4. Market / unit value — up to 14 pts
  const unitValue = getCigarUnitValueForRarity(cigar);
  if (unitValue > 0) {
    signalCount++;
    if (unitValue >= 60)      totalPoints += 14;
    else if (unitValue >= 35) totalPoints += 10;
    else if (unitValue >= 20) totalPoints += 7;
    else if (unitValue >= 10) totalPoints += 4;
    else                      totalPoints += 1;
  }

  // 5. Age (time in cellar since aging_start_date) — up to 10 pts
  if (cigar.aging_start_date) {
    const ageDays = Math.max(0, (Date.now() - new Date(cigar.aging_start_date).getTime()) / (1000 * 60 * 60 * 24));
    signalCount++;
    if (ageDays >= 1825)      totalPoints += 10; // 5+ years
    else if (ageDays >= 1095) totalPoints += 8;  // 3+ years
    else if (ageDays >= 365)  totalPoints += 5;  // 1+ year
    else if (ageDays >= 180)  totalPoints += 2;
  }

  // 6. Wrapper rarity — up to 8 pts
  if (cigar.wrapper) {
    signalCount++;
    if (matchesListCI(cigar.wrapper, RARE_WRAPPERS)) {
      totalPoints += 8;
    } else {
      totalPoints += 1;
    }
  }

  // 7. Vitola rarity — up to 6 pts
  if (cigar.vitola) {
    signalCount++;
    if (matchesListCI(cigar.vitola, RARE_VITOLAS)) {
      totalPoints += 6;
    } else {
      totalPoints += 1;
    }
  }

  // 8. Country of origin — up to 4 pts (Cuban / Nicaraguan premium origin)
  if (cigar.country_of_origin) {
    signalCount++;
    const co = cigar.country_of_origin.toLowerCase();
    if (co.includes('cuba') || co.includes('cuban')) totalPoints += 4;
    else if (co.includes('nicaragua') || co.includes('dominican') || co.includes('honduras')) totalPoints += 2;
    else totalPoints += 1;
  }

  // 9. Quantity scarcity — up to 4 pts
  const qty = Number(cigar.singles_equivalent ?? cigar.quantity ?? 0);
  if (qty > 0) {
    signalCount++;
    if (qty === 1)     totalPoints += 4;
    else if (qty <= 3) totalPoints += 2;
    else if (qty <= 6) totalPoints += 1;
  }

  // 10. Replacement difficulty — up to 2 pts
  if (cigar.replacement_difficulty) {
    signalCount++;
    const rd = cigar.replacement_difficulty;
    if (rd === 'very_hard') totalPoints += 2;
    else if (rd === 'hard') totalPoints += 1;
  }

  // Require at least 2 signals for a meaningful score
  if (signalCount < 2) return null;

  return Math.min(100, Math.round(totalPoints));
}

/**
 * Returns an object with score, label, confidence, factors, and reasoning.
 * Mirrors WineKeeper/WhiskeyKeeper rarity result shape.
 */
export function getCigarRarityResult(cigar) {
  if (!cigar) return null;

  const score = getCigarRarityScore(cigar);

  if (score === null) {
    return {
      score: null,
      label: null,
      confidence: 'insufficient',
      factors: [],
      reasoning: 'Not enough data to score rarity yet.',
    };
  }

  const label =
    score >= 90 ? 'Exceptional' :
    score >= 70 ? 'Rare' :
    score >= 50 ? 'Collectible' :
    score >= 25 ? 'Notable' :
    'Common';

  const valuation = calculateCigarValue(cigar);
  const confRaw = valuation?.confidenceScore || 'low';
  const confidence = confRaw === 'high' ? 'high' : confRaw === 'medium' ? 'medium' : 'low';

  const unitValue = getCigarUnitValueForRarity(cigar);
  const factors = [];

  if (cigar.brand) factors.push({ label: 'Brand', note: cigar.brand });
  if (cigar.line) factors.push({ label: 'Line', note: cigar.line });
  if (cigar.production_status) factors.push({ label: 'Production', note: cigar.production_status });
  if (unitValue > 0) factors.push({ label: 'Value', note: `$${Math.round(unitValue)}/stick` });
  if (cigar.wrapper) factors.push({ label: 'Wrapper', note: cigar.wrapper });
  if (cigar.vitola) factors.push({ label: 'Vitola', note: cigar.vitola });
  if (cigar.country_of_origin) factors.push({ label: 'Origin', note: cigar.country_of_origin });
  if (cigar.replacement_difficulty) factors.push({ label: 'Replacement', note: cigar.replacement_difficulty.replace('_', ' ') });

  const reasonParts = [
    matchesListCI(cigar.brand || '', PRESTIGE_BRANDS) && 'Prestige brand',
    matchesListCI(cigar.production_status || '', ['discontinued']) && 'Discontinued production',
    matchesListCI(cigar.production_status || '', ['limited']) && 'Limited release',
    matchesListCI(cigar.release_type || '', ['limited', 'rare', 'exclusive', 'annual', 'seasonal']) && 'Limited release type',
    cigar.aging_start_date && (() => {
      const days = Math.round((Date.now() - new Date(cigar.aging_start_date).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 365 ? `${Math.round(days / 365)}-year aged` : null;
    })(),
    matchesListCI(cigar.wrapper || '', RARE_WRAPPERS) && `Rare wrapper (${cigar.wrapper})`,
    (cigar.country_of_origin || '').toLowerCase().includes('cuba') && 'Cuban origin',
    unitValue >= 35 && `Value $${Math.round(unitValue)}/stick`,
  ].filter(Boolean);

  const reasoning = reasonParts.join('. ') || 'Score based on available data.';

  return { score, label, confidence, factors, reasoning };
}

/** Convenience export — just the label string or null. */
export function getCigarRarityLabel(cigar) {
  return getCigarRarityResult(cigar)?.label || null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function hasNumericInput(v) {
  if (v === null || v === undefined || v === '') return false;
  const x = Number(v);
  return Number.isFinite(x);
}

function hasValuationInput(cigar) {
  if (!cigar) return false;
  return (
    hasNumericInput(cigar.purchase_price) ||
    hasNumericInput(cigar.estimated_value) ||
    hasNumericInput(cigar.estimated_unit_value) ||
    hasNumericInput(cigar.estimated_total_value) ||
    hasNumericInput(cigar.replacement_cost_estimate) ||
    hasNumericInput(cigar.manual_valuation_override)
  );
}

// ---------------------------------------------------------------------------
// Single-cigar helpers
// ---------------------------------------------------------------------------

/**
 * Return the available quantity for one Cigar record in single-stick equivalents.
 * Mirrors `getAvailableQuantity` from `platform/cigarInventory.js`.
 *
 * @param {object} cigar
 * @returns {number}
 */
export function getCigarAvailableQuantity(cigar) {
  if (!cigar) return 0;
  const qty = cigar.singles_equivalent ?? cigar.quantity ?? 0;
  return Math.max(0, n(qty));
}

/**
 * Return canonical valuation state for a cigar.
 *
 * - totalValue: null means no valuation data exists
 * - totalValue: number (including 0) means valuation exists
 *
 * @param {object} cigar
 * @returns {{ totalValue: number|null, unitValue: number|null, hasValuation: boolean }}
 */
export function getCigarValuationSnapshot(cigar) {
  if (!cigar) return { totalValue: null, unitValue: null, hasValuation: false };

  const valuation = calculateCigarValue(cigar);
  const qty = getCigarAvailableQuantity(cigar);
  const explicitInput = hasValuationInput(cigar);
  const hasCalculatedTotal = valuation?.estimatedTotalValue != null && Number.isFinite(Number(valuation.estimatedTotalValue));
  const hasCalculatedUnit = valuation?.estimatedUnitValue != null && Number.isFinite(Number(valuation.estimatedUnitValue));

  const totalValue = hasCalculatedTotal
    ? Math.max(0, n(valuation.estimatedTotalValue))
    : null;

  let unitValue = null;
  if (hasCalculatedUnit) {
    unitValue = Math.max(0, n(valuation.estimatedUnitValue));
  } else if (totalValue != null && qty > 0) {
    unitValue = totalValue / qty;
  }

  return {
    totalValue,
    unitValue,
    hasValuation: totalValue != null || unitValue != null || Boolean(explicitInput),
  };
}

/**
 * Return the canonical value for one Cigar record.
 *
 * Priority: estimated_value → purchase_price → 0
 *
 * @param {object} cigar
 * @returns {number}
 */
export function getCigarUnitValue(cigar) {
  return n(getCigarValuationSnapshot(cigar).unitValue);
}

/**
 * Return canonical total remaining value for one cigar record.
 *
 * @param {object} cigar
 * @returns {number}
 */
export function getCigarTotalValue(cigar) {
  const total = getCigarValuationSnapshot(cigar).totalValue;
  return total == null ? 0 : Math.max(0, n(total));
}

/**
 * Returns true when a cigar has valuation input or derived valuation.
 *
 * @param {object} cigar
 * @returns {boolean}
 */
export function hasCigarValuation(cigar) {
  return getCigarValuationSnapshot(cigar).hasValuation;
}

/**
 * Count cigars with valuation data.
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectValuedCigarCount(cigars) {
  return selectActiveCigars(cigars).filter((c) => hasCigarValuation(c)).length;
}

// ---------------------------------------------------------------------------
// Core metric selectors
// ---------------------------------------------------------------------------

/**
 * cigar_types — count of distinct Cigar product records.
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectCigarTypes(cigars) {
  return selectActiveCigars(cigars).length;
}

/**
 * total_sticks — total cigar inventory units in single-stick equivalents.
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectTotalSticks(cigars) {
  return selectActiveCigars(cigars).reduce((sum, c) => sum + getCigarAvailableQuantity(c), 0);
}

/**
 * ready_to_smoke_count — cigars in available/ready state.
 * A cigar is considered ready when it has available quantity > 0 and is not
 * explicitly marked as not ready (e.g. still aging).
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectReadyToSmokeCount(cigars) {
  return selectActiveCigars(cigars).filter((c) => {
    if (!c) return false;
    const qty = getCigarAvailableQuantity(c);
    if (qty <= 0) return false;
    const status = (c.status || '').toLowerCase();
    return status !== 'aging' && status !== 'not ready';
  }).length;
}

/**
 * humidor_count — count of distinct HumidorLocation records.
 *
 * @param {object[]} humidors
 * @returns {number}
 */
export function selectHumidorCount(humidors) {
  return Array.isArray(humidors) ? humidors.length : 0;
}

/**
 * collection_value — total value of owned cigar inventory.
 * Uses getCigarUnitValue × available quantity per cigar.
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectCigarCollectionValue(cigars) {
  return selectActiveCigars(cigars).reduce((sum, c) => sum + getCigarTotalValue(c), 0);
}

// ---------------------------------------------------------------------------
// Combined metrics object
// ---------------------------------------------------------------------------

/**
 * selectCigarMetrics — compute all canonical cigar metrics in one call.
 *
 * @param {object[]} cigars
 * @param {object[]} humidors - HumidorLocation records (optional)
 * @returns {{
 *   cigar_types: number,
 *   total_sticks: number,
 *   ready_to_smoke_count: number,
 *   humidor_count: number,
 *   collection_value: number,
 * }}
 */
export function selectCigarMetrics(cigars, humidors) {
  const valued_cigar_count = selectValuedCigarCount(cigars);
  const cigar_types = selectCigarTypes(cigars);

  return {
    cigar_types,
    total_sticks: selectTotalSticks(cigars),
    ready_to_smoke_count: selectReadyToSmokeCount(cigars),
    humidor_count: selectHumidorCount(humidors),
    collection_value: selectCigarCollectionValue(cigars),
    valued_cigar_count,
    unvalued_cigar_count: Math.max(0, cigar_types - valued_cigar_count),
    has_collection_valuation: valued_cigar_count > 0,
  };
}