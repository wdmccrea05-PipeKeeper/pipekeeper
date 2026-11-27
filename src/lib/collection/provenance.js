/**
 * src/lib/collection/provenance.js
 *
 * Shared provenance service.
 *
 * Provenance is documentation of where an item came from and what happened to
 * it afterwards: acquisition history, source, maker or producer lineage,
 * markings, certification and prior ownership. It is the same problem in every
 * module, so it lives here rather than inside PipeKeeper, CigarKeeper,
 * WhiskeyKeeper or WineKeeper separately.
 *
 * Nothing in this module promotes acquisition. It records what already
 * happened. See src/lib/collection/boundaries.js.
 */

/** Fields that evidence provenance, per module. Missing fields lower completeness. */
const PROVENANCE_FIELD_SETS = {
  pipekeeper: [
    { key: 'maker', label: 'Maker' },
    { key: 'year_made', label: 'Year made or era' },
    { key: 'stamping', label: 'Stamping or markings' },
    { key: 'purchase_date', label: 'Acquisition date' },
    { key: 'purchase_price', label: 'Acquisition cost' },
    { key: 'provenance_notes', label: 'Provenance notes' },
  ],
  cigarkeeper: [
    { key: 'brand', label: 'Brand' },
    { key: 'box_date', label: 'Box date' },
    { key: 'box_code', label: 'Box code' },
    { key: 'purchase_date', label: 'Acquisition date' },
    { key: 'purchase_price', label: 'Acquisition cost' },
    { key: 'notes', label: 'Notes' },
  ],
  whiskeykeeper: [
    { key: 'distillery', label: 'Distillery' },
    { key: 'age', label: 'Age statement' },
    { key: 'bottle_code', label: 'Bottle or cask code' },
    { key: 'purchase_date', label: 'Acquisition date' },
    { key: 'purchase_price', label: 'Acquisition cost' },
    { key: 'notes', label: 'Notes' },
  ],
  winekeeper: [
    { key: 'producer', label: 'Producer' },
    { key: 'vintage', label: 'Vintage' },
    { key: 'appellation', label: 'Appellation' },
    { key: 'purchase_price', label: 'Acquisition cost' },
    { key: 'notes', label: 'Notes' },
  ],
};

const DEFAULT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'purchase_price', label: 'Acquisition cost' },
  { key: 'notes', label: 'Notes' },
];

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalise one AcquisitionItem record into a provenance entry.
 * Acquisition records are historical documentation once acquired; entries that
 * have not been acquired are not provenance and are dropped by the timeline.
 *
 * @param {object} record
 * @returns {object|null}
 */
export function normalizeAcquisition(record) {
  if (!record || typeof record !== 'object') return null;

  const acquiredDate = toDate(record.acquired_date);
  const status = String(record.status || record.category || '').toLowerCase();
  const isAcquired = !!acquiredDate || status === 'acquired' || status === 'owned' || !!record.acquired_collection_id;

  if (!isAcquired) return null;

  return {
    id: record.id || null,
    name: record.name || record.blend_name || record.pipe_model || '',
    itemType: record.item_type || record.linked_entity_type || null,
    brand: record.brand || null,
    acquiredDate: acquiredDate ? acquiredDate.toISOString() : null,
    source: record.source || null,
    notes: record.notes || null,
    pricePaid: Number.isFinite(Number(record.estimated_price)) ? Number(record.estimated_price) : null,
    linkedRecordId: record.linked_entity_id || record.acquired_collection_id || null,
    kind: 'acquisition',
  };
}

/**
 * Build an ascending provenance timeline from acquisition records.
 * Undated entries are kept last so they are never silently lost.
 *
 * @param {object[]} records
 * @returns {object[]}
 */
export function buildProvenanceTimeline(records = []) {
  const entries = (Array.isArray(records) ? records : [])
    .map(normalizeAcquisition)
    .filter(Boolean);

  return entries.sort((a, b) => {
    if (!a.acquiredDate && !b.acquiredDate) return 0;
    if (!a.acquiredDate) return 1;
    if (!b.acquiredDate) return -1;
    return new Date(a.acquiredDate) - new Date(b.acquiredDate);
  });
}

/**
 * Score how completely an item's provenance is documented.
 *
 * @param {object} item
 * @param {string} moduleKey
 * @returns {{ score: number, present: string[], missing: string[] }}
 */
export function computeProvenanceCompleteness(item, moduleKey) {
  const fields = PROVENANCE_FIELD_SETS[moduleKey] || DEFAULT_FIELDS;

  if (!item || typeof item !== 'object') {
    return { score: 0, present: [], missing: fields.map((f) => f.label) };
  }

  const present = [];
  const missing = [];

  for (const field of fields) {
    if (isPresent(item[field.key])) present.push(field.label);
    else missing.push(field.label);
  }

  const score = fields.length === 0 ? 0 : Math.round((present.length / fields.length) * 100);

  return { score, present, missing };
}

/**
 * Combined provenance view for a detail surface.
 *
 * @param {object} params
 * @param {object} params.item
 * @param {string} params.moduleKey
 * @param {object[]} [params.acquisitions]
 * @returns {{ completeness: object, timeline: object[], hasProvenance: boolean }}
 */
export function buildProvenanceSummary({ item, moduleKey, acquisitions = [] } = {}) {
  const completeness = computeProvenanceCompleteness(item, moduleKey);
  const timeline = buildProvenanceTimeline(acquisitions);

  return {
    completeness,
    timeline,
    hasProvenance: completeness.score > 0 || timeline.length > 0,
  };
}