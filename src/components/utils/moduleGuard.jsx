/**
 * moduleGuard.js — canonical module enablement checks.
 * Works with UserProfile fields (pipekeeper_enabled, whiskeykeeper_enabled, etc.)
 */

const MODULE_FIELD_MAP = {
  pipe: "pipekeeper_enabled",
  pipekeeper: "pipekeeper_enabled",
  whiskey: "whiskeykeeper_enabled",
  whiskeykeeper: "whiskeykeeper_enabled",
  wine: "winekeeper_enabled",
  winekeeper: "winekeeper_enabled",
  cigar: "cigarkeeper_enabled",
  cigarkeeper: "cigarkeeper_enabled",
};

export function isModuleEnabled(user, moduleKey) {
  if (!user || !moduleKey) return false;

  // Support activeModules object (future-proof)
  if (user.activeModules) {
    return user.activeModules[moduleKey] === true;
  }

  // Map to UserProfile boolean fields
  const field = MODULE_FIELD_MAP[moduleKey];
  if (!field) return false;

  // Default: pipekeeper and whiskeykeeper default to true if field is undefined
  if (user[field] === undefined) {
    return moduleKey === "pipekeeper" || moduleKey === "pipe" ||
           moduleKey === "whiskeykeeper" || moduleKey === "whiskey";
  }

  return user[field] === true;
}

export function filterByEnabledModules(user, items, moduleKey) {
  if (!isModuleEnabled(user, moduleKey)) return [];
  return items || [];
}