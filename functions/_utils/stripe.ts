// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

// INTEGRATED: Remote config fallback system - 2026-02-02
// Solves production env cache issues permanently

import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

// Client cache with key tracking
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

export async function getStripeClient(req?: Request) {
  // Use remote config fallback system
  const { value: key, source } = await getStripeSecretKeyLive(req);
  
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY missing from both env vars and RemoteConfig. " +
      "Add it to RemoteConfig entity or set as environment variable."
    );
  }
  
  // Invalidate cache if key changed
  if (stripeClient && cachedKey !== key) {
    console.warn(`[Stripe] Key changed (${source}) - invalidating cache`);
    stripeClient = null;
    cachedKey = null;
  }
  
  // Return cached client if key matches
  if (stripeClient && cachedKey === key) {
    return stripeClient;
  }
  
  // Initialize fresh client
  console.log(`[Stripe] Initializing client with key from ${source}: ${maskKey(key)}`);
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