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
  return (
    n(blend.tin_total_quantity_oz) +
    n(blend.bulk_total_quantity_oz) +
    n(blend.pouch_total_quantity_oz)
  );
}

/**
 * Return the canonical value for one TobaccoBlend record.
 *
 * Priority: manual_market_value → ai_estimated_value × total_oz → price_per_oz × total_oz → 0
 *
 * @param {object} blend
 * @returns {number}
 */
export function getBlendValue(blend) {
  if (!blend) return 0;

  if (n(blend.manual_market_value) > 0) return n(blend.manual_market_value);

  const totalOz = getBlendTotalOz(blend);

  if (n(blend.ai_estimated_value) > 0 && totalOz > 0) {
    return n(blend.ai_estimated_value) * totalOz;
  }

  if (n(blend.price_per_oz) > 0 && totalOz > 0) {
    return n(blend.price_per_oz) * totalOz;
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
  return Array.isArray(blends) ? blends.length : 0;
}

/**
 * total_quantity_oz — summed quantity across all owned tobacco blends (oz).
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectTotalQuantityOz(blends) {
  if (!Array.isArray(blends)) return 0;
  return blends.reduce((sum, b) => sum + getBlendTotalOz(b), 0);
}

/**
 * open_blends — number of blends that have at least one opened container.
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectOpenBlends(blends) {
  if (!Array.isArray(blends)) return 0;
  return blends.filter(isBlendOpen).length;
}

/**
 * cellar_value — total value of owned tobacco inventory.
 *
 * @param {object[]} blends
 * @returns {number}
 */
export function selectCellarValue(blends) {
  if (!Array.isArray(blends)) return 0;
  return blends.reduce((sum, b) => sum + getBlendValue(b), 0);
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
