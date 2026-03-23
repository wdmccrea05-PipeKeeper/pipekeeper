import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";
import Stripe from "npm:stripe@17.5.0";

const APP_URL = (Deno.env.get("APP_URL") || "https://pipekeeper.app").trim();

function normEmail(email: unknown) {
  return String(email || "").trim().toLowerCase();
}

function grantsAccess(sub: any) {
  if (!sub) return false;
  const status = String(sub.status || "").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  if (status === "past_due" || status === "incomplete") {
    const periodEnd = sub.current_period_end;
    return !!periodEnd && new Date(periodEnd) > new Date();
  }
  return false;
}

function statusRank(status: string) {
  const key = String(status || "").toLowerCase();
  if (key === "active") return 4;
  if (key === "trialing") return 3;
  if (key === "past_due") return 2;
  if (key === "incomplete") return 1;
  return 0;
}

function splitModulesCsv(csv: unknown) {
  return String(csv || "")
    .split(",")
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean);
}

function pickPrimary(subs: any[]) {
  const active = (subs || []).filter(grantsAccess);
  if (!active.length) return null;
  return [...active].sort((a, b) => {
    const ar = statusRank(a.status);
    const br = statusRank(b.status);
    if (br !== ar) return br - ar;

    const aEnd = Date.parse(a.current_period_end || "") || 0;
    const bEnd = Date.parse(b.current_period_end || "") || 0;
    if (bEnd !== aEnd) return bEnd - aEnd;

    return (Date.parse(b.updated_date || b.created_date || "") || 0) - (Date.parse(a.updated_date || a.created_date || "") || 0);
  })[0];
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
    const userId = me.id || me.auth_user_id;

    let allSubs: any[] = [];
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

    // Prefer real Stripe subscription rows over fake/test rows.
    const stripeSubs = (allSubs || []).filter((s) => s.provider === "stripe");
    const realStripeSubs = stripeSubs.filter((s) =>
      String(s.stripe_customer_id || "").startsWith("cus_") &&
      String(s.provider_subscription_id || s.stripe_subscription_id || "").startsWith("sub_")
    );
    const primarySub = pickPrimary(realStripeSubs.length ? realStripeSubs : stripeSubs);

    const isPaid = !!primarySub;
    const provider = primarySub?.provider || null;
    const tier = primarySub?.tier || null;
    const status = primarySub?.status || null;
    const expiresAt = primarySub?.current_period_end || null;
    const activeModules = splitModulesCsv(primarySub?.modules_csv);

    let manageUrl = null;
    let warning = null;

    if (provider === "stripe") {
      const customerId =
        (String(primarySub?.stripe_customer_id || "").startsWith("cus_") ? primarySub.stripe_customer_id : null) ||
        (String(me.stripe_customer_id || "").startsWith("cus_") ? me.stripe_customer_id : null) ||
        null;

      if (customerId) {
        try {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
          if (!stripeKey || !stripeKey.startsWith("sk_")) {
            throw new Error("STRIPE_SECRET_KEY not configured");
          }
          const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: APP_URL,
          });
          manageUrl = session.url;
        } catch (e) {
          console.warn("[getMySubscriptionSummary] Failed to create portal session:", e.message);
          warning = "Unable to generate management URL. Please contact support.";
        }
      } else {
        warning = "No Stripe customer ID found. Please contact support.";
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      isPaid,
      provider,
      tier,
      status,
      expiresAt,
      activeModules,
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
