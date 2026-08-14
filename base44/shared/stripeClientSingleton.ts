// Centralized Stripe client singleton - prevents stale/expired key issues
import Stripe from "npm:stripe@17.5.0";

interface StripeClientCache {
  client: Stripe | null;
  keyFingerprint: string | null;
  createdAt: number;
}

const cache: StripeClientCache = {
  client: null,
  keyFingerprint: null,
  createdAt: 0,
};

const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes - prevent stale clients

function maskKey(key: string): string {
  if (!key || key.length < 12) return "***";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

function getKeyFingerprint(key: string): string {
  // Simple hash to detect key changes without storing full key
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function getStripeSecretKey(): string {
  const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
  
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set in environment");
  }
  
  if (!key.startsWith("sk_")) {
    throw new Error(`Invalid STRIPE_SECRET_KEY: must start with sk_ (got: ${key.slice(0, 3)}...)`);
  }
  
  // Reject other Stripe key types that might be confused
  if (key.startsWith("pk_") || key.startsWith("rk_") || key.startsWith("whsec_")) {
    throw new Error("STRIPE_SECRET_KEY must be a secret key (sk_), not a publishable/restricted/webhook key");
  }
  
  return key;
}

export function getStripeClient(options?: { forceRefresh?: boolean }): Stripe {
  const key = getStripeSecretKey();
  const keyHash = getKeyFingerprint(key);
  const now = Date.now();
  const age = now - cache.createdAt;
  
  const needsRefresh = 
    options?.forceRefresh ||
    !cache.client || 
    cache.keyFingerprint !== keyHash ||
    age > MAX_AGE_MS;
  
  if (needsRefresh) {
    console.log(`[StripeClient] Creating new client: key=${maskKey(key)} age=${age}ms refresh=${!!options?.forceRefresh}`);
    cache.client = new Stripe(key, { apiVersion: "2024-06-20" });
    cache.keyFingerprint = keyHash;
    cache.createdAt = now;
  }
  
  return cache.client!;
}

export function clearStripeClientCache(): void {
  console.log("[StripeClient] Cache cleared");
  cache.client = null;
  cache.keyFingerprint = null;
  cache.createdAt = 0;
}

export async function verifyStripeConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const stripe = getStripeClient();
    await stripe.balance.retrieve();
    return { ok: true };
  } catch (err) {
    return { 
      ok: false, 
      error: err instanceof Error ? err.message : String(err) 
    };
  }
}