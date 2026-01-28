import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, getStripeKeyPrefix, stripeSanityCheck, safeStripeError } from "./_utils/stripe.ts";
import { scanForForbiddenStripeConstructors } from "./_utils/forbidStripeConstructor.ts";

Deno.serve(async (req: Request) => {
  const keyPrefix = getStripeKeyPrefix();
  
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

  let stripeSanityOk = false;
  let stripeSanityError: string | null = null;

  if (keyPrefix === "sk" || keyPrefix === "rk") {
    try {
      const stripe = getStripeClient();
      await stripeSanityCheck(stripe);
      stripeSanityOk = true;
    } catch (e) {
      stripeSanityOk = false;
      stripeSanityError = safeStripeError(e);
    }
  } else {
    stripeSanityError = `Invalid key prefix: ${keyPrefix}`;
  }

  const scan = await scanForForbiddenStripeConstructors();

  const hardFail = scan.ok && scan.forbidden.length > 0;

  return new Response(JSON.stringify({
    ok: true,
    keyPrefix,
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
});