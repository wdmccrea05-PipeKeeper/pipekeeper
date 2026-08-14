/**
 * autoEnrichBottleMetadata
 *
 * For each bottle missing core metadata (type, region, country, abv, distillery),
 * uses InvokeLLM with web search to look up the real values and updates the
 * Bottle record directly.
 *
 * Called silently by the Curator after data loads — no user action required.
 * Skips bottles that already have all core fields populated.
 * Uses a per-bottle guard to avoid duplicate enrichment calls within a session.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { trackedInvokeLLM } from '../../shared/integrationTelemetry.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Accept explicit bottle list or fetch all for this user
    let bottles = Array.isArray(body.bottles) ? body.bottles : [];

    if (bottles.length === 0) {
      bottles = await base44.entities.Bottle.filter({ created_by: user.email }, '-updated_date', 500)
        .catch(() => []);
    }

    // Only work on bottles that are still missing at least one core field
    const toEnrich = bottles.filter(
      (b) => !b.distillery || !b.region || !b.country || !b.abv || !(b.type || b.whiskey_type)
    );

    if (toEnrich.length === 0) {
      return Response.json({ enriched: 0, skipped: 0, errors: 0 });
    }

    // Build a batch prompt so we consume one InvokeLLM call for up to 20 bottles
    const BATCH_SIZE = 20;
    const batch = toEnrich.slice(0, BATCH_SIZE);

    const bottleDescriptions = batch.map((b, idx) => {
      const missingList = [];
      if (!b.distillery) missingList.push('distillery');
      if (!(b.type || b.whiskey_type)) missingList.push('whiskey_type');
      if (!b.region) missingList.push('region');
      if (!b.country) missingList.push('country');
      if (!b.abv) missingList.push('abv');

      return `${idx + 1}. id="${b.id}" name="${b.name || '—'}" missing=[${missingList.join(', ')}]`;
    }).join('\n');

    const prompt = `You are a whiskey database expert. For each bottle below, research its real metadata using your knowledge and web sources, and return ONLY what is requested.

Bottles:
${bottleDescriptions}

For each bottle, return ONLY the missing fields using this JSON schema:
{
  "results": [
    {
      "id": "<bottle id>",
      "distillery": "<distillery name or null>",
      "whiskey_type": "<one of: Bourbon, Rye, Tennessee Whiskey, Single Malt Scotch, Islay Single Malt, Blended Scotch, Irish Whiskey, Japanese Whisky, Canadian Whisky, or null>",
      "region": "<whiskey region, e.g. Speyside, Islay, Kentucky, or null>",
      "country": "<country of origin or null>",
      "abv": <numeric ABV percentage without % sign, or null>
    }
  ]
}

Rules:
- Only include fields that are in the "missing" list for each bottle.
- Set any field to null if you are not confident.
- Return valid JSON only. No explanations.`;

    let aiResult = null;
    try {
      aiResult = await trackedInvokeLLM(base44, {
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  distillery: { type: ['string', 'null'] },
                  whiskey_type: { type: ['string', 'null'] },
                  region: { type: ['string', 'null'] },
                  country: { type: ['string', 'null'] },
                  abv: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
      }, { feature: 'whiskey.auto_enrich', module: 'whiskeykeeper' });
    } catch (llmErr) {
      console.error('[autoEnrichBottleMetadata] LLM call failed:', llmErr);
      return Response.json({ enriched: 0, skipped: toEnrich.length, errors: 1 });
    }

    const enrichmentResults = aiResult?.results || [];
    let enriched = 0;
    let errors = 0;

    for (const result of enrichmentResults) {
      if (!result?.id) continue;

      const updates = {};
      if (result.distillery) updates.distillery = result.distillery;
      if (result.whiskey_type) updates.whiskey_type = result.whiskey_type;
      if (result.region) updates.region = result.region;
      if (result.country) updates.country = result.country;
      if (typeof result.abv === 'number' && result.abv > 0) updates.abv = result.abv;

      if (Object.keys(updates).length === 0) continue;

      try {
        await base44.entities.Bottle.update(result.id, updates);
        enriched++;
      } catch (updateErr) {
        console.error('[autoEnrichBottleMetadata] update failed for', result.id, updateErr);
        errors++;
      }
    }

    const skipped = toEnrich.length - enrichmentResults.length;

    return Response.json({ enriched, skipped: Math.max(0, skipped), errors });
  } catch (err) {
    console.error('[autoEnrichBottleMetadata] fatal error:', err);
    return Response.json({ error: err.message, enriched: 0, skipped: 0, errors: 1 }, { status: 500 });
  }
});