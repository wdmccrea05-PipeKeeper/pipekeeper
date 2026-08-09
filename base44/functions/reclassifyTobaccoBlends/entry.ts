import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blendTypeEnum = [
      'American', 'Aromatic', 'Balkan', 'Burley', 'Burley-based', 'Cavendish',
      'Codger Blend', 'Dark Fired Kentucky', 'English', 'English Aromatic',
      'English Balkan', 'Full English/Oriental', 'Kentucky', 'Lakeland', 'Latakia Blend',
      'Navy Flake', 'Oriental/Turkish', 'Other', 'Perique', 'Shag', 'Virginia',
      'Virginia/Burley', 'Virginia/Oriental', 'Virginia/Perique',
    ];

    // Get all tobacco blends for the user
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    if (!blends || blends.length === 0) {
      return Response.json({ message: 'No blends to classify', updated: 0 });
    }

    const needsStructuredClassification = (blend: any) => {
      const missingFamily = !blend?.blend_family;
      const missingComponents = !Array.isArray(blend?.tobacco_components);
      const missingAromatic = typeof blend?.is_aromatic !== 'boolean';
      const missingCut = !blend?.cut;
      const missingStrength = !blend?.strength;
      const staleSingleType = !blend?.blend_type || (blend.blend_type === 'Other' && missingFamily);
      return (
        staleSingleType ||
        missingFamily ||
        missingComponents ||
        missingAromatic ||
        missingCut ||
        missingStrength
      );
    };

    // Get blends needing reclassification
    const toReclassify = blends.filter(needsStructuredClassification);
    if (toReclassify.length === 0) {
      return Response.json({ message: 'All blends already classified', updated: 0 });
    }

    let updated = 0;
    for (const blend of toReclassify) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Classify this pipe tobacco blend and return structured taxonomy.

Blend: "${blend.name}"
Manufacturer: ${blend.manufacturer || 'Unknown'}
Current blend_type: ${blend.blend_type || 'Unknown'}
Current blend_family: ${blend.blend_family || 'Unknown'}
Current tobacco_components: ${blend.tobacco_components?.join(', ') || 'Unknown'}
Current is_aromatic: ${typeof blend.is_aromatic === 'boolean' ? String(blend.is_aromatic) : 'Unknown'}
Current aromatic_intensity: ${blend.aromatic_intensity || 'Unknown'}
Current casing: ${blend.casing || 'Unknown'}
Current topping: ${blend.topping || 'Unknown'}
Current cut: ${blend.cut || 'Unknown'}
Current strength: ${blend.strength || 'Unknown'}
Flavor notes: ${blend.flavor_notes?.join(', ') || 'None'}

Canonical rules:
- Cavendish is not inherently aromatic.
- Cavendish is not inherently non-aromatic.
- Virginia/Burley are not inherently non-aromatic.
- Perique alone is not VaPer.
- Navy Flake is not inherently VaPer.
- Natural tasting notes do not prove topping.
- Generic casing/topping does not automatically define aromatic family.
- Respect explicit contradictory evidence (e.g. explicit is_aromatic=false must not be overridden by weak clues).
- Return unknown/null rather than guessing.

Return fields:
- blend_type (must be one of: ${blendTypeEnum.join(', ')})
- blend_family (normalized family label such as aromatic, english, balkan, vaper, virginia, burley, darkFired, lakeland, unknown)
- tobacco_components (array of leaf components, empty if unknown)
- is_aromatic (true/false/null)
- aromatic_intensity (light/medium/heavy/null)
- casing (string or null)
- topping (string or null)
- cut (string or null)
- strength (string or null)
- classification_confidence (high/medium/low)
- classification_source (short string explaining evidence source)`,
          response_json_schema: {
            type: 'object',
            required: ['blend_type'],
            properties: {
              blend_type: { type: 'string' },
              blend_family: { type: ['string', 'null'] },
              tobacco_components: {
                type: 'array',
                items: { type: 'string' },
              },
              is_aromatic: { type: ['boolean', 'null'] },
              aromatic_intensity: { type: ['string', 'null'] },
              casing: { type: ['string', 'null'] },
              topping: { type: ['string', 'null'] },
              cut: { type: ['string', 'null'] },
              strength: { type: ['string', 'null'] },
              classification_confidence: { type: ['string', 'null'] },
              classification_source: { type: ['string', 'null'] },
            },
          },
        });

        if (result && typeof result === 'object') {
          const payload: Record<string, unknown> = {};
          if (result?.blend_type && blendTypeEnum.includes(result.blend_type)) {
            payload.blend_type = result.blend_type;
          }
          if (typeof result?.blend_family === 'string' && result.blend_family.trim()) {
            payload.blend_family = result.blend_family;
          }
          if (typeof result?.is_aromatic === 'boolean') {
            const existingExplicit = typeof blend?.is_aromatic === 'boolean';
            const contradictsExplicit = existingExplicit && blend.is_aromatic !== result.is_aromatic;
            if (!contradictsExplicit) {
              payload.is_aromatic = result.is_aromatic;
            }
          }
          if (typeof result?.aromatic_intensity === 'string' && result.aromatic_intensity.trim()) {
            payload.aromatic_intensity = result.aromatic_intensity;
          }
          if (typeof result?.casing === 'string' && result.casing.trim()) {
            payload.casing = result.casing;
          }
          if (typeof result?.topping === 'string' && result.topping.trim()) {
            payload.topping = result.topping;
          }
          if (typeof result?.cut === 'string' && result.cut.trim()) {
            payload.cut = result.cut;
          }
          if (typeof result?.strength === 'string' && result.strength.trim()) {
            payload.strength = result.strength;
          }
          if (typeof result?.classification_confidence === 'string' && ['high', 'medium', 'low'].includes(result.classification_confidence.toLowerCase())) {
            payload.classification_confidence = result.classification_confidence.toLowerCase();
          }
          if (typeof result?.classification_source === 'string' && result.classification_source.trim()) {
            payload.classification_source = result.classification_source;
          } else if (Object.keys(payload).length > 0) {
            payload.classification_source = 'reclassifyTobaccoBlends';
          }
          if (Array.isArray(result.tobacco_components)) {
            const shouldPersistUnknownComponents = result.tobacco_components.length === 0 && !Array.isArray(blend?.tobacco_components);
            const hasMeaningfulComponents = result.tobacco_components.length > 0;
            if (shouldPersistUnknownComponents || hasMeaningfulComponents) {
            payload.tobacco_components = result.tobacco_components;
            }
          }
          if (Object.keys(payload).length > 0) {
            await base44.entities.TobaccoBlend.update(blend.id, payload);
            updated++;
          }
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