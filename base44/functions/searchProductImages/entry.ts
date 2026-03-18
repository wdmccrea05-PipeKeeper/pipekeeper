import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function dedupeUrls(urls: string[] = []) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const url of urls) {
    const clean = String(url || '').trim();
    if (!clean || seen.has(clean)) continue;
    if (!clean.startsWith('http')) continue;
    if (clean.includes('placeholder')) continue;
    seen.add(clean);
    out.push(clean);
  }

  return out;
}

function getFallbackImages(recordType: string) {
  const fallbacks: Record<string, string[]> = {
    pipe: [
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    ],
    blend: [
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
    ],
    bottle: [
      'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800&q=80',
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
      'https://images.unsplash.com/photo-1575650772417-e6b418b0d5f6?w=800&q=80',
    ],
  };

  return fallbacks[recordType] || fallbacks.bottle;
}

function buildSearchQuery(query: string, recordType: string) {
  const base = String(query || '').trim();

  if (recordType === 'pipe') return `${base} tobacco pipe product photo`;
  if (recordType === 'blend') return `${base} tobacco tin label`;
  if (recordType === 'bottle') return `${base} whiskey bottle product photo front label`;

  return base;
}

function pickCandidateUrls(item: any): string[] {
  return [
    item?.contentUrl,
    item?.thumbnailUrl,
    item?.hostPageDisplayUrl,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query = String(body?.query || '').trim();
    const recordType = String(body?.recordType || 'bottle').trim().toLowerCase();
    const limit = Math.min(Math.max(Number(body?.limit || 12), 1), 24);

    if (!query) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    const bingKey = Deno.env.get('BING_SEARCH_KEY');
    if (!bingKey) {
      return Response.json({
        images: getFallbackImages(recordType).slice(0, limit),
        count: Math.min(getFallbackImages(recordType).length, limit),
        source: 'fallback_no_key',
      });
    }

    const searchQuery = buildSearchQuery(query, recordType);

    const bingResponse = await fetch(
      `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(searchQuery)}&count=${limit * 2}&imageType=Photo&mkt=en-US&safeSearch=Moderate`,
      {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': bingKey,
        },
      }
    );

    if (!bingResponse.ok) {
      const text = await bingResponse.text().catch(() => '');
      console.error('[searchProductImages] Bing error:', bingResponse.status, text);

      return Response.json({
        images: getFallbackImages(recordType).slice(0, limit),
        count: Math.min(getFallbackImages(recordType).length, limit),
        source: 'fallback_bing_error',
      });
    }

    const data = await bingResponse.json();
    const rawItems = Array.isArray(data?.value) ? data.value : [];

    const imageUrls = dedupeUrls(
      rawItems
        .filter((img: any) => {
          const width = Number(img?.width || 0);
          const height = Number(img?.height || 0);
          return width >= 200 && height >= 200;
        })
        .flatMap((img: any) => pickCandidateUrls(img))
    ).slice(0, limit);

    const finalImages = imageUrls.length
      ? imageUrls
      : getFallbackImages(recordType).slice(0, limit);

    return Response.json({
      images: finalImages,
      count: finalImages.length,
      source: imageUrls.length ? 'bing' : 'fallback_empty',
      query: searchQuery,
    });
  } catch (error) {
    console.error('[searchProductImages] fatal error:', error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to search images',
      },
      { status: 500 }
    );
  }
});
