import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Build comprehensive collector context for Curator across all modules
 * Includes pipe preferences, tobacco preferences, whiskey preferences, usage stats
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question } = await req.json();

    // Fetch user profile
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    const profile = profiles[0];

    // Fetch collection data
    // The pipe and blend lists feed the usage comparison below, which depends on a
    // per-item count the query cannot express.
    const pipes = await base44.entities.Pipe.filter({});
    const blends = await base44.entities.TobaccoBlend.filter({});
    const logs = await base44.entities.SmokingLog.filter({});

    // Sizes come straight from the read
    const pipeCount = await base44.entities.Pipe.count({});
    const blendCount = await base44.entities.TobaccoBlend.count({});
    const bottleCount = await base44.entities.Bottle.count({});

    // Calculate usage stats
    const pipeUsage = {};
    const blendUsage = {};
    logs.forEach(log => {
      pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + 1;
      blendUsage[log.blend_id] = (blendUsage[log.blend_id] || 0) + 1;
    });

    // Find favorites and highest-rated in the query itself
    const favoritePipesPage = await base44.entities.Pipe.filter({ is_favorite: true }, { limit: 3 });
    const favoriteBlendsPage = await base44.entities.TobaccoBlend.filter({ is_favorite: true }, { sort: '-rating', limit: 3 });
    const favoriteBottlesPage = await base44.entities.Bottle.filter({ favorite: true }, { sort: '-rating', limit: 3 });
    const favoritePipes = Array.isArray(favoritePipesPage) ? favoritePipesPage : (favoritePipesPage?.items || []);
    const favoriteBlends = Array.isArray(favoriteBlendsPage) ? favoriteBlendsPage : (favoriteBlendsPage?.items || []);
    const favoriteBottles = Array.isArray(favoriteBottlesPage) ? favoriteBottlesPage : (favoriteBottlesPage?.items || []);

    // Identify underused items
    const avgPipeUsage = logs.length / Math.max(pipeCount, 1);
    const avgBlendUsage = logs.length / Math.max(blendCount, 1);
    const underusedPipes = pipes.filter(p => (pipeUsage[p.id] || 0) < avgPipeUsage * 0.3);
    const underusedBlends = blends.filter(b => (blendUsage[b.id] || 0) < avgBlendUsage * 0.3);

    // Build context for Curator
    const context = {
      collectionSize: {
        pipes: pipeCount,
        blends: blendCount,
        bottles: bottleCount,
        totalSessions: logs.length,
      },
      userPreferences: {
        pipeShapes: profile?.preferred_shapes || [],
        blendTypes: profile?.preferred_blend_types || [],
        whiskyTypes: profile?.whiskey_preferences?.types || [],
        whiskyFlavors: profile?.whiskey_preferences?.flavors || [],
        strengthPreference: profile?.strength_preference || 'No Preference',
        clenching: profile?.clenching_preference || 'No Preference',
        smokeDuration: profile?.smoke_duration_preference || 'No Preference',
      },
      topItems: {
        favoritePipes: favoritePipes.slice(0, 3).map(p => ({ name: p.name, rating: p.rating })),
        favoriteBlends: favoriteBlends.slice(0, 3).map(b => ({ name: b.name, rating: b.rating })),
        favoriteBottles: favoriteBottles.slice(0, 3).map(b => ({ name: b.name, rating: b.rating })),
      },
      underusedItems: {
        pipes: underusedPipes.slice(0, 5).map(p => ({ name: p.name, uses: pipeUsage[p.id] || 0 })),
        blends: underusedBlends.slice(0, 5).map(b => ({ name: b.name, uses: blendUsage[b.id] || 0 })),
      },
      question,
    };

    return Response.json(context);
  } catch (error) {
    console.error('Curator context error:', error);
    return Response.json(
      { error: error.message || 'Failed to build context' },
      { status: 500 }
    );
  }
});