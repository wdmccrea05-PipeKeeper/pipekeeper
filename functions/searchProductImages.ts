import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, recordType, limit = 12 } = await req.json();

    if (!query || query.trim().length === 0) {
      return Response.json({ error: 'Query required' }, { status: 400 });
    }

    // Use Bing Image Search API for fast, reliable product image results
    // Format query with record type hints for better relevance
    let searchQuery = query.trim();
    if (recordType === 'pipe') {
      searchQuery += ' tobacco pipe product photo';
    } else if (recordType === 'blend') {
      searchQuery += ' tobacco tin label';
    } else if (recordType === 'bottle') {
      searchQuery += ' whiskey bottle product photo';
    }

    // Fetch images from Bing
    const bingResponse = await fetch(
      `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(searchQuery)}&count=${Math.min(limit, 50)}&imageType=Photo&mkt=en-US`,
      {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': Deno.env.get('BING_SEARCH_KEY') || '',
        },
      }
    );

    if (!bingResponse.ok) {
      // Fallback: return curated fallback images if API fails
      return Response.json({
        images: getFallbackImages(recordType),
        source: 'fallback'
      });
    }

    const data = await bingResponse.json();
    const images = (data.value || [])
      .filter(img => {
        // Filter for reasonable image dimensions (exclude very small thumbnails)
        return img.width > 150 && img.height > 150;
      })
      .slice(0, limit)
      .map(img => img.contentUrl)
      .filter(url => {
        // Filter out obvious placeholder/bad URLs
        return url && url.startsWith('http') && !url.includes('placeholder');
      });

    return Response.json({
      images: images.length > 0 ? images : getFallbackImages(recordType),
      count: images.length,
      source: images.length > 0 ? 'bing' : 'fallback',
    });
  } catch (error) {
    console.error('Image search error:', error);
    return Response.json(
      { error: error.message || 'Failed to search images' },
      { status: 500 }
    );
  }
});

// Fallback curated images when API is unavailable
function getFallbackImages(recordType) {
  const fallbacks = {
    pipe: [
      'https://images.unsplash.com/photo-1599888868898-cb6a6f0d0b6d?w=400&q=80', // tobacco pipes
      'https://images.unsplash.com/photo-1610738313506-9c7ab8117e48?w=400&q=80',
      'https://images.unsplash.com/photo-1599888868858-9b6f5edb2d5b?w=400&q=80',
    ],
    blend: [
      'https://images.unsplash.com/photo-1599888868858-9b6f5edb2d5b?w=400&q=80', // tobacco tins
      'https://images.unsplash.com/photo-1599888869093-cf5e6c10a13a?w=400&q=80',
      'https://images.unsplash.com/photo-1599888868858-9b6f5edb2d5b?w=400&q=80',
    ],
    bottle: [
      'https://images.unsplash.com/photo-1608403849541-bef2e6f1f1ba?w=400&q=80', // whiskey bottles
      'https://images.unsplash.com/photo-1608403849541-bef2e6f1f1ba?w=400&q=80',
      'https://images.unsplash.com/photo-1608403849541-bef2e6f1f1ba?w=400&q=80',
    ],
  };
  
  return fallbacks[recordType] || fallbacks.pipe;
}