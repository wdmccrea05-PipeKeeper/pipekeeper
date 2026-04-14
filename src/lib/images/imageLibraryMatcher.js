/**
 * imageLibraryMatcher.js
 *
 * Master lookup layer for the add-flow and edit-flow image steps.
 *
 * Priority order:
 *   Tier 1 — Internal image library (blend logo library + ProductImageLibrary)
 *   Tier 2 — External pipeline (existing productImagePipeline) as fallback
 *
 * The function returns results in a shape that is compatible with both the
 * existing ImageSuggestions component and the new internal library display.
 *
 * IMPORTANT: No React hooks — plain service module.
 *
 * @typedef {{
 *   id:                    string,
 *   title:                 string,
 *   sourceDomain:          string | null,
 *   sourceType:            string,
 *   confidenceLabel:       string,
 *   confidenceScore:       number,
 *   isExactMatch:          boolean,
 *   isReferenceImage:      boolean,
 *   isInternationalSource: boolean,
 *   candidateImageUrl:     string | null,
 *   cachedImageUrl:        string | null,
 *   storedImageUrl:        string | null,
 *   imageStatus:           'ready' | 'failed' | 'unavailable',
 *   matchStatus:           'image_ready' | 'image_failed' | 'match_only',
 *   sourceLabel:           string,
 *   isInternalMatch:       boolean,
 *   libraryImageId:        string | null,
 *   verifiedCount:         number,
 * }} MatchResult
 */

import { searchInternalImageLibrary } from './internalImageLibraryService.js';

// ── Shape adapter: internal library → MatchResult ────────────────────────────

function adaptInternalMatch(m) {
  const hasUrl = !!(m.imageUrl);
  return {
    id:                    m.id,
    title:                 m.displayName || '',
    sourceDomain:          null,
    sourceType:            'internal_library',
    confidenceLabel:       m.confidenceLabel,
    confidenceScore:       m.confidenceScore,
    isExactMatch:          m.isExactMatch,
    isReferenceImage:      m.referenceOnly,
    isInternationalSource: false,
    candidateImageUrl:     m.imageUrl,
    cachedImageUrl:        hasUrl ? m.imageUrl : null,
    storedImageUrl:        hasUrl ? m.imageUrl : null,
    imageStatus:           hasUrl ? 'ready' : 'unavailable',
    matchStatus:           hasUrl ? 'image_ready' : 'match_only',
    sourceLabel:           m.sourceLabel,
    isInternalMatch:       true,
    libraryImageId:        m.libraryImageId || null,
    verifiedCount:         m.verifiedCount || 0,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Find internal image matches for a product.
 *
 * Returns internal library results only. The calling UI should call the
 * existing external pipeline separately and append those results after.
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
 * @returns {Promise<MatchResult[]>}
 */
export async function findInternalImageMatches({
  entityType,
  name,
  brand,
  distillery,
  manufacturer,
  maker,
  shape,
  limit = 6,
} = {}) {
  const raw = await searchInternalImageLibrary({
    entityType,
    name,
    brand,
    distillery,
    manufacturer,
    maker,
    shape,
    limit,
  });

  return (raw || []).map(adaptInternalMatch);
}
