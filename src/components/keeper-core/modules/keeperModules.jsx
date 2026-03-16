/**
 * Keeper Core — Module Registry
 * 
 * Central definition of all CollectionKeeper modules (active and future).
 * Single source of truth for module configuration across the ecosystem.
 * 
 * Do not modify this file directly — update via admin or feature gate.
 */

export const KEEPER_MODULES = [
  {
    type: 'pipes',
    titleKey: 'hub.pipekeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png',
    route: 'Pipes',
    enabled: true,
    contributesToHub: true,
    description: 'Manage your pipe collection with detailed specifications and smoking logs.',
    entityNames: ['Pipe', 'SmokingLog', 'TobaccoBlend'],
  },
  {
    type: 'whiskey',
    titleKey: 'hub.whiskeykeeper',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png',
    route: 'Whiskey',
    enabled: true,
    contributesToHub: true,
    description: 'Track your whiskey collection with tasting notes and region analysis.',
    entityNames: ['Bottle', 'TastingLog'],
  },
  {
    type: 'cigars',
    titleKey: 'hub.cigarkeeper',
    icon: '🔘',
    route: null,
    enabled: false,
    contributesToHub: false,
    description: 'Coming soon: Curate and track your cigar collection.',
    entityNames: ['Cigar', 'CigarSmokingLog'],
  },
  {
    type: 'coffee',
    titleKey: 'hub.coffeekeeper',
    icon: '☕',
    route: null,
    enabled: false,
    contributesToHub: false,
    description: 'Coming soon: Manage your coffee bean collection.',
    entityNames: ['CoffeeBean', 'CoffeeTastingLog'],
  },
];

/**
 * Get all enabled modules
 */
export function getEnabledModules() {
  return KEEPER_MODULES.filter(m => m.enabled);
}

/**
 * Get all coming soon modules
 */
export function getComingSoonModules() {
  return KEEPER_MODULES.filter(m => !m.enabled);
}

/**
 * Get modules that contribute to Hub summary
 */
export function getHubContributorModules() {
  return KEEPER_MODULES.filter(m => m.contributesToHub && m.enabled);
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

/**
 * Get count of modules contributing to Hub
 */
export function getHubContributorCount() {
  return getHubContributorModules().length;
}