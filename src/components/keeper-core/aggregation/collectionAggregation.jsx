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
import {
  selectPipeMetrics,
  getPipeUnitValue,
} from '@/lib/collection/pipeSelectors';
import {
  selectWhiskeyMetrics,
  getBottleUnitValue,
} from '@/lib/collection/whiskeySelectors';
import {
  selectTobaccoMetrics,
  getBlendValue,
} from '@/lib/collection/tobaccoSelectors';
import {
  selectCigarMetrics,
  getCigarUnitValue,
  getCigarAvailableQuantity,
} from '@/lib/collection/cigarSelectors';
import {
  getWineTotalValue,
  selectWineMetrics,
} from '@/lib/collection/wineSelectors';
import {
  selectActivePipes,
  selectActiveBlends,
  selectActiveBottles,
  selectActiveCigars,
  selectActiveWines,
  selectActiveInventoryUnits,
} from '@/lib/collection/activeFilters';
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';
import { getAverageRating } from '@/shared/utils/calculations/collectionStats';
import { selectFavoriteCount } from '@/lib/analytics/breakdownUtils';



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
      fetchPipe ? fetchAllEntities(base44.entities.Pipe, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:Pipe').catch(() => []) : Promise.resolve([]),
      fetchPipe ? fetchAllEntities(base44.entities.TobaccoBlend, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:TobaccoBlend').catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? fetchAllEntities(base44.entities.Bottle, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:Bottle').catch(() => []) : Promise.resolve([]),
      fetchPipe ? fetchAllEntities(base44.entities.SmokingLog, { created_by: userEmail }, '-date', 5000, 200, 'collectionAggregation:SmokingLog').catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? fetchAllEntities(base44.entities.TastingLog, { created_by: userEmail }, '-tasting_date', 5000, 200, 'collectionAggregation:TastingLog').catch(() => []) : Promise.resolve([]),
      fetchWhiskey ? fetchAllEntities(base44.entities.WhiskeyInventoryUnit, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:WhiskeyInventoryUnit').catch(() => []) : Promise.resolve([]),
      fetchCigar ? fetchAllEntities(base44.entities.Cigar, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:Cigar').catch(() => []) : Promise.resolve([]),
      fetchCigar ? fetchAllEntities(base44.entities.CigarSession, { created_by: userEmail }, '-date', 5000, 200, 'collectionAggregation:CigarSession').catch(() => []) : Promise.resolve([]),
      fetchCigar ? fetchAllEntities(base44.entities.HumidorLocation, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:HumidorLocation').catch(() => []) : Promise.resolve([]),
      fetchWine ? fetchAllEntities(base44.entities.Wine, { created_by: userEmail }, '-updated_date', 5000, 200, 'collectionAggregation:Wine').catch(() => []) : Promise.resolve([]),
      fetchWine ? fetchAllEntities(base44.entities.WineTasting, { created_by: userEmail }, '-date', 5000, 200, 'collectionAggregation:WineTasting').catch(() => []) : Promise.resolve([]),
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
    const activePipes = selectActivePipes(pipesList);
    const activeTobaccos = selectActiveBlends(tobaccosList);
    const activeBottles = selectActiveBottles(bottlesList);
    const activeInventoryUnits = selectActiveInventoryUnits(inventoryUnitsList);
    const activeCigars = selectActiveCigars(cigarsList);
    const activeWines = selectActiveWines(winesList);

    // === PIPES MODULE ===
    const canonicalPipe = selectPipeMetrics(activePipes, smokingLogsList);
    const pipeStats = {
     count: canonicalPipe.pipe_count,
     value: canonicalPipe.collection_value,
     favorite: selectFavoriteCount(activePipes),
     rated: activePipes.filter((p) => Number(p?.rating) > 0).length,
     avgRating: getAverageRating(activePipes, (p) => p?.rating),
    };

    // === TOBACCO MODULE ===
    const canonicalTobacco = selectTobaccoMetrics(activeTobaccos);
    const tobaccoStats = {
     count: canonicalTobacco.blend_types,
     value: canonicalTobacco.cellar_value,
     favorite: selectFavoriteCount(activeTobaccos),
     rated: activeTobaccos.filter((t) => Number(t?.rating) > 0).length,
     avgRating: getAverageRating(activeTobaccos, (t) => t?.rating),
     open: canonicalTobacco.open_blends,
     cellared: activeTobaccos.reduce((sum, t) => {
       const tinOz = (Number(t?.tin_tins_cellared) || 0) * (Number(t?.tin_size_oz) || 0);
       const bulkOz = Number(t?.bulk_cellared) || 0;
       const pouchOz = (Number(t?.pouch_pouches_cellared) || 0) * (Number(t?.pouch_size_oz) || 0);
       return sum + tinOz + bulkOz + pouchOz;
     }, 0),
    };

    // === WHISKEY MODULE ===
     // All metrics derived from canonical selectors — no ad-hoc calculations here.
     const canonicalWhiskey = selectWhiskeyMetrics(activeBottles, activeInventoryUnits, tastingLogsList);

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
      favorite: activeBottles.filter((b) => b?.favorite || b?.is_favorite).length,
      rated: activeBottles.filter((b) => Number(b?.rating) > 0).length,
      avgRating: getAverageRating(activeBottles, (b) => b?.rating),
      tastings: canonicalWhiskey.total_tastings,
     };

    // === CIGAR MODULE ===
    const canonicalCigar = selectCigarMetrics(activeCigars, humidorsList);
    const ratedCigars = activeCigars.filter((c) => Number(c?.rating) > 0);
    const cigarStats = {
      cigarTypes: canonicalCigar.cigar_types,
      totalSticks: canonicalCigar.total_sticks,
      readyToSmoke: canonicalCigar.ready_to_smoke_count,
      humidorCount: canonicalCigar.humidor_count,
      count: canonicalCigar.cigar_types, // legacy alias
      value: canonicalCigar.collection_value,
      favorite: selectFavoriteCount(activeCigars),
      rated: ratedCigars.length,
      avgRating: getAverageRating(activeCigars, (c) => c?.rating),
      sessions: cigarSessionsList.length,
    };

    // === WINE MODULE (internal/admin only) ===
    // All metrics derived from canonical wineSelectors — no ad-hoc calculations here.
    const canonicalWine = selectWineMetrics(activeWines, wineTastingsList);
    const wineStats = {
      wineTypes: canonicalWine.wine_count,
      totalBottles: canonicalWine.total_in_cellar,
      count: canonicalWine.wine_count,
      value: canonicalWine.collection_value,
      tastings: canonicalWine.total_tastings,
      favorite: selectFavoriteCount(activeWines),
      rated: wineTastingsList.filter(wt => wt.rating).length,
      avgRating: canonicalWine.average_rating,
    };

    // Most valuable wine (for highlights) — uses canonical getWineTotalValue
    const mostValuableWine = activeWines.length > 0
      ? activeWines.reduce((max, w) => getWineTotalValue(w) > getWineTotalValue(max) ? w : max)
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
    const mostUsedPipe = activePipes.length > 0
      ? activePipes.reduce((max, p) => {
          const pUses = pipeUsageMap[p.id] || 0;
          const maxUses = pipeUsageMap[max.id] || 0;
          return pUses > maxUses ? p : max;
        })
      : null;

    const mostTastedBottle = activeBottles.length > 0
      ? activeBottles.reduce((max, b) => {
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

    const mostValuedBottle = activeBottles.length > 0
      ? activeBottles.reduce((max, b) => {
          const bVal = getBottleUnitValue(b);
          const maxVal = getBottleUnitValue(max);
          return bVal > maxVal ? b : max;
        })
      : null;

    const oldestBottle = activeBottles.length > 0
      ? activeBottles.reduce((oldest, b) => {
          if (!oldest.purchase_date) return b;
          if (!b.purchase_date) return oldest;
          return new Date(b.purchase_date) < new Date(oldest.purchase_date) ? b : oldest;
        })
      : null;

    const oldestPipe = activePipes.length > 0
      ? activePipes.reduce((oldest, p) => {
          if (!oldest.purchase_date) return p;
          if (!p.purchase_date) return oldest;
          return new Date(p.purchase_date) < new Date(oldest.purchase_date) ? p : oldest;
        })
      : null;

    const highestRatedBottle = activeBottles.filter((b) => Number(b?.rating) > 0).length > 0
      ? activeBottles.reduce((max, b) => {
          const bRating = b.rating || 0;
          const maxRating = max.rating || 0;
          return bRating > maxRating ? b : max;
        })
      : null;

    const mostSmokedCigar = activeCigars.length > 0
      ? activeCigars.reduce((max, c) => {
          const cUses = cigarUsageMap[c.id] || 0;
          const maxUses = cigarUsageMap[max.id] || 0;
          return cUses > maxUses ? c : max;
        })
      : null;

    const highestRatedCigar = ratedCigars.length > 0
      ? ratedCigars.reduce((max, c) => {
          const cRating = c.rating || 0;
          const maxRating = max.rating || 0;
          return cRating > maxRating ? c : max;
        })
      : null;

    const highestValueCigar = activeCigars.length > 0
      ? activeCigars.reduce((max, c) => {
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
      activePipes.length > 0
        ? {
            recordType: 'pipe',
            record: activePipes.reduce((max, p) => (getPipeUnitValue(p) > getPipeUnitValue(max) ? p : max)),
            value: activePipes.reduce((max, p) => Math.max(max, getPipeUnitValue(p)), 0),
          }
        : null,
      activeTobaccos.length > 0
        ? {
            recordType: 'blend',
            record: activeTobaccos.reduce((max, b) => (getBlendValue(b) > getBlendValue(max) ? b : max)),
            value: activeTobaccos.reduce((max, b) => Math.max(max, getBlendValue(b)), 0),
          }
        : null,
      mostValuableWine && getWineTotalValue(mostValuableWine) > 0
        ? { recordType: 'wine', record: mostValuableWine, value: getWineTotalValue(mostValuableWine) }
        : null,
    ].filter(Boolean);

    const mostValuableItem = allModuleValueLeaders.sort((a, b) => b.value - a.value)[0] || null;

    // === TOTALS ===
    const totalItems = pipeStats.count + tobaccoStats.count + whiskeyStats.count + cigarStats.count + wineStats.count;
    const totalValue = pipeStats.value + tobaccoStats.value + whiskeyStats.value + cigarStats.value + wineStats.value;

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
          value: getPipeUnitValue(mostUsedPipe),
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