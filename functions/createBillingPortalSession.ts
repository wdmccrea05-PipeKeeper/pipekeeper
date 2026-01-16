import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

function isIOSCompanionRequest(req) {
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") || "").toLowerCase();
  return platform === "ios";
}

async function safePersistCustomerId(base44, email, customerId) {
  try {
    const authApi = base44 && base44.asServiceRole && base44.asServiceRole.auth;
    if (authApi && typeof authApi.updateUser === "function") {
      await authApi.updateUser(email, { stripe_customer_id: customerId });
    }
  } catch (e) {
    // Never break billing portal creation because persistence failed
    console.warn("safePersistCustomerId skipped/failed:", e && e.message ? e.message : e);
  }
}

Deno.serve(async (req) => {
  // iOS compliance: Block portal for iOS companion
  if (isIOSCompanionRequest(req)) {
    return Response.json({ error: "Not available in iOS companion app." }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer canonical field on user
    let customerId = user.stripe_customer_id || null;

    // Fallback: look up from Subscription entity
    if (!customerId) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: user.email,
      });

      if (subs && subs.length) {
        const withCustomer = subs.find((s) => s && s.stripe_customer_id);
        customerId = withCustomer ? withCustomer.stripe_customer_id : null;
      }
    }

    if (!customerId) {
      return Response.json(
        {
          error:
            "No Stripe customer found for this account yet. Please start a subscription first.",
        },
        { status: 400 }
      );
    }

    // Persist to user record IF the auth admin API is available (do not crash if not)
    if (!user.stripe_customer_id && customerId) {
      await safePersistCustomerId(base44, user.email, customerId);
    }

    // Return URL back into app
    const origin = req.headers.get("origin");
    const appUrl = origin && origin.startsWith("http") ? origin : APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/Profile`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("createBillingPortalSession error:", error);
    return Response.json(
      { error: (error && error.message) ? error.message : "Failed to create portal session" },
      { status: 500 }
    );
  }
});