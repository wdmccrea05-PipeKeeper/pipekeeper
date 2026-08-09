/**
 * tobaccoSelectors.js
 *
 * Canonical, pure selector functions for all PipeKeeper tobacco-derived metrics.
 *
 * Standardised definitions:
 *
 *  blend_types       — distinct TobaccoBlend records
 *  total_quantity_oz — summed quantity across owned tobacco inventory (oz)
 *  open_blends       — blends with at least one opened/in-use container
 *  cellar_value      — total value of owned tobacco inventory
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// ---------------------------------------------------------------------------
// Single-blend quantity and value helpers
// ---------------------------------------------------------------------------

/**
 * Return the total owned quantity (oz) for one TobaccoBlend record.
 * Sums tin, bulk, and pouch container types.
 *
 * @param {object} blend
 * @returns {number}
 */
export function getBlendTotalOz(blend) {
  if (!blend) return 0;

  // Newer records can store explicit totals in quantity/cellar_quantity, while older
  // records store container-derived totals in tin/bulk/pouch rollup fields.
  // Prefer explicit totals first, then fall back to rollup fields for legacy data.
  const explicitQty =
    n(blend.quantity ?? blend.quantity_owned ?? blend.total_quantity) +
    n(blend.cellar_quantity ?? blend.cellared_quantity);
  if (explicitQty > 0) return explicitQty;

  return (
    n(blend.tin_total_quantity_oz) +
    n(blend.bulk_total_quantity_oz) +
    n(blend.pouch_total_quantity_oz)
  );
}

export function getBlendValuationQuantity(blend) {
  if (!blend) return 0;
  return getBlendTotalOz(blend);
}

/**
 * Return the canonical value for one TobaccoBlend record.
 *
 * Priority:
 *   1. manual_override_total
 *   2. estimated_total_value
 *   3. market_estimated_total_value
 *   4. market_estimated_unit_value × quantity
 *   5. estimated_unit_value × quantity
 *   6. purchase_price × quantity
 *   7. 0
 *
 * @param {object} blend
 * @returns {number}
 */
export function getBlendValue(blend) {
  if (!blend) return 0;

  const manualOverrideTotal = n(blend.manual_override_total) || n(blend.manual_market_value);
  if (manualOverrideTotal > 0) return manualOverrideTotal;

  if (n(blend.estimated_total_value) > 0) return n(blend.estimated_total_value);
  if (n(blend.market_estimated_total_value) > 0) return n(blend.market_estimated_total_value);

  const quantity = getBlendValuationQuantity(blend);

  if (n(blend.market_estimated_unit_value) > 0 && quantity > 0) {
    return n(blend.market_estimated_unit_value) * quantity;
  }

  const unitValueFromAnySource =
    n(blend.estimated_unit_value) || n(blend.ai_estimated_value) || n(blend.estimated_value);
  if (unitValueFromAnySource > 0 && quantity > 0) {
    return unitValueFromAnySource * quantity;
  }

  if (n(blend.purchase_price) > 0 && quantity > 0) {
    return n(blend.purchase_price) * quantity;
  }

  return 0;
}

/**
 * Return true when a blend has at least one open/in-use container.
 *
 * @param {object} blend
 * @returns {boolean}
 */
export function isBlendOpen(blend) {
  if (!blend) return false;
  return (
    n(blend.tin_tins_open) > 0 ||
    n(blend.bulk_open) > 0 ||
    n(blend.pouch_pouches_open) > 0
  );
}

// ---------------------------------------------------------------------------
// Core metric selectors
// ---------------------------------------------------------------------------

/**
 * blend_types — count of distinct TobaccoBlend records.
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectBlendTypes(blends) {
  return selectActiveBlends(blends).length;
}

/**
 * total_quantity_oz — summed quantity across all owned tobacco blends (oz).
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectTotalQuantityOz(blends) {
  return selectActiveBlends(blends).reduce((sum, b) => sum + getBlendTotalOz(b), 0);
}

/**
 * open_blends — number of blends that have at least one opened container.
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectOpenBlends(blends) {
  return selectActiveBlends(blends).filter(isBlendOpen).length;
}

/**
 * cellar_value — total value of owned tobacco inventory.
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectCellarValue(blends) {
  return selectActiveBlends(blends).reduce((sum, b) => sum + getBlendValue(b), 0);
}

// ---------------------------------------------------------------------------
// Combined metrics object
// ---------------------------------------------------------------------------

/**
 * selectTobaccoMetrics — compute all canonical tobacco metrics in one call.
 *
 * @param {object[]} blends
 * @returns {{
 *   blend_types: number,
 *   total_quantity_oz: number,
 *   open_blends: number,
 *   cellar_value: number,
 * }}
 */
export function selectTobaccoMetrics(blends) {
  return {
    blend_types: selectBlendTypes(blends),
    total_quantity_oz: selectTotalQuantityOz(blends),
    open_blends: selectOpenBlends(blends),
    cellar_value: selectCellarValue(blends),
  };
}

// ---------------------------------------------------------------------------
// Replacement Difficulty — per-blend
// ---------------------------------------------------------------------------

/**
 * 5-level difficulty system for tobacco blends.
 * Mirrors the whiskey bottle difficulty model.
 */
export const BLEND_DIFFICULTY_LEVELS = {
  VERY_EASY: 'very_easy',
  EASY:      'easy',
  MODERATE:  'moderate',
  HARD:      'hard',
  VERY_HARD: 'very_hard',
};

export const BLEND_DIFFICULTY_LABELS = {
  very_easy: 'Very Easy to Replace',
  easy:      'Easy to Replace',
  moderate:  'Moderately Difficult',
  hard:      'Hard to Replace',
  very_hard: 'Very Hard / Rare',
};

/**
 * Compute the replacement difficulty for a single tobacco blend record.
 * Uses production status, availability signals, and manufacturer continuity.
 *
 * @param {object} blend  - TobaccoBlend record
 * @returns {'very_easy'|'easy'|'moderate'|'hard'|'very_hard'}
 */
export function computeBlendReplacementDifficulty(blend) {
  if (!blend) return BLEND_DIFFICULTY_LEVELS.VERY_EASY;

  const status = (blend.production_status || '').toLowerCase();
  const makerStatus = (blend.manufacturer_status || blend.maker_status || '').toLowerCase();

  const isDiscontinued = !!(
    blend.discontinued ||
    status.includes('discontinue') ||
    status === 'vintage'
  );
  const isLimited = !!(
    blend.limited_batch ||
    blend.is_limited ||
    blend.is_limited_release ||
    status.includes('limited') ||
    status.includes('seasonal')
  );
  const isSeasonal = !!(
    blend.seasonal ||
    blend.is_seasonal ||
    status.includes('seasonal')
  );
  const isRegionalExclusive = !!(
    blend.regional_exclusive ||
    blend.region_exclusive ||
    blend.regional_exclusivity
  );
  const isMakerInactive = !!(
    blend.manufacturer_inactive ||
    makerStatus === 'inactive' ||
    makerStatus === 'defunct' ||
    makerStatus.includes('closed') ||
    makerStatus.includes('no longer')
  );
  const isSecondaryMarketOnly = !!(
    blend.secondary_market_only ||
    (isDiscontinued && isMakerInactive)
  );

  // Very hard: discontinued from an inactive maker, or known secondary-market-only
  if (isSecondaryMarketOnly || (isDiscontinued && isMakerInactive)) return BLEND_DIFFICULTY_LEVELS.VERY_HARD;
  if (isDiscontinued && isRegionalExclusive) return BLEND_DIFFICULTY_LEVELS.VERY_HARD;

  // Hard: discontinued (still findable on secondary market)
  if (isDiscontinued) return BLEND_DIFFICULTY_LEVELS.HARD;
  // Hard: inactive maker + limited stock still in circulation
  if (isMakerInactive && isLimited) return BLEND_DIFFICULTY_LEVELS.HARD;

  // Moderate: seasonal, limited, regional, or maker showing inactivity signs
  if (isLimited || isSeasonal || isRegionalExclusive) return BLEND_DIFFICULTY_LEVELS.MODERATE;
  if (isMakerInactive) return BLEND_DIFFICULTY_LEVELS.MODERATE;

  // Very easy: common, actively produced, widely available blend
  return BLEND_DIFFICULTY_LEVELS.VERY_EASY;
}

/**
 * Compute the cellar/smoke strategy recommendation for a single tobacco blend.
 *
 * @param {object} blend
 * @returns {{ strategy: string, label: string, reason: string, guidance: string }}
 */
export function computeBlendStrategy(blend) {
  if (!blend) return { strategy: 'safe_to_open', label: 'Safe to Open', reason: 'No data available.', guidance: 'Smoke at your own pace.' };

  const difficulty = computeBlendReplacementDifficulty(blend);
  const agingPotential = (blend.aging_potential || '').toLowerCase();
  const totalOz = getBlendTotalOz(blend);

  if (difficulty === BLEND_DIFFICULTY_LEVELS.VERY_HARD) {
    return {
      strategy:  'smoke_deliberately',
      label:     'Hard to Replace — Smoke Deliberately',
      reason:    'Limited availability and known discontinuation or manufacturer closure make this blend very difficult to replenish.',
      guidance:  'Treat remaining stock as finite. Cellar what you can, and smoke thoughtfully.',
    };
  }

  if (difficulty === BLEND_DIFFICULTY_LEVELS.HARD) {
    if (totalOz > 16) {
      return {
        strategy:  'cellar_candidate',
        label:     'Cellar Candidate',
        reason:    'Discontinued or hard-to-find blend with enough stock to age some and still enjoy the rest.',
        guidance:  `You have ${totalOz.toFixed(1)} oz — jar a portion for aging and keep the rest for regular rotation.`,
      };
    }
    return {
      strategy:  'smoke_soon',
      label:     'Smoke Soon',
      reason:    'Discontinued or limited blend with lower stock. Replacement will be difficult.',
      guidance:  'Enjoy at your own pace — replenishment may not be possible when it runs out.',
    };
  }

  if (difficulty === BLEND_DIFFICULTY_LEVELS.MODERATE) {
    if (agingPotential.includes('excellent') || agingPotential.includes('high') || agingPotential.includes('great')) {
      return {
        strategy:  'cellar_candidate',
        label:     'Cellar Candidate',
        reason:    'High aging potential combined with seasonal or limited availability makes this worth cellaring.',
        guidance:  'Keep some jars in rotation while aging the rest — this blend rewards patience.',
      };
    }
    return {
      strategy:  'your_call',
      label:     'Your Call',
      reason:    'Seasonal or limited availability — not urgent, but worth keeping an eye on your stock.',
      guidance:  'Replenish before it goes out of season or sells out. No need to rush through what you have.',
    };
  }

  // Very easy / easy — common, widely available
  if (agingPotential.includes('excellent') || agingPotential.includes('high')) {
    return {
      strategy:  'cellar_candidate',
      label:     'Cellar Candidate',
      reason:    'Widely available blend with excellent aging potential — a low-risk cellar investment.',
      guidance:  'Buy in bulk when the price is right. Age some, smoke the rest freely.',
    };
  }

  return {
    strategy:  'safe_to_open',
    label:     'Safe to Open',
    reason:    'Widely available and easy to replenish — no reason to hold back.',
    guidance:  'Smoke freely. Restock when you run low.',
  };
}
import { selectActiveBlends } from './activeFilters.js';
