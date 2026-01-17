import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";
const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_PRICE_IDS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TRIAL_END_UTC = Deno.env.get("TRIAL_END_UTC") || ""; // optional

function isIOSCompanionRequest(req) {
  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    return (platform || "").toLowerCase() === "ios";
  } catch {
    return false;
  }
}

function safeOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin;
  return APP_URL;
}

async function safePersistCustomerId(base44, email, customerId) {
  if (!email || !customerId) return;

  // Prefer auth user metadata (service role)
  try {
    if (base44?.asServiceRole?.auth?.updateUser) {
      await base44.asServiceRole.auth.updateUser(email, { stripe_customer_id: customerId });
      return;
    }
  } catch (e) {
    console.warn("[createCheckoutSession] Failed to persist stripe_customer_id on auth user:", e);
  }

  // Fallback: store on UserProfile if present (optional)
  try {
    if (base44?.asServiceRole?.entities?.UserProfile) {
      const rows = await base44.asServiceRole.entities.UserProfile.filter({ email });
      if (rows?.length) {
        await base44.asServiceRole.entities.UserProfile.update(rows[0].id, {
          stripe_customer_id: customerId,
        });
      }
    }
  } catch (e) {
    console.warn("[createCheckoutSession] Fallback persist failed:", e);
  }
}

async function userHasAnySubscription(base44, email) {
  try {
    const rows = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    return !!(rows && rows.length);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (!ALLOWED_PRICE_IDS.length) {
      return Response.json(
        { error: "Server misconfigured: ALLOWED_PRICE_IDS is not set." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId;

    if (!priceId || typeof priceId !== "string") {
      return Response.json({ error: "Missing priceId" }, { status: 400 });
    }

    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
      return Response.json({ error: "Invalid priceId" }, { status: 400 });
    }

    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const origin = safeOrigin(req);
    const isIOS = isIOSCompanionRequest(req);

    // Find or create Stripe customer
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
          platform: isIOS ? "ios_companion" : "web_android",
        },
      });
      customerId = created.id;
    }

    // Persist customer ID safely
    await safePersistCustomerId(base44, user.email, customerId);

    // Trial logic
    const subscription_data = {};
    const nowMs = Date.now();
    const trialEndMs = TRIAL_END_UTC ? Date.parse(TRIAL_END_UTC) : NaN;

    if (!Number.isNaN(trialEndMs) && trialEndMs > nowMs) {
      subscription_data.trial_end = Math.floor(trialEndMs / 1000);
    } else {
      const hasAny = await userHasAnySubscription(base44, user.email);
      if (!hasAny) subscription_data.trial_period_days = 7;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data,
      success_url: `${origin}/Subscription?status=success`,
      cancel_url: `${origin}/Subscription?status=cancel`,
      metadata: {
        user_email: user.email,
        platform: isIOS ? "ios_companion" : "web_android",
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