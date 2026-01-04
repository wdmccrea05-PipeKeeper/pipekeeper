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

function pickUpdated(x) {
  // Only use date portion to avoid false staleness from time-of-day changes
  const timestamp = x?.updated_timestamp ?? x?.updated_date ?? x?.updated_at ?? x?.modified_date;
  if (!timestamp) return null;
  // Convert to date-only string to ignore time component
  return new Date(timestamp).toISOString().split('T')[0];
}

export function buildArtifactFingerprint({ pipes = [], blends = [], profile = null }) {
  const payload = {
    pipes: pipes.map(p => ({
      id: p.id,
      u: pickUpdated(p),
      focus: p.focus || [],
      dims: {
        length_mm: p.length_mm ?? null,
        bowl_diameter_mm: p.bowl_diameter_mm ?? null,
        bowl_depth_mm: p.bowl_depth_mm ?? null,
        chamber_volume: p.chamber_volume ?? null,
      },
    })),
    blends: blends.map(b => ({
      id: b.id,
      u: pickUpdated(b),
      blend_type: b.blend_type ?? null,
      strength: b.strength ?? null,
    })),
    profile: profile
      ? {
          id: profile.id ?? null,
          u: pickUpdated(profile),
          prefs: {
            preferred_blend_types: profile.preferred_blend_types || [],
            preferred_shapes: profile.preferred_shapes || [],
            strength_preference: profile.strength_preference || null,
            pipe_size_preference: profile.pipe_size_preference || null,
            clenching_preference: profile.clenching_preference || null,
            smoke_duration_preference: profile.smoke_duration_preference || null,
            notes: profile.notes || null,
          },
        }
      : null,
  };

  return hashString(stableStringify(payload));
}