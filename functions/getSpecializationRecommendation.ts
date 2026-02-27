import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireEntitlement } from './_auth/requireEntitlement.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check entitlement
    await requireEntitlement(base44, user, 'PAIRING_ADVANCED');

    const { pipeId } = await req.json();
    
    if (!pipeId) {
      return Response.json({ error: 'Pipe ID is required' }, { status: 400 });
    }

    // Fetch the pipe
    const pipe = await base44.entities.Pipe.get(pipeId);
    
    if (!pipe || pipe.created_by !== user.email) {
      return Response.json({ error: 'Pipe not found' }, { status: 404 });
    }

    // Fetch user's blends, user profile, and all pipes in collection
    const [blends, profiles, allPipes] = await Promise.all([
      base44.entities.TobaccoBlend.filter({ created_by: user.email }),
      base44.entities.UserProfile.filter({ user_email: user.email }),
      base44.entities.Pipe.filter({ created_by: user.email }),
    ]);

    const userProfile = profiles?.[0];

    // Build context for AI
    const pipeContext = {
      name: pipe.name,
      shape: pipe.shape,
      bowlStyle: pipe.bowlStyle,
      shankShape: pipe.shankShape,
      bend: pipe.bend,
      sizeClass: pipe.sizeClass,
      chamber_volume: pipe.chamber_volume,
      bowl_diameter_mm: pipe.bowl_diameter_mm,
      bowl_depth_mm: pipe.bowl_depth_mm,
      bowl_material: pipe.bowl_material,
      stem_material: pipe.stem_material,
      finish: pipe.finish,
      smoking_characteristics: pipe.smoking_characteristics,
      current_focus: pipe.focus || [],
      notes: pipe.notes
    };

    const userContext = {
      preferred_blend_types: userProfile?.preferred_blend_types || [],
      strength_preference: userProfile?.strength_preference,
      smoke_duration_preference: userProfile?.smoke_duration_preference,
      clenching_preference: userProfile?.clenching_preference,
      pipe_size_preference: userProfile?.pipe_size_preference,
      notes: userProfile?.notes
    };

    // Inline pairing score computation (mirrors pairingScoreCanonical logic)
    const NON_AROMATIC_TYPES = ["english","balkan","latakia","virginia","burley","oriental","perique"];

    function computePairingScore(pipeObj: any, blend: any): number {
      const focus: string[] = pipeObj.focus || [];
      const blendType: string = (blend.blend_type || "").toLowerCase();
      const isAromatic = blendType.includes("aromatic");

      const pipeIsAromaticOnly = focus.some((f: string) => f.toLowerCase().includes("aromatic")) && !focus.some((f: string) => NON_AROMATIC_TYPES.includes(f.toLowerCase()));
      const pipeIsNonAromaticOnly = focus.some((f: string) => NON_AROMATIC_TYPES.includes(f.toLowerCase())) && !focus.some((f: string) => f.toLowerCase().includes("aromatic"));

      if (pipeIsAromaticOnly && !isAromatic) return 0;
      if (pipeIsNonAromaticOnly && isAromatic) return 0;

      let score = 4;

      if (focus.some((f: string) => blend.name?.toLowerCase().includes(f.toLowerCase()))) return 10;

      const matchText = [blend.blend_type, blend.flavor_notes, blend.tobacco_components].filter(Boolean).join(" ").toLowerCase();
      const matchCount = focus.filter((f: string) => matchText.includes(f.toLowerCase())).length;
      if (matchCount >= 2) score += 4;
      else if (matchCount === 1) score += 2;

      if (isAromatic) score += 2;

      if (blend.strength && pipeObj.smoking_characteristics?.toLowerCase().includes(blend.strength.toLowerCase())) score += 0.5;

      return Math.max(0, Math.min(10, score));
    }

    // Pre-compute blend scores at current focus
    const blendScoresCurrentFocus = blends.slice(0, 40).map(b => ({
      name: b.name,
      blend_type: b.blend_type,
      strength: b.strength,
      current_score: computePairingScore(pipe, b),
    }));

    // Build collection context from other pipes
    const otherPipes = allPipes
      .filter((p: any) => p.id !== pipeId)
      .map((p: any) => ({
        id: String(p.id),
        name: p.name,
        shape: p.shape,
        bowlStyle: p.bowlStyle,
        sizeClass: p.sizeClass,
        chamber_volume: p.chamber_volume,
        bowl_diameter_mm: p.bowl_diameter_mm,
        bowl_depth_mm: p.bowl_depth_mm,
        current_focus: p.focus || [],
        smoking_characteristics: p.smoking_characteristics,
      }));

    const prompt = `You are an expert pipe tobacconist performing a COLLECTION-LEVEL specialization analysis.

CRITICAL: The recommended_specializations array MUST contain values chosen ONLY from this exact list:
Aromatic, Non-Aromatic, Light Aromatics, Medium Aromatics, Heavy Aromatics, English, Balkan, Latakia Blend, Virginia, Virginia/Perique, Burley, Burley-based, Oriental/Turkish, Kentucky

Use EXACTLY these spellings — do not translate, rephrase, or use alternative names.
The reasoning, collection_fit, considerations, and alternative_uses fields may be written in any language.

## Target Pipe
${JSON.stringify(pipeContext, null, 2)}

## Current Blend Scores (at current focus)
${JSON.stringify(blendScoresCurrentFocus)}

## Other Pipes in Collection (${otherPipes.length} pipes)
${JSON.stringify(otherPipes)}

## User Preferences
${JSON.stringify(userContext, null, 2)}

## Your Task

Perform ALL of the following analyses:

### 1. Recommend the best specialization for THIS pipe
Based on its physical geometry (bowl size, shape, material, bend) and the blend collection, recommend the optimal focus tags.

### 2. Score projection: current vs. recommended focus
For the recommended focus, estimate:
- How many blends in the collection would score >=7 (high compatibility)
- How many would score >=5 (moderate compatibility)
- Compare to how many score >=7 and >=5 at the CURRENT focus

### 3. Collection-level analysis
Look at ALL other pipes and their current_focus values. Identify:
- Coverage gaps: blend types in the collection that no pipe (or only one pipe) currently covers well
- Coverage redundancies: blend types covered by 2+ pipes with very similar focus
- Reassignment opportunities: if changing THIS pipe's focus would reduce redundancy or fill a gap

### 4. Suggest whether other pipes' assignments should change
If another pipe would be a better physical match for this pipe's current specialty, note the swap opportunity.

### 5. Blend gap recommendations
Identify blend types present in the collection but under-served by the current pipe lineup.

Return JSON:
{
  "recommended_specializations": string[],
  "reasoning": string,
  "collection_fit": string,
  "specific_blends": string[],
  "considerations": string,
  "alternative_uses": string,
  "score_projection": {
    "current_focus_high_compat_count": number,
    "current_focus_moderate_compat_count": number,
    "recommended_focus_high_compat_count": number,
    "recommended_focus_moderate_compat_count": number
  },
  "collection_gaps": string[],
  "collection_redundancies": [{ "blend_type": string, "pipes": string[] }],
  "reassignment_opportunity": string | null,
  "blend_coverage_gaps": string[]
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_specializations: {
            type: "array",
            items: { type: "string" }
          },
          reasoning: { type: "string" },
          collection_fit: { type: "string" },
          specific_blends: {
            type: "array",
            items: { type: "string" }
          },
          considerations: { type: "string" },
          alternative_uses: { type: "string" },
          score_projection: {
            type: "object",
            properties: {
              current_focus_high_compat_count: { type: "number" },
              current_focus_moderate_compat_count: { type: "number" },
              recommended_focus_high_compat_count: { type: "number" },
              recommended_focus_moderate_compat_count: { type: "number" },
            }
          },
          collection_gaps: { type: "array", items: { type: "string" } },
          collection_redundancies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                blend_type: { type: "string" },
                pipes: { type: "array", items: { type: "string" } }
              }
            }
          },
          reassignment_opportunity: { type: ["string", "null"] },
          blend_coverage_gaps: { type: "array", items: { type: "string" } }
        },
        required: ["recommended_specializations", "reasoning", "collection_fit"]
      }
    });

    return Response.json({
      success: true,
      recommendation: response,
      pipe_name: pipe.name
    });

  } catch (error) {
    console.error('Specialization recommendation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate recommendation',
      details: error.toString()
    }, { status: 500 });
  }
});