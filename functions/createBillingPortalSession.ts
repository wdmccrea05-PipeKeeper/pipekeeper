import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

async function findCustomerIdByEmail(email) {
  if (!email) return null;

  // Stripe Search API (best option)
  try {
    const result = await stripe.customers.search({
      query: `email:"${email.replace(/"/g, '\\"')}"`,
      limit: 1,
    });
    const customer = result?.data?.[0];
    return customer?.id || null;
  } catch (_e) {
    // Fallback to list if search isn't available on your account
    const list = await stripe.customers.list({ email, limit: 1 });
    return list?.data?.[0]?.id || null;
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req) => {
  // Optional: handle CORS preflight if your environment ever needs it
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, authorization',
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      return json({ error: 'Server is missing STRIPE_SECRET_KEY' }, 500);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 1) Prefer user field
    let customerId = user.stripe_customer_id || null;

    // 2) Service-role fallback: Subscription row
    if (!customerId) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: user.email,
      });
      const withCustomer = subs?.find((s) => s?.stripe_customer_id);
      customerId = withCustomer?.stripe_customer_id || null;
    }

    // 3) Stripe fallback: search customer by email (fixes paid users created before webhook/user field existed)
    if (!customerId) {
      customerId = await findCustomerIdByEmail(user.email);
    }

    // Persist it for next time
    if (customerId) {
      await base44.asServiceRole.auth.updateUser(user.email, {
        stripe_customer_id: customerId,
      });
    } else {
      return json(
        {
          error:
            "No Stripe customer found for this account yet. Please start a subscription from the Subscription page first.",
        },
        400
      );
    }

    const origin = req.headers.get("origin");
    const appUrl = origin && origin.startsWith("http") ? origin : APP_URL;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/Profile`,
    });

    return json({ url: portalSession.url });
  } catch (error) {
    console.error("createBillingPortalSession error:", error);
    return json(
      { error: error?.message || "Failed to create portal session" },
      500
    );
  }
});