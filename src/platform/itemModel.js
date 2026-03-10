// platform/itemModel.js
// Shared item model for the CollectionKeeper platform.
//
// All collection items — regardless of module (pipe, tobacco, whiskey, cigar, coffee) —
// share a common set of platform-level fields. This module provides helpers for
// normalizing raw module records into that shared shape, without rewriting any
// existing schema or breaking existing CRUD flows.
//
// Shared platform fields:
//   module_type        — which collection module this item belongs to
//   estimated_value    — estimated current market value
//   purchase_price     — what the collector paid
//   favorite           — user has marked this item as a favorite
//   ai_excluded        — exclude this item from AI recommendations
//   public_visibility  — item is visible in shared/public collections

import { isValidModuleType, MODULE_TYPES } from "./moduleTypes.js";

/**
 * Normalize a raw item record into the shared platform item shape.
 * All original fields are preserved in `_raw`.
 *
 * @param {object} rawItem - Original record from the database / API.
 * @param {string} [moduleType] - Module type override; falls back to rawItem.module_type.
 * @returns {object} Normalized platform item.
 */
export function normalizeItem(rawItem, moduleType) {
  if (!rawItem) return null;

  const resolvedModuleType =
    rawItem.module_type && isValidModuleType(rawItem.module_type)
      ? rawItem.module_type
      : moduleType && isValidModuleType(moduleType)
        ? moduleType
        : null;

  return {
    id: rawItem.id,
    module_type: resolvedModuleType,
    name: rawItem.name ?? rawItem.brand ?? null,
    estimated_value: rawItem.estimated_value ?? null,
    purchase_price: rawItem.purchase_price ?? null,
    // Support both `is_favorite` (existing PipeKeeper field) and `favorite`
    favorite: rawItem.is_favorite ?? rawItem.favorite ?? false,
    ai_excluded: rawItem.ai_excluded ?? false,
    // Default to publicly visible; explicit false opts item out
    public_visibility: rawItem.public_visibility ?? true,
    _raw: rawItem,
  };
}

/**
 * Normalize an array of raw items.
 *
 * @param {object[]} rawItems
 * @param {string} [moduleType] - Applied to all items that lack their own module_type.
 * @returns {object[]}
 */
export function normalizeItems(rawItems, moduleType) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => normalizeItem(item, moduleType));
}

/**
 * Normalize a mixed collection of PipeKeeper pipes and tobacco blends into
 * a unified platform item array. Preserves all original fields via `_raw`.
 *
 * @param {{ pipes?: object[], blends?: object[] }} collections
 * @returns {object[]}
 */
export function normalizePipeKeeperItems({ pipes = [], blends = [] } = {}) {
  return [
    ...normalizeItems(pipes, MODULE_TYPES.PIPE),
    ...normalizeItems(blends, MODULE_TYPES.TOBACCO),
  ];
}
