/**
 * Keeper Core — Collection Summary Service
 * 
 * Centralized logic for aggregating collection summaries across modules.
 * Used by Hub, sharing, analytics, and curator context.
 */

import { base44 } from '@/api/base44Client';
import { getHubContributorModules } from '../modules/keeperModules';

/**
 * Get summary for a single module
 * @param {string} moduleType - Module type (pipes, whiskey, etc.)
 * @param {string} userEmail - Current user's email for scoping
 * @returns {Promise<Object>} Module summary { count, value }
 */
export async function getModuleSummary(moduleType, userEmail) {
  if (!userEmail) {
    return { count: 0, value: 0 };
  }

  try {
    switch (moduleType) {
      case 'pipes': {
        const pipes = await base44.entities.Pipe.filter({ created_by: userEmail });
        if (!pipes || pipes.length === 0) {
          return { count: 0, value: 0 };
        }

        let totalValue = 0;
        pipes.forEach(pipe => {
          const manualValue = pipe.estimated_value || pipe.purchase_price || 0;
          totalValue += manualValue;
        });

        return { count: pipes.length, value: totalValue };
      }

      case 'tobacco': {
        const blends = await base44.entities.TobaccoBlend.filter({ created_by: userEmail });
        if (!blends || blends.length === 0) {
          return { count: 0, value: 0 };
        }

        let totalValue = 0;
        blends.forEach(blend => {
          const manualValue = blend.manual_market_value || blend.ai_estimated_value || 0;
          totalValue += manualValue;
        });

        return { count: blends.length, value: totalValue };
      }

      case 'whiskey': {
        const bottles = await base44.entities.Bottle.filter({ created_by: userEmail });
        if (!bottles || bottles.length === 0) {
          return { count: 0, value: 0 };
        }

        let totalValue = 0;
        bottles.forEach(bottle => {
          const manualValue = bottle.estimated_value || bottle.purchase_price || 0;
          totalValue += manualValue;
        });

        return { count: bottles.length, value: totalValue };
      }

      default:
        return { count: 0, value: 0 };
    }
  } catch (error) {
    console.warn(`[collectionSummary] Error fetching ${moduleType} summary:`, error?.message);
    return { count: 0, value: 0 };
  }
}

/**
 * Get combined collection summary for Hub
 * Aggregates all enabled modules that contribute to the Hub
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
    const contributorModules = getHubContributorModules();
    const summaries = {};
    let totalItems = 0;
    let totalValue = 0;

    // Fetch summaries for all enabled modules that contribute to Hub
    const summaryPromises = contributorModules.map(async (module) => {
      const summary = await getModuleSummary(module.type, userEmail);
      summaries[module.type] = summary;
      totalItems += summary.count;
      totalValue += summary.value;
    });

    await Promise.all(summaryPromises);

    // Ensure all expected keys exist (even if count is 0)
    const result = {
      pipes: summaries.pipes || { count: 0, value: 0 },
      tobacco: summaries.tobacco || { count: 0, value: 0 },
      whiskey: summaries.whiskey || { count: 0, value: 0 },
      total: { items: totalItems, value: totalValue },
      enabledModuleCount: contributorModules.length,
      hubContributorCount: contributorModules.length,
    };

    return result;
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