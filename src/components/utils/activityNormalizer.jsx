/**
 * activityNormalizer — shared utility for normalizing SmokingLog and TastingLog
 * entries into a single canonical activity model used across all dashboard surfaces.
 *
 * Canonical activity shape:
 *   {
 *     id:       string  — unique stable key
 *     type:     'session' | 'tasting'
 *     date:     string  — ISO date string
 *     title:    string  — primary display text
 *     subtitle: string  — secondary display text
 *     recordId: string | null  — primary record id (pipe_id or bottle_id)
 *     blendId:  string | null  — tobacco blend id (sessions only)
 *   }
 */

/**
 * Normalize a SmokingLog entry.
 * @param {object} log
 * @returns {object}
 */
export function normalizeSmokingLog(log) {
  const title = log.pipe_name || log.pipe_id || 'Pipe Session';
  const subtitle = log.blend_name || log.blend_id || '';
  return {
    id: log.id || `smoking_${log.pipe_id}_${log.date}`,
    type: 'session',
    date: log.date || log.created_date || '',
    title,
    subtitle,
    recordId: log.pipe_id || null,
    blendId: log.blend_id || null,
  };
}

/**
 * Normalize a TastingLog entry.
 * @param {object} log
 * @returns {object}
 */
export function normalizeTastingLog(log) {
  const title = log.bottle_name || log.bottle_id || 'Whiskey Tasting';
  const rating = log.rating ? `Rated ${log.rating}/5` : '';
  const subtitle = rating || log.notes?.slice(0, 60) || '';
  return {
    id: log.id || `tasting_${log.bottle_id}_${log.tasting_date || log.date}`,
    type: 'tasting',
    date: log.tasting_date || log.date || log.created_date || '',
    title,
    subtitle,
    recordId: log.bottle_id || null,
    blendId: null,
  };
}

/**
 * Merge and sort SmokingLogs + TastingLogs into a unified chronological feed.
 *
 * @param {object[]} smokingLogs
 * @param {object[]} tastingLogs
 * @param {object}   options
 * @param {number}   [options.limit=20]  — max items to return
 * @returns {object[]}
 */
export function buildUnifiedActivityFeed(smokingLogs = [], tastingLogs = [], { limit = 20 } = {}) {
  const sessions = smokingLogs.map(normalizeSmokingLog);
  const tastings = tastingLogs.map(normalizeTastingLog);

  const all = [...sessions, ...tastings].sort((a, b) => {
    try {
      return new Date(b.date) - new Date(a.date);
    } catch {
      return 0;
    }
  });

  return all.slice(0, limit);
}