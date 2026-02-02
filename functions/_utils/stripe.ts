import Stripe from "npm:stripe@17.5.0";
import { getStripeSecretKeyLive } from "../_shared/remoteConfig.ts";

let cachedStripe: Stripe | null = null;
let cachedKeySource: string | null = null;

export async function getStripeClient(req: Request): Promise<Stripe> {
  // Always resolve key dynamically (do NOT trust cached Stripe instance)
  const { value: key, source } = await getStripeSecretKeyLive(req);

  if (!key) {
    throw new Error("Stripe secret key missing after env + RemoteConfig lookup");
  }

  // If cached client exists but key source changed, discard it
  if (cachedStripe && cachedKeySource === source) {
    return cachedStripe;
  }

  // Create fresh Stripe client
  try {
    cachedStripe = new Stripe(key, {
      apiVersion: "2024-06-20",
    });
    cachedKeySource = source;
    return cachedStripe;
  } catch (e: any) {
    cachedStripe = null;
    cachedKeySource = null;
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