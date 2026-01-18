import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import Stripe from "npm:stripe@17.4.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const APP_URL = Deno.env.get("APP_URL") || "https://pipekeeper.app";

const ALLOWED_PRICE_IDS = (Deno.env.get("ALLOWED_PRICE_IDS") || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function isIOSCompanionRequest(req) {
  try {
    const url = new URL(req.url);
    return (url.searchParams.get("platform") || "").toLowerCase() === "ios";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    if (!ALLOWED_PRICE_IDS.length) {
      return Response.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const priceId = body?.priceId;

    if (!ALLOWED_PRICE_IDS.includes(priceId)) {
      return Response.json({ error: "Invalid priceId" }, { status: 400 });
    }

    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = existing.data[0]?.id;
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_email: user.email }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/Subscription?status=success`,
      cancel_url: `${APP_URL}/Subscription?status=cancel`
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});