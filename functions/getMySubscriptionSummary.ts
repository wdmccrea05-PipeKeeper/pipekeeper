import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse } from "./_utils/stripe.ts";

const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isActive(sub) {
  if (!sub) return false;
  const status = (sub.status || "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (status === "incomplete") {
    const periodEnd = sub.current_period_end;
    return periodEnd && new Date(periodEnd) > new Date();
  }
  return false;
}

function pickPrimary(subs, preferredProvider = null) {
  if (!subs?.length) return null;
  const active = subs.filter(isActive);
  if (!active.length) return null;
  if (preferredProvider) {
    const pref = active.find((s) => s.provider === preferredProvider);
    if (pref) return pref;
  }
  active.sort((a, b) => {
    const aEnd = new Date(a.current_period_end || 0);
    const bEnd = new Date(b.current_period_end || 0);
    return bEnd - aEnd;
  });
  return active[0];
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
    const userId = me.id;

    let allSubs = [];
    if (userId) {
      const byUserId = await base44.entities.Subscription.filter({ user_id: userId });
      allSubs = byUserId || [];
    }

    if (allSubs.length === 0 && email) {
      const byEmail = await base44.entities.Subscription.filter({ 
        user_email: email,
        provider: "stripe"
      });
      allSubs = byEmail || [];
    }

    const stripeSubs = allSubs.filter((s) => s.provider === "stripe");
    const appleSubs = allSubs.filter((s) => s.provider === "apple");

    const primarySub = pickPrimary(allSubs);
    const isPaid = !!primarySub;
    const provider = primarySub?.provider || null;
    const tier = primarySub?.tier || null;
    const status = primarySub?.status || null;
    const expiresAt = primarySub?.current_period_end || null;

    let stripeCustomerPortalUrl = null;
    if (stripeSubs.length > 0) {
      const subWithCustomer = stripeSubs.find((s) => s.stripe_customer_id);
      const customerId = subWithCustomer?.stripe_customer_id;

      if (customerId) {
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: APP_URL,
          });
          stripeCustomerPortalUrl = session.url;
        } catch (e) {
          console.warn("[getMySubscriptionSummary] Failed to create portal session:", e.message);
        }
      }
    }

    return Response.json({
      ok: true,
      isPaid,
      provider,
      tier,
      status,
      expiresAt,
      stripeCustomerPortalUrl,
    });
  } catch (error) {
    console.error("[getMySubscriptionSummary] error:", error);
    const { safeStripeError } = await import("./_utils/stripe.ts");
    return Response.json({ 
      ok: false, 
      error: "SUBSCRIPTION_FETCH_FAILED",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});