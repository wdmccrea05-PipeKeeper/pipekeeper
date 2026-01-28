import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const STRIPE_SECRET_KEY = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isActive(sub) {
  const status = String(sub?.status || "").toLowerCase();
  return status === "active" || status === "trialing" || status === "incomplete";
}

function pickPrimary(subs, preferProvider) {
  const activeSubs = subs.filter(isActive);
  if (!activeSubs.length) return null;

  if (preferProvider) {
    const preferred = activeSubs.find(s => s.provider === preferProvider);
    if (preferred) return preferred;
  }

  const sorted = [...activeSubs].sort((a, b) => {
    const timeA = a?.current_period_end ? Date.parse(a.current_period_end) : 0;
    const timeB = b?.current_period_end ? Date.parse(b.current_period_end) : 0;
    return timeB - timeA;
  });

  return sorted[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.id) {
      return Response.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const email = normEmail(me.email);
    const userAgent = req.headers.get("user-agent") || "";
    const isIOS = userAgent.toLowerCase().includes("ios") || userAgent.toLowerCase().includes("iphone");
    const preferProvider = isIOS ? "apple" : "stripe";

    let subs = [];

    // 1) Fetch by user_id (all providers)
    try {
      const byUserId = await base44.entities.Subscription.filter({ user_id: me.id });
      if (byUserId?.length) subs = byUserId;
    } catch (e) {
      console.warn("[getMySubscriptionSummary] user_id lookup failed:", e);
    }

    // 2) Legacy fallback: Stripe by email
    if (!subs.length && email) {
      try {
        const byEmail = await base44.entities.Subscription.filter({ 
          provider: "stripe", 
          user_email: email 
        });
        if (byEmail?.length) subs = byEmail;
      } catch (e) {
        console.warn("[getMySubscriptionSummary] email lookup failed:", e);
      }
    }

    const primary = pickPrimary(subs, preferProvider);
    const paid = !!primary || me.subscription_level === "paid";

    const provider = primary?.provider || (paid ? "unknown" : "none");
    const tier = primary?.tier || "premium";
    const status = primary?.status || me.subscription_status || "none";
    const current_period_end = primary?.current_period_end || null;

    let manage_url = null;
    const can_switch_to_apple = provider === "stripe" && paid && isIOS;

    // Generate Stripe portal URL if provider is stripe
    if (provider === "stripe") {
      try {
        let stripeCustomerId = primary?.stripe_customer_id;

        if (!stripeCustomerId && email) {
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data?.length) {
            stripeCustomerId = customers.data[0].id;
          }
        }

        if (stripeCustomerId) {
          const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: APP_URL,
          });
          manage_url = session.url;
        }
      } catch (e) {
        console.warn("[getMySubscriptionSummary] Failed to generate portal URL:", e);
      }
    }

    return Response.json({
      ok: true,
      paid,
      provider,
      tier,
      status,
      current_period_end,
      manage_url,
      can_switch_to_apple,
    });
  } catch (error) {
    console.error("[getMySubscriptionSummary] error:", error);
    return Response.json({ 
      ok: false, 
      error: error?.message || "Failed to fetch subscription summary" 
    }, { status: 500 });
  }
});