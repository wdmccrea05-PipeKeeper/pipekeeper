/**
 * pipeSelectors.js
 *
 * Canonical, pure selector functions for all PipeKeeper-derived pipe metrics.
 *
 * Standardised definitions:
 *
 *  pipe_count              — number of Pipe records
 *  total_sessions          — count of SmokingLog records (all pipes)
 *  most_smoked_pipe        — pipe with the highest valid session count
 *  specialized_pipes_count — pipes with an explicit specialization assigned
 *  collection_value        — total value across all pipe records
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// ---------------------------------------------------------------------------
// Single-pipe value
// ---------------------------------------------------------------------------

/**
 * Return the canonical per-unit value for a Pipe record.
 *
 * Priority: estimated_value → collector_value → purchase_price → 0
 *
 * @param {object} pipe
 * @returns {number}
 */
export function getPipeUnitValue(pipe) {
  if (!pipe) return 0;
  if (n(pipe.estimated_value) > 0) return n(pipe.estimated_value);
  if (n(pipe.collector_value) > 0) return n(pipe.collector_value);
  if (n(pipe.purchase_price) > 0) return n(pipe.purchase_price);
  return 0;
}

// ---------------------------------------------------------------------------
// Core metric selectors
// ---------------------------------------------------------------------------

/**
 * pipe_count — number of Pipe records.
 *
 * @param {object[]} pipes
 * @returns {number}
 */
export function selectPipeCount(pipes) {
  return Array.isArray(pipes) ? pipes.length : 0;
}

/**
 * total_sessions — count of SmokingLog records.
 *
 * @param {object[]} smokingLogs
 * @returns {number}
 */
export function selectTotalSessions(smokingLogs) {
  return Array.isArray(smokingLogs) ? smokingLogs.length : 0;
}

/**
 * Build a session count index keyed by pipe_id.
 *
 * @param {object[]} smokingLogs
 * @returns {Record<string, number>}
 */
export function buildSessionsByPipeIndex(smokingLogs) {
  if (!Array.isArray(smokingLogs)) return {};
  return smokingLogs.reduce((acc, log) => {
    if (log?.pipe_id) acc[log.pipe_id] = (acc[log.pipe_id] || 0) + 1;
    return acc;
  }, {});
}

/**
 * most_smoked_pipe — pipe with the highest valid session count.
 * Returns null when pipes is empty or no sessions are recorded.
 *
 * @param {object[]} pipes
 * @param {object[]} smokingLogs
 * @returns {object|null}
 */
export function selectMostSmokedPipe(pipes, smokingLogs) {
  if (!Array.isArray(pipes) || pipes.length === 0) return null;
  const idx = buildSessionsByPipeIndex(smokingLogs);
  const withCount = pipes
    .map((p) => ({ ...p, _sessions: idx[p.id] || 0 }))
    .filter((p) => p._sessions > 0);
  if (withCount.length === 0) return null;
  return withCount.reduce((best, p) => (p._sessions > best._sessions ? p : best));
}

/**
 * specialized_pipes_count — pipes with an explicit specialization assigned.
 * A pipe is considered specialized when the `specialization` field is a
 * non-empty string (any value, e.g. 'aromatic', 'english', 'virginia').
 *
 * @param {object[]} pipes
 * @returns {number}
 */
export function selectSpecializedPipesCount(pipes) {
  if (!Array.isArray(pipes)) return 0;
  return pipes.filter(
    (p) => p?.specialization && String(p.specialization).trim().length > 0
  ).length;
}

/**
 * collection_value — total value across all pipe records.
 *
 * @param {object[]} pipes
 * @returns {number}
 */
export function selectPipeCollectionValue(pipes) {
  if (!Array.isArray(pipes)) return 0;
  return pipes.reduce((sum, p) => sum + getPipeUnitValue(p), 0);
}

// ---------------------------------------------------------------------------
// Combined metrics object
// ---------------------------------------------------------------------------

/**
 * selectPipeMetrics — compute all canonical pipe metrics in one call.
 *
 * @param {object[]} pipes
 * @param {object[]} smokingLogs
 * @returns {{
 *   pipe_count: number,
 *   total_sessions: number,
 *   most_smoked_pipe: object|null,
 *   specialized_pipes_count: number,
 *   collection_value: number,
 * }}
 */
export function selectPipeMetrics(pipes, smokingLogs) {
  return {
    pipe_count: selectPipeCount(pipes),
    total_sessions: selectTotalSessions(smokingLogs),
    most_smoked_pipe: selectMostSmokedPipe(pipes, smokingLogs),
    specialized_pipes_count: selectSpecializedPipesCount(pipes),
    collection_value: selectPipeCollectionValue(pipes),
  };
}
