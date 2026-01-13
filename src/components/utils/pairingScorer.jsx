const NON_ARO_KEYWORDS = new Set([
  "english", "balkan", "latakia", "virginia", "vaper", "va/per",
  "burley", "oriental", "turkish", "perique", "lakeland"
]);

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function focusSet(focusArr) {
  return new Set((focusArr || []).map(norm).filter(Boolean));
}

function inferCategoryFromFocus(focusArr) {
  const f = focusSet(focusArr);
  const hasAro = f.has("aromatic") || f.has("aromatics") || [...f].some(x => x.includes("aromatic"));
  const hasNonAroSignal =
    [...f].some(x => NON_ARO_KEYWORDS.has(x) || [...NON_ARO_KEYWORDS].some(k => x.includes(k)));

  // If explicitly Aromatic and not explicitly signaling non-aromatic families, treat as Aromatic-focused
  if (hasAro && !hasNonAroSignal) return "AROMATIC";

  // If signaling non-aromatic families and NOT explicitly aromatic, treat as Non-Aromatic focused
  if (hasNonAroSignal && !hasAro) return "NON_AROMATIC";

  // Mixed/unspecified
  if (hasAro && hasNonAroSignal) return "MIXED";
  return "UNSPECIFIED";
}

function aromaticIntensity(blend) {
  // Your current heuristic: tie intensity to strength for aromatics
  // Adjust anytime later.
  const s = norm(blend.strength);
  if (s === "mild" || s === "mild-medium") return "light";
  if (s === "medium" || s === "medium-full") return "medium";
  if (s === "full") return "heavy";
  return null;
}

function inferIntensityRule(focusArr) {
  const f = [...focusSet(focusArr)].join(" ");
  if (f.includes("heavy aromatics") || f.includes("heavy")) return "heavy";
  if (f.includes("light aromatics") || f.includes("light")) return "light";
  // "Medium Aromatics" or generic "Aromatics"
  if (f.includes("medium aromatics") || (f.includes("aromatic") && !f.includes("light") && !f.includes("heavy"))) {
    return "medium";
  }
  return null;
}

export function scoreBlendForPipe({ pipeFocus, blend, profile }) {
  const focusArr = Array.isArray(pipeFocus) ? pipeFocus : [];
  const category = inferCategoryFromFocus(focusArr);
  const blendCat = norm(blend.category); // "aromatic" / "non_aromatic"
  const isAro = blendCat === "aromatic";

  // STEP 1: category filtering (but with inferred category)
  if (category === "AROMATIC" && !isAro) return { score: 0, reasoning: "Filtered: Aromatic-only focus." };
  if (category === "NON_AROMATIC" && isAro) return { score: 0, reasoning: "Filtered: Non-aromatic focus." };

  // STEP 2: aromatic intensity filtering (prefer match, don't hard-filter)
  let intensityBonus = 0;
  if (isAro) {
    const rule = inferIntensityRule(focusArr); // heavy/light/medium/null
    const intensity = aromaticIntensity(blend); // light/medium/heavy/null

    if (rule && intensity) {
      if (rule === intensity) {
        intensityBonus = 3; // Boost for matching intensity
      } else {
        intensityBonus = -2; // Penalty for mismatched intensity (but don't zero out)
      }
    }
  }

  // STEP 3: exact name match
  const focus = focusSet(focusArr);
  const name = norm(blend.tobacco_name || blend.name);
  let base = null;
  if (focus.has(name)) base = 10;

  // STEP 4: blend_type keyword match
  if (base == null) {
    const bt = norm(blend.blend_type);
    const matches = [...focus].filter(k => k && bt && bt.includes(k)).length;
    if (matches >= 1) base = 9;
  }

  // STEP 4b: check if focus contains "aromatics" or "aromatic" and blend is aromatic
  if (base == null && isAro) {
    if (focus.has("aromatics") || focus.has("aromatic") || [...focus].some(f => f.includes("aromatic"))) {
      base = 8; // Good match for aromatic-focused pipe
    }
  }

  // STEP 5: user preferences
  let score = base == null ? 4 : base;
  const pref = profile?.preferred_blend_types || [];
  if (pref.includes(blend.blend_type)) score += 2;
  if (profile?.strength_preference && blend.strength === profile.strength_preference) score += 1;

  // STEP 6: apply intensity bonus/penalty
  score += intensityBonus;

  // Clamp 0..10
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    reasoning: `Category=${category}, base=${base ?? 4}${maxCap ? `, capped=${maxCap}` : ""}`
  };
}

export function generatePairingsDeterministic({ pipesData, blendsData, profile }) {
  return pipesData.map((pipe) => {
    const recs = blendsData.map((b) => {
      const { score, reasoning } = scoreBlendForPipe({
        pipeFocus: pipe.focus,
        blend: b,
        profile
      });
      return {
        tobacco_id: String(b.tobacco_id),
        tobacco_name: b.tobacco_name,
        score,
        reasoning
      };
    });

    recs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return {
      pipe_id: String(pipe.pipe_id),
      pipe_name: pipe.pipe_name,
      bowl_variant_id: pipe.bowl_variant_id ?? null,
      recommendations: recs
    };
  });
}