/**
 * Keeper Core — Collection Summary Service
 * 
 * DEPRECATED: Use collectionAggregation.js directly for unified collection data.
 * This file is maintained for backward compatibility only.
 */

import { aggregateCollection } from '../aggregation/collectionAggregation';
import { isModuleAIEligible } from '@/components/utils/moduleAccess';

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
 * @param {Object|null} moduleStates - from useModuleVisibility. If provided, excludes hidden modules from totals.
 * @returns {Promise<Object>} Combined summary with per-module and total data
 */
export async function getCollectionHubSummary(userEmail, moduleStates = null) {
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

    // Apply module visibility filter if moduleStates provided
    const pipesEnabled = moduleStates ? isModuleAIEligible('pipekeeper', moduleStates) : true;
    const whiskeyEnabled = moduleStates ? isModuleAIEligible('whiskeykeeper', moduleStates) : true;

    const pipes = pipesEnabled ? agg.pipes : { count: 0, value: 0 };
    const tobacco = pipesEnabled ? agg.tobacco : { count: 0, value: 0 };
    const whiskey = whiskeyEnabled ? agg.whiskey : { bottleTypes: 0, totalBottles: 0, count: 0, value: 0, open: 0, unopened: 0, sealed: 0 };

    const totalItems = pipes.count + tobacco.count + whiskey.count;
    const totalValue = pipes.value + tobacco.value + whiskey.value;

    const enabledCount = (pipesEnabled ? 1 : 0) + (whiskeyEnabled ? 1 : 0);

    return {
      pipes,
      tobacco,
      whiskey,
      total: { items: totalItems, value: totalValue },
      enabledModuleCount: enabledCount,
      hubContributorCount: enabledCount,
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