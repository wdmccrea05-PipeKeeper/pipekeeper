/**
 * src/lib/wine/wineInspections.js
 *
 * Condition and storage-condition history for one wine: the inspection series,
 * what the records say about ullage, label and seal, and the temperature and
 * humidity range the bottle has been kept in.
 *
 * Descriptive only — an inspection is a record of what was observed. Pure
 * functions only.
 */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const FILL_LEVEL_LABELS = Object.freeze({
  base_neck: 'Base neck',
  upper_shoulder: 'Upper shoulder',
  mid_shoulder: 'Mid shoulder',
  low_shoulder: 'Low shoulder',
  below_shoulder: 'Below shoulder',
  unknown: 'Not recorded',
});

export const CONDITION_LABELS = Object.freeze({
  intact: 'Intact',
  stained: 'Stained',
  torn: 'Torn',
  missing: 'Missing',
  damaged: 'Damaged',
  seeping: 'Seeping',
  broken: 'Broken',
  unknown: 'Not recorded',
});

/** Inspections for one wine, newest first. */
export function normalizeInspections(records = [], wineId = null) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => (wineId ? record?.wine_id === wineId : true))
    .map((record) => ({
      id: record.id,
      wineId: record.wine_id,
      inspectedAt: record.inspected_at || record.created_date || null,
      storageLocationId: record.storage_location_id || null,
      storageLocationName: record.storage_location_name || '',
      temperatureF: num(record.temperature_f),
      humidityRh: num(record.humidity_rh),
      fillLevel: record.fill_level || null,
      labelCondition: record.label_condition || null,
      capsuleCondition: record.capsule_condition || null,
      sealCondition: record.seal_condition || null,
      condition: record.condition || '',
      notes: record.notes || '',
    }))
    .sort((a, b) => (toDate(b.inspectedAt)?.getTime() || 0) - (toDate(a.inspectedAt)?.getTime() || 0));
}

/** Chart-ready temperature and humidity series, oldest first. */
export function buildStorageConditionSeries(records = [], wineId = null) {
  return normalizeInspections(records, wineId)
    .slice()
    .reverse()
    .map((record) => ({
      date: record.inspectedAt,
      temperature: record.temperatureF,
      humidity: record.humidityRh,
      location: record.storageLocationName,
    }));
}

function range(values) {
  const list = values.filter((value) => Number.isFinite(value));
  if (!list.length) return null;
  return { min: Math.min(...list), max: Math.max(...list), average: Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 10) / 10 };
}

/**
 * Summary of a wine's inspection history.
 *
 * concerns lists documented observations that are worth a second look (ullage
 * below the shoulder, a compromised seal or capsule, a missing label). They are
 * statements about the record, not instructions.
 */
export function summarizeInspections(records = [], wineId = null) {
  const list = normalizeInspections(records, wineId);
  if (!list.length) {
    return {
      count: 0,
      latest: null,
      lastInspectedAt: null,
      temperature: null,
      humidity: null,
      concerns: [],
      fillLevels: [],
      locations: [],
    };
  }

  const latest = list[0];
  const concerns = [];
  if (['low_shoulder', 'below_shoulder'].includes(latest.fillLevel)) {
    concerns.push(`Latest documented fill level is ${FILL_LEVEL_LABELS[latest.fillLevel].toLowerCase()}`);
  }
  if (['seeping', 'broken'].includes(latest.sealCondition)) {
    concerns.push(`Latest documented seal condition is ${CONDITION_LABELS[latest.sealCondition].toLowerCase()}`);
  }
  if (latest.capsuleCondition === 'damaged' || latest.capsuleCondition === 'missing') {
    concerns.push(`Latest documented capsule condition is ${CONDITION_LABELS[latest.capsuleCondition].toLowerCase()}`);
  }
  if (latest.labelCondition === 'missing' || latest.labelCondition === 'torn') {
    concerns.push(`Latest documented label condition is ${CONDITION_LABELS[latest.labelCondition].toLowerCase()}`);
  }

  const fillLevels = [...new Set(list.map((record) => record.fillLevel).filter(Boolean))];
  const locations = [...new Set(list.map((record) => record.storageLocationName).filter(Boolean))];

  return {
    count: list.length,
    latest,
    lastInspectedAt: latest.inspectedAt,
    temperature: range(list.map((record) => record.temperatureF)),
    humidity: range(list.map((record) => record.humidityRh)),
    concerns,
    fillLevels,
    locations,
  };
}

/** Wines that have at least one inspection — used by the dashboard drill-downs. */
export function collectInspectedWineIds(records = []) {
  const ids = new Set();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (record?.wine_id) ids.add(record.wine_id);
  });
  return ids;
}