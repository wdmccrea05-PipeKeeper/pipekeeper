import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_email, signals } = body;

    // Users can only update their own profile
    if (user.role !== 'admin' && user_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetEmail = user_email || user.email;

    // Get or create profile
    const existing = await base44.entities.CollectorIntelligenceProfile.filter({
      user_email: targetEmail,
    });

    const profile = existing[0] || {
      preferred_tobacco_families: [],
      preferred_pipe_shapes: [],
      flavor_preferences: [],
      dislikes: [],
      collection_goals: [],
      exploration_score: 5,
      cellar_maturity_score: 5,
      recommendation_confidence: 5,
      collectible_bias: 'balanced',
      expertise_level: 'intermediate',
      signal_count: 0,
    };

    // Process signals
    for (const signal of signals || []) {
      switch (signal.signal_type) {
        case 'preference_stated':
          if (!profile.preferred_tobacco_families.includes(signal.signal_value)) {
            profile.preferred_tobacco_families.push(signal.signal_value);
          }
          break;
        case 'dislike_stated':
          if (!profile.dislikes.includes(signal.signal_value)) {
            profile.dislikes.push(signal.signal_value);
          }
          break;
        case 'goal_identified':
          if (!profile.collection_goals.includes(signal.signal_value)) {
            profile.collection_goals.push(signal.signal_value);
          }
          break;
      }
    }

    profile.signal_count = (profile.signal_count || 0) + (signals?.length || 0);
    profile.last_updated = new Date().toISOString();

    // Upsert profile
    if (existing[0]) {
      await base44.asServiceRole.entities.CollectorIntelligenceProfile.update(existing[0].id, profile);
    } else {
      await base44.entities.CollectorIntelligenceProfile.create({
        created_by: targetEmail,
        user_email: targetEmail,
        ...profile,
      });
    }

    return Response.json({ success: true, profile });
  } catch (error) {
    console.error('updateCollectorIntelligenceProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});