/**
 * src/lib/collection/conditionHistory.js
 *
 * Shared condition and care history service.
 *
 * Condition evidence is scattered across module-specific logs today:
 * PipeMaintenanceLog, HumidorMaintenanceLog, CellarLog, TastingLog and the
 * smoking session logs. This module reads all of them through one normaliser so
 * a detail page, report or insurance export can present a single timeline
 * regardless of module.
 *
 * Read-only. It never writes records.
 */

export const CONDITION_EVENT_KINDS = Object.freeze({
  MAINTENANCE: 'maintenance',
  ENVIRONMENT: 'environment',
  INVENTORY: 'inventory',
  USAGE: 'usage',
});

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePipeMaintenance(record) {
  if (!record) return null;
  return {
    id: record.id || null,
    kind: CONDITION_EVENT_KINDS.MAINTENANCE,
    date: toDate(record.date),
    label: record.maintenance_type || 'Maintenance',
    detail: record.description || null,
    cost: Number.isFinite(Number(record.cost)) ? Number(record.cost) : null,
    performedBy: record.performed_by || null,
    source: 'PipeMaintenanceLog',
  };
}

function normalizeHumidorMaintenance(record) {
  if (!record) return null;
  const readings = [];
  if (record.humidity_reading != null) readings.push(`${record.humidity_reading}% RH`);
  if (record.temperature_reading != null) readings.push(`${record.temperature_reading}°F`);
  return {
    id: record.id || null,
    kind: CONDITION_EVENT_KINDS.ENVIRONMENT,
    date: toDate(record.date),
    label: record.event_type || 'Humidor maintenance',
    detail: [readings.join(' · '), record.notes].filter(Boolean).join(' — ') || null,
    cost: null,
    performedBy: null,
    source: 'HumidorMaintenanceLog',
  };
}

function normalizeCellarLog(record) {
  if (!record) return null;
  return {
    id: record.id || null,
    kind: CONDITION_EVENT_KINDS.INVENTORY,
    date: toDate(record.date),
    label: record.transaction_type === 'removed' ? 'Removed from cellar' : 'Added to cellar',
    detail: [record.amount_oz != null ? `${record.amount_oz} oz` : null, record.notes]
      .filter(Boolean)
      .join(' — ') || null,
    cost: null,
    performedBy: null,
    source: 'CellarLog',
  };
}

/**
 * Build a descending condition timeline across every supplied log type.
 * Events without a usable date are dropped rather than guessed at.
 *
 * @param {object} params
 * @param {object[]} [params.maintenanceLogs]
 * @param {object[]} [params.humidorLogs]
 * @param {object[]} [params.cellarLogs]
 * @returns {object[]}
 */
export function buildConditionTimeline({
  maintenanceLogs = [],
  humidorLogs = [],
  cellarLogs = [],
} = {}) {
  const events = [
    ...(Array.isArray(maintenanceLogs) ? maintenanceLogs.map(normalizePipeMaintenance) : []),
    ...(Array.isArray(humidorLogs) ? humidorLogs.map(normalizeHumidorMaintenance) : []),
    ...(Array.isArray(cellarLogs) ? cellarLogs.map(normalizeCellarLog) : []),
  ].filter((event) => event && event.date);

  return events.sort((a, b) => b.date - a.date);
}

/**
 * Summarise whether documented condition is improving, stable or declining.
 *
 * A trajectory is only reported when there is real evidence: a recorded
 * condition change or at least two care events. Anything else is 'unknown',
 * because absence of logging is not evidence of decline.
 *
 * @param {object[]} events - output of buildConditionTimeline
 * @returns {{ direction: 'improving'|'stable'|'declining'|'unknown', eventCount: number, lastEventDate: string|null }}
 */
export function computeConditionTrajectory(events = []) {
  const list = Array.isArray(events) ? events : [];
  const lastEventDate = list.length && list[0].date ? list[0].date.toISOString() : null;

  if (list.length < 2) {
    return { direction: 'unknown', eventCount: list.length, lastEventDate };
  }

  const repairs = list.filter((e) =>
    /restor|repair|recondition|clean|polish|rehydrat|rehumidif/i.test(`${e.label} ${e.detail || ''}`)
  ).length;
  const declines = list.filter((e) =>
    /damage|crack|chip|decline|deteriorat|mold|mould|dried out|leak/i.test(`${e.label} ${e.detail || ''}`)
  ).length;

  let direction = 'stable';
  if (repairs > declines) direction = 'improving';
  else if (declines > repairs) direction = 'declining';

  return { direction, eventCount: list.length, lastEventDate };
}

/**
 * One call for a detail surface: timeline plus trajectory.
 */
export function buildConditionHistory(params = {}) {
  const timeline = buildConditionTimeline(params);
  return { timeline, trajectory: computeConditionTrajectory(timeline) };
}