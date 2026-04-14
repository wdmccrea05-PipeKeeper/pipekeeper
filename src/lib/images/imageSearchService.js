/**
 * imageSearchService.js
 *
 * Main orchestration layer for the hybrid product-image search pipeline.
 *
 * Flow:
 *   1. Build trusted-source queries
 *   2. Run Tier 1 (LLM, domain-constrained) search
 *   3. Normalize results
 *   4. Rank + dedupe
 *   5. If < minAcceptableResults good results, run Tier 2 fallback
 *   6. Merge + rank + dedupe again
 *   7. Return best 3–6 results with source summary
 *
 * Export shape:
 * {
 *   results:        NormalizedImageResult[],  // 3–6 preferred
 *   exactMatch:     NormalizedImageResult | null,
 *   totalCandidates: number,
 *   sourceSummary:  { trusted: number, fallback: number },
 *   noResults:      boolean,
 * }
 *
 * IMPORTANT: Do not call React hooks here — this is a plain service module.
 *
 * @typedef {{
 *   id:               string,
 *   entityType:       "bottle" | "blend" | "pipe",
 *   title:            string,
 *   subtitle:         string | null,
 *   sourceDomain:     string | null,
 *   sourceTier:       1 | 2 | 3 | 4,
 *   sourceType:       "official" | "retailer" | "database" | "reference" | "fallback",
 *   url:              string | null,
 *   imageUrl:         string | null,
 *   isDirectImageUrl: boolean,
 *   matchedName:      string,
 *   matchedBrand:     string | null,
 *   confidenceScore:  number,
 *   confidenceLabel:  "Exact Match" | "High Confidence" | "Medium Confidence" | "Reference" | "Low Confidence",
 *   isExactMatch:     boolean,
 *   isReferenceImage: boolean,
 *   isInternationalSource: boolean,
 *   thumbnailStatus:  "verified" | "failed" | "unverified",
 *   metadata:         Object,
 * }} NormalizedImageResult
 */

import { IMAGE_SEARCH_CONFIG } from './imageSearchConfig.js';
import { runTier1LLMSearch, runTier2FallbackSearch } from './imageSearchProviders.js';
import { normalizeImageResults } from './imageResultNormalizer.js';
import { rankImageResults } from './imageResultRanker.js';
import { dedupeImageResults } from './imageResultDedupe.js';
import { resolveRenderableImages } from './imageResolver.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRankQuery(fields) {
  return [fields.name, fields.distillery, fields.maker, fields.manufacturer]
    .filter(Boolean)
    .join(' ');
}

function buildContext(entityType, fields) {
  return {
    matchedName:  fields.name || '',
    matchedBrand: fields.distillery || fields.maker || fields.manufacturer || null,
  };
}

function applyPipeLabeling(results, entityType) {
  if (entityType !== 'pipe') return results;
  return results.map((r) => ({
    ...r,
    isReferenceImage: true,
    // If the ranker assigned a high label, cap it at Reference for pipes
    // unless the domain is official (tier 1)
    confidenceLabel:
      r.sourceTier === 1
        ? r.confidenceLabel
        : 'Reference',
  }));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Search for product images using the hybrid pipeline.
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
 *   results: NormalizedImageResult[],
 *   exactMatch: NormalizedImageResult|null,
 *   totalCandidates: number,
 *   sourceSummary: { trusted: number, fallback: number },
 *   noResults: boolean,
 * }>}
 */
export async function searchProductImages({
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
  const {
    minAcceptableResults,
    preferredResults,
    alwaysRunFallback,
  } = IMAGE_SEARCH_CONFIG;

  const fields = {
    name:         name,
    distillery:   distillery || brand,
    maker:        maker,
    manufacturer: manufacturer || brand,
    region:       region,
    country:      country,
    shape:        shape,
  };

  const hasMinimumFields =
    fields.name || fields.distillery || fields.maker || fields.manufacturer;

  if (!hasMinimumFields) {
    return { results: [], exactMatch: null, totalCandidates: 0, sourceSummary: { trusted: 0, fallback: 0 }, noResults: true };
  }

  const rankQuery   = buildRankQuery(fields);
  const context     = buildContext(entityType, fields);
  const isPipe      = entityType === 'pipe';

  // ── Tier 1: trusted-source LLM search ────────────────────────────────────
  const tier1Options = seed > 0 ? { seed, broad: false } : {};
  const tier1Raw     = await runTier1LLMSearch(entityType, fields, tier1Options);

  let tier1Normalized = normalizeImageResults(tier1Raw, entityType, context);
  let tier1Ranked     = rankImageResults(rankQuery, tier1Normalized, isPipe);
  let tier1Deduped    = dedupeImageResults(tier1Ranked);

  const trustedCount = tier1Deduped.length;

  // ── Tier 2 fallback: run when not enough good tier-1 results ─────────────
  let fallbackCount = 0;
  let merged        = tier1Deduped;

  const needsFallback =
    alwaysRunFallback ||
    tier1Deduped.filter((r) => r.imageUrl).length < minAcceptableResults;

  if (needsFallback) {
    const fallbackSeed = seed > 0 ? seed : Date.now();
    const tier2Raw     = await runTier2FallbackSearch(entityType, fields, fallbackSeed);

    if (tier2Raw.length > 0) {
      const tier2Normalized = normalizeImageResults(tier2Raw, entityType, context);
      const tier2Ranked     = rankImageResults(rankQuery, tier2Normalized, isPipe);
      const combined        = [...tier1Deduped, ...tier2Ranked];
      const reRanked        = rankImageResults(rankQuery, combined, isPipe);
      merged                = dedupeImageResults(reRanked);
      fallbackCount         = merged.length - trustedCount;
      if (fallbackCount < 0) fallbackCount = 0;
    }
  }

  // Apply pipe-specific reference labeling
  const withLabels = applyPipeLabeling(merged, entityType);

  // Final slice: preferred 6, minimum 3
  const sliced = withLabels.slice(0, preferredResults);

  // Resolve renderableImageUrl for each result (uses imageProxyService + imageRenderVerifier + cache)
  // All verifications run in parallel via Promise.all; verified results sort to front.
  const finalResults = await resolveRenderableImages(sliced);

  const exactMatch = finalResults.find((r) => r.isExactMatch) || null;

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('[ImageSearchService] Results:', finalResults.map((r) => ({
      title: r.title,
      sourceDomain: r.sourceDomain,
      imageUrl: r.imageUrl,
      proxiedImageUrl: r.proxiedImageUrl,
      renderableImageUrl: r.renderableImageUrl,
      thumbnailStatus: r.thumbnailStatus,
      confidenceLabel: r.confidenceLabel,
    })));
  }

  return {
    results:         finalResults,
    exactMatch,
    totalCandidates: merged.length,
    sourceSummary:   { trusted: trustedCount, fallback: fallbackCount },
    noResults:       finalResults.length === 0,
  };
}
