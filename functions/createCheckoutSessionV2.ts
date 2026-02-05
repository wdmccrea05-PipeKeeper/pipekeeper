import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_utils/stripeClient.ts";

const normEmail = (email) => String(email || "").trim().toLowerCase();
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

// Price ID mapping
const PRICE_MAP = {
  premium: {
    monthly: (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY") || "").trim(),
    annual: (Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL") || "").trim(),
  },
  pro: {
    monthly: (Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") || "").trim(),
    annual: (Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") || "").trim(),
  }
};

function getPlatform(req) {
  try {
    const url = new URL(req.url);
    const platform = (url.searchParams.get("platform") || "").toLowerCase();
    return platform === "ios" ? "ios_companion" : "web_android";
  } catch {
    return "web_android";
  }
}

function safeOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin;
  return APP_URL;
}

async function safePersistCustomerId(base44, email, customerId) {
  if (!email || !customerId) return;
  try {
    const authApi = base44?.asServiceRole?.auth;
    if (authApi && typeof authApi.updateUser === "function") {
      await authApi.updateUser(email, { stripe_customer_id: customerId });
    }
  } catch (e) {
    console.warn("[createCheckoutSessionV2] persist failed:", e?.message);
  }
}

function getPriceIdFromTierAndInterval(tier, interval) {
  const normalizedTier = String(tier || "").toLowerCase();
  const normalizedInterval = String(interval || "").toLowerCase();
  
  let intervalKey = normalizedInterval;
  if (normalizedInterval === "month" || normalizedInterval === "monthly") {
    intervalKey = "monthly";
  } else if (normalizedInterval === "year" || normalizedInterval === "yearly" || normalizedInterval === "annual") {
    intervalKey = "annual";
  }
  
  const priceId = PRICE_MAP[normalizedTier]?.[intervalKey];
  return priceId || "";
}

Deno.serve(async (req) => {
  try {
    const platform = getPlatform(req);

    // Block iOS companion
    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const { stripe, meta } = getStripeClient();
    console.log(`[createCheckoutSessionV2] Using ${meta.environment} key`);
    
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailLower = normEmail(user.email);
    const userId = user.id;
    const origin = safeOrigin(req);
    const body = await req.json().catch(() => ({}));
    
    const tier = body?.tier;
    const interval = body?.interval;
    
    if (!tier || !interval) {
      return Response.json({ error: "Missing tier or interval" }, { status: 400 });
    }

    const priceId = getPriceIdFromTierAndInterval(tier, interval);
    if (!priceId) {
      return Response.json({ error: "Invalid tier/interval combination" }, { status: 400 });
    }

    // Get or create customer
    let customerId = user.stripe_customer_id || null;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: emailLower, limit: 1 });
      customerId = existing.data?.[0]?.id || null;
    }
    if (!customerId) {
      const created = await stripe.customers.create({ email: emailLower });
      customerId = created.id;
    }
    if (!user.stripe_customer_id) {
      await safePersistCustomerId(base44, emailLower, customerId);
    }

    // Create session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/Subscription?success=1`,
      cancel_url: `${origin}/Subscription?canceled=1`,
      metadata: {
        user_email: emailLower,
        user_id: userId,
        platform: platform,
        tier: String(tier).toLowerCase(),
        interval: interval === "annual" ? "annual" : "monthly",
      },
      subscription_data: {
        metadata: {
          user_email: emailLower,
          user_id: userId,
          platform: platform,
          tier: String(tier).toLowerCase(),
          interval: interval === "annual" ? "annual" : "monthly",
        },
      },
    });

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    const msg = error?.message || String(error);
    console.error("[createCheckoutSessionV2] Error:", msg);
    
    // Return fallback flag
    return Response.json({
      ok: false,
      fallback: true
    });
  }
});