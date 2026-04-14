/**
 * imageResultDedupe.js
 *
 * Removes duplicate and low-quality entries from a normalized image result set.
 *
 * Removes:
 *   - Exact same imageUrl duplicates
 *   - Results that share domain + title (keeps highest-confidence one)
 *   - Placeholder / broken / no-image URLs
 *   - Results with no imageUrl AND no sourceUrl (entirely unusable rows)
 *
 * Resolution rule: when duplicates exist and only one has a valid imageUrl,
 * keep the one with the imageUrl.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return true if the URL looks like a placeholder or broken asset.
 *
 * @param {string|null} url
 * @returns {boolean}
 */
function isPlaceholder(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('no-image') ||
    lower.includes('noimage') ||
    lower.includes('blank.') ||
    lower.includes('default.') ||
    lower.endsWith('/default') ||
    lower.includes('missing') ||
    lower === 'https://' ||
    lower === 'http://'
  );
}

/**
 * Prefer the result that has a valid imageUrl.
 * If both or neither have one, prefer higher confidenceScore.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
function preferBetter(a, b) {
  if (a.imageUrl && !b.imageUrl) return a;
  if (b.imageUrl && !a.imageUrl) return b;
  return (b.confidenceScore || 0) >= (a.confidenceScore || 0) ? b : a;
}

/**
 * Normalize a URL for deduplication comparison (lowercase, strip query strings
 * and common size suffixes added by CDNs).
 *
 * @param {string|null} url
 * @returns {string}
 */
function normalizeUrlForDedup(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Strip query params and hash — same image at different sizes
    return (u.origin + u.pathname).toLowerCase().replace(/[_-]\d+x\d+/, '');
  } catch {
    return url.toLowerCase();
  }
}

// ── Main deduplication ────────────────────────────────────────────────────────

/**
 * Deduplicate an array of normalized image results.
 *
 * @param {Object[]} results
 * @returns {Object[]}
 */
export function dedupeImageResults(results = []) {
  if (!results.length) return [];

  // Pass 1: collapse entries that share domain + normalised title,
  // keeping the higher-quality one.
  const byTitleDomain = new Map();

  for (const item of results) {
    const key = [
      (item.sourceDomain || '').toLowerCase(),
      (item.title || '').toLowerCase().trim(),
    ].join('||');

    const existing = byTitleDomain.get(key);
    byTitleDomain.set(key, existing ? preferBetter(existing, item) : item);
  }

  // Pass 2: deduplicate by normalized image URL; apply quality filters.
  const seenImageUrls = new Set();
  const out = [];

  for (const item of byTitleDomain.values()) {
    // Discard items that have no usable URL at all
    if (!item.imageUrl && !item.url) continue;

    // Discard placeholder image URLs
    if (item.imageUrl && isPlaceholder(item.imageUrl)) continue;

    if (item.imageUrl) {
      const normUrl = normalizeUrlForDedup(item.imageUrl);
      if (seenImageUrls.has(normUrl)) continue;
      seenImageUrls.add(normUrl);
    }

    out.push(item);
  }

  return out;
}
