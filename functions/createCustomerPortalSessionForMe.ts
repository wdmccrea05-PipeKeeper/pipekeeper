// User-facing endpoint: Create Stripe billing portal session for current user
// Does NOT require admin access - any authenticated user can manage their own subscription
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_shared/stripeClientSingleton.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = normEmail(user.email);
    const stripe = getStripeClient();

    // Find Stripe customer
    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        customerId = customers.data?.[0]?.id || null;
      } catch (err) {
        console.error(`[portalSession] Customer lookup failed:`, err);
        return Response.json({
          error: "Failed to find Stripe customer",
        }, { status: 404 });
      }
    }

    if (!customerId) {
      return Response.json({
        error: "No Stripe customer found for this account",
      }, { status: 404 });
    }

    // Get return URL
    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || Deno.env.get("APP_URL") || "https://pipekeeper.app";

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[portalSession] Created for ${email}: ${session.url}`);

    return Response.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    console.error("[createCustomerPortalSessionForMe] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});