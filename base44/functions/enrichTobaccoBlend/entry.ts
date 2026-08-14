import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { trackIntegrationEvent, classifyIntegrationError } from '../../shared/integrationTelemetry.ts';

Deno.serve(async (req) => {
  const startedAt = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, manufacturer, blend_type, strength, description } = body;

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const cutTypes = [
      'Broken Flake', 'Coin', 'Crumble Cake', 'Cube Cut', 'Flake', 'Plug',
      'Ready Rubbed', 'Ribbon', 'Rope', 'Shag', 'Twist', 'Other'
    ];

    const productionStatuses = ['Current Production', 'Discontinued', 'Limited Edition', 'Vintage'];
    const agingPotentials = ['Excellent', 'Good', 'Fair', 'Poor'];

    // Build context for LLM
    const context = `Blend: "${name}" ${manufacturer ? `by ${manufacturer}` : ''}
${blend_type ? `Type: ${blend_type}` : ''}
${strength ? `Strength: ${strength}` : ''}
${description ? `Description: ${description}` : ''}`;

    // ── Single structured LLM call for all enrichment fields ──────────────────
    // Previously this made 4 separate InvokeLLM calls (cut, rating,
    // production_status, aging_potential). Now consolidated into 1 call.
    let enriched: Record<string, unknown> = {};

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `For this tobacco blend, determine the following fields. Return null for any field you cannot confidently determine — do not guess.

Blend context:
${context}

Determine:
1. cut — the most likely cut type. Choose from: ${cutTypes.join(', ')}
2. rating — personal smoking rating from 1 to 5 (5 = exceptional, 1 = poor). Return a number or null.
3. production_status — current production status. Choose from: ${productionStatuses.join(', ')}
4. aging_potential — how well it ages over time. Choose from: ${agingPotentials.join(', ')}

Return all four fields. Use null for any field you cannot determine.`,
        response_json_schema: {
          type: 'object',
          properties: {
            cut: { type: ['string', 'null'] },
            rating: { type: ['number', 'null'] },
            production_status: { type: ['string', 'null'] },
            aging_potential: { type: ['string', 'null'] },
          },
        },
      });

      // Validate each field against its enum — do not invent values
      if (result?.cut && cutTypes.includes(result.cut)) {
        enriched.cut = result.cut;
      }
      if (result?.rating && typeof result.rating === 'number' && result.rating >= 1 && result.rating <= 5) {
        enriched.rating = result.rating;
      }
      if (result?.production_status && productionStatuses.includes(result.production_status)) {
        enriched.production_status = result.production_status;
      }
      if (result?.aging_potential && agingPotentials.includes(result.aging_potential)) {
        enriched.aging_potential = result.aging_potential;
      }

      await trackIntegrationEvent(base44, {
        feature: 'blend.enrichment',
        operation: 'InvokeLLM',
        module: 'pipekeeper',
        success: true,
        durationMs: Date.now() - startedAt,
        invocationCount: 1,
        userId: user?.id,
        email: user?.email,
        backendFunction: 'enrichTobaccoBlend',
        triggerContext: 'user_action',
      });
    } catch (err) {
      const category = classifyIntegrationError(err);
      await trackIntegrationEvent(base44, {
        feature: 'blend.enrichment',
        operation: 'InvokeLLM',
        module: 'pipekeeper',
        success: false,
        durationMs: Date.now() - startedAt,
        errorCategory: category,
        errorMessage: err?.message,
        invocationCount: 1,
        userId: user?.id,
        email: user?.email,
        backendFunction: 'enrichTobaccoBlend',
        triggerContext: 'user_action',
      });
      console.warn('Enrichment failed:', err.message);
    }

    return Response.json(enriched);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});