// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import Stripe from "npm:stripe@17.5.0";

// Singleton Stripe client with cache busting
let stripeClient: Stripe | null = null;
let cachedKey: string | null = null;

function maskKey(key: string) {
  if (!key) return "(missing)";
  const k = String(key).trim();
  if (k.length < 10) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function getStripeSecretKey() {
  return (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
}

export function getStripeKeyPrefix(): "sk" | "rk" | "mk" | "pk" | "missing" | "other" {
  const key = getStripeSecretKey();
  if (!key) return "missing";
  if (key.startsWith("sk_")) return "sk";
  if (key.startsWith("rk_")) return "rk";
  if (key.startsWith("mk_")) return "mk";
  if (key.startsWith("pk_")) return "pk";
  return "other";
}

export function assertStripeKeyOrThrow() {
  const key = getStripeSecretKey();
  const prefix = getStripeKeyPrefix();
  
  // STRICT: Only sk_ allowed (reject ALL other types)
  const forbidden = ["mk_", "pk_", "rk_", "whsec_", "price_", "cus_", "sub_", "prod_", "plan_"];
  for (const f of forbidden) {
    if (key.startsWith(f)) {
      throw new Error(
        `STRIPE_SECRET_KEY_INVALID: Cannot use ${f} keys. Only sk_ (secret key) is allowed. Got: ${maskKey(key)}`
      );
    }
  }
  
  if (prefix !== "sk") {
    throw new Error(
      `STRIPE_SECRET_KEY_INVALID: Must start with sk_ (secret key). Got prefix: ${prefix}, masked: ${maskKey(key)}`
    );
  }
  return key;
}

export function getStripeClient(): Stripe {
  const key = assertStripeKeyOrThrow();
  
  // Invalidate cache if key has changed (fixes expired key caching)
  if (stripeClient && cachedKey !== key) {
    console.log(`[Stripe] Key changed, invalidating cached client (old: ${maskKey(cachedKey || "")}, new: ${maskKey(key)})`);
    stripeClient = null;
    cachedKey = null;
  }
  
  // Return singleton if already initialized with current key
  if (stripeClient) return stripeClient;
  
  // Initialize and validate
  console.log(`[Stripe] Initializing new client with key: ${maskKey(key)}`);
  stripeClient = new Stripe(key, { apiVersion: "2024-06-20" });
  cachedKey = key;
  
  return stripeClient;
}

export async function stripeSanityCheck(stripe: Stripe) {
  await stripe.balance.retrieve();
  return true;
}

export function safeStripeError(e: any) {
  const msg = String(e?.message || e || "");
  return msg.replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
}

export function stripeKeyErrorResponse(e: any) {
  const msg = safeStripeError(e);
  const prefix = getStripeKeyPrefix();
  const isKeyError =
    msg.includes("STRIPE_SECRET_KEY_INVALID") ||
    msg.toLowerCase().includes("invalid api key") ||
    msg.toLowerCase().includes("api key provided");

  if (isKeyError) {
    return {
      ok: false,
      error: "STRIPE_SECRET_KEY_INVALID",
      keyPrefix: prefix,
      hint: "Set STRIPE_SECRET_KEY to sk_live_... (live) or sk_test_... (test). Do not use pk_/mk_.",
      message: msg,
    };
  }

  return { ok: false, error: "STRIPE_INIT_FAILED", keyPrefix: prefix, message: msg };
}