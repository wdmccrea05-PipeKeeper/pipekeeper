import { base44 } from '@/api/base44Client';

/**
 * USER-SCOPED data helper for CollectionKeeper Hub
 * All queries now use created_by filter to ensure user-scoped access
 * This follows the same pattern as the rest of the app
 */

/**
 * Get summary data for a single module (user-scoped)
 * @param {string} moduleType - 'pipes', 'tobacco', 'bottles'
 * @param {string} userEmail - Current user email
 * @returns {Promise<{count: number, value: number}>}
 */
export async function getModuleSummary(moduleType, userEmail) {
  if (!userEmail) return { count: 0, value: 0 };

  try {
    switch (moduleType) {
      case 'pipes': {
        // Use created_by filter for user scoping
        const pipes = await base44.entities.Pipe.filter({ created_by: userEmail });
        const count = pipes?.length || 0;
        const totalValue = pipes?.reduce((sum, p) => sum + (p.estimated_value || p.purchase_price || 0), 0) || 0;
        return { count, value: totalValue };
      }

      case 'tobacco': {
        const blends = await base44.entities.TobaccoBlend.filter({ created_by: userEmail });
        const count = blends?.length || 0;
        // Use manual_market_value (user-entered) or ai_estimated_value as fallback
        const totalValue = blends?.reduce((sum, b) => sum + (b.manual_market_value || b.ai_estimated_value || 0), 0) || 0;
        return { count, value: totalValue };
      }

      case 'bottles': {
        const bottles = await base44.entities.Bottle.filter({ created_by: userEmail });
        const count = bottles?.length || 0;
        // Use same priority chain as everywhere else in the app
        const totalValue = bottles?.reduce((sum, b) =>
          sum + (Number(b.collector_value) || Number(b.aftermarket_price) || Number(b.retail_price) || Number(b.purchase_price) || 0), 0) || 0;
        return { count, value: totalValue };
      }

      default:
        return { count: 0, value: 0 };
    }
  } catch (error) {
    console.warn(`[hubDataHelpers] Error fetching ${moduleType} summary:`, error);
    return { count: 0, value: 0 };
  }
}

/**
 * Get combined collection summary across all modules (user-scoped)
 * Includes pipes, tobacco, and bottles with ecosystem totals
 * @param {string} userEmail - Current user email
 * @returns {Promise<{pipes, tobacco, bottles, total, enabledModuleCount}>}
 */
export async function getCombinedCollectionSummary(userEmail) {
  if (!userEmail) {
    return {
      pipes: { count: 0, value: 0 },
      tobacco: { count: 0, value: 0 },
      bottles: { count: 0, value: 0 },
      total: { items: 0, value: 0 },
      enabledModuleCount: 2,
    };
  }

  try {
    const [pipeData, tobaccoData, bottleData] = await Promise.all([
      getModuleSummary('pipes', userEmail),
      getModuleSummary('tobacco', userEmail),
      getModuleSummary('bottles', userEmail),
    ]);

    const totalItems = pipeData.count + tobaccoData.count + bottleData.count;
    const totalValue = pipeData.value + tobaccoData.value + bottleData.value;

    return {
      pipes: pipeData,
      tobacco: tobaccoData,
      bottles: bottleData,
      total: { items: totalItems, value: totalValue },
      enabledModuleCount: 2, // Pipes and Whiskey are enabled
    };
  } catch (error) {
    console.warn('[hubDataHelpers] Error fetching combined summary:', error);
    return {
      pipes: { count: 0, value: 0 },
      tobacco: { count: 0, value: 0 },
      bottles: { count: 0, value: 0 },
      total: { items: 0, value: 0 },
      enabledModuleCount: 2,
    };
  }
}