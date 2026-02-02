// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

// Force fresh deployment: 2026-02-02 v2

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, safeStripeError } from "./_utils/stripe.ts";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Reads auth + ensures we can read necessary entities even if RLS blocks user-level reads.
// IMPORTANT: use asServiceRole for User/Subscription reads (server-side trusted).
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const base44 = createClientFromRequest(req);

    // Must be signed in
    const authUser = await base44.auth.me();
    if (!authUser?.id) {
      return json(401, { ok: false, error: "Not authenticated" });
    }

    // Parse body (optional)
    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const returnUrl =
      (body?.returnUrl && String(body.returnUrl)) ||
      (req.headers.get("origin") || "https://pipekeeper.app");

    // ---- Service-role reads (avoid "Authentication required to view users") ----
    const srv = base44.asServiceRole;

    // 1) Get the user record
    const userRecord = await srv.entities.User.get(authUser.id).catch(() => null);
    if (!userRecord) {
      return json(404, { ok: false, error: "User record not found" });
    }

    // 2) Ensure we have a Stripe customer id; if missing, attempt to find/create.
    let stripeCustomerId = userRecord?.stripe_customer_id || "";

    if (!stripeCustomerId) {
      // Attempt to find an existing subscription for this user (if your schema stores it)
      const subs = await srv.entities.Subscription.filter({
        user_id: authUser.id,
      }).catch(() => []);

      const sub0 = Array.isArray(subs) ? subs[0] : null;
      stripeCustomerId = sub0?.stripe_customer_id || "";

      // If still missing, we cannot open portal
      if (!stripeCustomerId) {
        return json(400, {
          ok: false,
          error: "Missing stripeCustomerId",
          hint:
            "No Stripe customer id found for this user. Ensure checkout creates/records stripeCustomerId on User or Subscription.",
        });
      }

      // backfill on User for next time (best effort)
      await srv.entities.User.update(authUser.id, { stripe_customer_id: stripeCustomerId }).catch(() => null);
    }

    // ---- Stripe client with RemoteConfig fallback + cache bust options ----
    console.log("[createCustomerPortalSession] Getting Stripe client...");
    const stripe = await getStripeClient(req);
    console.log("[createCustomerPortalSession] Stripe client obtained successfully");

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return json(200, { ok: true, url: session.url });
  } catch (e) {
    const msg = safeStripeError(e);
    console.error("[createCustomerPortalSession] Error:", msg);

    // Keep response stable for UI
    return json(500, {
      ok: false,
      error: "Failed to create customer portal session",
      message: msg,
    });
  }
});