/**
 * Keeper Core — Collection Summary Service
 * 
 * DEPRECATED: Use collectionAggregation.js directly for unified collection data.
 * This file is maintained for backward compatibility only.
 */

import { aggregateCollection } from '../aggregation/collectionAggregation';
import { getHubContributorModules } from '../modules/keeperModules';

/**
 * Get summary for a single module (legacy - delegates to unified layer)
 * @param {string} moduleType - Module type (pipes, whiskey, etc.)
 * @param {string} userEmail - Current user's email for scoping
 * @returns {Promise<Object>} Module summary { count, value }
 */
export async function getModuleSummary(moduleType, userEmail) {
  if (!userEmail) {
    return { count: 0, value: 0 };
  }

  try {
    const agg = await aggregateCollection(userEmail);
    const moduleData = agg[moduleType];
    
    if (!moduleData) {
      return { count: 0, value: 0 };
    }

    return {
      count: moduleData.count,
      value: moduleData.value,
    };
  } catch (error) {
    console.warn(`[collectionSummary] Error fetching ${moduleType} summary:`, error?.message);
    return { count: 0, value: 0 };
  }
}

/**
 * Get combined collection summary for Hub (legacy - delegates to unified layer)
 * @param {string} userEmail - Current user's email for scoping
 * @returns {Promise<Object>} Combined summary with per-module and total data
 */
export async function getCollectionHubSummary(userEmail) {
  if (!userEmail) {
    return {
      pipes: { count: 0, value: 0 },
      tobacco: { count: 0, value: 0 },
      whiskey: { count: 0, value: 0 },
      total: { items: 0, value: 0 },
      enabledModuleCount: 0,
      hubContributorCount: 0,
    };
  }

  try {
    const agg = await aggregateCollection(userEmail);
    const contributorModules = getHubContributorModules();

    return {
      pipes: agg.pipes,
      tobacco: agg.tobacco,
      whiskey: agg.whiskey,
      total: agg.total,
      enabledModuleCount: contributorModules.length,
      hubContributorCount: contributorModules.length,
    };
  } catch (error) {
    console.warn('[collectionSummary] Error fetching hub summary:', error?.message);
    return {
      pipes: { count: 0, value: 0 },
      tobacco: { count: 0, value: 0 },
      whiskey: { count: 0, value: 0 },
      total: { items: 0, value: 0 },
      enabledModuleCount: 0,
      hubContributorCount: 0,
    };
  }
}