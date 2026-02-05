import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

/**
 * Creates Stripe client with standard process (env var first, RemoteConfig backup)
 * @param {Request} [req] - Optional request for RemoteConfig fallback
 * @returns {Promise<Stripe>} Initialized Stripe client
 */
export async function getStripeClient(req?: Request): Promise<Stripe> {
  console.log("[stripe] ========== STRIPE CLIENT INIT START ==========");
  
  let key: string;
  let source: string;

  // STANDARD PROCESS: Try env var first
  const envKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (envKey && envKey.startsWith("sk_")) {
    key = envKey;
    source = "env";
    console.log(`[stripe] ✅ Using key from ENV (standard): ${key.slice(0, 8)}...${key.slice(-4)}`);
  } else {
    // BACKUP: Fetch from RemoteConfig
    if (!req) {
      throw new Error("Request required for RemoteConfig fallback");
    }
    console.log("[stripe] ENV key not valid, fetching from RemoteConfig (backup)...");
    const result = await getStripeSecretKeyLive(req);
    key = result.value;
    source = result.source;
    console.log(`[stripe] ✅ Using key from RemoteConfig (backup): ${key ? key.slice(0, 8) : "(none)"}...${key ? key.slice(-4) : ""}`);
  }

  if (!key) {
    console.error("[stripe] ❌ No valid key found");
    throw new Error("Stripe secret key missing from env and RemoteConfig");
  }

  // Validate key format
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    console.error(`[stripe] ❌ Invalid key format: ${key.slice(0, 8)}`);
    throw new Error(`Invalid Stripe key format from ${source}: ${key.slice(0, 8)}...`);
  }

  // Create Stripe client
  try {
    const stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
    });
    console.log(`[stripe] ✅ Stripe client created (source: ${source})`);
    console.log("[stripe] ========== STRIPE CLIENT INIT END ==========");
    return stripe;
  } catch (e: any) {
    console.error("[stripe] ❌ Failed to create Stripe client:", e?.message);
    throw new Error(`Failed to initialize Stripe: ${e?.message || e}`);
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