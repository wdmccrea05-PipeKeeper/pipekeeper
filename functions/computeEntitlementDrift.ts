// Scheduled function: Compute entitlement drift daily
// Detects users with mismatched/stale entitlement state
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow admin or automated calls (no user in scheduled context)
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Clear old drift records
    const oldDrifts = await base44.asServiceRole.entities.EntitlementDriftCache.filter({});
    for (const drift of oldDrifts) {
      await base44.asServiceRole.entities.EntitlementDriftCache.delete(drift.id);
    }

    let driftsDetected = 0;

    for (const u of users) {
      const drifts = [];

      // Drift 1: Stale sync (>7 days old and has billing provider)
      if (u.billing_provider && u.billing_provider !== "none") {
        const lastSync = u.entitlement_last_synced_at ? new Date(u.entitlement_last_synced_at) : null;
        if (!lastSync || lastSync < sevenDaysAgo) {
          drifts.push({
            drift_type: "stale_sync",
            severity: "medium",
            details: `Last synced ${lastSync ? Math.floor((now - lastSync) / (24 * 60 * 60 * 1000)) : "never"} days ago`,
            last_synced_at: u.entitlement_last_synced_at,
          });
        }
      }

      // Drift 2: Sync error state
      if (u.entitlement_sync_state === "error") {
        drifts.push({
          drift_type: "sync_error",
          severity: "high",
          details: u.entitlement_sync_error || "Unknown sync error",
          last_synced_at: u.entitlement_last_synced_at,
        });
      }

      // Drift 3: Stripe customer but free tier
      if (u.stripe_customer_id && u.entitlement_tier === "free") {
        drifts.push({
          drift_type: "free_with_stripe",
          severity: "high",
          details: "Has Stripe customer ID but entitlement tier is free",
          last_synced_at: u.entitlement_last_synced_at,
        });
      }

      // Drift 4: Provider mismatch
      if (u.billing_provider && u.subscription_provider && u.billing_provider !== u.subscription_provider) {
        drifts.push({
          drift_type: "provider_mismatch",
          severity: "medium",
          details: `billing_provider (${u.billing_provider}) != subscription_provider (${u.subscription_provider})`,
          last_synced_at: u.entitlement_last_synced_at,
        });
      }

      // Create drift records
      for (const drift of drifts) {
        await base44.asServiceRole.entities.EntitlementDriftCache.create({
          user_id: u.id,
          user_email: u.email,
          ...drift,
          detected_at: now.toISOString(),
          resolved: false,
        });
        driftsDetected++;
      }
    }

    return Response.json({
      ok: true,
      usersScanned: users.length,
      driftsDetected,
    });
  } catch (error) {
    console.error("[computeEntitlementDrift] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});