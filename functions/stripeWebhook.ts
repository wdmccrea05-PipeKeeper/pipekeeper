// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripe.js";

const normEmail = (email) => String(email || "").trim().toLowerCase();

const PRICE_ID_PREMIUM_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim();
const PRICE_ID_PREMIUM_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim();
const PRICE_ID_PRO_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim();
const PRICE_ID_PRO_ANNUAL = (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim();

function json(status, body) {
  return new Response(JSON.stringify({ ...body, version: "v26-key-refresh" }), {
    status,
    headers: { 
      "content-type": "application/json",
      "X-PipeKeeper-Webhook-Version": "v26-key-refresh"
    },
  });
}

function normalizeSubscriptionStartDate(startedAt, periodStart, createdAt) {
  return startedAt || periodStart || createdAt || null;
}

async function getTier(sub, stripe) {
  // Priority 1: Subscription metadata.tier (from checkout session)
  const metadataTier = (sub.metadata?.tier || "").toLowerCase();
  if (metadataTier === "pro" || metadataTier === "premium") {
    return metadataTier;
  }

  // Priority 2: Price lookup_key or nickname
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      
      const lookupKey = (price.lookup_key || "").toLowerCase();
      if (lookupKey.includes("pro")) return "pro";
      if (lookupKey.includes("premium")) return "premium";
      
      const nickname = (price.nickname || "").toLowerCase();
      if (nickname.includes("pro")) return "pro";
      if (nickname.includes("premium")) return "premium";
      
      // Priority 3: Product metadata or name
      const productId = typeof price.product === "string" ? price.product : price.product?.id;
      if (productId) {
        try {
          const product = await stripe.products.retrieve(productId);
          
          const productMetadataTier = (product.metadata?.tier || "").toLowerCase();
          if (productMetadataTier === "pro" || productMetadataTier === "premium") {
            return productMetadataTier;
          }
          
          const productName = (product.name || "").toLowerCase();
          if (productName.includes("pro")) return "pro";
          if (productName.includes("premium")) return "premium";
        } catch (err) {
          console.warn(`[getTier] Failed to retrieve product ${productId}:`, err.message);
        }
      }
    } catch (err) {
      console.warn(`[getTier] Failed to retrieve price ${priceId}:`, err.message);
    }
    
    // Priority 4: Fallback to env-mapped priceId
    if (priceId === PRICE_ID_PRO_MONTHLY || priceId === PRICE_ID_PRO_ANNUAL) {
      return "pro";
    }
    if (priceId === PRICE_ID_PREMIUM_MONTHLY || priceId === PRICE_ID_PREMIUM_ANNUAL) {
      return "premium";
    }
  }

  // Priority 5: Return null if tier cannot be determined (do NOT default silently)
  console.warn(`[getTier] Could not determine tier for subscription ${sub.id}, price ${priceId}`);
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
    
    if (!webhookSecret) {
      return json(500, { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" });
    }

    const stripe = getStripeClient();

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
    }

    // Helper functions
    async function findUserByEmail(email) {
      const rows = await base44.asServiceRole.entities.User.filter({ email });
      return rows && rows.length ? rows[0] : null;
    }

    async function upsertSubscription(payload) {
      // Try to find by provider_subscription_id first (new way)
      let existing = null;
      if (payload.provider_subscription_id) {
        const byProvider = await base44.asServiceRole.entities.Subscription.filter({
          provider: 'stripe',
          provider_subscription_id: payload.provider_subscription_id,
        });
        existing = byProvider?.[0];
      }
      
      // Fallback to legacy stripe_subscription_id for backward compatibility
      if (!existing && payload.stripe_subscription_id) {
        const byLegacy = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: payload.stripe_subscription_id,
        });
        existing = byLegacy?.[0];
      }

      if (existing) {
        console.log(`[webhook] Updating existing subscription ${payload.provider_subscription_id} for user_id=${payload.user_id || 'null'} email=${payload.user_email}`);
        await base44.asServiceRole.entities.Subscription.update(existing.id, payload);
        return existing.id;
      } else {
        console.log(`[webhook] Creating new subscription ${payload.provider_subscription_id} for user_id=${payload.user_id || 'null'} email=${payload.user_email}`);
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
        userRow = await base44.asServiceRole.entities.User.create({
          email,
          full_name: "User from Stripe",
          role: "user",
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

        const user_email = normEmail(emailRaw);
        const user_id = session.metadata?.user_id || null;
        
        if (!user_email) break;

        // Ensure user exists before setting entitlement
        await ensureUserExists(user_email, customerId);

        // Get tier from session metadata
        const sessionTier = (session.metadata?.tier || "").toLowerCase();
        const tierValue = (sessionTier === "pro" || sessionTier === "premium") ? sessionTier : null;
        
        console.log(`[webhook] checkout.session.completed for ${user_email}, user_id=${user_id}, tier=${tierValue}, setting paid status`);
        await setUserEntitlement(user_email, {
          subscription_level: "paid",
          subscription_status: "active",
          subscription_tier: tierValue,
          stripe_customer_id: customerId || null,
        });

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

        let user_email = normEmail(sub.metadata?.user_email || "");
        let user_id = sub.metadata?.user_id || null;

        // If no email in metadata, fetch customer details from Stripe
        if (!user_email && customerId) {
          try {
            const customerObj = await stripe.customers.retrieve(customerId);
            user_email = normEmail(customerObj.email || "");
            console.log(`[webhook] Fetched email from customer ${customerId}: ${user_email}`);
          } catch (err) {
            console.error(`[webhook] Failed to fetch customer ${customerId}:`, err.message);
          }
        }

        if (!user_email) {
          console.warn(`[webhook] No user_email found for subscription ${sub.id}, skipping`);
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

        // Find existing by provider_subscription_id or legacy stripe_subscription_id
        let existing = null;
        const byProvider = await base44.asServiceRole.entities.Subscription.filter({
          provider: 'stripe',
          provider_subscription_id: sub.id,
        });
        existing = byProvider?.[0];
        
        if (!existing) {
          const byLegacy = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: sub.id,
          });
          existing = byLegacy?.[0];
        }

        const payload = {
          user_id: user_id || existing?.user_id || null,
          user_email,
          provider: 'stripe',
          provider_subscription_id: sub.id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId || null,
          status: sub.status,
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

        const detectedTier = await getTier(sub, stripe);
        
        // Keep existing tier if we can't determine new one
        payload.tier = detectedTier || existing?.tier || null;
        
        if (!detectedTier) {
          console.warn(`[webhook] Could not determine tier for subscription ${sub.id}, keeping existing: ${payload.tier || 'null'}`);
        }

        await upsertSubscription(payload);

        const isPaid = sub.status === "active" || sub.status === "trialing";
        
        let userRow = await findUserByEmail(user_email);
        if (!userRow) {
          await ensureUserExists(user_email, customerId);
          userRow = await findUserByEmail(user_email);
        }
        
        console.log(`[webhook] ${event.type} for ${user_email}, user_id=${user_id}: status=${sub.status}, tier=${payload.tier}, isPaid=${isPaid}`);
        await setUserEntitlement(user_email, {
          subscription_level: isPaid ? "paid" : "free",
          subscription_status: sub.status,
          subscription_tier: payload.tier || null,
          stripe_customer_id: customerId || null,
        });

        break;
      }

      default:
        // Immediately return 200 for unhandled events
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
      // Non-fatal
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error("[webhook] Fatal error:", err);
    return json(500, { ok: false, error: "WEBHOOK_ERROR", message: safeStripeError(err) });
  }
});