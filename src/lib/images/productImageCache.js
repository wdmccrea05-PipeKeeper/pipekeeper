/**
 * productImageCache.js
 *
 * Persistent localStorage cache for ingested product image URLs.
 *
 * This cache stores the result of the server-side ingestion step:
 * once a candidate image URL has been fetched server-side and stored
 * in base44 file storage, the resulting stable internal URL is cached
 * here so repeat searches avoid re-ingesting the same image.
 *
 * Cache entries are keyed by:
 *   entityType + normalized candidate image URL
 *
 * Each entry stores:
 *   {
 *     candidateImageUrl: string | null,  — original retailer URL (source)
 *     cachedImageUrl:    string | null,  — stable internal URL (destination)
 *     entityType:        string,
 *     normalizedName:    string,
 *     sourceDomain:      string | null,
 *     fetchedAt:         number,         — Unix ms timestamp
 *     status:            "success" | "failed",
 *   }
 *
 * TTL for successful entries: 7 days (internal URLs are stable)
 * TTL for failed entries: 1 hour (retry sooner after failures)
 */

const CACHE_KEY_PREFIX  = 'pk_pingest_v1_';
const SUCCESS_TTL_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days
const FAILED_TTL_MS     = 60 * 60 * 1000;           // 1 hour

// ── Key builder ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic localStorage key for an ingestion cache entry.
 *
 * @param {string} entityType        - "bottle" | "blend" | "pipe"
 * @param {string} candidateImageUrl - Raw candidate image URL from discovery
 * @returns {string}
 */
export function buildIngestionCacheKey(entityType, candidateImageUrl) {
  const safeType = String(entityType || 'product').toLowerCase().slice(0, 20);
  // Use last 80 chars of URL (avoids CDN query-string variation in prefix)
  const urlSlug = String(candidateImageUrl || '')
    .slice(-80)
    .replace(/[^a-z0-9._-]/gi, '_');
  return `${CACHE_KEY_PREFIX}${safeType}__${urlSlug}`;
}

// ── Entry shape ───────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   candidateImageUrl: string | null,
 *   cachedImageUrl:    string | null,
 *   entityType:        string,
 *   normalizedName:    string,
 *   sourceDomain:      string | null,
 *   fetchedAt:         number,
 *   status:            "success" | "failed",
 * }} IngestionCacheEntry
 */

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retrieve a cached ingestion result if it is still within the TTL window.
 *
 * @param {string} key  - Cache key from buildIngestionCacheKey()
 * @returns {IngestionCacheEntry | null}
 */
export function getCachedIngestion(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || typeof entry.fetchedAt !== 'number') return null;

    const ttl = entry.status === 'success' ? SUCCESS_TTL_MS : FAILED_TTL_MS;
    if (Date.now() - entry.fetchedAt > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Store an ingestion result in the cache.
 *
 * @param {string} key
 * @param {Partial<IngestionCacheEntry>} value
 */
export function setCachedIngestion(key, value) {
  try {
    const entry = {
      candidateImageUrl: value.candidateImageUrl ?? null,
      cachedImageUrl:    value.cachedImageUrl    ?? null,
      entityType:        value.entityType        ?? 'product',
      normalizedName:    value.normalizedName    ?? '',
      sourceDomain:      value.sourceDomain      ?? null,
      fetchedAt:         Date.now(),
      status:            value.status            ?? 'failed',
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — ignore
  }
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

/**
 * Look up a cached ingestion by entityType + candidateImageUrl.
 * Returns null when not cached or expired.
 *
 * @param {string} entityType
 * @param {string} candidateImageUrl
 * @returns {IngestionCacheEntry | null}
 */
export function lookupIngestionCache(entityType, candidateImageUrl) {
  const key = buildIngestionCacheKey(entityType, candidateImageUrl);
  return getCachedIngestion(key);
}

/**
 * Store an ingestion result by entityType + candidateImageUrl.
 *
 * @param {string} entityType
 * @param {string} candidateImageUrl
 * @param {{ cachedImageUrl?: string, normalizedName?: string, sourceDomain?: string, status: 'success'|'failed' }} result
 */
export function storeIngestionCache(entityType, candidateImageUrl, result) {
  const key = buildIngestionCacheKey(entityType, candidateImageUrl);
  setCachedIngestion(key, {
    candidateImageUrl,
    entityType,
    ...result,
  });
}

// ── Purge ─────────────────────────────────────────────────────────────────────

/**
 * Remove all expired ingestion cache entries.
 * Call opportunistically to prevent unbounded localStorage growth.
 */
export function purgeExpiredIngestionCache() {
  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const entry = JSON.parse(raw);
        if (!entry?.fetchedAt) {
          keysToRemove.push(key);
          continue;
        }
        const ttl = entry.status === 'success' ? SUCCESS_TTL_MS : FAILED_TTL_MS;
        if (now - entry.fetchedAt > ttl) keysToRemove.push(key);
      } catch {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore errors in cleanup
  }
}
