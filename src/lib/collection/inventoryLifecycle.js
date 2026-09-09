/**
 * inventoryLifecycle.js
 *
 * Shared inventory lifecycle primitives for collection modules.
 * Currently powers WhiskeyKeeper; designed to be reusable for WineKeeper
 * and CigarKeeper without modification.
 *
 * Core principle: The ITEM record and the INVENTORY quantity are different
 * concepts. An item can remain in the collection with quantity = 0.
 * Zero is a legitimate state. Deleting the record must never be required
 * simply because the last unit was consumed.
 *
 * Lifecycle states:
 *   IN STOCK    — quantity > 0 and not archived
 *   EMPTY       — quantity = 0 and not archived
 *   ARCHIVED    — is_archived = true (independent of quantity)
 *
 * Archive is non-destructive and reversible. Delete is separate and destructive.
 */

// ---------------------------------------------------------------------------
// Collection filter definitions
// ---------------------------------------------------------------------------

export const COLLECTION_FILTERS = {
  ALL: 'all',
  IN_STOCK: 'in_stock',
  EMPTY: 'empty',
  ARCHIVED: 'archived',
};

export const COLLECTION_FILTER_LABELS = {
  all: 'All',
  in_stock: 'In Stock',
  empty: 'Empty / Finished',
  archived: 'Archived',
};

// ---------------------------------------------------------------------------
// Quantity resolution — NEVER coerces zero to one
// ---------------------------------------------------------------------------

/**
 * Resolve the current inventory count for an item.
 *
 * If inventory unit rows exist (modern mode), count = number of unit rows.
 * Otherwise (legacy mode), count = the item's quantity/bottle_count field.
 *
 * Zero is returned as zero. Null/undefined is treated as zero, NOT one.
 *
 * @param {object} item - The collection item record (Bottle, Wine, Cigar, etc.)
 * @param {number} inventoryUnitCount - Count of inventory unit rows for this item (0 if none)
 * @param {boolean} hasInventoryUnits - Whether any inventory unit rows exist at all
 * @param {string[]} quantityFields - Field names to check for legacy quantity (e.g. ['bottle_count', 'quantity'])
 * @returns {number}
 */
export function getInventoryCount(item, inventoryUnitCount = 0, hasInventoryUnits = false, quantityFields = ['bottle_count', 'quantity']) {
  if (hasInventoryUnits) {
    return Math.max(0, Number(inventoryUnitCount) || 0);
  }

  if (!item) return 0;

  for (const field of quantityFields) {
    const val = Number(item[field]);
    if (Number.isFinite(val) && val > 0) return val;
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Lifecycle classification
// ---------------------------------------------------------------------------

/**
 * Classify an item into its lifecycle state for filtering.
 *
 * @param {object} item
 * @param {number} inventoryCount - Current inventory count (from getInventoryCount)
 * @returns {'in_stock' | 'empty' | 'archived'}
 */
export function getLifecycleState(item, inventoryCount = 0) {
  if (item?.is_archived === true) return COLLECTION_FILTERS.ARCHIVED;
  if (inventoryCount > 0) return COLLECTION_FILTERS.IN_STOCK;
  return COLLECTION_FILTERS.EMPTY;
}

/**
 * Filter items by collection filter.
 *
 * @param {object[]} items
 * @param {'all' | 'in_stock' | 'empty' | 'archived'} filter
 * @param {function} getInventoryCountFn - (item) => number
 * @returns {object[]}
 */
export function filterByLifecycle(items, filter, getInventoryCountFn) {
  if (!Array.isArray(items)) return [];

  if (filter === COLLECTION_FILTERS.ALL) {
    return items;
  }

  return items.filter((item) => {
    const state = getLifecycleState(item, getInventoryCountFn(item));
    return state === filter;
  });
}

// ---------------------------------------------------------------------------
// Archive / Unarchive payload builders
// ---------------------------------------------------------------------------

/**
 * Build the update payload to archive an item.
 * Does NOT mutate — caller applies the update.
 *
 * @returns {{ is_archived: boolean, archived_at: string }}
 */
export function buildArchivePayload() {
  return {
    is_archived: true,
    archived_at: new Date().toISOString(),
  };
}

/**
 * Build the update payload to unarchive (restore) an item.
 *
 * @returns {{ is_archived: boolean, archived_at: null }}
 */
export function buildUnarchivePayload() {
  return {
    is_archived: false,
    archived_at: null,
  };
}

// ---------------------------------------------------------------------------
// Finish Bottle / Add Bottle logic
// ---------------------------------------------------------------------------

/**
 * Determine the result of a "finish one unit" action.
 *
 * If inventory unit rows exist: the caller should DELETE one unit row.
 * If legacy mode (no unit rows): the caller should DECREMENT the quantity
 *   field by 1 (not below 0).
 *
 * @param {object} item
 * @param {number} inventoryUnitCount
 * @param {boolean} hasInventoryUnits
 * @param {string[]} quantityFields
 * @returns {{ action: 'delete_unit' | 'decrement_field' | 'noop', newCount: number, field?: string }}
 */
export function planFinishUnit(item, inventoryUnitCount = 0, hasInventoryUnits = false, quantityFields = ['bottle_count', 'quantity']) {
  const currentCount = getInventoryCount(item, inventoryUnitCount, hasInventoryUnits, quantityFields);

  if (currentCount <= 0) {
    return { action: 'noop', newCount: 0 };
  }

  if (hasInventoryUnits) {
    return { action: 'delete_unit', newCount: currentCount - 1 };
  }

  // Legacy mode: decrement the first positive quantity field
  for (const field of quantityFields) {
    const val = Number(item?.[field]);
    if (Number.isFinite(val) && val > 0) {
      return { action: 'decrement_field', newCount: Math.max(0, val - 1), field };
    }
  }

  return { action: 'noop', newCount: 0 };
}

/**
 * Determine the result of an "add one unit" action.
 *
 * If inventory unit rows exist: the caller should CREATE one unit row.
 * If legacy mode (no unit rows): the caller should INCREMENT the quantity
 *   field by 1.
 *
 * If the item is archived and receives new inventory, the caller should
 * also unarchive it (restore to collection).
 *
 * @param {object} item
 * @param {boolean} hasInventoryUnits
 * @param {string[]} quantityFields
 * @returns {{ action: 'create_unit' | 'increment_field', newCount: number, field?: string, shouldUnarchive: boolean }}
 */
export function planAddUnit(item, hasInventoryUnits = false, quantityFields = ['bottle_count', 'quantity']) {
  const shouldUnarchive = item?.is_archived === true;

  if (hasInventoryUnits) {
    return { action: 'create_unit', newCount: 1, shouldUnarchive };
  }

  // Legacy mode: increment the first quantity field (or bottle_count if all are 0)
  const field = quantityFields[0] || 'bottle_count';
  const currentVal = Number(item?.[field]) || 0;

  return { action: 'increment_field', newCount: currentVal + 1, field, shouldUnarchive };
}