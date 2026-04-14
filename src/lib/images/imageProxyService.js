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

// CDN path fragments that strongly indicate an image asset
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
];

/**
 * Return true when a URL looks like a direct image asset URL rather than an
 * HTML page or API endpoint.
 *
 * Checks:
 *  1. URL has a recognised image extension in the path
 *  2. OR URL path contains a known image-CDN fragment AND the extension check
 *     passes on the filename portion
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isImageUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname;

    // Primary check: known image extension in the path
    if (IMAGE_EXTENSION_RE.test(path)) return true;

    // Secondary check: CDN-like path + filename with image extension
    const lowerPath = path.toLowerCase();
    const hasCdnFragment = IMAGE_PATH_FRAGMENTS.some((f) => lowerPath.includes(f));
    if (hasCdnFragment && IMAGE_EXTENSION_RE.test(path.split('/').pop() || '')) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Build a proxied image URL via images.weserv.nl.
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
