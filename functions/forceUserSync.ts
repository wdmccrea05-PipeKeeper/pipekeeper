import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

// Inlined Stripe client utilities
let cachedStripe: Stripe | null = null;
let cachedKeyFingerprint: string | null = null;

function fingerprint(key: string): string {
  return `${key.slice(0, 7)}_${key.length}_${key.slice(-4)}`;
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return "****";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function getStripeClient(options?: { forceRefresh?: boolean }): Stripe {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    throw new Error(`Invalid Stripe key format. Must start with sk_live_ or sk_test_. Got: ${key.slice(0, 3)}`);
  }

  const fp = fingerprint(key);

  if (!options?.forceRefresh && cachedStripe && cachedKeyFingerprint === fp) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(key, { apiVersion: "2024-06-20" });
  cachedKeyFingerprint = fp;

  console.log(`[StripeClient] Initialized new client: ${maskKey(key)}`);

  return cachedStripe;
}

function safeStripeError(e: any): string {
  if (!e) return "Unknown Stripe error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function stripeKeyErrorResponse(e: any) {
  return {
    ok: false,
    error: "STRIPE_KEY_ERROR",
    message: safeStripeError(e)
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const authUser = await base44.auth.me();
    if (!authUser || authUser.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }
    
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return Response.json({ error: "userEmail required" }, { status: 400 });
    }

    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const normalizedEmail = normEmail(userEmail);
    
    let customers;
    try {
      customers = await stripe.customers.list({
        email: normalizedEmail,
        limit: 10
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_CALL_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }
    
    if (!customers.data.length) {
      return Response.json({ error: "No Stripe customer found", email: normalizedEmail }, { status: 404 });
    }
    
    const customer = customers.data[0];
    
    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price"]
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_CALL_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }
    
    const pickBest = (subs) => {
      if (!subs.length) return null;
      const ranked = subs.sort((a, b) => {
        const rankA = a.status === "active" ? 3 : a.status === "trialing" ? 2 : 1;
        const rankB = b.status === "active" ? 3 : b.status === "trialing" ? 2 : 1;
        if (rankB !== rankA) return rankB - rankA;
        return (b.current_period_end || 0) - (a.current_period_end || 0);
      });
      return ranked[0];
    };
    
    const sub = pickBest(subscriptions.data);
    
    if (!sub) {
      return Response.json({ 
        error: "No subscription found",
        customer_id: customer.id,
        subscriptions_checked: subscriptions.data.length
      }, { status: 404 });
    }
    
    const PRICE_ID_PRO_MONTHLY = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
    const PRICE_ID_PRO_ANNUAL = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
    const priceId = sub.items?.data?.[0]?.price?.id;
    const tier = (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) ? "pro" : "premium";
    
    const existing = await base44.asServiceRole.entities.Subscription.filter({
      stripe_subscription_id: sub.id
    });
    
    const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    const createdAt = sub.created ? new Date(sub.created * 1000).toISOString() : null;
    const startedAt = existing?.[0]?.started_at || periodStart || createdAt;
    
    const subData = {
      user_email: normalizedEmail,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      status: sub.status,
      tier,
      started_at: startedAt,
      subscriptionStartedAt: startedAt,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      amount: sub.items?.data?.[0]?.price?.unit_amount ? sub.items.data[0].price.unit_amount / 100 : null,
      billing_interval: sub.items?.data?.[0]?.price?.recurring?.interval || "year"
    };
    
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(existing[0].id, subData);
    } else {
      await base44.asServiceRole.entities.Subscription.create(subData);
    }
    
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    const isPaid = (sub.status === "active" || sub.status === "trialing") && (!periodEnd || new Date(periodEnd) > new Date());
    
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        subscription_level: isPaid ? "paid" : "free",
        subscription_status: sub.status,
        stripe_customer_id: customer.id
      });
    }
    
    return Response.json({
      ok: true,
      message: "User synced successfully",
      userEmail: normalizedEmail,
      customer_id: customer.id,
      subscription_id: sub.id,
      status: sub.status,
      tier,
      isPaid,
      current_period_end: periodEnd
    });
    
  } catch (error) {
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});