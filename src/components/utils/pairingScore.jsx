// components/utils/pairingScore.js

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function inferBlendCategory(blend) {
  const bt = String(blend?.blend_type || blend?.type || "").toLowerCase();

  // Treat English Aromatic as aromatic
  if (bt.includes("aromatic")) return "aromatic";

  // Everything else is non-aromatic by default
  return "non_aromatic";
}

export function isAromaticBlend(blend) {
  const t = (blend?.blend_type || "").toLowerCase();
  return t === "aromatic" || t === "english aromatic" || t.includes("aromatic");
}

export function normalizeFocus(focusArr) {
  const focus = (Array.isArray(focusArr) ? focusArr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  const lower = focus.map((x) => x.toLowerCase());

  // Tags that mean "mixed / don't hard-restrict"
  const isUtility = lower.some((x) =>
    ["utility", "versatile", "multi", "multiple", "any", "general"].some((k) => x.includes(k))
  );

  // Any aromatic wording counts as aromatic intent
  const aromaticOnly =
    !isUtility &&
    (lower.includes("aromatic") ||
      lower.includes("aromatics") ||
      lower.some((x) => x.includes("aromatic")));

  // Classic non-aromatic family signals
  const nonAromaticSignals = [
    "burley",
    "virginia",
    "va/per",
    "vaper",
    "virginia-perique",
    "perique",
    "english",
    "balkan",
    "latakia",
    "oriental",
  ];
  const hasNonAromaticFamily = lower.some((x) =>
    nonAromaticSignals.some((k) => x === k || x.includes(k))
  );

  // Explicit override tag
  const explicitlyNonAromatic =
    lower.includes("non-aromatic") || lower.includes("non aromatic") || lower.includes("nonaromatic");

  // Infer non-aromatic-only when not utility and not aromatic
  const nonAromaticOnly = !isUtility && !aromaticOnly && (explicitlyNonAromatic || hasNonAromaticFamily);

  // Intensity preferences (soft preference, NOT a hard filter)
  const wantsHeavyAromatics = lower.some((x) => x.includes("heavy arom"));
  const wantsLightAromatics = lower.some((x) => x.includes("light arom"));
  const wantsMediumAromatics =
    lower.some((x) => x.includes("medium arom")) ||
    (lower.some((x) => x.includes("arom")) && !wantsHeavyAromatics && !wantsLightAromatics);

  return {
    focus,
    lower,
    aromaticOnly,
    nonAromaticOnly,
    wantsHeavyAromatics,
    wantsLightAromatics,
    wantsMediumAromatics,
  };
}

/**
 * Aromatic intensity is NOT the same as nicotine strength.
 * If you have a true "aromatic_intensity" field, use it.
 * Otherwise fall back gently (never hard-zero based on this guess).
 */
export function getAromaticIntensity(blend) {
  const explicit = blend?.aromatic_intensity;
  if (explicit === "Light" || explicit === "Medium" || explicit === "Heavy") return explicit;

  // Heuristic fallback: look at flavor_notes for cues (optional)
  const notes = String(blend?.flavor_notes || "").toLowerCase();
  if (/(goopy|very sweet|strong topping|heavy topping|syrup|intense)/.test(notes)) return "Heavy";
  if (/(light topping|subtle|hint of|mild casing)/.test(notes)) return "Light";

  // LAST fallback: use strength (weak signal)
  const s = String(blend?.strength || "").toLowerCase();
  if (s.includes("full")) return "Heavy";
  if (s.includes("mild")) return "Light";
  if (s.includes("medium")) return "Medium";

  return null;
}

function countKeywordMatches(focusLower, text) {
  const t = String(text || "").toLowerCase();
  let hits = 0;
  for (const kw of focusLower) {
    if (!kw) continue;
    // ignore generic tags that would match everything
    if (["aromatic", "aromatics", "non-aromatic", "non aromatic"].includes(kw)) continue;
    if (t.includes(kw)) hits += 1;
  }
  return hits;
}

export function scorePipeBlend(pipeVariant, blend, userProfile) {
  const nf = normalizeFocus(pipeVariant?.focus);

  const blendCat = String(
    blend?.category ? blend.category : inferBlendCategory(blend)
  ).toLowerCase();

  const aromatic = blendCat === "aromatic" || isAromaticBlend(blend);

  // HARD category gating ONLY if the pipe is explicitly dedicated
  if (nf.aromaticOnly && !aromatic) return { score: 0, why: "Pipe is dedicated to aromatics." };
  if (nf.nonAromaticOnly && aromatic) return { score: 0, why: "Pipe is dedicated to non-aromatics." };

  // Base
  let score = 4;
  const reasons = [];

  // Exact name match in focus (rare but strong)
  const blendName = String(blend?.tobacco_name || blend?.name || "");
  if (nf.lower.includes(blendName.toLowerCase())) {
    return { score: 10, why: "Exact blend match to pipe focus." };
  }

  // Focus keyword matching vs blend type / notes / components
  const blendType = blend?.blend_type || "";
  const notes = blend?.flavor_notes || "";
  const comps = blend?.tobacco_components || "";

  const hits =
    countKeywordMatches(nf.lower, blendType) +
    countKeywordMatches(nf.lower, notes) +
    countKeywordMatches(nf.lower, comps);

  if (hits >= 2) {
    score += 4;
    reasons.push("Strong match to pipe focus keywords.");
  } else if (hits === 1) {
    score += 2;
    reasons.push("Partial match to pipe focus keywords.");
  }

  // Aromatic handling as a SOFT preference (never hard-zero based on intensity guess)
  if (aromatic) {
    score += 2; // aromatic generally fits most "aromatics"-leaning pipes
    const intensity = getAromaticIntensity(blend);

    if (nf.wantsHeavyAromatics) {
      if (intensity === "Heavy") score += 2;
      else if (intensity === "Medium") score += 1;
      else if (intensity === "Light") score -= 0.5;
      reasons.push("Pipe prefers heavier aromatics.");
    } else if (nf.wantsLightAromatics) {
      if (intensity === "Light") score += 2;
      else if (intensity === "Medium") score += 1;
      else if (intensity === "Heavy") score -= 0.5;
      reasons.push("Pipe prefers lighter aromatics.");
    } else if (nf.wantsMediumAromatics) {
      if (intensity === "Medium") score += 2;
      else if (intensity === "Light" || intensity === "Heavy") score += 0.5;
      reasons.push("Pipe prefers medium aromatics.");
    }
  }

  // User preferences (soft boosts)
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

  return { score, why: reasons.join(" ") || "General compatibility based on focus and blend characteristics." };
}

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

    recs.sort((a, b) => b.score - a.score);

    // Only keep top 10 recommendations to reduce storage and improve performance
    const topRecs = recs.slice(0, 10);

    return {
      pipe_id: String(pv.pipe_id),
      pipe_name: String(pv.pipe_name),
      bowl_variant_id: pv.bowl_variant_id ?? null,
      recommendations: topRecs,
    };
  });
}