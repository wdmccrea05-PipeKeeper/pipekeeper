import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { period_days = 7 } = body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period_days);
    const cutoffISO = cutoffDate.toISOString();

    // Get all events in period
    const events = await base44.asServiceRole.entities.CuratorEvent.filter(
      {},
      '-timestamp',
      5000
    );

    const recentEvents = events.filter(e => new Date(e.timestamp) >= cutoffDate);

    // Aggregate by recommendation key
    const byRecommendation = {};

    for (const event of recentEvents) {
      const key = event.recommendation_context?.titleKey || 'unknown';
      if (!byRecommendation[key]) {
        byRecommendation[key] = {
          recommendation_key: key,
          category: event.recommendation_context?.category || 'unknown',
          module: event.recommendation_context?.module || 'unknown',
          impressions: 0,
          clicks: 0,
          explores: 0,
          accepts: 0,
          dismisses: 0,
        };
      }

      const stats = byRecommendation[key];

      switch (event.event_type) {
        case 'recommendation_shown':
          stats.impressions++;
          break;
        case 'recommendation_clicked':
          stats.clicks++;
          break;
        case 'recommendation_explored':
          stats.explores++;
          break;
        case 'recommendation_accepted':
          stats.accepts++;
          break;
        case 'recommendation_dismissed':
          stats.dismisses++;
          break;
      }
    }

    // Calculate rates
    const recommendations = Object.values(byRecommendation).map(r => ({
      ...r,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions * 100).toFixed(2) : 0,
      explore_rate: r.impressions > 0 ? (r.explores / r.impressions * 100).toFixed(2) : 0,
      conversion_rate: r.impressions > 0 ? (r.accepts / r.impressions * 100).toFixed(2) : 0,
    }));

    // Overall stats
    const totalImpressions = recommendations.reduce((sum, r) => sum + r.impressions, 0);
    const totalExplores = recommendations.reduce((sum, r) => sum + r.explores, 0);
    const totalAccepts = recommendations.reduce((sum, r) => sum + r.accepts, 0);

    // Curator engagement
    const curatorSessions = recentEvents.filter(e => e.event_type === 'curator_opened').length;
    const curatorMessages = recentEvents.filter(e => e.event_type === 'curator_message_sent').length;

    // Get unique active users
    const activeUsers = new Set(recentEvents.map(e => e.user_email)).size;

    return Response.json({
      success: true,
      period_days,
      period_start: cutoffISO,
      period_end: new Date().toISOString(),
      overall: {
        active_users: activeUsers,
        curator_sessions: curatorSessions,
        curator_messages: curatorMessages,
        recommendations_shown: totalImpressions,
        recommendations_explored: totalExplores,
        recommendations_accepted: totalAccepts,
        overall_explore_rate: totalImpressions > 0 ? (totalExplores / totalImpressions * 100).toFixed(2) : 0,
        overall_conversion_rate: totalImpressions > 0 ? (totalAccepts / totalImpressions * 100).toFixed(2) : 0,
      },
      by_recommendation: recommendations.sort((a, b) => b.impressions - a.impressions),
    });
  } catch (error) {
    console.error('getRecommendationAnalytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});