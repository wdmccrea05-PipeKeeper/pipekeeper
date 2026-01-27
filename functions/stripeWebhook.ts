import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();
const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();

function json(status, body) {
  return new Response(JSON.stringify({ ...body, version: "v24-sdk" }), {
    status,
    headers: { 
      "content-type": "application/json",
      "X-PipeKeeper-Webhook-Version": "v24-sdk"
    },
  });
}

function normalizeSubscriptionStartDate(startedAt, periodStart, createdAt) {
  return startedAt || periodStart || createdAt || null;
}

function getTierFromPriceId(priceId) {
  if (!priceId) return null;
  
  if (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) {
    return "pro";
  }
  
  if (priceId === PRICE_ID_PREMIUM_MONTHLY || priceId === PRICE_ID_PREMIUM_ANNUAL) {
    return "premium";
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Quick exit for health checks
  if (req.method === "GET" || req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }
  
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!webhookSecret) {
      return json(500, { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" });
    }
    if (!stripeSecretKey) {
      return json(500, { ok: false, error: "Missing STRIPE_SECRET_KEY" });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    // Verify signature using Stripe SDK (async for Deno WebCrypto compatibility)
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("[webhook] Signature verification failed:", err.message);
      return json(400, { ok: false, error: `Webhook signature verification failed: ${err.message}` });
    }

    const base44 = createClientFromRequest(req);

    // Deduplication: Check if event already processed
    try {
      const existing = await base44.asServiceRole.entities.ProcessedStripeEvents?.filter({
        event_id: event.id
      });
      if (existing && existing.length > 0) {
        return json(200, { ok: true, deduped: true });
      }
    } catch (err) {
      // If ProcessedStripeEvents entity doesn't exist, continue without dedup
      // (Non-fatal - this is just an optimization)
    }

    // Helper functions
    async function findUserByEmail(email) {
      const rows = await base44.asServiceRole.entities.User.filter({ email });
      return rows && rows.length ? rows[0] : null;
    }

    async function upsertSubscription(payload) {
      const existing = await base44.asServiceRole.entities.Subscription.filter({
        stripe_subscription_id: payload.stripe_subscription_id,
      });

      if (existing && existing.length) {
        console.log(`[webhook] Updating existing subscription ${payload.stripe_subscription_id} for ${payload.user_email}`);
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, payload);
        return existing[0].id;
      } else {
        console.log(`[webhook] Creating new subscription ${payload.stripe_subscription_id} for ${payload.user_email}`);
        const created = await base44.asServiceRole.entities.Subscription.create(payload);
        return created?.id;
      }
    }

    async function setUserEntitlement(email, fields) {
      const userRow = await findUserByEmail(email);
      if (!userRow) return { ok: false, reason: "User not found" };

      await base44.asServiceRole.entities.User.update(userRow.id, fields);
      return { ok: true };
    }

    async function ensureUserExists(email, customerId) {
      let userRow = await findUserByEmail(email);
      if (!userRow) {
        await base44.asServiceRole.entities.User.create({
          email,
          full_name: "User from Stripe",
          subscription_level: "paid",
          stripe_customer_id: customerId || null,
        });
      }
      return userRow;
    }

    // Process event based on type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        const emailRaw =
          session.metadata?.user_email ||
          session.customer_details?.email ||
          session.customer_email ||
          "";

        const user_email = String(emailRaw || "").trim().toLowerCase();
        if (!user_email) break;

        console.log(`[webhook] checkout.session.completed for ${user_email}, setting paid status`);
        await setUserEntitlement(user_email, {
          subscription_level: "paid",
          subscription_status: "active",
          stripe_customer_id: customerId || null,
        });

        // NOTE: We cannot fetch subscription details without Stripe SDK
        // The subscription update will come via subscription.created/updated events
        if (subscriptionId) {
          console.log(`[webhook] Checkout completed for subscription ${subscriptionId}, will process via subscription.created event`);
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;

        const customer = sub.customer;
        const customerId = typeof customer === "string" ? customer : customer?.id;

        let user_email = String(sub.metadata?.user_email || "").trim().toLowerCase();

        // NOTE: Without Stripe SDK, we cannot fetch customer email
        // Rely on metadata or skip if not present
        if (!user_email) {
          console.warn(`[webhook] No user_email in subscription ${sub.id} metadata, skipping`);
          break;
        }

        // For new subscriptions, ensure user exists
        if (event.type === "customer.subscription.created") {
          await ensureUserExists(user_email, customerId);
        }

        const periodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const createdAt = sub.created
          ? new Date(sub.created * 1000).toISOString()
          : null;

        const existingRes = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: sub.id,
        });
        const existing = existingRes?.[0];

        const payload = {
          user_email,
          status: sub.status,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId || null,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: !!sub.cancel_at_period_end,
          billing_interval: sub.items?.data?.[0]?.price?.recurring?.interval || "year",
          amount: sub.items?.data?.[0]?.price?.unit_amount
            ? sub.items.data[0].price.unit_amount / 100
            : null,
        };

        if (!existing?.started_at) {
          payload.started_at = new Date().toISOString();
        }

        const subscriptionStartedAt = normalizeSubscriptionStartDate(
          payload.started_at || existing?.started_at,
          periodStart,
          createdAt
        );
        payload.subscriptionStartedAt = subscriptionStartedAt;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const detectedTier = getTierFromPriceId(priceId);
        
        payload.tier = detectedTier || existing?.tier || 'premium';
        
        if (!detectedTier && priceId) {
          console.warn(`[webhook] Unknown price ID: ${priceId}, using tier: ${payload.tier}`);
        }

        await upsertSubscription(payload);

        const isPaid = sub.status === "active" || sub.status === "trialing";
        
        let userRow = await findUserByEmail(user_email);
        if (!userRow) {
          await ensureUserExists(user_email, customerId);
          userRow = await findUserByEmail(user_email);
        }
        
        console.log(`[webhook] ${event.type} for ${user_email}: status=${sub.status}, isPaid=${isPaid}`);
        await setUserEntitlement(user_email, {
          subscription_level: isPaid ? "paid" : "free",
          subscription_status: sub.status,
          stripe_customer_id: customerId || null,
        });

        break;
      }

      default:
        // Immediately return 200 for unhandled events (no retries)
        break;
    }

    // Record processed event (deduplication)
    try {
      await base44.asServiceRole.entities.ProcessedStripeEvents?.create({
        event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString()
      });
    } catch (err) {
      // Non-fatal - continue even if we can't record the event
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("[webhook] Error:", err);
    // Return 500 but do NOT retry internally
    return json(500, { ok: false, error: err?.message || String(err) });
  }
});