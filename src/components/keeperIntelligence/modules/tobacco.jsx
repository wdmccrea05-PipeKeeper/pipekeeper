/**
 * Keeper Intelligence: Tobacco Module
 * Advanced cellar, aging, and blend analysis
 */

import { differenceInMonths } from 'date-fns';
import { filterAiEligibleItems } from "../../platform/aiEligibility";

export const TobaccoModule = {
  analyzeCollection(data) {
    const { blends = [] } = data;
    
    // Filter to AI-eligible blends only
    const eligibleBlends = filterAiEligibleItems(blends);

    // Analyze blend types (AI-eligible only)
    const blendTypes = new Set(eligibleBlends.map(b => b.blend_type).filter(Boolean));
    
    // Analyze cellared tobacco (AI-eligible only)
    const agingBlends = eligibleBlends.filter(b => {
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

    // Calculate total cellar quantity (AI-eligible only)
    const totalQuantityOz = eligibleBlends.reduce((sum, b) => {
      const tinQty = Number(b.tin_total_quantity_oz) || 0;
      const bulkQty = Number(b.bulk_total_quantity_oz) || 0;
      const pouchQty = Number(b.pouch_total_quantity_oz) || 0;
      return sum + tinQty + bulkQty + pouchQty;
    }, 0);

    // Identify missing blend styles
    const hasVirginia = blendTypes.has("Virginia") || blendTypes.has("Virginia/Burley") || blendTypes.has("Virginia/Perique");
    const hasEnglish = blendTypes.has("English") || blendTypes.has("English Aromatic") || blendTypes.has("English Balkan");
    const hasOriental = blendTypes.has("Oriental/Turkish");
    const hasLatakia = blendTypes.has("Latakia Blend");

    return {
      blendCount: eligibleBlends.length,
      blendTypeCount: blendTypes.size,
      agingBlendCount: agingBlends.length,
      readyForAgingCount: readyForAging.length,
      totalCellarQuantity: totalQuantityOz,
      blendTypes: Array.from(blendTypes),
      hasVirginia,
      hasEnglish,
      hasOriental,
      hasLatakia,
      blends: eligibleBlends
    };
  },

  generateInsights(analysis) {
    const insights = [];
    const { blendCount, blendTypeCount, readyForAgingCount, hasVirginia, hasEnglish, hasOriental, hasLatakia } = analysis;

    // CELLAR: Aging Opportunity
    if (readyForAgingCount > 0) {
      insights.push({
        title: "keeper.tobacco.agingOpportunityTitle",
        insight: "keeper.tobacco.agingOpportunityInsight",
        action: "keeper.tobacco.agingOpportunityAction",
        cta: "keeper.tobacco.agingOpportunityCTA",
        ctaLink: "Insights?tab=aging",
        icon: "Clock",
        category: "Cellar",
        priority: "high",
        vars: { count: readyForAgingCount }
      });
    }

    // CELLAR: Blend Diversity
    if (blendCount > 0 && blendTypeCount < 3) {
      insights.push({
        title: "keeper.tobacco.diversityTitle",
        insight: "keeper.tobacco.diversityInsight",
        action: "keeper.tobacco.diversityAction",
        cta: "keeper.tobacco.diversityCTA",
        ctaLink: "Tobacco",
        icon: "Leaf",
        category: "Cellar",
        priority: "medium"
      });
    }

    // DISCOVERY: Blend Style Exploration
    const missingStyles = [];
    if (!hasEnglish) missingStyles.push("English");
    if (!hasOriental && !hasLatakia) missingStyles.push("Balkan");
    
    if (blendCount > 2 && missingStyles.length > 0) {
      insights.push({
        title: "keeper.tobacco.styleDiscoveryTitle",
        insight: "keeper.tobacco.styleDiscoveryInsight",
        action: "keeper.tobacco.styleDiscoveryAction",
        icon: "Leaf",
        category: "Discovery",
        priority: "low",
        vars: { styles: missingStyles.join(" or ") }
      });
    }

    // STEWARDSHIP: Cellar Storage
    if (blendCount >= 5) {
      insights.push({
        title: "keeper.tobacco.stewardshipStorageTitle",
        insight: "keeper.tobacco.stewardshipStorageInsight",
        action: "keeper.tobacco.stewardshipStorageAction",
        icon: "Leaf",
        category: "Stewardship",
        priority: "low"
      });
    }

    return insights;
  }
};