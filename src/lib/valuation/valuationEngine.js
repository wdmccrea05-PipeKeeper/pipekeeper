/**
 * valuationEngine.js
 *
 * Multi-layer valuation engine for CollectionKeeper / PipeKeeper / WhiskeyKeeper.
 *
 * Produces a unified valuation snapshot with six layers:
 *   1. Personal Cost Basis
 *   2. Local Market Replacement Value
 *   3. Global Benchmark Value
 *   4. Replacement Difficulty
 *   5. Strategy Recommendation
 *   6. Confidence Score
 *
 * All monetary outputs are in USD (base currency).
 * Use convertFromBase() from the currency system to present in the user's chosen currency.
 *
 * This module is pure JS — no React, no side effects.
 */

import { getEffectiveMarketProfile } from './marketProfiles';
import { countryMultiplier, VALUE_FIELD_PRIORITY, VALUE_SOURCE_TRUST } from './valuationSources';
import { computeReplacementDifficulty } from './replacementDifficulty';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// 1. Personal Cost Basis
// ---------------------------------------------------------------------------

/**
 * Extract the personal cost basis from an item.
 * Returns { value, currency, date, location, country } — value in USD.
 * @param {Object} item
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 */
export function extractCostBasis(item, itemType) {
  if (!item) return null;

  const type = (itemType || '').toLowerCase();

  // Tobacco / blend uses cost_basis as the primary field
  const purchaseValue = type === 'blend' || type === 'tobacco'
    ? toNum(item.cost_basis || item.purchase_price)
    : toNum(item.purchase_price);

  if (purchaseValue <= 0) return null;

  return {
    value:    purchaseValue,
    currency: item.purchase_currency || 'USD',
    date:     item.purchase_date     || null,
    location: item.purchase_location || null,
    country:  item.purchase_country  || null,
  };
}

// ---------------------------------------------------------------------------
// 2. Global Benchmark Value
// ---------------------------------------------------------------------------

/**
 * Derive the best-available single-figure global benchmark value (USD).
 * Priority is sourced from VALUE_FIELD_PRIORITY per item type.
 * @param {Object} item
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @returns {{ value: number, source: string, confidence: string }|null}
 */
export function computeGlobalBenchmark(item, itemType) {
  if (!item) return null;
  const type = (itemType || '').toLowerCase();
  const priority = VALUE_FIELD_PRIORITY[type] || VALUE_FIELD_PRIORITY.bottle;

  // For tobacco blends: compute value from price_per_oz * quantity if no direct value exists
  if ((type === 'blend' || type === 'tobacco')) {
    const manualValue   = toNum(item.manual_market_value || item.manual_value_override);
    const aiEstimate    = toNum(item.ai_estimated_value);
    const pricePerOz    = toNum(item.price_per_oz);
    const totalOz       = toNum(item.tin_total_quantity_oz) + toNum(item.bulk_total_quantity_oz) + toNum(item.pouch_total_quantity_oz);

    if (manualValue > 0) {
      return { value: manualValue, source: 'manual_override', confidence: 'high' };
    }
    if (aiEstimate > 0 && totalOz > 0) {
      return { value: aiEstimate * totalOz, source: 'ai_estimate', confidence: 'medium' };
    }
    if (pricePerOz > 0 && totalOz > 0) {
      return { value: pricePerOz * totalOz, source: 'formula_derived', confidence: 'low' };
    }
    // Cost basis fallback
    const costBasis = toNum(item.cost_basis || item.purchase_price);
    if (costBasis > 0) {
      return { value: costBasis, source: 'purchase_price', confidence: 'low' };
    }
    return null;
  }

  for (const field of priority) {
    const v = toNum(item[field]);
    if (v > 0) {
      const sourceKey = field === 'manual_value_override'   ? 'manual_override'
                      : field === 'collector_value'         ? 'collector_value'
                      : field === 'aftermarket_price'       ? 'auction_comp'
                      : field === 'retail_price'            ? 'retailer_current'
                      : field === 'estimated_value'         ? 'collector_value'
                      : 'purchase_price';
      const trust = VALUE_SOURCE_TRUST[sourceKey] || VALUE_SOURCE_TRUST.formula_derived;
      return { value: v, source: sourceKey, confidence: trust.confidence };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. Local Market Value
// ---------------------------------------------------------------------------

/**
 * Compute the estimated local market value (USD) for the user's market profile.
 * Applies a regional price multiplier to the global benchmark.
 *
 * @param {Object} item
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @param {{ country: string, region: string, currency: string }} [profileOverride]
 * @returns {{ value: number, currency: string, country: string, region: string, confidence: string }|null}
 */
export function computeLocalMarketValue(item, itemType, profileOverride) {
  const global = computeGlobalBenchmark(item, itemType);
  if (!global) return null;

  const profile = profileOverride || getEffectiveMarketProfile();
  const multiplier = countryMultiplier(profile.country, itemType);
  const localValueUSD = global.value * multiplier;

  // Confidence is capped at the global benchmark confidence
  const confidence = global.confidence === 'high' ? 'high' : global.confidence === 'medium' ? 'medium' : 'low';

  return {
    value:      Math.round(localValueUSD * 100) / 100,
    currency:   profile.currency,
    country:    profile.country,
    region:     profile.region || '',
    confidence,
    multiplier,
  };
}

// ---------------------------------------------------------------------------
// 4. Strategy Recommendation
// ---------------------------------------------------------------------------

const STRATEGY_LABELS = ['Open Now', 'Hold', 'Buy Backup', 'Trade Candidate', 'Your Call'];

/**
 * Derive a strategy recommendation for an item.
 *
 * @param {Object} item
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @param {{ score: number, label: string }} difficulty
 * @param {Object|null} costBasis
 * @param {Object|null} globalBenchmark
 * @returns {{ recommendation: string, reason: string, bullets: string[] }}
 */
export function computeStrategy(item, itemType, difficulty, costBasis, globalBenchmark) {
  const type        = (itemType || '').toLowerCase();
  const diffScore   = difficulty?.score ?? 0;
  const basisValue  = costBasis?.value   ?? 0;
  const globalValue = globalBenchmark?.value ?? 0;

  const gainLoss    = basisValue > 0 && globalValue > 0 ? globalValue - basisValue : null;
  const gainPct     = gainLoss !== null && basisValue > 0 ? (gainLoss / basisValue) * 100 : null;

  const bullets = [];
  let recommendation = 'Your Call';
  let reason = '';

  // ----------------------------------------------------------------------------
  // Bottle strategy
  // ----------------------------------------------------------------------------
  if (type === 'bottle') {
    const status = (item.production_status || '').toLowerCase();
    const isDiscontinued = status === 'discontinued' || !!item.discontinued;
    const isAllocated    = status === 'allocated' || !!item.allocated;

    if (isDiscontinued && diffScore >= 70) {
      recommendation = 'Hold';
      reason = 'Discontinued and hard to replace — holding preserves maximum optionality.';
      bullets.push('Production has ended — supply only decreases over time');
      if (gainPct !== null && gainPct > 30) bullets.push(`Up ${gainPct.toFixed(0)}% vs. what you paid`);
    } else if (isAllocated && diffScore >= 50) {
      recommendation = 'Buy Backup';
      reason = 'Allocated releases are difficult to source; stocking a backup protects access.';
      bullets.push('Allocated bottles often disappear from shelves quickly');
    } else if (gainPct !== null && gainPct < -15) {
      recommendation = 'Open Now';
      reason = 'Current market value is below what you paid — drinking now captures the full experience.';
      bullets.push(`Down ${Math.abs(gainPct).toFixed(0)}% vs. what you paid`);
    } else if (diffScore <= 20) {
      recommendation = 'Open Now';
      reason = 'Widely available and easy to replace — open and enjoy.';
      bullets.push('Easy to replace if you want another bottle');
    } else {
      recommendation = 'Your Call';
      reason = 'A solid hold — drink or cellar based on your plans.';
    }
    if (item.age && item.age >= 18) bullets.push(`${item.age}-year expression commands a shelf premium`);
  }

  // ----------------------------------------------------------------------------
  // Blend / tobacco strategy
  // ----------------------------------------------------------------------------
  if (type === 'blend' || type === 'tobacco') {
    const isDiscontinued = !!(item.discontinued || (item.production_status || '').toLowerCase().includes('discontinue'));
    const isLimited      = !!(item.limited_batch || item.is_limited_release);
    const isSeasonal     = !!(item.seasonal || item.is_seasonal);

    if (isDiscontinued && diffScore >= 65) {
      recommendation = 'Hold';
      reason = 'Discontinued blend — every tin or ounce is irreplaceable.';
      bullets.push('No longer in production; secondary market supply only');
      bullets.push('Consider ageing for premium flavour and value appreciation');
    } else if (isDiscontinued) {
      recommendation = 'Buy Backup';
      reason = 'Discontinued production makes additional stock increasingly hard to find.';
      bullets.push('Secure backup tins while they remain available');
    } else if (isLimited || isSeasonal) {
      recommendation = 'Buy Backup';
      reason = 'Limited or seasonal releases — availability is unpredictable.';
      bullets.push('Stock up when you find it; may not be available next season');
    } else if (diffScore <= 20) {
      recommendation = 'Open Now';
      reason = 'Readily available — open and enjoy freely.';
      bullets.push('Regular production; no need to hoard');
    } else {
      recommendation = 'Your Call';
      reason = 'Enjoy at your pace — replacement is possible but worth keeping in mind.';
    }
  }

  // ----------------------------------------------------------------------------
  // Pipe strategy
  // ----------------------------------------------------------------------------
  if (type === 'pipe') {
    const isOneOff       = !!(item.one_of_a_kind || item.is_one_of_a_kind || item.unique || item.commissioned);
    const makerStatus    = (item.maker_status || '').toLowerCase();
    const isMakerGone    = makerStatus.includes('deceased') || makerStatus === 'retired' || makerStatus === 'inactive';
    const isHighValue    = globalValue > 500;

    if (isOneOff && isMakerGone) {
      recommendation = 'Hold';
      reason = 'One-of-a-kind piece from a maker who is no longer producing — genuinely irreplaceable.';
      bullets.push('No equivalent piece can be commissioned or found new');
      bullets.push('Consider specialist insurance if value is significant');
    } else if (isOneOff) {
      recommendation = 'Hold';
      reason = 'Unique commissioned piece — you cannot replace this exact pipe.';
      bullets.push('Enjoy it as the special object it is');
    } else if (isMakerGone && diffScore >= 70) {
      recommendation = 'Hold';
      reason = 'Maker is no longer active — this pipe cannot be reordered.';
      bullets.push('Prestige makers who have stopped producing command growing collector interest');
    } else if (isHighValue && diffScore >= 50) {
      recommendation = 'Hold';
      reason = 'High-value piece with notable replacement difficulty — holding is prudent.';
      if (globalValue > 0) bullets.push(`Estimated at ${Math.round(globalValue)} USD — worth insuring`);
    } else if (diffScore <= 30) {
      recommendation = 'Your Call';
      reason = 'Good factory or established artisan pipe — smoke and enjoy freely.';
    } else {
      recommendation = 'Your Call';
      reason = 'A quality piece — smoke it and appreciate the craftsmanship.';
    }
  }

  // Validate recommendation against allowed list
  if (!STRATEGY_LABELS.includes(recommendation)) recommendation = 'Your Call';

  return { recommendation, reason, bullets };
}

// ---------------------------------------------------------------------------
// 5. Confidence Score (0–100)
// ---------------------------------------------------------------------------

/**
 * Combine available signals into an overall confidence score 0–100.
 * @param {Object|null} costBasis
 * @param {Object|null} globalBenchmark
 * @param {{ score: number }} difficulty
 * @returns {{ score: number, label: 'high'|'medium'|'low' }}
 */
function computeConfidence(costBasis, globalBenchmark, difficulty) {
  let score = 0;

  // Having a purchase price is always a positive signal
  if (costBasis?.value > 0) score += 20;

  // Source trust drives the core confidence
  if (globalBenchmark) {
    const trust = VALUE_SOURCE_TRUST[globalBenchmark.source] || VALUE_SOURCE_TRUST.formula_derived;
    score += Math.round(trust.weight * 60);
  }

  // Replacement difficulty is well-modelled when we have production status
  if (difficulty?.score > 0) score += 10;

  const label = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score: Math.min(100, score), label };
}

// ---------------------------------------------------------------------------
// Public API — buildValuationRecord
// ---------------------------------------------------------------------------

/**
 * Build a complete multi-layer valuation record for any item.
 *
 * Returns a unified snapshot; all values are in USD base currency.
 *
 * @param {Object} item        - The raw item record from the database
 * @param {'bottle'|'blend'|'tobacco'|'pipe'} itemType
 * @param {{ country?: string, region?: string, currency?: string }} [marketProfileOverride]
 * @returns {{
 *   costBasis:         { value, currency, date, location, country }|null,
 *   localMarketValue:  { value, currency, country, region, confidence, multiplier }|null,
 *   globalBenchmark:   { value, source, confidence }|null,
 *   replacementDifficulty: { score, label, color, reason },
 *   strategy:          { recommendation, reason, bullets },
 *   confidence:        { score, label },
 * }}
 */
export function buildValuationRecord(item, itemType, marketProfileOverride) {
  const type = (itemType || '').toLowerCase();

  const costBasis       = extractCostBasis(item, type);
  const globalBenchmark = computeGlobalBenchmark(item, type);
  const localMarketValue = computeLocalMarketValue(item, type, marketProfileOverride);
  const replacementDifficulty = computeReplacementDifficulty(item, type);
  const strategy        = computeStrategy(item, type, replacementDifficulty, costBasis, globalBenchmark);
  const confidence      = computeConfidence(costBasis, globalBenchmark, replacementDifficulty);

  return {
    costBasis,
    localMarketValue,
    globalBenchmark,
    replacementDifficulty,
    strategy,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Gain / loss helper
// ---------------------------------------------------------------------------

/**
 * Compute gain or loss between cost basis and current benchmark.
 * @param {Object|null} costBasis
 * @param {Object|null} globalBenchmark
 * @returns {{ delta: number, pct: number, direction: 'up'|'down'|'flat' }|null}
 */
export function computeGainLoss(costBasis, globalBenchmark) {
  if (!costBasis?.value || !globalBenchmark?.value) return null;
  const delta = globalBenchmark.value - costBasis.value;
  const pct   = (delta / costBasis.value) * 100;
  return {
    delta: Math.round(delta * 100) / 100,
    pct:   Math.round(pct  * 10)  / 10,
    direction: Math.abs(pct) < 1 ? 'flat' : pct > 0 ? 'up' : 'down',
  };
}
