/**
 * imageLibraryService.js
 *
 * CRUD layer for the ProductImageLibrary entity.
 *
 * Provides create, read, search, and moderation operations for the internal
 * reusable image library. All results are plain objects — no React state.
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { base44 } from '@/api/base44Client';
import { normalizeProductName, isExactNormalized, tokenSimilarity } from './imageNormalization.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeList(records) {
  return Array.isArray(records) ? records : [];
}

function isActiveRecord(r) {
  return !r.status || r.status === 'active';
}

// ── Read / search ─────────────────────────────────────────────────────────────

/**
 * Fetch all active ProductImageLibrary entries for a given entity type,
 * then filter and rank by name/brand match.
 *
 * @param {Object} params
 * @param {'bottle'|'blend'|'pipe'} params.entityType
 * @param {string} [params.normalizedName]  — already-normalized lookup key
 * @param {string} [params.brand]           — brand / manufacturer
 * @param {string} [params.maker]           — pipe maker
 * @param {string} [params.shape]           — pipe shape
 * @param {number} [params.limit]           — max results (default 10)
 * @returns {Promise<Object[]>}
 */
export async function findLibraryMatches({
  entityType,
  normalizedName = '',
  brand = '',
  maker = '',
  shape = '',
  limit = 10,
} = {}) {
  if (!entityType) return [];

  let records;
  try {
    records = await base44.entities.ProductImageLibrary.filter({
      entity_type: entityType,
      status: 'active',
    });
  } catch {
    return [];
  }

  const active = safeList(records).filter(isActiveRecord);
  if (active.length === 0) return [];

  const normQuery = normalizeProductName(normalizedName);
  const normBrand = normalizeProductName(brand || maker);

  // Score each candidate
  const scored = active.map((r) => {
    const rNorm  = normalizeProductName(r.normalized_name || r.display_name || '');
    const rBrand = normalizeProductName(r.brand || r.maker || '');

    let score = 0;

    // Exact name match
    if (normQuery && isExactNormalized(normQuery, rNorm)) {
      score += 60;
    } else if (normQuery) {
      const sim = tokenSimilarity(normQuery, rNorm);
      score += Math.round(sim * 35);
    }

    // Brand / maker match bonus
    if (normBrand && rBrand) {
      if (isExactNormalized(normBrand, rBrand)) score += 25;
      else score += Math.round(tokenSimilarity(normBrand, rBrand) * 15);
    }

    // Shape match for pipes
    if (shape && r.shape) {
      if (isExactNormalized(shape, r.shape)) score += 10;
    }

    // Verified boost
    score += Math.min(10, (r.verified_count || 0) * 2);
    if (r.verified) score += 5;

    return { ...r, _score: score };
  });

  return scored
    .filter((r) => r._score > 5)
    .sort((a, b) => b._score - a._score || (b.verified_count || 0) - (a.verified_count || 0))
    .slice(0, limit);
}

/**
 * Fetch a single library entry by ID.
 *
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getLibraryImageById(id) {
  if (!id) return null;
  try {
    return await base44.entities.ProductImageLibrary.get(id);
  } catch {
    return null;
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a new ProductImageLibrary entry.
 *
 * Silently returns null on error so the calling flow can continue without
 * blocking the user.
 *
 * @param {Object} payload
 * @param {'bottle'|'blend'|'pipe'} payload.entity_type
 * @param {string} payload.normalized_name
 * @param {string} payload.display_name
 * @param {string} payload.image_url
 * @param {string} [payload.brand]
 * @param {string} [payload.maker]
 * @param {string} [payload.shape]
 * @param {string} [payload.source_type]
 * @param {string} [payload.source_record_id]
 * @param {string} [payload.source_user_id]
 * @param {boolean} [payload.reference_only]
 * @param {boolean} [payload.verified]
 * @returns {Promise<Object|null>}
 */
export async function createLibraryImageEntry(payload) {
  if (!payload?.entity_type || !payload?.normalized_name || !payload?.image_url) return null;

  const entry = {
    entity_type:      payload.entity_type,
    normalized_name:  normalizeProductName(payload.normalized_name),
    display_name:     payload.display_name || payload.normalized_name,
    image_url:        payload.image_url,
    source_type:      payload.source_type || 'user_upload',
    verified:         payload.verified ?? false,
    verified_count:   payload.verified ? 1 : 0,
    reference_only:   payload.reference_only ?? false,
    status:           'active',
  };

  if (payload.brand)            entry.brand            = payload.brand;
  if (payload.maker)            entry.maker            = payload.maker;
  if (payload.shape)            entry.shape            = payload.shape;
  if (payload.storage_path)     entry.storage_path     = payload.storage_path;
  if (payload.source_record_id) entry.source_record_id = payload.source_record_id;
  if (payload.source_user_id)   entry.source_user_id   = payload.source_user_id;

  try {
    return await base44.entities.ProductImageLibrary.create(entry);
  } catch {
    return null;
  }
}

// ── Update / moderation ───────────────────────────────────────────────────────

/**
 * Increment the verified_count for a library entry and mark it verified.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function markLibraryImageVerified(id) {
  if (!id) return false;
  try {
    const existing = await base44.entities.ProductImageLibrary.get(id);
    if (!existing) return false;

    await base44.entities.ProductImageLibrary.update(id, {
      verified:       true,
      verified_count: (existing.verified_count || 0) + 1,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update the moderation status of a library entry.
 *
 * @param {string} id
 * @param {'active'|'hidden'|'rejected'} status
 * @returns {Promise<boolean>}
 */
export async function updateLibraryImageStatus(id, status) {
  if (!id || !status) return false;
  try {
    await base44.entities.ProductImageLibrary.update(id, { status });
    return true;
  } catch {
    return false;
  }
}

// ── Upsert helper (used by bootstrap + promotion flow) ────────────────────────

/**
 * Create a library entry only if no existing active entry already has the
 * same entity_type + normalized_name + image_url combination.
 *
 * Returns the existing entry if a match is found, otherwise the new one.
 *
 * @param {Object} payload  — same shape as createLibraryImageEntry
 * @returns {Promise<Object|null>}
 */
export async function upsertLibraryImageEntry(payload) {
  if (!payload?.entity_type || !payload?.normalized_name || !payload?.image_url) return null;

  const normName = normalizeProductName(payload.normalized_name);

  let existing;
  try {
    existing = await base44.entities.ProductImageLibrary.filter({
      entity_type:     payload.entity_type,
      normalized_name: normName,
      image_url:       payload.image_url,
    });
  } catch {
    existing = [];
  }

  if (Array.isArray(existing) && existing.length > 0) {
    return existing[0];
  }

  return createLibraryImageEntry({ ...payload, normalized_name: normName });
}
