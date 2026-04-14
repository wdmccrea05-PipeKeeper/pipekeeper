/**
 * imageCache.js
 *
 * Lightweight localStorage cache for image resolution results.
 *
 * Cache entries are keyed by:
 *   entityType + normalised product name + sourceDomain + imageUrl
 *
 * Each entry stores:
 *   { imageUrl, proxiedImageUrl, renderableImageUrl, title, sourceDomain, fetchedAt, ok }
 *
 * Default TTL: 24 hours.
 */

const CACHE_KEY_PREFIX = 'pk_imgcache_v1_';
const DEFAULT_TTL_MS   = 24 * 60 * 60 * 1000; // 24 hours

// ── Key builder ───────────────────────────────────────────────────────────────

/**
 * Build a deterministic localStorage key for a resolved image entry.
 *
 * @param {string} entityType  - "bottle" | "blend" | "pipe"
 * @param {string} name        - Product name (normalised to lowercase)
 * @param {string} domain      - Source domain
 * @param {string} imageUrl    - Original candidate image URL
 * @returns {string}
 */
export function buildCacheKey(entityType, name, domain, imageUrl) {
  const normName   = String(name   || '').toLowerCase().trim().replace(/\s+/g, '_').slice(0, 80);
  const normDomain = String(domain || '').toLowerCase().replace(/^www\./, '').slice(0, 40);
  // Use a short hash of imageUrl to keep the key length manageable
  const urlSlug    = String(imageUrl || '').slice(-60).replace(/[^a-z0-9._-]/gi, '_');
  return `${CACHE_KEY_PREFIX}${entityType}__${normName}__${normDomain}__${urlSlug}`;
}

// ── Entry shape ───────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   imageUrl:         string | null,
 *   proxiedImageUrl:  string | null,
 *   renderableImageUrl: string | null,
 *   title:            string | null,
 *   sourceDomain:     string | null,
 *   fetchedAt:        number,
 *   ok:               boolean,
 * }} ImageCacheEntry
 */

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retrieve a previously cached resolution entry if it exists and is still
 * within the TTL window.
 *
 * @param {string} key     - Cache key from buildCacheKey()
 * @param {number} [ttl]   - TTL in ms (default: DEFAULT_TTL_MS)
 * @returns {ImageCacheEntry|null}
 */
export function getCachedResolution(key, ttl = DEFAULT_TTL_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!entry || typeof entry.fetchedAt !== 'number') return null;

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
 * Store a resolution result in the cache.
 *
 * @param {string} key     - Cache key from buildCacheKey()
 * @param {Partial<ImageCacheEntry>} value
 */
export function setCachedResolution(key, value) {
  try {
    const entry = {
      imageUrl:           value.imageUrl          ?? null,
      proxiedImageUrl:    value.proxiedImageUrl    ?? null,
      renderableImageUrl: value.renderableImageUrl ?? null,
      title:              value.title              ?? null,
      sourceDomain:       value.sourceDomain       ?? null,
      fetchedAt:          Date.now(),
      ok:                 value.ok                 ?? false,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — ignore
  }
}

// ── Purge ─────────────────────────────────────────────────────────────────────

/**
 * Remove all expired cache entries.
 * Call opportunistically to prevent unbounded localStorage growth.
 *
 * @param {number} [ttl] - TTL in ms (default: DEFAULT_TTL_MS)
 */
export function purgeExpiredImageCache(ttl = DEFAULT_TTL_MS) {
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
        if (!entry?.fetchedAt || now - entry.fetchedAt > ttl) {
          keysToRemove.push(key);
        }
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
