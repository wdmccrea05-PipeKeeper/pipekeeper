/**
 * src/lib/whiskey/whiskeyDocumentation.js
 *
 * Documentation completeness for whiskey bottle records, and the drill-down
 * presets the WhiskeyKeeper dashboard uses to open the underlying bottles.
 *
 * Completeness is descriptive: it counts documented fields, it never scores the
 * collector. Pure functions only — no SDK access, no writes.
 */

export const BOTTLE_DOCUMENTATION_FIELDS = Object.freeze([
  { key: 'distillery', label: 'Distillery' },
  { key: 'bottler', label: 'Bottler' },
  { key: 'region', label: 'Region' },
  { key: 'country', label: 'Country' },
  { key: 'type', label: 'Whiskey type' },
  { key: 'age_statement', label: 'Age statement' },
  { key: 'abv', label: 'ABV' },
  { key: 'cask_type', label: 'Cask type' },
  { key: 'batch_number', label: 'Batch' },
  { key: 'release_name', label: 'Release' },
  { key: 'production_date', label: 'Production date' },
  { key: 'bottle_size', label: 'Bottle size' },
  { key: 'purchase_date', label: 'Acquisition date' },
  { key: 'purchase_price', label: 'Acquisition cost' },
  { key: 'condition', label: 'Condition' },
  { key: 'photos', label: 'Photograph' },
  { key: 'storage_location_id', label: 'Storage location' },
]);

function isFilled(record = {}, key) {
  const value = record?.[key];
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return value;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function getBottleDocumentation(bottle = {}) {
  const missing = BOTTLE_DOCUMENTATION_FIELDS.filter((field) => !isFilled(bottle, field.key));
  const filled = BOTTLE_DOCUMENTATION_FIELDS.length - missing.length;
  return {
    filled,
    total: BOTTLE_DOCUMENTATION_FIELDS.length,
    percent: Math.round((filled / BOTTLE_DOCUMENTATION_FIELDS.length) * 100),
    missing: missing.map((field) => field.key),
    missingLabels: missing.map((field) => field.label),
  };
}

export function summarizeBottleDocumentation(bottles = []) {
  const list = Array.isArray(bottles) ? bottles : [];
  if (!list.length) {
    return { records: 0, averagePercent: 0, complete: 0, incomplete: 0, missingByField: [] };
  }

  const counts = new Map();
  let percentTotal = 0;
  let complete = 0;

  list.forEach((bottle) => {
    const doc = getBottleDocumentation(bottle);
    percentTotal += doc.percent;
    if (doc.missing.length === 0) complete += 1;
    doc.missing.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  });

  const missingByField = BOTTLE_DOCUMENTATION_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    count: counts.get(field.key) || 0,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    records: list.length,
    averagePercent: Math.round(percentTotal / list.length),
    complete,
    incomplete: list.length - complete,
    missingByField,
  };
}

/** Presets understood by the Whiskey list drill-down. */
export const WHISKEY_DRILLDOWN_PRESETS = Object.freeze({
  docs_missing: 'Documentation incomplete',
  unassigned: 'No storage location',
  condition_unrecorded: 'Condition not recorded',
  value_missing: 'No acquisition cost or value recorded',
  rated_none: 'No rating recorded',
  fill_untracked: 'No fill-level record',
  infinity: 'Infinity bottles',
});

export function whiskeyPresetLabel(preset) {
  return WHISKEY_DRILLDOWN_PRESETS[preset] || null;
}

/**
 * Does one bottle belong to a drill-down preset?
 *
 * @param {object} bottle
 * @param {string} preset
 * @param {{ ratedBottleIds?: Set<string>|Record<string, boolean>, fillTrackedIds?: Set<string>|Record<string, boolean> }} ctx
 */
export function matchesWhiskeyPreset(bottle = {}, preset = '', ctx = {}) {
  if (!preset) return true;
  const { ratedBottleIds, fillTrackedIds } = ctx;
  const has = (source, id) => {
    if (!source || !id) return false;
    if (source instanceof Set) return source.has(id);
    return Boolean(source[id]);
  };

  switch (preset) {
    case 'docs_missing':
      return getBottleDocumentation(bottle).missing.length > 0;
    case 'unassigned':
      return !bottle?.storage_location_id;
    case 'condition_unrecorded':
      return !isFilled(bottle, 'condition') && !isFilled(bottle, 'condition_notes');
    case 'value_missing':
      return (
        !(Number(bottle?.collector_value) > 0) &&
        !(Number(bottle?.aftermarket_price) > 0) &&
        !(Number(bottle?.retail_price) > 0) &&
        !(Number(bottle?.purchase_price) > 0)
      );
    case 'rated_none':
      return !(Number(bottle?.rating) > 0) && !has(ratedBottleIds, bottle?.id);
    case 'fill_untracked':
      return !has(fillTrackedIds, bottle?.id);
    case 'infinity':
      return bottle?.is_infinity_bottle === true;
    default:
      return true;
  }
}