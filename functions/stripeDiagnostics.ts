import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.5.0";

function getStripeKeyPrefix() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key) return "missing";
  if (key.startsWith("sk_")) return "sk";
  if (key.startsWith("rk_")) return "rk";
  if (key.startsWith("mk_")) return "mk";
  if (key.startsWith("pk_")) return "pk";
  return "other";
}

function maskError(msg: string) {
  return String(msg).replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
}

async function scanForForbiddenConstructors() {
  try {
    const functionsDir = "./functions";
    const forbidden: string[] = [];
    
    for await (const entry of Deno.readDir(functionsDir)) {
      if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
        const filePath = `${functionsDir}/${entry.name}`;
        const content = await Deno.readTextFile(filePath);
        if (content.includes("new Stripe(")) {
          forbidden.push(entry.name);
        }
      }
    }
    
    return { ok: true, forbidden };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

Deno.serve(async (req: Request) => {
  const keyPrefix = getStripeKeyPrefix();
  
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.id) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED", keyPrefix }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    if (me.role !== "admin") {
      return new Response(JSON.stringify({ ok: false, error: "FORBIDDEN", keyPrefix }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    const stripeKeyValid = keyPrefix === "sk" || keyPrefix === "rk";
    let stripeSanityOk = false;
    let stripeSanityError: string | null = null;

    if (stripeKeyValid) {
      try {
        const key = Deno.env.get("STRIPE_SECRET_KEY")!.trim();
        const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
        await stripe.balance.retrieve();
        stripeSanityOk = true;
      } catch (e) {
        stripeSanityOk = false;
        stripeSanityError = maskError(String(e?.message || e));
      }
    } else {
      stripeSanityError = `Invalid key prefix: ${keyPrefix}. Use sk_ or rk_.`;
    }

    const scan = await scanForForbiddenConstructors();
    const hardFail = scan.ok && scan.forbidden.length > 0;

    return new Response(JSON.stringify({
      ok: true,
      keyPrefix,
      stripeKeyValid,
      stripeSanityOk,
      stripeSanityError,
      forbiddenStripeConstructorsScan: scan,
      hardFail,
      hardFailHint: hardFail
        ? "Remove all `new Stripe(` from /functions and use getStripeClient() from functions/_utils/stripe.ts."
        : null
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: "DIAGNOSTICS_FAILED",
      keyPrefix,
      message: maskError(String(error?.message || error))
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});