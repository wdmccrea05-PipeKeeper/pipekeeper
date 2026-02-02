// WORKAROUND: Fresh function with no cached dependencies
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read key fresh every time
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      return Response.json({ 
        error: "STRIPE_KEY_MISSING",
        message: "Stripe key not configured" 
      }, { status: 500 });
    }

    // Create fresh Stripe client with no caching
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2024-06-20" 
    });

    // Test the key works
    try {
      await stripe.customers.list({ limit: 1 });
    } catch (keyError) {
      return Response.json({
        error: "STRIPE_KEY_INVALID",
        message: `Key test failed: ${keyError.message}`,
        keyMasked: `${stripeKey.substring(0, 7)}...${stripeKey.substring(stripeKey.length - 4)}`
      }, { status: 500 });
    }

    // Find or create customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const existing = await stripe.customers.list({ 
        email: user.email, 
        limit: 1 
      });
      
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        return Response.json({
          error: "NO_CUSTOMER",
          message: "No Stripe customer exists. Subscribe first."
        }, { status: 400 });
      }
    }

    // Create portal session
    const origin = req.headers.get("origin") || APP_URL;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/Profile`,
    });

    return Response.json({ 
      url: portalSession.url,
      success: true 
    });
  } catch (error) {
    return Response.json({
      error: "FUNCTION_ERROR",
      message: error.message
    }, { status: 500 });
  }
});