// DEPLOYMENT: 2026-02-02T04:05:00Z - Clean isolate

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// FIX BUG-12: Only backfill subscriptions that predate the legacy cutoff —
// do not grant legacy status to genuinely new subscribers.
const LEGACY_CUTOFF = new Date("2026-02-01T00:00:00.000Z");

function shouldBackfill(sub) {
  // Only process subscriptions missing started_at
  if (sub.started_at) return false;
  // Only active or trialing subscriptions
  if (!["active", "trialing"].includes(sub.status)) return false;
  // Require evidence the subscription predates the cutoff
  const createdDate = sub.created_date || sub.current_period_start;
  if (!createdDate) return false; // no date evidence — do not backfill
  return new Date(createdDate) < LEGACY_CUTOFF;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const legacyDate = "2026-01-31T23:59:59.000Z";
    
    const subscriptions = await base44.asServiceRole.entities.Subscription.list();
    
    const updates = [];
    
    for (const sub of subscriptions) {
      if (!shouldBackfill(sub)) continue;
      try {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          started_at: legacyDate,
        });
        updates.push({
          user_email: sub.user_email,
          status: "updated",
          started_at: legacyDate,
        });
      } catch (err) {
        updates.push({
          user_email: sub.user_email,
          status: "failed",
          error: String(err?.message || err),
        });
      }
    }
    
    return Response.json({
      success: true,
      total_subscriptions: subscriptions.length,
      updated: updates.filter((u) => u.status === "updated").length,
      failed: updates.filter((u) => u.status === "failed").length,
      details: updates,
    });
  } catch (error) {
    return Response.json({ 
      error: String(error?.message || error) 
    }, { status: 500 });
  }
});