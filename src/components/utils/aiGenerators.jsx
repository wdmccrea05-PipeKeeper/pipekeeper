import { base44 } from "@/api/base44Client";

export async function generatePairingsAI({ pipes, blends, profile }) {
  const pipesData = (pipes || []).map((p) => ({
    id: p.id,
    name: p.name,
    maker: p.maker,
    shape: p.shape,
    bowl_material: p.bowl_material,
    chamber_volume: p.chamber_volume,
    bowl_diameter_mm: p.bowl_diameter_mm,
    bowl_depth_mm: p.bowl_depth_mm,
    focus: p.focus || [],
    notes: p.notes || "",
  }));

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

Tobacco Blends in User's Collection (ONLY recommend from this list):
${JSON.stringify(blendsData, null, 2)}${profileContext}

For each pipe, evaluate which tobacco blends FROM THE USER'S COLLECTION would pair well.

CRITICAL SCORING PRIORITY ORDER (HIGHEST TO LOWEST):

1. **PIPE SPECIALIZATION/FOCUS** (HIGHEST PRIORITY - Weight: 40%):
   - If a pipe has "Non-Aromatic" or "Non Aromatic" in focus: COMPLETELY EXCLUDE all Aromatic blends (score = 0)
   - If a pipe has "Aromatic" in focus: COMPLETELY EXCLUDE all non-aromatic blends (score = 0)
   - If a pipe HAS ANY focus field set (non-empty array): Give 9-10 scores ONLY to blends matching that focus
   - Blends NOT matching the pipe's focus should receive maximum 5/10 score
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

CRITICAL: Prioritize pipe specialization above all else. A pipe designated for English blends should score 9-10 for English blends and much lower for others, regardless of physical characteristics.`,
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
              blend_matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    blend_id: { type: "string" },
                    blend_name: { type: "string" },
                    score: { type: "number" },
                    reasoning: { type: "string" }
                  },
                  required: ["blend_id", "blend_name", "score", "reasoning"]
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
  const pipesData = (pipes || []).map((p) => ({
    id: p.id,
    name: p.name,
    maker: p.maker,
    shape: p.shape,
    bowl_material: p.bowl_material,
    focus: p.focus || [],
    chamber_volume: p.chamber_volume,
    bowl_diameter_mm: p.bowl_diameter_mm,
    bowl_depth_mm: p.bowl_depth_mm,
  }));

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
- Recommend specialization updates (pipe focus changes) only when justified.
- Provide "applyable_changes" as a list of pipe focus updates: { pipe_id, before_focus, after_focus, rationale }.
- Include "collection_gaps" and "next_additions" suggestions.
- If what-if is advice-only, give advice and keep applyable_changes empty.

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
  applyable_changes: [{ pipe_id, before_focus: string[], after_focus: string[], rationale: string }],
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
              before_focus: { type: "array", items: { type: "string" } },
              after_focus: { type: "array", items: { type: "string" } },
              rationale: { type: "string" },
            },
            required: ["pipe_id", "before_focus", "after_focus", "rationale"],
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