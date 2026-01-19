// Functions/stripeWebhook (full replacement)
// Purpose: Receive Stripe webhooks and immediately sync subscription status into Base44 entities
// - Updates entities.Subscription (source of truth)
// - Updates entities.User.subscription_level + subscription_status + stripe_customer_id
// - Handles checkout completion, subscription created/updated/deleted, and invoice payment signals

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
const STRIPE_WEBHOOK_SECRET = (Deno.env.get("STRIPE_WEBHOOK_SECRET") || "").trim();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function toIsoFromUnixSeconds(sec) {
  if (!sec || typeof sec !== "number") return null;
  try {
    return new Date(sec * 1000).toISOString();
  } catch {
    return null;
  }
}

function safeLowerEmail(v) {
  return String(v || "").trim().toLowerCase();
}

async function upsertSubscription(base44, payload) {
  // NOTE: Base44 entities typically do not have an "upsert" method. We simulate with filter.
  const existing = await base44.asServiceRole.entities.Subscription.filter({
    stripe_subscription_id: payload.stripe_subscription_id,
  });

  if (existing && existing.length > 0) {
    await base44.asServiceRole.entities.Subscription.update(existing[0].id, payload);
    return { action: "updated", id: existing[0].id };
  }

  const created = await base44.asServiceRole.entities.Subscription.create(payload);
  return { action: "created", id: created?.id };
}

async function updateUserFromEmail(base44, email, updates) {
  const user_email = safeLowerEmail(email);
  if (!user_email) return { ok: false, reason: "no_email" };

  const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
  if (!users || users.length === 0) return { ok: false, reason: "user_not_found" };

  await base44.asServiceRole.entities.User.update(users[0].id, updates);
  return { ok: true, userId: users[0].id };
}

function derivePaidLevelFromStatus(status) {
  const s = String(status || "").toLowerCase();
  // Treat trialing as paid access in-app (you can decide if you want this)
  if (s === "active" || s === "trialing") return "paid";
  return "free";
}

async function subscriptionToPayload(stripeSub, user_email_override = "") {
  const sub = stripeSub;

  // customer may be string or expanded object
  const customerId =
    typeof sub.customer === "string" ? sub.customer : (sub.customer?.id || null);

  const customerEmail =
    typeof sub.customer === "object" && sub.customer ? sub.customer.email : null;

  const metadataEmail = sub.metadata?.user_email || "";
  const user_email = safeLowerEmail(user_email_override || metadataEmail || customerEmail || "");

  const interval = sub.items?.data?.[0]?.price?.recurring?.interval || "year";
  const unitAmount = sub.items?.data?.[0]?.price?.unit_amount;
  const amount = typeof unitAmount === "number" ? unitAmount / 100 : null;

  const payload = {
    user_email,
    status: sub.status,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    current_period_start: toIsoFromUnixSeconds(sub.current_period_start),
    current_period_end: toIsoFromUnixSeconds(sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
    billing_interval: interval,
    amount: amount ?? 19.99,
  };

  return payload;
}

async function fetchSubscriptionFromCheckout(stripe, session) {
  // For checkout.session.completed, we often need to retrieve subscription details.
  const subscriptionId = session.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return null;

  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer", "items.data.price"],
  });

  return sub;
}

Deno.serve(async (req) => {
  // Basic config checks
  if (!STRIPE_SECRET_KEY) return json({ ok: false, error: "Missing STRIPE_SECRET_KEY" }, 500);
  if (!STRIPE_WEBHOOK_SECRET) return json({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }, 500);

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  // Stripe requires the *raw* body for signature verification
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (e) {
    return json({ ok: false, error: `Unable to read body: ${e?.message || String(e)}` }, 400);
  }

  const signature = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return json({ ok: false, error: `Webhook signature verification failed: ${e?.message || String(e)}` }, 400);
  }

  const base44 = createClientFromRequest(req);

  try {
    const type = event.type;

    // We will track what we did for debugging
    const actions = [];

    // ---- 1) Checkout completed -> retrieve subscription and write records immediately
    if (type === "checkout.session.completed") {
      const session = event.data.object;

      // Try to determine the email (best effort)
      const emailFromSession =
        session?.metadata?.user_email ||
        session?.customer_details?.email ||
        session?.customer_email ||
        "";

      const stripeSub = await fetchSubscriptionFromCheckout(stripe, session);
      if (!stripeSub) {
        actions.push({ step: "checkout.session.completed", ok: false, reason: "no_subscription_on_session" });
        return json({ ok: true, actions });
      }

      const subPayload = await subscriptionToPayload(stripeSub, emailFromSession);
      if (!subPayload.user_email) {
        actions.push({ step: "checkout.session.completed", ok: false, reason: "no_email_resolved" });
        return json({ ok: true, actions });
      }

      const up = await upsertSubscription(base44, subPayload);
      actions.push({ step: "upsertSubscription", ...up, user_email: subPayload.user_email });

      // Update entities.User immediately for gating
      const level = derivePaidLevelFromStatus(subPayload.status);
      const u = await updateUserFromEmail(base44, subPayload.user_email, {
        subscription_level: level,
        subscription_status: subPayload.status,
        stripe_customer_id: subPayload.stripe_customer_id,
      });
      actions.push({ step: "updateUser", ...u, level, status: subPayload.status });

      return json({ ok: true, actions });
    }

    // ---- 2) Subscription created/updated/deleted -> write records immediately
    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      const stripeSub = event.data.object;

      // Expand customer email if it isn't present
      let sub = stripeSub;
      try {
        // Only fetch if customer isn't expanded (string)
        if (typeof sub.customer === "string") {
          sub = await stripe.subscriptions.retrieve(sub.id, {
            expand: ["customer", "items.data.price"],
          });
        }
      } catch {
        // Best effort: continue with existing sub object
      }

      const subPayload = await subscriptionToPayload(sub);
      if (!subPayload.user_email) {
        actions.push({ step: type, ok: false, reason: "no_email_resolved", subId: sub.id });
        return json({ ok: true, actions });
      }

      const up = await upsertSubscription(base44, subPayload);
      actions.push({ step: "upsertSubscription", ...up, user_email: subPayload.user_email });

      // If deleted or not active/trialing, downgrade user
      const level = derivePaidLevelFromStatus(subPayload.status);
      const u = await updateUserFromEmail(base44, subPayload.user_email, {
        subscription_level: level,
        subscription_status: subPayload.status,
        stripe_customer_id: subPayload.stripe_customer_id,
      });
      actions.push({ step: "updateUser", ...u, level, status: subPayload.status });

      return json({ ok: true, actions });
    }

    // ---- 3) Invoice paid / payment failed (optional but helpful)
    // These can arrive before/after subscription.updated depending on timing.
    if (type === "invoice.paid" || type === "invoice.payment_failed") {
      const invoice = event.data.object;

      // invoice.subscription is usually set for subscription invoices
      const subscriptionId = invoice.subscription;
      if (!subscriptionId || typeof subscriptionId !== "string") {
        actions.push({ step: type, ok: true, reason: "no_subscription_on_invoice" });
        return json({ ok: true, actions });
      }

      // Retrieve subscription and sync it
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["customer", "items.data.price"],
      });

      const subPayload = await subscriptionToPayload(sub);
      if (!subPayload.user_email) {
        actions.push({ step: type, ok: false, reason: "no_email_resolved", subId: sub.id });
        return json({ ok: true, actions });
      }

      const up = await upsertSubscription(base44, subPayload);
      actions.push({ step: "upsertSubscription", ...up, user_email: subPayload.user_email });

      // If payment failed and Stripe moves status away from active/trialing, downgrade will happen here too
      const level = derivePaidLevelFromStatus(subPayload.status);
      const u = await updateUserFromEmail(base44, subPayload.user_email, {
        subscription_level: level,
        subscription_status: subPayload.status,
        stripe_customer_id: subPayload.stripe_customer_id,
      });
      actions.push({ step: "updateUser", ...u, level, status: subPayload.status });

      return json({ ok: true, actions });
    }

    // Ignore other events but acknowledge
    return json({ ok: true, ignored: true, type: event.type });
  } catch (e) {
    console.error("[stripeWebhook] error:", e);
    return json({ ok: false, error: e?.message || String(e), type: event?.type }, 500);
  }
});