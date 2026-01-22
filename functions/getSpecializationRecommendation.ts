import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { buildEntitlements } from '../components/utils/entitlements.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check entitlements for PAIRING_ADVANCED feature
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    const subscription = subscriptions?.[0];
    
    const entitlements = buildEntitlements({
      isPaidSubscriber: !!(subscription?.status === 'active' || subscription?.status === 'trialing'),
      isProSubscriber: false, // TODO: Add Pro tier detection
      subscriptionStartedAt: subscription?.current_period_start || user?.created_date || null,
    });

    if (!entitlements.canUse("PAIRING_ADVANCED")) {
      return Response.json({ 
        error: 'This feature requires Pro tier or legacy Premium access' 
      }, { status: 403 });
    }

    const { pipeId } = await req.json();
    
    if (!pipeId) {
      return Response.json({ error: 'Pipe ID is required' }, { status: 400 });
    }

    // Fetch the pipe
    const pipe = await base44.entities.Pipe.get(pipeId);
    
    if (!pipe || pipe.created_by !== user.email) {
      return Response.json({ error: 'Pipe not found' }, { status: 404 });
    }

    // Fetch user's blends and user profile
    const [blends, profiles] = await Promise.all([
      base44.entities.TobaccoBlend.filter({ created_by: user.email }),
      base44.entities.UserProfile.filter({ user_email: user.email })
    ]);

    const userProfile = profiles?.[0];

    // Build context for AI
    const pipeContext = {
      name: pipe.name,
      shape: pipe.shape,
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

    const blendContext = blends.map(b => ({
      name: b.name,
      blend_type: b.blend_type,
      strength: b.strength,
      cut: b.cut
    }));

    const prompt = `You are an expert pipe tobacconist helping a user optimize their pipe collection.

User's Pipe:
${JSON.stringify(pipeContext, null, 2)}

User's Preferences:
${JSON.stringify(userContext, null, 2)}

User's Tobacco Collection (${blends.length} blends):
${JSON.stringify(blendContext.slice(0, 20), null, 2)}
${blends.length > 20 ? `... and ${blends.length - 20} more blends` : ''}

Based on:
1. The pipe's physical characteristics (size, shape, material, chamber dimensions)
2. The pipe's current smoking characteristics
3. The user's preferences and collection
4. Best practices for pipe specialization

Provide a comprehensive specialization recommendation for this specific pipe. Consider:
- What tobacco types would perform best in this pipe given its chamber size and shape
- Whether the pipe should be dedicated to specific blends to avoid ghosting
- How the pipe's characteristics align with the user's collection and preferences
- Specific blend recommendations from the user's collection

Return your analysis as a JSON object with this structure:
{
  "recommended_specializations": ["English", "Latakia Blend"],
  "reasoning": "Detailed explanation of why these specializations are recommended based on pipe characteristics",
  "collection_fit": "How this recommendation fits with the user's current collection and preferences",
  "specific_blends": ["Blend Name 1", "Blend Name 2"],
  "considerations": "Important factors to consider, such as chamber size, ghosting potential, etc.",
  "alternative_uses": "Other potential uses for this pipe if user wants flexibility"
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
          alternative_uses: { type: "string" }
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