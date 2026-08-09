/**
 * activeFilters.js
 *
 * Canonical "active item" predicates for every collection module.
 *
 * A record is considered ACTIVE when it is NOT any of:
 *   archived, deleted, inactive, retired, hidden
 *
 * These filters must be applied consistently at every data boundary —
 * dashboards, insights pages, reports, and AI context builders — so that
 * archived items are never counted on one screen but not another.
 *
 * Usage:
 *   import { selectActivePipes, selectActiveBlends } from '@/lib/collection/activeFilters';
 *   const activePipes = selectActivePipes(pipes);
 */

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

function isBaseActive(record) {
  if (!record) return false;
  if (record.archived === true)  return false;
  if (record.deleted === true)   return false;
  if (record.inactive === true)  return false;
  if (record.hidden === true)    return false;
  if (record.is_archived === true) return false;
  if (record.is_deleted === true)  return false;
  return true;
}

function filterActive(records, predicate = () => true) {
  if (!Array.isArray(records)) return [];
  return records.filter((record) => isBaseActive(record) && predicate(record));
}

// ---------------------------------------------------------------------------
// Per-module selectors
// ---------------------------------------------------------------------------

/**
 * Return only active Pipe records.
 *
 * @param {object[]} pipes
 * @returns {object[]}
 */
export function selectActivePipes(pipes) {
  return filterActive(pipes, (pipe) => pipe?.retired !== true);
}

/**
 * Return only active TobaccoBlend records.
 * Blends with a `finished` flag are treated as consumed but still countable
 * for historical analytics — only truly deleted/archived records are excluded.
 *
 * @param {object[]} blends
 * @returns {object[]}
 */
export function selectActiveBlends(blends) {
  return filterActive(blends, (blend) => blend?.retired !== true);
}

/**
 * Return only active Bottle (whiskey) records.
 *
 * @param {object[]} bottles
 * @returns {object[]}
 */
export function selectActiveBottles(bottles) {
  return filterActive(bottles, (bottle) => bottle?.retired !== true);
}

/**
 * Return only active Wine records.
 *
 * @param {object[]} wines
 * @returns {object[]}
 */
export function selectActiveWines(wines) {
  return filterActive(wines, (wine) => wine?.retired !== true);
}

/**
 * Return only active Cigar records.
 *
 * @param {object[]} cigars
 * @returns {object[]}
 */
export function selectActiveCigars(cigars) {
  return filterActive(cigars, (cigar) => cigar?.retired !== true);
}

/**
 * Return only active WhiskeyInventoryUnit records.
 *
 * @param {object[]} inventoryUnits
 * @returns {object[]}
 */
export function selectActiveInventoryUnits(inventoryUnits) {
  return filterActive(inventoryUnits, (unit) => unit?.retired !== true);
}

/**
 * Canonical predicate exposed for consumers that need to filter inline.
 * Prefer the typed selectors above in most cases.
 */
export { isBaseActive as isActiveRecord };
