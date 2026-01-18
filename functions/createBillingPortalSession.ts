import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function isIOSCompanionRequest(req) {
  try {
    const url = new URL(req.url);
    const platform = (url.searchParams.get("platform") || "").toLowerCase();
    if (platform === "ios") return true;
  } catch {}

  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  return ua.includes("pipekeeperios/");
}

function safeOrigin(req) {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("http")) return origin;
  return APP_URL;
}

async function findStripeCustomerIdForEmail(email) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  return existing.data?.[0]?.id || null;
}

Deno.serve(async (req) => {
  // Block iOS companion (Apple compliance)
  if (isIOSCompanionRequest(req)) {
    return json({ error: "Not available in iOS companion app." }, 403);
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    // IMPORTANT: Do NOT call base44.auth.updateUser / updateUser.
    // We'll derive customerId from Stripe by email (reliable) and proceed.
    const customerId = await findStripeCustomerIdForEmail(user.email);

    if (!customerId) {
      return json(
        {
          error:
            "No Stripe customer found for this account yet. Please start a subscription first.",
        },
        400
      );
    }

    const origin = safeOrigin(req);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/Profile`,
    });

    return json({ url: portalSession.url });
  } catch (err) {
    console.error("[createBillingPortalSession] error:", err);
    return json(
      { error: err && err.message ? err.message : "Failed to create portal session" },
      500
    );
  }
});