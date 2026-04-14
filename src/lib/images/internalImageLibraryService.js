/**
 * internalImageLibraryService.js
 *
 * Unified internal image search layer.
 *
 * Consolidates two sources into a single ranked result list:
 *   1. TobaccoLogoLibrary (blend label art) — primary for blends
 *   2. ProductImageLibrary (uploaded / mined images) — all entity types
 *
 * For blends:   logo library results come first.
 * For bottles:  ProductImageLibrary only.
 * For pipes:    ProductImageLibrary only (results tagged reference_only).
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { searchBlendLogoLibrary } from './blendLogoLibraryService.js';
import { findProductLibraryMatches } from './imageMatchingService.js';

// ── Deduplication ─────────────────────────────────────────────────────────────

function dedupeByUrl(results) {
  const seen = new Set();
  return results.filter((r) => {
    if (!r.imageUrl) return false;
    const key = r.imageUrl.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Search the internal image library for a product.
 *
 * @param {Object} params
 * @param {'bottle'|'blend'|'pipe'} params.entityType
 * @param {string} [params.name]
 * @param {string} [params.brand]
 * @param {string} [params.distillery]
 * @param {string} [params.manufacturer]
 * @param {string} [params.maker]
 * @param {string} [params.shape]
 * @param {number} [params.limit]           — max total results (default 8)
 * @returns {Promise<Array>}                — LibraryMatchResult[]
 */
export async function searchInternalImageLibrary({
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

  const params = { entityType, name, brand, distillery, manufacturer, maker, shape };

  if (entityType === 'blend') {
    // For blends: logo library first, then ProductImageLibrary
    const [logoMatches, libraryMatches] = await Promise.all([
      searchBlendLogoLibrary({
        manufacturer: brand || manufacturer,
        blendName:    name,
        limit,
      }),
      findProductLibraryMatches({ ...params, limit }),
    ]);

    // Logo library results always come first for blends
    const combined = [...logoMatches, ...libraryMatches];
    return dedupeByUrl(combined).slice(0, limit);
  }

  // For bottles and pipes: ProductImageLibrary only
  const matches = await findProductLibraryMatches({ ...params, limit });
  return dedupeByUrl(matches).slice(0, limit);
}
