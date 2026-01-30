import { base44 } from "@/api/base44Client";
import { buildPairingsForPipes } from "@/components/utils/pairingScore";

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
  // Normalize focus tags for consistent matching
  function normalizeFocus(focusArr) {
    const f = Array.isArray(focusArr) ? focusArr : [];
    const joined = f.join(" ").toLowerCase();

    const out = new Set(f);

    // Normalize Aromatic tags
    if (joined.includes("aromatic")) out.add("Aromatic"); // covers Aromatic/Aromatics/Heavy Aromatics/Light Aromatics
    if (joined.includes("non-aromatic") || joined.includes("non aromatic")) out.add("Non-Aromatic");

    // Normalize intensity tags
    if (joined.includes("heavy")) out.add("Heavy Aromatics");
    if (joined.includes("light")) out.add("Light Aromatics");
    if (joined.includes("medium")) out.add("Medium Aromatics");

    return [...out];
  }

  // Expand pipes to include bowl variants as separate entries
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
          bowlStyle: bowl.bowlStyle || p.bowlStyle || null,
          shankShape: bowl.shankShape || p.shankShape || null,
          bend: bowl.bend || p.bend || null,
          sizeClass: bowl.sizeClass || p.sizeClass || null,

          bowl_material: bowl.bowl_material ?? p.bowl_material ?? null,
          chamber_volume: bowl.chamber_volume ?? p.chamber_volume ?? null,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? p.bowl_diameter_mm ?? null,
          bowl_depth_mm: bowl.bowl_depth_mm ?? p.bowl_depth_mm ?? null,
          bowl_height_mm: bowl.bowl_height_mm ?? null,
          bowl_width_mm: bowl.bowl_width_mm ?? null,

          focus: normalizeFocus(Array.isArray(bowl.focus) ? bowl.focus : []),
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
        bowlStyle: p.bowlStyle || null,
        shankShape: p.shankShape || null,
        bend: p.bend || null,
        sizeClass: p.sizeClass || null,

        bowl_material: p.bowl_material ?? null,
        chamber_volume: p.chamber_volume ?? null,
        bowl_diameter_mm: p.bowl_diameter_mm ?? null,
        bowl_depth_mm: p.bowl_depth_mm ?? null,

        focus: normalizeFocus(Array.isArray(p.focus) ? p.focus : []),
        notes: p.notes || "",
      });
    }
  }

  const blendsData = (blends || []).map((b) => {
    const bt = String(b.blend_type || "").toLowerCase();

    // Treat ANY blend_type containing "aromatic" as aromatic.
    // This fixes values like "Aromatic (Cherry)", "English Aromatic", etc.
    const isAromatic = bt.includes("aromatic");
    
    // Determine aromatic intensity: Light, Medium, Heavy
    let aromaticIntensity = null;
    if (isAromatic) {
      if (b.strength === "Mild" || b.strength === "Mild-Medium") {
        aromaticIntensity = "light";
      } else if (b.strength === "Medium" || b.strength === "Medium-Full") {
        aromaticIntensity = "medium";
      } else if (b.strength === "Full") {
        aromaticIntensity = "heavy";
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
      category: isAromatic ? "aromatic" : "non_aromatic",
      aromatic_intensity: aromaticIntensity,
    };
    });

    // Build a profile object in the same shape used by the scorer
    const userProfile = profile
    ? {
        preferred_blend_types: profile.preferred_blend_types || [],
        strength_preference: profile.strength_preference || null,
        pipe_size_preference: profile.pipe_size_preference || null,
        clenching_preference: profile.clenching_preference || null,
        smoke_duration_preference: profile.smoke_duration_preference || null,
        notes: profile.notes || null,
      }
    : null;

    // IMPORTANT: blendsData already contains tobacco_id / tobacco_name in your code above.
    // Ensure it also carries flavor_notes / tobacco_components / aromatic_intensity if present.
    const pairings = buildPairingsForPipes(pipesData, blendsData, userProfile);

    if (!pairings.length) {
    throw new Error("No pairings produced (pipes list empty?)");
    }

    return { pairings };
    }

export async function generateOptimizationAI({ pipes, blends, profile, whatIfText }) {
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
          bowlStyle: bowl.bowlStyle || p.bowlStyle,
          bend: bowl.bend || p.bend,
          sizeClass: bowl.sizeClass || p.sizeClass,
          bowl_material: bowl.bowl_material ?? p.bowl_material,
          chamber_volume: bowl.chamber_volume ?? p.chamber_volume,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? p.bowl_diameter_mm,
          bowl_depth_mm: bowl.bowl_depth_mm ?? p.bowl_depth_mm,
          focus: Array.isArray(bowl.focus) ? bowl.focus : [],
        });
      });
    } else {
      pipesData.push({
        pipe_id: pid,
        pipe_name: p.name,
        bowl_variant_id: null,
        maker: p.maker,
        shape: p.shape,
        bowlStyle: p.bowlStyle,
        bend: p.bend,
        sizeClass: p.sizeClass,
        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        focus: Array.isArray(p.focus) ? p.focus : [],
      });
    }
  }

  const pipesDataCapped = pipesData.slice(0, 30);
  const blendsDataCapped = (blends || []).slice(0, 60).map((b) => ({
    id: b.id,
    name: b.name,
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

  const pipesTruncatedNote =
    pipesData.length > 30
      ? `\n[Note: Showing 30 of ${pipesData.length} pipe configurations.]`
      : "";
  const blendsTruncatedNote =
    blends && blends.length > 60
      ? `\n[Note: Showing 60 of ${blends.length} blends.]`
      : "";

  const prompt = `Analyze the user's pipe and tobacco collection considering pipe geometry. Provide optimization recommendations.

Rules:
- Each entry represents a bowl configuration (bowl_variant_id identifies interchangeable bowls)
- Treat each bowl independently when bowl_variant_id is present
- Provide applyable_changes only when justified
- If the request is advice-only, keep applyable_changes empty
- Return JSON only

WHAT_IF CONTEXT:
${whatIfText ? String(whatIfText).substring(0, 2500) : ""}

PIPES DATA (${pipesDataCapped.length} shown):
${JSON.stringify(pipesDataCapped)}${pipesTruncatedNote}

BLENDS DATA (${blendsDataCapped.length} shown):
${JSON.stringify(blendsDataCapped)}${blendsTruncatedNote}

USER PREFERENCES:
${JSON.stringify(profileContext)}

RESPONSE JSON SCHEMA: { applyable_changes: [], summary: string, collection_gaps?: [], next_additions?: [] }`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
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
    },
  });

  // Always normalize the shape so downstream UI never crashes
  return {
    summary: result?.summary || "",
    applyable_changes: Array.isArray(result?.applyable_changes) ? result.applyable_changes : [],
    collection_gaps: Array.isArray(result?.collection_gaps) ? result.collection_gaps : [],
    next_additions: Array.isArray(result?.next_additions) ? result.next_additions : [],
  };
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
    bowlStyle: pipe?.bowlStyle,
    shankShape: pipe?.shankShape,
    bend: pipe?.bend,
    sizeClass: pipe?.sizeClass,
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