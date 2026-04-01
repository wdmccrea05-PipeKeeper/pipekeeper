/**
 * UNIFIED COLLECTION AGGREGATION LAYER
 * 
 * Single source of truth for all collection statistics across Hub, Stories, Insights, Reports, and Share Cards.
 * 
 * This eliminates inconsistencies by:
 * - Using the same value calculation priority for all modules
 * - Computing statistics once and reusing results
 * - Respecting module-aware filtering
 */

import { base44 } from '@/api/base44Client';
import { shouldFetchModuleData } from '@/components/utils/moduleReleaseState';
import { getBottleValue, getPipeValue } from '@/components/keeper-core/value/valueAggregation';



/**
 * Get total tobacco value: value per oz × total oz across all container types.
 * Falls back to manual/ai flat value if quantity data is missing.
 */
function getTobaccoValue(blend) {
  const perOz =
    Number(blend.manual_market_value) ||
    Number(blend.ai_estimated_value) ||
    0;

  if (perOz > 0) {
    const totalOz =
      Number(blend.tin_total_quantity_oz) ||
      Number(blend.bulk_total_quantity_oz) ||
      Number(blend.pouch_total_quantity_oz) ||
      0;
    // If we have quantity data, return per-oz * total-oz; otherwise return flat value
    if (totalOz > 0) return perOz * totalOz;
    return perOz; // flat value fallback
  }

  return 0;
}

/**
 * Aggregate complete collection statistics
 * Returns unified data structure used by all consumers
 * @param {string} userEmail - User's email for data scoping
 * @returns {Promise<Object>} Complete aggregated collection data
 */
export async function aggregateCollection(userEmail) {
  if (!userEmail) {
    return getEmptyAggregation();
  }

  try {
    // Fetch only data for modules allowed by the canonical release state.
    // Blocked modules never issue queries — no data leaks into stories, summaries, or reports.
    // Pass null as user since aggregation runs without a full user object here;
    // shouldFetchModuleData falls back to release-state only (blocked = false always).
    const fetchWhiskey = shouldFetchModuleData('whiskeykeeper', null);
    const fetchPipe = shouldFetchModuleData('pipekeeper', null);

    const [pipes, tobaccos, bottles, smokingLogs, tastingLogs, inventoryUnits] = await Promise.all([
      fetchPipe ? base44.entities.Pipe.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchPipe ? base44.entities.TobaccoBlend.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.Bottle.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchPipe ? base44.entities.SmokingLog.filter({ created_by: userEmail }, '-date', 1000).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.TastingLog.filter({ created_by: userEmail }, '-tasting_date', 1000).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
    ]);

    const pipesList = Array.isArray(pipes) ? pipes : [];
    const tobaccosList = Array.isArray(tobaccos) ? tobaccos : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const smokingLogsList = Array.isArray(smokingLogs) ? smokingLogs : [];
    const tastingLogsList = Array.isArray(tastingLogs) ? tastingLogs : [];
    const inventoryUnitsList = Array.isArray(inventoryUnits) ? inventoryUnits : [];

    // === PIPES MODULE ===
    const pipesCount = pipesList.length;
    const pipesValue = pipesList.reduce((sum, p) => sum + getPipeValue(p), 0);
    const pipeStats = {
      count: pipesCount,
      value: pipesValue,
      favorite: pipesList.filter(p => p.is_favorite).length,
      rated: pipesList.filter(p => p.rating).length,
      avgRating: pipesList.filter(p => p.rating).length > 0
        ? (pipesList.reduce((sum, p) => sum + (p.rating || 0), 0) / pipesList.filter(p => p.rating).length).toFixed(2)
        : 0,
    };

    // === TOBACCO MODULE ===
    const tobaccosCount = tobaccosList.length;
    const tobaccosValue = tobaccosList.reduce((sum, t) => sum + getTobaccoValue(t), 0);
    const tobaccoStats = {
      count: tobaccosCount,
      value: tobaccosValue,
      favorite: tobaccosList.filter(t => t.is_favorite).length,
      rated: tobaccosList.filter(t => t.rating).length,
      avgRating: tobaccosList.filter(t => t.rating).length > 0
        ? (tobaccosList.reduce((sum, t) => sum + (t.rating || 0), 0) / tobaccosList.filter(t => t.rating).length).toFixed(2)
        : 0,
      open: tobaccosList.reduce((sum, t) => sum + (Number(t.tin_tins_open) || 0) + (Number(t.bulk_open) || 0) + (Number(t.pouch_pouches_open) || 0), 0),
      cellared: tobaccosList.reduce((sum, t) => sum + (Number(t.tin_tins_cellared) || 0) + (Number(t.bulk_cellared) || 0) + (Number(t.pouch_pouches_cellared) || 0), 0),
    };

    // === WHISKEY MODULE ===
     //
     // TWO DISTINCT METRICS — must never be conflated:
     //
     //  bottleTypes  = number of distinct Bottle records (unique labels / products)
     //  totalBottles = actual physical bottle inventory count
     //
     // If inventory units exist, totalBottles = sum of all WhiskeyInventoryUnit records for this user.
     // If no inventory units exist (legacy / simple users), fall back to sum of bottle_count fields on Bottle records.
     // bottleTypes always = bottlesList.length regardless of inventory depth.

     const bottleTypes = bottlesList.length; // Distinct bottle records / unique labels

     // Total physical bottles: prefer WhiskeyInventoryUnit records (accurate per-unit tracking)
     // Fall back to legacy bottle_count field on Bottle records for users who haven't migrated
     let totalBottles;
     if (inventoryUnitsList.length > 0) {
       totalBottles = inventoryUnitsList.length;
     } else {
       // Legacy fallback: sum bottle_count fields (default 1 per record)
       totalBottles = bottlesList.reduce((sum, b) => sum + (Number(b.bottle_count) || 1), 0);
     }

     const bottlesValue = bottlesList.reduce((sum, b) => sum + getBottleValue(b), 0);

     // Open/unopened counts based on actual inventory units (not record count)
     // If no inventory units, treat each bottle record as 1 unopened unit (conservative default)
     const openBottles = inventoryUnitsList.length > 0
       ? inventoryUnitsList.filter(u => u.status === 'open').length
       : 0;
     const unopenedBottles = inventoryUnitsList.length > 0
       ? inventoryUnitsList.filter(u => u.status === 'reserve' || u.status === 'drinking').length
       : totalBottles; // All bottles are "unopened" if no unit tracking

     const whiskeyStats = {
       // Canonical dual metrics — use these everywhere, never use just "count" for whiskey
       bottleTypes,    // Distinct bottle records / unique labels
       totalBottles,   // Actual physical bottle inventory count
       // Legacy alias — kept for backward compatibility but refers to bottleTypes
       count: bottleTypes,
       value: bottlesValue,
       open: openBottles,
       unopened: unopenedBottles,
       // Legacy alias
       sealed: unopenedBottles,
       favorite: bottlesList.filter(b => b.favorite).length,
       rated: bottlesList.filter(b => b.rating).length,
       avgRating: bottlesList.filter(b => b.rating).length > 0
         ? (bottlesList.reduce((sum, b) => sum + (b.rating || 0), 0) / bottlesList.filter(b => b.rating).length).toFixed(2)
         : 0,
       tastings: tastingLogsList.length,
     };

    // === USAGE PATTERNS ===
    const pipeUsageMap = {};
    smokingLogsList.forEach(log => {
      if (log.pipe_id) {
        pipeUsageMap[log.pipe_id] = (pipeUsageMap[log.pipe_id] || 0) + 1;
      }
    });

    // Key by bottle_id (primary) with bottle_name as fallback for legacy logs
    const bottleUsageMap = {};
    tastingLogsList.forEach(log => {
      const key = log.bottle_id || log.bottle_name;
      if (key) bottleUsageMap[key] = (bottleUsageMap[key] || 0) + 1;
    });

    // === HIGHLIGHTS ===
    const mostUsedPipe = pipesList.length > 0
      ? pipesList.reduce((max, p) => {
          const pUses = pipeUsageMap[p.id] || 0;
          const maxUses = pipeUsageMap[max.id] || 0;
          return pUses > maxUses ? p : max;
        })
      : null;

    const mostTastedBottle = bottlesList.length > 0
      ? bottlesList.reduce((max, b) => {
          const bKey = b.id || b.name;
          const maxKey = max.id || max.name;
          const bUses = bottleUsageMap[bKey] || 0;
          const maxUses = bottleUsageMap[maxKey] || 0;
          return bUses > maxUses ? b : max;
        })
      : null;

    // Final lookup uses id-first fallback consistent with map creation
    const mostTastedBottleKey = mostTastedBottle?.id || mostTastedBottle?.name;
    const tastings = mostTastedBottleKey ? (bottleUsageMap[mostTastedBottleKey] || 0) : 0;

    const mostValuedBottle = bottlesList.length > 0
      ? bottlesList.reduce((max, b) => {
          const bVal = getBottleValue(b);
          const maxVal = getBottleValue(max);
          return bVal > maxVal ? b : max;
        })
      : null;

    const oldestBottle = bottlesList.length > 0
      ? bottlesList.reduce((oldest, b) => {
          if (!oldest.purchase_date) return b;
          if (!b.purchase_date) return oldest;
          return new Date(b.purchase_date) < new Date(oldest.purchase_date) ? b : oldest;
        })
      : null;

    const oldestPipe = pipesList.length > 0
      ? pipesList.reduce((oldest, p) => {
          if (!oldest.purchase_date) return p;
          if (!p.purchase_date) return oldest;
          return new Date(p.purchase_date) < new Date(oldest.purchase_date) ? p : oldest;
        })
      : null;

    const highestRatedBottle = bottlesList.filter(b => b.rating).length > 0
      ? bottlesList.reduce((max, b) => {
          const bRating = b.rating || 0;
          const maxRating = max.rating || 0;
          return bRating > maxRating ? b : max;
        })
      : null;

    // === TOTALS ===
    const totalItems = pipesCount + tobaccosCount + bottlesList.length;
    const totalValue = pipesValue + tobaccosValue + bottlesValue;

    return {
      // Per-module statistics
      pipes: pipeStats,
      tobacco: tobaccoStats,
      whiskey: whiskeyStats,

      // Combined totals
      total: {
        items: totalItems,
        value: totalValue,
        sessions: smokingLogsList.length,
        tastings: tastingLogsList.length,
      },

      // Highlights
      highlights: {
        mostUsedPipe: mostUsedPipe ? {
          id: mostUsedPipe.id,
          name: mostUsedPipe.name,
          uses: pipeUsageMap[mostUsedPipe.id] || 0,
          value: getPipeValue(mostUsedPipe),
        } : null,
        mostTastedBottle: mostTastedBottle ? {
          id: mostTastedBottle.id,
          name: mostTastedBottle.name,
          tastings: tastings,
        } : null,
        mostValuedBottle: mostValuedBottle ? {
          id: mostValuedBottle.id,
          name: mostValuedBottle.name,
          value: getBottleValue(mostValuedBottle),
          category: mostValuedBottle.type?.toLowerCase().includes('wine') ? 'wine' : 'whiskey',
        } : null,
        oldestBottle,
        oldestPipe,
        highestRatedBottle,
      },

      // Raw data for further processing (stories, reports, etc.)
      raw: {
        pipes: pipesList,
        tobaccos: tobaccosList,
        bottles: bottlesList,
        smokingLogs: smokingLogsList,
        tastingLogs: tastingLogsList,
      },
    };
  } catch (error) {
    console.error('[collectionAggregation] Error:', error?.message);
    return getEmptyAggregation();
  }
}

/**
 * Get empty aggregation structure
 */
export function getEmptyAggregation() {
  return {
    pipes: { count: 0, value: 0, favorite: 0, rated: 0, avgRating: 0 },
    tobacco: { count: 0, value: 0, favorite: 0, rated: 0, avgRating: 0, open: 0, cellared: 0 },
    whiskey: { bottleTypes: 0, totalBottles: 0, count: 0, value: 0, open: 0, unopened: 0, sealed: 0, favorite: 0, rated: 0, avgRating: 0, tastings: 0 },
    total: { items: 0, value: 0, sessions: 0, tastings: 0 },
    highlights: {
      mostUsedPipe: null,
      mostTastedBottle: null,
      mostValuedBottle: null,
      oldestBottle: null,
      oldestPipe: null,
      highestRatedBottle: null,
    },
    raw: {
      pipes: [],
      tobaccos: [],
      bottles: [],
      smokingLogs: [],
      tastingLogs: [],
    },
  };
}