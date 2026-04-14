/**
 * imageRecordLinkService.js
 *
 * Manages the RecordImageLink entity — the mapping between collection records
 * and the images assigned to them.
 *
 * When a user uploads or selects an image for a record, this service:
 *  1. Creates / updates the RecordImageLink entry
 *  2. Optionally increments the verified count on the library entry
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { base44 } from '@/api/base44Client';
import { markLibraryImageVerified } from './imageLibraryService.js';

// ── Link record to image ──────────────────────────────────────────────────────

/**
 * Create or update the RecordImageLink for a given collection record.
 *
 * Also increments the verified_count on the linked library entry when the
 * user explicitly chose the image (verifiedByUser = true).
 *
 * Failures are non-fatal — the calling flow should not block on this.
 *
 * @param {Object} params
 * @param {'bottle'|'blend'|'pipe'} params.recordType
 * @param {string}  params.recordId
 * @param {string}  params.imageUrl
 * @param {string}  [params.imageSourceType]    — default 'user_upload'
 * @param {string}  [params.libraryImageId]     — ID of ProductImageLibrary entry
 * @param {boolean} [params.verifiedByUser]     — default true
 * @returns {Promise<Object|null>}
 */
export async function linkImageToRecord({
  recordType,
  recordId,
  imageUrl,
  imageSourceType = 'user_upload',
  libraryImageId  = null,
  verifiedByUser  = true,
} = {}) {
  if (!recordType || !recordId || !imageUrl) return null;

  // Build the payload
  const payload = {
    record_type:       recordType,
    record_id:         recordId,
    image_url:         imageUrl,
    image_source_type: imageSourceType,
    verified_by_user:  verifiedByUser,
  };
  if (libraryImageId) payload.library_image_id = libraryImageId;

  try {
    // Check for an existing link for this record
    const existing = await base44.entities.RecordImageLink.filter({
      record_type: recordType,
      record_id:   recordId,
    });

    let link;
    if (Array.isArray(existing) && existing.length > 0) {
      link = await base44.entities.RecordImageLink.update(existing[0].id, payload);
    } else {
      link = await base44.entities.RecordImageLink.create(payload);
    }

    // Increment library verified count when user confirmed from library
    if (libraryImageId && verifiedByUser) {
      markLibraryImageVerified(libraryImageId).catch(() => {});
    }

    return link;
  } catch {
    return null;
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get the current image link for a record, if any.
 *
 * @param {'bottle'|'blend'|'pipe'} recordType
 * @param {string} recordId
 * @returns {Promise<Object|null>}
 */
export async function getRecordImageLink(recordType, recordId) {
  if (!recordType || !recordId) return null;
  try {
    const results = await base44.entities.RecordImageLink.filter({
      record_type: recordType,
      record_id:   recordId,
    });
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}
