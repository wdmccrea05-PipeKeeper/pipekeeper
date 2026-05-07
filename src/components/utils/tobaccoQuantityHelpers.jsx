/**
 * CANONICAL tobacco quantity calculation helpers
 * Single source of truth for all quantity rollups across Stats, Exports, Home
 */

import { selectCellarValue } from '@/lib/collection/tobaccoSelectors';

/**
 * Calculate total ounces from TobaccoBlend entity fields
 */
export function calculateTotalOzFromBlend(blend) {
  if (!blend) return 0;
  
  const tinOz = Number(blend.tin_total_quantity_oz) || 0;
  const bulkOz = Number(blend.bulk_total_quantity_oz) || 0;
  const pouchOz = Number(blend.pouch_total_quantity_oz) || 0;
  
  return tinOz + bulkOz + pouchOz;
}

/**
 * Calculate open quantity from TobaccoBlend entity fields
 */
export function calculateOpenOzFromBlend(blend) {
  if (!blend) return 0;
  
  const tinOpen = (Number(blend.tin_tins_open) || 0) * (Number(blend.tin_size_oz) || 0);
  const bulkOpen = Number(blend.bulk_open) || 0;
  const pouchOpen = (Number(blend.pouch_pouches_open) || 0) * (Number(blend.pouch_size_oz) || 0);
  
  return tinOpen + bulkOpen + pouchOpen;
}

/**
 * Calculate cellared quantity from TobaccoBlend entity fields
 */
export function calculateCellaredOzFromBlend(blend) {
  if (!blend) return 0;
  
  const tinCellared = (Number(blend.tin_tins_cellared) || 0) * (Number(blend.tin_size_oz) || 0);
  const bulkCellared = Number(blend.bulk_cellared) || 0;
  const pouchCellared = (Number(blend.pouch_pouches_cellared) || 0) * (Number(blend.pouch_size_oz) || 0);
  
  return tinCellared + bulkCellared + pouchCellared;
}

/**
 * Calculate CANONICAL cellared amount from CellarLog transactions
 * This is the SOURCE OF TRUTH for cellared tobacco
 */
export function calculateCellaredOzFromLogs(cellarLogs, blendId = null) {
  const logs = Array.isArray(cellarLogs) ? cellarLogs : [];
  
  // Filter to specific blend if blendId provided
  const relevantLogs = blendId 
    ? logs.filter(log => String(log.blend_id) === String(blendId))
    : logs;
  
  const netOz = relevantLogs.reduce((sum, log) => {
    if (!log) return sum;
    const amount = Number(log.amount_oz) || 0;
    
    if (log.transaction_type === 'added') {
      return sum + amount;
    } else if (log.transaction_type === 'removed') {
      return sum - amount;
    }
    return sum;
  }, 0);
  return Math.max(0, netOz);
}

/**
 * Get breakdown by blend from cellar logs
 */
export function getCellarBreakdownFromLogs(cellarLogs, blends = []) {
  const logs = Array.isArray(cellarLogs) ? cellarLogs : [];
  const byBlend = {};
  
  logs.forEach(log => {
    if (!log || !log.blend_id) return;
    
    if (!byBlend[log.blend_id]) {
      byBlend[log.blend_id] = {
        blend_id: log.blend_id,
        blend_name: log.blend_name,
        totalOz: 0
      };
    }
    
    const amount = Number(log.amount_oz) || 0;
    if (log.transaction_type === 'added') {
      byBlend[log.blend_id].totalOz += amount;
    } else if (log.transaction_type === 'removed') {
      byBlend[log.blend_id].totalOz -= amount;
    }
  });
  
  return Object.values(byBlend)
    .filter(b => b.totalOz > 0)
    .sort((a, b) => b.totalOz - a.totalOz);
}

/**
 * Calculate total collection value for tobacco
 * Uses manual_market_value or ai_estimated_value per oz
 * FIXED: Uses single source of truth to avoid double-counting
 */
export function calculateTobaccoCollectionValue(blends, _cellarLogs = []) {
  return selectCellarValue(Array.isArray(blends) ? blends : []);
}

/**
 * Detect drift between CellarLog ledger and TobaccoBlend rollup fields
 */
export function detectCellarDrift(blend, cellarLogs) {
  const logCellared = calculateCellaredOzFromLogs(cellarLogs, blend.id);
  const entityCellared = calculateCellaredOzFromBlend(blend);
  
  const drift = Math.abs(logCellared - entityCellared);
  
  if (drift > 0.5) {
    console.warn(
      `[CellarDrift] Blend "${blend.tobacco_name || blend.name || blend.id}": log-based=${logCellared.toFixed(2)} oz, entity-based=${entityCellared.toFixed(2)} oz, delta=${drift.toFixed(2)} oz`
    );
  }

  return {
    hasDrift: drift > 0.5, // 0.5 oz tolerance for rounding
    logValue: logCellared,
    entityValue: entityCellared,
    drift
  };
}
