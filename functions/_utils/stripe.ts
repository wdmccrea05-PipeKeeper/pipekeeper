import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

export async function getStripeClient(req: Request): Promise<Stripe> {
  // Always resolve key dynamically (do NOT trust cached Stripe instance)
  const { value: key, source } = await getStripeSecretKeyLive(req);

  if (!key) {
    throw new Error("Stripe secret key missing after env + RemoteConfig lookup");
  }

  // Validate key format before using it
  if (!key.startsWith("sk_live_") && !key.startsWith("sk_test_")) {
    throw new Error(`Invalid Stripe key format: ${key.slice(0, 8)}... (expected sk_live_ or sk_test_)`);
  }

  console.log(`[stripe] Creating Stripe client with ${source} key: ${key.slice(0, 8)}...`);

  // Create fresh Stripe client (no caching to avoid stale key issues)
  try {
    return new Stripe(key, {
      apiVersion: "2024-06-20",
    });
  } catch (e: any) {
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