/**
 * CANONICAL ENGINE ROUTER
 * 
 * Single point of entry for all Curator engines.
 * Ensures consistent behavior across all surfaces.
 * Enforces module compatibility rules.
 * Logs every engine execution.
 */

import { generateRecommendations } from './recommendationEngine.js';
import { generatePairingRecommendations } from './pairingEngine.js';
import { generateGrowExpandRecommendations } from './growExpandEngine.js';

/**
 * RULE 4: Router with explicit failure logging
 */
export function runCuratorEngines(curatorContext = {}) {
  const { activeModules = {} } = curatorContext;
  
  const results = {
    recordOptimization: [],
    collectionOptimization: [],
    purchaseRestock: [],
    pairings: [],
    growExpand: [],
    planSession: [],
    _engineLog: [],
  };

  // ─── Record Optimization ───────────────────────────────────
  try {
    const recs = generateRecommendations(curatorContext);
    const filtered = recs.filter((r) => r?.category === 'record_optimization');
    results.recordOptimization = filtered;
    results._engineLog.push({
      engine: 'recordOptimization',
      status: filtered.length > 0 ? 'success' : 'no_recommendations',
      count: filtered.length,
    });
  } catch (err) {
    console.error('ENGINE_FAILURE', { engine: 'recordOptimization', error: err.message });
    results._engineLog.push({
      engine: 'recordOptimization',
      status: 'error',
      error: err.message,
    });
  }

  // ─── Collection Optimization ───────────────────────────────
  try {
    const recs = generateRecommendations(curatorContext);
    const filtered = recs.filter((r) => r?.category === 'collection_optimization');
    results.collectionOptimization = filtered;
    results._engineLog.push({
      engine: 'collectionOptimization',
      status: filtered.length > 0 ? 'success' : 'no_recommendations',
      count: filtered.length,
    });
  } catch (err) {
    console.error('ENGINE_FAILURE', { engine: 'collectionOptimization', error: err.message });
    results._engineLog.push({
      engine: 'collectionOptimization',
      status: 'error',
      error: err.message,
    });
  }

  // ─── Purchase & Restock ────────────────────────────────────
  try {
    const recs = generateRecommendations(curatorContext);
    const filtered = recs.filter((r) => r?.category === 'purchase');
    results.purchaseRestock = filtered;
    results._engineLog.push({
      engine: 'purchaseRestock',
      status: filtered.length > 0 ? 'success' : 'no_recommendations',
      count: filtered.length,
    });
  } catch (err) {
    console.error('ENGINE_FAILURE', { engine: 'purchaseRestock', error: err.message });
    results._engineLog.push({
      engine: 'purchaseRestock',
      status: 'error',
      error: err.message,
    });
  }

  // ─── Pairings (session-family engine) ──────────────────────
  try {
    const pairings = generatePairingRecommendations(curatorContext) || [];
    results.pairings = pairings;
    results._engineLog.push({
      engine: 'pairings',
      status: pairings.length > 0 ? 'success' : 'no_pairings',
      count: pairings.length,
      reason: pairings.length === 0 ? 'no_supported_pairing_families' : null,
    });
  } catch (err) {
    console.error('ENGINE_FAILURE', { engine: 'pairings', error: err.message });
    results._engineLog.push({
      engine: 'pairings',
      status: 'error',
      error: err.message,
    });
  }

  // ─── Grow & Expand (module-aware) ──────────────────────────
  try {
    const growExpand = generateGrowExpandRecommendations({
      pipes: curatorContext.pipes || [],
      blends: curatorContext.blends || [],
      bottles: curatorContext.bottles || [],
      smokingLogs: curatorContext.smokingLogs || [],
      preferences: curatorContext.preferences || {},
      activeModules,
    }) || [];
    results.growExpand = growExpand;
    results._engineLog.push({
      engine: 'growExpand',
      status: growExpand.length > 0 ? 'success' : 'no_recommendations',
      count: growExpand.length,
    });
  } catch (err) {
    console.error('ENGINE_FAILURE', { engine: 'growExpand', error: err.message });
    results._engineLog.push({
      engine: 'growExpand',
      status: 'error',
      error: err.message,
    });
  }

  // ─── Global Logging ────────────────────────────────────────
  console.log('CURATOR_ENGINE_ROUTER', {
    engines: results._engineLog,
    modules: activeModules,
    timestamp: new Date().toISOString(),
  });

  return results;
}
