import { base44 } from "@/api/base44Client";
import { buildPairingsForPipes, isAromaticBlend, getAromaticIntensity } from "@/components/utils/pairingScoreCanonical";

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
    // Use canonical helpers
    const isAro = isAromaticBlend(b);
    const intensity = isAro ? getAromaticIntensity(b) : null;
    
    return {
      tobacco_id: String(b.id),
      tobacco_name: b.name,
      manufacturer: b.manufacturer || null,
      blend_type: b.blend_type || null,
      strength: b.strength || null,
      cut: b.cut || null,
      flavor_notes: b.flavor_notes || null,
      tobacco_components: b.tobacco_components || null,
      category: isAro ? "aromatic" : "non_aromatic",
      aromatic_intensity: intensity,
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
          shankShape: bowl.shankShape || p.shankShape,
          bend: bowl.bend || p.bend,
          sizeClass: bowl.sizeClass || p.sizeClass,
          bowl_material: bowl.bowl_material ?? p.bowl_material,
          chamber_volume: bowl.chamber_volume ?? p.chamber_volume,
          bowl_diameter_mm: bowl.bowl_diameter_mm ?? p.bowl_diameter_mm,
          bowl_depth_mm: bowl.bowl_depth_mm ?? p.bowl_depth_mm,
          focus: Array.isArray(bowl.focus) ? bowl.focus : [],
          smoking_characteristics: p.smoking_characteristics,
          condition: p.condition,
          usage_bowls_count: p.usage_bowls_count ?? null,
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
        shankShape: p.shankShape,
        bend: p.bend,
        sizeClass: p.sizeClass,
        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        focus: Array.isArray(p.focus) ? p.focus : [],
        smoking_characteristics: p.smoking_characteristics,
        condition: p.condition,
        usage_bowls_count: p.usage_bowls_count ?? null,
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
    flavor_notes: b.flavor_notes || null,
    tobacco_components: b.tobacco_components || null,
    manufacturer: b.manufacturer || null,
    aging_potential: b.aging_potential || null,
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

  // Pre-compute pairing score summaries using the canonical scorer
  const pairingMatrix = buildPairingsForPipes(pipesDataCapped, blendsDataCapped, profileContext);

  const pipeScoreSummaries = pipesDataCapped.map(pipe => {
    const variantKey = pipe.bowl_variant_id
      ? `${pipe.pipe_id}__${pipe.bowl_variant_id}`
      : pipe.pipe_id;

    const scores = pairingMatrix
      .filter(p => {
        const pk = p.bowl_variant_id ? `${p.pipe_id}__${p.bowl_variant_id}` : p.pipe_id;
        return pk === variantKey;
      })
      .map(p => p.score);

    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highCount = scores.filter(s => s >= 7).length;
    const modCount = scores.filter(s => s >= 5).length;
    const topScore = scores.length ? Math.max(...scores) : 0;

    return {
      pipe_id: pipe.pipe_id,
      bowl_variant_id: pipe.bowl_variant_id || null,
      pipe_name: pipe.pipe_name,
      current_focus: pipe.focus,
      average_pairing_score: Math.round(avg * 10) / 10,
      top_pairing_score: topScore,
      high_compat_blend_count: highCount,
      moderate_compat_blend_count: modCount,
      blend_count_evaluated: scores.length,
    };
  });

  const prompt = `You are an expert pipe collection optimizer. Your goal is to produce the BEST POSSIBLE match between pipes and tobacco blends through specialization assignments.

## Optimization Goals (in priority order)
1. Maximize the number of blends in the collection that have at least one well-matched pipe (coverage)
2. Maximize per-pipe pairing scores by assigning the best-fit specialization
3. Eliminate redundant specialization overlap where two pipes serve the same blend types identically
4. Identify blend types with no good pipe match (coverage gaps) and recommend how to fill them
5. Suggest new pipe purchases only when reassignment cannot close a coverage gap

## Rules
- Each pipe entry represents a bowl configuration (bowl_variant_id = interchangeable bowl)
- Treat each bowl variant independently
- Only include a pipe in applyable_changes if its focus SHOULD change
- Score delta = estimated new average pairing score minus current average_pairing_score
- A change is worth recommending only if score_delta >= 1.0 OR it resolves a coverage gap
- Return JSON only

${whatIfText ? `## WHAT-IF / USER QUESTION CONTEXT\n${String(whatIfText).substring(0, 2500)}` : ""}

## PIPES WITH CURRENT PAIRING SCORES
${JSON.stringify(pipeScoreSummaries)}

## FULL PIPES DATA
${JSON.stringify(pipesDataCapped)}${pipesTruncatedNote}

## BLENDS DATA
${JSON.stringify(blendsDataCapped)}${blendsTruncatedNote}

## USER PREFERENCES
${JSON.stringify(profileContext)}

## Required analysis steps

### Step 1 — Current state assessment
For each pipe, note its current focus, its average_pairing_score, and how many blends score >=7 with it.

### Step 2 — Identify redundancies
List pairs of pipes whose current focus arrays are nearly identical and serve the same blend types. Flag these as redundant.

### Step 3 — Identify coverage gaps
List blend types present in the collection that are NOT well-covered by any pipe (no pipe scores >=7 with 2+ blends of that type).

### Step 4 — Evaluate focus reassignments
For each redundant pipe pair and each coverage gap, evaluate whether reassigning a specific pipe's focus would raise its average pairing score (score_delta >= 1.0) or fill a coverage gap. If yes, include it in applyable_changes with estimated score_delta.

### Step 5 — Purchase suggestions
For coverage gaps that CANNOT be filled by reassignment, provide a specific recommendation for what type of pipe to acquire.

Respond with JSON matching this exact schema:`;

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
              score_delta: { type: "number" },
              fills_gap_for: { type: ["string", "null"] },
            },
          },
        },
        collection_gaps: { type: "array", items: { type: "string" } },
        next_additions: { type: "array", items: { type: "string" } },
        redundancies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              blend_type: { type: "string" },
              pipe_names: { type: "array", items: { type: "string" } },
              recommendation: { type: "string" },
            }
          }
        },
        purchase_suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              gap_blend_type: { type: "string" },
              suggested_pipe_characteristics: { type: "string" },
              rationale: { type: "string" },
            }
          }
        },
        coverage_summary: {
          type: "object",
          properties: {
            total_blends: { type: "number" },
            blends_with_good_match: { type: "number" },
            blends_with_no_match: { type: "number" },
            coverage_percentage: { type: "number" },
          }
        }
      },
    },
  });

  // Always normalize the shape so downstream UI never crashes
  return {
    summary: result?.summary || "",
    applyable_changes: Array.isArray(result?.applyable_changes) ? result.applyable_changes : [],
    collection_gaps: Array.isArray(result?.collection_gaps) ? result.collection_gaps : [],
    next_additions: Array.isArray(result?.next_additions) ? result.next_additions : [],
    redundancies: Array.isArray(result?.redundancies) ? result.redundancies : [],
    purchase_suggestions: Array.isArray(result?.purchase_suggestions) ? result.purchase_suggestions : [],
    coverage_summary: result?.coverage_summary || null,
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