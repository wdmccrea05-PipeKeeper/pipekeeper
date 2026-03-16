/**
 * Central module registry for CollectionKeeper ecosystem
 * Defines all available modules (active and coming soon)
 * Used to drive Hub UI, module cards, and future extensibility
 */

export const KEEPER_MODULES = [
  {
    type: 'pipes',
    titleKey: 'hub.pipekeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png',
    route: 'Pipes',
    enabled: true,
    description: 'Manage your pipe collection with detailed specifications and smoking logs.',
    moduleKey: 'pipekeeper',
  },
  {
    type: 'whiskey',
    titleKey: 'hub.whiskeykeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png',
    route: 'Whiskey',
    enabled: true,
    description: 'Track your whiskey collection with tasting notes and region analysis.',
    moduleKey: 'whiskeykeeper',
  },
  {
    type: 'cigars',
    titleKey: 'hub.cigarkeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/4b732c71b_CigarKNB.png',
    route: null,
    enabled: false,
    description: 'Coming soon: Curate and track your cigar collection.',
    moduleKey: 'cigarkeeper',
  },
  {
    type: 'wine',
    titleKey: 'hub.winekeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/22a738bbc_WineKNB.png',
    route: null,
    enabled: false,
    description: 'Coming soon: Manage your wine cellar and bottle inventory.',
    moduleKey: 'winekeeper',
  },
];

/**
 * Get enabled modules (active modules)
 */
export function getEnabledModules() {
  return KEEPER_MODULES.filter(m => m.enabled);
}

/**
 * Get coming soon modules
 */
export function getComingSoonModules() {
  return KEEPER_MODULES.filter(m => !m.enabled);
}

/**
 * Get module by type
 */
export function getModuleByType(type) {
  return KEEPER_MODULES.find(m => m.type === type);
}

/**
 * Get count of enabled modules
 */
export function getEnabledModuleCount() {
  return getEnabledModules().length;
}