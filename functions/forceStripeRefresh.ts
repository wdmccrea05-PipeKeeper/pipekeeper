import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return "****";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function isInvalidKey(key: string): boolean {
  const k = (key || "").trim();
  if (!k) return true;
  if (k.startsWith("mk_")) return true;
  if (!k.startsWith("sk_")) return true;
  return false;
}

async function readRemoteConfigKey(base44: any, environment: "live" | "preview"): Promise<string> {
  try {
    const recs = await base44.asServiceRole.entities.RemoteConfig.filter({
      key: "STRIPE_SECRET_KEY",
      environment,
    });
    return recs?.[0]?.value ? String(recs[0].value).trim() : "";
  } catch (e: any) {
    console.log(`[getStripeSecretKey] RemoteConfig read failed for ${environment}:`, e?.message);
    return "";
  }
}

async function getRuntimeEnv(req: Request): Promise<"live" | "preview"> {
  const hinted = (Deno.env.get("BASE44_ENVIRONMENT") || Deno.env.get("ENVIRONMENT") || "").toLowerCase();
  if (hinted.includes("live")) return "live";
  if (hinted.includes("preview") || hinted.includes("dev")) return "preview";
  const host = new URL(req.url).host.toLowerCase();
  if (host.includes("app.base44.com")) return "preview";
  return "live";
}

async function getStripeSecretKey(req: Request): Promise<{
  key: string;
  source: "env" | "remoteConfig";
  masked: string;
  environment: "live" | "preview";
}> {
  const base44 = createClientFromRequest(req);
  const environment = await getRuntimeEnv(req);
  const envKey = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();

  if (!isInvalidKey(envKey)) {
    console.log(`[getStripeSecretKey] Using ENV key: ${maskKey(envKey)}`);
    return { key: envKey, source: "env", masked: maskKey(envKey), environment };
  }

  const rcKey = await readRemoteConfigKey(base44, environment);
  if (!isInvalidKey(rcKey)) {
    console.log(`[getStripeSecretKey] Using RemoteConfig key: ${maskKey(rcKey)}`);
    return { key: rcKey, source: "remoteConfig", masked: maskKey(rcKey), environment };
  }

  const envPrefix = envKey ? envKey.slice(0, 3) : "(missing)";
  const rcPrefix = rcKey ? rcKey.slice(0, 3) : "(missing)";

  throw new Error(
    `Stripe key missing/invalid. envPrefix=${envPrefix}, remoteConfigPrefix=${rcPrefix}, environment=${environment}`
  );
}

Deno.serve(async (req: Request) => {
  try {
    const meta = await getStripeSecretKey(req);
    return json(200, {
      ok: true,
      source: meta.source,
      masked: meta.masked,
      environment: meta.environment,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return json(200, {
      ok: false,
      error: String(e?.message || e),
      timestamp: new Date().toISOString(),
      where: "forceStripeRefresh",
      hint: "Check STRIPE_SECRET_KEY in ENV or RemoteConfig"
    });
  }
});