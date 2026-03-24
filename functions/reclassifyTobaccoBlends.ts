import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tobacco blends for the user
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    if (!blends || blends.length === 0) {
      return Response.json({ message: 'No blends to classify', updated: 0 });
    }

    // Get blends needing reclassification
    const toReclassify = blends.filter(b => !b.blend_type || b.blend_type === 'Other');
    if (toReclassify.length === 0) {
      return Response.json({ message: 'All blends already classified', updated: 0 });
    }

    const blendTypes = [
      'American', 'Aromatic', 'Balkan', 'Burley', 'Burley-based', 'Cavendish',
      'Codger Blend', 'Dark Fired Kentucky', 'English', 'English Aromatic',
      'English Balkan', 'Full English/Oriental', 'Kentucky', 'Lakeland', 'Latakia Blend',
      'Navy Flake', 'Oriental/Turkish', 'Perique', 'Shag', 'Virginia', 'Virginia/Burley',
      'Virginia/Oriental', 'Virginia/Perique'
    ];

    let updated = 0;
    for (const blend of toReclassify) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Classify this tobacco blend: "${blend.name}".
          
Flavor notes: ${blend.flavor_notes?.join(', ') || 'None'}
Tobacco components: ${blend.tobacco_components?.join(', ') || 'Unknown'}

Choose from: ${blendTypes.join(', ')}

Return only the blend type name.`,
          response_json_schema: {
            type: 'object',
            properties: {
              blend_type: { type: 'string' },
            },
          },
        });

        if (result?.blend_type && blendTypes.includes(result.blend_type)) {
          await base44.entities.TobaccoBlend.update(blend.id, { blend_type: result.blend_type });
          updated++;
        }
      } catch (err) {
        console.warn(`Failed to classify blend ${blend.id}:`, err.message);
      }
    }

    return Response.json({ message: `Reclassified ${updated} blends`, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});