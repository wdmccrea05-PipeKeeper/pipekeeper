/**
 * Cellar inventory reconciliation utilities
 * Detect and fix drift between CellarLog ledger and TobaccoBlend rollup fields
 * 
 * SOURCE OF TRUTH: CellarLog transactions are canonical
 * TobaccoBlend.tin_tins_cellared/bulk_cellared/pouch_pouches_cellared are DERIVED
 */

import { calculateCellaredOzFromLogs, calculateCellaredOzFromBlend, detectCellarDrift } from './tobaccoQuantityHelpers';

/**
 * Analyze entire collection for cellar drift
 * Returns array of blends with detected discrepancies
 */
export function analyzeCellarDrift(blends, cellarLogs) {
  const drifted = [];
  
  (blends || []).forEach(blend => {
    if (!blend) return;
    
    const analysis = detectCellarDrift(blend, cellarLogs);
    
    if (analysis.hasDrift) {
      drifted.push({
        blend_id: blend.id,
        blend_name: blend.name,
        ...analysis
      });
    }
  });
  
  return drifted;
}

/**
 * Generate reconciliation report
 * Shows what would change if we reconcile from CellarLog
 */
export function generateReconciliationReport(blends, cellarLogs) {
  const drifted = analyzeCellarDrift(blends, cellarLogs);
  
  const summary = {
    total_blends: blends.length,
    drifted_count: drifted.length,
    total_drift_oz: drifted.reduce((sum, d) => sum + Math.abs(d.drift), 0),
    blends_needing_update: drifted
  };
  
  return summary;
}

/**
 * Calculate correct cellared values from CellarLog for a blend
 * Returns { tin_tins_cellared, bulk_cellared, pouch_pouches_cellared }
 */
export function calculateCorrectCellaredValues(blend, cellarLogs) {
  const blendLogs = (cellarLogs || []).filter(log => String(log.blend_id) === String(blend.id));
  
  // Group by container type
  const byContainer = {
    tin: 0,
    bulk: 0,
    pouch: 0,
    jar: 0,
    other: 0
  };
  
  blendLogs.forEach(log => {
    if (!log) return;
    const amount = Number(log.amount_oz) || 0;
    const container = (log.container_type || 'other').toLowerCase();
    
    const delta = log.transaction_type === 'added' ? amount : -amount;
    
    if (container === 'tin') byContainer.tin += delta;
    else if (container === 'bulk' || container === 'jar') byContainer.bulk += delta;
    else if (container === 'pouch') byContainer.pouch += delta;
    else byContainer.other += delta;
  });
  
  // Convert oz back to counts for tins/pouches
  const tinSize = Number(blend.tin_size_oz) || 1;
  const pouchSize = Number(blend.pouch_size_oz) || 1;
  
  return {
    tin_tins_cellared: Math.max(0, Math.round(byContainer.tin / tinSize)),
    bulk_cellared: Math.max(0, byContainer.bulk + byContainer.jar + byContainer.other),
    pouch_pouches_cellared: Math.max(0, Math.round(byContainer.pouch / pouchSize))
  };
}

/**
 * User-facing reconciliation UI helper
 * Returns human-readable drift info
 */
export function formatDriftInfo(drift) {
  if (!drift.hasDrift) return null;
  
  const diff = drift.logValue - drift.entityValue;
  const direction = diff > 0 ? 'under-reported' : 'over-reported';
  
  return {
    severity: Math.abs(diff) > 2 ? 'high' : Math.abs(diff) > 0.5 ? 'medium' : 'low',
    message: `Cellared amount is ${direction} by ${Math.abs(diff).toFixed(2)} oz`,
    correction: `Should be ${drift.logValue.toFixed(2)} oz (currently ${drift.entityValue.toFixed(2)} oz)`
  };
}