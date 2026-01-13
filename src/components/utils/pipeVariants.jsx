// Utilities for treating interchangeable bowls as first-class "pipe variants"
// so that AI and UI can reason about them as separate pipes.

export function getPipeVariantKey(pipeId, bowlVariantId) {
  return `${pipeId || "unknown"}::${bowlVariantId || "main"}`;
}

export function expandPipesToVariants(pipes = [], { includeMainWhenBowls = false } = {}) {
  const out = [];

  (pipes || []).forEach((p) => {
    const bowls = Array.isArray(p?.interchangeable_bowls) ? p.interchangeable_bowls : [];
    const hasBowls = bowls.length > 0;

    if (hasBowls) {
      if (includeMainWhenBowls) {
        out.push({
          ...p,
          bowl_variant_id: null,
          variant_key: getPipeVariantKey(p.id, null),
          variant_name: p.name,
          // variant-focus resolves in getVariantFromPipe
        });
      }

      bowls.forEach((b, i) => {
        const bowl_variant_id = b?.bowl_variant_id || `bowl_${i}`;
        const bowlName = b?.name || `Bowl ${i + 1}`;

        out.push({
          ...p,
          // promote bowl as a "variant" overlay
          bowl_variant_id,
          variant_key: getPipeVariantKey(p.id, bowl_variant_id),
          variant_name: `${p.name} - ${bowlName}`,
          __bowl_index: i,
          __bowl: b,
        });
      });

      return;
    }

    // No bowls — single main variant
    out.push({
      ...p,
      bowl_variant_id: null,
      variant_key: getPipeVariantKey(p.id, null),
      variant_name: p.name,
    });
  });

  return out;
}

// Returns a normalized "variant view" of a pipe, resolving bowl-specific overrides first
export function getVariantFromPipe(pipe, bowlVariantId) {
  if (!pipe) return null;

  const bowls = Array.isArray(pipe.interchangeable_bowls) ? pipe.interchangeable_bowls : [];

  if (bowlVariantId) {
    // 1) Prefer explicit id match first (supports UUIDs / stable ids)
    const direct = bowls.find((b, i) => (b?.bowl_variant_id || `bowl_${i}`) === bowlVariantId);
    if (direct) {
      const idx = bowls.indexOf(direct);
      return {
        ...pipe,
        bowl_variant_id: bowlVariantId,
        variant_key: getPipeVariantKey(pipe.id, bowlVariantId),
        variant_name: `${pipe.name} - ${direct.name || "Bowl"}`,
        focus: Array.isArray(direct.focus) ? direct.focus : (Array.isArray(pipe.focus) ? pipe.focus : []),

        chamber_volume: direct.chamber_volume ?? pipe.chamber_volume,
        bowl_diameter_mm: direct.bowl_diameter_mm ?? pipe.bowl_diameter_mm,
        bowl_depth_mm: direct.bowl_depth_mm ?? pipe.bowl_depth_mm,
        bowl_height_mm: direct.bowl_height_mm ?? pipe.bowl_height_mm,
        bowl_outer_diameter_mm: direct.bowl_outer_diameter_mm ?? pipe.bowl_outer_diameter_mm,

        bowl_material: direct.bowl_material ?? pipe.bowl_material,
        specialization: direct.specialization ?? pipe.specialization,
        dimensions_notes: direct.dimensions_notes ?? pipe.dimensions_notes,

        __bowl_index: idx,
        __bowl: direct,
      };
    }

    // 2) Fallback to legacy bowl_# parsing
    const idx = parseInt(String(bowlVariantId).replace("bowl_", ""), 10);
    const bowl = Number.isFinite(idx) ? bowls[idx] : null;

    if (bowl) {
      return {
        ...pipe,
        bowl_variant_id: bowlVariantId,
        variant_key: getPipeVariantKey(pipe.id, bowlVariantId),
        variant_name: `${pipe.name} - ${bowl.name || `Bowl ${idx + 1}`}`,
        focus: Array.isArray(bowl.focus) ? bowl.focus : (Array.isArray(pipe.focus) ? pipe.focus : []),

        chamber_volume: bowl.chamber_volume ?? pipe.chamber_volume,
        bowl_diameter_mm: bowl.bowl_diameter_mm ?? pipe.bowl_diameter_mm,
        bowl_depth_mm: bowl.bowl_depth_mm ?? pipe.bowl_depth_mm,
        bowl_height_mm: bowl.bowl_height_mm ?? pipe.bowl_height_mm,
        bowl_outer_diameter_mm: bowl.bowl_outer_diameter_mm ?? pipe.bowl_outer_diameter_mm,

        bowl_material: bowl.bowl_material ?? pipe.bowl_material,
        specialization: bowl.specialization ?? pipe.specialization,
        dimensions_notes: bowl.dimensions_notes ?? pipe.dimensions_notes,

        __bowl_index: idx,
        __bowl: bowl,
      };
    }
  }

  // Base pipe (no bowl variant)
  return {
    ...pipe,
    bowl_variant_id: null,
    variant_key: getPipeVariantKey(pipe.id, null),
    variant_name: pipe.name,
    focus: Array.isArray(pipe.focus) ? pipe.focus : [],
  };
}