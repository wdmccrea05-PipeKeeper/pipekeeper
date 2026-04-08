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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
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
 * Return the canonical value for one Cigar record.
 *
 * Priority: estimated_value → purchase_price → 0
 *
 * @param {object} cigar
 * @returns {number}
 */
export function getCigarUnitValue(cigar) {
  if (!cigar) return 0;
  if (n(cigar.estimated_value) > 0) return n(cigar.estimated_value);
  if (n(cigar.purchase_price) > 0) return n(cigar.purchase_price);
  return 0;
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
  return Array.isArray(cigars) ? cigars.length : 0;
}

/**
 * total_sticks — total cigar inventory units in single-stick equivalents.
 *
 * @param {object[]} cigars
 * @returns {number}
 */
export function selectTotalSticks(cigars) {
  if (!Array.isArray(cigars)) return 0;
  return cigars.reduce((sum, c) => sum + getCigarAvailableQuantity(c), 0);
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
  if (!Array.isArray(cigars)) return 0;
  return cigars.filter((c) => {
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
  if (!Array.isArray(cigars)) return 0;
  return cigars.reduce((sum, c) => {
    return sum + getCigarUnitValue(c) * getCigarAvailableQuantity(c);
  }, 0);
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
  return {
    cigar_types: selectCigarTypes(cigars),
    total_sticks: selectTotalSticks(cigars),
    ready_to_smoke_count: selectReadyToSmokeCount(cigars),
    humidor_count: selectHumidorCount(humidors),
    collection_value: selectCigarCollectionValue(cigars),
  };
}
