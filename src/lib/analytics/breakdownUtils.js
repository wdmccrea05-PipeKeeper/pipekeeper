/**
 * breakdownUtils.js
 *
 * Canonical helpers for building field breakdowns, top-N lists, and
 * count maps used by dashboards, insights pages, and reports.
 *
 * Every screen that shows a breakdown chart or a "top N" list must
 * import from here so the aggregation logic is identical everywhere.
 */

import { getAverageRating } from '@/shared/utils/calculations/collectionStats';

// ---------------------------------------------------------------------------
// Field breakdown
// ---------------------------------------------------------------------------

/**
 * Build a count map keyed by a field value.
 * Items with a falsy field value are ignored.
 *
 * @param {object[]} items
 * @param {string}   field - record field name
 * @returns {Record<string, number>}
 */
export function selectBreakdownByField(items, field) {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, item) => {
    const value = item?.[field];
    if (value == null || value === '') return acc;
    const key = String(value);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Like selectBreakdownByField but returns an array of { name, value } objects
 * sorted descending by count, optionally limited to `limit` entries.
 *
 * @param {object[]} items
 * @param {string}   field
 * @param {number}   [limit]
 * @returns {{ name: string, value: number }[]}
 */
export function selectBreakdownArray(items, field, limit) {
  const map = selectBreakdownByField(items, field);
  const arr = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
  return limit != null ? arr.slice(0, limit) : arr;
}

// ---------------------------------------------------------------------------
// Top-N selectors
// ---------------------------------------------------------------------------

/**
 * Return the top N items by a numeric field (descending).
 *
 * @param {object[]} items
 * @param {string}   field      - numeric field to rank by
 * @param {number}   [n=5]
 * @param {{ minValue?: number, filter?: function }} [options]
 * @returns {object[]}
 */
export function selectTopByField(items, field, n = 5, { minValue = 0, filter } = {}) {
  if (!Array.isArray(items)) return [];
  let list = items.filter((item) => Number(item?.[field] ?? 0) > minValue);
  if (typeof filter === 'function') list = list.filter(filter);
  return [...list]
    .sort((a, b) => Number(b?.[field] ?? 0) - Number(a?.[field] ?? 0))
    .slice(0, n);
}

/**
 * Return the top N items by a session/log count.
 * Uses a pre-built index (Record<itemId, count>) for O(1) lookups.
 *
 * @param {object[]}             items    - collection records
 * @param {Record<string, number>} index  - item id → count
 * @param {number}               [n=5]
 * @returns {{ item: object, count: number }[]}
 */
export function selectTopByIndex(items, index, n = 5) {
  if (!Array.isArray(items) || !index) return [];
  return items
    .map((item) => ({ item, count: index[item?.id] || 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Rating helpers (canonical rounding)
// ---------------------------------------------------------------------------

/**
 * Compute the average rating for a collection, rounded to `decimals` places.
 * Returns null when no items have a valid rating.
 *
 * Uses the canonical getAverageRating() from collectionStats for the
 * calculation — this is a display-ready wrapper that adds consistent rounding.
 *
 * @param {object[]} items
 * @param {string}   [field='rating']
 * @param {number}   [decimals=2]
 * @returns {string|null} - formatted string like "4.25" or null
 */
export function selectDisplayRating(items, field = 'rating', decimals = 2) {
  const raw = getAverageRating(items, (item) => item?.[field]);
  if (raw == null) return null;
  return raw.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// Favorites / acquisition status counts
// ---------------------------------------------------------------------------

/**
 * Count items where a boolean flag field is truthy.
 *
 * @param {object[]} items
 * @param {string}   field
 * @returns {number}
 */
export function selectFlagCount(items, field) {
  if (!Array.isArray(items)) return 0;
  return items.filter((item) => !!item?.[field]).length;
}

/**
 * Count favorite items (is_favorite === true).
 *
 * @param {object[]} items
 * @returns {number}
 */
export function selectFavoriteCount(items) {
  return selectFlagCount(items, 'is_favorite');
}

/**
 * Count wishlist items (wishlist === true).
 *
 * @param {object[]} items
 * @returns {number}
 */
export function selectWishlistCount(items) {
  return selectFlagCount(items, 'wishlist');
}

/**
 * Count shopping-list items (shopping_list === true).
 *
 * @param {object[]} items
 * @returns {number}
 */
export function selectShoppingListCount(items) {
  return selectFlagCount(items, 'shopping_list');
}
