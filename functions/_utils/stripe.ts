import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

export async function getStripeClient(req: Request): Promise<Stripe> {
  console.log("[stripe] ========== STRIPE CLIENT INIT START ==========");
  console.log("[stripe] Timestamp:", new Date().toISOString());
  console.log("[stripe] Deno.env ALL KEYS:", Object.keys(Deno.env.toObject()));
  
  // CRITICAL: Block ALL invalid keys before they reach Stripe
  const envDirect = Deno.env.get("STRIPE_SECRET_KEY") || "";
  console.log("[stripe] STRIPE_SECRET_KEY from env:", envDirect ? `${envDirect.slice(0, 8)}...${envDirect.slice(-4)}` : "(not set)");
  
  // FORCE: Clear any env var to ensure RemoteConfig is used
  if (envDirect) {
    console.warn("[stripe] ⚠️ STRIPE_SECRET_KEY env var exists, but we will IGNORE it and use RemoteConfig");
  }

  console.log("[stripe] Fetching Stripe key from RemoteConfig...");
  const { value: key, source } = await getStripeSecretKeyLive(req);
  console.log(`[stripe] ✅ Received key from ${source}: ${key ? key.slice(0, 8) : "(none)"}...${key ? key.slice(-4) : ""}`);

  if (!key) {
    console.error("[stripe] ❌ No key returned from RemoteConfig");
    throw new Error("Stripe secret key missing after RemoteConfig lookup");
  }

  // CRITICAL: Reject ANY invalid key
  if (key.startsWith("mk_")) {
    console.error(`[stripe] ❌❌❌ FATAL: mk_ key returned from ${source}`);
    throw new Error(`FATAL: Invalid test key (mk_) returned from ${source}. This must be a sk_live_ key.`);
  }

  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    console.error(`[stripe] ❌ INVALID KEY PREFIX: ${key.slice(0, 8)}`);
    throw new Error(`Invalid Stripe key format: ${key.slice(0, 8)}... (expected sk_live_ or sk_test_)`);
  }

  console.log(`[stripe] ✅ Will create Stripe client with key: ${key.slice(0, 8)}...${key.slice(-4)}`);

  // Create fresh Stripe client (no caching to avoid stale key issues)
  try {
    const stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
    });
    console.log("[stripe] ✅ Stripe client created successfully");
    console.log("[stripe] ========== STRIPE CLIENT INIT END ==========");
    return stripe;
  } catch (e: any) {
    console.error("[stripe] ❌ Failed to create Stripe client:", e?.message || e);
    console.error("[stripe] Error details:", JSON.stringify(e, null, 2));
    throw new Error(`Failed to initialize Stripe client: ${e?.message || e}`);
  }
}

export function safeStripeError(e: any): string {
  if (!e) return "Unknown Stripe error";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function stripeSanityCheck(stripe: Stripe) {
  // Optional: verify client works
}