// User-facing endpoint: Create Stripe billing portal session for current user
import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function getStripe() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function findBestCustomer(stripe, email) {
  try {
    const customers = await stripe.customers.list({ email, limit: 100 });
    if (!customers?.data || customers.data.length === 0) return null;

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

    const activeSub = allSubs.find(s => s.status === "active" || s.status === "trialing");
    if (activeSub) return activeSub._customerId;

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
    const stripe = getStripe();

    let customerId = user.stripe_customer_id || null;

    if (!customerId) {
      customerId = await findBestCustomer(stripe, email);
    }

    if (!customerId) {
      return Response.json({
        error: "No Stripe customer found for this account",
      }, { status: 404 });
    }

    if (customerId !== user.stripe_customer_id) {
      try {
        await base44.auth.updateMe({ stripe_customer_id: customerId });
        console.log(`[portalSession] Backfilled stripe_customer_id for ${email}`);
      } catch (err) {
        console.warn("[portalSession] Could not backfill customer ID:", err);
      }
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = body.returnUrl || Deno.env.get("APP_URL") || "https://pipekeeper.app/Profile";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[portalSession] Created for ${email}: ${session.url}`);

    return Response.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("[createCustomerPortalSessionForMe] Error:", error);
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});