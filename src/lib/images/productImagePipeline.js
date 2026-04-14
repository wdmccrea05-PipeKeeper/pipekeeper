/**
 * productImagePipeline.js
 *
 * Main orchestrator for the server-side product image ingestion pipeline.
 *
 * Pipeline steps:
 *   1. Check ingestion cache — reuse stable internal URLs from prior searches
 *   2. Run discovery (LLM + hybrid search) to find candidate matches
 *   3. Attempt server-side ingestion for top candidates that have a candidateImageUrl
 *   4. Store successful ingestions in the cache
 *   5. Return UI-ready suggestion objects with cachedImageUrl and imageStatus
 *
 * Return shape:
 * {
 *   results: [
 *     {
 *       id,
 *       title,
 *       sourceDomain,
 *       confidenceLabel,
 *       confidenceScore,
 *       isExactMatch,
 *       isReferenceImage,
 *       isInternationalSource,
 *       productUrl,
 *       candidateImageUrl,
 *       cachedImageUrl,        — stable internal URL (null if ingestion failed)
 *       storedImageUrl,        — alias of cachedImageUrl (preferred going forward)
 *       imageStatus,           — "ready" | "failed" | "unavailable"
 *       matchStatus,           — "image_ready" | "image_failed" | "match_only"
 *     }
 *   ],
 *   totalCandidates: number,
 *   readyCount:      number,   — number of results with a cachedImageUrl
 *   noResults:       boolean,
 * }
 *
 * IMPORTANT: Do not call React hooks here — this is a plain service module.
 */

import { discoverProductImageCandidates } from './productImageDiscovery.js';
import { ingestCandidateImages } from './productImageIngestion.js';
import { lookupIngestionCache, storeIngestionCache, purgeExpiredIngestionCache } from './productImageCache.js';

// ── Configuration ─────────────────────────────────────────────────────────────

// Maximum number of candidates to attempt ingesting per search
const MAX_INGEST_CANDIDATES = 6;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Get UI-ready product image suggestions with stable internal URLs.
 *
 * This is the primary entry point for Quick Add image search.
 * All returned cachedImageUrl values are app-controlled base44 storage URLs,
 * never raw retailer hotlinks.
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
 * @param {boolean} [params.forceRefresh]   — skip cache and re-ingest
 * @returns {Promise<{
 *   results: PipelineResult[],
 *   totalCandidates: number,
 *   readyCount: number,
 *   noResults: boolean,
 * }>}
 */
export async function getProductImageSuggestions({
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
}) {
  // Opportunistically clean up expired cache entries
  purgeExpiredIngestionCache();

  // ── Step 1: Discovery ───────────────────────────────────────────────────────
  const seed = forceRefresh ? Date.now() : 0;

  const { candidates, totalCandidates, noResults } = await discoverProductImageCandidates({
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

  if (noResults || candidates.length === 0) {
    return { results: [], totalCandidates: 0, readyCount: 0, noResults: true };
  }

  // ── Step 2: Cache lookup for each candidate ─────────────────────────────────
  // Check which candidates already have a cached internal URL.
  const withCacheCheck = candidates.map((candidate) => {
    if (!candidate.candidateImageUrl) {
      return { ...candidate, _cached: null };
    }

    const cached = forceRefresh
      ? null
      : lookupIngestionCache(entityType, candidate.candidateImageUrl);

    return { ...candidate, _cached: cached };
  });

  // Separate already-cached from needing ingestion
  const needsIngestion = withCacheCheck.filter(
    (c) => c.candidateImageUrl && !c._cached
  ).slice(0, MAX_INGEST_CANDIDATES);

  // ── Step 3: Ingest uncached candidates ─────────────────────────────────────
  let ingestionResults = [];
  if (needsIngestion.length > 0) {
    ingestionResults = await ingestCandidateImages(
      needsIngestion.map((c) => ({
        candidateImageUrl: c.candidateImageUrl,
        entityType:        entityType,
        title:             c.title,
      }))
    );
  }

  // Build an index from candidateImageUrl → ingestion result
  const ingestionIndex = new Map();
  needsIngestion.forEach((c, i) => {
    const result = ingestionResults[i];
    if (result) {
      ingestionIndex.set(c.candidateImageUrl, result);

      // Cache the ingestion outcome
      if (c.candidateImageUrl) {
        storeIngestionCache(entityType, c.candidateImageUrl, {
          cachedImageUrl: result.cachedImageUrl ?? null,
          normalizedName: String(name || '').toLowerCase().trim(),
          sourceDomain:   c.sourceDomain ?? null,
          status:         result.success ? 'success' : 'failed',
        });
      }
    }
  });

  // ── Step 4: Build final results ─────────────────────────────────────────────
  const results = withCacheCheck.map((candidate) => {
    let cachedImageUrl = null;
    let imageStatus    = 'unavailable';

    if (!candidate.candidateImageUrl) {
      // No image URL from discovery — unavailable
      imageStatus = 'unavailable';
    } else if (candidate._cached) {
      // Hit the ingestion cache
      if (candidate._cached.status === 'success' && candidate._cached.cachedImageUrl) {
        cachedImageUrl = candidate._cached.cachedImageUrl;
        imageStatus    = 'ready';
      } else {
        imageStatus = 'failed';
      }
    } else {
      // Check fresh ingestion result
      const ingestResult = ingestionIndex.get(candidate.candidateImageUrl);
      if (ingestResult?.success && ingestResult.cachedImageUrl) {
        cachedImageUrl = ingestResult.cachedImageUrl;
        imageStatus    = 'ready';
      } else if (ingestResult) {
        imageStatus = 'failed';
      }
    }

    // Derive matchStatus from imageStatus for explicit UI branching
    const matchStatus =
      imageStatus === 'ready'       ? 'image_ready'  :
      imageStatus === 'failed'      ? 'image_failed' :
                                      'match_only';

    return {
      id:                    candidate.id,
      title:                 candidate.title,
      sourceDomain:          candidate.sourceDomain,
      sourceType:            candidate.sourceType,
      confidenceLabel:       candidate.confidenceLabel,
      confidenceScore:       candidate.confidenceScore,
      isExactMatch:          candidate.isExactMatch,
      isReferenceImage:      candidate.isReferenceImage,
      isInternationalSource: candidate.isInternationalSource,
      productUrl:            candidate.productUrl,
      candidateImageUrl:     candidate.candidateImageUrl,
      cachedImageUrl,
      storedImageUrl:        cachedImageUrl,  // preferred alias going forward
      imageStatus,
      matchStatus,
    };
  });

  // Sort: ready results first, then by confidence score
  results.sort((a, b) => {
    if (a.imageStatus === 'ready' && b.imageStatus !== 'ready') return -1;
    if (a.imageStatus !== 'ready' && b.imageStatus === 'ready') return 1;
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    return b.confidenceScore - a.confidenceScore;
  });

  const readyCount = results.filter((r) => r.imageStatus === 'ready').length;

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[productImagePipeline] results:', results.map((r) => ({
      title:         r.title,
      sourceDomain:  r.sourceDomain,
      imageStatus:   r.imageStatus,
      matchStatus:   r.matchStatus,
      cachedImageUrl: r.cachedImageUrl,
      confidenceLabel: r.confidenceLabel,
    })));
  }

  return {
    results,
    totalCandidates,
    readyCount,
    noResults: results.length === 0,
  };
}
