// Automation: Sync Subscription tier/status → User.data nested structure
// Runs whenever a Subscription is created or updated
// Single source of truth: Subscription entity
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Event payload from automation
    const { event, data } = body;

    // Only handle Subscription create/update
    // FIX BUG-01: Corrected boolean operator precedence in event guard.
    // Previously `!event?.entity_name === "Subscription"` compared a boolean to a string
    // (always false), so this condition never short-circuited and the function always skipped.
    if (event?.entity_name !== "Subscription" || !["create", "update"].includes(event?.type)) {
      return Response.json({ ok: true, skipped: "Not a Subscription event" });
    }

    const subscription = data;
    if (!subscription) {
      return Response.json({ error: "No subscription data" }, { status: 400 });
    }

    const email = normEmail(subscription.user_email);
    if (!email) {
      return Response.json({ ok: true, skipped: "No user_email in subscription" });
    }

    // Find user
    const users = await base44.asServiceRole.entities.User.filter({ email });
    const user = users?.[0];
    if (!user) {
      return Response.json({ ok: true, skipped: `User not found: ${email}` });
    }

    // FIX BUG-05: Write BOTH flat AND nested entitlement fields so all resolver code paths see updates
    const subscriptionTier = subscription.tier || "premium";
    const subscriptionLevel = subscription.status === "active" ? "paid" : "free";
    
    const updateData = {
      // Flat fields (checked first by getEntitlementTier)
      subscription_tier: subscriptionTier,
      subscription_level: subscriptionLevel,
      subscription_status: subscription.status,
      entitlement_tier: subscriptionLevel === "paid" ? subscriptionTier : "free",
      
      // Nested fields (fallback)
      data: {
        ...(user.data || {}),
        role: user.data?.role || "user",
        tos_accepted_at: user.data?.tos_accepted_at,
        stripe_customer_id: user.data?.stripe_customer_id || subscription.stripe_customer_id,
        subscription_tier: subscriptionTier,
        subscription_level: subscriptionLevel,
        subscription_status: subscription.status,
        entitlement_tier: subscriptionLevel === "paid" ? subscriptionTier : "free",
        
        // Preserve other fields
        ...(user.data?.data || {}),
        last_login: user.data?.data?.last_login || user.data?.last_login,
        platform: user.data?.data?.platform || user.data?.platform || "web",
      },
    };

    // Update user
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    console.log(
      `[syncSubscriptionToUserEntitlements] Synced ${email}: tier=${subscription.tier} status=${subscription.status}`
    );

    return Response.json({
      ok: true,
      email,
      userId: user.id,
      tier: subscription.tier,
      status: subscription.status,
    });
  } catch (error) {
    console.error("[syncSubscriptionToUserEntitlements] Error:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});