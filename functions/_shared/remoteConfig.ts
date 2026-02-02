// Remote Config fallback for environment variables
// Solves Base44 production env cache issues

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

interface CacheEntry {
  value: string;
  timestamp: number;
  source: "env" | "remote";
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(entry: CacheEntry | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
}

async function getRemoteConfigValue(
  base44: any,
  key: string,
  environment: string = "live"
): Promise<string | null> {
  try {
    // Only allow STRIPE_ prefixed keys for security
    if (!key.startsWith("STRIPE_")) {
      console.warn(`[RemoteConfig] Blocked non-STRIPE key: ${key}`);
      return null;
    }

    const configs = await base44.asServiceRole.entities.RemoteConfig.filter(
      { key, environment, is_active: true },
      "-updated_date",
      1
    );

    if (configs.length === 0) {
      return null;
    }

    return configs[0].value?.trim() || null;
  } catch (error) {
    console.error(`[RemoteConfig] DB read failed for ${key}:`, error?.message || error);
    return null;
  }
}

export async function getStripeSecretKeyLive(
  req?: Request
): Promise<{ value: string | null; source: "env" | "remote" | "none"; key: string }> {
  const key = "STRIPE_SECRET_KEY";
  const cacheKey = `${key}_live`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (isCacheValid(cached)) {
    return { value: cached!.value, source: cached!.source, key };
  }

  // Try environment variable first
  const envValue = Deno.env.get(key);
  if (envValue?.trim()) {
    console.log(`[RemoteConfig] Using env var for ${key}: ${maskKey(envValue)}`);
    cache.set(cacheKey, { value: envValue.trim(), timestamp: Date.now(), source: "env" });
    return { value: envValue.trim(), source: "env", key };
  }

  // Fallback to remote config
  if (!req) {
    console.warn(`[RemoteConfig] No env var and no request context for ${key}`);
    return { value: null, source: "none", key };
  }

  try {
    const base44 = createClientFromRequest(req);
    const remoteValue = await getRemoteConfigValue(base44, key, "live");
    
    if (remoteValue) {
      console.log(`[RemoteConfig] Using remote config for ${key}: ${maskKey(remoteValue)}`);
      cache.set(cacheKey, { value: remoteValue, timestamp: Date.now(), source: "remote" });
      return { value: remoteValue, source: "remote", key };
    }
  } catch (error) {
    console.error(`[RemoteConfig] Remote lookup failed for ${key}:`, error?.message || error);
  }

  return { value: null, source: "none", key };
}

export async function getStripeWebhookSecretLive(
  req?: Request
): Promise<{ value: string | null; source: "env" | "remote" | "none"; key: string }> {
  const key = "STRIPE_WEBHOOK_SECRET";
  const cacheKey = `${key}_live`;

  const cached = cache.get(cacheKey);
  if (isCacheValid(cached)) {
    return { value: cached!.value, source: cached!.source, key };
  }

  const envValue = Deno.env.get(key);
  if (envValue?.trim()) {
    console.log(`[RemoteConfig] Using env var for ${key}: ${maskKey(envValue)}`);
    cache.set(cacheKey, { value: envValue.trim(), timestamp: Date.now(), source: "env" });
    return { value: envValue.trim(), source: "env", key };
  }

  if (!req) {
    return { value: null, source: "none", key };
  }

  try {
    const base44 = createClientFromRequest(req);
    const remoteValue = await getRemoteConfigValue(base44, key, "live");
    
    if (remoteValue) {
      console.log(`[RemoteConfig] Using remote config for ${key}: ${maskKey(remoteValue)}`);
      cache.set(cacheKey, { value: remoteValue, timestamp: Date.now(), source: "remote" });
      return { value: remoteValue, source: "remote", key };
    }
  } catch (error) {
    console.error(`[RemoteConfig] Remote lookup failed for ${key}:`, error?.message || error);
  }

  return { value: null, source: "none", key };
}

export async function getStripePriceId(
  name: string,
  req?: Request
): Promise<{ value: string | null; source: "env" | "remote" | "none"; key: string }> {
  const key = `STRIPE_PRICE_ID_${name.toUpperCase()}`;
  const cacheKey = `${key}_live`;

  const cached = cache.get(cacheKey);
  if (isCacheValid(cached)) {
    return { value: cached!.value, source: cached!.source, key };
  }

  const envValue = Deno.env.get(key);
  if (envValue?.trim()) {
    cache.set(cacheKey, { value: envValue.trim(), timestamp: Date.now(), source: "env" });
    return { value: envValue.trim(), source: "env", key };
  }

  if (!req) {
    return { value: null, source: "none", key };
  }

  try {
    const base44 = createClientFromRequest(req);
    const remoteValue = await getRemoteConfigValue(base44, key, "live");
    
    if (remoteValue) {
      cache.set(cacheKey, { value: remoteValue, timestamp: Date.now(), source: "remote" });
      return { value: remoteValue, source: "remote", key };
    }
  } catch (error) {
    console.error(`[RemoteConfig] Remote lookup failed for ${key}:`, error?.message || error);
  }

  return { value: null, source: "none", key };
}

// Clear cache (for testing or manual invalidation)
export function clearRemoteConfigCache() {
  cache.clear();
  console.log("[RemoteConfig] Cache cleared");
}