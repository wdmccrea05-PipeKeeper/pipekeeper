// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import Stripe from "npm:stripe@17.5.0";

// Singleton Stripe client with cache busting
let stripeClient = null;
let cachedKey = null;

function maskKey(key) {
  if (!key) return "(missing)";
  const k = String(key).trim();
  if (k.length < 10) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function getStripeSecretKey() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  
  // HARD FAIL: Key must be present in runtime
  if (!key) {
    throw new Error(
      "FATAL: STRIPE_SECRET_KEY missing in runtime environment. " +
      "Check that the secret is set in the correct environment (Preview vs Live) and functions are redeployed."
    );
  }
  
  return key;
}

export function getStripeKeyPrefix() {
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

export function getStripeClient() {
  const key = assertStripeKeyOrThrow();
  
  // CRITICAL: Always check if key changed to prevent expired key caching
  if (stripeClient && cachedKey !== key) {
    console.warn(`[Stripe] Key mismatch detected - invalidating cache`);
    console.log(`[Stripe] Old: ${maskKey(cachedKey || "")}`);
    console.log(`[Stripe] New: ${maskKey(key)}`);
    stripeClient = null;
    cachedKey = null;
  }
  
  // Return singleton only if key matches
  if (stripeClient && cachedKey === key) {
    return stripeClient;
  }
  
  // Initialize fresh client
  console.log(`[Stripe] Initializing new client with key: ${maskKey(key)}`);
  stripeClient = new Stripe(key, { apiVersion: "2024-06-20" });
  cachedKey = key;
  
  return stripeClient;
}

export async function stripeSanityCheck(stripe) {
  await stripe.balance.retrieve();
  return true;
}

export function safeStripeError(e) {
  const msg = String(e?.message || e || "");
  return msg.replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
}

export function stripeKeyErrorResponse(e) {
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