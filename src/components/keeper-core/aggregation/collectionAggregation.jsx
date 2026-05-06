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
import { getPipeValue } from '@/components/keeper-core/value/valueAggregation';
import {
  selectWhiskeyMetrics,
  getBottleUnitValue,
} from '@/lib/collection/whiskeySelectors';
import { getBlendValue } from '@/lib/collection/tobaccoSelectors';
import {
  selectCigarMetrics,
  getCigarUnitValue,
  getCigarAvailableQuantity,
} from '@/lib/collection/cigarSelectors';
import {
  getWineTotalValue,
  selectWineCollectionValue,
  selectTotalWineBottles,
  selectWineCount,
} from '@/lib/collection/wineSelectors';



/**
 * Get total tobacco value using the canonical getBlendValue selector.
 */
function getTobaccoValue(blend) {
  return getBlendValue(blend);
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
    const [userByEmail, userByUserEmail, profileByUserEmail, profileByCreatedBy] = await Promise.all([
      base44.entities.User.filter({ email: userEmail }).catch(() => []),
      base44.entities.User.filter({ user_email: userEmail }).catch(() => []),
      base44.entities.UserProfile.filter({ user_email: userEmail }).catch(() => []),
      base44.entities.UserProfile.filter({ created_by: userEmail }).catch(() => []),
    ]);

    const userContext = userByEmail?.[0] || userByUserEmail?.[0] || null;
    const profileContext = profileByUserEmail?.[0] || profileByCreatedBy?.[0] || null;

    // Fetch only data for modules allowed by the canonical release state.
    // Blocked modules never issue queries — no data leaks into stories, summaries, or reports.
    const fetchWhiskey = shouldFetchModuleData('whiskeykeeper', userContext);
    const fetchPipe = shouldFetchModuleData('pipekeeper', userContext);
    const fetchCigar =
      shouldFetchModuleData('cigarkeeper', userContext) ||
      profileContext?.cigarkeeper_enabled === true;
    // WineKeeper: internal/admin only — shouldFetchModuleData respects the 'internal' release state
    const fetchWine = shouldFetchModuleData('winekeeper', userContext);

    const [pipes, tobaccos, bottles, smokingLogs, tastingLogs, inventoryUnits, cigars, cigarSessions, humidors, wines, wineTastings] = await Promise.all([
      fetchPipe ? base44.entities.Pipe.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchPipe ? base44.entities.TobaccoBlend.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.Bottle.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchPipe ? base44.entities.SmokingLog.filter({ created_by: userEmail }, '-date', 1000).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.TastingLog.filter({ created_by: userEmail }, '-tasting_date', 1000).catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? base44.entities.WhiskeyInventoryUnit.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchCigar ? base44.entities.Cigar.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchCigar ? base44.entities.CigarSession.filter({ created_by: userEmail }, '-date', 1000).catch(() => []) : Promise.resolve([]),
      fetchCigar ? base44.entities.HumidorLocation.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchWine ? base44.entities.Wine.filter({ created_by: userEmail }).catch(() => []) : Promise.resolve([]),
      fetchWine ? base44.entities.WineTasting.filter({ created_by: userEmail }, '-date', 200).catch(() => []) : Promise.resolve([]),
    ]);

    const pipesList = Array.isArray(pipes) ? pipes : [];
    const tobaccosList = Array.isArray(tobaccos) ? tobaccos : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const smokingLogsList = Array.isArray(smokingLogs) ? smokingLogs : [];
    const tastingLogsList = Array.isArray(tastingLogs) ? tastingLogs : [];
    const inventoryUnitsList = Array.isArray(inventoryUnits) ? inventoryUnits : [];
    const cigarsList = Array.isArray(cigars) ? cigars : [];
    const cigarSessionsList = Array.isArray(cigarSessions) ? cigarSessions : [];
    const humidorsList = Array.isArray(humidors) ? humidors : [];
    const winesList = Array.isArray(wines) ? wines : [];
    const wineTastingsList = Array.isArray(wineTastings) ? wineTastings : [];

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
     // All metrics derived from canonical selectors — no ad-hoc calculations here.
     const canonicalWhiskey = selectWhiskeyMetrics(bottlesList, inventoryUnitsList, tastingLogsList);

     const whiskeyStats = {
       // Canonical dual metrics — use these everywhere, never use just "count" for whiskey
       bottleTypes: canonicalWhiskey.bottle_types,
       totalBottles: canonicalWhiskey.total_bottles,
       // Legacy alias — kept for backward compatibility but refers to bottleTypes
       count: canonicalWhiskey.bottle_types,
       value: canonicalWhiskey.collection_value,
       open: canonicalWhiskey.open_bottles,
       unopened: canonicalWhiskey.sealed_bottles,
       // Legacy alias
       sealed: canonicalWhiskey.sealed_bottles,
       favorite: bottlesList.filter(b => b.favorite).length,
       rated: bottlesList.filter(b => b.rating).length,
       avgRating: bottlesList.filter(b => b.rating).length > 0
         ? (bottlesList.reduce((sum, b) => sum + (b.rating || 0), 0) / bottlesList.filter(b => b.rating).length).toFixed(2)
         : 0,
       tastings: canonicalWhiskey.total_tastings,
     };

    // === CIGAR MODULE ===
    const canonicalCigar = selectCigarMetrics(cigarsList, humidorsList);
    const ratedCigars = cigarsList.filter(c => c.rating);
    const cigarStats = {
      cigarTypes: canonicalCigar.cigar_types,
      totalSticks: canonicalCigar.total_sticks,
      readyToSmoke: canonicalCigar.ready_to_smoke_count,
      humidorCount: canonicalCigar.humidor_count,
      count: canonicalCigar.cigar_types, // legacy alias
      value: canonicalCigar.collection_value,
      favorite: cigarsList.filter(c => c.is_favorite).length,
      rated: ratedCigars.length,
      avgRating: ratedCigars.length > 0
        ? (ratedCigars.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedCigars.length).toFixed(2)
        : 0,
      sessions: cigarSessionsList.length,
    };

    // === WINE MODULE (internal/admin only) ===
    // All metrics derived from canonical wineSelectors — no ad-hoc calculations here.
    const wineStats = {
      wineTypes: selectWineCount(winesList),       // distinct wine entries
      totalBottles: selectTotalWineBottles(winesList), // sum of all quantities
      count: selectWineCount(winesList),           // legacy alias
      value: selectWineCollectionValue(winesList), // canonical priority chain
      tastings: wineTastingsList.length,
      favorite: winesList.filter(w => w.is_favorite).length,
      rated: wineTastingsList.filter(wt => wt.rating).length,
    };

    // Most valuable wine (for highlights) — uses canonical getWineTotalValue
    const mostValuableWine = winesList.length > 0
      ? winesList.reduce((max, w) => getWineTotalValue(w) > getWineTotalValue(max) ? w : max)
      : null;

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

    const cigarUsageMap = {};
    cigarSessionsList.forEach(log => {
      if (log.cigar_id && !log.is_out_of_collection) {
        cigarUsageMap[log.cigar_id] = (cigarUsageMap[log.cigar_id] || 0) + 1;
      }
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
          const bVal = getBottleUnitValue(b);
          const maxVal = getBottleUnitValue(max);
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

    const mostSmokedCigar = cigarsList.length > 0
      ? cigarsList.reduce((max, c) => {
          const cUses = cigarUsageMap[c.id] || 0;
          const maxUses = cigarUsageMap[max.id] || 0;
          return cUses > maxUses ? c : max;
        })
      : null;

    const highestRatedCigar = cigarsList.filter(c => c.rating).length > 0
      ? cigarsList.reduce((max, c) => {
          const cRating = c.rating || 0;
          const maxRating = max.rating || 0;
          return cRating > maxRating ? c : max;
        })
      : null;

    const highestValueCigar = cigarsList.length > 0
      ? cigarsList.reduce((max, c) => {
          const cVal = getCigarUnitValue(c) * getCigarAvailableQuantity(c);
          const maxVal = getCigarUnitValue(max) * getCigarAvailableQuantity(max);
          return cVal > maxVal ? c : max;
        })
      : null;

    const allModuleValueLeaders = [
      mostValuedBottle
        ? { recordType: 'bottle', record: mostValuedBottle, value: getBottleUnitValue(mostValuedBottle) }
        : null,
      highestValueCigar
        ? {
            recordType: 'cigar',
            record: highestValueCigar,
            value: getCigarUnitValue(highestValueCigar) * getCigarAvailableQuantity(highestValueCigar),
          }
        : null,
      pipesList.length > 0
        ? {
            recordType: 'pipe',
            record: pipesList.reduce((max, p) => (getPipeValue(p) > getPipeValue(max) ? p : max)),
            value: pipesList.reduce((max, p) => Math.max(max, getPipeValue(p)), 0),
          }
        : null,
      tobaccosList.length > 0
        ? {
            recordType: 'blend',
            record: tobaccosList.reduce((max, b) => (getTobaccoValue(b) > getTobaccoValue(max) ? b : max)),
            value: tobaccosList.reduce((max, b) => Math.max(max, getTobaccoValue(b)), 0),
          }
        : null,
      mostValuableWine && getWineTotalValue(mostValuableWine) > 0
        ? { recordType: 'wine', record: mostValuableWine, value: getWineTotalValue(mostValuableWine) }
        : null,
    ].filter(Boolean);

    const mostValuableItem = allModuleValueLeaders.sort((a, b) => b.value - a.value)[0] || null;

    // === TOTALS ===
    const totalItems = pipesCount + tobaccosCount + bottlesList.length + cigarsList.length + winesList.length;
    const totalValue = pipesValue + tobaccosValue + whiskeyStats.value + cigarStats.value + wineStats.value;

    return {
      // Per-module statistics
      pipes: pipeStats,
      tobacco: tobaccoStats,
      whiskey: whiskeyStats,
      cigar: cigarStats,
      wine: wineStats,

      // Combined totals
      total: {
        items: totalItems,
        value: totalValue,
        sessions: smokingLogsList.length,
        tastings: tastingLogsList.length,
        cigarSessions: cigarSessionsList.length,
        wineTastings: wineTastingsList.length,
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
          value: getBottleUnitValue(mostValuedBottle),
          category: mostValuedBottle.type?.toLowerCase().includes('wine') ? 'wine' : 'whiskey',
        } : null,
        mostSmokedCigar: mostSmokedCigar ? {
          id: mostSmokedCigar.id,
          name: mostSmokedCigar.name,
          sessions: cigarUsageMap[mostSmokedCigar.id] || 0,
          value: getCigarUnitValue(mostSmokedCigar) * getCigarAvailableQuantity(mostSmokedCigar),
        } : null,
        highestRatedCigar: highestRatedCigar ? {
          id: highestRatedCigar.id,
          name: highestRatedCigar.name,
          rating: highestRatedCigar.rating || 0,
        } : null,
        highestValueCigar: highestValueCigar ? {
          id: highestValueCigar.id,
          name: highestValueCigar.name,
          value: getCigarUnitValue(highestValueCigar) * getCigarAvailableQuantity(highestValueCigar),
        } : null,
        mostValuableItem: mostValuableItem ? {
          id: mostValuableItem.record.id,
          name: mostValuableItem.record.name,
          recordType: mostValuableItem.recordType,
          value: mostValuableItem.value,
        } : null,
        mostValuableWine: mostValuableWine && getWineTotalValue(mostValuableWine) > 0 ? {
          id: mostValuableWine.id,
          name: mostValuableWine.name,
          value: getWineTotalValue(mostValuableWine),
          varietal: mostValuableWine.varietal,
          vintage: mostValuableWine.vintage,
          photos: mostValuableWine.photos,
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
        cigars: cigarsList,
        cigarSessions: cigarSessionsList,
        humidors: humidorsList,
        smokingLogs: smokingLogsList,
        tastingLogs: tastingLogsList,
        wines: winesList,
        wineTastings: wineTastingsList,
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
    cigar: { cigarTypes: 0, totalSticks: 0, readyToSmoke: 0, humidorCount: 0, count: 0, value: 0, favorite: 0, rated: 0, avgRating: 0, sessions: 0 },
    wine: { wineTypes: 0, totalBottles: 0, count: 0, value: 0, tastings: 0, favorite: 0, rated: 0 },
    total: { items: 0, value: 0, sessions: 0, tastings: 0, cigarSessions: 0, wineTastings: 0 },
    highlights: {
      mostUsedPipe: null,
      mostTastedBottle: null,
      mostValuedBottle: null,
      mostSmokedCigar: null,
      highestRatedCigar: null,
      highestValueCigar: null,
      mostValuableItem: null,
      mostValuableWine: null,
      oldestBottle: null,
      oldestPipe: null,
      highestRatedBottle: null,
    },
    raw: {
      pipes: [],
      tobaccos: [],
      bottles: [],
      cigars: [],
      cigarSessions: [],
      humidors: [],
      smokingLogs: [],
      tastingLogs: [],
      wines: [],
      wineTastings: [],
    },
  };
}