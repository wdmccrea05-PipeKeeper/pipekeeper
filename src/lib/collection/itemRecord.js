/**
 * src/lib/collection/itemRecord.js
 *
 * Shared record shape for collection items across PipeKeeper, CigarKeeper,
 * WhiskeyKeeper and WineKeeper.
 *
 * The four modules keep their own specific fields. What they share is
 * documentation: how an item was acquired, who owned it, how it is identified,
 * how it is classified and what condition it is in. Those shared fields are
 * defined once here so the detail experience, bulk editing and merge logic all
 * agree on the same names.
 *
 * Every shared field is optional. A record with none of them is still a valid
 * record, and nothing here ever overwrites a value the collector entered.
 */

export const LIFECYCLE_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'gifted', label: 'Gifted' },
  { value: 'sold', label: 'Sold' },
  { value: 'lost', label: 'Lost' },
  { value: 'disposed', label: 'Disposed' },
];

export const INACTIVE_LIFECYCLE_STATES = [
  'archived',
  'transferred',
  'gifted',
  'sold',
  'lost',
  'disposed',
];

/**
 * Shared documentation fields. `type` drives the editor control.
 * Used by the detail panel, the bulk editor and the merge preview.
 */
export const DOCUMENTATION_FIELDS = [
  { key: 'purchase_date', label: 'Acquisition date', type: 'date' },
  { key: 'purchase_price', label: 'Recorded acquisition cost', type: 'number' },
  { key: 'purchase_source', label: 'Acquisition source', type: 'text', placeholder: 'Inherited, gift, estate, auction record, private collection' },
  { key: 'original_owner', label: 'Original owner', type: 'text' },
  { key: 'production_date', label: 'Production date', type: 'date' },
  { key: 'serial_number', label: 'Serial number', type: 'text' },
  { key: 'batch_number', label: 'Batch or lot number', type: 'text' },
  { key: 'condition_notes', label: 'Condition notes', type: 'textarea' },
  { key: 'provenance_notes', label: 'Provenance notes', type: 'textarea' },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'lifecycle_status', label: 'Lifecycle status', type: 'select' },
];

/** Keys the bulk editor and merge are allowed to write. */
export const DOCUMENTATION_FIELD_KEYS = DOCUMENTATION_FIELDS.map((field) => field.key);

/**
 * Per-module identity and provenance fields. These are read-only here: they
 * belong to the module's own form, not to the shared documentation panel.
 */
export const MODULE_CONFIG = {
  Pipe: {
    entityName: 'Pipe',
    moduleKey: 'pipekeeper',
    label: 'Pipe',
    makerFields: ['maker'],
    identityFields: [
      { key: 'maker', label: 'Maker' },
      { key: 'year_made', label: 'Year or era' },
      { key: 'stamping', label: 'Stamping' },
      { key: 'shape', label: 'Shape' },
    ],
  },
  Cigar: {
    entityName: 'Cigar',
    moduleKey: 'cigarkeeper',
    label: 'Cigar',
    makerFields: ['brand'],
    identityFields: [
      { key: 'brand', label: 'Brand' },
      { key: 'line', label: 'Line' },
      { key: 'box_date', label: 'Box date' },
      { key: 'vitola', label: 'Vitola' },
    ],
  },
  Bottle: {
    entityName: 'Bottle',
    moduleKey: 'whiskeykeeper',
    label: 'Bottle',
    makerFields: ['distillery'],
    identityFields: [
      { key: 'distillery', label: 'Distillery' },
      { key: 'age', label: 'Age statement' },
      { key: 'bottle_size', label: 'Bottle size' },
      { key: 'type', label: 'Type' },
    ],
  },
  Wine: {
    entityName: 'Wine',
    moduleKey: 'winekeeper',
    label: 'Wine',
    makerFields: ['producer'],
    identityFields: [
      { key: 'producer', label: 'Producer' },
      { key: 'vintage', label: 'Vintage' },
      { key: 'appellation', label: 'Appellation' },
      { key: 'varietal', label: 'Varietal' },
    ],
  },
};

export const COLLECTION_ENTITY_NAMES = Object.keys(MODULE_CONFIG);

export function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Resolve acquisition documentation from whichever field the module uses.
 * Legacy records kept acquisition data in module-specific fields, so the
 * shared view reads those rather than asking the collector to re-enter them.
 *
 * @param {object} record
 * @returns {{ date: string|null, cost: number|null, source: string|null }}
 */
export function resolveAcquisition(record) {
  if (!record || typeof record !== 'object') return { date: null, cost: null, source: null };

  const rawDate = record.purchase_date || record.acquired_date || record.box_date || null;
  const rawCost = record.purchase_price ?? record.acquisition_cost ?? null;
  const rawSource =
    record.purchase_source || record.purchase_location || record.acquisition_source || null;

  // A missing cost must stay missing. Number(null) is 0, which would report an
  // unrecorded acquisition as having cost nothing.
  const cost = isBlank(rawCost) ? null : Number(rawCost);

  return {
    date: rawDate || null,
    cost: Number.isFinite(cost) ? cost : null,
    source: rawSource || null,
  };
}

/**
 * Normalise tags to a clean, de-duplicated list.
 *
 * @param {string[]|string} tags
 * @returns {string[]}
 */
export function normaliseTags(tags) {
  const list = Array.isArray(tags)
    ? tags
    : String(tags || '')
        .split(',')
        .map((entry) => entry.trim());
  const seen = new Set();
  const result = [];
  for (const entry of list) {
    const tag = String(entry || '').trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

/**
 * Effective lifecycle state of a record, honouring the legacy archive flag.
 *
 * @param {object} record
 * @returns {string}
 */
export function resolveLifecycleStatus(record) {
  if (!record) return 'active';
  if (record.lifecycle_status) return record.lifecycle_status;
  if (record.is_archived) return 'archived';
  return 'active';
}

export function isInactiveRecord(record) {
  return INACTIVE_LIFECYCLE_STATES.includes(resolveLifecycleStatus(record));
}

/**
 * Display name of a record for activity entries and merge previews.
 *
 * @param {object} record
 * @param {string} entityName
 * @returns {string}
 */
export function recordDisplayName(record, entityName) {
  if (!record) return '';
  const config = MODULE_CONFIG[entityName];
  const maker = config?.makerFields?.map((key) => record[key]).find((value) => !isBlank(value));
  if (!isBlank(record.name) && !isBlank(maker)) return `${record.name} — ${maker}`;
  return record.name || maker || 'Untitled record';
}

/**
 * Documentation completeness for a record: which shared fields are filled.
 *
 * @param {object} record
 * @returns {{ score: number, present: string[], missing: string[] }}
 */
export function computeDocumentationCompleteness(record) {
  const present = [];
  const missing = [];
  for (const field of DOCUMENTATION_FIELDS) {
    if (isBlank(record?.[field.key])) missing.push(field.label);
    else present.push(field.label);
  }
  const score =
    DOCUMENTATION_FIELDS.length === 0
      ? 0
      : Math.round((present.length / DOCUMENTATION_FIELDS.length) * 100);
  return { score, present, missing };
}

/**
 * Build the patch the documentation editor should save: only fields that
 * actually changed, so an untouched field is never rewritten.
 *
 * @param {object} original
 * @param {object} draft
 * @returns {object}
 */
export function buildDocumentationPatch(original, draft) {
  const patch = {};
  for (const field of DOCUMENTATION_FIELDS) {
    const before = field.type === 'tags'
      ? normaliseTags(original?.[field.key])
      : original?.[field.key] ?? null;
    const after = field.type === 'tags'
      ? normaliseTags(draft?.[field.key])
      : draft?.[field.key] ?? null;

    if (field.type === 'tags') {
      if (JSON.stringify(before) !== JSON.stringify(after)) patch[field.key] = after;
      continue;
    }

    const normalise = (value) => (isBlank(value) ? null : value);
    if (normalise(before) !== normalise(after)) patch[field.key] = normalise(after);
  }
  return patch;
}