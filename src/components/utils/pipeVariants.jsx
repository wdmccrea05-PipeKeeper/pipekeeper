// Utilities for treating interchangeable bowls as first-class "pipe variants"
// so that AI and UI can reason about them as separate pipes.

export function getPipeVariantKey(pipeId, bowlVariantId) {
  return `${pipeId || "unknown"}::${bowlVariantId || "main"}`;
}

/**
 * Canonical bowl-variant inheritance rule.
 *
 * A bowl variant is a *partial override* of its parent pipe: any field the bowl
 * does not specify is inherited from the parent. This applies to focus AND to
 * every physical scoring input (chamber geometry, material, shape, usage
 * characteristics). Previously `generatePairingsAI()` passed `[]` for a bowl
 * with no focus while `getVariantFromPipe()` inherited the parent's focus,
 * which produced different scores for the same bowl on different screens.
 *
 * All bowl-variant construction MUST go through this function.
 */
export function resolveBowlVariant(pipe, bowl, index = 0) {
  if (!pipe) return null;
  const b = bowl || {};
  const bowlVariantId = b.bowl_variant_id || `bowl_${index}`;
  const bowlName = b.name || `Bowl ${index + 1}`;
  const inherit = (key) => (b[key] ?? pipe[key] ?? null);
  const bowlFocus = Array.isArray(b.focus) && b.focus.length > 0 ? b.focus : null;

  return {
    ...pipe,
    bowl_variant_id: bowlVariantId,
    variant_key: getPipeVariantKey(pipe.id, bowlVariantId),
    variant_name: `${pipe.name} - ${bowlName}`,

    // Focus/specialization inherits from the parent when the bowl has none.
    focus: bowlFocus || (Array.isArray(pipe.focus) ? pipe.focus : []),
    specialization: inherit("specialization"),

    // Physical scoring inputs
    shape: inherit("shape"),
    bowlStyle: inherit("bowlStyle"),
    shankShape: inherit("shankShape"),
    bend: inherit("bend"),
    sizeClass: inherit("sizeClass"),
    bowl_material: inherit("bowl_material"),
    chamber_volume: inherit("chamber_volume"),
    bowl_diameter_mm: inherit("bowl_diameter_mm"),
    bowl_depth_mm: inherit("bowl_depth_mm"),
    bowl_height_mm: inherit("bowl_height_mm"),
    bowl_width_mm: inherit("bowl_width_mm"),
    bowl_outer_diameter_mm: inherit("bowl_outer_diameter_mm"),
    filter_type: inherit("filter_type"),
    usage_characteristics: inherit("usage_characteristics"),
    smoking_characteristics: inherit("smoking_characteristics"),
    dimensions_notes: inherit("dimensions_notes"),
    notes: b.notes || pipe.notes || "",

    __bowl_index: index,
    __bowl: b,
  };
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
        // Bowl variants inherit unspecified parent values (focus + geometry).
        out.push(resolveBowlVariant(p, b, i));
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
    const idx = bowls.findIndex((b, i) => (b?.bowl_variant_id || `bowl_${i}`) === bowlVariantId);
    if (idx >= 0) return resolveBowlVariant(pipe, bowls[idx], idx);

    // 2) Fallback to legacy bowl_# parsing
    const legacyIdx = parseInt(String(bowlVariantId).replace("bowl_", ""), 10);
    if (Number.isFinite(legacyIdx) && bowls[legacyIdx]) {
      return resolveBowlVariant(pipe, bowls[legacyIdx], legacyIdx);
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
