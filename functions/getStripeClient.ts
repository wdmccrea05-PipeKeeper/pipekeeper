// Resilient Stripe client loader: ENV -> RemoteConfig fallback
// Hard-blocks mk_ keys. Supports preview/live separation.

import Stripe from "npm:stripe@17.5.0";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

let cachedStripe = null;
let cachedKeyFingerprint = null;

function maskKey(key) {
  if (!key) return "(missing)";
  if (key.length < 10) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function fingerprint(key) {
  return `${key.slice(0, 7)}_${key.length}_${key.slice(-4)}`;
}

function isInvalidKey(key) {
  const k = (key || "").trim();
  if (!k) return true;
  if (k.startsWith("mk_")) return true; // Hard-block Base44 keys
  if (!k.startsWith("sk_")) return true;
  return false;
}

async function readRemoteConfigKey(req, environment) {
  try {
    const base44 = createClientFromRequest(req);
    const recs = await base44.asServiceRole.entities.RemoteConfig.filter({
      key: "STRIPE_SECRET_KEY",
      environment,
    });
    const val = recs?.[0]?.value ? String(recs[0].value).trim() : "";
    return val;
  } catch (e) {
    console.log(`[getStripeClient] RemoteConfig read failed for ${environment}:`, e?.message);
    return "";
  }
}

export async function getRuntimeEnv(req) {
  const hinted = (Deno.env.get("BASE44_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "").toLowerCase();
  if (hinted.includes("live")) return "live";
  if (hinted.includes("preview") || hinted.includes("dev")) return "preview";
  
  const host = new URL(req.url).host.toLowerCase();
  if (host.includes("app.base44.com")) return "preview";
  return "live";
}

export async function getStripeSecretKey(req) {
  const environment = await getRuntimeEnv(req);

  const envKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!isInvalidKey(envKey)) {
    console.log(`[getStripeClient] Using ENV key: ${maskKey(envKey)}`);
    return { key: envKey, source: "env", masked: maskKey(envKey), environment };
  }

  const rcKey = (await readRemoteConfigKey(req, environment)).trim();
  if (!isInvalidKey(rcKey)) {
    console.log(`[getStripeClient] Using RemoteConfig key: ${maskKey(rcKey)}`);
    return { key: rcKey, source: "remoteConfig", masked: maskKey(rcKey), environment };
  }

  const envPrefix = envKey ? envKey.slice(0, 3) : "(missing)";
  const rcPrefix = rcKey ? rcKey.slice(0, 3) : "(missing)";

  throw new Error(
    `Stripe key missing/invalid. envPrefix=${envPrefix}, remoteConfigPrefix=${rcPrefix}, environment=${environment}`
  );
}

export async function getStripeClient(req, options) {
  const { key, source, masked, environment } = await getStripeSecretKey(req);
  const fp = fingerprint(key);

  if (!cachedStripe || cachedKeyFingerprint !== fp) {
    cachedStripe = new Stripe(key, { apiVersion: "2024-06-20" });
    cachedKeyFingerprint = fp;
    console.log(`[getStripeClient] Created new Stripe client: ${masked}`);
  }

  return { stripe: cachedStripe, meta: { source, masked, environment } };
}