/**
 * imageProxyService.js
 *
 * Wraps the images.weserv.nl public proxy with:
 *   1. URL validation — only real image asset URLs are proxied (not HTML pages)
 *   2. Trusted-domain awareness — non-trusted domains are still proxied since the
 *      upstream search already constrains results to known good sources
 *
 * The proxy is used to bypass CORS restrictions and common anti-hotlink CDN
 * protections that would block direct <img> rendering in the browser.
 */

const WESERV_BASE = 'https://images.weserv.nl/';

// Extensions that reliably identify a URL as an image asset
const IMAGE_EXTENSION_RE = /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|ico)(\?[^/]*)?$/i;

// CDN path fragments that strongly indicate an image asset (no extension required)
const IMAGE_PATH_FRAGMENTS = [
  '/images/',
  '/image/',
  '/img/',
  '/imgs/',
  '/photos/',
  '/photo/',
  '/assets/',
  '/media/',
  '/product-images/',
  '/product_images/',
  '/cdn-images/',
  '/thumbs/',
  '/thumbnails/',
  '/pictures/',
  '/gallery/',
  '/catalog/',
  '/product/',
  '/products/',
  '/whisky/',
  '/whiskey/',
  '/spirits/',
  '/bottles/',
  '/tobacco/',
  '/pipes/',
  '/content/dam/',
  '/dam/',
  '/static/images/',
  '/static/img/',
  '/upload/',
  '/uploads/',
  '/files/',
];

// Query-parameter keys that are strong indicators of image transformation/CDN
const IMAGE_TRANSFORM_PARAMS = [
  'width', 'height', 'w', 'h', 'fit', 'format', 'quality', 'q',
  'resize', 'scale', 'crop', 'auto', 'fm', 'cs', 'dpr',
];

// Path patterns that are very likely HTML product pages, not image assets
const PRODUCT_PAGE_PATH_RE = [
  /\/collections\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/shop\//i,
  /\/store\//i,
  /\/search\?/i,
  /\/tag\//i,
  /\/blog\//i,
  /\/articles?\//i,
  /\/pages?\//i,
  /\/checkout/i,
  /\/cart/i,
  /\/account/i,
];

/**
 * Return true when the URL looks like an HTML product/catalogue page rather
 * than a binary image asset.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function looksLikeProductPageUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const full = u.pathname + u.search;
    return PRODUCT_PAGE_PATH_RE.some((re) => re.test(full));
  } catch {
    return false;
  }
}

/**
 * Looser check: return true when a URL is likely a binary image asset.
 *
 * Accepts:
 *  1. URLs with a known image file extension anywhere in the path
 *  2. URLs whose path contains a recognised CDN/image-serving fragment
 *     (no extension required — many retailer CDNs omit extensions)
 *  3. URLs whose query string contains image-transformation parameters
 *     (width=, h=, format=, etc.) which strongly imply an image endpoint
 *
 * Rejects HTML product pages detected by looksLikeProductPageUrl.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function looksLikeImageAssetUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();

    // Reject obvious product pages first
    if (looksLikeProductPageUrl(url)) return false;

    // 1. Known image extension anywhere in path
    if (IMAGE_EXTENSION_RE.test(u.pathname)) return true;

    // 2. CDN/image-serving path fragment (extension not required)
    if (IMAGE_PATH_FRAGMENTS.some((f) => path.includes(f))) return true;

    // 3. Image transformation query params
    const params = u.searchParams;
    if (IMAGE_TRANSFORM_PARAMS.some((k) => params.has(k))) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Return true when a URL looks like a direct image asset URL rather than an
 * HTML page or API endpoint.
 *
 * This is the canonical public check used elsewhere in the pipeline.
 * It delegates to looksLikeImageAssetUrl.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isImageUrl(url) {
  return looksLikeImageAssetUrl(url);
}

/**
 * Build a proxied image URL via images.weserv.nl.
 *
 * The proxy is built as:
 *   https://images.weserv.nl/?url=<percent-encoded full URL>&w=…&h=…
 *
 * weserv.nl accepts both protocol-relative and full https:// URLs when
 * percent-encoded in the `url` query parameter.  encodeURIComponent is
 * the correct encoding — the server decodes and fetches the original URL.
 *
 * Returns null when:
 *  - url is empty / not a string
 *  - url does not look like an image asset URL
 *
 * @param {string|null|undefined} url    - Original image asset URL
 * @param {Object}  [opts]
 * @param {number}  [opts.width=112]     - Output width in px
 * @param {number}  [opts.height=112]    - Output height in px
 * @param {string}  [opts.fit='contain'] - weserv fit mode
 * @returns {string|null}
 */
export function buildProxiedUrl(url, { width = 112, height = 112, fit = 'contain' } = {}) {
  if (!isImageUrl(url)) return null;
  return `${WESERV_BASE}?url=${encodeURIComponent(url)}&w=${width}&h=${height}&fit=${fit}&we`;
}
