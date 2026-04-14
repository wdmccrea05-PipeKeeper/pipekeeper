/**
 * imageResultNormalizer.js
 *
 * Normalizes raw image results from any provider into the canonical
 * NormalizedImageResult shape used throughout the image search pipeline.
 *
 * Required output shape:
 * {
 *   id:               string,
 *   entityType:       "bottle" | "blend" | "pipe",
 *   title:            string,
 *   subtitle:         string | null,
 *   sourceDomain:     string,
 *   sourceTier:       1 | 2 | 3 | 4,
 *   sourceType:       "official" | "retailer" | "database" | "reference" | "fallback",
 *   url:              string | null,
 *   imageUrl:         string | null,
 *   matchedName:      string,
 *   matchedBrand:     string | null,
 *   confidenceScore:  number,          — filled in by imageResultRanker
 *   confidenceLabel:  string,          — filled in by imageResultRanker
 *   isExactMatch:     boolean,         — filled in by imageResultRanker
 *   isReferenceImage: boolean,
 *   metadata:         {},
 * }
 */

import { getImageDomainInfo } from './trustedImageSources.js';
import { isImageUrl } from './imageProxyService.js';

let _idCounter = 0;
function nextId() {
  return `img_${Date.now()}_${++_idCounter}`;
}

// ── Image URL extraction ──────────────────────────────────────────────────────

/**
 * Extract an image URL from a raw result, checking all known field variants.
 *
 * @param {Object} raw
 * @returns {string|null}
 */
function extractImageUrl(raw) {
  return (
    raw.imageUrl      ||
    raw.image_url     ||
    raw.thumbnailUrl  ||
    raw.thumbnail     ||
    raw.thumb         ||
    raw.image         ||
    raw.previewImage  ||
    raw.preview_image ||
    null
  );
}

// ── URL sanitization ──────────────────────────────────────────────────────────

/**
 * Sanitize an image URL:
 *  - protocol-relative (//) → https:
 *  - valid http(s) → returned as-is
 *  - relative / blank / malformed → null
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function sanitizeImageUrl(url) {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return null;
}

/**
 * Return true if the URL appears to be a placeholder or broken asset.
 *
 * @param {string|null} url
 * @returns {boolean}
 */
function isPlaceholderUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('no-image') ||
    lower.includes('noimage') ||
    lower.includes('blank.') ||
    lower.includes('default.') ||
    lower.endsWith('/default') ||
    lower.includes('missing')
  );
}

// ── Domain extraction ─────────────────────────────────────────────────────────

function extractDomain(urlOrDomain) {
  if (!urlOrDomain) return null;
  if (!urlOrDomain.startsWith('http')) return urlOrDomain;
  try {
    return new URL(urlOrDomain).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ── Main normalizer ───────────────────────────────────────────────────────────

/**
 * Normalize a single raw image result from any provider.
 *
 * @param {Object} raw          - Raw result from LLM, SerpApi, or Google CSE
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {{ matchedName?: string, matchedBrand?: string }} [context]
 * @returns {import('./imageSearchService.js').NormalizedImageResult}
 */
export function normalizeImageResult(raw, entityType = 'bottle', context = {}) {
  // Determine source domain — prefer explicit field, then infer from URLs
  const rawDomain =
    raw.source_domain ||
    raw.sourceDomain  ||
    extractDomain(raw.source_url || raw.sourceUrl) ||
    extractDomain(raw.image_url  || raw.imageUrl)  ||
    null;

  const domainInfo = getImageDomainInfo(rawDomain);

  // Extract and sanitize image URL
  const directImageUrl = extractImageUrl(raw);

  // Only fall back to source_url when it actually looks like an image asset URL
  // (not an HTML product page). This prevents non-image page URLs from being
  // passed to the proxy, which would silently fail and show a placeholder.
  const sourceUrlCandidate = raw.source_url || raw.sourceUrl || null;
  const sourceUrlAsImage   = isImageUrl(sourceUrlCandidate) ? sourceUrlCandidate : null;

  const rawImageUrl = directImageUrl || sourceUrlAsImage || null;
  const imageUrl    = isPlaceholderUrl(rawImageUrl) ? null : sanitizeImageUrl(rawImageUrl);

  // Source URL (the product page, distinct from the image asset URL)
  const sourceUrl = sanitizeImageUrl(raw.source_url || raw.sourceUrl || null);

  // Title
  const title = String(raw.title || raw.name || '').trim();

  // Subtitle — context-aware default
  const subtitle =
    raw.subtitle ||
    raw.source_domain ||
    rawDomain ||
    null;

  // Reference image flag: set by domain config OR by explicit pipe entityType
  // (final pipe labeling happens in imageSearchService)
  const domainReferenceOnly = domainInfo.referenceOnly === true;

  return {
    id:              nextId(),
    entityType:      entityType,
    title,
    subtitle,
    sourceDomain:    rawDomain,
    sourceTier:      domainInfo.tier,
    sourceType:      domainInfo.type,
    url:             sourceUrl,
    imageUrl,
    isDirectImageUrl: !!(directImageUrl && sanitizeImageUrl(directImageUrl)),
    proxiedImageUrl:  null, // populated later by imageResolver
    renderableImageUrl: null, // populated later by imageResolver
    thumbnailStatus: 'unverified', // updated to 'verified' | 'failed' by imageResolver
    matchedName:     context.matchedName  || title,
    matchedBrand:    context.matchedBrand || null,
    confidenceScore:  0,
    confidenceLabel:  'Low Confidence',
    isExactMatch:    false,
    isReferenceImage: domainReferenceOnly,
    isInternationalSource: domainInfo.isInternational,
    metadata:        { ...raw },
  };
}

/**
 * Normalize an array of raw image results.
 *
 * @param {Object[]} rawItems
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {{ matchedName?: string, matchedBrand?: string }} [context]
 * @returns {Object[]}
 */
export function normalizeImageResults(rawItems, entityType, context = {}) {
  return (rawItems || [])
    .filter(Boolean)
    .map((item) => normalizeImageResult(item, entityType, context));
}
