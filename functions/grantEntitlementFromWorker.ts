// Stripe-agnostic entitlement grant endpoint for Cloudflare Worker
// Auth: Bearer token (PIPEKEEPER_ADMIN_TOKEN)
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  try {
    // 1) Validate Bearer token
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("PIPEKEEPER_ADMIN_TOKEN");

    if (!expectedToken) {
      return Response.json(
        { ok: false, error: "SERVER_MISCONFIGURED", message: "Admin token not configured" },
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const providedToken = authHeader?.replace(/^Bearer\s+/i, "");
    if (!providedToken || providedToken !== expectedToken) {
      return Response.json(
        { ok: false, error: "UNAUTHORIZED", message: "Invalid or missing admin token" },
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Parse and validate body
    const body = await req.json().catch(() => ({}));
    const { email, tier, interval, provider, stripe_session_id, stripe_customer_id, stripe_subscription_id } = body;

    if (!email || !tier || !interval) {
      return Response.json(
        { ok: false, error: "INVALID_REQUEST", message: "Missing required fields: email, tier, interval" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = normEmail(email);
    const normalizedTier = String(tier).toLowerCase();
    const normalizedInterval = String(interval).toLowerCase();

    if (!["premium", "pro"].includes(normalizedTier)) {
      return Response.json(
        { ok: false, error: "INVALID_TIER", message: "Tier must be PREMIUM or PRO" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["monthly", "annual"].includes(normalizedInterval)) {
      return Response.json(
        { ok: false, error: "INVALID_INTERVAL", message: "Interval must be monthly or annual" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3) Find user by email
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });

    if (!users || users.length === 0) {
      return Response.json(
        { ok: false, error: "USER_NOT_FOUND", message: `No user found with email: ${normalizedEmail}` },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = users[0];

    // 4) Update User entity
    const userUpdates: any = {
      subscription_level: "paid",
      subscription_tier: normalizedTier,
      // FIX ISSUE-05 + ISSUE-14: Also write entitlement_tier (flat) and data.entitlement_tier (nested)
      entitlement_tier: normalizedTier,
      subscription_status: "active",
      subscription_interval: normalizedInterval,
      subscription_provider: provider || "stripe",
      data: {
        ...(user.data || {}),
        entitlement_tier: normalizedTier,
        subscription_tier: normalizedTier,
        subscription_level: "paid",
        subscription_status: "active",
      },
    };

    if (stripe_customer_id) userUpdates.stripe_customer_id = stripe_customer_id;
    if (stripe_subscription_id) userUpdates.stripe_subscription_id = stripe_subscription_id;

    await base44.asServiceRole.entities.User.update(user.id, userUpdates);

    // 5) Upsert Subscription entity
    // FIX ISSUE-14: Sort by created date desc and prefer the most recent subscription
    // to avoid updating an old expired row when multiple exist for the same user+provider.
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: normalizedEmail,
      provider: provider || "stripe",
    });
    existingSubs.sort((a: any, b: any) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    // FIX ISSUE-14: Set current_period_start, current_period_end, and started_at
    // Manual grants default to 1-year period since there is no billing cycle to derive from.
    const MANUAL_GRANT_PERIOD_DAYS = 365;
    const subscriptionData: any = {
      user_id: user.id,
      user_email: normalizedEmail,
      provider: provider || "stripe",
      status: "active",
      tier: normalizedTier,
      billing_interval: normalizedInterval,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + MANUAL_GRANT_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      started_at: existingSubs?.[0]?.started_at || new Date().toISOString(),
    };

    if (stripe_session_id) subscriptionData.stripe_session_id = stripe_session_id;
    if (stripe_customer_id) subscriptionData.stripe_customer_id = stripe_customer_id;
    if (stripe_subscription_id) {
      subscriptionData.stripe_subscription_id = stripe_subscription_id;
      subscriptionData.provider_subscription_id = stripe_subscription_id;
    }

    if (existingSubs && existingSubs.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subscriptionData);
    } else {
      // Create new
      await base44.asServiceRole.entities.Subscription.create(subscriptionData);
    }

    // 6) Return success
    return Response.json(
      {
        ok: true,
        email: normalizedEmail,
        tier: normalizedTier,
        interval: normalizedInterval,
        userId: user.id,
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[grantEntitlementFromWorker] Error:", error);
    return Response.json(
      {
        ok: false,
        error: "INTERNAL_ERROR",
        message: String(error?.message || error),
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});