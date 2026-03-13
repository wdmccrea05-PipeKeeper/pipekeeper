import { useMemo } from 'react';

/**
 * useCollectionInsights Hook
 * Calculates collection statistics from existing data
 * Safe: uses optional chaining and defaults on all data
 */
export function useCollectionInsights(pipes = [], blends = [], smokingLogs = []) {
  return useMemo(() => {
    // Safely normalize inputs
    const safePipes = Array.isArray(pipes) ? pipes : [];
    const safeBlends = Array.isArray(blends) ? blends : [];
    const safeLogs = Array.isArray(smokingLogs) ? smokingLogs : [];

    const insights = {
      totalPipes: safePipes.length || 0,
      totalBlends: safeBlends.length || 0,
      totalBowlsLogged: safeLogs.reduce((sum, log) => sum + (Number(log?.bowls_used) || 1), 0) || 0,
      mostUsedPipe: null,
      mostUsedPipeShape: null,
      mostSmokedBlend: null,
      cellarSize: 0,
    };

    // Calculate most used pipe
    if (safeLogs.length > 0 && safePipes.length > 0) {
      const pipeCounts = {};
      safeLogs.forEach((log) => {
        const pipeId = log?.pipe_id;
        if (pipeId) {
          pipeCounts[pipeId] = (pipeCounts[pipeId] || 0) + (Number(log?.bowls_used) || 1);
        }
      });
      
      const topPipeId = Object.entries(pipeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topPipeId) {
        insights.mostUsedPipe = safePipes.find(p => String(p?.id) === String(topPipeId)) || null;
      }
    }

    // Calculate most used pipe shape
    if (safeLogs.length > 0 && safePipes.length > 0) {
      const shapeCounts = {};
      safeLogs.forEach((log) => {
        const pipeId = log?.pipe_id;
        const pipe = safePipes.find(p => String(p?.id) === String(pipeId));
        const shape = pipe?.shape;
        if (shape && shape !== 'Unknown') {
          shapeCounts[shape] = (shapeCounts[shape] || 0) + (Number(log?.bowls_used) || 1);
        }
      });
      
      const topShape = Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      insights.mostUsedPipeShape = topShape || null;
    }

    // Calculate most smoked blend
    if (safeLogs.length > 0 && safeBlends.length > 0) {
      const blendCounts = {};
      safeLogs.forEach((log) => {
        const blendId = log?.blend_id;
        if (blendId) {
          blendCounts[blendId] = (blendCounts[blendId] || 0) + (Number(log?.bowls_used) || 1);
        }
      });
      
      const topBlendId = Object.entries(blendCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topBlendId) {
        insights.mostSmokedBlend = safeBlends.find(b => String(b?.id) === String(topBlendId)) || null;
      }
    }

    // Calculate cellar size (oz) - sum of cellared amounts from TobaccoBlend
    insights.cellarSize = safeBlends.reduce((sum, blend) => {
      const tinCellared = Number(blend?.tin_cellared) || 0;
      const tinSize = Number(blend?.tin_size_oz) || 0;
      const bulkCellared = Number(blend?.bulk_cellared) || 0;
      const pouchCellared = Number(blend?.pouch_cellared) || 0;
      const pouchSize = Number(blend?.pouch_size_oz) || 0;
      
      return sum + (tinCellared * tinSize) + bulkCellared + (pouchCellared * pouchSize);
    }, 0) || 0;

    return insights;
  }, [pipes?.length, blends?.length, smokingLogs?.length]);
}