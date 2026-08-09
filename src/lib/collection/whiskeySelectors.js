/**
 * whiskeySelectors.js
 *
 * Canonical, pure selector functions for all WhiskeyKeeper-derived metrics.
 *
 * NO component-level ad-hoc calculations. Every screen in the app that displays
 * whiskey counts, totals, or values must import from here.
 *
 * Standardised definitions (enforced here, nowhere else):
 *
 *  bottle_types    — count of distinct Bottle records (unique labels / products)
 *  total_bottles   — total physical inventory units across all Bottle records
 *  open_bottles    — inventory units with status === 'open'
 *  sealed_bottles  — inventory units with status === 'reserve' or 'drinking'
 *  collection_value — sum of (unit_value × unit_count) per Bottle record
 *  total_tastings  — count of TastingLog records tied to whiskey items
 *
 * Canonical value priority (highest to lowest):
 *   manual_value_override → collector_value → aftermarket_price → retail_price → purchase_price → 0
 */

import { selectActiveBottles, selectActiveInventoryUnits } from './activeFilters.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// ---------------------------------------------------------------------------
// Single-bottle value (one physical unit)
// ---------------------------------------------------------------------------

/**
 * Return the canonical per-unit value for a Bottle record.
 *
 * Priority:
 *   manual_value_override → collector_value → aftermarket_price → retail_price → purchase_price → 0
 *
 * @param {object} bottle
 * @returns {number}
 */
export function getBottleUnitValue(bottle) {
  if (!bottle) return 0;
  if (n(bottle.manual_value_override) > 0) return n(bottle.manual_value_override);
  if (n(bottle.collector_value) > 0) return n(bottle.collector_value);
  if (n(bottle.aftermarket_price) > 0) return n(bottle.aftermarket_price);
  if (n(bottle.retail_price) > 0) return n(bottle.retail_price);
  if (n(bottle.purchase_price) > 0) return n(bottle.purchase_price);
  return 0;
}

// ---------------------------------------------------------------------------
// Inventory index
// ---------------------------------------------------------------------------

/**
 * Build a map of { bottle_id → unit count } from WhiskeyInventoryUnit records.
 * Each inventory unit row represents exactly one physical bottle.
 *
 * @param {object[]} inventoryUnits - WhiskeyInventoryUnit records
 * @returns {Record<string, number>}
 */
export function buildWhiskeyInventoryIndex(inventoryUnits) {
  return selectActiveInventoryUnits(inventoryUnits).reduce((acc, unit) => {
    if (!unit?.bottle_id) return acc;
    acc[unit.bottle_id] = (acc[unit.bottle_id] || 0) + 1;
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Core metric selectors
// ---------------------------------------------------------------------------

/**
 * bottle_types — count of distinct Bottle records (unique labels/products).
 * Always equals bottles.length regardless of inventory depth.
 *
 * @param {object[]} bottles
 * @returns {number}
 */
export function selectBottleTypes(bottles) {
  return selectActiveBottles(bottles).length;
}

/**
 * total_bottles — total physical inventory unit count.
 *
 * If WhiskeyInventoryUnit records exist for the user, total = inventoryUnits.length
 * (each row = one physical bottle).
 * Otherwise falls back to summing the legacy bottle_count field (defaults to 1).
 *
 * @param {object[]} bottles
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectTotalBottles(bottles, inventoryUnits) {
  const units = selectActiveInventoryUnits(inventoryUnits);
  if (units.length > 0) return units.length;
  return selectActiveBottles(bottles).reduce(
    (sum, b) => sum + (n(b.bottle_count) || 1),
    0
  );
}

/**
 * open_bottles — count of inventory units with status === 'open'.
 * Returns 0 when no inventory units exist (legacy mode).
 *
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectOpenBottles(inventoryUnits) {
  const units = selectActiveInventoryUnits(inventoryUnits);
  if (units.length === 0) return 0;
  return units.filter((u) => u?.status === 'open').length;
}

/**
 * sealed_bottles — count of inventory units not yet opened.
 * Includes 'reserve' and 'drinking' (unopened, available for future consumption).
 * Returns 0 when no inventory units exist (legacy mode).
 *
 * Relationship guarantee: open_bottles + sealed_bottles === total_bottles
 * (provided all units have a recognized status).
 *
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectSealedBottles(inventoryUnits) {
  const units = selectActiveInventoryUnits(inventoryUnits);
  if (units.length === 0) return 0;
  return units.filter(
    (u) => u?.status === 'reserve' || u?.status === 'drinking'
  ).length;
}

/**
 * collection_value — sum of (unit_value × unit_count) per Bottle record.
 *
 * If inventory units exist, unit_count = number of WhiskeyInventoryUnit rows for
 * that bottle_id. Otherwise unit_count falls back to bottle.bottle_count || 1.
 *
 * @param {object[]} bottles
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectCollectionValue(bottles, inventoryUnits) {
  const bottleList = selectActiveBottles(bottles);
  const units = selectActiveInventoryUnits(inventoryUnits);
  const hasUnits = units.length > 0;
  const idx = buildWhiskeyInventoryIndex(units);

  return bottleList.reduce((sum, b) => {
    if (!b) return sum;
    const unitValue = getBottleUnitValue(b);
    const count = hasUnits ? Math.max(0, idx[b.id] || 0) : n(b.bottle_count) || 1;
    return sum + unitValue * count;
  }, 0);
}

/**
 * total_tastings — count of TastingLog records.
 *
 * @param {object[]} tastingLogs
 * @returns {number}
 */
export function selectTotalTastings(tastingLogs) {
  return Array.isArray(tastingLogs) ? tastingLogs.length : 0;
}

// ---------------------------------------------------------------------------
// Open / sealed value breakdown
// ---------------------------------------------------------------------------

/**
 * Return the collection value for open bottles only.
 *
 * @param {object[]} bottles
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectOpenBottleValue(bottles, inventoryUnits) {
  const bottleList = selectActiveBottles(bottles);
  const units = selectActiveInventoryUnits(inventoryUnits);
  if (units.length === 0) return 0;
  const openIds = new Set(
    units.filter((u) => u?.status === 'open').map((u) => u.bottle_id).filter(Boolean)
  );
  const openIdx = units
    .filter((u) => u?.status === 'open' && u.bottle_id)
    .reduce((acc, u) => {
      acc[u.bottle_id] = (acc[u.bottle_id] || 0) + 1;
      return acc;
    }, {});
  return bottleList
    .filter((b) => openIds.has(b?.id))
    .reduce((sum, b) => sum + getBottleUnitValue(b) * (openIdx[b.id] || 1), 0);
}

/**
 * Return the collection value for sealed bottles only.
 *
 * @param {object[]} bottles
 * @param {object[]} inventoryUnits
 * @returns {number}
 */
export function selectSealedBottleValue(bottles, inventoryUnits) {
  const bottleList = selectActiveBottles(bottles);
  const units = selectActiveInventoryUnits(inventoryUnits);
  if (units.length === 0) return 0;
  const sealedStatuses = new Set(['reserve', 'drinking']);
  const sealedIds = new Set(
    units.filter((u) => sealedStatuses.has(u?.status)).map((u) => u.bottle_id).filter(Boolean)
  );
  const sealedIdx = units
    .filter((u) => sealedStatuses.has(u?.status) && u.bottle_id)
    .reduce((acc, u) => {
      acc[u.bottle_id] = (acc[u.bottle_id] || 0) + 1;
      return acc;
    }, {});
  return bottleList
    .filter((b) => sealedIds.has(b?.id))
    .reduce((sum, b) => sum + getBottleUnitValue(b) * (sealedIdx[b.id] || 1), 0);
}

// ---------------------------------------------------------------------------
// Combined metrics object
// ---------------------------------------------------------------------------

/**
 * selectWhiskeyMetrics — compute all canonical whiskey metrics in one call.
 *
 * @param {object[]} bottles        - Bottle records
 * @param {object[]} inventoryUnits - WhiskeyInventoryUnit records
 * @param {object[]} tastingLogs    - TastingLog records
 * @returns {{
 *   bottle_types: number,
 *   total_bottles: number,
 *   open_bottles: number,
 *   sealed_bottles: number,
 *   collection_value: number,
 *   total_tastings: number,
 * }}
 */
export function selectWhiskeyMetrics(bottles, inventoryUnits, tastingLogs) {
  return {
    bottle_types: selectBottleTypes(bottles),
    total_bottles: selectTotalBottles(bottles, inventoryUnits),
    open_bottles: selectOpenBottles(inventoryUnits),
    sealed_bottles: selectSealedBottles(inventoryUnits),
    collection_value: selectCollectionValue(bottles, inventoryUnits),
    total_tastings: selectTotalTastings(tastingLogs),
  };
}
