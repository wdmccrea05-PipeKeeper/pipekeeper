/**
 * Keeper Intelligence: Tobacco Module
 * Analyzes tobacco collection for diversity, aging, and cellar health insights
 */

import { differenceInMonths } from 'date-fns';

export const TobaccoModule = {
  analyzeCollection(data) {
    const { blends = [] } = data;

    // Analyze blend types
    const blendTypes = new Set(blends.map(b => b.blend_type).filter(Boolean));
    
    // Analyze cellared tobacco
    const agingBlends = blends.filter(b => {
      const hasCellared = (Number(b.tin_tins_cellared) || 0) > 0 || 
                          (Number(b.bulk_cellared) || 0) > 0 || 
                          (Number(b.pouch_pouches_cellared) || 0) > 0;
      if (!hasCellared) return false;
      
      const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
      return dates.length > 0;
    });

    // Calculate aging potential matches
    const readyForAging = agingBlends.filter(b => {
      const dates = [b.tin_cellared_date, b.bulk_cellared_date, b.pouch_cellared_date].filter(Boolean);
      if (dates.length === 0) return false;

      const oldestDate = dates.reduce((oldest, d) => {
        try {
          const dTime = new Date(d).getTime();
          const oldTime = new Date(oldest).getTime();
          return dTime < oldTime ? d : oldest;
        } catch {
          return oldest;
        }
      });

      try {
        const months = differenceInMonths(new Date(), new Date(oldestDate));
        const potential = b.aging_potential;

        if (potential === "Excellent" && months >= 24) return true;
        if (potential === "Good" && months >= 12) return true;
        if (potential === "Fair" && months >= 3) return true;
      } catch {
        return false;
      }

      return false;
    });

    // Calculate total cellar quantity
    const totalQuantityOz = blends.reduce((sum, b) => {
      const tinQty = Number(b.tin_total_quantity_oz) || 0;
      const bulkQty = Number(b.bulk_total_quantity_oz) || 0;
      const pouchQty = Number(b.pouch_total_quantity_oz) || 0;
      return sum + tinQty + bulkQty + pouchQty;
    }, 0);

    return {
      blendCount: blends.length,
      blendTypeCount: blendTypes.size,
      agingBlendCount: agingBlends.length,
      readyForAgingCount: readyForAging.length,
      totalCellarQuantity: totalQuantityOz,
      blends
    };
  },

  generateInsights(analysis) {
    const insights = [];
    const { blendCount, blendTypeCount, readyForAgingCount } = analysis;

    // Insight 1: Blend Diversity
    if (blendCount > 0 && blendTypeCount < 3) {
      insights.push({
        title: "keeper.tobacco.diversityTitle",
        insight: "keeper.tobacco.diversityInsight",
        action: "keeper.tobacco.diversityAction",
        cta: "keeper.tobacco.diversityCTA",
        ctaLink: "Tobacco",
        icon: "Leaf",
        priority: "medium",
        vars: { typeCount: blendTypeCount }
      });
    }

    // Insight 2: Aging Opportunity
    if (readyForAgingCount > 0) {
      insights.push({
        title: "keeper.tobacco.agingTitle",
        insight: "keeper.tobacco.agingInsight",
        action: "keeper.tobacco.agingAction",
        cta: "keeper.tobacco.agingCTA",
        ctaLink: "Insights?tab=aging",
        icon: "Clock",
        priority: "high",
        vars: { count: readyForAgingCount }
      });
    }

    // Insight 3: Cellar Monitoring
    if (blendCount > 5) {
      insights.push({
        title: "keeper.tobacco.cellarTitle",
        insight: "keeper.tobacco.cellarInsight",
        action: "keeper.tobacco.cellarAction",
        cta: "keeper.tobacco.cellarCTA",
        ctaLink: "Insights?tab=aging",
        icon: "TrendingUp",
        priority: "low"
      });
    }

    return insights;
  }
};