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

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  const keyPrefix = getStripeKeyPrefix();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        keyPrefix 
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 100, 500);
    const starting_after = body.starting_after || undefined;

    // Initialize Stripe and validate
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
    if (!stripeKey || (keyPrefix !== "sk" && keyPrefix !== "rk")) {
      return Response.json({
        ok: false,
        error: "STRIPE_SECRET_KEY_INVALID",
        keyPrefix,
        message: "STRIPE_SECRET_KEY must start with sk_ or rk_"
      }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // HARD STOP: Verify Stripe auth before processing
    try {
      await stripe.balance.retrieve();
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "STRIPE_AUTH_FAILED",
        keyPrefix,
        stripeSanityOk: false,
        where: "sanity_check",
        message: "Stripe authentication failed. Check STRIPE_SECRET_KEY.",
        details: maskError(String(e?.message || e))
      }, { status: 500 });
    }

    // Fetch ONE page of customers
    let customers;
    try {
      customers = await stripe.customers.list({ limit, starting_after });
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "STRIPE_CUSTOMERS_LIST_FAILED",
        keyPrefix,
        where: "customers.list",
        message: maskError(String(e?.message || e))
      }, { status: 500 });
    }

    let createdSubs = 0;
    let updatedSubs = 0;
    let createdUsers = 0;
    let updatedUsers = 0;
    let errorsCount = 0;
    const sampleErrors: any[] = [];

    for (const customer of customers.data) {
      try {
        const email = normEmail(customer.email || "");
        if (!email) continue;

        // Try to find subscription for this customer
        const stripeSubsResponse = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 1,
          expand: ["data.items.data.price"]
        });
        
        const stripeSub = stripeSubsResponse.data[0];
        if (!stripeSub) continue;

        // Find or create entity User
        let entityUser = (await base44.asServiceRole.entities.User.filter({ email }))?.[0];
        
        if (!entityUser) {
          entityUser = await base44.asServiceRole.entities.User.create({
            email,
            full_name: customer.name || `User ${email}`,
            role: "user",
            stripe_customer_id: customer.id
          });
          createdUsers++;
        } else {
          if (!entityUser.stripe_customer_id) {
            await base44.asServiceRole.entities.User.update(entityUser.id, {
              stripe_customer_id: customer.id
            });
            updatedUsers++;
          }
        }

        // Upsert subscription
        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          provider: "stripe",
          provider_subscription_id: stripeSub.id
        });

        if (!existingSubs || existingSubs.length === 0) {
          await base44.asServiceRole.entities.Subscription.create({
            user_email: email,
            provider: "stripe",
            provider_subscription_id: stripeSub.id,
            stripe_customer_id: customer.id,
            stripe_subscription_id: stripeSub.id,
            status: stripeSub.status,
            tier: "premium",
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
          });
          createdSubs++;
        } else {
          updatedSubs++;
        }
      } catch (e: any) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            customer_id: customer.id,
            email: customer.email,
            error: String(e?.message || e)
          });
        }
      }
    }

    return Response.json({
      ok: true,
      keyPrefix,
      stripeSanityOk: true,
      fetchedCustomers: customers.data.length,
      hasMore: customers.has_more,
      nextStartingAfter: customers.has_more ? customers.data[customers.data.length - 1]?.id : null,
      createdSubs,
      updatedSubs,
      createdUsers,
      updatedUsers,
      errorsCount,
      sampleErrors
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: "BACKFILL_FAILED",
      keyPrefix,
      where: "top_level",
      message: maskError(String(error?.message || error))
    }, { status: 500 });
  }
});