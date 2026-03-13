/**
 * Keeper Core — Centralized Platform Layer
 * 
 * Re-exports all Keeper Core services for convenient importing.
 * This is the public API for shared collection ecosystem logic.
 */

// Module Registry
export {
  KEEPER_MODULES,
  getEnabledModules,
  getComingSoonModules,
  getHubContributorModules,
  getModuleByType,
  getEnabledModuleCount,
  getHubContributorCount,
} from './modules/keeperModules';

// Collection Summary
export {
  getModuleSummary,
  getCollectionHubSummary,
} from './summary/collectionSummary';

// Value Aggregation
export {
  getPipeValue,
  getTobaccoValue,
  getBottleValue,
  getCigarValue,
  getCoffeeBeanValue,
  getValueByModuleType,
  formatCurrencyValue,
  calculateEcosystemValueMetrics,
} from './value/valueAggregation';

// Recent Activity
export {
  getRecentCrossModuleActivity,
  formatActivityDate,
  getActivityStats,
} from './activity/recentActivity';

// Curator Context
export {
  buildCuratorHubContext,
  generateCuratorPromptSeeds,
  buildCuratorEntryText,
  prepareCuratorNavigationState,
} from './ai/buildCuratorHubContext';