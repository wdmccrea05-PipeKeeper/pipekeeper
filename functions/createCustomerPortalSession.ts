import Stripe from "npm:stripe@17.5.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

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
      const customers = await stripe.customers.list({ email, limit: 10 });
      if (customers.data?.length) {
        stripeCustomerId = customers.data[0].id;
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