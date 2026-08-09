export function stableStringify(obj) {
  const keys = [];
  JSON.stringify(obj, (k, v) => (keys.push(k), v));
  keys.sort();
  return JSON.stringify(obj, keys);
}

// Fast non-crypto hash (fine for staleness)
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Full-precision update timestamp.
 *
 * Previously this truncated to `YYYY-MM-DD`, which meant two edits on the same
 * calendar day produced an identical fingerprint and the PairingMatrix cache
 * was never invalidated. Scoring inputs are also fingerprinted directly below,
 * so an edit is detected even when the backend does not bump the timestamp.
 */
function pickUpdated(x) {
  const timestamp = x?.updated_timestamp ?? x?.updated_date ?? x?.updated_at ?? x?.modified_date;
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return String(timestamp);
  return parsed.toISOString();
}

function normList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function normText(value) {
  const s = String(value ?? "").trim().toLowerCase();
  return s || null;
}

function normNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normBool(value) {
  return typeof value === "boolean" ? value : null;
}

/**
 * Fingerprint every field the canonical scorer actually reads from a pipe or
 * a bowl variant. Anything the scorer uses must appear here, otherwise a user
 * edit could silently leave a stale cached matrix in place.
 */
function pipeGeometryFingerprint(x) {
  return {
    focus: normList(x?.focus),
    shape: normText(x?.shape),
    bowlStyle: normText(x?.bowlStyle),
    bend: normText(x?.bend),
    sizeClass: normText(x?.sizeClass),
    bowl_material: normText(x?.bowl_material),
    chamber_volume: normText(x?.chamber_volume),
    bowl_diameter_mm: normNumber(x?.bowl_diameter_mm),
    bowl_depth_mm: normNumber(x?.bowl_depth_mm),
    bowl_height_mm: normNumber(x?.bowl_height_mm),
    bowl_width_mm: normNumber(x?.bowl_width_mm),
    bowl_outer_diameter_mm: normNumber(x?.bowl_outer_diameter_mm),
    filter_type: normText(x?.filter_type),
    usage_characteristics: normText(x?.usage_characteristics),
    smoking_characteristics: normText(x?.smoking_characteristics),
  };
}

export function fingerprintPipe(p) {
  return {
    id: p?.id ?? null,
    u: pickUpdated(p),
    ai_excluded: normBool(p?.ai_excluded),
    collector_only: normBool(p?.collector_only),
    ...pipeGeometryFingerprint(p),
    // Every interchangeable bowl is an independently scorable variant.
    bowls: (Array.isArray(p?.interchangeable_bowls) ? p.interchangeable_bowls : []).map((b, i) => ({
      bowl_variant_id: String(b?.bowl_variant_id || `bowl_${i}`),
      name: normText(b?.name),
      ...pipeGeometryFingerprint(b),
    })),
  };
}

export function fingerprintBlend(b) {
  return {
    id: b?.id ?? null,
    u: pickUpdated(b),
    ai_excluded: normBool(b?.ai_excluded),
    collector_only: normBool(b?.collector_only),
    blend_type: normText(b?.blend_type),
    blend_family: normText(b?.blend_family),
    tobacco_components: normList(b?.tobacco_components),
    is_aromatic: normBool(b?.is_aromatic),
    aromatic_intensity: normText(b?.aromatic_intensity),
    casing: normText(b?.casing),
    topping: normText(b?.topping),
    cut: normText(b?.cut),
    // NOTE: nicotine `strength` is deliberately KEPT here even though it does
    // not influence the *technical* score. It feeds `personalFit` (matched
    // against the profile's `strength_preference`), which is 20% of the final
    // score — so a strength edit CAN move the number a user sees, and dropping
    // it would reintroduce exactly the staleness bug this rewrite fixes.
    // What strength must never do is imply aromatic intensity; that separation
    // is enforced in pairingScoreCanonical.jsx, not here.
    strength: normText(b?.strength),
    room_note: normText(b?.room_note),
    // Hashed: flavor note lists can be long and are only used as a signal.
    flavor_notes: hashString(stableStringify(normList(b?.flavor_notes))),
    flavor_profile: hashString(stableStringify(normText(b?.flavor_profile) || "")),
  };
}

export function fingerprintProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.id ?? null,
    u: pickUpdated(profile),
    prefs: {
      preferred_blend_types: normList(profile.preferred_blend_types),
      preferred_shapes: normList(profile.preferred_shapes),
      preferred_flavors: normList(profile.preferred_flavors),
      disliked_flavors: normList(profile.disliked_flavors),
      strength_preference: normText(profile.strength_preference),
      pipe_size_preference: normText(profile.pipe_size_preference),
      clenching_preference: normText(profile.clenching_preference),
      smoke_duration_preference: normText(profile.smoke_duration_preference),
      room_note_preference: normText(profile.room_note_preference),
      experience_level: normText(profile.experience_level),
      notes: normText(profile.notes),
    },
  };
}

/**
 * Fingerprint of everything the pairing scorer consumes.
 *
 * Bumping SCORER_VERSION forces every cached PairingMatrix to be regenerated —
 * do that whenever the scoring model itself changes, not just its inputs.
 */
export const SCORER_VERSION = "3-taxonomy-final";

export function buildArtifactFingerprint({ pipes = [], blends = [], profile = null }) {
  const payload = {
    v: SCORER_VERSION,
    pipes: (pipes || []).map(fingerprintPipe),
    blends: (blends || []).map(fingerprintBlend),
    profile: fingerprintProfile(profile),
  };

  return hashString(stableStringify(payload));
}
