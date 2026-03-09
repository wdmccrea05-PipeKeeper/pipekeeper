/**
 * CANONICAL pairing scorer - Single source of truth for all pairing calculations
 * Used by: PairingMatrix, PairingGrid, MatchingEngine, AIGenerators
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Recognized aromatic category focus keywords
const AROMATIC_FOCUS_KEYWORDS = ["aromatic", "aromatics"];

// Recognized non-aromatic blend-type category focus keywords
const NON_AROMATIC_FOCUS_KEYWORDS = [
  "english", "virginia", "burley", "balkan", "latakia",
  "oriental", "turkish", "virginia/perique", "virginia/burley", "navy flake",
  "dark fired", "cavendish", "perique", "american", "burley-based",
];

// All recognized category keywords (used for category-gating logic)
const CATEGORY_KEYWORDS = [...AROMATIC_FOCUS_KEYWORDS, ...NON_AROMATIC_FOCUS_KEYWORDS];

/**
 * CANONICAL blend category inference
 */
export function inferBlendCategory(blend) {
  const bt = String(blend?.blend_type || blend?.type || "").toLowerCase();
  
  // ANY blend_type containing "aromatic" is aromatic
  if (bt.includes("aromatic")) return "aromatic";
  
  // Everything else is non-aromatic
  return "non_aromatic";
}

export function isAromaticBlend(blend) {
  return inferBlendCategory(blend) === "aromatic";
}

/**
 * CANONICAL aromatic intensity inference
 * Priority: explicit field > flavor notes heuristic > strength fallback
 */
export function getAromaticIntensity(blend) {
  // 1. Check explicit field first
  const explicit = blend?.aromatic_intensity;
  if (explicit === "light" || explicit === "Light") return "light";
  if (explicit === "medium" || explicit === "Medium") return "medium";
  if (explicit === "heavy" || explicit === "Heavy") return "heavy";
  
  // 2. Heuristic from flavor notes
  const notes = String(blend?.flavor_notes || "").toLowerCase();
  if (/(goopy|very sweet|strong topping|heavy topping|syrup|intense)/.test(notes)) return "heavy";
  if (/(light topping|subtle|hint of|mild casing)/.test(notes)) return "light";
  
  // 3. Fallback to strength (weak signal but better than nothing)
  const s = String(blend?.strength || "").toLowerCase();
  if (s.includes("full")) return "heavy";
  if (s.includes("mild")) return "light";
  if (s.includes("medium")) return "medium";
  
  return null;
}

/**
 * Normalize focus array into searchable tokens
 */
export function normalizeFocus(focusArr) {
  const focus = (Array.isArray(focusArr) ? focusArr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const lower = focus.map((x) => x.toLowerCase());

  // Utility/versatile tags mean no hard restrictions
  const isUtility = lower.some((x) =>
    ["utility", "versatile", "multi", "multiple", "any", "general"].some((k) => x.includes(k))
  );

  // Intensity preferences (soft, not hard filters)
  const wantsHeavyAromatics = lower.some((x) => x.includes("heavy arom"));
  const wantsLightAromatics = lower.some((x) => x.includes("light arom"));
  const wantsMediumAromatics =
    lower.some((x) => x.includes("medium arom")) ||
    (lower.some((x) => x.includes("arom")) && !wantsHeavyAromatics && !wantsLightAromatics);

  // True when ALL focus items are pure aromatic category keywords
  const allAromaticCategory =
    lower.length > 0 &&
    lower.every((x) => AROMATIC_FOCUS_KEYWORDS.includes(x));

  // True when ALL focus items are pure non-aromatic blend-type keywords
  const allNonAromaticCategory =
    lower.length > 0 &&
    lower.every((x) => NON_AROMATIC_FOCUS_KEYWORDS.some((k) => x === k || x === k + "s"));

  // Dedicated/Only flags: explicit language OR fully-categorical focus array
  const aromaticOnly =
    !isUtility &&
    (lower.some((x) =>
      /(aromatic(s)?\s*only|aromatic[-\s]*dedicated|dedicated\s*to\s*aromatic)/.test(x)
    ) || allAromaticCategory);

  const nonAromaticOnly =
    !isUtility &&
    (lower.some((x) =>
      /(non[-\s]?aromatic(s)?\s*only|non[-\s]?aromatic[-\s]*dedicated|dedicated\s*to\s*non)/.test(x)
    ) || allNonAromaticCategory);

  return {
    focus,
    lower,
    isUtility,
    aromaticOnly,
    nonAromaticOnly,
    wantsHeavyAromatics,
    wantsLightAromatics,
    wantsMediumAromatics,
  };
}

/**
 * Count keyword matches between focus and text
 */
function countKeywordMatches(focusLower, text) {
  const t = String(text || "").toLowerCase();
  let hits = 0;
  
  for (const kw of focusLower) {
    if (!kw) continue;
    // Ignore generic category tags
    if (["aromatic", "aromatics", "non-aromatic", "non aromatic"].includes(kw)) continue;
    if (t.includes(kw)) hits += 1;
  }
  
  return hits;
}

/**
 * CANONICAL scoring function for pipe-blend compatibility
 * Returns { score: 0-10, why: string }
 */
export function scorePipeBlend(pipeVariant, blend, userProfile) {
  const nf = normalizeFocus(pipeVariant?.focus);
  const aromatic = isAromaticBlend(blend);

  // ── EXACT BLEND NAME MATCH must be checked BEFORE any category gating ──
  // A pipe focused on "Cowboy Coffee" should always score 10 for Cowboy Coffee,
  // regardless of what other focus items it has.
  const blendName = String(blend?.tobacco_name || blend?.name || "").toLowerCase();
  if (blendName && nf.lower.some((f) => f === blendName)) {
    return { score: 10, why: "Exact blend match to pipe focus." };
  }

  // ── Detect if focus contains specific blend names (not just categories) ──
  // Only apply category gating based on focus items that ARE recognized category keywords
  const categoryFocusItems = nf.lower.filter((f) =>
    CATEGORY_KEYWORDS.some((k) => f === k || f === k + "s" || f.startsWith(k + " ") || f.endsWith(" " + k))
  );

  // HARD category gating ONLY if pipe is explicitly dedicated
  if (nf.aromaticOnly && !aromatic) {
    return { score: 0, why: "Pipe is dedicated to aromatics only." };
  }
  if (nf.nonAromaticOnly && aromatic) {
    return { score: 0, why: "Pipe is dedicated to non-aromatics only." };
  }

  // Soft category gating: only apply if the focus contains category-type keywords
  const pipeHasAromaticFocus = nf.wantsHeavyAromatics || nf.wantsLightAromatics || nf.wantsMediumAromatics ||
    categoryFocusItems.some((x) => x === "aromatic" || x === "aromatics");

  const pipeHasNonAromaticFocus = !nf.isUtility &&
    categoryFocusItems.some((x) =>
      ["english", "virginia", "burley", "balkan", "latakia", "oriental", "virginia/perique", "virginia/burley", "navy flake", "dark fired"].some((k) => x.includes(k))
    ) && !pipeHasAromaticFocus;

  if (pipeHasAromaticFocus && !aromatic) {
    return { score: 2, why: "Pipe is focused on aromatics; non-aromatic blends are a poor fit." };
  }
  if (pipeHasNonAromaticFocus && aromatic) {
    return { score: 2, why: "Pipe is focused on non-aromatic blends; aromatics are a poor fit." };
  }

  // Base score
  let score = 4;
  const reasons = [];

  // Focus keyword matching vs blend attributes
  const blendType = blend?.blend_type || "";
  const notes = (Array.isArray(blend?.flavor_notes) ? blend.flavor_notes.join(" ") : blend?.flavor_notes) || "";
  const comps = (Array.isArray(blend?.tobacco_components) ? blend.tobacco_components.join(" ") : blend?.tobacco_components) || "";

  // Direct blend type match to any focus item (strong signal)
  const blendTypeLower = String(blendType).toLowerCase();
  const blendTypeMatchCount = nf.lower.filter((f) => {
    const fClean = f.replace(/[^\w\-\/]/g, ""); // normalize punctuation
    const btClean = blendTypeLower.replace(/[^\w\-\/]/g, "");
    return fClean === btClean;
  }).length;

  let hits =
    countKeywordMatches(nf.lower, blendType) +
    countKeywordMatches(nf.lower, notes) +
    countKeywordMatches(nf.lower, comps);

  // If blend type directly matches a focus item, boost score significantly
  if (blendTypeMatchCount > 0) {
    score += 5;
    reasons.push("Blend type matches pipe focus.");
  } else if (hits >= 2) {
    score += 4;
    reasons.push("Strong match to pipe focus keywords.");
  } else if (hits === 1) {
    score += 2;
    reasons.push("Partial match to pipe focus keywords.");
  }

  // Aromatic intensity soft preference (never hard-zero)
  if (aromatic) {
    score += 2;
    const intensity = getAromaticIntensity(blend);

    if (nf.wantsHeavyAromatics) {
      if (intensity === "heavy") score += 2;
      else if (intensity === "medium") score += 1;
      else if (intensity === "light") score -= 0.5;
      reasons.push("Pipe prefers heavier aromatics.");
    } else if (nf.wantsLightAromatics) {
      if (intensity === "light") score += 2;
      else if (intensity === "medium") score += 1;
      else if (intensity === "heavy") score -= 0.5;
      reasons.push("Pipe prefers lighter aromatics.");
    } else if (nf.wantsMediumAromatics) {
      if (intensity === "medium") score += 2;
      else if (intensity === "light" || intensity === "heavy") score += 0.5;
      reasons.push("Pipe prefers medium aromatics.");
    }
  }

  // User preference boosts (soft)
  const prefs = userProfile || {};
  const prefTypes = Array.isArray(prefs.preferred_blend_types) ? prefs.preferred_blend_types : [];
  const strengthPref = prefs.strength_preference || null;

  if (prefTypes.some((t) => String(t).toLowerCase() === String(blendType).toLowerCase())) {
    score += 1.5;
    reasons.push("Matches your preferred blend types.");
  }
  if (strengthPref && String(strengthPref).toLowerCase() === String(blend?.strength || "").toLowerCase()) {
    score += 0.5;
    reasons.push("Matches your preferred strength.");
  }

  score = clamp(score, 0, 10);

  return { 
    score, 
    why: reasons.join(" ") || "General compatibility based on focus and blend characteristics." 
  };
}

/**
 * Build pairings for all pipe variants
 * Returns array of { pipe_id, pipe_name, bowl_variant_id, recommendations[] }
 */
export function buildPairingsForPipes(pipeVariants, blends, userProfile) {
  return (pipeVariants || []).map((pv) => {
    const recs = (blends || []).map((b) => {
      const { score, why } = scorePipeBlend(pv, b, userProfile);
      return {
        tobacco_id: String(b.tobacco_id ?? b.id),
        tobacco_name: String(b.tobacco_name ?? b.name),
        score,
        reasoning: why,
      };
    });

    // Sort by score descending
    recs.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Keep only top 10 to reduce storage
    const topRecs = recs.slice(0, 10);

    return {
      pipe_id: String(pv.pipe_id),
      pipe_name: String(pv.pipe_name),
      bowl_variant_id: pv.bowl_variant_id ?? null,
      recommendations: topRecs,
    };
  });
}