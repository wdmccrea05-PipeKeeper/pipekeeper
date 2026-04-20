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
    : (explicitInput || !valuation?.isMissing ? 0 : null);

  let unitValue = null;
  if (hasCalculatedUnit) {
    unitValue = Math.max(0, n(valuation.estimatedUnitValue));
  } else if (totalValue != null && qty > 0) {
    unitValue = totalValue / qty;
  } else if (explicitInput || !valuation?.isMissing) {
    unitValue = 0;
  }

  return {
    totalValue,
    unitValue,
    hasValuation: totalValue != null,
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
  if (!Array.isArray(cigars)) return 0;
  return cigars.filter((c) => hasCigarValuation(c)).length;
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
  return cigars.reduce((sum, c) => sum + getCigarTotalValue(c), 0);
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
