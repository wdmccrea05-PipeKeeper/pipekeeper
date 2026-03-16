import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch collection data (user-scoped)
    const pipes = await base44.entities.Pipe.filter({ created_by: user.email });
    const blends = await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    const bottles = await base44.entities.Bottle.filter({ created_by: user.email });
    const logs = await base44.entities.SmokingLog.filter({ created_by: user.email });

    // Ensure arrays
    const pipesList = Array.isArray(pipes) ? pipes : [];
    const blendsList = Array.isArray(blends) ? blends : [];
    const bottlesList = Array.isArray(bottles) ? bottles : [];
    const logsList = Array.isArray(logs) ? logs : [];

    // Calculate collection metrics
    const totalValue = pipesList.reduce((sum, p) => sum + (p.estimated_value || 0), 0) +
                      blendsList.reduce((sum, b) => sum + (b.manual_market_value || b.ai_estimated_value || 0), 0) +
                      bottlesList.reduce((sum, b) => sum + (b.average_market_value || b.collector_value || 0), 0);

    const favorites = {
      pipe: pipesList.filter(p => p.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      blend: blendsList.filter(b => b.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
      bottle: bottlesList.filter(b => b.favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0))[0],
    };

    // Find most used pipe
    const pipeUsage = {};
    logsList.forEach(log => {
      pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + 1;
    });
    const mostUsedPipe = pipesList.find(p => pipeUsage[p.id] === Math.max(...Object.values(pipeUsage), 0));

    // Find underused items
    const avgPipeUsage = logsList.length / Math.max(pipesList.length, 1);
    const underusedPipes = pipesList.filter(p => (pipeUsage[p.id] || 0) < avgPipeUsage * 0.3);

    // Flavor patterns
    const blendTypes = {};
    blendsList.forEach(b => {
      blendTypes[b.blend_type] = (blendTypes[b.blend_type] || 0) + 1;
    });
    const dominantBlendType = Object.entries(blendTypes).sort((a, b) => b[1] - a[1])[0]?.[0];

    const whiskyTypes = {};
    bottlesList.forEach(b => {
      whiskyTypes[b.type] = (whiskyTypes[b.type] || 0) + 1;
    });
    const dominantWhiskyType = Object.entries(whiskyTypes).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Calculate pairing patterns
    const pairingPatterns = {};
    logsList.forEach(log => {
      const blend = blendsList.find(b => b.id === log.blend_id);
      if (blend) {
        const key = blend.blend_type || 'unknown';
        pairingPatterns[key] = (pairingPatterns[key] || 0) + 1;
      }
    });

    // Find most valuable item
    const allItems = [
      ...pipesList.map(p => ({ ...p, type: 'pipe', value: p.estimated_value || 0 })),
      ...blendsList.map(b => ({ ...b, type: 'blend', value: b.manual_market_value || b.ai_estimated_value || 0 })),
      ...bottlesList.map(b => ({ ...b, type: 'bottle', value: b.average_market_value || b.collector_value || 0 })),
    ];
    const mostValuable = allItems.sort((a, b) => b.value - a.value)[0];

    // Generate narrative
    const collectionSize = {
      pipes: pipesList.length,
      blends: blendsList.length,
      bottles: bottlesList.length,
    };

    let narrative = `You've built a thoughtful collection of ${collectionSize.pipes} pipe${collectionSize.pipes !== 1 ? 's' : ''}, ${collectionSize.blends} blend${collectionSize.blends !== 1 ? 's' : ''}, and ${collectionSize.bottles} bottle${collectionSize.bottles !== 1 ? 's' : ''}. `;

    if (dominantBlendType && dominantWhiskyType) {
      narrative += `Your tastes lean toward ${dominantBlendType.toLowerCase()} tobaccos paired with ${dominantWhiskyType.toLowerCase()}s. `;
    }

    if (mostUsedPipe) {
      narrative += `Your most-reached-for pipe is the ${mostUsedPipe.name}. `;
    }

    if (underusedPipes.length > 0) {
      narrative += `You have ${underusedPipes.length} pipe${underusedPipes.length !== 1 ? 's' : ''} waiting for more attention. `;
    }

    if (mostValuable) {
      narrative += `Your crown jewel is the ${mostValuable.name}, valued at $${Math.round(mostValuable.value)}.`;
    }

    const story = {
      narrative,
      metrics: {
        totalValue: Math.round(totalValue),
        pipes: collectionSize.pipes,
        blends: collectionSize.blends,
        bottles: collectionSize.bottles,
        totalSessions: logs.length,
      },
      highlights: {
        mostUsedPipe: mostUsedPipe ? { name: mostUsedPipe.name, id: mostUsedPipe.id, uses: pipeUsage[mostUsedPipe.id] } : null,
        favoritePipe: favorites.pipe ? { name: favorites.pipe.name, id: favorites.pipe.id, rating: favorites.pipe.rating } : null,
        favoriteBlend: favorites.blend ? { name: favorites.blend.name, id: favorites.blend.id, rating: favorites.blend.rating } : null,
        favoriteBottle: favorites.bottle ? { name: favorites.bottle.name, id: favorites.bottle.id, rating: favorites.bottle.rating } : null,
        mostValuableItem: mostValuable ? { name: mostValuable.name, id: mostValuable.id, type: mostValuable.type, value: Math.round(mostValuable.value) } : null,
        underusedCount: underusedPipes.length,
        dominantBlendType,
        dominantWhiskyType,
      },
    };

    return Response.json(story);
  } catch (error) {
    console.error('Story generation error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate story' },
      { status: 500 }
    );
  }
});