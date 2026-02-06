// Admin-only: Get subscription integration health metrics
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { timeWindow } = await req.json().catch(() => ({ timeWindow: "24h" }));
    
    // Calculate time threshold
    const hoursBack = timeWindow === "24h" ? 24 : 168; // 7 days = 168 hours
    const threshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Fetch recent events
    const events = await base44.asServiceRole.entities.SubscriptionIntegrationEvent.filter({});
    const recentEvents = events.filter(e => new Date(e.created_date) >= threshold);

    // Count by source and success
    const stripeWebhooks = recentEvents.filter(e => e.event_source === "stripe").length;
    const cloudflareCheckouts = recentEvents.filter(e => e.event_source === "cloudflare").length;
    const successfulUpdates = recentEvents.filter(e => e.success).length;
    const failedUpdates = recentEvents.filter(e => !e.success).length;

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
    });
  } catch (error) {
    console.error("[getIntegrationHealth] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});