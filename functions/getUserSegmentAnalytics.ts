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
    const { period_days = 30 } = body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period_days);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    // Get daily metrics for period
    const metrics = await base44.asServiceRole.entities.DailyUserMetrics.filter(
      {},
      '-date',
      10000
    );

    const recentMetrics = metrics.filter(m => m.date >= cutoffISO);

    // Aggregate by user
    const byUser = {};
    for (const metric of recentMetrics) {
      const email = metric.user_email;
      if (!byUser[email]) {
        byUser[email] = {
          user_email: email,
          total_curator_sessions: 0,
          total_curator_messages: 0,
          total_recommendations_shown: 0,
          total_recommendations_clicked: 0,
          total_recommendations_accepted: 0,
          total_items_added: 0,
          total_items_edited: 0,
          total_exports: 0,
          total_valuations: 0,
          total_collectible_toggles: 0,
          active_days: 0,
          last_tier: metric.subscription_tier || 'free',
        };
      }

      const u = byUser[email];
      u.total_curator_sessions += metric.curator_sessions || 0;
      u.total_curator_messages += metric.curator_messages || 0;
      u.total_recommendations_shown += metric.recommendations_shown || 0;
      u.total_recommendations_clicked += metric.recommendations_clicked || 0;
      u.total_recommendations_accepted += metric.recommendations_accepted || 0;
      u.total_items_added += metric.items_added || 0;
      u.total_items_edited += metric.items_edited || 0;
      u.total_exports += metric.exports_generated || 0;
      u.total_valuations += metric.valuations_viewed || 0;
      u.total_collectible_toggles += metric.collectible_toggles || 0;
      u.active_days++;
      u.last_tier = metric.subscription_tier || u.last_tier;
    }

    const users = Object.values(byUser);

    // Segment users
    const segments = {
      power_users: users.filter(u => u.total_curator_messages >= 20 || u.total_recommendations_accepted >= 5),
      curator_engaged: users.filter(u => u.total_curator_sessions >= 3),
      recommendation_clickers: users.filter(u => u.total_recommendations_clicked >= 5),
      active_collectors: users.filter(u => u.total_items_added >= 5 || u.total_items_edited >= 10),
      valuation_focused: users.filter(u => u.total_valuations >= 3),
      collectible_adopters: users.filter(u => u.total_collectible_toggles >= 1),
      export_users: users.filter(u => u.total_exports >= 1),
    };

    // Tier distribution
    const tierDistribution = {};
    users.forEach(u => {
      tierDistribution[u.last_tier] = (tierDistribution[u.last_tier] || 0) + 1;
    });

    // Engagement metrics
    const avgCuratorSessions = users.length > 0
      ? (users.reduce((sum, u) => sum + u.total_curator_sessions, 0) / users.length).toFixed(2)
      : 0;

    const avgRecommendationCTR = users.length > 0
      ? (users.reduce((sum, u) => {
          const shown = u.total_recommendations_shown || 0;
          const clicked = u.total_recommendations_clicked || 0;
          return sum + (shown > 0 ? (clicked / shown) : 0);
        }, 0) / users.length * 100).toFixed(2)
      : 0;

    return Response.json({
      success: true,
      period_days,
      period_start: cutoffISO,
      total_users: users.length,
      segments: {
        power_users: segments.power_users.length,
        curator_engaged: segments.curator_engaged.length,
        recommendation_clickers: segments.recommendation_clickers.length,
        active_collectors: segments.active_collectors.length,
        valuation_focused: segments.valuation_focused.length,
        collectible_adopters: segments.collectible_adopters.length,
        export_users: segments.export_users.length,
      },
      tier_distribution: tierDistribution,
      engagement: {
        avg_curator_sessions_per_user: avgCuratorSessions,
        avg_recommendation_ctr: avgRecommendationCTR,
      },
      top_engaged_users: users
        .sort((a, b) => b.total_curator_messages - a.total_curator_messages)
        .slice(0, 20)
        .map(u => ({
          email: u.user_email,
          curator_messages: u.total_curator_messages,
          recommendations_accepted: u.total_recommendations_accepted,
          tier: u.last_tier,
        })),
    });
  } catch (error) {
    console.error('getUserSegmentAnalytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});