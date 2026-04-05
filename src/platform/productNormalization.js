// platform/productNormalization.js
// Shared product normalization layer for the CollectionKeeper platform.
//
// Provides alias resolution, production status normalization, manufacturer
// hierarchy mapping, and confidence-aware product identity across all modules.
//
// This is the global AI knowledgebase foundation — it does not enforce certainty
// where evidence is incomplete. All outputs include confidence levels.

/**
 * @typedef {'confirmed'|'likely'|'possible'|'conflicting'|'insufficient'|'user_corrected'} ConfidenceLevel
 */

/**
 * @typedef {object} NormalizedProductIdentity
 * @property {string} canonical_name       - Best-known canonical name
 * @property {string|null} alias_matched   - The alias that triggered this match, if any
 * @property {ConfidenceLevel} confidence  - How certain this identification is
 * @property {string|null} source          - Where this identity was determined
 * @property {boolean} user_corrected      - Whether user has overridden this identity
 */

// ─── Production Status Normalization ─────────────────────────────────────────

/**
 * Canonical production status values shared across all product modules.
 */
export const PRODUCTION_STATUS = {
  IN_PRODUCTION: 'in_production',
  LIMITED: 'limited',
  SEASONAL: 'seasonal',
  REGIONAL: 'regional',
  TRAVEL_RETAIL: 'travel_retail',
  DISCONTINUED: 'discontinued',
  ON_HIATUS: 'on_hiatus',
  REFORMULATED: 'reformulated',
  REISSUED: 'reissued',
  UNKNOWN: 'unknown',
};

/**
 * Human-readable labels for production status values.
 */
export const PRODUCTION_STATUS_LABELS = {
  [PRODUCTION_STATUS.IN_PRODUCTION]: 'In Production',
  [PRODUCTION_STATUS.LIMITED]: 'Limited Release',
  [PRODUCTION_STATUS.SEASONAL]: 'Seasonal',
  [PRODUCTION_STATUS.REGIONAL]: 'Regional Release',
  [PRODUCTION_STATUS.TRAVEL_RETAIL]: 'Travel Retail Exclusive',
  [PRODUCTION_STATUS.DISCONTINUED]: 'Discontinued',
  [PRODUCTION_STATUS.ON_HIATUS]: 'On Hiatus / Uncertain',
  [PRODUCTION_STATUS.REFORMULATED]: 'Reformulated',
  [PRODUCTION_STATUS.REISSUED]: 'Reissued',
  [PRODUCTION_STATUS.UNKNOWN]: 'Unknown',
};

/**
 * Normalize a raw production status string to a canonical value.
 * Returns UNKNOWN if the value cannot be mapped confidently.
 *
 * @param {string|null} rawStatus
 * @returns {{ value: string, confidence: ConfidenceLevel }}
 */
export function normalizeProductionStatus(rawStatus) {
  if (!rawStatus) return { value: PRODUCTION_STATUS.UNKNOWN, confidence: 'insufficient' };

  const normalized = String(rawStatus).toLowerCase().trim();

  // Exact matches
  if (Object.values(PRODUCTION_STATUS).includes(normalized)) {
    return { value: normalized, confidence: 'confirmed' };
  }

  // Alias mapping
  const STATUS_ALIASES = {
    active: PRODUCTION_STATUS.IN_PRODUCTION,
    current: PRODUCTION_STATUS.IN_PRODUCTION,
    regular: PRODUCTION_STATUS.IN_PRODUCTION,
    available: PRODUCTION_STATUS.IN_PRODUCTION,
    'limited edition': PRODUCTION_STATUS.LIMITED,
    ltd: PRODUCTION_STATUS.LIMITED,
    special: PRODUCTION_STATUS.LIMITED,
    'special edition': PRODUCTION_STATUS.LIMITED,
    seasonal: PRODUCTION_STATUS.SEASONAL,
    'travel exclusive': PRODUCTION_STATUS.TRAVEL_RETAIL,
    'duty free': PRODUCTION_STATUS.TRAVEL_RETAIL,
    discontinued: PRODUCTION_STATUS.DISCONTINUED,
    'no longer produced': PRODUCTION_STATUS.DISCONTINUED,
    out_of_production: PRODUCTION_STATUS.DISCONTINUED,
    hiatus: PRODUCTION_STATUS.ON_HIATUS,
    uncertain: PRODUCTION_STATUS.ON_HIATUS,
    unknown: PRODUCTION_STATUS.UNKNOWN,
    reformulated: PRODUCTION_STATUS.REFORMULATED,
    reissued: PRODUCTION_STATUS.REISSUED,
    rerelease: PRODUCTION_STATUS.REISSUED,
  };

  if (STATUS_ALIASES[normalized]) {
    return { value: STATUS_ALIASES[normalized], confidence: 'likely' };
  }

  return { value: PRODUCTION_STATUS.UNKNOWN, confidence: 'insufficient' };
}

// ─── Alias / Alternate Name Resolution ───────────────────────────────────────

/**
 * Normalize an array of aliases by deduplicating and cleaning entries.
 *
 * @param {string[]|null|undefined} aliases
 * @returns {string[]}
 */
export function normalizeAliases(aliases) {
  if (!Array.isArray(aliases)) return [];
  return Array.from(
    new Set(
      aliases
        .map((a) => String(a || '').trim())
        .filter((a) => a.length > 0)
    )
  );
}

/**
 * Check whether a search term matches a product's canonical name or any alias.
 * Case-insensitive, punctuation-tolerant.
 *
 * @param {string} searchTerm
 * @param {string} canonicalName
 * @param {string[]} [aliases]
 * @returns {{ matched: boolean, matchedAlias: string|null, confidence: ConfidenceLevel }}
 */
export function matchesProductName(searchTerm, canonicalName, aliases = []) {
  if (!searchTerm) return { matched: false, matchedAlias: null, confidence: 'insufficient' };

  const normalize = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[''`\-_.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const term = normalize(searchTerm);
  const canonical = normalize(canonicalName);

  if (canonical === term) {
    return { matched: true, matchedAlias: null, confidence: 'confirmed' };
  }

  if (canonical.includes(term) || term.includes(canonical)) {
    return { matched: true, matchedAlias: null, confidence: 'likely' };
  }

  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias === term) {
      return { matched: true, matchedAlias: alias, confidence: 'confirmed' };
    }
    if (normalizedAlias.includes(term) || term.includes(normalizedAlias)) {
      return { matched: true, matchedAlias: alias, confidence: 'likely' };
    }
  }

  return { matched: false, matchedAlias: null, confidence: 'insufficient' };
}

// ─── Manufacturer / Producer Normalization ────────────────────────────────────

/**
 * @typedef {object} ProducerProfile
 * @property {string} canonical_name      - Normalized producer name
 * @property {string|null} parent_company - Parent company if known
 * @property {string|null} brand_family   - Brand family within parent
 * @property {'artisan'|'production'|'blender'|'bottler'|'unknown'} producer_type
 * @property {ConfidenceLevel} confidence
 */

/**
 * Build a minimal producer profile from available fields.
 * Does not assert certainty if fields are incomplete.
 *
 * @param {object} params
 * @param {string} [params.name]           - Producer/brand name
 * @param {string} [params.parent_company] - Parent company
 * @param {string} [params.brand_family]   - Brand family
 * @param {string} [params.producer_type]  - artisan/production/blender/bottler
 * @returns {ProducerProfile}
 */
export function buildProducerProfile({ name, parent_company, brand_family, producer_type } = {}) {
  const hasName = !!(name && String(name).trim());
  const confidence = hasName ? 'likely' : 'insufficient';

  const validTypes = ['artisan', 'production', 'blender', 'bottler'];
  const resolvedType = validTypes.includes(producer_type) ? producer_type : 'unknown';

  return {
    canonical_name: String(name || '').trim() || 'Unknown',
    parent_company: parent_company ? String(parent_company).trim() : null,
    brand_family: brand_family ? String(brand_family).trim() : null,
    producer_type: resolvedType,
    confidence,
  };
}

// ─── Barcode / Identifier Normalization ──────────────────────────────────────

/**
 * Barcode format types.
 */
export const BARCODE_TYPES = {
  UPC_A: 'upc_a',       // 12 digits
  EAN_13: 'ean_13',     // 13 digits
  EAN_8: 'ean_8',       // 8 digits
  UPC_E: 'upc_e',       // 6 digits (compressed UPC)
  UNKNOWN: 'unknown',
};

/**
 * Normalize and classify a raw barcode string.
 * Strips whitespace, dashes, and spaces. Returns type and cleaned value.
 *
 * @param {string|null} rawBarcode
 * @returns {{ value: string|null, type: string, valid: boolean }}
 */
export function normalizeBarcode(rawBarcode) {
  if (!rawBarcode) return { value: null, type: BARCODE_TYPES.UNKNOWN, valid: false };

  const cleaned = String(rawBarcode).replace(/[\s\-]/g, '').trim();

  if (!/^\d+$/.test(cleaned)) {
    return { value: cleaned, type: BARCODE_TYPES.UNKNOWN, valid: false };
  }

  if (cleaned.length === 12) return { value: cleaned, type: BARCODE_TYPES.UPC_A, valid: true };
  if (cleaned.length === 13) return { value: cleaned, type: BARCODE_TYPES.EAN_13, valid: true };
  if (cleaned.length === 8) return { value: cleaned, type: BARCODE_TYPES.EAN_8, valid: true };
  if (cleaned.length === 6) return { value: cleaned, type: BARCODE_TYPES.UPC_E, valid: true };

  return { value: cleaned, type: BARCODE_TYPES.UNKNOWN, valid: false };
}

/**
 * Check whether two barcode strings refer to the same product.
 * Handles normalization differences.
 *
 * @param {string|null} a
 * @param {string|null} b
 * @returns {boolean}
 */
export function barcodesMatch(a, b) {
  const normA = normalizeBarcode(a);
  const normB = normalizeBarcode(b);
  if (!normA.value || !normB.value) return false;
  return normA.value === normB.value;
}

// ─── Confidence Scoring ───────────────────────────────────────────────────────

/**
 * Confidence levels in descending certainty order.
 */
export const CONFIDENCE_LEVELS = [
  'confirmed',
  'likely',
  'possible',
  'conflicting',
  'insufficient',
  'user_corrected',
];

/**
 * Compare two confidence levels.
 * Returns positive if a is more confident than b, negative if less, 0 if equal.
 *
 * @param {ConfidenceLevel} a
 * @param {ConfidenceLevel} b
 * @returns {number}
 */
export function compareConfidence(a, b) {
  const indexA = CONFIDENCE_LEVELS.indexOf(a);
  const indexB = CONFIDENCE_LEVELS.indexOf(b);
  const safeA = indexA === -1 ? CONFIDENCE_LEVELS.length : indexA;
  const safeB = indexB === -1 ? CONFIDENCE_LEVELS.length : indexB;
  return safeA - safeB; // lower index = more confident
}

/**
 * Pick the higher-confidence value between two candidates.
 *
 * @param {{ value: any, confidence: ConfidenceLevel }} a
 * @param {{ value: any, confidence: ConfidenceLevel }} b
 * @returns {{ value: any, confidence: ConfidenceLevel }}
 */
export function pickHigherConfidence(a, b) {
  return compareConfidence(a.confidence, b.confidence) <= 0 ? a : b;
}

/**
 * Get a human-readable label for a confidence level.
 *
 * @param {ConfidenceLevel} level
 * @returns {string}
 */
export function getConfidenceLabel(level) {
  const labels = {
    confirmed: 'Confirmed',
    likely: 'Likely',
    possible: 'Possible',
    conflicting: 'Conflicting Data',
    insufficient: 'Insufficient Evidence',
    user_corrected: 'User Verified',
  };
  return labels[level] ?? level;
}
