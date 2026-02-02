// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

// DEPLOYMENT TIMESTAMP: 2026-02-02T03:50:00Z - v12 NO IMPORTS

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    console.log("[createCustomerPortalSession] ===== START =====");
    console.log("[createCustomerPortalSession] Timestamp:", new Date().toISOString());
    
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const base44 = createClientFromRequest(req);

    const authUser = await base44.auth.me();
    if (!authUser?.id) {
      return json(401, { ok: false, error: "Not authenticated" });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const returnUrl =
      (body?.returnUrl && String(body.returnUrl)) ||
      (req.headers.get("origin") || "https://pipekeeper.app");

    console.log("[createCustomerPortalSession] Getting Stripe key via invoke...");
    const keyResponse = await base44.functions.invoke('getStripeSecretKey', {});
    console.log("[createCustomerPortalSession] Key response:", keyResponse.data);
    
    if (!keyResponse.data?.ok || !keyResponse.data?.key) {
      console.error("[createCustomerPortalSession] Failed to get Stripe key");
      return json(500, {
        ok: false,
        error: "Failed to retrieve Stripe configuration"
      });
    }

    const stripeKey = keyResponse.data.key;
    console.log("[createCustomerPortalSession] Got key:", stripeKey.slice(0, 8), "...");

    if (!stripeKey.startsWith("sk_live_")) {
      console.error("[createCustomerPortalSession] Invalid key prefix:", stripeKey.slice(0, 8));
      return json(500, {
        ok: false,
        error: "Invalid Stripe key configuration"
      });
    }

    const srv = base44.asServiceRole;

    const userRecord = await srv.entities.User.get(authUser.id).catch(() => null);
    if (!userRecord) {
      return json(404, { ok: false, error: "User record not found" });
    }

    let stripeCustomerId = userRecord?.stripe_customer_id || "";

    if (!stripeCustomerId) {
      const subs = await srv.entities.Subscription.filter({
        user_id: authUser.id,
      }).catch(() => []);

      const sub0 = Array.isArray(subs) ? subs[0] : null;
      stripeCustomerId = sub0?.stripe_customer_id || "";

      if (!stripeCustomerId) {
        return json(400, {
          ok: false,
          error: "Missing stripeCustomerId"
        });
      }

      await srv.entities.User.update(authUser.id, { stripe_customer_id: stripeCustomerId }).catch(() => null);
    }

    console.log("[createCustomerPortalSession] Creating Stripe client...");
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
    });
    console.log("[createCustomerPortalSession] Stripe client created");

    console.log("[createCustomerPortalSession] Creating portal session...");
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    console.log("[createCustomerPortalSession] ✅ Success");
    return json(200, { ok: true, url: session.url });
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[createCustomerPortalSession] Error:", msg);
    return json(500, {
      ok: false,
      error: "Failed to create customer portal session",
      message: msg,
    });
  }
});