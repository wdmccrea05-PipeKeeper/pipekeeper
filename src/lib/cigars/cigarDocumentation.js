/**
 * src/lib/cigars/cigarDocumentation.js
 *
 * Documentation completeness for cigar records, and the drill-down presets the
 * CigarKeeper dashboard uses to open the underlying records.
 *
 * Completeness is descriptive: it counts documented fields, it never scores the
 * collector. Pure functions only — no SDK access, no writes.
 */

import { monthsAged, agingStartDate } from './humidorInventory.js';

export const DOCUMENTATION_FIELDS = Object.freeze([
  { key: 'brand', label: 'Brand' },
  { key: 'line', label: 'Line' },
  { key: 'vitola', label: 'Vitola' },
  { key: 'wrapper', label: 'Wrapper' },
  { key: 'binder', label: 'Binder' },
  { key: 'filler', label: 'Filler' },
  { key: 'country_of_origin', label: 'Country of origin' },
  { key: 'length_inches', label: 'Length' },
  { key: 'ring_gauge', label: 'Ring gauge' },
  { key: 'box_date', label: 'Box date' },
  { key: 'batch_number', label: 'Batch / box code' },
  { key: 'purchase_date', label: 'Acquisition date' },
  { key: 'purchase_price', label: 'Acquisition cost' },
  { key: 'condition', label: 'Condition' },
  { key: 'photos', label: 'Photograph' },
]);

function isFilled(cigar = {}, key) {
  const value = cigar?.[key];
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function getCigarDocumentation(cigar = {}) {
  const missing = DOCUMENTATION_FIELDS.filter((field) => !isFilled(cigar, field.key));
  const filled = DOCUMENTATION_FIELDS.length - missing.length;
  return {
    filled,
    total: DOCUMENTATION_FIELDS.length,
    percent: Math.round((filled / DOCUMENTATION_FIELDS.length) * 100),
    missing: missing.map((field) => field.key),
    missingLabels: missing.map((field) => field.label),
  };
}

/** Collection-wide completeness, including which fields are most often missing. */
export function summarizeDocumentation(cigars = []) {
  const list = Array.isArray(cigars) ? cigars : [];
  if (!list.length) {
    return { records: 0, averagePercent: 0, complete: 0, incomplete: 0, missingByField: [] };
  }

  const counts = new Map();
  let percentTotal = 0;
  let complete = 0;

  list.forEach((cigar) => {
    const doc = getCigarDocumentation(cigar);
    percentTotal += doc.percent;
    if (doc.missing.length === 0) complete += 1;
    doc.missing.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
  });

  const missingByField = DOCUMENTATION_FIELDS.map((field) => ({
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

/** Presets understood by the Cigars list drill-down. */
export const DRILLDOWN_PRESETS = Object.freeze({
  docs_missing: 'Documentation incomplete',
  unassigned: 'Not assigned to a humidor',
  condition_unrecorded: 'Condition not recorded',
  value_missing: 'No acquisition cost or value recorded',
  rated_none: 'No rating recorded',
  aging_0_6: 'Aged 0–6 months',
  aging_6_12: 'Aged 6–12 months',
  aging_12_24: 'Aged 1–2 years',
  aging_24_plus: 'Aged 2 years or more',
});

const AGING_RANGES = {
  aging_0_6: { min: 0, max: 6 },
  aging_6_12: { min: 6, max: 12 },
  aging_12_24: { min: 12, max: 24 },
  aging_24_plus: { min: 24, max: null },
};

export function presetLabel(preset) {
  return DRILLDOWN_PRESETS[preset] || null;
}

/**
 * Does one cigar belong to a drill-down preset?
 *
 * @param {object} cigar
 * @param {string} preset
 * @param {{ ratingsByCigarId?: Record<string, boolean>, now?: Date }} ctx
 */
export function matchesPreset(cigar = {}, preset = '', ctx = {}) {
  const { ratingsByCigarId = {}, now = new Date() } = ctx;
  if (!preset) return true;

  switch (preset) {
    case 'docs_missing':
      return getCigarDocumentation(cigar).missing.length > 0;
    case 'unassigned':
      return !cigar?.humidor_id;
    case 'condition_unrecorded':
      return !isFilled(cigar, 'condition') && !isFilled(cigar, 'condition_notes');
    case 'value_missing':
      return !(Number(cigar?.estimated_value) > 0) && !(Number(cigar?.purchase_price) > 0);
    case 'rated_none':
      return !(Number(cigar?.rating) > 0) && !ratingsByCigarId?.[cigar?.id];
    default: {
      const range = AGING_RANGES[preset];
      if (!range) return true;
      const months = monthsAged(agingStartDate(cigar), now);
      if (months === null) return false;
      return months >= range.min && (range.max === null || months < range.max);
    }
  }
}