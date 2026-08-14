/**
 * Pipe Club pairing logic — thin wrapper around the canonical pairing engine.
 *
 * This module NEVER implements its own scoring algorithm.
 * All compatibility scores come exclusively from rankPipesForBlend().
 */
import { rankPipesForBlend } from "@/components/utils/pairingScoreCanonical";

/**
 * Score threshold below which a pipe is labelled "Best Available"
 * rather than "Best Choice". Mirrors the domain expectation that a
 * score below 6 indicates meaningful compatibility issues.
 */
const BEST_AVAILABLE_THRESHOLD = 6;

/**
 * Run the canonical scorer constrained to only the pipes/bowls that are
 * physically present at the meeting.
 *
 * @param {object[]} presentPipes   - Pipe records selected by the user as present
 * @param {object}   blend          - TobaccoBlend record or temp tobacco snapshot
 * @param {object|null} userProfile - UserProfile record (may be null)
 * @returns {{ best: object|null, alternative: object|null }}
 */
export function rankPresentPipes(presentPipes, blend, userProfile) {
  if (!presentPipes || presentPipes.length === 0) {
    return { best: null, alternative: null };
  }

  const blendForScorer = {
    ...blend,
    tobacco_name: blend?.name ?? blend?.tobacco_name ?? blend?.proposed_blend_name,
    tobacco_id: blend?.id ?? blend?.tobacco_id,
  };

  // Request top 2 so we always have a best + alternative.
  const ranked = rankPipesForBlend(presentPipes, blendForScorer, userProfile, {
    includeMainWhenBowls: true,
    collapseToParent: true,
    limit: presentPipes.length, // score ALL present pipes; slice after
  }).filter((m) => m.score >= 0);

  const best = ranked[0] ?? null;
  const alternative = ranked[1] ?? null;

  return { best, alternative };
}

/**
 * Determine whether a ranked result should display as "Best Available"
 * rather than "Best Choice".
 *
 * @param {object} result - entry from rankPipesForBlend
 * @returns {boolean}
 */
export function isBestAvailable(result) {
  if (!result) return false;
  return (result.score ?? 0) < BEST_AVAILABLE_THRESHOLD;
}

/**
 * Map canonical scorer confidence (0–1 float) to a display tier.
 * Uses the confidenceDetails object if available, otherwise falls back
 * to the raw confidence number.
 *
 * @param {object} result - entry from rankPipesForBlend
 * @returns {"high"|"medium"|"low"}
 */
export function getConfidenceTier(result) {
  if (!result) return "low";
  const raw = result.confidence ?? 0;
  if (raw >= 0.65) return "high";
  if (raw >= 0.35) return "medium";
  return "low";
}

/**
 * Parse the pipes_present JSON field from a saved PipeClubSession.
 *
 * @param {string|null} json
 * @returns {object[]}
 */
export function parsePipesPresent(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Serialize the pipes-present selection for storage.
 *
 * @param {object[]} pipes - selected Pipe records (with optional selectedBowlVariantId)
 * @returns {string}  JSON
 */
export function serializePipesPresent(pipes) {
  const items = pipes.map((p) => ({
    pipe_id: p.id,
    pipe_name: p.name,
    maker: p.maker ?? null,
    bowl_variant_id: p.selectedBowlVariantId ?? null,
    bowl_name: p.selectedBowlName ?? null,
  }));
  return JSON.stringify(items);
}

/**
 * Parse the temp_tobacco_snapshot JSON field from a saved PipeClubSession.
 *
 * @param {string|null} json
 * @returns {object|null}
 */
export function parseTempTobaccoSnapshot(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Serialize the blends array for storage in the PipeClubSession.blends field.
 * Each blend entry contains: source, blend_id, name, manufacturer, temp_snapshot,
 * and optionally a recommendation object.
 *
 * @param {Array} blends - array of blend entry objects
 * @returns {string} JSON
 */
export function serializeBlends(blends) {
  if (!Array.isArray(blends) || blends.length === 0) return JSON.stringify([]);
  const items = blends.map((b, index) => ({
    index,
    blend_id: b.blendId ?? null,
    blend_name: b.name ?? '',
    manufacturer: b.manufacturer ?? '',
    source: b.source ?? 'new',
    temp_snapshot: b.tempBlend ?? null,
    recommendation: b.recommendation ?? null,
  }));
  return JSON.stringify(items);
}

/**
 * Parse the blends JSON field from a saved PipeClubSession.
 * Returns an array of blend entry objects, or [] if not present.
 * Falls back to legacy single-blend fields when blends is null/empty.
 *
 * @param {string|null} json
 * @param {object|null} session - the full session record for legacy fallback
 * @returns {Array}
 */
export function parseBlends(json, session = null) {
  if (json) {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to legacy
    }
  }
  // Legacy fallback: reconstruct from single-blend fields
  if (session && session.proposed_blend_name) {
    return [{
      index: 0,
      blend_id: session.proposed_blend_id ?? null,
      blend_name: session.proposed_blend_name,
      manufacturer: session.proposed_blend_manufacturer ?? '',
      source: session.proposed_blend_source ?? 'new',
      temp_snapshot: parseTempTobaccoSnapshot(session.temp_tobacco_snapshot),
      recommendation: null,
    }];
  }
  return [];
}