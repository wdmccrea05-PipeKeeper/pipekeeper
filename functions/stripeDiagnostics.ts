import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, getStripeSecretKey, safeStripeError } from "./_utils/stripe.ts";
import { scanForForbiddenStripeConstructors } from "./_utils/forbidStripeConstructor.ts";

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  const me = await base44.auth.me();

  if (!me?.id) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (me.role !== "admin") {
    return new Response(JSON.stringify({ ok: false, error: "FORBIDDEN" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const key = getStripeSecretKey();
  const prefix =
    !key ? "missing" :
    key.startsWith("sk_") ? "sk" :
    key.startsWith("rk_") ? "rk" : "other";

  let stripeKeyValid = prefix === "sk" || prefix === "rk";
  let stripeSanityOk = false;
  let stripeSanityError: string | null = null;

  if (stripeKeyValid) {
    try {
      const stripe = getStripeClient();
      await stripe.balance.retrieve();
      stripeSanityOk = true;
    } catch (e) {
      stripeSanityOk = false;
      stripeSanityError = safeStripeError(e);
    }
  }

  const scan = await scanForForbiddenStripeConstructors();

  // HARD FAIL SIGNAL: if forbidden constructors exist, tell admin clearly
  const hardFail = scan.ok && scan.forbidden.length > 0;

  return new Response(JSON.stringify({
    ok: true,
    stripeKeyPrefix: prefix,
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
});