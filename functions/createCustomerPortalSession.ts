import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse } from "./_utils/stripe.ts";

const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    
    if (!me?.email) {
      return Response.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // Initialize Stripe with validation
    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const email = normEmail(me.email);
    let stripeCustomerId = null;

    // Try: get stripe customer id from user's subscriptions (preferred)
    try {
      const subs = await base44.entities.Subscription.filter({
        provider: "stripe",
        user_id: me.id,
      });

      if (Array.isArray(subs) && subs.length) {
        const withCustomer = subs.find((s) => s.stripe_customer_id);
        if (withCustomer?.stripe_customer_id) {
          stripeCustomerId = withCustomer.stripe_customer_id;
        }
      }
    } catch (e) {
      console.warn("[createCustomerPortalSession] Failed to fetch subs:", e);
    }

    // Fallback: lookup Stripe customer by email
    if (!stripeCustomerId) {
      try {
        const customers = await stripe.customers.list({ email, limit: 10 });
        if (customers.data?.length) {
          stripeCustomerId = customers.data[0].id;
        }
      } catch (e) {
        console.error("[createCustomerPortalSession] Stripe lookup failed:", e.message);
        return Response.json({
          ok: false,
          error: "STRIPE_LOOKUP_FAILED",
          message: `Failed to lookup Stripe customer: ${e.message}`,
        }, { status: 500 });
      }
    }

    if (!stripeCustomerId) {
      return Response.json({ ok: false, error: "NO_STRIPE_CUSTOMER" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: APP_URL,
    });

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("[createCustomerPortalSession] error:", error);
    return Response.json({ 
      ok: false, 
      error: error?.message || "Failed to create portal session" 
    }, { status: 500 });
  }
});