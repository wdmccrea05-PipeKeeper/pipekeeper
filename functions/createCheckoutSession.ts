import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

// ---- Config ----
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

const PRICE_ID_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || "").trim();
const PRICE_ID_YEARLY = (Deno.env.get("STRIPE_PRICE_ID_YEARLY") || "").trim();

const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_PRICE_IDS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const stripe = new Stripe(STRIPE_SECRET_KEY);

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

function pickPriceId(billingInterval) {
  const interval = String(billingInterval || "").toLowerCase();
  if (interval === "month" || interval === "monthly") return PRICE_ID_MONTHLY;
  if (interval === "year" || interval === "annual" || interval === "yearly") return PRICE_ID_YEARLY;
  return "";
}

function isAllowedPriceId(priceId) {
  if (!priceId) return false;
  if (!ALLOWED_PRICE_IDS.length) return true;
  return ALLOWED_PRICE_IDS.includes(priceId);
}

// ---- Handler ----
Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Server misconfigured: STRIPE_SECRET_KEY missing." },
        { status: 500 }
      );
    }

    const platform = getPlatform(req);

    // Apple compliance: block Stripe checkout inside iOS companion
    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const origin = safeOrigin(req);

    const body = await req.json().catch(() => ({}));
    const billingInterval = body?.billingInterval;
    const explicitPriceId = (body?.priceId || "").trim();

    const priceId = explicitPriceId || pickPriceId(billingInterval);

    if (!priceId) {
      return Response.json(
        { error: "Missing priceId or billingInterval (month/year)." },
        { status: 400 }
      );
    }

    if (!isAllowedPriceId(priceId)) {
      return Response.json({ error: "Invalid priceId." }, { status: 400 });
    }

    // Customer resolution
    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = existing.data?.[0]?.id || null;
    }

    if (!customerId) {
      const created = await stripe.customers.create({ email: user.email });
      customerId = created.id;
    }

    if (!user.stripe_customer_id) {
      await safePersistCustomerId(base44, user.email, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/Subscription?success=1`,
      cancel_url: `${origin}/Subscription?canceled=1`,
      metadata: {
        user_email: user.email,
        platform: platform,
      },
      subscription_data: {
        metadata: {
          user_email: user.email,
          platform: platform,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("[createCheckoutSession] error:", error);
    return Response.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
});