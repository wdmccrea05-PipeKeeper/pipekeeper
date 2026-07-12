/**
 * collectionValidator.js
 *
 * Development / admin mode validation helper.
 *
 * Compares whiskey metric snapshots from different surfaces (WhiskeyKeeper home,
 * WhiskeyInsights, Collection Hub, reports) and logs a clear warning whenever
 * counts or values diverge.
 *
 * Usage:
 *
 *   import { validateWhiskeyMetrics } from '@/lib/collection/collectionValidator';
 *
 *   // Call after all data has loaded, e.g. in a useEffect:
 *   validateWhiskeyMetrics({
 *     source: 'WhiskeyKeeper',
 *     bottle_types:    metrics.bottle_types,
 *     total_bottles:   metrics.total_bottles,
 *     collection_value: metrics.collection_value,
 *   });
 *
 * In development mode, each source registers its snapshot. When two snapshots
 * are available for the same session, mismatches are reported via console.warn.
 *
 * In production this module is a no-op so there is zero runtime cost.
 */

const isDev = typeof import.meta !== 'undefined'
  ? import.meta.env?.DEV === true
  : (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development');

// In-memory registry of the latest metric snapshot per source
const _snapshots = {};

/**
 * Register a whiskey metric snapshot from a named surface and check for
 * discrepancies against all previously registered snapshots.
 *
 * @param {{
 *   source: string,
 *   bottle_types?: number,
 *   total_bottles?: number,
 *   open_bottles?: number,
 *   sealed_bottles?: number,
 *   collection_value?: number,
 *   total_tastings?: number,
 * }} snapshot
 */
export function validateWhiskeyMetrics(snapshot) {
  if (!isDev) return;
  if (!snapshot?.source) return;

  _snapshots[snapshot.source] = { ...snapshot, _ts: Date.now() };

  const sources = Object.values(_snapshots);
  if (sources.length < 2) return;

  const fields = ['bottle_types', 'total_bottles', 'collection_value', 'total_tastings'];

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      for (const field of fields) {
        if (a[field] === undefined || b[field] === undefined) continue;
        if (a[field] !== b[field]) {
          console.warn(
            `[CollectionValidator] Mismatch detected for "${field}":\n` +
            `  ${a.source}: ${a[field]}\n` +
            `  ${b.source}: ${b[field]}\n` +
            `  → Both surfaces must use selectors from @/lib/collection/whiskeySelectors`
          );
        }
      }
    }
  }
}

/**
 * Register a pipe metric snapshot.
 *
 * @param {{
 *   source: string,
 *   pipe_count?: number,
 *   total_sessions?: number,
 *   collection_value?: number,
 * }} snapshot
 */
export function validatePipeMetrics(snapshot) {
  if (!isDev) return;
  if (!snapshot?.source) return;

  const key = `pipe:${snapshot.source}`;
  _snapshots[key] = { ...snapshot, _ts: Date.now() };

  const pipeSnapshots = Object.entries(_snapshots)
    .filter(([k]) => k.startsWith('pipe:'))
    .map(([, v]) => v);

  if (pipeSnapshots.length < 2) return;

  const fields = ['pipe_count', 'total_sessions', 'collection_value'];
  _checkSnapshots(pipeSnapshots, fields, 'pipeSelectors');
}

/**
 * Register a collection summary snapshot (all modules).
 *
 * @param {{
 *   source: string,
 *   total_value?: number,
 * }} snapshot
 */
export function validateSummaryMetrics(snapshot) {
  if (!isDev) return;
  if (!snapshot?.source) return;

  const key = `summary:${snapshot.source}`;
  _snapshots[key] = { ...snapshot, _ts: Date.now() };

  const summarySnapshots = Object.entries(_snapshots)
    .filter(([k]) => k.startsWith('summary:'))
    .map(([, v]) => v);

  if (summarySnapshots.length < 2) return;

  _checkSnapshots(summarySnapshots, ['total_value'], 'summarySelectors');
}

/**
 * Clear all registered snapshots (useful in test teardown).
 */
export function clearValidationSnapshots() {
  Object.keys(_snapshots).forEach((k) => delete _snapshots[k]);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _checkSnapshots(snapshots, fields, selectorHint) {
  for (let i = 0; i < snapshots.length; i++) {
    for (let j = i + 1; j < snapshots.length; j++) {
      const a = snapshots[i];
      const b = snapshots[j];
      for (const field of fields) {
        if (a[field] === undefined || b[field] === undefined) continue;
        if (a[field] !== b[field]) {
          console.warn(
            `[CollectionValidator] Mismatch detected for "${field}":\n` +
            `  ${a.source}: ${a[field]}\n` +
            `  ${b.source}: ${b[field]}\n` +
            `  → Both surfaces must use selectors from @/lib/collection/${selectorHint}`
          );
        }
      }
    }
  }
}