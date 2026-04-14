/**
 * imageUploadService.js
 *
 * User-facing image upload service.
 *
 * Responsibilities:
 *  1. Validate file type and size
 *  2. Upload to app-controlled storage (via Core.UploadFile)
 *  3. Return a stable internal URL + storage metadata
 *
 * This wraps productImageStorage.uploadImageToStorage and adds validation
 * so callers do not need to implement their own guards.
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { uploadImageToStorage } from './productImageStorage.js';

// ── Configuration ─────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate an image File/Blob before upload.
 *
 * @param {File|Blob} file
 * @returns {{ ok: boolean, error: string|null }}
 */
export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'No file provided' };

  const mimeType = file.type ? file.type.split(';')[0].trim().toLowerCase() : '';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: `File type "${mimeType || 'unknown'}" is not supported. Please upload a JPEG, PNG, WebP, or GIF.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      error: `File is too large (${mb} MB). Maximum allowed size is 20 MB.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' };
  }

  return { ok: true, error: null };
}

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Validate and upload a user-provided image file to app-controlled storage.
 *
 * @param {File|Blob} file
 * @param {Object} [options]
 * @param {'bottle'|'blend'|'pipe'} [options.entityType]
 * @param {string}  [options.name]         — product name hint for filename
 * @returns {Promise<{
 *   ok:         boolean,
 *   fileUrl:    string | null,   — stable internal URL
 *   mimeType:   string | null,
 *   error:      string | null,
 * }>}
 */
export async function uploadUserPhoto(file, options = {}) {
  // Step 1: Validate
  const validation = validateImageFile(file);
  if (!validation.ok) {
    return { ok: false, fileUrl: null, mimeType: null, error: validation.error };
  }

  const mimeType = file.type ? file.type.split(';')[0].trim().toLowerCase() : 'image/jpeg';

  // Step 2: Upload via shared storage module
  const result = await uploadImageToStorage(file, {
    entityType: options.entityType || 'product',
    name:       options.name || '',
    mimeType,
  });

  if (!result.ok || !result.fileUrl) {
    return {
      ok:      false,
      fileUrl: null,
      mimeType: null,
      error:   result.error || 'Upload failed. Please try again.',
    };
  }

  return {
    ok:      true,
    fileUrl: result.fileUrl,
    mimeType,
    error:   null,
  };
}
