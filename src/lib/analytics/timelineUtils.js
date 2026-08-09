/**
 * timelineUtils.js
 *
 * Canonical date-window helpers for analytics.
 *
 * Every rolling window, YTD, and calendar-year calculation in the app
 * must come from here so that all screens use identical date boundaries.
 *
 * All helpers are pure functions (no side effects, no Date mutation).
 * They accept any log array and a date-field accessor, making them
 * module-agnostic.
 */

// ---------------------------------------------------------------------------
// Window boundary builders
// ---------------------------------------------------------------------------

/**
 * Return { start, end } for a rolling N-day window ending at `referenceDate`.
 *
 * @param {number} days - window size (e.g. 7, 30, 90)
 * @param {Date}  [referenceDate] - defaults to today
 * @returns {{ start: Date, end: Date }}
 */
export function getRollingWindow(days, referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Return { start, end } for the calendar year-to-date (Jan 1 → referenceDate).
 *
 * @param {Date} [referenceDate] - defaults to today
 * @returns {{ start: Date, end: Date }}
 */
export function getYTDWindow(referenceDate = new Date()) {
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Return { start, end } for a full calendar year.
 *
 * @param {number} year - e.g. 2024
 * @returns {{ start: Date, end: Date }}
 */
export function getCalendarYearWindow(year) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end:   new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Return { start, end } for the previous full calendar year.
 *
 * @param {Date} [referenceDate] - defaults to today
 * @returns {{ start: Date, end: Date }}
 */
export function getLastYearWindow(referenceDate = new Date()) {
  return getCalendarYearWindow(referenceDate.getFullYear() - 1);
}

// ---------------------------------------------------------------------------
// Log filtering
// ---------------------------------------------------------------------------

/**
 * Return only logs whose date field falls within [start, end].
 *
 * @param {object[]} logs
 * @param {{ start: Date, end: Date }} window
 * @param {string|function} dateField - field name string or accessor function
 * @returns {object[]}
 */
export function filterLogsInWindow(logs, { start, end }, dateField = 'date') {
  if (!Array.isArray(logs)) return [];
  const getDate = typeof dateField === 'function'
    ? dateField
    : (log) => log?.[dateField];

  return logs.filter((log) => {
    const raw = getDate(log);
    if (!raw) return false;
    try {
      const d = new Date(typeof raw === 'string' ? raw.slice(0, 10) : raw);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    } catch {
      return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Named window selectors
// ---------------------------------------------------------------------------

/**
 * Count logs in a rolling N-day window.
 *
 * @param {object[]} logs
 * @param {number}   days
 * @param {string|function} [dateField]
 * @param {Date}     [referenceDate]
 * @returns {number}
 */
export function selectRollingWindowCount(logs, days, dateField = 'date', referenceDate = new Date()) {
  return filterLogsInWindow(logs, getRollingWindow(days, referenceDate), dateField).length;
}

/**
 * Count logs in the rolling 7-day window.
 *
 * @param {object[]} logs
 * @param {string|function} [dateField]
 * @returns {number}
 */
export function selectWeekCount(logs, dateField = 'date') {
  return selectRollingWindowCount(logs, 7, dateField);
}

/**
 * Count logs in the rolling 30-day window.
 *
 * @param {object[]} logs
 * @param {string|function} [dateField]
 * @returns {number}
 */
export function selectMonthCount(logs, dateField = 'date') {
  return selectRollingWindowCount(logs, 30, dateField);
}

/**
 * Count logs in the rolling 90-day window.
 *
 * @param {object[]} logs
 * @param {string|function} [dateField]
 * @returns {number}
 */
export function selectQuarterCount(logs, dateField = 'date') {
  return selectRollingWindowCount(logs, 90, dateField);
}

/**
 * Count logs year-to-date.
 *
 * @param {object[]} logs
 * @param {string|function} [dateField]
 * @returns {number}
 */
export function selectYTDCount(logs, dateField = 'date') {
  return filterLogsInWindow(logs, getYTDWindow(), dateField).length;
}

// ---------------------------------------------------------------------------
// Cadence
// ---------------------------------------------------------------------------

/**
 * Compute average logs per week over the full history of the log array.
 * Returns 0 when there is no history.
 *
 * @param {object[]} logs
 * @param {string|function} [dateField]
 * @returns {number}
 */
export function selectLogsPerWeek(logs, dateField = 'date') {
  if (!Array.isArray(logs) || logs.length === 0) return 0;
  const getDate = typeof dateField === 'function' ? dateField : (l) => l?.[dateField];
  const dates = logs
    .map((l) => {
      try { return new Date(getDate(l)); } catch { return null; }
    })
    .filter((d) => d && !Number.isNaN(d.getTime()));

  if (dates.length === 0) return 0;
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const weeks = Math.max(1, Math.ceil((Date.now() - earliest.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  return dates.length / weeks;
}
