/**
 * imageRenderVerifier.js
 *
 * Provides a browser-side utility to verify that an image URL actually loads
 * before it is counted as a renderable preview or saved against a record.
 *
 * This avoids false positives where a proxy URL is structurally valid but
 * returns an error page, a 404, or is blocked by the CDN — all of which
 * would silently produce an empty thumbnail box.
 */

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Test whether an image URL successfully loads in the browser.
 *
 * Uses a hidden Image object — the most reliable cross-browser method for
 * checking whether a given URL returns a renderable bitmap without needing
 * any server-side assistance.
 *
 * Returns false immediately when:
 *  - url is falsy
 *  - window / Image is not available (e.g., server-side rendering)
 *  - the image errors or times out
 *
 * @param {string|null|undefined} url       - Image URL to test
 * @param {number}                [timeout] - Abort after this many ms (default 5 000)
 * @returns {Promise<boolean>}
 */
export function verifyImageLoads(url, timeout = DEFAULT_TIMEOUT_MS) {
  if (!url) return Promise.resolve(false);

  // Guard: Image API is only available in browser contexts
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Remove references to allow GC
      img.onload  = null;
      img.onerror = null;
      img.src     = '';
      resolve(result);
    };

    const timer = setTimeout(() => finish(false), timeout);
    img.onload  = () => finish(true);
    img.onerror = () => finish(false);
    img.src     = url;
  });
}
