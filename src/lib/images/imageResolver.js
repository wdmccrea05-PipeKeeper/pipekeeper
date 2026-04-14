/**
 * imageResolver.js
 *
 * Resolves a "renderable" image URL for each NormalizedImageResult, and
 * verifies that the resolved URL actually loads in the browser before
 * marking it as a usable thumbnail.
 *
 * For each candidate result it:
 *   1. Checks the cache (imageCache) — reuse if still valid
 *   2. Validates whether imageUrl is a real image asset URL (imageProxyService)
 *   3. Builds a proxied URL via images.weserv.nl for valid image URLs
 *   4. Verifies the proxied URL (and, if needed, the direct URL) actually loads
 *   5. Sets the computed fields:
 *        proxiedImageUrl    — weserv.nl URL (or null if not a valid image)
 *        renderableImageUrl — verified URL the browser can render (null if verification failed)
 *        thumbnailStatus    — "verified" | "failed" | "unverified"
 *   6. Stores the resolved + verified entry in the cache for future calls
 *
 * thumbnailStatus values:
 *   "verified"   — image loaded successfully; renderableImageUrl is trustworthy
 *   "failed"     — both proxy and direct URLs failed to load
 *   "unverified" — browser Image API unavailable (e.g., SSR); URL may still work
 *
 * renderableImageUrl resolution priority:
 *   proxied (if verified)  →  direct (if verified)  →  null
 */

import { isImageUrl, buildProxiedUrl } from './imageProxyService.js';
import {
  buildCacheKey,
  getCachedResolution,
  setCachedResolution,
} from './imageCache.js';
import { verifyImageLoads } from './imageRenderVerifier.js';

// ── Single-result resolver ────────────────────────────────────────────────────

/**
 * Resolve and verify renderableImageUrl for a single NormalizedImageResult.
 *
 * This function is async — it makes browser Image-load verification requests
 * to confirm the proxy URL (and optionally the direct URL) actually returns
 * a renderable bitmap before marking it available.
 *
 * @param {import('./imageSearchService.js').NormalizedImageResult} result
 * @returns {Promise<import('./imageSearchService.js').NormalizedImageResult>}
 */
export async function resolveRenderableImage(result) {
  const { imageUrl, isDirectImageUrl, sourceDomain, title, entityType } = result;

  // Build a cache key for this specific result
  const cacheKey = buildCacheKey(
    entityType   || 'bottle',
    title        || '',
    sourceDomain || '',
    imageUrl     || '',
  );

  // Check cache first — skip re-verification if we already have a definitive result
  const cached = getCachedResolution(cacheKey);
  if (cached && cached.thumbnailStatus && cached.thumbnailStatus !== 'unverified') {
    return {
      ...result,
      proxiedImageUrl:    cached.proxiedImageUrl,
      renderableImageUrl: cached.renderableImageUrl,
      thumbnailStatus:    cached.thumbnailStatus,
    };
  }

  // Determine if imageUrl is a usable image asset
  const isActualImage = isDirectImageUrl && isImageUrl(imageUrl);

  // Build the proxied URL — null when imageUrl is not an image asset URL
  const proxiedImageUrl = isActualImage ? buildProxiedUrl(imageUrl) : null;

  // ── Verification ──────────────────────────────────────────────────────────
  // Try proxy first; fall back to raw direct URL if proxy fails and the raw
  // URL passes the image-URL check.
  let renderableImageUrl = null;
  let thumbnailStatus    = 'failed';

  if (proxiedImageUrl) {
    const proxyOk = await verifyImageLoads(proxiedImageUrl);
    if (proxyOk) {
      renderableImageUrl = proxiedImageUrl;
      thumbnailStatus    = 'verified';
    }
  }

  if (thumbnailStatus !== 'verified' && isActualImage && imageUrl) {
    // Check if the Image API is available before attempting direct load —
    // if not, set unverified so callers can still attempt rendering
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      renderableImageUrl = proxiedImageUrl || imageUrl;
      thumbnailStatus    = 'unverified';
    } else {
      const directOk = await verifyImageLoads(imageUrl);
      if (directOk) {
        renderableImageUrl = imageUrl;
        thumbnailStatus    = 'verified';
      }
    }
  }

  // Store in cache — persists "failed" status so we skip re-verification on
  // repeat searches within the TTL window
  setCachedResolution(cacheKey, {
    imageUrl,
    proxiedImageUrl,
    renderableImageUrl,
    thumbnailStatus,
    title,
    sourceDomain,
    ok: thumbnailStatus === 'verified',
  });

  return {
    ...result,
    proxiedImageUrl,
    renderableImageUrl,
    thumbnailStatus,
  };
}

// ── Batch resolver ────────────────────────────────────────────────────────────

/**
 * Resolve and verify renderableImageUrl for an array of NormalizedImageResult objects.
 * All results are verified in parallel (Promise.all) to minimise total wait time.
 * Results are then sorted so verified thumbnails come first, preserving
 * relative order within each group.
 *
 * @param {import('./imageSearchService.js').NormalizedImageResult[]} results
 * @returns {Promise<import('./imageSearchService.js').NormalizedImageResult[]>}
 */
export async function resolveRenderableImages(results) {
  if (!results || results.length === 0) return [];

  // Run all verifications in parallel
  const resolved = await Promise.all(results.map(resolveRenderableImage));

  // Stable sort: verified thumbnails first, then unverified, then failed
  return resolved.sort((a, b) => {
    const rank = (r) =>
      r.thumbnailStatus === 'verified'   ? 0 :
      r.thumbnailStatus === 'unverified' ? 1 : 2;
    return rank(a) - rank(b);
  });
}
