import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

function isIOSCompanionRequest(req) {
  const url = new URL(req.url);
  return (url.searchParams.get("platform") || "").toLowerCase() === "ios";
}

Deno.serve(async (req) => {
  if (isIOSCompanionRequest(req)) {
    return Response.json({ error: "Not available on iOS" }, { status: 403 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email || !user.stripe_customer_id) {
      return Response.json({ error: "No subscription found" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${APP_URL}/Profile`
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});