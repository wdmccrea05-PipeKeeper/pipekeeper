/**
 * searchAdapters.js
 *
 * Normalises results from external search providers (currently the base44 LLM)
 * into the common SearchResult shape used throughout the app.
 *
 * Common shape:
 * {
 *   id: string,
 *   entityType: 'bottle' | 'blend' | 'pipe' | 'image',
 *   title: string,
 *   subtitle: string,
 *   sourceDomain: string,
 *   sourceTier: 1 | 2 | 3 | 4,
 *   sourceType: 'official' | 'retailer' | 'database' | 'review' | 'generic',
 *   url: string,
 *   imageUrl: string | null,
 *   matchedName: string,
 *   matchedBrand: string | null,
 *   matchedType: string | null,
 *   regionHint: string | null,
 *   countryHint: string | null,
 *   confidenceScore: number,       — filled in by rankResults()
 *   confidenceLabel: string,       — filled in by rankResults()
 *   confidenceReason: string,      — filled in by rankResults()
 *   isInternationalSource: boolean,
 *   isExactMatch: boolean,         — filled in by rankResults()
 *   metadata: {}                   — raw LLM fields preserved here
 * }
 */

import { getDomainInfo } from './trustedSources.js';

let _idCounter = 0;
function nextId() {
  return `sr_${Date.now()}_${++_idCounter}`;
}

/**
 * Normalise a single LLM result item for a bottle / whiskey query.
 *
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeBottleResult(raw) {
  const domain = raw.source_domain || null;
  const { tier, type: sourceType, isInternational } = getDomainInfo(domain);

  return {
    id: nextId(),
    entityType: 'bottle',
    title: raw.name || '',
    subtitle: raw.distillery || '',
    sourceDomain: domain,
    sourceTier: tier,
    sourceType,
    url: raw.source_url || '',
    imageUrl: raw.image_url || null,
    matchedName: raw.name || '',
    matchedBrand: raw.distillery || null,
    matchedType: raw.whiskey_type || raw.type || null,
    regionHint: raw.region || null,
    countryHint: raw.country || null,
    confidenceScore: 0,
    confidenceLabel: 'Low',
    confidenceReason: '',
    isInternationalSource: isInternational,
    isExactMatch: false,
    metadata: { ...raw },
  };
}

/**
 * Normalise a single LLM result item for a tobacco blend query.
 *
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeBlendResult(raw) {
  const domain = raw.source_domain || null;
  const { tier, type: sourceType, isInternational } = getDomainInfo(domain);

  return {
    id: nextId(),
    entityType: 'blend',
    title: raw.name || '',
    subtitle: raw.manufacturer || '',
    sourceDomain: domain,
    sourceTier: tier,
    sourceType,
    url: raw.source_url || '',
    imageUrl: raw.image_url || null,
    matchedName: raw.name || '',
    matchedBrand: raw.manufacturer || null,
    matchedType: raw.blend_type || null,
    regionHint: null,
    countryHint: null,
    confidenceScore: 0,
    confidenceLabel: 'Low',
    confidenceReason: '',
    isInternationalSource: isInternational,
    isExactMatch: false,
    metadata: { ...raw },
  };
}

/**
 * Normalise a single LLM result item for a pipe query.
 *
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizePipeResult(raw) {
  const domain = raw.source_domain || null;
  const { tier, type: sourceType, isInternational } = getDomainInfo(domain);

  return {
    id: nextId(),
    entityType: 'pipe',
    title: raw.name || '',
    subtitle: raw.maker || '',
    sourceDomain: domain,
    sourceTier: tier,
    sourceType,
    url: raw.source_url || '',
    imageUrl: raw.image_url || null,
    matchedName: raw.name || '',
    matchedBrand: raw.maker || null,
    matchedType: raw.shape || null,
    regionHint: null,
    countryHint: raw.country_of_origin || null,
    confidenceScore: 0,
    confidenceLabel: 'Low',
    confidenceReason: '',
    isInternationalSource: isInternational,
    isExactMatch: false,
    metadata: { ...raw },
  };
}

/**
 * Normalise a single LLM result item for a cigar query.
 *
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeCigarResult(raw) {
  const domain = raw.source_domain || null;
  const { tier, type: sourceType, isInternational } = getDomainInfo(domain);

  return {
    id: nextId(),
    entityType: 'cigar',
    title: raw.name || '',
    subtitle: raw.brand || '',
    sourceDomain: domain,
    sourceTier: tier,
    sourceType,
    url: raw.source_url || '',
    imageUrl: raw.image_url || null,
    matchedName: raw.name || '',
    matchedBrand: raw.brand || null,
    matchedType: raw.vitola || null,
    regionHint: raw.country_of_origin || null,
    countryHint: raw.country_of_origin || null,
    confidenceScore: 0,
    confidenceLabel: 'Low',
    confidenceReason: '',
    isInternationalSource: isInternational,
    isExactMatch: false,
    metadata: { ...raw },
  };
}

/**
 * Normalise a single LLM image result.
 *
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeImageResult(raw) {
  const domain = raw.source_domain || null;
  const { tier, type: sourceType, isInternational } = getDomainInfo(domain);

  return {
    id: nextId(),
    entityType: 'image',
    title: raw.title || '',
    subtitle: raw.source_domain || '',
    sourceDomain: domain,
    sourceTier: tier,
    sourceType,
    url: raw.source_url || '',
    imageUrl: raw.image_url || null,
    matchedName: raw.title || '',
    matchedBrand: null,
    matchedType: null,
    regionHint: null,
    countryHint: null,
    confidenceScore: 0,
    confidenceLabel: 'Low',
    confidenceReason: '',
    isInternationalSource: isInternational,
    isExactMatch: false,
    metadata: { ...raw },
  };
}

/**
 * Dispatch to the correct normaliser based on entity type.
 *
 * @param {Object}   raw
 * @param {'bottle'|'blend'|'pipe'|'cigar'|'image'} entityType
 * @returns {Object}
 */
export function normalizeLLMResult(raw, entityType) {
  if (entityType === 'bottle') return normalizeBottleResult(raw);
  if (entityType === 'blend')  return normalizeBlendResult(raw);
  if (entityType === 'pipe')   return normalizePipeResult(raw);
  if (entityType === 'cigar')  return normalizeCigarResult(raw);
  if (entityType === 'image')  return normalizeImageResult(raw);
  return normalizeBottleResult(raw);
}

/**
 * Normalise an array of raw LLM results.
 *
 * @param {Object[]} rawItems
 * @param {'bottle'|'blend'|'pipe'|'cigar'|'image'} entityType
 * @returns {Object[]}
 */
export function normalizeLLMResults(rawItems, entityType) {
  return (rawItems || [])
    .filter((item) => item && item.name)
    .map((item) => normalizeLLMResult(item, entityType));
}
