// Admin-only: Get subscription integration health metrics
import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

function safeParsePayload(payload: unknown): Record<string, any> {
  if (!payload) return {};
  if (typeof payload === "object") return payload as Record<string, any>;
  if (typeof payload !== "string") return {};
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { timeWindow } = await req.json().catch(() => ({ timeWindow: "24h" }));
    
    // Calculate time threshold
    const hoursByWindow: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };
    const hoursBack = hoursByWindow[timeWindow] || 24;
    const threshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const windowDays = Math.max(1, hoursBack / 24);

    // NOTE: Limited to 500 most recent events. For large-scale production, push filtering to DB query.
    const events = await base44.asServiceRole.entities.SubscriptionIntegrationEvent.filter(
      {},
      "-created_date",
      500
    );
    const recentEvents = events.filter(e => new Date(e.created_date) >= threshold);

    // Count by source and success
    const stripeWebhooks = recentEvents.filter(e => e.event_source === "stripe").length;
    const cloudflareCheckouts = recentEvents.filter(e => e.event_source === "cloudflare").length;
    const successfulUpdates = recentEvents.filter(e => e.success).length;
    const failedUpdates = recentEvents.filter(e => !e.success).length;

    // Cost efficiency and scale readiness analytics
    const attributionRows = recentEvents.map((event) => {
      const payload = safeParsePayload(event.payload_json);
      const endpoint = payload.endpoint || payload.function_name || event.event_type || "unknown";
      const featureArea = payload.feature_area || event.event_source || "unknown";
      const module = payload.module || "shared";
      const estimatedCredits = toNumber(payload.estimated_credits) || 1;
      const billableCredits = toNumber(payload.billable_credits);
      const cached = Boolean(payload.cached);
      const isAdmin = Boolean(payload.is_admin_usage);
      const userTier = String(payload.user_tier || "unknown").toLowerCase();
      const failed = !event.success;
      const retryLike = String(event.event_type || "").toLowerCase().includes("retry") || toNumber(payload.retry_attempt) > 0;

      return { endpoint, featureArea, module, estimatedCredits, billableCredits, cached, isAdmin, userTier, failed, retryLike };
    });

    const byEndpoint = new Map<string, { calls: number; estimatedCredits: number; billableCredits: number; failures: number }>();
    for (const row of attributionRows) {
      const key = `${row.endpoint}|${row.featureArea}|${row.module}`;
      const existing = byEndpoint.get(key) || { calls: 0, estimatedCredits: 0, billableCredits: 0, failures: 0 };
      existing.calls += 1;
      existing.estimatedCredits += row.estimatedCredits;
      existing.billableCredits += row.billableCredits || row.estimatedCredits;
      if (row.failed) existing.failures += 1;
      byEndpoint.set(key, existing);
    }
    const topConsumers = [...byEndpoint.entries()]
      .map(([key, value]) => {
        const [endpoint, feature_area, module] = key.split("|");
        return {
          endpoint,
          feature_area,
          module,
          calls: value.calls,
          estimated_credits: value.estimatedCredits,
          billable_credits: value.billableCredits,
          failures: value.failures,
        };
      })
      .sort((a, b) => b.billable_credits - a.billable_credits)
      .slice(0, 10);

    const totalEstimatedCreditsObserved = attributionRows.reduce((sum, row) => sum + row.estimatedCredits, 0);
    const totalBillableCreditsObserved = attributionRows.reduce((sum, row) => sum + (row.billableCredits || row.estimatedCredits), 0);
    const dedupedHits = attributionRows.filter((row) => row.cached).length;
    const retriesObserved = attributionRows.filter((row) => row.retryLike).length;
    const freeTierCalls = attributionRows.filter((row) => row.userTier === "free").length;
    const paidTierCalls = attributionRows.filter((row) => row.userTier === "paid").length;
    const adminCalls = attributionRows.filter((row) => row.isAdmin).length;
    const avoidedCredits = Math.max(0, totalEstimatedCreditsObserved - totalBillableCreditsObserved);

    const monthlyCreditsAtCurrentScale = Math.round(totalBillableCreditsObserved * (30 / windowDays));
    const forecastConfidence = windowDays >= 30 ? "high" : windowDays >= 7 ? "medium" : "low";
    const forecast = {
      current_scale: monthlyCreditsAtCurrentScale,
      users_2x: Math.round(monthlyCreditsAtCurrentScale * 2),
      users_5x: Math.round(monthlyCreditsAtCurrentScale * 5),
      users_10x: Math.round(monthlyCreditsAtCurrentScale * 10),
      confidence: forecastConfidence,
    };

    // Detect stuck checkouts (Cloudflare completed but no entitlement update within 10 min)
    // Placeholder for future implementation
    const stuckCheckouts = 0;

    return Response.json({
      ok: true,
      timeWindow,
      stripeWebhooks,
      cloudflareCheckouts,
      successfulUpdates,
      failedUpdates,
      stuckCheckouts,
      costEfficiency: {
        topConsumers,
        totals: {
          events: recentEvents.length,
          estimatedCreditsObserved: totalEstimatedCreditsObserved,
          billableCreditsObserved: totalBillableCreditsObserved,
          estimatedCreditsAvoidedByCaching: avoidedCredits,
          dedupedResponses: dedupedHits,
          retryLikeEvents: retriesObserved,
          freeTierCalls,
          paidTierCalls,
          adminCalls,
          failures: failedUpdates,
        },
        wasteSignals: {
          duplicateResponsesServedFromCache: dedupedHits,
          retriesObserved,
          failedCalls: failedUpdates,
        },
        forecast,
      },
    });
  } catch (error) {
    console.error("[getIntegrationHealth] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});
