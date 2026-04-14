/**
 * libraryBootstrapService.js
 *
 * One-time (or on-demand) bootstrap routine that populates the internal
 * ProductImageLibrary from two sources:
 *
 *   A. The existing TobaccoLogoLibrary entity (blends)
 *   B. Mined image URLs from existing collection records (all three types)
 *
 * Designed to be safe to run repeatedly — it uses upsertLibraryImageEntry
 * so no duplicate entries are created.
 *
 * Usage (from an admin UI or a one-time migration):
 *
 *   import { bootstrapAllImageLibraries } from '@/lib/images/libraryBootstrapService';
 *   const result = await bootstrapAllImageLibraries();
 *
 * IMPORTANT: No React hooks — plain service module.
 */

import { base44 } from '@/api/base44Client';
import { upsertLibraryImageEntry } from './imageLibraryService.js';
import { normalizeProductName } from './imageNormalization.js';
import { mineBlendImages, mineBottleImages, minePipeImages } from './userImageMiningService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isUsableUrl(url) {
  if (!url) return false;
  const s = String(url).trim().toLowerCase();
  if (!s.startsWith('http://') && !s.startsWith('https://')) return false;
  if (s.includes('placeholder') || s.includes('placehold.co')) return false;
  if (s.includes('no-image') || s.includes('noimage') || s.includes('blank.')) return false;
  return true;
}

async function upsertBatch(candidates) {
  let created = 0;
  let skipped = 0;
  for (const payload of candidates) {
    if (!isUsableUrl(payload.image_url)) { skipped++; continue; }
    const result = await upsertLibraryImageEntry(payload);
    if (result?.id) created++;
    else skipped++;
  }
  return { created, skipped };
}

// ── Blend bootstrap ───────────────────────────────────────────────────────────

/**
 * Ingest the TobaccoLogoLibrary into the internal ProductImageLibrary as
 * existing_logo_library entries, then merge mined blend images.
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function bootstrapBlendImageLibrary() {
  // Step 1: Ingest from TobaccoLogoLibrary
  let logoLibraryEntries;
  try {
    logoLibraryEntries = await base44.entities.TobaccoLogoLibrary.list('-created_date', 1000);
  } catch {
    logoLibraryEntries = [];
  }

  const logoCandidates = (Array.isArray(logoLibraryEntries) ? logoLibraryEntries : [])
    .filter((l) => isUsableUrl(l.logo_url) && l.brand_name)
    .map((l) => ({
      entity_type:     'blend',
      normalized_name: normalizeProductName(l.brand_name),
      display_name:    l.brand_name,
      brand:           l.brand_name,
      image_url:       l.logo_url,
      source_type:     'existing_logo_library',
      verified:        true,
      verified_count:  1,
      reference_only:  false,
    }));

  const logoResult = await upsertBatch(logoCandidates);

  // Step 2: Ingest from existing TobaccoBlend records
  const minedCandidates = await mineBlendImages();
  const minedResult     = await upsertBatch(minedCandidates);

  return {
    created: logoResult.created + minedResult.created,
    skipped: logoResult.skipped + minedResult.skipped,
  };
}

// ── Bottle bootstrap ──────────────────────────────────────────────────────────

/**
 * Mine existing Bottle records with saved images and promote them into
 * the internal ProductImageLibrary.
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function bootstrapBottleImageLibrary() {
  const candidates = await mineBottleImages();
  return upsertBatch(candidates);
}

// ── Pipe bootstrap ────────────────────────────────────────────────────────────

/**
 * Mine existing Pipe records with saved images and promote them into
 * the internal ProductImageLibrary (reference_only = true).
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function bootstrapPipeImageLibrary() {
  const candidates = await minePipeImages();
  return upsertBatch(candidates);
}

// ── Full bootstrap ────────────────────────────────────────────────────────────

/**
 * Run all three bootstrap routines in sequence.
 *
 * Safe to run multiple times — upsert semantics prevent duplicates.
 *
 * @returns {Promise<{
 *   blend:  { created: number, skipped: number },
 *   bottle: { created: number, skipped: number },
 *   pipe:   { created: number, skipped: number },
 *   total:  { created: number, skipped: number },
 * }>}
 */
export async function bootstrapAllImageLibraries() {
  const [blendResult, bottleResult, pipeResult] = await Promise.all([
    bootstrapBlendImageLibrary(),
    bootstrapBottleImageLibrary(),
    bootstrapPipeImageLibrary(),
  ]);

  return {
    blend:  blendResult,
    bottle: bottleResult,
    pipe:   pipeResult,
    total: {
      created: blendResult.created + bottleResult.created + pipeResult.created,
      skipped: blendResult.skipped + bottleResult.skipped + pipeResult.skipped,
    },
  };
}
