/**
 * PairingMatrix vs. live scoring — responsibilities
 * =================================================
 *
 * PipeKeeper has two ways of producing a pipe↔tobacco compatibility score.
 * They are NOT interchangeable and must never be confused:
 *
 * 1. LIVE SCORING — `scorePipeBlend(pipe, blend, userProfile)` from
 *    `@/components/utils/pairingScoreCanonical`.
 *
 *    This is the *source of truth*. It is deterministic, synchronous, and
 *    produces a full component breakdown for ANY pipe/blend pair. Every screen
 *    that needs a score for a specific pair MUST be able to compute it live.
 *
 * 2. PAIRING MATRIX — the `PairingMatrix` entity.
 *
 *    This is a *cache of the top-N recommendations per pipe variant*, produced
 *    by `regeneratePairingsConsistent()`. It exists purely so that dashboards
 *    can render "best blends for each pipe" without recomputing the whole
 *    cartesian product, and so that AI-authored reasoning text can be reused.
 *
 * RULES
 * -----
 *
 * R1. Absence from the PairingMatrix means "not in the cached top-N", NEVER
 *     "incompatible" and NEVER "score 0". If a caller needs the score for a
 *     pair that is not in the matrix, it MUST fall back to live scoring via
 *     `resolvePairingScore()` below.
 *
 * R2. The matrix is only valid while `input_fingerprint` matches the current
 *     fingerprint of the scoring inputs. See `buildArtifactFingerprint()` in
 *     `@/components/utils/fingerprint` — it fingerprints the ACTUAL scoring
 *     inputs (focus, chamber geometry, material, cut, is_aromatic, …), not
 *     just record update metadata, so any edit that can move a score
 *     invalidates the cache.
 *
 * R3. Matrix retrieval is centralised in `getCurrentPairingMatrix()` below.
 *     Components must not run their own `PairingMatrix.filter(...)` queries,
 *     because the active/latest fallback behaviour used to differ per screen.
 *
 * R4. Every entry point must hand the scorer the COMPLETE pipe record (or a
 *     bowl variant resolved with `getVariantFromPipe()`), not a stripped
 *     `{ focus, pipe_id, pipe_name }` object. The scorer reads chamber
 *     geometry, material, shape and usage characteristics; stripping them
 *     silently degrades every physical dimension to "unknown".
 */

import { base44 } from "@/api/base44Client";
import { scorePipeBlend } from "@/components/utils/pairingScoreCanonical";
import { findPairing, getBlendScore } from "@/components/utils/pairingsLookup";

export const PAIRING_MATRIX_QUERY_KEY = "activePairings";

/**
 * Single, standardised way to read the current PairingMatrix for a user.
 * Returns the active matrix, else the most recent matrix, else null.
 *
 * @param {string} userEmail
 * @param {object} [client] - base44 client override (tests / server contexts)
 * @returns {Promise<object|null>}
 */
export async function getCurrentPairingMatrix(userEmail, client = base44) {
  if (!userEmail) return null;
  const entity = client?.entities?.PairingMatrix;
  if (!entity?.filter) return null;

  try {
    const active = await entity.filter(
      { created_by: userEmail, is_active: true },
      "-created_date",
      1
    );
    if (active?.[0]) return active[0];
  } catch {
    // fall through to latest lookup
  }

  try {
    const latest = await entity.filter({ created_by: userEmail }, "-created_date", 1);
    return latest?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * React Query options for the shared matrix query. Using one key everywhere
 * keeps invalidation after regeneration consistent across screens.
 */
export function pairingMatrixQueryOptions(userEmail, client = base44) {
  return {
    queryKey: [PAIRING_MATRIX_QUERY_KEY, userEmail],
    queryFn: () => getCurrentPairingMatrix(userEmail, client),
    enabled: !!userEmail,
  };
}

/**
 * Resolve a score for one pipe/blend pair, honouring R1.
 *
 * The cached matrix is consulted only for its human-authored reasoning text and
 * to keep dashboard numbers stable; the canonical live score always wins when
 * the pair is missing from the cache.
 *
 * @returns {{ score: number, why: string, confidence: number, source: "matrix"|"live" }}
 */
export function resolvePairingScore({
  pipe,
  blend,
  userProfile = null,
  matrix = null,
  bowlVariantId = null,
  preferCache = false,
}) {
  const live = scorePipeBlend(pipe, blend, userProfile);

  if (preferCache && matrix) {
    const pairing = findPairing(matrix, pipe?.id ?? pipe?.pipe_id, bowlVariantId, pipe?.name);
    const cached = getBlendScore(pairing, blend?.id ?? blend?.tobacco_id);
    // A missing entry means "not in cached top-N" — never zero. Fall through.
    if (cached != null) {
      return {
        ...live,
        score: cached,
        why: live.why,
        source: "matrix",
      };
    }
  }

  return { ...live, source: "live" };
}
