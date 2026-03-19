import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { query, recordType, recordData } = body;

    if (!query || !query.trim()) {
      return Response.json({ results: [], error: 'Empty query' }, { status: 400 });
    }

    // Build context-aware search prompt
    let searchPrompt = query.trim();
    let sourceHint = 'whisky merchants like thewhiskyexchange.com, masterofmalt.com, totalwine.com';

    if (recordType === 'pipe') {
      const parts = [
        recordData?.maker,
        recordData?.name,
        recordData?.shape,
        recordData?.finish,
        recordData?.bowl_material,
        'pipe',
      ].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
      searchPrompt = parts.join(' ') || query;
      sourceHint = 'pipe retailers like smokingpipes.com, cupojoes.com, pipesandcigars.com, 4noggins.com, pipeandleaf.com';
    } else if (recordType === 'tobacco' || recordType === 'blend') {
      const parts = [
        recordData?.manufacturer,
        recordData?.name,
        recordData?.blend_type,
        'pipe tobacco',
      ].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
      searchPrompt = parts.join(' ') || query;
      sourceHint = 'tobacco retailers like smokingpipes.com, tobaccopipes.com, cupojoes.com, 4noggins.com';
    } else if (recordType === 'bottle') {
      const parts = [
        recordData?.name,
        recordData?.distillery,
        recordData?.type,
        recordData?.region,
        recordData?.country,
        recordData?.bottle_type === 'wine' ? 'wine bottle product photo' : 'whiskey bottle product photo',
      ].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
      searchPrompt = parts.join(' ') || query;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find real product image URLs for: "${searchPrompt}".
Return a JSON object with a "results" array of 6-8 image results. Each result must have:
- "url": a direct image URL (jpg/png/webp) from a reliable source like ${sourceHint}
- "title": a short descriptive title
- "source": the domain name

Only return URLs that are likely to be real, publicly accessible product photos.
Prefer official product photography over editorial images.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const rawResults = result?.results || [];

    const normalized = rawResults
      .filter(r => typeof r?.url === 'string' && r.url.trim())
      .map((r, i) => ({
        id: `result-${i}`,
        image: r.url.trim(),
        image_url: r.url.trim(),
        url: r.url.trim(),
        thumbnail: r.url.trim(),
        title: r.title || `Image ${i + 1}`,
        source: r.source || '',
      }));

    return Response.json({ results: normalized });
  } catch (error) {
    console.error('[searchRecordImages] error:', error);
    return Response.json({ error: error.message, results: [] }, { status: 500 });
  }
});