// platform/entitlements.js
// Module entitlement architecture for the CollectionKeeper platform.
//
// Prepares the entitlement system to support multiple collection modules
// (pipes, tobacco, whiskey, cigars, coffee) without changing current
// PipeKeeper subscription behavior.
//
// Current state: pipes and tobacco are always enabled for all tiers.
// Future state: each module can be independently enabled per subscription plan.
//
// This file introduces the concept cleanly in the service layer so the system
// can later check module entitlements without duplicated platform logic.

export const PLATFORM_MODULES = {
  PIPE: "pipes",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigars",
  COFFEE: "coffee",
};

// Modules enabled for all current PipeKeeper subscribers.
// This list is the source of truth for which modules are active in this build.
export const PIPEKEEPER_ENABLED_MODULES = [
  PLATFORM_MODULES.PIPE,
  PLATFORM_MODULES.TOBACCO,
];

/**
 * Returns true if the given module is enabled for a user.
 * Currently always returns true for pipes and tobacco (PipeKeeper behavior).
 * Future modules will require explicit entitlement.
 *
 * @param {string} moduleKey - One of PLATFORM_MODULES values.
 * @param {string[]} [enabledModules] - Override the enabled modules list.
 * @returns {boolean}
 */
export function isModuleEnabled(moduleKey, enabledModules = PIPEKEEPER_ENABLED_MODULES) {
  return enabledModules.includes(moduleKey);
}

/**
 * Return the list of enabled modules for a user given their entitlement state.
 * For the current PipeKeeper build this is always the default list.
 * Future builds can inspect entitlementTier or a modules[] field on the user record.
 *
 * @param {object} [userEntitlements] - Result of buildEntitlements() or useEntitlements().
 * @returns {string[]} Enabled module keys.
 */
export function getEnabledModules(userEntitlements) {
  // Current PipeKeeper: pipes and tobacco are enabled for all tiers.
  // Future: check userEntitlements.modules or a per-module feature flag.
  if (!userEntitlements) return PIPEKEEPER_ENABLED_MODULES;
  return PIPEKEEPER_ENABLED_MODULES;
}

/**
 * Build a module entitlement map for a user.
 * Returns an object keyed by module type with { enabled: boolean }.
 *
 * @param {object} [userEntitlements]
 * @returns {Record<string, { enabled: boolean }>}
 */
export function buildModuleEntitlements(userEntitlements) {
  const enabledModules = getEnabledModules(userEntitlements);
  const result = {};
  for (const moduleKey of Object.values(PLATFORM_MODULES)) {
    result[moduleKey] = { enabled: enabledModules.includes(moduleKey) };
  }
  return result;
}
