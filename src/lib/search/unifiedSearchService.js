/**
 * unifiedSearchService.js
 *
 * Main search service used by Quick Add (bottle / blend / pipe / cigar) and
 * the image suggestion flow.
 *
 * All search requests go through:
 *   1. Query building (searchQueries)
 *   2. LLM call via base44 with internet context
 *   3. Result normalisation (searchAdapters)
 *   4. Confidence scoring + ranking (searchRanking)
 *
 * Graceful fallback: when the LLM call fails or returns nothing, the service
 * resolves to an empty result set and sets `noResults: true` so the UI can
 * show the correct empty-state message.
 */

import { base44 } from '@/api/base44Client';
import {
  buildQuickAddPrompt,
  buildImageSearchPrompt,
  QUICK_ADD_RESPONSE_SCHEMA,
  IMAGE_SEARCH_RESPONSE_SCHEMA,
} from './searchQueries.js';
import { normalizeLLMResults, normalizeImageResult } from './searchAdapters.js';
import { rankResults } from './searchRanking.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Invoke the LLM with internet context and parse the response.
 * Returns null on any error so callers can handle gracefully.
 *
 * @param {string} prompt
 * @param {Object} schema - JSON schema for the expected response
 * @returns {Promise<Object|null>}
 */
async function callLLM(prompt, schema) {
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: true,
    });
    return result || null;
  } catch {
    return null;
  }
}

// ── Quick Add search ──────────────────────────────────────────────────────────

/**
 * Search for Quick Add record matches using the trusted-source strategy.
 *
 * Returns a sorted array of normalised result objects enriched with:
 *   confidenceScore, confidenceLabel, confidenceReason, isExactMatch
 *
 * On failure or empty response, returns { results: [], noResults: true }.
 *
 * @param {string} query      - User's free-text search query
 * @param {'bottle'|'blend'|'pipe'|'cigar'} itemType
 * @param {{ maxResults?: number }} [options]
 * @returns {Promise<{ results: Object[], noResults: boolean }>}
 */
export async function searchForRecord(query, itemType, options = {}) {
  const { maxResults = 10 } = options;

  if (!query?.trim()) return { results: [], noResults: true };

  const prompt = buildQuickAddPrompt(query.trim(), itemType);
  const llmResult = await callLLM(prompt, QUICK_ADD_RESPONSE_SCHEMA);

  if (!llmResult || !Array.isArray(llmResult.items) || llmResult.items.length === 0) {
    return { results: [], noResults: true };
  }

  const normalized = normalizeLLMResults(llmResult.items, itemType);
  const ranked = rankResults(query.trim(), normalized, itemType);

  return {
    results: ranked.slice(0, maxResults),
    noResults: ranked.length === 0,
  };
}

// ── Image suggestion search ───────────────────────────────────────────────────

/**
 * Deduplicate image results by imageUrl + sourceDomain + title.
 * Filters out results without an imageUrl or with placeholder URLs.
 *
 * @param {Object[]} results
 * @returns {Object[]}
 */
function dedupeImageResults(results = []) {
  const seen = new Set();
  return results.filter((item) => {
    const key = [
      item.imageUrl || '',
      item.sourceDomain || '',
      (item.title || '').toLowerCase().trim(),
    ].join('|');

    if (!item.imageUrl) return false;
    if (seen.has(key)) return false;
    seen.add(key);

    const url = String(item.imageUrl).toLowerCase();
    if (url.includes('placeholder') || url.includes('no-image')) return false;

    return true;
  });
}

/**
 * Fetch image suggestions for a record using the trusted-source strategy.
 *
 * For pipes the results are always marked as reference images.
 * Auto-confirm is only appropriate when confidenceLabel === "High".
 *
 * Returns a sorted array of normalised image result objects.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields - Record fields (name, distillery, maker, manufacturer, region, country)
 * @param {{ maxResults?: number }} [options]
 * @returns {Promise<{ results: Object[], exactMatch: Object|null, totalCandidates: number, noResults: boolean }>}
 */
export async function searchForImages(entityType, fields = {}, options = {}) {
  const { maxResults = 6, seed } = options;

  const hasMinimumFields =
    fields.name || fields.distillery || fields.maker || fields.manufacturer;

  if (!hasMinimumFields) return { results: [], exactMatch: null, totalCandidates: 0, noResults: true };

  const prompt = buildImageSearchPrompt(entityType, fields, { seed });

  const llmResult = await callLLM(prompt, IMAGE_SEARCH_RESPONSE_SCHEMA);

  if (!llmResult || !Array.isArray(llmResult.images) || llmResult.images.length === 0) {
    return { results: [], exactMatch: null, totalCandidates: 0, noResults: true };
  }

  // Filter out results that lack an image_url
  const validImages = llmResult.images.filter((img) => img?.image_url);

  if (validImages.length === 0) return { results: [], exactMatch: null, totalCandidates: 0, noResults: true };

  // Build a query string for ranking from the available fields
  const rankQuery = [
    fields.name,
    fields.distillery,
    fields.maker,
    fields.manufacturer,
  ]
    .filter(Boolean)
    .join(' ');

  const normalized = validImages.map((img) => normalizeImageResult(img));
  const ranked = rankResults(rankQuery, normalized, 'image');

  // For pipes, always mark results as reference images
  const withReferenceLabel = ranked.map((r) => ({
    ...r,
    isReferenceImage: entityType === 'pipe',
    imageLabel: entityType === 'pipe' ? 'Reference Image' : 'Suggested Match',
  }));

  let finalResults = dedupeImageResults(withReferenceLabel).slice(0, maxResults);

  // If fewer than 3 trusted results, run a broader fallback query
  if (finalResults.length < 3) {
    const broadSeed = seed ?? Date.now();
    const broadPrompt = buildImageSearchPrompt(entityType, fields, { seed: broadSeed, broad: true });
    const broadResult = await callLLM(broadPrompt, IMAGE_SEARCH_RESPONSE_SCHEMA);

    if (broadResult && Array.isArray(broadResult.images) && broadResult.images.length > 0) {
      const broadValid = broadResult.images.filter((img) => img?.image_url);
      const broadNormalized = broadValid.map((img) => normalizeImageResult(img));
      const broadRanked = rankResults(rankQuery, broadNormalized, 'image');
      const broadWithLabel = broadRanked.map((r) => ({
        ...r,
        isReferenceImage: entityType === 'pipe',
        imageLabel: entityType === 'pipe' ? 'Reference Image' : 'Suggested Match',
      }));
      finalResults = dedupeImageResults([...finalResults, ...broadWithLabel]).slice(0, maxResults);
    }
  }

  const exactMatch = finalResults.find((r) => r.confidenceLabel === 'Exact Match') || null;

  return {
    results: finalResults,
    exactMatch,
    totalCandidates: ranked.length,
    noResults: finalResults.length === 0,
  };
}

// ── Convenience re-exports for consumers ─────────────────────────────────────

export { getConfidenceLabel, getConfidenceReason, confidenceChipText } from './searchConfidence.js';
