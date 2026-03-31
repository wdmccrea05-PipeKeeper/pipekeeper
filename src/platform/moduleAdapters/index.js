// platform/moduleAdapters/index.js
// Module adapter registry for the CollectionKeeper platform.
//
// Adapters bridge module-specific item fields to the shared platform model.
// Future modules (whiskey, cigar, coffee) register their adapters here so the
// platform layer can resolve them by module type without hardcoded conditionals.

import { pipeAdapter, tobaccoAdapter } from "./pipeAdapter.js";
import { whiskeyAdapter } from "./whiskeyAdapter.js";
import { MODULE_TYPES } from "../moduleTypes.js";

/**
 * Registry of all registered module adapters, keyed by module type string.
 * @type {Record<string, object>}
 */
const adapterRegistry = {
  [MODULE_TYPES.PIPE]: pipeAdapter,
  [MODULE_TYPES.TOBACCO]: tobaccoAdapter,
  [MODULE_TYPES.WHISKEY]: whiskeyAdapter,
  // Future modules register here:
  // [MODULE_TYPES.CIGAR]: cigarAdapter,
  // [MODULE_TYPES.COFFEE]: coffeeAdapter,
};

/**
 * Retrieve the adapter for a given module type.
 *
 * @param {string} moduleType - One of MODULE_TYPES values.
 * @returns {object|null} The adapter, or null if none is registered.
 */
export function getAdapter(moduleType) {
  return adapterRegistry[moduleType] ?? null;
}

/**
 * Normalize a raw item record to the shared platform item shape using
 * the appropriate module adapter.
 *
 * @param {object} rawItem
 * @param {string} moduleType
 * @returns {object|null}
 */
export function normalizeItemForPlatform(rawItem, moduleType) {
  const adapter = getAdapter(moduleType);
  if (!adapter) return rawItem ?? null;
  return adapter.normalizeItem(rawItem);
}

/**
 * Retrieve the usage profile for an item via its module adapter.
 * Returns null if no adapter is found.
 *
 * @param {object} rawItem
 * @param {string} moduleType
 * @returns {object|null}
 */
export function getItemUsageProfile(rawItem, moduleType) {
  const adapter = getAdapter(moduleType);
  if (!adapter || !adapter.getUsageProfile) return null;
  return adapter.getUsageProfile(rawItem);
}

/**
 * Check AI eligibility for an item via its module adapter.
 * Falls back to the platform-level ai_excluded flag if no adapter is found.
 *
 * @param {object} rawItem
 * @param {string} moduleType
 * @returns {boolean}
 */
export function isItemAiEligibleViaAdapter(rawItem, moduleType) {
  const adapter = getAdapter(moduleType);
  if (!adapter || !adapter.isAiEligible) return !rawItem?.ai_excluded;
  return adapter.isAiEligible(rawItem);
}

export { pipeAdapter, tobaccoAdapter, whiskeyAdapter };