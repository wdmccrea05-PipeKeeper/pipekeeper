import { base44 } from "@/api/base44Client";

// === Hard Rules Enforcement ===

function normalizeType(s) {
  return String(s || "").toLowerCase();
}

function isAromaticBlend(blend) {
  const t = normalizeType(blend?.blend_type);
  if (t.includes("aromatic")) return true;

  const notes = normalizeType(blend?.flavor_notes);
  if (notes && notes.includes("aromatic")) return true;

  return false;
}

function hasNonAromaticFocus(focusArr) {
  return (focusArr || []).some((f) => {
    const norm = normalizeType(f);
    return norm.includes("non-aromatic") || norm.includes("non aromatic");
  });
}

function hasAromaticOnlyFocus(focusArr) {
  return (focusArr || []).some((f) => {
    const norm = normalizeType(f);
    return norm.includes("aromatic") && !norm.includes("non");
  });
}

export function enforceHardPairingRules(pairings, blends) {
  const blendById = new Map((blends || []).map((b) => [String(b.id), b]));

  return (pairings || []).map((p) => {
    const focus = Array.isArray(p.focus) ? p.focus : [];
    const nonAro = hasNonAromaticFocus(focus);
    const aroOnly = hasAromaticOnlyFocus(focus);

    if (!p.recommendations) return p;

    const updatedRecs = p.recommendations.map((r) => {
      const blend = blendById.get(String(r.tobacco_id)) || blendById.get(String(r.blend_id)) || null;
      const isAro = blend ? isAromaticBlend(blend) : normalizeType(r.tobacco_name).includes("aromatic");

      // Enforce constraints
      if (nonAro && isAro) {
        return { ...r, score: 0, reasoning: `${r.reasoning} (Hard rule: non-aromatic pipe → aromatic scored 0)` };
      }
      if (aroOnly && !isAro) {
        return { ...r, score: 0, reasoning: `${r.reasoning} (Hard rule: aromatic-only pipe → non-aromatic scored 0)` };
      }

      return r;
    });

    return { ...p, recommendations: updatedRecs };
  });
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
${JSON.stringify(pipesData, null, 2)}

TOBACCOS (ONLY choose from this list):
${JSON.stringify(blendsData, null, 2)}${profileContext}

SCORING ALGORITHM (APPLY IN THIS EXACT ORDER):

STEP 1: CATEGORY FILTERING
If pipe.focus contains "Aromatic":
  - Set all NON_AROMATIC blends score to 0 immediately.
  - Skip all other blends (only score AROMATIC blends).
Else if pipe.focus contains "Non-Aromatic":
  - Set all AROMATIC blends score to 0 immediately.
  - Skip all other blends (only score NON_AROMATIC blends).
Else:
  - All blends eligible for scoring.

STEP 2: AROMATIC INTENSITY FILTERING (for AROMATIC blends only)
If pipe.focus contains "Heavy Aromatics" or "Heavy":
  - For aromatic_intensity == "Heavy": continue to Step 3.
  - For aromatic_intensity == "Light" or "Medium": force score to 0.
Else if pipe.focus contains "Light Aromatics" or "Light":
  - For aromatic_intensity == "Light": continue to Step 3.
  - For aromatic_intensity == "Medium" or "Heavy": force score to 0.
Else if pipe.focus contains "Medium Aromatics" or "Aromatics" (but not "Light" or "Heavy"):
  - For aromatic_intensity == "Medium": continue to Step 3 with score 8–9.
  - For aromatic_intensity == "Light": continue to Step 3 with max score 5.
  - For aromatic_intensity == "Heavy": continue to Step 3 with max score 5.
Else:
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

  const pairings = result?.pairings || [];

  // Hard guard: if LLM returns nothing, don't silently "succeed"
  if (!pairings.length) {
    throw new Error("LLM returned no pairings. (Schema mismatch or oversized response.)");
  }

  // Attach focus to pairings for enforcement
  const focusByVariant = new Map(
    pipesData.map((x) => [`${x.pipe_id}::${x.bowl_variant_id ?? "main"}`, x.focus || []])
  );

  pairings.forEach((p) => {
    const k = `${String(p.pipe_id)}::${p.bowl_variant_id ?? "main"}`;
    p.focus = focusByVariant.get(k) || [];
  });

  // Enforce hard pairing rules
  const cleanedPairings = enforceHardPairingRules(pairings, blends);

  return { pairings: cleanedPairings };
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
      properties: {
        summary: { type: "string" },
        applyable_changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pipe_id: { type: "string" },
              bowl_variant_id: { type: ["string", "null"] },
              before_focus: { type: "array", items: { type: "string" } },
              after_focus: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
            required: ["pipe_id", "bowl_variant_id", "before_focus", "after_focus", "rationale"],
          },
        },
        collection_gaps: { type: "array", items: { type: "string" } },
        next_additions: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
      },
      required: ["summary", "applyable_changes", "collection_gaps", "next_additions", "notes"],
    }
  });

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