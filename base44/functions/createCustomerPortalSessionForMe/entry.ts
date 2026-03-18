// User-facing endpoint: Create Stripe billing portal session for current user
// Does NOT require admin access - any authenticated user can manage their own subscription
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_utils/stripeClient.ts";

const normEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Find best Stripe customer for a given email
 * Prefers customer with active PipeKeeper subscription, then most recent
 */
async function findBestCustomer(stripe, email) {
  try {
    const customers = await stripe.customers.list({ email, limit: 100 });
    if (!customers?.data || customers.data.length === 0) return null;

    // Get all subscriptions for these customers
    const customerIds = customers.data.map(c => c.id);
    const allSubs = [];
    
    for (const custId of customerIds) {
      try {
        const subs = await stripe.subscriptions.list({ customer: custId, limit: 10 });
        allSubs.push(...(subs.data || []).map(s => ({ ...s, _customerId: custId })));
      } catch (e) {
        console.warn(`Could not fetch subs for ${custId}:`, e);
      }
    }

    // Find customer with active subscription
    const activeSub = allSubs.find(s => s.status === "active" || s.status === "trialing");
    if (activeSub) {
      return activeSub._customerId;
    }

    // No active sub - return most recently created customer
    const sorted = [...customers.data].sort((a, b) => b.created - a.created);
    return sorted[0].id;
  } catch (err) {
    console.error("[findBestCustomer] Error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = normEmail(user.email);
    const stripe = getStripeClient();

    // Find Stripe customer - prefer stored ID, then search
    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      customerId = await findBestCustomer(stripe, email);
    }

    if (!customerId) {
      return Response.json({
        error: "No Stripe customer found for this account",
      }, { status: 404 });
    }

    // Backfill stripe_customer_id if it was missing or different
    if (customerId !== user.stripe_customer_id) {
      try {
        await base44.auth.updateMe({ stripe_customer_id: customerId });
        console.log(`[portalSession] Backfilled stripe_customer_id for ${email}`);
      } catch (err) {
        console.warn("[portalSession] Could not backfill customer ID:", err);
      }
    }

    // Get return URL from request or default
    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || Deno.env.get("APP_URL") || "https://pipekeeper.app/Profile";

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