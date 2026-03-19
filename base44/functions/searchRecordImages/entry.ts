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

    // Build a targeted search prompt for the LLM to generate image search results
    let searchPrompt;
    if (recordType === 'bottle') {
      const parts = [
        recordData?.name,
        recordData?.distillery,
        recordData?.type,
        recordData?.region,
        recordData?.country,
        recordData?.bottle_type === 'wine' ? 'wine bottle product photo' : 'whiskey bottle product photo',
      ].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
      searchPrompt = parts.join(' ') || query;
    } else {
      searchPrompt = query;
    }

    // Use InvokeLLM with internet search to find product image URLs
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find real product image URLs for: "${searchPrompt}".
Return a JSON array of 6-8 image results. Each result must have:
- "url": a direct image URL (jpg/png/webp) from a reliable source like distillery websites, wine merchants, whiskybase.com, masterofmalt.com, thewhiskyexchange.com, totalwine.com, or similar
- "title": a short descriptive title
- "source": the domain name

Only return URLs that are likely to be real, publicly accessible product photos.
Prefer official product photography over editorial images.
Return ONLY the JSON array, no other text.`,
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

    // Normalize to expected shape
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