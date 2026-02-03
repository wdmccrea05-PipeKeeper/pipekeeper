// DEPLOYMENT: 2026-02-02T04:00:00Z - No imports

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function getStripeKey() {
  const envKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (envKey && (envKey.startsWith("sk_live_") || envKey.startsWith("sk_test_"))) {
    return envKey;
  }
  throw new Error("STRIPE_SECRET_KEY not configured in environment");
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
    if (st === "active") return 5;
    if (st === "trialing") return 4;
    if (st === "past_due") return 3;
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

    let stripe;
    try {
      const stripeKey = getStripeKey();
      stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_INIT_FAILED",
        message: e?.message || "Failed to initialize Stripe"
      }, { status: 500 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const requestedEmail = normEmail(body?.email);
    const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
    const targetEmail = requestedEmail && isAdmin ? requestedEmail : normEmail(authUser.email);

    let customerId = authUser?.stripe_customer_id || null;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email: targetEmail, limit: 1 });
        customerId = customers.data?.[0]?.id || null;
      } catch (e) {
        return Response.json({
          ok: false,
          error: "STRIPE_CALL_FAILED",
          message: e?.message || String(e)
        }, { status: 500 });
      }
    }

    if (!customerId) {
      return Response.json({
        ok: true,
        found: false,
        reason: "No Stripe customer found for this email",
        email: targetEmail,
      });
    }

    let list;
    try {
      list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 25,
        expand: ["data.customer", "data.items.data.price"],
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_CALL_FAILED",
        message: e?.message || String(e)
      }, { status: 500 });
    }

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

    const status = String(best.status || "").toLowerCase();
    const endOk = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    const isPaid = (status === "active" || status === "trialing") && endOk;

    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });

    let updatedUser = false;
    if (Array.isArray(users) && users.length > 0) {
      const userRec = users[0];
      if (userRec?.id) {
        await base44.asServiceRole.entities.User.update(userRec.id, {
          subscription_level: isPaid ? "paid" : (userRec.subscription_level || "free"),
          subscription_status: best.status,
          stripe_customer_id: customerId,
        });
        updatedUser = true;
      }
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
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: error?.message || String(error)
    }, { status: 500 });
  }
});