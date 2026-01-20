// functions/syncSubscriptionForMe.js
// Client-side "post-checkout sync" fail-safe
// Non-admin version that syncs ONLY the logged-in user's subscription
// Returns instantly with updated subscription data

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

  const rank = (s) => {
    const st = (s?.status || "").toLowerCase();
    if (st === "active") return 3;
    if (st === "trialing") return 2;
    return 1;
  };

  return [...subs].sort((a, b) => {
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

    const targetEmail = normEmail(authUser.email);

    // Find Stripe customer by email or existing stripe_customer_id
    let customerId = authUser?.stripe_customer_id || null;

    if (customerId) {
      try {
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
        reason: "No Stripe customer found",
        email: targetEmail,
      });
    }

    // Fetch all subscriptions for this customer
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
        reason: "No subscriptions found",
        email: targetEmail,
        stripe_customer_id: customerId,
      });
    }

    // Build subscription payload
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

    // Upsert Subscription entity
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

    // Compute paid status
    const status = String(best.status || "").toLowerCase();
    const endOk = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    const isPaid = (status === "active" || status === "trialing") && endOk;

    // Update User entity
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
      synced: true,
      email: user_email,
      stripe_customer_id: customerId,
      stripe_subscription_id: best.id,
      status: best.status,
      current_period_end: periodEnd,
      isPaid,
      subscriptionRowId,
      updatedUser,
      message: "Subscription synced successfully",
    });
  } catch (error) {
    console.error("[syncSubscriptionForMe] error:", error);
    return Response.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});