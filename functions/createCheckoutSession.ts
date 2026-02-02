// DEPLOYMENT: 2026-02-02T03:55:00Z - No imports

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// ---- Config ----
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

// Price ID mapping (tier + interval -> Stripe Price ID)
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

// Legacy fallback support
const LEGACY_PRICE_ID_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || "").trim();
const LEGACY_PRICE_ID_YEARLY = (Deno.env.get("STRIPE_PRICE_ID_YEARLY") || "").trim();

const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_PRICE_IDS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ---- Helpers ----
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
      return;
    }
  } catch (e) {
    console.warn("[createCheckoutSession] persist auth stripe_customer_id failed:", e?.message || e);
  }

  // Optional fallback if you have a UserProfile entity
  try {
    const UserProfile = base44?.asServiceRole?.entities?.UserProfile;
    if (UserProfile) {
      const rows = await UserProfile.filter({ email });
      if (rows?.length) {
        await UserProfile.update(rows[0].id, { stripe_customer_id: customerId });
      }
    }
  } catch (e) {
    console.warn("[createCheckoutSession] persist UserProfile stripe_customer_id failed:", e?.message || e);
  }
}

function getPriceIdFromTierAndInterval(tier, interval) {
  const normalizedTier = String(tier || "").toLowerCase();
  const normalizedInterval = String(interval || "").toLowerCase();
  
  // Normalize interval variants
  let intervalKey = normalizedInterval;
  if (normalizedInterval === "month" || normalizedInterval === "monthly") {
    intervalKey = "monthly";
  } else if (normalizedInterval === "year" || normalizedInterval === "yearly") {
    intervalKey = "annual";
  }
  
  const priceId = PRICE_MAP[normalizedTier]?.[intervalKey];
  return priceId || "";
}

function isAllowedPriceId(priceId) {
  if (!priceId) return false;
  
  // Check against all valid price IDs in the map
  const validPriceIds = [
    PRICE_MAP.premium.monthly,
    PRICE_MAP.premium.annual,
    PRICE_MAP.pro.monthly,
    PRICE_MAP.pro.annual,
    LEGACY_PRICE_ID_MONTHLY,
    LEGACY_PRICE_ID_YEARLY,
  ].filter(Boolean);
  
  // Add ALLOWED_PRICE_IDS if configured
  if (ALLOWED_PRICE_IDS.length) {
    return ALLOWED_PRICE_IDS.includes(priceId);
  }
  
  return validPriceIds.includes(priceId);
}

// ---- Handler ----
Deno.serve(async (req) => {
  try {
    const platform = getPlatform(req);

    // Apple compliance: block Stripe checkout inside iOS companion
    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    
    // Get Stripe key via function call
    const keyResult = await base44.functions.invoke('getStripeClient', {});
    if (!keyResult?.data?.key) {
      return Response.json({ error: "Failed to get Stripe key" }, { status: 500 });
    }
    const stripe = new Stripe(keyResult.data.key, { apiVersion: "2024-06-20" });
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailLower = normEmail(user.email);
    const userId = user.id;
    const origin = safeOrigin(req);

    const body = await req.json().catch(() => ({}));
    
    // Primary path: tier + interval
    const tier = body?.tier;
    const interval = body?.interval;
    
    // Legacy path: priceId (for backward compatibility)
    const legacyPriceId = (body?.priceId || "").trim();
    
    let priceId = "";
    
    // Prefer tier + interval approach
    if (tier && interval) {
      priceId = getPriceIdFromTierAndInterval(tier, interval);
      
      if (!priceId) {
        return Response.json(
          { error: `Invalid tier/interval combination: ${tier}/${interval}. Supported: premium/pro + monthly/annual.` },
          { status: 400 }
        );
      }
    } else if (legacyPriceId) {
      // Backward compatibility: validate priceId against allowlist
      if (!isAllowedPriceId(legacyPriceId)) {
        return Response.json(
          { error: "Invalid priceId. Please use tier and interval parameters instead." },
          { status: 400 }
        );
      }
      priceId = legacyPriceId;
    } else {
      return Response.json(
        { error: "Missing required parameters: tier + interval (or legacy priceId)." },
        { status: 400 }
      );
    }

    if (!priceId) {
      return Response.json(
        { error: "Failed to determine price. Please check tier and interval." },
        { status: 400 }
      );
    }

    // Customer resolution - use normalized email
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

    // Normalize tier and interval for metadata
    const normalizedTier = String(tier || "premium").toLowerCase();
    const normalizedInterval = String(interval || "").toLowerCase();
    let intervalKey = normalizedInterval;
    if (normalizedInterval === "month" || normalizedInterval === "monthly") {
      intervalKey = "monthly";
    } else if (normalizedInterval === "year" || normalizedInterval === "yearly" || normalizedInterval === "annual") {
      intervalKey = "annual";
    }

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
        tier: normalizedTier,
        interval: intervalKey,
      },
      subscription_data: {
        metadata: {
          user_email: emailLower,
          user_id: userId,
          platform: platform,
          tier: normalizedTier,
          interval: intervalKey,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("[createCheckoutSession] Fatal error:", error);
    return Response.json({
      ok: false,
      error: "CHECKOUT_CREATION_FAILED",
      message: error?.message || String(error)
    }, { status: 500 });
  }
});