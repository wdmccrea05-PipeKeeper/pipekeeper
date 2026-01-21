import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

const stripe = new Stripe(STRIPE_SECRET_KEY);

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
  try {
    const authApi = base44?.asServiceRole?.auth;
    if (authApi && typeof authApi.updateUser === "function") {
      await authApi.updateUser(email, { stripe_customer_id: customerId });
    }
  } catch (e) {
    console.warn("[createBillingPortalSession] persist skipped/failed:", e?.message || e);
  }
}

Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "Server misconfigured: STRIPE_SECRET_KEY missing." },
        { status: 500 }
      );
    }

    const platform = getPlatform(req);

    // Apple compliance: billing portal not available in iOS companion
    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer stripe_customer_id stored on user
    let customerId = user.stripe_customer_id || null;

    // Fallback: find Stripe customer by email
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = existing.data?.[0]?.id || null;
    }

    if (!customerId) {
      return Response.json(
        { error: "No Stripe customer found for this account yet. Please subscribe first." },
        { status: 400 }
      );
    }

    // Best-effort persistence
    if (!user.stripe_customer_id) {
      await safePersistCustomerId(base44, user.email, customerId);
    }

    const origin = safeOrigin(req);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/Profile`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("[createBillingPortalSession] error:", error);
    return Response.json(
      { error: error?.message || "Failed to create billing portal session" },
      { status: 500 }
    );
  }
});