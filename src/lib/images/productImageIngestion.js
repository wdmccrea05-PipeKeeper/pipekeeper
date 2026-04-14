/**
 * productImageIngestion.js
 *
 * Server-side image ingestion layer.
 *
 * For each candidate from the discovery layer, this module:
 *   1. Validates the candidate image URL
 *   2. Calls the ingestProductImage backend function (server-side fetch)
 *   3. The function verifies the MIME type and uploads to base44 storage
 *   4. Returns a stable internal URL (cachedImageUrl)
 *
 * This ensures all image URLs displayed in Quick Add and record views are
 * app-controlled URLs, not raw retailer hotlinks.
 */

import { base44 } from '@/api/base44Client';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return true when a URL looks minimally usable as a candidate image URL.
 * Rejects null, empty, and clearly non-URL strings.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
function isUsableCandidateUrl(url) {
  if (!url) return false;
  const s = String(url).trim();
  return s.startsWith('http://') || s.startsWith('https://');
}

// ── Single-candidate ingestion ────────────────────────────────────────────────

/**
 * Ingest a single candidate image:
 *   - fetch server-side via ingestProductImage function
 *   - validate MIME type on server
 *   - store in base44 file storage
 *   - return stable internal URL
 *
 * @param {{
 *   candidateImageUrl: string | null,
 *   entityType?: string,
 *   title?: string,
 * }} candidate
 * @returns {Promise<{
 *   success: boolean,
 *   cachedImageUrl: string | null,
 *   contentType: string | null,
 *   reason: 'not-an-image' | 'fetch-failed' | 'blocked' | 'invalid-url' | 'upload-failed' | 'no-url' | null,
 * }>}
 */
export async function ingestCandidateImage(candidate) {
  const { candidateImageUrl, entityType = 'product', title = '' } = candidate;

  if (!isUsableCandidateUrl(candidateImageUrl)) {
    return { success: false, cachedImageUrl: null, contentType: null, reason: 'no-url' };
  }

  try {
    const result = await base44.functions.invoke('ingestProductImage', {
      url:        candidateImageUrl,
      entityType: entityType || 'product',
      name:       title      || '',
    });

    if (result?.ok && result.cachedImageUrl) {
      return {
        success:        true,
        cachedImageUrl: result.cachedImageUrl,
        contentType:    result.contentType || null,
        reason:         null,
      };
    }

    return {
      success:        false,
      cachedImageUrl: null,
      contentType:    null,
      reason:         result?.reason || 'fetch-failed',
    };
  } catch (err) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[productImageIngestion] ingest error:', candidateImageUrl, err);
    }
    return { success: false, cachedImageUrl: null, contentType: null, reason: 'fetch-failed' };
  }
}

// ── Batch ingestion ───────────────────────────────────────────────────────────

/**
 * Attempt to ingest multiple candidates in parallel.
 * Returns results in the same order as the input array.
 * Individual failures are captured and do not reject the batch.
 *
 * @param {Array<{ candidateImageUrl: string|null, entityType?: string, title?: string }>} candidates
 * @returns {Promise<Array<{
 *   success: boolean,
 *   cachedImageUrl: string | null,
 *   contentType: string | null,
 *   reason: string | null,
 * }>>}
 */
export async function ingestCandidateImages(candidates) {
  if (!candidates || candidates.length === 0) return [];
  return Promise.all(candidates.map(ingestCandidateImage));
}
