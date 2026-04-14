/**
 * imageNormalization.js
 *
 * Pure normalization helpers that convert user-entered product names into
 * stable, reusable lookup keys for the internal image library.
 *
 * All functions are side-effect-free and work with plain strings.
 */

// ── Core string normalizer ────────────────────────────────────────────────────

/**
 * Normalize a product name into a stable lookup key.
 *
 * Steps:
 *  - strip diacritics
 *  - lowercase
 *  - expand & → and
 *  - remove apostrophes, dots, commas
 *  - collapse hyphens / em-dashes to spaces
 *  - collapse whitespace
 *  - trim
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeProductName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/[.,!?;:()\[\]"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Entity-specific key builders ──────────────────────────────────────────────

/**
 * Build a composite key for a whiskey/spirits bottle.
 *
 * @param {{ brand?: string, name?: string, distillery?: string }} param
 * @returns {string}
 */
export function normalizeBottleKey({ brand, name, distillery } = {}) {
  const parts = [brand || distillery, name].filter(Boolean).map(normalizeProductName);
  return parts.join(' ').trim();
}

/**
 * Build a composite key for a tobacco blend.
 *
 * @param {{ brand?: string, manufacturer?: string, name?: string }} param
 * @returns {string}
 */
export function normalizeBlendKey({ brand, manufacturer, name } = {}) {
  const parts = [brand || manufacturer, name].filter(Boolean).map(normalizeProductName);
  return parts.join(' ').trim();
}

/**
 * Build a composite key for a pipe.
 *
 * @param {{ maker?: string, name?: string, shape?: string }} param
 * @returns {string}
 */
export function normalizePipeKey({ maker, name, shape } = {}) {
  const parts = [maker, name, shape].filter(Boolean).map(normalizeProductName);
  return parts.join(' ').trim();
}

// ── Similarity helpers (used by matching service) ─────────────────────────────

/**
 * Tokenize a normalized string into a set of words.
 *
 * @param {string} str
 * @returns {string[]}
 */
export function tokenize(str) {
  return normalizeProductName(str).split(' ').filter(Boolean);
}

/**
 * Compute a simple token-overlap similarity score between two strings.
 * Returns a value in [0, 1].
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function tokenSimilarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  ta.forEach((t) => { if (tb.has(t)) overlap++; });
  return overlap / Math.max(ta.size, tb.size);
}

/**
 * Return true when two normalized strings are an exact match.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isExactNormalized(a, b) {
  return normalizeProductName(a) === normalizeProductName(b);
}
