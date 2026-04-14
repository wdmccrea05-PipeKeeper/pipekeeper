/**
 * imageResolver.js
 *
 * Resolves a "renderable" image URL for each NormalizedImageResult.
 *
 * For each candidate result it:
 *   1. Checks the cache (imageCache) — reuse if still valid
 *   2. Validates whether imageUrl is a real image asset URL (imageProxyService)
 *   3. Builds a proxied URL via images.weserv.nl for valid image URLs
 *   4. Sets the computed fields:
 *        proxiedImageUrl    — weserv.nl URL (or null if not a valid image)
 *        renderableImageUrl — best available URL the browser can render
 *   5. Stores the resolved entry in the cache for future calls
 *
 * renderableImageUrl resolution priority:
 *   proxiedImageUrl  →  (imageUrl when it is a direct image asset)  →  null
 *
 * A result with renderableImageUrl === null still appears in the list but the
 * UI renders a placeholder instead of a broken image.
 */

import { isImageUrl, buildProxiedUrl } from './imageProxyService.js';
import {
  buildCacheKey,
  getCachedResolution,
  setCachedResolution,
} from './imageCache.js';

// ── Single-result resolver ────────────────────────────────────────────────────

/**
 * Resolve renderableImageUrl for a single NormalizedImageResult.
 *
 * This function is synchronous — it does not make network requests.
 * Determining whether an image asset is accessible requires a browser load
 * attempt; that responsibility stays in the UI (SuggestionThumb).
 *
 * @param {import('./imageSearchService.js').NormalizedImageResult} result
 * @returns {import('./imageSearchService.js').NormalizedImageResult}
 */
export function resolveRenderableImage(result) {
  const { imageUrl, isDirectImageUrl, sourceDomain, title, entityType } = result;

  // Build a cache key for this specific result
  const cacheKey = buildCacheKey(
    entityType   || 'bottle',
    title        || '',
    sourceDomain || '',
    imageUrl     || '',
  );

  // Check cache first
  const cached = getCachedResolution(cacheKey);
  if (cached) {
    return {
      ...result,
      proxiedImageUrl:    cached.proxiedImageUrl,
      renderableImageUrl: cached.renderableImageUrl,
    };
  }

  // Determine if imageUrl is a usable image asset
  const isActualImage = isDirectImageUrl && isImageUrl(imageUrl);

  // Build the proxied URL — null when imageUrl is not an image asset URL
  const proxiedImageUrl = isActualImage ? buildProxiedUrl(imageUrl) : null;

  // renderableImageUrl: prefer proxy, fall back to raw image URL only if it
  // is confirmed to be a direct image asset
  const renderableImageUrl = proxiedImageUrl || (isActualImage ? imageUrl : null);

  // Store in cache
  setCachedResolution(cacheKey, {
    imageUrl,
    proxiedImageUrl,
    renderableImageUrl,
    title,
    sourceDomain,
    ok: !!renderableImageUrl,
  });

  return {
    ...result,
    proxiedImageUrl,
    renderableImageUrl,
  };
}

// ── Batch resolver ────────────────────────────────────────────────────────────

/**
 * Resolve renderableImageUrl for an array of NormalizedImageResult objects.
 * Results are sorted so those with a renderableImageUrl come first, preserving
 * relative order within each group.
 *
 * @param {import('./imageSearchService.js').NormalizedImageResult[]} results
 * @returns {import('./imageSearchService.js').NormalizedImageResult[]}
 */
export function resolveRenderableImages(results) {
  if (!results || results.length === 0) return [];

  const resolved = results.map(resolveRenderableImage);

  // Stable sort: results with a renderable image are preferred
  return resolved.sort((a, b) => {
    const aHas = !!a.renderableImageUrl;
    const bHas = !!b.renderableImageUrl;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0; // preserve original rank order within each group
  });
}
