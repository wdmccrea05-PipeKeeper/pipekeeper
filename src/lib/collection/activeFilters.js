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

/**
 * Return true when the record should be counted in analytics.
 * Checks the most common soft-delete / archive field names used across modules.
 *
 * @param {object} record
 * @returns {boolean}
 */
function isActive(record) {
  if (!record) return false;
  if (record.archived === true)  return false;
  if (record.deleted === true)   return false;
  if (record.inactive === true)  return false;
  if (record.retired === true)   return false;
  if (record.hidden === true)    return false;
  if (record.is_archived === true) return false;
  if (record.is_deleted === true)  return false;
  return true;
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
  if (!Array.isArray(pipes)) return [];
  return pipes.filter(isActive);
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
  if (!Array.isArray(blends)) return [];
  return blends.filter(isActive);
}

/**
 * Return only active Bottle (whiskey) records.
 *
 * @param {object[]} bottles
 * @returns {object[]}
 */
export function selectActiveBottles(bottles) {
  if (!Array.isArray(bottles)) return [];
  return bottles.filter(isActive);
}

/**
 * Return only active Wine records.
 *
 * @param {object[]} wines
 * @returns {object[]}
 */
export function selectActiveWines(wines) {
  if (!Array.isArray(wines)) return [];
  return wines.filter(isActive);
}

/**
 * Return only active Cigar records.
 *
 * @param {object[]} cigars
 * @returns {object[]}
 */
export function selectActiveCigars(cigars) {
  if (!Array.isArray(cigars)) return [];
  return cigars.filter(isActive);
}

/**
 * Return only active WhiskeyInventoryUnit records.
 *
 * @param {object[]} inventoryUnits
 * @returns {object[]}
 */
export function selectActiveInventoryUnits(inventoryUnits) {
  if (!Array.isArray(inventoryUnits)) return [];
  return inventoryUnits.filter(isActive);
}

/**
 * Canonical predicate exposed for consumers that need to filter inline.
 * Prefer the typed selectors above in most cases.
 */
export { isActive as isActiveRecord };
