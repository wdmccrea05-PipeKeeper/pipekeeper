// User-facing endpoint: Create Stripe billing portal session for current user
// Does NOT require admin access - any authenticated user can manage their own subscription
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

// Inlined Stripe client utilities
let cachedStripe: Stripe | null = null;
let cachedKeyFingerprint: string | null = null;

function fingerprint(key: string): string {
  return `${key.slice(0, 7)}_${key.length}_${key.slice(-4)}`;
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return "****";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function getStripeClient(options?: { forceRefresh?: boolean }): Stripe {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }

  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    throw new Error(`Invalid Stripe key format. Must start with sk_live_ or sk_test_. Got: ${key.slice(0, 3)}`);
  }

  const fp = fingerprint(key);

  if (!options?.forceRefresh && cachedStripe && cachedKeyFingerprint === fp) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(key, { apiVersion: "2024-06-20" });
  cachedKeyFingerprint = fp;

  console.log(`[StripeClient] Initialized new client: ${maskKey(key)}`);

  return cachedStripe;
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