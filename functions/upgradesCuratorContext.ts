import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
    const pipes = await base44.entities.Pipe.filter({});
    const blends = await base44.entities.TobaccoBlend.filter({});
    const bottles = await base44.entities.Bottle.filter({});
    const logs = await base44.entities.SmokingLog.filter({});

    // Calculate usage stats
    const pipeUsage = {};
    const blendUsage = {};
    logs.forEach(log => {
      pipeUsage[log.pipe_id] = (pipeUsage[log.pipe_id] || 0) + 1;
      blendUsage[log.blend_id] = (blendUsage[log.blend_id] || 0) + 1;
    });

    // Find favorites and highest-rated
    const favoritePipes = pipes.filter(p => p.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const favoriteBlends = blends.filter(b => b.is_favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const favoriteBottles = bottles.filter(b => b.favorite).sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Identify underused items
    const avgPipeUsage = logs.length / Math.max(pipes.length, 1);
    const avgBlendUsage = logs.length / Math.max(blends.length, 1);
    const underusedPipes = pipes.filter(p => (pipeUsage[p.id] || 0) < avgPipeUsage * 0.3);
    const underusedBlends = blends.filter(b => (blendUsage[b.id] || 0) < avgBlendUsage * 0.3);

    // Build context for Curator
    const context = {
      collectionSize: {
        pipes: pipes.length,
        blends: blends.length,
        bottles: bottles.length,
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