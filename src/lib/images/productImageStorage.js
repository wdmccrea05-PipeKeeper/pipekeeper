/**
 * productImageStorage.js
 *
 * Storage abstraction for the product image pipeline.
 *
 * Provides a stable interface for uploading image blobs/files to
 * app-controlled storage and returning permanent internal URLs.
 *
 * The primary upload path uses base44 file storage (Core.UploadFile).
 * Server-side ingestion via the ingestProductImage function is the preferred
 * path; this module handles client-side upload as a complementary option.
 */

import { base44 } from '@/api/base44Client';

// ── File extension helpers ────────────────────────────────────────────────────

const MIME_TO_EXT = {
  'image/jpeg':    '.jpg',
  'image/jpg':     '.jpg',
  'image/png':     '.png',
  'image/webp':    '.webp',
  'image/gif':     '.gif',
  'image/avif':    '.avif',
  'image/svg+xml': '.svg',
  'image/bmp':     '.bmp',
};

function extensionFromMime(mimeType) {
  const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] || '.jpg';
}

// ── Key builder ───────────────────────────────────────────────────────────────

/**
 * Build a descriptive filename for an uploaded product image.
 *
 * Suggested key structure (path segment):
 *   {entityType}_{normalizedName}_{timestamp}{ext}
 *
 * Where normalizedName is derived from:
 *   - bottle: name
 *   - blend: name
 *   - pipe: maker + model
 *
 * @param {string} entityType
 * @param {string} name
 * @param {string} mimeType
 * @returns {string}
 */
export function buildStorageFilename(entityType, name, mimeType) {
  const safeType = String(entityType || 'product').replace(/[^a-z]/gi, '').slice(0, 20);
  const safeName = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
  const ext = extensionFromMime(mimeType);
  return `${safeType}_${safeName}_${Date.now()}${ext}`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload an image Blob/File to base44 file storage.
 * Returns the stable internal URL on success.
 *
 * @param {Blob|File} blob
 * @param {Object} [options]
 * @param {string} [options.entityType]
 * @param {string} [options.name]
 * @param {string} [options.mimeType]
 * @returns {Promise<{ ok: boolean, fileUrl: string|null, error: string|null }>}
 */
export async function uploadImageToStorage(blob, options = {}) {
  if (!blob || blob.size === 0) {
    return { ok: false, fileUrl: null, error: 'empty-blob' };
  }

  const { entityType = 'product', name = '', mimeType = blob.type || 'image/jpeg' } = options;
  const filename = buildStorageFilename(entityType, name, mimeType);

  try {
    const file = blob instanceof File
      ? blob
      : new File([blob], filename, { type: mimeType.split(';')[0].trim() });

    const result = await base44.integrations.Core.UploadFile({ file });

    const fileUrl = result?.file_url;
    if (!fileUrl) throw new Error('No file_url returned');

    return { ok: true, fileUrl, error: null };
  } catch (err) {
    return {
      ok:      false,
      fileUrl: null,
      error:   err instanceof Error ? err.message : 'upload-failed',
    };
  }
}
