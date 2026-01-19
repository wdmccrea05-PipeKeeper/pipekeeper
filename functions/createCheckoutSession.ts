import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

// ---- Config ----
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

// Prefer explicit env vars for each interval (simplest + safest)
const PRICE_ID_MONTHLY = (Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || "").trim();
const PRICE_ID_YEARLY = (Deno.env.get("STRIPE_PRICE_ID_YEARLY") || "").trim();

// Optional: security allowlist (comma-separated price IDs)
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
    // iOS wrapper appends platform=ios (per your WebContainer config)
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

  // IMPORTANT: Do NOT call base44.auth.updateUser (it doesn't exist).
  // Only attempt service-role auth update if available.
  try {
    const authApi = base44?.asServiceRole?.auth;
    if (authApi && typeof authApi.updateUser === "function") {
      await authApi.updateUser(email, { stripe_customer_id: customerId });
      return;
    }
  } catch (e) {
    console.warn("[createCheckoutSession] persist auth stripe_customer_id failed:", e?.message || e);
  }

  // Optional fallback: store on UserProfile entity if your project has it
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
  const interval = (billingInterval || "").toLowerCase();
  if (interval === "month" || interval === "monthly") return PRICE_ID_MONTHLY;
  if (interval === "year" || interval === "annual" || interval === "yearly") return PRICE_ID_YEARLY;
  return "";
}

function isAllowedPriceId(priceId) {
  if (!priceId) return false;
  if (!ALLOWED_PRICE_IDS.length) return true; // if allowlist not set, accept env priceIds
  return ALLOWED_PRICE_IDS.includes(priceId);
}

// ---- Handler ----
Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return Response.json({ error: "Server misconfigured: STRIPE_SECRET_KEY missing." }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);

// Body supports either:
// 1) { billingInterval: "month" | "year" }
// 2) { priceId: "price_..." }
const body = await req.json().catch(() => ({}));

let priceId = "";
const sentPriceId = typeof body?.priceId === "string" ? body.priceId.trim() : "";
const billingInterval = body?.billingInterval;

if (sentPriceId) {
  priceId = sentPriceId;
} else {
  priceId = pickPriceId(billingInterval);
}

// Better error message when request is wrong
if (!priceId) {
  return Response.json(
    { error: "Missing billingInterval (month/year) or priceId in request body." },
    { status: 400 }
  );
}

// If you’re using env-based price ids, you can optionally force them:
// priceId must match the monthly/yearly IDs OR be in ALLOWED_PRICE_IDS.
const envPriceIds = [PRICE_ID_MONTHLY, PRICE_ID_YEARLY].filter(Boolean);
const allowed = new Set([ ...envPriceIds, ...ALLOWED_PRICE_IDS ]);

if (allowed.size && !allowed.has(priceId)) {
  return Response.json({ error: "Invalid priceId" }, { status: 400 });
}

    if (!isAllowedPriceId(priceId)) {
      return Response.json({ error: "Invalid price configuration (priceId not allowed)." }, { status: 500 });
    }

    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const platform = getPlatform(req);
    const origin = safeOrigin(req);

    // Find or create Stripe customer (prefer stored customer id)
    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = existing.data?.[0]?.id || null;
    }

    if (!customerId) {
      const created = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_email: user.email,
          platform,
        },
      });
      customerId = created.id;
    }

    // Persist customer ID for later portal usage (best effort)
    await safePersistCustomerId(base44, user.email, customerId);

    // IMPORTANT: No Stripe trial here—your app already grants 7-day access at signup.
    // If they click subscribe, we charge immediately.
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  allow_promotion_codes: true,
  subscription_data: {
    metadata: {
      user_email: user.email,
      platform,
    },
  },
  success_url: `${origin}/Subscription?status=success`,
  cancel_url: `${origin}/Subscription?status=cancel`,
  metadata: {
    user_email: user.email,
    platform,
    price_id: priceId,
  },
});

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[createCheckoutSession] error:", err);
    return Response.json(
      { error: `Failed to create checkout: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
});