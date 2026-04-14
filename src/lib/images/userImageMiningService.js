/**
 * userImageMiningService.js
 *
 * Scans existing collection records (TobaccoBlend, Bottle, Pipe) for
 * saved image URLs and returns them as ProductImageLibrary candidates.
 *
 * The bootstrap service uses these candidates to populate the internal
 * library the first time (or on-demand refresh).
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { base44 } from '@/api/base44Client';
import {
  normalizeProductName,
  normalizeBottleKey,
  normalizeBlendKey,
  normalizePipeKey,
} from './imageNormalization.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isUsableUrl(url) {
  if (!url) return false;
  const s = String(url).trim().toLowerCase();
  if (!s.startsWith('http://') && !s.startsWith('https://')) return false;
  if (s.includes('placeholder') || s.includes('placehold.co')) return false;
  if (s.includes('no-image') || s.includes('noimage')) return false;
  if (s.includes('blank.') || s.includes('default.')) return false;
  return true;
}

function dedupe(candidates) {
  const seen = new Set();
  return candidates.filter((c) => {
    const key = `${c.entity_type}::${c.normalized_name}::${c.image_url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Blend mining ──────────────────────────────────────────────────────────────

/**
 * Mine TobaccoBlend records that have a saved logo image.
 *
 * @returns {Promise<Object[]>}  — array of library candidate payloads
 */
export async function mineBlendImages() {
  let blends;
  try {
    blends = await base44.entities.TobaccoBlend.list('-created_date', 500);
  } catch {
    return [];
  }

  const candidates = [];
  for (const blend of Array.isArray(blends) ? blends : []) {
    const url = blend.logo;
    if (!isUsableUrl(url)) continue;

    const normalizedName = normalizeBlendKey({
      brand: blend.manufacturer,
      name:  blend.name,
    });

    if (!normalizedName) continue;

    candidates.push({
      entity_type:      'blend',
      normalized_name:  normalizedName,
      display_name:     [blend.manufacturer, blend.name].filter(Boolean).join(' — '),
      brand:            blend.manufacturer || null,
      image_url:        url,
      source_type:      'mined_record_image',
      source_record_id: blend.id,
      verified:         false,
      verified_count:   0,
      reference_only:   false,
    });
  }

  return dedupe(candidates);
}

// ── Bottle mining ─────────────────────────────────────────────────────────────

/**
 * Mine Bottle records that have a saved photo image.
 *
 * @returns {Promise<Object[]>}
 */
export async function mineBottleImages() {
  let bottles;
  try {
    bottles = await base44.entities.Bottle.list('-created_date', 500);
  } catch {
    return [];
  }

  const candidates = [];
  for (const bottle of Array.isArray(bottles) ? bottles : []) {
    const url = bottle.photo;
    if (!isUsableUrl(url)) continue;

    const normalizedName = normalizeBottleKey({
      brand: bottle.distillery,
      name:  bottle.name,
    });

    if (!normalizedName) continue;

    candidates.push({
      entity_type:      'bottle',
      normalized_name:  normalizedName,
      display_name:     [bottle.distillery, bottle.name].filter(Boolean).join(' — '),
      brand:            bottle.distillery || null,
      image_url:        url,
      source_type:      'mined_record_image',
      source_record_id: bottle.id,
      verified:         false,
      verified_count:   0,
      reference_only:   false,
    });
  }

  return dedupe(candidates);
}

// ── Pipe mining ───────────────────────────────────────────────────────────────

/**
 * Mine Pipe records that have a saved photo.
 * Pipe images default to reference_only = true (personal pipes are not reusable).
 *
 * @returns {Promise<Object[]>}
 */
export async function minePipeImages() {
  let pipes;
  try {
    pipes = await base44.entities.Pipe.list('-created_date', 500);
  } catch {
    return [];
  }

  const candidates = [];
  for (const pipe of Array.isArray(pipes) ? pipes : []) {
    // Pipe photos is an array; use the first non-empty URL
    const url = Array.isArray(pipe.photos)
      ? pipe.photos.find(isUsableUrl)
      : isUsableUrl(pipe.photo) ? pipe.photo : null;

    if (!url) continue;

    const normalizedName = normalizePipeKey({
      maker: pipe.maker,
      name:  pipe.name,
      shape: pipe.shape,
    });

    if (!normalizedName) continue;

    candidates.push({
      entity_type:      'pipe',
      normalized_name:  normalizedName,
      display_name:     [pipe.maker, pipe.name, pipe.shape].filter(Boolean).join(' '),
      maker:            pipe.maker || null,
      shape:            pipe.shape || null,
      image_url:        url,
      source_type:      'mined_record_image',
      source_record_id: pipe.id,
      verified:         false,
      verified_count:   0,
      reference_only:   true,  // Pipe images are personal by default
    });
  }

  return dedupe(candidates);
}
