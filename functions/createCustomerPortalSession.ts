// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

// Force redeploy: 2026-02-02

import Stripe from "npm:stripe@17.5.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeSecretKeyLive } from "./_shared/remoteConfig.ts";

const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();

function normEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const start = Date.now();
  const where = { stage: "init" };
  
  try {
    // Authenticate user
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    
    if (!authUser?.id || !authUser?.email) {
      return json(401, { 
        ok: false, 
        error: "UNAUTHENTICATED",
        where: "auth" 
      });
    }

    where.stage = "stripe_init";
    
    // Resolve Stripe key (env OR RemoteConfig fallback)
    const { value: stripeKey, source } = await getStripeSecretKeyLive(req);

    if (!stripeKey) {
      return json(500, {
        ok: false,
        error: "Stripe key missing (env + RemoteConfig)",
        key_source: source,
        where: "stripe_init"
      });
    }

    // Create Stripe client
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    
    // Sanity check
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      console.error("[createCustomerPortalSession] Stripe sanity check failed:", e);
      return json(500, {
        ok: false,
        error: "STRIPE_VALIDATION_FAILED",
        where: "stripe_init",
        key_source: source,
        message: e?.message || String(e)
      });
    }

    where.stage = "lookup_user";
    const email = normEmail(authUser.email);
    let stripeCustomerId = null;

    // Try 1: Get stripe_customer_id from User entity by ID
    try {
      const userEntity = await base44.entities.User.get(authUser.id);
      if (userEntity?.stripe_customer_id) {
        stripeCustomerId = userEntity.stripe_customer_id;
      }
    } catch (e) {
      console.warn("[createCustomerPortalSession] User.get failed, trying filter:", e);
    }

    // Try 2: Filter User entity by email if not found by ID
    if (!stripeCustomerId) {
      try {
        const users = await base44.entities.User.filter({ email });
        if (users?.[0]?.stripe_customer_id) {
          stripeCustomerId = users[0].stripe_customer_id;
        }
      } catch (e) {
        console.warn("[createCustomerPortalSession] User.filter failed:", e);
      }
    }

    where.stage = "recover_customer";

    // Try 3: Recover from Stripe subscriptions
    if (!stripeCustomerId) {
      try {
        const subs = await base44.entities.Subscription.filter({
          provider: "stripe",
          user_id: authUser.id,
        });

        if (Array.isArray(subs) && subs.length) {
          const withCustomer = subs.find((s) => s.stripe_customer_id);
          if (withCustomer?.stripe_customer_id) {
            stripeCustomerId = withCustomer.stripe_customer_id;
          }
        }
      } catch (e) {
        console.warn("[createCustomerPortalSession] Subscription lookup failed:", e);
      }
    }

    // Try 4: Lookup Stripe customer by email and persist
    if (!stripeCustomerId) {
      try {
        // Try search first (better performance)
        let customer = null;
        try {
          const searchResults = await stripe.customers.search({
            query: `email:'${email}'`,
            limit: 1,
          });
          customer = searchResults.data?.[0];
        } catch (searchErr) {
          // Fallback to list if search fails
          const customers = await stripe.customers.list({ email, limit: 1 });
          customer = customers.data?.[0];
        }

        if (customer?.id) {
          stripeCustomerId = customer.id;
          
          // Persist to User entity for future lookups
          try {
            await base44.asServiceRole.entities.User.update(authUser.id, {
              stripe_customer_id: customer.id,
            });
          } catch (persistErr) {
            console.warn("[createCustomerPortalSession] Failed to persist customer ID:", persistErr);
          }
        }
      } catch (e) {
        console.error("[createCustomerPortalSession] Stripe customer lookup failed:", e.message);
        return json(500, {
          ok: false,
          error: "STRIPE_LOOKUP_FAILED",
          where: "recover_customer",
          message: e?.message || String(e)
        });
      }
    }

    if (!stripeCustomerId) {
      return json(404, { 
        ok: false, 
        error: "NO_STRIPE_CUSTOMER",
        where: "recover_customer",
        message: "No Stripe customer found. Please subscribe first."
      });
    }

    where.stage = "create_portal";

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: APP_URL,
    });

    return json(200, { 
      ok: true, 
      url: session.url,
      key_source: source,
      ms: Date.now() - start
    });
    
  } catch (error) {
    console.error("[createCustomerPortalSession] error:", error);
    return json(500, { 
      ok: false, 
      error: error?.message || String(error),
      name: error?.name || null,
      where: where.stage,
      stack: error?.stack ? String(error.stack).slice(0, 2000) : null,
      ms: Date.now() - start
    });
  }
});