import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function getStripeClient() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key || !key.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY missing or invalid");
  }
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const environment = key.startsWith("sk_live_") ? "live" : "test";
  const masked = `${key.slice(0, 8)}...${key.slice(-4)}`;
  return { stripe, meta: { environment, masked } };
}

const normEmail = (email) => String(email || "").trim().toLowerCase();
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

// Module-specific price ID mapping (no global Pro tier)
const MODULE_PRICE_MAP: Record<string, Record<string, string>> = {
  pipekeeper: {
    monthly: (Deno.env.get("VITE_STRIPE_PIPEKEEPER_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_PIPEKEEPER_ANNUAL")  || "").trim(),
  },
  whiskeykeeper: {
    monthly: (Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_ANNUAL")  || "").trim(),
  },
  cigarkeeper: {
    monthly: (Deno.env.get("VITE_STRIPE_CIGARKEEPER_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_CIGARKEEPER_ANNUAL")  || "").trim(),
  },
  winekeeper: {
    monthly: (Deno.env.get("VITE_STRIPE_WINEKEEPER_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_WINEKEEPER_ANNUAL")  || "").trim(),
  },
  founders_bundle: {
    monthly: (Deno.env.get("VITE_STRIPE_FOUNDERS_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_FOUNDERS_ANNUAL")  || "").trim(),
  },
  three_module_bundle: {
    monthly: (Deno.env.get("VITE_STRIPE_THREE_BUNDLE_MONTHLY") || "").trim(),
    annual:  (Deno.env.get("VITE_STRIPE_THREE_BUNDLE_ANNUAL")  || "").trim(),
  },
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

// Resolve module key from caller-supplied "tier" or "module" value
function resolveModuleKey(input: unknown): string {
  const raw = String(input || "").trim().toLowerCase();
  // Accept canonical module names and common shorthands
  const aliases: Record<string, string> = {
    pipe: "pipekeeper",
    whiskey: "whiskeykeeper",
    cigar: "cigarkeeper",
    wine: "winekeeper",
    founders: "founders_bundle",
    founders_bundle: "founders_bundle",
    "three_module_bundle": "three_module_bundle",
    three: "three_module_bundle",
  };
  return aliases[raw] || raw;
}

function getPriceIdFromModuleAndInterval(moduleKey: string, interval: string): string {
  const normalizedInterval = String(interval || "").toLowerCase();
  let intervalKey: string;
  if (normalizedInterval === "month" || normalizedInterval === "monthly") {
    intervalKey = "monthly";
  } else if (normalizedInterval === "year" || normalizedInterval === "yearly" || normalizedInterval === "annual") {
    intervalKey = "annual";
  } else {
    intervalKey = normalizedInterval;
  }
  return MODULE_PRICE_MAP[moduleKey]?.[intervalKey] || "";
}

function resolveAppSlugFromTier(tier: unknown) {
  const normalized = String(tier || "").trim().toLowerCase();
  if (normalized.startsWith("whiskey")) return "whiskeykeeper";
  if (normalized.startsWith("cigar")) return "cigarkeeper";
  if (normalized.startsWith("wine")) return "winekeeper";
  return "pipekeeper";
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
    const module = body?.module;
    const interval = body?.interval;
    
    // Accept either "module" or "tier" field – treat them as the module/product key
    const rawModuleInput = module || tier;
    if (!rawModuleInput || !interval) {
      return Response.json({ error: "Missing module (or tier) and interval" }, { status: 400 });
    }

    // Resolve canonical module key (e.g. "pipekeeper", "founders_bundle")
    const moduleKey = resolveModuleKey(rawModuleInput);
    const priceId = getPriceIdFromModuleAndInterval(moduleKey, interval);
    const appSlug = resolveAppSlugFromTier(moduleKey);
    const appEnvironment = String(Deno.env.get("APP_ENV") || Deno.env.get("ENVIRONMENT") || "production").trim().toLowerCase();
    if (!priceId) {
      return Response.json({ error: `No price configured for module="${moduleKey}" interval="${interval}". Use createModuleCheckoutSession for explicit module-based checkout.` }, { status: 400 });
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
        app: appSlug,
        app_slug: appSlug,
        app_environment: appEnvironment,
        legacy_app_slug: "collectionkeeper",
        app_aliases: "pipekeeper,collectionkeeper",
        user_email: emailLower,
        user_id: userId,
        platform: platform,
        tier: moduleKey,
        interval: interval === "annual" ? "annual" : "monthly",
      },
      subscription_data: {
        metadata: {
          app: appSlug,
          app_slug: appSlug,
          app_environment: appEnvironment,
          legacy_app_slug: "collectionkeeper",
          app_aliases: "pipekeeper,collectionkeeper",
          user_email: emailLower,
          user_id: userId,
          platform: platform,
          tier: moduleKey,
          interval: interval === "annual" ? "annual" : "monthly",
        },
      },
    });

    if (!session?.url) {
      console.error("[createCheckoutSessionV2] Stripe session created but no URL returned. Session ID:", session?.id);
      throw new Error("Stripe checkout session created without URL");
    }

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    const msg = error?.message || String(error);
    console.error("[createCheckoutSessionV2] Error:", msg);

    return Response.json({ ok: false, error: "Unable to start checkout. Please try again." });
  }
});
