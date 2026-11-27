/**
 * src/lib/wine/wineDocumentation.js
 *
 * Documentation completeness for wine records, and the drill-down presets the
 * WineKeeper dashboard uses to open the underlying bottles.
 *
 * Descriptive only. Pure functions only — no SDK access, no writes.
 */

export const WINE_DOCUMENTATION_FIELDS = Object.freeze([
  { key: 'producer', label: 'Producer' },
  { key: 'region', label: 'Region' },
  { key: 'appellation', label: 'Appellation' },
  { key: 'vineyard', label: 'Vineyard' },
  { key: 'vintage', label: 'Vintage' },
  { key: 'varietal', label: 'Varietal' },
  { key: 'style', label: 'Style' },
  { key: 'country_of_origin', label: 'Country' },
  { key: 'bottle_size', label: 'Bottle size' },
  { key: 'closure_type', label: 'Closure' },
  { key: 'production_date', label: 'Production date' },
  { key: 'purchase_date', label: 'Acquisition date' },
  { key: 'purchase_price', label: 'Acquisition cost' },
  { key: 'condition', label: 'Condition' },
  { key: 'photos', label: 'Photograph' },
  { key: 'storage_location_id', label: 'Cellar location' },
]);

function isFilled(record = {}, key) {
  const value = record?.[key];
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return value;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function getWineDocumentation(wine = {}) {
  const missing = WINE_DOCUMENTATION_FIELDS.filter((field) => !isFilled(wine, field.key));
  const filled = WINE_DOCUMENTATION_FIELDS.length - missing.length;
  return {
    filled,
    total: WINE_DOCUMENTATION_FIELDS.length,
    percent: Math.round((filled / WINE_DOCUMENTATION_FIELDS.length) * 100),
    missing: missing.map((field) => field.key),
    missingLabels: missing.map((field) => field.label),
  };
}

export function summarizeWineDocumentation(wines = []) {
  const list = Array.isArray(wines) ? wines : [];
  if (!list.length) {
    return { records: 0, averagePercent: 0, complete: 0, incomplete: 0, missingByField: [] };
  }

  const counts = new Map();
  let percentTotal = 0;
  let complete = 0;

  list.forEach((wine) => {
    const doc = getWineDocumentation(wine);
    percentTotal += doc.percent;
    if (doc.missing.length === 0) complete += 1;
    doc.missing.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  });

  const missingByField = WINE_DOCUMENTATION_FIELDS.map((field) => ({
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

/** Presets understood by the Wines list drill-down. */
export const WINE_DRILLDOWN_PRESETS = Object.freeze({
  docs_missing: 'Documentation incomplete',
  unassigned: 'No cellar location',
  condition_unrecorded: 'Condition not recorded',
  value_missing: 'No acquisition cost or value recorded',
  rated_none: 'No rating recorded',
  inspection_none: 'No inspection record',
});

export function winePresetLabel(preset) {
  return WINE_DRILLDOWN_PRESETS[preset] || null;
}

/**
 * Does one wine belong to a drill-down preset?
 *
 * @param {object} wine
 * @param {string} preset
 * @param {{ ratedWineIds?: Set<string>|Record<string, boolean>, inspectedWineIds?: Set<string>|Record<string, boolean> }} ctx
 */
export function matchesWinePreset(wine = {}, preset = '', ctx = {}) {
  if (!preset) return true;
  const { ratedWineIds, inspectedWineIds } = ctx;
  const has = (source, id) => {
    if (!source || !id) return false;
    if (source instanceof Set) return source.has(id);
    return Boolean(source[id]);
  };

  switch (preset) {
    case 'docs_missing':
      return getWineDocumentation(wine).missing.length > 0;
    case 'unassigned':
      return !wine?.storage_location_id;
    case 'condition_unrecorded':
      return !isFilled(wine, 'condition') && !isFilled(wine, 'condition_notes');
    case 'value_missing':
      return (
        !(Number(wine?.estimated_value) > 0) &&
        !(Number(wine?.estimated_total_value) > 0) &&
        !(Number(wine?.market_estimated_total_value) > 0) &&
        !(Number(wine?.purchase_price) > 0)
      );
    case 'rated_none':
      return !(Number(wine?.rating) > 0) && !has(ratedWineIds, wine?.id);
    case 'inspection_none':
      return !has(inspectedWineIds, wine?.id);
    default:
      return true;
  }
}