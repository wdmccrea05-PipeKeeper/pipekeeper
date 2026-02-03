// Automated entitlement reconciliation - ensures all active subscriptions have correct user permissions
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    // Only allow admins or service role
    if (caller?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log("[reconcileAllEntitlements] Starting reconciliation...");

    // Get all active subscriptions
    const allSubs = await base44.asServiceRole.entities.Subscription.filter({
      status: "active"
    }, "-updated_date", 1000);

    console.log(`[reconcileAllEntitlements] Found ${allSubs.length} active subscriptions`);

    const results = {
      total: allSubs.length,
      fixed: 0,
      skipped: 0,
      errors: [],
      userIdBackfilled: 0,
    };

    for (const sub of allSubs) {
      try {
        const email = String(sub.user_email || "").trim().toLowerCase();
        
        if (!email) {
          results.skipped++;
          continue;
        }

        // Get user record
        const users = await base44.asServiceRole.entities.User.filter({ email });
        const user = users?.[0];

        if (!user) {
          results.errors.push({ email, error: "User not found" });
          continue;
        }

        // Backfill user_id in subscription if missing
        if (!sub.user_id && user.id) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            user_id: user.id
          });
          results.userIdBackfilled++;
        }

        // Check if user entitlements match subscription
        const expectedLevel = "paid";
        const expectedStatus = "active";
        const expectedTier = sub.tier || "premium";

        const needsUpdate =
          user.subscription_level !== expectedLevel ||
          user.subscription_status !== expectedStatus ||
          user.subscription_tier !== expectedTier;

        if (needsUpdate) {
          console.log(`[reconcile] Fixing ${email}: level=${user.subscription_level}->${expectedLevel}, status=${user.subscription_status}->${expectedStatus}, tier=${user.subscription_tier}->${expectedTier}`);
          
          await base44.asServiceRole.entities.User.update(user.id, {
            subscription_level: expectedLevel,
            subscription_status: expectedStatus,
            subscription_tier: expectedTier,
            stripe_customer_id: sub.stripe_customer_id || user.stripe_customer_id,
          });

          results.fixed++;
        }
      } catch (err) {
        console.error(`[reconcile] Error processing ${sub.user_email}:`, err);
        results.errors.push({ 
          email: sub.user_email, 
          error: err.message 
        });
      }
    }

    console.log("[reconcileAllEntitlements] Completed:", results);

    return Response.json({
      ok: true,
      ...results,
    });

  } catch (error) {
    console.error("[reconcileAllEntitlements] Fatal error:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});