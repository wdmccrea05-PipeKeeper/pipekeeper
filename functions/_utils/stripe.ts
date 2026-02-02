import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

export async function getStripeClient(req: Request): Promise<Stripe> {
  // CRITICAL: Block ALL invalid keys before they reach Stripe
  const envDirect = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (envDirect && envDirect.startsWith("mk_")) {
    console.error(`[stripe] ❌❌❌ FATAL: mk_ key detected in env: ${envDirect.slice(0, 8)}`);
    throw new Error(`FATAL: Invalid test key (mk_) in STRIPE_SECRET_KEY environment variable. Update to sk_live_ key.`);
  }

  console.log("[stripe] Fetching Stripe key...");
  const { value: key, source } = await getStripeSecretKeyLive(req);
  console.log(`[stripe] Key source: ${source}, full: ${key ? key.slice(0, 8) : "(none)"}...${key ? key.slice(-4) : ""}`);

  if (!key) {
    throw new Error("Stripe secret key missing after env + RemoteConfig lookup");
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

  console.log(`[stripe] ✅ Creating Stripe client with ${source} key: ${key.slice(0, 8)}...${key.slice(-4)}`);

  // Create fresh Stripe client (no caching to avoid stale key issues)
  try {
    return new Stripe(key, {
      apiVersion: "2024-06-20",
    });
  } catch (e: any) {
    console.error("[stripe] Failed to create Stripe client:", e?.message || e);
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