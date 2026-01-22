// Functions/syncStripeSubscriptions (FULL REPLACEMENT)
// - Safe for normal users (syncs ONLY the logged-in user's subscription)
// - Also supports admin optional override: { email: "someone@domain.com" } in body
// - Upserts Subscription entity and updates User.subscription_level/status + stripe_customer_id
// - Works even if subscription metadata is missing by using Stripe customer email

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function isoFromUnixSeconds(sec) {
  if (!sec) return null;
  const ms = Number(sec) * 1000;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function pickBestSubscription(subs) {
  if (!Array.isArray(subs) || subs.length === 0) return null;

  // Prefer active, then trialing, then past_due, then anything else (latest period end)
  const rank = (s) => {
    const st = (s?.status || "").toLowerCase();
    if (st === "active") return 5;
    if (st === "trialing") return 4;
    if (st === "past_due") return 3;
    // Filter out incomplete/incomplete_expired as they're not real subscriptions
    if (st === "incomplete" || st === "incomplete_expired") return 0;
    return 2;
  };

  const validSubs = subs.filter(s => rank(s) > 0);
  if (validSubs.length === 0) return null;

  return [...validSubs].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (rb !== ra) return rb - ra;

    const ea = Number(a?.current_period_end || 0);
    const eb = Number(b?.current_period_end || 0);
    return eb - ea;
  })[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser?.email) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return Response.json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

    // Allow admin to sync a specific user by email; otherwise sync self.
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const requestedEmail = normEmail(body?.email);
    const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
    const targetEmail = requestedEmail && isAdmin ? requestedEmail : normEmail(authUser.email);

    // Find Stripe customer:
    // 1) If we already have stripe_customer_id on auth user, try it
    // 2) Else lookup by email
    let customerId = authUser?.stripe_customer_id || null;

    if (customerId) {
      try {
        // Validate customer exists
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customers = await stripe.customers.list({ email: targetEmail, limit: 1 });
      customerId = customers.data?.[0]?.id || null;
    }

    if (!customerId) {
      return Response.json({
        ok: true,
        found: false,
        reason: "No Stripe customer found for this email",
        email: targetEmail,
      });
    }

    // Fetch subscriptions for this customer (all statuses, then choose best)
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 25,
      expand: ["data.customer", "data.items.data.price"],
    });

    const best = pickBestSubscription(list?.data || []);
    if (!best) {
      return Response.json({
        ok: true,
        found: false,
        reason: "No Stripe subscriptions found for this customer",
        email: targetEmail,
        stripe_customer_id: customerId,
      });
    }

    // Determine email to store: prefer subscription metadata user_email, else customer email, else targetEmail
    const customerObj = best.customer;
    const customerEmail =
      customerObj && typeof customerObj === "object" ? normEmail(customerObj.email) : "";
    const subEmail = normEmail(best?.metadata?.user_email);
    const user_email = subEmail || customerEmail || targetEmail;

    const periodEnd = isoFromUnixSeconds(best.current_period_end);
    const periodStart = isoFromUnixSeconds(best.current_period_start);

    const billingInterval =
      best.items?.data?.[0]?.price?.recurring?.interval ||
      best.items?.data?.[0]?.plan?.interval ||
      "year";

    const unitAmount = best.items?.data?.[0]?.price?.unit_amount;
    const amount = Number.isFinite(unitAmount) ? unitAmount / 100 : null;

    const payload = {
      user_email,
      status: best.status,
      stripe_subscription_id: best.id,
      stripe_customer_id: typeof customerObj === "string" ? customerObj : customerObj?.id || customerId,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: !!best.cancel_at_period_end,
      billing_interval: billingInterval,
      amount,
    };

    // Upsert Subscription entity by stripe_subscription_id
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      stripe_subscription_id: best.id,
    });

    let subscriptionRowId = null;
    if (existingSubs?.length) {
      subscriptionRowId = existingSubs[0].id;
      await base44.asServiceRole.entities.Subscription.update(subscriptionRowId, payload);
    } else {
      const created = await base44.asServiceRole.entities.Subscription.create(payload);
      subscriptionRowId = created?.id || null;
    }

    // Compute "paid" status: active or trialing AND not expired (if period end exists)
    const status = String(best.status || "").toLowerCase();
    const endOk = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    const isPaid = (status === "active" || status === "trialing") && endOk;

    // Update User entity record (preferred)
    // Note: your app uses entities.User.subscription_level/status in Layout merges.
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });

    let updatedUser = false;
    if (users?.length) {
      const userRec = users[0];
      await base44.asServiceRole.entities.User.update(userRec.id, {
        subscription_level: isPaid ? "paid" : (userRec.subscription_level || "free"),
        subscription_status: best.status,
        stripe_customer_id: customerId,
      });
      updatedUser = true;
    }

    return Response.json({
      ok: true,
      found: true,
      email: user_email,
      stripe_customer_id: customerId,
      stripe_subscription_id: best.id,
      status: best.status,
      current_period_end: periodEnd,
      isPaid,
      subscriptionRowId,
      updatedUser,
    });
  } catch (error) {
    console.error("[syncStripeSubscriptions] error:", error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});