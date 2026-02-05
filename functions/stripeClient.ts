// Stripe client factory - ENV ONLY, no fallbacks
import Stripe from "npm:stripe@17.5.0";

let cachedStripe = null;
let cachedKeyFingerprint = null;

function fingerprint(key) {
  return `${key.slice(0, 7)}_${key.length}_${key.slice(-4)}`;
}

function maskKey(key) {
  if (!key || key.length < 12) return "****";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export class StripeKeyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "StripeKeyError";
    this.code = code;
  }
}

/**
 * Get Stripe client - ENV ONLY, no fallbacks
 * Throws StripeKeyError if missing or invalid
 */
export function getStripeClient(options) {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();

  // Validate key presence
  if (!key) {
    throw new StripeKeyError(
      "STRIPE_SECRET_KEY_MISSING",
      "STRIPE_SECRET_KEY environment variable is not set"
    );
  }

  // Validate key format
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    throw new StripeKeyError(
      "STRIPE_SECRET_KEY_INVALID",
      `Invalid Stripe key format. Must start with sk_live_ or sk_test_. Got: ${key.slice(0, 3)}`
    );
  }

  const environment = key.startsWith("sk_live_") ? "live" : "test";
  const fp = fingerprint(key);

  // Use cached client if key hasn't changed
  if (!options?.forceRefresh && cachedStripe && cachedKeyFingerprint === fp) {
    return {
      stripe: cachedStripe,
      meta: { masked: maskKey(key), environment },
    };
  }

  // Create new client
  cachedStripe = new Stripe(key, { apiVersion: "2024-06-20" });
  cachedKeyFingerprint = fp;

  console.log(`[StripeClient] Initialized new client: ${maskKey(key)} (${environment})`);

  return {
    stripe: cachedStripe,
    meta: { masked: maskKey(key), environment },
  };
}

export function safeStripeError(error) {
  if (typeof error === "string") return error;
  if (error?.message) return String(error.message);
  if (error?.raw?.message) return String(error.raw.message);
  return "Unknown Stripe error";
}