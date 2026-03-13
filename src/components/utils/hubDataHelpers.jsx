import { base44 } from '@/api/base44Client';

/**
 * Get summary data for a single module
 * @param {string} moduleType - 'pipes', 'tobacco', 'bottles'
 * @returns {Promise<{count: number, value: number, summary: string}>}
 */
export async function getModuleSummary(moduleType) {
  try {
    switch (moduleType) {
      case 'pipes': {
        const pipes = await base44.entities.Pipe.list();
        const count = pipes?.length || 0;
        const totalValue = pipes?.reduce((sum, p) => sum + (p.estimated_value || p.purchase_price || 0), 0) || 0;
        return {
          count,
          value: totalValue,
          summary: `${count} pipe${count !== 1 ? 's' : ''}`,
        };
      }

      case 'tobacco': {
        const blends = await base44.entities.TobaccoBlend.list();
        const count = blends?.length || 0;
        const totalValue = blends?.reduce((sum, b) => sum + (b.ai_estimated_value || 0), 0) || 0;
        return {
          count,
          value: totalValue,
          summary: `${count} blend${count !== 1 ? 's' : ''}`,
        };
      }

      case 'bottles': {
        const bottles = await base44.entities.Bottle.list();
        const count = bottles?.length || 0;
        const totalValue = bottles?.reduce((sum, b) => sum + (b.purchase_price || 0), 0) || 0;
        return {
          count,
          value: totalValue,
          summary: `${count} bottle${count !== 1 ? 's' : ''}`,
        };
      }

      default:
        return { count: 0, value: 0, summary: '—' };
    }
  } catch (error) {
    console.warn(`[hubDataHelpers] Error fetching ${moduleType} summary:`, error);
    return { count: 0, value: 0, summary: '—' };
  }
}

/**
 * Get combined collection summary across all modules
 * @returns {Promise<{pipes: {count, value}, bottles: {count, value}, total: {items, value}}>}
 */
export async function getCombinedCollectionSummary() {
  try {
    const [pipeData, bottleData] = await Promise.all([
      getModuleSummary('pipes'),
      getModuleSummary('bottles'),
    ]);

    return {
      pipes: {
        count: pipeData.count,
        value: pipeData.value,
      },
      bottles: {
        count: bottleData.count,
        value: bottleData.value,
      },
      total: {
        items: pipeData.count + bottleData.count,
        value: pipeData.value + bottleData.value,
      },
    };
  } catch (error) {
    console.warn('[hubDataHelpers] Error fetching combined summary:', error);
    return {
      pipes: { count: 0, value: 0 },
      bottles: { count: 0, value: 0 },
      total: { items: 0, value: 0 },
    };
  }
}