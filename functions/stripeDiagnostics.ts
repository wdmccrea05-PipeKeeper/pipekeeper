// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, getStripeKeyPrefix, safeStripeError, stripeSanityCheck } from "./_utils/stripe.ts";

async function scanForForbiddenConstructors() {
  try {
    const functionsDir = "./functions";
    const forbidden: string[] = [];
    
    async function scanDir(dir: string, prefix = "") {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        const displayPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        
        if (entry.isDirectory && entry.name !== "node_modules") {
          await scanDir(fullPath, displayPath);
        } else if (entry.isFile && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
          // Skip the stripe helper itself
          if (fullPath.includes("_utils/stripe")) continue;
          
          const content = await Deno.readTextFile(fullPath);
          if (content.includes("new Stripe(") || content.match(/import\s+Stripe\s+from\s+['"]/)) {
            forbidden.push(displayPath);
          }
        }
      }
    }
    
    await scanDir(functionsDir);
    
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

    // STRICT: Only sk_ allowed
    const stripeKeyValid = keyPrefix === "sk";
    let stripeSanityOk = false;
    let stripeSanityError: string | null = null;

    if (stripeKeyValid) {
      try {
        const stripe = getStripeClient();
        await stripeSanityCheck(stripe);
        stripeSanityOk = true;
      } catch (e) {
        stripeSanityOk = false;
        stripeSanityError = safeStripeError(e);
      }
    } else {
      stripeSanityError = `FORBIDDEN: STRIPE_SECRET_KEY must start with sk_ (secret key). Found: ${keyPrefix}_`;
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
      message: safeStripeError(error)
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});