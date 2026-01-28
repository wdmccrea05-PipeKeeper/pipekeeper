import Stripe from "npm:stripe@17.5.0";

export function maskStripeKey(key: string) {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 10) return "****";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export function getStripeSecretKey() {
  // ONLY accept STRIPE_SECRET_KEY
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  return key;
}

export function validateStripeSecretKeyOrThrow() {
  const key = getStripeSecretKey();

  // Stripe server keys must be sk_ (standard) or rk_ (restricted). pk_/mk_ are invalid for server API calls.
  const ok = key.startsWith("sk_") || key.startsWith("rk_");
  if (!ok) {
    const masked = maskStripeKey(key);
    throw new Error(
      `STRIPE_SECRET_KEY_INVALID: Expected sk_... or rk_...; got ${masked || "(missing)"}`
    );
  }
  return key;
}

export function getStripeClient() {
  const key = validateStripeSecretKeyOrThrow();
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

export function stripeKeyErrorResponse(e: any) {
  const msg = String(e?.message || e || "");
  const isKey =
    msg.includes("STRIPE_SECRET_KEY_INVALID") ||
    msg.toLowerCase().includes("invalid api key") ||
    msg.toLowerCase().includes("api key provided");

  if (isKey) {
    return {
      ok: false,
      error: "STRIPE_SECRET_KEY_INVALID",
      hint: "Set STRIPE_SECRET_KEY in Base44 env to sk_live_... (live) or sk_test_... (test). Do not use pk_/mk_.",
      message: msg.replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`),
    };
  }

  return {
    ok: false,
    error: "STRIPE_ERROR",
    message: msg.replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`),
  };
}