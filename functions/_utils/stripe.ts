import Stripe from "npm:stripe@17.5.0";

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
  
  // Explicitly reject invalid key types
  const forbidden = ["mk_", "pk_", "whsec_", "price_", "cus_", "sub_", "prod_", "plan_"];
  for (const f of forbidden) {
    if (key.startsWith(f)) {
      throw new Error(
        `STRIPE_SECRET_KEY_INVALID: Cannot use ${f} keys. Must be sk_ or rk_. Got: ${maskKey(key)}`
      );
    }
  }
  
  if (prefix !== "sk" && prefix !== "rk") {
    throw new Error(
      `STRIPE_SECRET_KEY_INVALID: Must start with sk_ or rk_. Got prefix: ${prefix}, masked: ${maskKey(key)}`
    );
  }
  return key;
}

export function getStripeClient() {
  const key = assertStripeKeyOrThrow();
  return new Stripe(key, { apiVersion: "2024-06-20" });
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