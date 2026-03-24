// Admin-only: Get subscription funnel metrics (last 7 days)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_utils/stripeClient.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const stripe = getStripeClient();
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

    // Cloudflare checkouts (placeholder)
    const cloudflareCheckouts = 0;

    // Stripe customers created in last 7 days
    let stripeCustomers = 0;
    try {
      const customers = await stripe.customers.list({ 
        created: { gte: sevenDaysAgo }, 
        limit: 100 
      });
      stripeCustomers = customers.data.length;
    } catch (e) {
      console.warn("[funnel] Could not fetch Stripe customers:", e);
    }

    // Active subscriptions created in last 7 days
    let activeSubscriptions = 0;
    try {
      const subs = await stripe.subscriptions.list({ 
        created: { gte: sevenDaysAgo }, 
        limit: 100,
        status: 'all'
      });
      activeSubscriptions = subs.data.filter(s => 
        s.status === "active" || s.status === "trialing"
      ).length;
    } catch (e) {
      console.warn("[funnel] Could not fetch Stripe subscriptions:", e);
    }

    // Entitlements applied (successful events in last 7 days)
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const events = await base44.asServiceRole.entities.SubscriptionIntegrationEvent.filter({});
    const recentEvents = events.filter(e => new Date(e.created_date) >= threshold);
    const entitlementsApplied = recentEvents.filter(e => 
      e.success && (
        e.event_type.includes("entitlement") || 
        e.event_type.includes("reconciled") ||
        e.event_type.includes("subscription.updated")
      )
    ).length;

    // Drop-off reasons from failed events
    const failedEvents = recentEvents.filter(e => !e.success);
    const dropoffs = [...new Set(failedEvents.map(e => e.error).filter(Boolean))];

    return Response.json({
      ok: true,
      cloudflareCheckouts,
      stripeCustomers,
      activeSubscriptions,
      entitlementsApplied,
      dropoffs: dropoffs.slice(0, 5),
    });
  } catch (error) {
    console.error("[getFunnelMetrics] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});