/**
 * Module Registry — Dynamic module definitions for CollectionKeeper ecosystem
 * Add new modules here without changing entitlement/pricing logic
 */

export const MODULES = {
  PIPEKEEPER: 'pipekeeper',
  WHISKEYKEEPER: 'whiskeykeeper',
  CIGARKEEPER: 'cigarkeeper',
  WINEKEEPER: 'winekeeper',
};

export const MODULE_LIST = [
  MODULES.PIPEKEEPER,
  MODULES.WHISKEYKEEPER,
  MODULES.CIGARKEEPER,
  MODULES.WINEKEEPER,
];

export const MODULE_DISPLAY_NAMES = {
  [MODULES.PIPEKEEPER]: 'PipeKeeper',
  [MODULES.WHISKEYKEEPER]: 'WhiskeyKeeper',
  [MODULES.CIGARKEEPER]: 'CigarKeeper',
  [MODULES.WINEKEEPER]: 'WineKeeper',
};

export const MODULE_I18N_KEYS = {
  [MODULES.PIPEKEEPER]: 'modules.pipekeeper',
  [MODULES.WHISKEYKEEPER]: 'modules.whiskeykeeper',
  [MODULES.CIGARKEEPER]: 'modules.cigarkeeper',
  [MODULES.WINEKEEPER]: 'modules.winekeeper',
};

/**
 * Get current active modules (those available in the app)
 * Use this to support partial ecosystem launches
 */
export function getActiveModules() {
  // For now, all 4 modules are active
  // In the future, filter based on feature flags or remote config
  return MODULE_LIST;
}

/**
 * Check if a module is currently enabled
 */
export function isModuleActive(module) {
  return getActiveModules().includes(module);
}

/**
 * Get display name for a module
 */
export function getModuleDisplayName(module) {
  return MODULE_DISPLAY_NAMES[module] || module;
}

/**
 * Get i18n key for a module
 */
export function getModuleI18nKey(module) {
  return MODULE_I18N_KEYS[module] || `modules.${module}`;
}

/**
 * Get all currently active module display names
 */
export function getActiveModuleDisplayNames() {
  return getActiveModules().map(m => getModuleDisplayName(m));
}