import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_shared/stripeClientSingleton.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

interface ReconcileResult {
  ok: boolean;
  userId: string;
  email: string;
  source: "apple" | "stripe" | "none";
  subscription_level: "free" | "paid";
  subscription_status: string;
  subscription_tier: "premium" | "pro" | null;
  updated: boolean;
  details?: string;
}

async function reconcileFromStripe(
  base44: any,
  user: any,
  stripe: any
): Promise<ReconcileResult | null> {
  const email = normEmail(user.email);
  let customerId = user.stripe_customer_id || null;

  // Find Stripe customer
  if (!customerId) {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data?.[0]?.id || null;
    } catch (err) {
      console.error(`[reconcile] Stripe customer lookup failed:`, err);
      return null;
    }
  }

  if (!customerId) {
    return null; // No Stripe customer found
  }

  // Get active subscriptions
  let subscriptions;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
  } catch (err) {
    console.error(`[reconcile] Stripe subscriptions list failed:`, err);
    return null;
  }

  // Find best active subscription
  const activeSub = subscriptions.data
    .filter((s: any) => s.status === "active" || s.status === "trialing")
    .sort((a: any, b: any) => {
      const rankA = a.status === "active" ? 2 : 1;
      const rankB = b.status === "active" ? 2 : 1;
      return rankB - rankA;
    })[0];

  if (!activeSub) {
    return null; // No active subscription
  }

  // Determine tier from price IDs
  const priceId = activeSub.items?.data?.[0]?.price?.id;
  const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
  const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
  const tier = (priceId === proMonthly || priceId === proAnnual) ? "pro" : "premium";

  return {
    ok: true,
    userId: user.id,
    email,
    source: "stripe",
    subscription_level: "paid",
    subscription_status: activeSub.status,
    subscription_tier: tier,
    updated: false,
    details: `Stripe subscription ${activeSub.id}`,
  };
}

async function reconcileFromApple(
  base44: any,
  user: any
): Promise<ReconcileResult | null> {
  const email = normEmail(user.email);

  // Find active Apple subscription
  const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
    user_id: user.id,
    provider: "apple",
    status: "active",
  });

  const activeSub = appleSubs?.[0];
  if (!activeSub) {
    return null;
  }

  return {
    ok: true,
    userId: user.id,
    email,
    source: "apple",
    subscription_level: "paid",
    subscription_status: "active",
    subscription_tier: activeSub.tier || "premium",
    updated: false,
    details: `Apple subscription ${activeSub.provider_subscription_id}`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || body.userEmail || caller.email;
    const targetEmail = normEmail(rawEmail);
    const targetUserId = body.userId || null;
    console.log(`[CRITICAL_PAYLOAD] raw="${rawEmail}" normalized="${targetEmail}"`);

    // Only admins can reconcile other users
    const isAdmin = caller.role === "admin";
    if (!isAdmin && targetEmail !== normEmail(caller.email)) {
     return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find user
    let user;
    if (targetUserId) {
      const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
      user = users?.[0];
      console.log(`[CRITICAL_LOOKUP] By ID ${targetUserId}: ${user?.email || 'NOT FOUND'}`);
    } else {
      const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
      user = users?.[0];
      console.log(`[CRITICAL_LOOKUP] By email "${targetEmail}": ${user?.email || 'NOT FOUND'}, array length=${users?.length || 0}`);
    }

    if (!user) {
      return Response.json({ error: `User not found: ${targetEmail || targetUserId}` }, { status: 404 });
    }

    // CRITICAL: Check Apple first if platform=ios, then fallback to Stripe
    // Platform is informational ONLY - never let it override actual entitlement
    let result: ReconcileResult | null = null;

    // Check Apple IAP first if iOS platform
    if (user.platform === "ios") {
      result = await reconcileFromApple(base44, user);
    }

    // Fallback to Stripe if no Apple subscription
    if (!result) {
      const stripe = getStripeClient();
      result = await reconcileFromStripe(base44, user, stripe);
    }

    // Default to free if no subscription found
    if (!result) {
      result = {
        ok: true,
        userId: user.id,
        email: user.email,
        source: "none",
        subscription_level: "free",
        subscription_status: "none",
        subscription_tier: null,
        updated: false,
        details: "No active subscription found",
      };
    }

    // Update user if entitlements changed
    const needsUpdate =
      user.subscription_level !== result.subscription_level ||
      user.subscription_status !== result.subscription_status ||
      user.subscription_tier !== result.subscription_tier;

    if (needsUpdate) {
      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_level: result.subscription_level,
        subscription_status: result.subscription_status,
        subscription_tier: result.subscription_tier,
      });
      result.updated = true;
      console.log(`[reconcile] Updated ${result.email}: ${result.source} → level=${result.subscription_level} tier=${result.subscription_tier}`);
    }

    return Response.json(result);
  } catch (error) {
    console.error("[reconcileEntitlementsForUser] Error:", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});