import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();
const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalizeSubscriptionStartDate(startedAt, periodStart, createdAt) {
  // Normalize subscription start date: prefer started_at, fall back to current_period_start, then created_at
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
  if (req.method === "GET" || req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecret) return json(500, { ok: false, error: "Missing STRIPE_SECRET_KEY" });
    if (!webhookSecret) return json(500, { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" });

    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

    const sig = req.headers.get("stripe-signature");
    if (!sig) return json(400, { ok: false, error: "Missing stripe-signature header" });

    const rawBody = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
    } catch (err) {
      return json(400, {
        ok: false,
        error: `Webhook signature verification failed: ${err?.message || err}`,
      });
    }

    const base44 = createClientFromRequest(req);

    async function findUserByEmail(email) {
      const rows = await base44.asServiceRole.entities.User.filter({ email });
      return rows && rows.length ? rows[0] : null;
    }

    async function upsertSubscription(payload) {
      const existing = await base44.asServiceRole.entities.Subscription.filter({
        stripe_subscription_id: payload.stripe_subscription_id,
      });

      if (existing && existing.length) {
        await base44.asServiceRole.entities.Subscription.update(existing[0].id, payload);
        return existing[0].id;
      } else {
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
        // Create user from Stripe customer
        await base44.asServiceRole.entities.User.create({
          email,
          full_name: "User from Stripe",
          subscription_level: "paid",
          stripe_customer_id: customerId || null,
        });
      }
      return userRow;
    }

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

        await setUserEntitlement(user_email, {
          subscription_level: "paid",
          subscription_status: "active",
          stripe_customer_id: customerId || null,
        });

        if (subscriptionId) {
           const sub = await stripe.subscriptions.retrieve(subscriptionId);
           const periodStart = sub.current_period_start
             ? new Date(sub.current_period_start * 1000).toISOString()
             : null;
           const periodEnd = sub.current_period_end
             ? new Date(sub.current_period_end * 1000).toISOString()
             : null;
           const createdAt = sub.created
             ? new Date(sub.created * 1000).toISOString()
             : null;

           const subscriptionStartedAt = normalizeSubscriptionStartDate(
             new Date().toISOString(),
             periodStart,
             createdAt
           );

           const priceId = sub.items?.data?.[0]?.price?.id;
           const tier = getTierFromPriceId(priceId) || 'premium';
           
           if (!getTierFromPriceId(priceId) && priceId) {
             console.warn(`[stripeWebhook] Unknown price ID in checkout: ${priceId}. Defaulting to premium.`);
           }

           await upsertSubscription({
             user_email,
             status: sub.status,
             stripe_subscription_id: sub.id,
             stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
             current_period_start: periodStart,
             current_period_end: periodEnd,
             started_at: new Date().toISOString(),
             subscriptionStartedAt,
             tier,
             cancel_at_period_end: !!sub.cancel_at_period_end,
             billing_interval: sub.items?.data?.[0]?.price?.recurring?.interval || "year",
             amount: sub.items?.data?.[0]?.price?.unit_amount
               ? sub.items.data[0].price.unit_amount / 100
               : null,
           });
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

        if (!user_email && customerId) {
          const cust = await stripe.customers.retrieve(customerId);
          if (cust && !cust.deleted) {
            user_email = String(cust.email || "").trim().toLowerCase();
          }
        }

        if (!user_email) break;

        // For new subscriptions, ensure user exists in app
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

        // Check if subscription exists
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

        // Set started_at for new subscriptions or when reactivating
        if (!existing?.started_at) {
          payload.started_at = new Date().toISOString();
        }

        // Normalize subscription start date
        const subscriptionStartedAt = normalizeSubscriptionStartDate(
          payload.started_at || existing?.started_at,
          periodStart,
          createdAt
        );
        payload.subscriptionStartedAt = subscriptionStartedAt;

        // Determine tier from price ID
        const priceId = sub.items?.data?.[0]?.price?.id;
        const detectedTier = getTierFromPriceId(priceId);
        
        // Use detected tier, fallback to existing, then default to premium
        payload.tier = detectedTier || existing?.tier || 'premium';
        
        if (!detectedTier && priceId) {
          console.warn(`[stripeWebhook] Unknown price ID in subscription event: ${priceId}. Using tier: ${payload.tier}`);
        }

        await upsertSubscription(payload);

        const isPaid = sub.status === "active" || sub.status === "trialing";
        
        // Find or create user
        let userRow = await findUserByEmail(user_email);
        if (!userRow) {
          await ensureUserExists(user_email, customerId);
          userRow = await findUserByEmail(user_email);
        }
        
        // Update entitlement
        await setUserEntitlement(user_email, {
          subscription_level: isPaid ? "paid" : "free",
          subscription_status: sub.status,
          stripe_customer_id: customerId || null,
        });

        break;
      }

      default:
        break;
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { ok: false, error: err?.message || String(err) });
  }
});