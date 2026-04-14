/**
 * blendLogoLibraryService.js
 *
 * Searches the existing TobaccoLogoLibrary entity for blend label/tin images.
 *
 * This is the PRIMARY image source for tobacco blends — it must be checked
 * before any other strategy (internal library or external search).
 *
 * The TobaccoLogoLibrary entity has these fields:
 *   brand_name  — manufacturer / brand
 *   logo_url    — stable internal image URL
 *
 * Return shape matches the LibraryMatchResult interface used by imageLibraryMatcher.
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { base44 } from '@/api/base44Client';
import { normalizeProductName, tokenSimilarity, isExactNormalized } from './imageNormalization.js';

// ── Cache ─────────────────────────────────────────────────────────────────────

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getLogoLibrary() {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;
  try {
    const all = await base44.entities.TobaccoLogoLibrary.list('-created_date', 1000);
    _cache = Array.isArray(all) ? all : [];
    _cacheTs = now;
    return _cache;
  } catch {
    return [];
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreLogoMatch({ manufacturer, blendName }, logo) {
  const brandNorm = normalizeProductName(logo.brand_name || '');
  const mfgNorm   = normalizeProductName(manufacturer || '');
  const nameNorm  = normalizeProductName(blendName || '');

  let score = 0;

  // Manufacturer exact match → strong signal
  if (mfgNorm && isExactNormalized(mfgNorm, brandNorm)) {
    score += 55;
  } else if (mfgNorm && brandNorm) {
    score += Math.round(tokenSimilarity(mfgNorm, brandNorm) * 30);
  }

  // Blend name included in brand_name field (some entries store "Brand - BlendName")
  if (nameNorm && brandNorm && brandNorm.includes(nameNorm)) {
    score += 25;
  } else if (nameNorm && brandNorm) {
    score += Math.round(tokenSimilarity(nameNorm, brandNorm) * 15);
  }

  return score;
}

function confidenceLabel(score) {
  if (score >= 80) return 'Exact Match';
  if (score >= 55) return 'High Confidence';
  if (score >= 30) return 'Medium Confidence';
  return 'Reference';
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Search the TobaccoLogoLibrary for blend label/tin images.
 *
 * Priority order:
 *   1. Exact manufacturer + blend name match
 *   2. Exact normalized manufacturer match
 *   3. Alias / partial match
 *   4. Fuzzy similarity fallback
 *
 * @param {Object} params
 * @param {string} [params.manufacturer]  — blend manufacturer / brand
 * @param {string} [params.blendName]     — specific blend name
 * @param {number} [params.limit]         — max results (default 6)
 * @returns {Promise<Array>}              — LibraryMatchResult shape
 */
export async function searchBlendLogoLibrary({ manufacturer, blendName, limit = 6 } = {}) {
  if (!manufacturer && !blendName) return [];

  const library = await getLogoLibrary();
  if (library.length === 0) return [];

  const scored = library
    .filter((l) => l.logo_url && l.brand_name)
    .map((l) => ({
      ...l,
      _score: scoreLogoMatch({ manufacturer, blendName }, l),
    }))
    .filter((l) => l._score > 10)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  return scored.map((l) => ({
    id:              l.id,
    entityType:      'blend',
    displayName:     l.brand_name,
    imageUrl:        l.logo_url,
    sourceType:      'existing_logo_library',
    verifiedCount:   1,
    referenceOnly:   false,
    confidenceLabel: confidenceLabel(l._score),
    confidenceScore: l._score,
    isExactMatch:    l._score >= 80,
    sourceLabel:     'Label Library',
    isInternalMatch: true,
    libraryImageId:  null,  // TobaccoLogoLibrary entries aren't in ProductImageLibrary
  }));
}

/**
 * Invalidate the in-memory logo library cache (e.g. after adding new logos).
 */
export function invalidateLogoLibraryCache() {
  _cache   = null;
  _cacheTs = 0;
}
