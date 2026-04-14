/**
 * imageMatchingService.js
 *
 * Core reuse layer: given a new record being added or edited, find the best
 * matching images already stored in the ProductImageLibrary.
 *
 * This is a pure DB-query layer.  For the full priority-ordered lookup
 * (blend logo library → internal library → external) use imageLibraryMatcher.js.
 *
 * IMPORTANT: No React hooks — plain service module.
 *
 * @typedef {{
 *   id:               string,
 *   entityType:       string,
 *   displayName:      string,
 *   imageUrl:         string,
 *   sourceType:       string,
 *   verifiedCount:    number,
 *   referenceOnly:    boolean,
 *   confidenceLabel:  string,
 *   confidenceScore:  number,
 *   isExactMatch:     boolean,
 *   sourceLabel:      string,
 *   isInternalMatch:  true,
 *   libraryImageId:   string,
 * }} LibraryMatchResult
 */

import { findLibraryMatches } from './imageLibraryService.js';
import { normalizeBottleKey, normalizeBlendKey, normalizePipeKey } from './imageNormalization.js';

// ── Source label mapping ──────────────────────────────────────────────────────

function sourceLabel(sourceType, referenceOnly) {
  if (referenceOnly) return 'Reference Image';
  switch (sourceType) {
    case 'existing_logo_library': return 'Label Library';
    case 'user_upload':           return 'User Uploaded';
    case 'user_confirmed':        return 'User Confirmed';
    case 'mined_record_image':    return 'Community Match';
    case 'reference':             return 'Reference Image';
    default:                      return 'Library Match';
  }
}

// ── Confidence label ──────────────────────────────────────────────────────────

function confidenceLabelFromScore(score, forceReference = false) {
  if (forceReference) return 'Reference';
  if (score >= 80) return 'Exact Match';
  if (score >= 60) return 'High Confidence';
  if (score >= 35) return 'Medium Confidence';
  return 'Reference';
}

// ── Key builder ───────────────────────────────────────────────────────────────

function buildNormalizedKey(entityType, { name, brand, distillery, manufacturer, maker, shape } = {}) {
  if (entityType === 'bottle') {
    return normalizeBottleKey({ brand: brand || distillery, name });
  }
  if (entityType === 'blend') {
    return normalizeBlendKey({ brand: brand || manufacturer, name });
  }
  if (entityType === 'pipe') {
    return normalizePipeKey({ maker, name, shape });
  }
  return String(name || '').toLowerCase().trim();
}

// ── Map raw library record to LibraryMatchResult ──────────────────────────────

function toMatchResult(record, isRef = false) {
  const score = record._score || 0;
  const forceRef = isRef || record.reference_only;
  return {
    id:              record.id,
    entityType:      record.entity_type,
    displayName:     record.display_name || record.normalized_name || '',
    imageUrl:        record.image_url,
    sourceType:      record.source_type || 'unknown',
    verifiedCount:   record.verified_count || 0,
    referenceOnly:   !!record.reference_only,
    confidenceLabel: confidenceLabelFromScore(score, forceRef),
    confidenceScore: score,
    isExactMatch:    score >= 80,
    sourceLabel:     sourceLabel(record.source_type, !!record.reference_only),
    isInternalMatch: true,
    libraryImageId:  record.id,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Find internal library matches for a product being added or edited.
 *
 * Returns results ordered by:
 *   1. exactness (isExactMatch first)
 *   2. verified count
 *   3. non-reference before reference
 *   4. confidence score
 *
 * @param {Object} params
 * @param {'bottle'|'blend'|'pipe'} params.entityType
 * @param {string} [params.name]
 * @param {string} [params.brand]
 * @param {string} [params.distillery]
 * @param {string} [params.manufacturer]
 * @param {string} [params.maker]
 * @param {string} [params.shape]
 * @param {number} [params.limit]
 * @returns {Promise<LibraryMatchResult[]>}
 */
export async function findProductLibraryMatches({
  entityType,
  name,
  brand,
  distillery,
  manufacturer,
  maker,
  shape,
  limit = 8,
} = {}) {
  if (!entityType) return [];

  const normalizedName = buildNormalizedKey(entityType, {
    name, brand, distillery, manufacturer, maker, shape,
  });

  if (!normalizedName) return [];

  const raw = await findLibraryMatches({
    entityType,
    normalizedName,
    brand: brand || distillery || manufacturer,
    maker,
    shape,
    limit,
  });

  if (!raw || raw.length === 0) return [];

  const isRef = entityType === 'pipe';

  return raw
    .map((r) => toMatchResult(r, isRef))
    .sort((a, b) => {
      // Exact matches first
      if (a.isExactMatch !== b.isExactMatch) return a.isExactMatch ? -1 : 1;
      // Non-reference before reference
      if (a.referenceOnly !== b.referenceOnly) return a.referenceOnly ? 1 : -1;
      // Higher verified count
      if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
      // Higher score
      return b.confidenceScore - a.confidenceScore;
    });
}
