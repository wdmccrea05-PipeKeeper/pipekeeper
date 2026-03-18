import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

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

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.email) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: "UNAUTHENTICATED" 
      }), { 
        status: 401,
        headers: { "content-type": "application/json" }
      });
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

    let manageUrl = null;
    let warning = null;
    
    // Only initialize Stripe if there are Stripe subscriptions AND a customer ID
    if (provider === "stripe" && stripeSubs.length > 0) {
      const subWithCustomer = stripeSubs.find((s) => s.stripe_customer_id);
      const customerId = subWithCustomer?.stripe_customer_id;

      if (customerId) {
        try {
          const { getStripeClient } = await import("./_utils/stripe.ts");
          const stripe = getStripeClient();
          
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: APP_URL,
          });
          manageUrl = session.url;
        } catch (e) {
          console.warn("[getMySubscriptionSummary] Failed to create portal session:", e.message);
          warning = "Unable to generate management URL. Please contact support.";
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      isPaid,
      provider,
      tier,
      status,
      expiresAt,
      manageUrl,
      warning
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.error("[getMySubscriptionSummary] error:", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: "SUBSCRIPTION_FETCH_FAILED",
      message: String(error?.message || error)
    }), { 
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
});