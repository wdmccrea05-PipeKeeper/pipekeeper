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

export function assertStripeKeyOrThrow() {
  const key = getStripeSecretKey();
  const ok = key.startsWith("sk_") || key.startsWith("rk_");
  if (!ok) {
    throw new Error(`STRIPE_SECRET_KEY_INVALID (expected sk_/rk_). Got ${maskKey(key)}`);
  }
  return key;
}

export function getStripeClient() {
  const key = assertStripeKeyOrThrow();
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export function safeStripeError(e: any) {
  const msg = String(e?.message || e || "");
  return msg.replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
}

export function stripeKeyErrorResponse(e: any) {
  const msg = safeStripeError(e);
  const isKeyError =
    msg.includes("STRIPE_SECRET_KEY_INVALID") ||
    msg.toLowerCase().includes("invalid api key") ||
    msg.toLowerCase().includes("api key provided");

  if (isKeyError) {
    return {
      ok: false,
      error: "STRIPE_SECRET_KEY_INVALID",
      hint: "Set STRIPE_SECRET_KEY to sk_live_... (live) or sk_test_... (test). Do not use pk_/mk_.",
      message: msg,
    };
  }

  return { ok: false, error: "STRIPE_INIT_FAILED", message: msg };
}