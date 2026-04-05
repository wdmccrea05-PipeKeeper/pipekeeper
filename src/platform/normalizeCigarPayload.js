// platform/normalizeCigarPayload.js
//
// Canonical payload normalizer for Cigar create / update operations.
//
// Responsibilities:
//   - Convert empty strings to undefined for optional string / date / enum fields
//   - Convert numeric strings to numbers (or undefined when empty)
//   - Never send empty strings for date-format fields (which fail API schema validation)
//   - Set initial_quantity from singles_equivalent (or derived sticks) on create
//
// Canonical cigar inventory field meanings:
//   quantity           — number of package units owned (2 boxes = 2, 5 singles = 5)
//   unit_type          — package type enum: single | 5pack | pack | box | bundle | partial_box
//   cigars_per_package — sticks in each package unit (20 for a box of 20, 1 for singles)
//   singles_equivalent — total individual sticks = quantity * cigars_per_package
//                        (for partial_box: actual remaining sticks entered by user)
//   initial_quantity   — set to singles_equivalent at create time; baseline for depletion tracking

const NUMERIC_FIELDS = [
  'length_inches',
  'ring_gauge',
  'purchase_price',
  'estimated_value',
  'quantity',
  'cigars_per_package',
  'singles_equivalent',
  'initial_quantity',
  'rating',
];

const ENUM_FIELDS = [
  'body',
  'strength',
  'unit_type',
  'production_status',
  'release_type',
];

const DATE_FIELDS = [
  'purchase_date',
  'aging_start_date',
  'ready_to_smoke_date',
  'box_date',
];

const OPTIONAL_STRING_FIELDS = [
  'brand',
  'line',
  'vitola',
  'wrapper',
  'binder',
  'filler',
  'country_of_origin',
  'factory',
  'purchase_source',
  'barcode',
  'upc',
  'ean',
  'personal_notes',
  'storage_notes',
  'humidor_id',
];

/**
 * Derive the total singles-equivalent stick count for a cigar payload.
 * For partial_box: returns the singles_equivalent value directly (user-entered remaining).
 * For all other types: quantity * cigars_per_package.
 *
 * Returns null when insufficient data is available.
 *
 * @param {{ unit_type?: string, quantity?: number|string, cigars_per_package?: number|string, singles_equivalent?: number|string }} fields
 * @returns {number|null}
 */
export function deriveSinglesEquivalent({ unit_type, quantity, cigars_per_package, singles_equivalent }) {
  const qty = quantity !== undefined && quantity !== '' ? Number(quantity) : null;
  const cpp = cigars_per_package !== undefined && cigars_per_package !== '' ? Number(cigars_per_package) : null;
  const se = singles_equivalent !== undefined && singles_equivalent !== '' ? Number(singles_equivalent) : null;

  if (unit_type === 'partial_box') {
    // For partial boxes, singles_equivalent is explicitly set by the user to remaining sticks
    return se != null && !Number.isNaN(se) ? se : null;
  }

  if (qty != null && cpp != null && !Number.isNaN(qty) && !Number.isNaN(cpp)) {
    return qty * cpp;
  }

  // Fall back to explicitly provided value
  return se != null && !Number.isNaN(se) ? se : null;
}

/**
 * Normalize a cigar form payload for safe submission to the API.
 *
 * - Converts empty strings to undefined for all optional, date, and enum fields
 * - Converts numeric fields to numbers (undefined when empty)
 * - Derives singles_equivalent if not provided and inputs allow it
 * - Sets initial_quantity from singles_equivalent on create (isCreate = true)
 *
 * @param {object} form     - raw form state object
 * @param {{ isCreate?: boolean }} [options]
 * @returns {object}        - cleaned payload (no empty strings; ready for API)
 */
export function normalizeCigarPayload(form, { isCreate = false } = {}) {
  const out = { ...form };

  // Clean empty strings for optional string fields
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (out[field] === '' || out[field] === null) {
      out[field] = undefined;
    }
  }

  // Clean empty strings for date fields — empty string is not a valid date format
  for (const field of DATE_FIELDS) {
    if (!out[field] || out[field] === '') {
      out[field] = undefined;
    }
  }

  // Clean empty / invalid enum fields
  for (const field of ENUM_FIELDS) {
    if (!out[field] || out[field] === '') {
      out[field] = undefined;
    }
  }

  // Convert numeric fields — empty string → undefined, non-empty → Number
  for (const field of NUMERIC_FIELDS) {
    const raw = out[field];
    if (raw === '' || raw === null || raw === undefined) {
      out[field] = undefined;
    } else {
      const n = Number(raw);
      out[field] = Number.isNaN(n) ? undefined : n;
    }
  }

  // Ensure rating 0 is omitted rather than stored as a value.
  // The schema allows minimum: 0, but in practice 0 means "not yet rated".
  // Sending 0 would display as a 0/5 score rather than an unrated state.
  if (out.rating === 0) out.rating = undefined;

  // Derive and set singles_equivalent if we can compute it
  const derived = deriveSinglesEquivalent(out);
  if (derived !== null) {
    out.singles_equivalent = derived;
  }

  // Set initial_quantity baseline when creating a new record
  if (isCreate && out.initial_quantity == null && out.singles_equivalent != null) {
    out.initial_quantity = out.singles_equivalent;
  }

  return out;
}
