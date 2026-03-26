import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
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

    // Get cut
    let cut;
    try {
      const cutResult = await base44.integrations.Core.InvokeLLM({
        prompt: `For this tobacco blend: ${context}

Determine the most likely cut type. Choose from: ${cutTypes.join(', ')}

Return only the cut type name.`,
        response_json_schema: {
          type: 'object',
          properties: { cut: { type: 'string' } },
        },
      });
      if (cutResult?.cut && cutTypes.includes(cutResult.cut)) {
        cut = cutResult.cut;
      }
    } catch (err) {
      console.warn('Cut determination failed:', err.message);
    }

    // Get rating (1-5)
    let rating;
    try {
      const ratingResult = await base44.integrations.Core.InvokeLLM({
        prompt: `For this tobacco blend: ${context}

Based on its reputation and characteristics, estimate a personal smoking rating from 1 to 5, where 5 is exceptional and 1 is poor.

Return only a number between 1 and 5.`,
        response_json_schema: {
          type: 'object',
          properties: { rating: { type: 'number' } },
        },
      });
      if (ratingResult?.rating && ratingResult.rating >= 1 && ratingResult.rating <= 5) {
        rating = ratingResult.rating;
      }
    } catch (err) {
      console.warn('Rating determination failed:', err.message);
    }

    // Get production status
    let production_status;
    try {
      const prodResult = await base44.integrations.Core.InvokeLLM({
        prompt: `For this tobacco blend: ${context}

Determine the current production status. Choose from: ${productionStatuses.join(', ')}

Return only the production status.`,
        response_json_schema: {
          type: 'object',
          properties: { production_status: { type: 'string' } },
        },
      });
      if (prodResult?.production_status && productionStatuses.includes(prodResult.production_status)) {
        production_status = prodResult.production_status;
      }
    } catch (err) {
      console.warn('Production status determination failed:', err.message);
    }

    // Get aging potential
    let aging_potential;
    try {
      const agingResult = await base44.integrations.Core.InvokeLLM({
        prompt: `For this tobacco blend: ${context}

Assess its aging potential (how well it ages over time). Choose from: ${agingPotentials.join(', ')}

Return only the aging potential.`,
        response_json_schema: {
          type: 'object',
          properties: { aging_potential: { type: 'string' } },
        },
      });
      if (agingResult?.aging_potential && agingPotentials.includes(agingResult.aging_potential)) {
        aging_potential = agingResult.aging_potential;
      }
    } catch (err) {
      console.warn('Aging potential determination failed:', err.message);
    }

    // Return enriched data
    const enriched = {};
    if (cut) enriched.cut = cut;
    if (rating) enriched.rating = rating;
    if (production_status) enriched.production_status = production_status;
    if (aging_potential) enriched.aging_potential = aging_potential;

    return Response.json(enriched);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});