import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse, safeStripeError } from "./_utils/stripe.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

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
    const platform = getPlatform(req);

    if (platform === "ios_companion") {
      return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
    }

    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      try {
        const existing = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = existing.data?.[0]?.id || null;
      } catch (e) {
        return Response.json({
          ok: false,
          error: "STRIPE_CALL_FAILED",
          message: safeStripeError(e)
        }, { status: 500 });
      }
    }

    if (!customerId) {
      return Response.json({
        error: "No Stripe customer found for this account yet. Please subscribe first."
      }, { status: 400 });
    }

    if (!user.stripe_customer_id) {
      await safePersistCustomerId(base44, user.email, customerId);
    }

    const origin = safeOrigin(req);

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/Profile`,
      });
    } catch (e) {
      return Response.json({
        ok: false,
        error: "PORTAL_CREATION_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("[createBillingPortalSession] error:", error);
    return Response.json({
      ok: false,
      error: "FUNCTION_ERROR",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});