import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse, safeStripeError, getStripeKeyPrefix } from "./_utils/stripe.ts";

const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();

function normEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  const where = { stage: "init" };
  
  try {
    // Authenticate user
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();
    
    if (!authUser?.id || !authUser?.email) {
      return Response.json({ 
        ok: false, 
        error: "UNAUTHENTICATED",
        where: "auth" 
      }, { status: 401 });
    }

    where.stage = "stripe_init";
    
    // Initialize Stripe with validation
    let stripe;
    try {
      stripe = getStripeClient();
      await stripe.balance.retrieve(); // Sanity check
    } catch (e) {
      return Response.json({
        ...stripeKeyErrorResponse(e),
        where: "stripe_init"
      }, { status: 500 });
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
        return Response.json({
          ok: false,
          error: "STRIPE_LOOKUP_FAILED",
          where: "recover_customer",
          message: safeStripeError(e),
          keyPrefix: getStripeKeyPrefix(),
        }, { status: 500 });
      }
    }

    if (!stripeCustomerId) {
      return Response.json({ 
        ok: false, 
        error: "NO_STRIPE_CUSTOMER",
        where: "recover_customer",
        message: "No Stripe customer found. Please subscribe first.",
        keyPrefix: getStripeKeyPrefix(),
      }, { status: 404 });
    }

    where.stage = "create_portal";

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: APP_URL,
    });

    return Response.json({ 
      ok: true, 
      url: session.url 
    });
    
  } catch (error) {
    console.error("[createCustomerPortalSession] error:", error);
    return Response.json({ 
      ok: false, 
      error: "PORTAL_FAILED",
      where: where.stage,
      message: safeStripeError(error),
      keyPrefix: getStripeKeyPrefix(),
    }, { status: 500 });
  }
});