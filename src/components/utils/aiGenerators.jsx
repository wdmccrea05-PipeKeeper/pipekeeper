import { base44 } from "@/api/base44Client";

export async function generatePairingsAI({ pipes, blends, profile }) {
  // Expand pipes to include bowl variants as separate entries
  const pipesData = [];
  for (const p of pipes || []) {
    // If multiple bowls exist, only add bowl variants (use bowl-specific characteristics)
    if (p.interchangeable_bowls?.length > 0) {
      p.interchangeable_bowls.forEach((bowl, idx) => {
        pipesData.push({
          id: p.id,
          bowl_variant_id: `bowl_${idx}`,
          name: `${p.name} - ${bowl.name || `Bowl ${idx + 1}`}`,
          maker: p.maker,
          shape: bowl.shape || p.shape,
          bowl_material: bowl.bowl_material || p.bowl_material,
          chamber_volume: bowl.chamber_volume || p.chamber_volume,
          bowl_diameter_mm: bowl.bowl_diameter_mm || p.bowl_diameter_mm,
          bowl_depth_mm: bowl.bowl_depth_mm || p.bowl_depth_mm,
          bowl_height_mm: bowl.bowl_height_mm,
          bowl_width_mm: bowl.bowl_width_mm,
          focus: bowl.focus || [],
          notes: bowl.notes || "",
        });
      });
    } else {
      // No multiple bowls - use overall pipe record
      pipesData.push({
        id: p.id,
        bowl_variant_id: null,
        name: p.name,
        maker: p.maker,
        shape: p.shape,
        bowl_material: p.bowl_material,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        focus: p.focus || [],
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
    flavor_notes: b.flavor_notes,
    tobacco_components: b.tobacco_components,
  }));

  let profileContext = "";
  if (profile) {
    profileContext = `\n\nUser Smoking Preferences:
- Clenching: ${profile.clenching_preference}
- Smoke Duration: ${profile.smoke_duration_preference}
- Preferred Blend Types: ${profile.preferred_blend_types?.join(', ') || 'None'}
- Pipe Size Preference: ${profile.pipe_size_preference}
- Strength Preference: ${profile.strength_preference}
- Additional Notes: ${profile.notes || 'None'}

Weight these preferences heavily when scoring pairings. Prioritize blends that match their preferred types and strength.`;
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an expert pipe tobacco sommelier. Analyze these pipes and tobacco blends to create optimal pairings.

CRITICAL CONSTRAINT: You MUST ONLY recommend blends from the user's collection listed below. DO NOT suggest blends that are not in this list.

Pipes:
${JSON.stringify(pipesData, null, 2)}

CRITICAL: Each entry in the pipes list represents a different bowl configuration. When multiple interchangeable bowls exist for a pipe, ONLY the bowl variant records are included (NOT the main pipe record). Each entry has a 'bowl_variant_id' field:
- If bowl_variant_id is null: This pipe has NO interchangeable bowls - use the pipe's own characteristics
- If bowl_variant_id has a value (e.g., "bowl_0", "bowl_1"): This is an interchangeable bowl - use THIS BOWL'S specific measurements, material, volume, and focus (NOT the parent pipe's details)

YOU MUST return the EXACT pipe_id, pipe_name, and bowl_variant_id for each entry. Score ONLY based on the specific bowl's characteristics shown in each entry.

Tobacco Blends in User's Collection (ONLY recommend from this list):
${JSON.stringify(blendsData, null, 2)}${profileContext}

For each pipe/bowl entry in the list, you MUST score ALL tobacco blends in the user's collection for THAT SPECIFIC BOWL CONFIGURATION. Return one pairing entry per pipe/bowl with the matching bowl_variant_id, and include ALL blends in the recommendations array (even if score is 0 for incompatible blends). This allows users to see why certain blends don't work with certain pipes.

CRITICAL SCORING PRIORITY ORDER (HIGHEST TO LOWEST):

1. **PIPE SPECIALIZATION/FOCUS** (HIGHEST PRIORITY - Weight: 40%):
   - The "focus" field may contain SPECIFIC BLEND NAMES from the user's collection (e.g., "Cowboy Coffee"). When a pipe's focus contains an exact blend name, that blend MUST receive a score of 9-10 for that pipe.
   - The "focus" field may also contain CATEGORIES (e.g., "Aromatic", "Non-Aromatic", "English", "Virginia"). Match blends by their blend_type to these categories.
   - If a pipe has "Non-Aromatic" or "Non Aromatic" in focus: COMPLETELY EXCLUDE all Aromatic blends (score = 0)
   - If a pipe has "Aromatic" in focus: COMPLETELY EXCLUDE all non-aromatic blends (score = 0)
   - If a pipe HAS ANY focus field set (non-empty array): Blends matching that focus should receive 9-10 scores, all others maximum 5/10
   - EXACT NAME MATCHES in focus field override all other considerations - those blends MUST be in top 3
   - A dedicated pipe should excel at its specialization - reward this heavily

2. **USER SMOKING PREFERENCES** (SECOND PRIORITY - Weight: 30%):
   - User's preferred blend types should receive +2 bonus points
   - User's preferred strength should receive +1 bonus point
   - User's pipe size preference should influence recommendations
   - If user prefers certain shapes, highlight how those pipes work with their preferred blends
   - Tailor ALL recommendations to align with stated preferences

3. **PHYSICAL PIPE CHARACTERISTICS** (THIRD PRIORITY - Weight: 30%):
   - Bowl diameter: <18mm for milder tobaccos, 18-22mm versatile, >22mm for fuller blends
   - Chamber volume: Small for aromatics/milds, Large for full/English blends
   - Material: Meerschaum excellent for Virginias, Briar versatile
   - Shape: Affects smoke temperature and moisture retention

RATING SCALE:
- 10 = Perfect match (specialization + user preference aligned)
- 9 = Excellent (strong specialization or preference match)
- 7-8 = Very good (partial matches)
- 5-6 = Acceptable (no conflicts but not optimal)
- 3-4 = Suboptimal (conflicts with focus or preferences)
- 0-2 = Poor/Incompatible (violates focus rules or strong conflicts)

CRITICAL: Prioritize pipe specialization above all else. A pipe designated for English blends should score 9-10 for English blends and much lower for others, regardless of physical characteristics.

OUTPUT FORMAT: Return an array of pairings where EACH pairing object represents ONE pipe/bowl configuration with its top tobacco recommendations. Use "recommendations" (not "blend_matches") for the tobacco list.`,
    response_json_schema: {
      type: "object",
      properties: {
        pairings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pipe_id: { type: "string" },
              pipe_name: { type: "string" },
              bowl_variant_id: { type: ["string", "null"] },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tobacco_id: { type: "string" },
                    tobacco_name: { type: "string" },
                    score: { type: "number" },
                    reasoning: { type: "string" }
                  },
                  required: ["tobacco_id", "tobacco_name", "score", "reasoning"]
                }
              }
            }
          }
        }
      }
    }
  });

  return { pairings: result?.pairings || [] };
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