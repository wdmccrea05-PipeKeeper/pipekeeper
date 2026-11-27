/**
 * src/lib/whiskey/bottleFillLevels.js
 *
 * Historical fill-level records for one bottle: the series, the decline between
 * observations, and the documented time since the bottle was opened.
 *
 * Descriptive only — a fill level is a record of what was observed, never a
 * measure of what should be consumed. Pure functions only.
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const FILL_STATUS_LABELS = Object.freeze({
  sealed: 'Sealed',
  opened: 'Opened',
  in_use: 'In use',
  empty: 'Empty',
  unknown: 'Not recorded',
});

/** Records for one bottle, newest first, normalised. */
export function normalizeFillRecords(records = [], bottleId = null) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => (bottleId ? record?.bottle_id === bottleId : true))
    .map((record) => ({
      id: record.id,
      bottleId: record.bottle_id,
      recordedAt: record.recorded_at || record.created_date || null,
      fillPercent: Math.max(0, Math.min(100, num(record.fill_percent))),
      fillLevel: record.fill_level || null,
      volumeMl: record.volume_ml != null ? num(record.volume_ml) : null,
      status: record.status || 'unknown',
      note: record.note || '',
    }))
    .sort((a, b) => (toDate(b.recordedAt)?.getTime() || 0) - (toDate(a.recordedAt)?.getTime() || 0));
}

/** Chart-ready series, oldest first. */
export function buildFillSeries(records = [], bottleId = null) {
  return normalizeFillRecords(records, bottleId)
    .slice()
    .reverse()
    .map((record) => ({ date: record.recordedAt, value: record.fillPercent }));
}

/**
 * Summary of one bottle's fill history.
 *
 * declinePercent is the difference between the earliest and latest observation;
 * it is null until there are two observations to compare.
 */
export function summarizeFillHistory(records = [], bottleId = null, now = new Date()) {
  const normalised = normalizeFillRecords(records, bottleId);
  if (!normalised.length) {
    return {
      count: 0,
      latest: null,
      earliest: null,
      declinePercent: null,
      lastObservedAt: null,
      daysSinceLastObservation: null,
      status: 'untracked',
      statusLabel: FILL_STATUS_LABELS.unknown,
    };
  }

  const latest = normalised[0];
  const earliest = normalised[normalised.length - 1];
  const lastDate = toDate(latest.recordedAt);
  const daysSince = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / 86400000) : null;

  return {
    count: normalised.length,
    latest,
    earliest,
    declinePercent: normalised.length > 1 ? Math.round((earliest.fillPercent - latest.fillPercent) * 10) / 10 : null,
    lastObservedAt: latest.recordedAt,
    daysSinceLastObservation: daysSince,
    status: latest.status,
    statusLabel: FILL_STATUS_LABELS[latest.status] || FILL_STATUS_LABELS.unknown,
  };
}

/** Bottles that have at least one fill record — used by the dashboard drill-downs. */
export function collectTrackedBottleIds(records = []) {
  const ids = new Set();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (record?.bottle_id) ids.add(record.bottle_id);
  });
  return ids;
}