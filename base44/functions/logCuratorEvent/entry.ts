import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      event_type,
      session_id,
      recommendation_id,
      recommendation_context,
      collection_context,
      metadata,
    } = body;

    if (!event_type) {
      return Response.json({ error: 'event_type required' }, { status: 400 });
    }

    // Create event record
    const event = await base44.entities.CuratorEvent.create({
      created_by: user.email,
      user_email: user.email,
      event_type,
      session_id: session_id || null,
      recommendation_id: recommendation_id || null,
      recommendation_context: recommendation_context || null,
      collection_context: collection_context || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
    });

    // Update daily metrics (upsert pattern)
    const today = new Date().toISOString().split('T')[0];
    const existing = await base44.entities.DailyUserMetrics.filter({
      created_by: user.email,
      date: today,
      user_email: user.email,
    });

    const current = existing[0] || {
      curator_sessions: 0,
      curator_messages: 0,
      recommendations_shown: 0,
      recommendations_clicked: 0,
      recommendations_accepted: 0,
      items_added: 0,
      items_edited: 0,
      exports_generated: 0,
      valuations_viewed: 0,
      collectible_toggles: 0,
    };

    const updates = { ...current };

    // Increment appropriate counter
    switch (event_type) {
      case 'curator_opened':
        updates.curator_sessions = (current.curator_sessions || 0) + 1;
        break;
      case 'curator_message_sent':
        updates.curator_messages = (current.curator_messages || 0) + 1;
        break;
      case 'recommendation_shown':
        updates.recommendations_shown = (current.recommendations_shown || 0) + 1;
        break;
      case 'recommendation_clicked':
      case 'recommendation_explored':
        updates.recommendations_clicked = (current.recommendations_clicked || 0) + 1;
        break;
      case 'recommendation_accepted':
        updates.recommendations_accepted = (current.recommendations_accepted || 0) + 1;
        break;
      case 'collection_item_added':
        updates.items_added = (current.items_added || 0) + 1;
        break;
      case 'collection_item_edited':
        updates.items_edited = (current.items_edited || 0) + 1;
        break;
      case 'export_generated':
        updates.exports_generated = (current.exports_generated || 0) + 1;
        break;
      case 'valuation_viewed':
        updates.valuations_viewed = (current.valuations_viewed || 0) + 1;
        break;
      case 'collectible_only_toggled':
        updates.collectible_toggles = (current.collectible_toggles || 0) + 1;
        break;
    }

    // Get subscription tier
    const subs = await base44.entities.Subscription.filter({
      user_email: user.email.toLowerCase(),
      status: 'active',
    });
    const tier = subs[0]?.tier || 'free';

    if (existing[0]) {
      await base44.asServiceRole.entities.DailyUserMetrics.update(existing[0].id, {
        ...updates,
        subscription_tier: tier,
      });
    } else {
      await base44.entities.DailyUserMetrics.create({
        created_by: user.email,
        date: today,
        user_email: user.email,
        ...updates,
        subscription_tier: tier,
      });
    }

    return Response.json({ success: true, event_id: event.id });
  } catch (error) {
    console.error('logCuratorEvent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});