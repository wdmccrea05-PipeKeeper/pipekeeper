// Fix user entitlements by email (admin only)

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (admin?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const targetEmail = String(body.userEmail || "").trim().toLowerCase();

    if (!targetEmail) {
      return Response.json({ error: "userEmail required" }, { status: 400 });
    }

    // Get subscriptions for this user
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: targetEmail
    }, "-updated_date", 10);

    const activeSub = subs.find(s => s.status === "active");

    if (!activeSub) {
      return Response.json({ 
        ok: false, 
        message: "No active subscription found" 
      });
    }

    // Get user entity
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: targetEmail 
    });
    const user = users?.[0];

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Update user with correct entitlements
    await base44.asServiceRole.entities.User.update(user.id, {
      subscription_tier: activeSub.tier || "premium",
      subscription_level: "paid",
      subscription_status: "active",
      stripe_customer_id: activeSub.stripe_customer_id || user.stripe_customer_id
    });

    return Response.json({
      ok: true,
      updated: true,
      tier: activeSub.tier,
      provider: activeSub.provider,
      status: activeSub.status
    });

  } catch (error) {
    console.error("Fix entitlements error:", error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});