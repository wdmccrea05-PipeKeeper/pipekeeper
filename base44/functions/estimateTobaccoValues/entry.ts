import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get blend IDs to process from request body
    const { blend_ids } = await req.json();
    
    if (!blend_ids || !Array.isArray(blend_ids) || blend_ids.length === 0) {
      return Response.json({ error: 'No blend IDs provided' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each blend
    for (const blendId of blend_ids) {
      try {
        // Fetch blend data
        const blend = await base44.entities.TobaccoBlend.get(blendId);
        
        if (!blend) {
          errors.push({ blend_id: blendId, error: 'Blend not found' });
          continue;
        }

        // Build AI prompt for valuation
        const prompt = `You are a tobacco market analyst. Estimate the current market value for the following tobacco blend. Provide your response as valid JSON only, no additional text.

Blend: ${blend.name}
Manufacturer: ${blend.manufacturer || 'Unknown'}
Blend Type: ${blend.blend_type || 'Unknown'}
Production Status: ${blend.production_status || 'Unknown'}
Cut: ${blend.cut || 'Unknown'}

Analyze current marketplace listings, auction results, and retail prices to estimate:
1. Estimated market value per ounce
2. Low and high range
3. Confidence level (High/Medium/Low)
4. Evidence sources (list 2-3 websites/marketplaces consulted)
5. 12-month projection (consider aging potential and market trends)
6. 36-month projection

Return JSON with this structure:
{
  "ai_estimated_value": number,
  "ai_value_range_low": number,
  "ai_value_range_high": number,
  "ai_confidence": "High" | "Medium" | "Low",
  "ai_evidence_sources": ["source1", "source2"],
  "ai_projection_12m": number,
  "ai_projection_36m": number
}`;

        // Call AI with web search enabled
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              ai_estimated_value: { type: "number" },
              ai_value_range_low: { type: "number" },
              ai_value_range_high: { type: "number" },
              ai_confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              ai_evidence_sources: { type: "array", items: { type: "string" } },
              ai_projection_12m: { type: "number" },
              ai_projection_36m: { type: "number" }
            }
          }
        });

        // Update blend with AI valuation
        const updateData = {
          ...aiResult,
          ai_last_updated: new Date().toISOString()
        };

        await base44.entities.TobaccoBlend.update(blendId, updateData);

        results.push({
          blend_id: blendId,
          blend_name: blend.name,
          status: 'success',
          estimated_value: aiResult.ai_estimated_value,
          confidence: aiResult.ai_confidence
        });

      } catch (error) {
        errors.push({
          blend_id: blendId,
          error: error.message || 'Failed to estimate value'
        });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('[estimateTobaccoValues] Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});