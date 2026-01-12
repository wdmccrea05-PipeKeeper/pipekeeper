import { base44 } from "@/api/base44Client";

// === Hard Rules Enforcement ===

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function classifyBlend(blendType) {
  const t = norm(blendType);
  if (!t) return "UNKNOWN";
  if (t.includes("aromatic")) return "AROMATIC";
  return "NON_AROMATIC";
}

// Decide pipe "mode" from focus list based on actual taxonomy
function classifyPipeMode(focusArr) {
  const f = (Array.isArray(focusArr) ? focusArr : []).map(norm);

  const hasAromatic =
    f.some((x) => x === "aromatic" || x.includes("aromatic")) ||
    f.some((x) => x.includes("english aromatic"));

  const hasNonAromatic =
    f.some((x) => x === "non-aromatic" || x === "non aromatic" || x.includes("non-aromatic")) ||
    f.some((x) => ["english", "balkan", "latakia", "virginia", "va/per", "vaper", "perique", "burley", "oriental"].includes(x));

  // If user explicitly sets Aromatic, treat as Aromatic-only
  if (hasAromatic && !hasNonAromatic) return "AROMATIC_ONLY";

  // If user explicitly sets Non-Aromatic OR any classic non-aromatic focus tags, treat as Non-Aromatic-only
  if (hasNonAromatic && !hasAromatic) return "NON_AROMATIC_ONLY";

  // If both appear, treat as mixed (no category filtering)
  if (hasAromatic && hasNonAromatic) return "MIXED";

  // If nothing conclusive, don't filter
  return "MIXED";
}

function parseAromaticIntensityFromFocus(focusArr) {
  const f = (Array.isArray(focusArr) ? focusArr : []).map(norm);

  // Explicit intensity
  if (f.some((x) => x.includes("heavy aromat") || x === "heavy")) return "HEAVY";
  if (f.some((x) => x.includes("light aromat") || x === "light")) return "LIGHT";

  // If they use generic "Aromatics", interpret as medium preference (but don't hard-zero)
  if (f.some((x) => x === "aromatics" || x.includes("aromatic"))) return "MEDIUM";

  return null;
}

function clampScore(n, min = 0, max = 10) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function deriveFocusCategory(focus) {
  const f = (focus || []).map(x => norm(x));
  
  // Explicit aromatic signals
  const aroSignals = ["aromatic", "aromatics", "light aromatics", "medium aromatics", "heavy aromatics", "english aromatic"];
  const hasAro = aroSignals.some(s => f.some(fx => fx === s || fx.includes(s)));
  
  // Classic non-aromatic signals
  const nonAroSignals = ["english", "balkan", "latakia", "virginia", "va/per", "vaper", "perique", "burley", "oriental", "kentucky"];
  const hasNonAro = nonAroSignals.some(s => f.includes(s));
  
  // If explicit aromatic and no non-aromatic: AROMATIC_ONLY
  if (hasAro && !hasNonAro) return "AROMATIC_ONLY";
  
  // If non-aromatic signals exist (with or without generic aromatic): NON_AROMATIC_ONLY
  if (hasNonAro) return "NON_AROMATIC_ONLY";
  
  // If aromatic but no hard signals: still aromatic
  if (hasAro) return "AROMATIC_ONLY";
  
  // Default: no restriction
  return "MIXED";
}

export async function generatePairingsAI({ pipes, blends, profile }) {
  // Expand pipes to include bowl variants as separate entries
  // IMPORTANT: Use pipe_id / pipe_name in the input so the LLM can echo them back correctly.
  const pipesData = [];
  for (const p of pipes || []) {
    const pid = String(p.id);

    if (Array.isArray(p.interchangeable_bowls) && p.interchangeable_bowls.length > 0) {
      p.interchangeable_bowls.forEach((bowl, idx) => {
        const bowlId = bowl?.bowl_variant_id || `bowl_${idx}`;
        pipesData.push({
          pipe_id: pid,
          pipe_name: `${p.name} - ${bowl.name || `Bowl ${idx + 1}`}`,
          bowl_variant_id: bowlId,

          maker: p.maker || null,
          shape: bowl.shape || p.shape || null,

          bowl_material: bowl.bowl_material ?? p.bowl_material ?? null,
          chamber_volume: bowl.chamber_volume ?? p.chamber_volume ?? null,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? p.bowl_diameter_mm ?? null,
          bowl_depth_mm: bowl.bowl_depth_mm ?? p.bowl_depth_mm ?? null,
          bowl_height_mm: bowl.bowl_height_mm ?? null,
          bowl_width_mm: bowl.bowl_width_mm ?? null,

          focus: Array.isArray(bowl.focus) ? bowl.focus : [],
          notes: bowl.notes || "",
        });
      });
    } else {
      pipesData.push({
        pipe_id: pid,
        pipe_name: p.name,
        bowl_variant_id: null,

        maker: p.maker || null,
        shape: p.shape || null,

        bowl_material: p.bowl_material ?? null,
        chamber_volume: p.chamber_volume ?? null,
        bowl_diameter_mm: p.bowl_diameter_mm ?? null,
        bowl_depth_mm: p.bowl_depth_mm ?? null,

        focus: Array.isArray(p.focus) ? p.focus : [],
        notes: p.notes || "",
      });
    }
  }

  const blendsData = (blends || []).map((b) => {
    const isAromatic = b.blend_type === "Aromatic" || b.blend_type === "English Aromatic";
    
    // Determine aromatic intensity: Light, Medium, Heavy
    let aromaticIntensity = null;
    if (isAromatic) {
      if (b.strength === "Mild" || b.strength === "Mild-Medium") {
        aromaticIntensity = "Light";
      } else if (b.strength === "Medium" || b.strength === "Medium-Full") {
        aromaticIntensity = "Medium";
      } else if (b.strength === "Full") {
        aromaticIntensity = "Heavy";
      }
    }
    
    return {
      tobacco_id: String(b.id),
      tobacco_name: b.name,
      manufacturer: b.manufacturer || null,
      blend_type: b.blend_type || null,
      strength: b.strength || null,
      cut: b.cut || null,
      flavor_notes: b.flavor_notes || null,
      tobacco_components: b.tobacco_components || null,
      category: isAromatic ? "AROMATIC" : "NON_AROMATIC",
      aromatic_intensity: aromaticIntensity,
    };
  });

  let profileContext = "";
  if (profile) {
    profileContext = `

User Smoking Preferences:
- Clenching: ${profile.clenching_preference}
- Smoke Duration: ${profile.smoke_duration_preference}
- Preferred Blend Types: ${profile.preferred_blend_types?.join(", ") || "None"}
- Pipe Size Preference: ${profile.pipe_size_preference}
- Strength Preference: ${profile.strength_preference}
- Additional Notes: ${profile.notes || "None"}

Weight these preferences heavily when scoring pairings.`;
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert pipe tobacco sommelier. Create a pairing list for each pipe/bowl configuration.

CRITICAL CONSTRAINTS:
1) You MUST ONLY recommend tobaccos from the user's collection list below.
2) You MUST return EXACTLY the same pipe_id, pipe_name, and bowl_variant_id values shown in the PIPES list.
3) Return ONE pairing object PER pipe entry (so total pairings === number of pipe entries).

PIPES (each entry is a distinct pipe variant):
${JSON.stringify(pipesData.map(p => ({ ...p, focus_category: deriveFocusCategory(p.focus) })), null, 2)}

TOBACCOS (ONLY choose from this list):
${JSON.stringify(blendsData, null, 2)}${profileContext}

SCORING ALGORITHM (APPLY IN THIS EXACT ORDER):

STEP 1: CATEGORY FILTERING
If pipe.focus_category == "AROMATIC_ONLY":
  - Set all NON_AROMATIC blends score to 0 immediately.
  - Only score AROMATIC blends.
Else if pipe.focus_category == "NON_AROMATIC_ONLY":
  - Set all AROMATIC blends score to 0 immediately.
  - Only score NON_AROMATIC blends.
Else (MIXED):
  - All blends eligible for scoring.

STEP 2: AROMATIC INTENSITY FILTERING (for AROMATIC blends only, if focus specifies intensity)
If pipe.focus contains "Heavy Aromatics":
  - For aromatic_intensity == "Heavy": continue to Step 3.
  - For aromatic_intensity == "Light" or "Medium": force score to 0.
Else if pipe.focus contains "Light Aromatics":
  - For aromatic_intensity == "Light": continue to Step 3.
  - For aromatic_intensity == "Medium" or "Heavy": force score to 0.
Else if pipe.focus contains "Medium Aromatics":
  - For aromatic_intensity == "Medium": continue to Step 3 with base score 8–9.
  - For aromatic_intensity == "Light": continue to Step 3 with max score 5.
  - For aromatic_intensity == "Heavy": continue to Step 3 with max score 5.
Else (no explicit intensity):
  - All aromatic intensities eligible (no intensity restriction).

STEP 3: EXACT NAME MATCH
For each blend, check if tobacco_name exactly matches any focus keyword:
  - If exact match found: base_score = 10.
  - Else: continue to Step 4.

STEP 4: BLEND_TYPE KEYWORD MATCH
For each blend, count how many blend_type keywords are in focus:
  - 0 keywords: no bonus (continue to Step 5).
  - 1 keyword match: base_score = 9.
  - 2+ keyword matches: base_score = 9.

STEP 5: USER PREFERENCES
Apply adjustments:
  - If blend_type in user.preferred_blend_types: add 2.
  - If blend.strength == user.strength_preference: add 1.

STEP 6: FINAL BASE SCORE (if no focus/preference match so far)
  - If base_score not yet set: base_score = 4.

STEP 7: APPLY INTENSITY CAPS (from Step 2)
If STEP 2 set a max score (e.g., max 5), cap final score at that value.

STEP 8: SORT
Sort ALL recommendations by score descending. Display top 3 recommendations.

CRITICAL: DO NOT skip any steps. Apply each step mechanically and in order.

OUTPUT:
Return JSON { "pairings": [...] } where each pairing has:
- pipe_id (string)
- pipe_name (string)
- bowl_variant_id (string|null)
- recommendations: ARRAY of ALL tobaccos with:
    - tobacco_id (string)
    - tobacco_name (string)
    - score (number)
    - reasoning (string)
`,
    response_json_schema: {
      type: "object",
      required: ["pairings"],
      properties: {
        pairings: {
          type: "array",
          items: {
            type: "object",
            required: ["pipe_id", "pipe_name", "bowl_variant_id", "recommendations"],
            properties: {
              pipe_id: { type: "string" },
              pipe_name: { type: "string" },
              bowl_variant_id: { type: ["string", "null"] },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  required: ["tobacco_id", "tobacco_name", "score", "reasoning"],
                  properties: {
                    tobacco_id: { type: "string" },
                    tobacco_name: { type: "string" },
                    score: { type: "number" },
                    reasoning: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const rawPairings = result?.pairings || [];

  // Hard guard: if LLM returns nothing, don't silently "succeed"
  if (!rawPairings.length) {
    throw new Error("LLM returned no pairings. (Schema mismatch or oversized response.)");
  }

  // Clamp scores deterministically based on pipe focus
  const pairings = rawPairings.map((p) => {
    // Find the corresponding pipe entry we sent to the model (so we use the same focus)
    const pipeEntry =
      pipesData.find((x) =>
        String(x.pipe_id) === String(p.pipe_id) &&
        String(x.bowl_variant_id ?? "") === String(p.bowl_variant_id ?? "")
      ) || null;

    const pipeFocus = pipeEntry?.focus || [];
    const mode = classifyPipeMode(pipeFocus);
    const intensityPref = parseAromaticIntensityFromFocus(pipeFocus);

    const recs = (p.recommendations || []).map((r) => {
      const blend = blendsData.find((b) => String(b.tobacco_id) === String(r.tobacco_id));
      const blendClass = classifyBlend(blend?.blend_type);
      const intensity = norm(blend?.aromatic_intensity);

      let score = clampScore(r.score, 0, 10);

      // HARD category gating
      if (mode === "AROMATIC_ONLY" && blendClass !== "AROMATIC") score = 0;
      if (mode === "NON_AROMATIC_ONLY" && blendClass === "AROMATIC") score = 0;

      // Optional intensity gating for aromatic blends only
      if (blendClass === "AROMATIC" && score > 0 && intensityPref) {
        if (intensityPref === "HEAVY" && intensity !== "heavy") score = 0;
        if (intensityPref === "LIGHT" && intensity !== "light") score = 0;

        // MEDIUM preference = allow all but cap light/heavy
        if (intensityPref === "MEDIUM") {
          if (intensity === "medium") score = Math.min(score, 9);
          if (intensity === "light" || intensity === "heavy") score = Math.min(score, 5);
        }
      }

      return {
        ...r,
        score,
        reasoning:
          score === 0
            ? `${r.reasoning || ""} (Filtered by focus rules)`
            : r.reasoning || "",
      };
    });

    // Always sort after clamping so Top 3 is truly correct
    recs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return {
      ...p,
      pipe_id: String(p.pipe_id),
      bowl_variant_id: p.bowl_variant_id ?? null,
      recommendations: recs,
      focus: pipeFocus,
    };
  });

  return { pairings };
}

export async function generateOptimizationAI({ pipes, blends, profile, whatIfText }) {
  // Expand pipes to include bowl variants as separate entries
  const pipesData = [];
  for (const p of pipes || []) {
    const pid = String(p.id);

    if (Array.isArray(p.interchangeable_bowls) && p.interchangeable_bowls.length > 0) {
      p.interchangeable_bowls.forEach((bowl, idx) => {
        pipesData.push({
          pipe_id: pid,
          pipe_name: `${p.name} - ${bowl.name || `Bowl ${idx + 1}`}`,
          bowl_variant_id: bowl.bowl_variant_id || `bowl_${idx}`,

          maker: p.maker,
          shape: bowl.shape || p.shape,

          bowl_material: bowl.bowl_material ?? p.bowl_material,
          chamber_volume: bowl.chamber_volume ?? p.chamber_volume,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? p.bowl_diameter_mm,
          bowl_depth_mm: bowl.bowl_depth_mm ?? p.bowl_depth_mm,
          bowl_height_mm: bowl.bowl_height_mm ?? null,
          bowl_width_mm: bowl.bowl_width_mm ?? null,

          focus: Array.isArray(bowl.focus) ? bowl.focus : [],
          notes: bowl.notes || "",
        });
      });
    } else {
      pipesData.push({
        pipe_id: pid,
        pipe_name: p.name,
        bowl_variant_id: null,

        maker: p.maker,
        shape: p.shape,

        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,

        focus: Array.isArray(p.focus) ? p.focus : [],
        notes: p.notes || "",
      });
    }
  }

  const blendsData = (blends || []).map((b) => ({
    id: b.id,
    name: b.name,
    manufacturer: b.manufacturer,
    blend_type: b.blend_type,
    strength: b.strength,
    cut: b.cut,
  }));

  const profileContext = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        preferred_shapes: profile.preferred_shapes || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Analyze the user's pipe and tobacco collection. Provide optimization recommendations.

  Rules:
  - Each entry represents a different bowl configuration (bowl_variant_id identifies interchangeable bowls)
  - When multiple bowls exist on a pipe, treat each bowl INDIVIDUALLY with its own focus and characteristics
  - Recommend specialization updates (bowl focus changes) only when justified
  - Provide "applyable_changes" as a list: { pipe_id, bowl_variant_id, before_focus, after_focus, rationale }
  - Include "collection_gaps" and "next_additions" suggestions
  - If what-if is advice-only, give advice and keep applyable_changes empty

  CRITICAL: When bowl_variant_id is present, the focus change applies to THAT SPECIFIC BOWL, not the entire pipe.

  WHAT_IF:
  ${whatIfText ? whatIfText : ""}

  PIPES:
  ${JSON.stringify(pipesData, null, 2)}

  BLENDS:
  ${JSON.stringify(blendsData, null, 2)}

  USER_PREFERENCES:
  ${JSON.stringify(profileContext, null, 2)}

  Return JSON:
  {
  summary: string,
  applyable_changes: [{ pipe_id, bowl_variant_id, before_focus: string[], after_focus: string[], rationale: string }],
  collection_gaps: string[],
  next_additions: string[],
  notes: string
  }`,
    response_json_schema: {
      type: "object",
      required: ["applyable_changes", "summary"],
      properties: {
        summary: { type: "string" },
        applyable_changes: {
          type: "array",
          items: {
            type: "object",
            required: ["pipe_id", "before_focus", "after_focus", "rationale"],
            properties: {
              pipe_id: { type: "string" },
              bowl_variant_id: { type: ["string", "null"] },
              before_focus: { type: "array", items: { type: "string" } },
              after_focus: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
          },
        },
        collection_gaps: { type: "array", items: { type: "string" } },
        next_additions: { type: "array", items: { type: "string" } },
      },
    }
  });

  // Hard guard: ensure applyable_changes are returned
  if (!result?.applyable_changes?.length) {
    throw new Error("Optimization returned no applyable changes.");
  }

  return result;
}

export async function generateBreakInScheduleAI({ pipe, blends, profile }) {
  const blendsData = (blends || []).map((b) => ({
    id: b.id,
    name: b.name,
    manufacturer: b.manufacturer,
    blend_type: b.blend_type,
    strength: b.strength,
    cut: b.cut,
  }));

  const profileContext = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        preferred_shapes: profile.preferred_shapes || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

  const pipeData = {
    id: pipe?.id,
    name: pipe?.name,
    maker: pipe?.maker,
    shape: pipe?.shape,
    bowl_material: pipe?.bowl_material,
    focus: pipe?.focus || [],
    chamber_volume: pipe?.chamber_volume ?? null,
    bowl_diameter_mm: pipe?.bowl_diameter_mm ?? null,
    bowl_depth_mm: pipe?.bowl_depth_mm ?? null,
  };

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Create a break-in schedule for this pipe.

Rules:
- Stage 1 may include "conditioning bowls" even outside the final focus (mild, forgiving blends).
- Stages 2+ should trend toward the pipe's focus and user preferences.
- Only use blends from the provided list.
- Return JSON only.

PIPE:
${JSON.stringify(pipeData, null, 2)}

BLENDS:
${JSON.stringify(blendsData, null, 2)}

USER_PREFERENCES:
${JSON.stringify(profileContext, null, 2)}

Return JSON:
{ schedule: [{ blend_id, blend_name, suggested_bowls, bowls_completed, reasoning }] }`,
    response_json_schema: {
      type: "object",
      properties: {
        schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              blend_id: { type: "string" },
              blend_name: { type: "string" },
              suggested_bowls: { type: "number" },
              bowls_completed: { type: "number" },
              reasoning: { type: "string" },
            },
            required: ["blend_id", "blend_name", "suggested_bowls", "bowls_completed", "reasoning"],
          },
        },
      },
      required: ["schedule"],
    }
  });

  return { schedule: result?.schedule || [] };
}