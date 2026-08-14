import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { trackIntegrationEvent, classifyIntegrationError } from '../../shared/integrationTelemetry.ts';

// Batch size: 10 blends per LLM call. Chosen based on prompt complexity
// (each blend has 10+ context fields) and response schema size.
// Larger batches risk response truncation; smaller batches waste credits.
const BATCH_SIZE = 10;

Deno.serve(async (req) => {
  const startedAt = Date.now();
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
      return Response.json({ message: 'No blends to classify', updated: 0, llmCalls: 0 });
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

    const toReclassify = blends.filter(needsStructuredClassification);
    if (toReclassify.length === 0) {
      return Response.json({ message: 'All blends already classified', updated: 0, llmCalls: 0 });
    }

    let updated = 0;
    let llmCallCount = 0;
    const errors: Array<{ batch: number; error: string }> = [];

    // ── Process in batches ──────────────────────────────────────────────────
    for (let batchStart = 0; batchStart < toReclassify.length; batchStart += BATCH_SIZE) {
      const batch = toReclassify.slice(batchStart, batchStart + BATCH_SIZE);
      const batchStartTime = Date.now();

      try {
        // Build a single prompt for the batch
        const blendDescriptions = batch.map((blend: any, idx: number) => {
          return `[${idx}] ID: ${blend.id}
Name: "${blend.name}"
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
Flavor notes: ${blend.flavor_notes?.join(', ') || 'None'}`;
        }).join('\n\n');

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Classify these pipe tobacco blends and return structured taxonomy for each.

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

Blends to classify:

${blendDescriptions}

Return a JSON object with a "results" array. Each element must have:
- id: the blend ID string (must match the input ID exactly)
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
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
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
              },
            },
          },
        });

        llmCallCount++;

        await trackIntegrationEvent(base44, {
          feature: 'blend.reclassification',
          operation: 'InvokeLLM',
          module: 'pipekeeper',
          success: true,
          durationMs: Date.now() - batchStartTime,
          batchSize: batch.length,
          invocationCount: 1,
          userId: user?.id,
          email: user?.email,
          backendFunction: 'reclassifyTobaccoBlends',
          triggerContext: 'user_action',
        });

        // Process each result — associate by ID
        const results = result?.results || [];
        for (const res of results) {
          const blend = batch.find((b: any) => b.id === res.id);
          if (!blend) continue;

          const payload: Record<string, unknown> = {};
          if (res?.blend_type && blendTypeEnum.includes(res.blend_type)) {
            payload.blend_type = res.blend_type;
          }
          if (typeof res?.blend_family === 'string' && res.blend_family.trim()) {
            payload.blend_family = res.blend_family;
          }
          if (typeof res?.is_aromatic === 'boolean') {
            const existingExplicit = typeof blend?.is_aromatic === 'boolean';
            const contradictsExplicit = existingExplicit && blend.is_aromatic !== res.is_aromatic;
            if (!contradictsExplicit) {
              payload.is_aromatic = res.is_aromatic;
            }
          }
          if (typeof res?.aromatic_intensity === 'string' && res.aromatic_intensity.trim()) {
            payload.aromatic_intensity = res.aromatic_intensity;
          }
          if (typeof res?.casing === 'string' && res.casing.trim()) {
            payload.casing = res.casing;
          }
          if (typeof res?.topping === 'string' && res.topping.trim()) {
            payload.topping = res.topping;
          }
          if (typeof res?.cut === 'string' && res.cut.trim()) {
            payload.cut = res.cut;
          }
          if (typeof res?.strength === 'string' && res.strength.trim()) {
            payload.strength = res.strength;
          }
          if (typeof res?.classification_confidence === 'string' && ['high', 'medium', 'low'].includes(res.classification_confidence.toLowerCase())) {
            payload.classification_confidence = res.classification_confidence.toLowerCase();
          }
          if (typeof res?.classification_source === 'string' && res.classification_source.trim()) {
            payload.classification_source = res.classification_source;
          } else if (Object.keys(payload).length > 0) {
            payload.classification_source = 'reclassifyTobaccoBlends';
          }
          if (Array.isArray(res.tobacco_components)) {
            const shouldPersistUnknownComponents = res.tobacco_components.length === 0 && !Array.isArray(blend?.tobacco_components);
            const hasMeaningfulComponents = res.tobacco_components.length > 0;
            if (shouldPersistUnknownComponents || hasMeaningfulComponents) {
              payload.tobacco_components = res.tobacco_components;
            }
          }
          if (Object.keys(payload).length > 0) {
            try {
              await base44.entities.TobaccoBlend.update(blend.id, payload);
              updated++;
            } catch (updateErr) {
              // One blend update failure doesn't invalidate others in the batch
              errors.push({ batch: batchStart / BATCH_SIZE, error: `Update failed for ${blend.id}: ${updateErr.message}` });
            }
          }
        }
      } catch (err) {
        // One batch failure doesn't invalidate other batches — continue
        const category = classifyIntegrationError(err);
        errors.push({ batch: batchStart / BATCH_SIZE, error: err.message });

        await trackIntegrationEvent(base44, {
          feature: 'blend.reclassification',
          operation: 'InvokeLLM',
          module: 'pipekeeper',
          success: false,
          durationMs: Date.now() - batchStartTime,
          errorCategory: category,
          errorMessage: err?.message,
          batchSize: batch.length,
          invocationCount: 1,
          userId: user?.id,
          email: user?.email,
          backendFunction: 'reclassifyTobaccoBlends',
          triggerContext: 'user_action',
        });
      }
    }

    return Response.json({
      message: `Reclassified ${updated} blends`,
      updated,
      llmCalls: llmCallCount,
      totalBlends: toReclassify.length,
      batches: Math.ceil(toReclassify.length / BATCH_SIZE),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});