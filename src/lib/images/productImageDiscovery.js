/**
 * productImageDiscovery.js
 *
 * Discovery-only adapter for the product image pipeline.
 *
 * This layer is responsible for finding candidate product matches from trusted
 * sources. It returns raw candidates with title, source, product URL, and a
 * candidate image URL — but makes no attempt to render or verify those URLs.
 *
 * Rendering safety is handled by the ingestion layer (productImageIngestion.js).
 *
 * Output shape per candidate:
 * {
 *   id:                string,
 *   entityType:        "bottle" | "blend" | "pipe",
 *   title:             string,
 *   sourceDomain:      string | null,
 *   sourceTier:        1 | 2 | 3 | 4,
 *   sourceType:        string,
 *   productUrl:        string | null,      — product page URL
 *   candidateImageUrl: string | null,      — raw candidate (not yet ingested)
 *   confidenceScore:   number,
 *   confidenceLabel:   string,
 *   isExactMatch:      boolean,
 *   isReferenceImage:  boolean,
 *   isInternationalSource: boolean,
 * }
 */

import { searchProductImages } from './imageSearchService.js';

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Discover candidate product image matches for the given entity.
 *
 * Delegates to the existing hybrid LLM + fallback search pipeline, then
 * maps results into the discovery-layer output shape.
 *
 * @param {Object} params
 * @param {'bottle'|'blend'|'pipe'} params.entityType
 * @param {string} [params.name]
 * @param {string} [params.brand]
 * @param {string} [params.distillery]
 * @param {string} [params.maker]
 * @param {string} [params.manufacturer]
 * @param {string} [params.region]
 * @param {string} [params.country]
 * @param {string} [params.shape]
 * @param {boolean} [params.forceRefresh]
 * @param {number}  [params.seed]
 * @returns {Promise<{
 *   candidates: DiscoveryCandidate[],
 *   totalCandidates: number,
 *   sourceSummary: { trusted: number, fallback: number },
 *   noResults: boolean,
 * }>}
 */
export async function discoverProductImageCandidates({
  entityType,
  name,
  brand,
  distillery,
  maker,
  manufacturer,
  region,
  country,
  shape,
  forceRefresh = false,
  seed = 0,
}) {
  const searchResult = await searchProductImages({
    entityType,
    name,
    brand,
    distillery,
    maker,
    manufacturer,
    region,
    country,
    shape,
    forceRefresh,
    seed,
  });

  // Map NormalizedImageResult → DiscoveryCandidate
  const candidates = (searchResult.results || []).map((r) => ({
    id:                   r.id,
    entityType:           r.entityType,
    title:                r.title,
    sourceDomain:         r.sourceDomain || null,
    sourceTier:           r.sourceTier,
    sourceType:           r.sourceType,
    productUrl:           r.url || null,
    candidateImageUrl:    r.imageUrl || null,
    confidenceScore:      r.confidenceScore,
    confidenceLabel:      r.confidenceLabel,
    isExactMatch:         r.isExactMatch,
    isReferenceImage:     r.isReferenceImage,
    isInternationalSource: r.isInternationalSource,
  }));

  return {
    candidates,
    totalCandidates: searchResult.totalCandidates,
    sourceSummary:   searchResult.sourceSummary,
    noResults:       candidates.length === 0,
  };
}
