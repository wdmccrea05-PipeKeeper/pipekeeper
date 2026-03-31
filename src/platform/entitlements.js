// platform/entitlements.js
// Shared module entitlement helpers for the CollectionKeeper platform.
//
// This file is intentionally platform-level and does not enforce release-state
// visibility by itself. Release-state gating (blocked/internal/launched) remains
// in the app-layer module visibility system. These helpers only normalize which
// modules a user has enabled access to once the release layer allows it.

export const PLATFORM_MODULES = {
  PIPE: "pipes",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigars",
  COFFEE: "coffee",
};

export const PIPEKEEPER_ENABLED_MODULES = [
  PLATFORM_MODULES.PIPE,
  PLATFORM_MODULES.TOBACCO,
];

export function getEnabledModules(userEntitlements) {
  if (!userEntitlements) {
    return [...PIPEKEEPER_ENABLED_MODULES];
  }

  const explicitModules = Array.isArray(userEntitlements.modules)
    ? userEntitlements.modules.filter((value) =>
        Object.values(PLATFORM_MODULES).includes(value)
      )
    : null;

  if (explicitModules && explicitModules.length > 0) {
    return Array.from(new Set(explicitModules));
  }

  const enabled = new Set(PIPEKEEPER_ENABLED_MODULES);

  if (
    userEntitlements.whiskeykeeper_enabled === true ||
    userEntitlements.whiskey_enabled === true ||
    userEntitlements[PLATFORM_MODULES.WHISKEY] === true
  ) {
    enabled.add(PLATFORM_MODULES.WHISKEY);
  }

  if (
    userEntitlements.cigarkeeper_enabled === true ||
    userEntitlements.cigar_enabled === true ||
    userEntitlements[PLATFORM_MODULES.CIGAR] === true
  ) {
    enabled.add(PLATFORM_MODULES.CIGAR);
  }

  if (
    userEntitlements.coffeekeeper_enabled === true ||
    userEntitlements.coffee_enabled === true ||
    userEntitlements[PLATFORM_MODULES.COFFEE] === true
  ) {
    enabled.add(PLATFORM_MODULES.COFFEE);
  }

  return Array.from(enabled);
}

export function isModuleEnabled(
  moduleKey,
  enabledModules = PIPEKEEPER_ENABLED_MODULES
) {
  return Array.isArray(enabledModules) && enabledModules.includes(moduleKey);
}

export function buildModuleEntitlements(userEntitlements) {
  const enabledModules = getEnabledModules(userEntitlements);
  const result = {};

  for (const moduleKey of Object.values(PLATFORM_MODULES)) {
    result[moduleKey] = { enabled: enabledModules.includes(moduleKey) };
  }

  return result;
}
