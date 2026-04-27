/**
 * wineSelectors.js
 *
 * Canonical, pure selector functions for all WineKeeper-derived metrics.
 *
 * Value priority chain (mirrors WineInsights.jsx calculation):
 *   1. manual_estimated_value × qty  (when manual_valuation_enabled)
 *   2. estimated_total_value
 *   3. market_estimated_total_value
 *   4. estimated_unit_value × qty
 *   5. market_estimated_unit_value × qty
 *   6. estimated_value × qty          (legacy field)
 *   7. 0
 */

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

// ---------------------------------------------------------------------------
// Single-wine helpers
// ---------------------------------------------------------------------------

/**
 * Return the canonical quantity for one Wine record.
 * @param {object} wine
 * @returns {number}
 */
export function getWineQuantity(wine) {
  if (!wine) return 0;
  return Math.max(1, n(wine.quantity) || 1);
}

/**
 * Return the canonical per-bottle unit value for one Wine record.
 * @param {object} wine
 * @returns {number}
 */
export function getWineUnitValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && n(wine.manual_estimated_value) > 0) {
    return n(wine.manual_estimated_value);
  }
  if (n(wine.estimated_total_value) > 0) return n(wine.estimated_total_value) / qty;
  if (n(wine.market_estimated_total_value) > 0) return n(wine.market_estimated_total_value) / qty;
  if (n(wine.estimated_unit_value) > 0) return n(wine.estimated_unit_value);
  if (n(wine.market_estimated_unit_value) > 0) return n(wine.market_estimated_unit_value);
  if (n(wine.estimated_value) > 0) return n(wine.estimated_value);
  return 0;
}

/**
 * Return the canonical total value for one Wine record (unit value × quantity).
 * @param {object} wine
 * @returns {number}
 */
export function getWineTotalValue(wine) {
  if (!wine) return 0;
  const qty = getWineQuantity(wine);
  if (wine.manual_valuation_enabled && n(wine.manual_estimated_value) > 0) {
    return n(wine.manual_estimated_value) * qty;
  }
  if (n(wine.estimated_total_value) > 0) return n(wine.estimated_total_value);
  if (n(wine.market_estimated_total_value) > 0) return n(wine.market_estimated_total_value);
  if (n(wine.estimated_unit_value) > 0) return n(wine.estimated_unit_value) * qty;
  if (n(wine.market_estimated_unit_value) > 0) return n(wine.market_estimated_unit_value) * qty;
  if (n(wine.estimated_value) > 0) return n(wine.estimated_value) * qty;
  return 0;
}

/**
 * Return true when a wine has any valuation data.
 * @param {object} wine
 * @returns {boolean}
 */
export function hasWineValuation(wine) {
  if (!wine) return false;
  return (
    n(wine.manual_estimated_value) > 0 ||
    n(wine.estimated_total_value) > 0 ||
    n(wine.market_estimated_total_value) > 0 ||
    n(wine.estimated_unit_value) > 0 ||
    n(wine.market_estimated_unit_value) > 0 ||
    n(wine.estimated_value) > 0
  );
}

// ---------------------------------------------------------------------------
// Collection-level selectors
// ---------------------------------------------------------------------------

/**
 * Total number of wine records.
 * @param {object[]} wines
 * @returns {number}
 */
export function selectWineCount(wines) {
  return Array.isArray(wines) ? wines.length : 0;
}

/**
 * Total bottles in cellar (sum of quantities).
 * @param {object[]} wines
 * @returns {number}
 */
export function selectTotalWineBottles(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.reduce((s, w) => s + getWineQuantity(w), 0);
}

/**
 * Total collection value.
 * @param {object[]} wines
 * @returns {number}
 */
export function selectWineCollectionValue(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.reduce((s, w) => s + getWineTotalValue(w), 0);
}

/**
 * Count of wines without any valuation data.
 * @param {object[]} wines
 * @returns {number}
 */
export function selectUnvaluedWineCount(wines) {
  if (!Array.isArray(wines)) return 0;
  return wines.filter((w) => !hasWineValuation(w)).length;
}
