import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import Stripe from "npm:stripe@14.21.0";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  let keyPrefix = "unknown";

  try {
    let body;
    try {
      body = await req.json().catch(() => ({}));
    } catch (e) {
      return Response.json({ ok: false, error: "BACKFILL_FAILED", where: "parse_body", message: String(e?.message || e) }, { status: 500 });
    }

    const limit = Math.min(body.limit || 50, 100);
    const starting_after = body.starting_after || undefined;
    const maxSubsPerCustomer = Math.min(body.maxSubsPerCustomer || 10, 20);

    let base44, user;
    try {
      base44 = createClientFromRequest(req);
      user = await base44.auth.me().catch(() => null);
    } catch (e) {
      return Response.json({ ok: false, error: "BACKFILL_FAILED", where: "auth_me", message: String(e?.message || e) }, { status: 500 });
    }

    if (user && user.role !== "admin") {
      return Response.json({ ok: false, error: "FORBIDDEN", where: "auth_check" }, { status: 403 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return Response.json({ ok: false, error: "STRIPE_KEY_MISSING", where: "stripe_init" }, { status: 500 });
    }

    keyPrefix = stripeKey.slice(0, 7);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Verify Stripe works
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_AUTH_FAILED",
        where: "stripe_init",
        message: String(e?.message || e),
        keyPrefix
      }, { status: 500 });
    }

    const listParams = { limit };
    if (starting_after) listParams.starting_after = starting_after;

    let customersPage;
    try {
      customersPage = await stripe.customers.list(listParams);
    } catch (e) {
      return Response.json({ ok: false, error: "BACKFILL_FAILED", where: "stripe_customers_list", message: e?.message || String(e), keyPrefix }, { status: 500 });
    }

    let processedCustomers = 0, createdSubs = 0, updatedSubs = 0, createdUsers = 0, updatedUsers = 0;
    let skippedNoEmail = 0, skippedNoSub = 0, errorsCount = 0;
    const sampleErrors = [];

    for (const customer of customersPage.data) {
      try {
        const email = normEmail(customer.email || "");
        if (!email) { skippedNoEmail++; continue; }

        let stripeSubsResponse;
        try {
          stripeSubsResponse = await stripe.subscriptions.list({
            customer: customer.id, status: "all", limit: maxSubsPerCustomer, expand: ["data.items.data.price"]
          });
        } catch (e) {
          errorsCount++;
          if (sampleErrors.length < 5) sampleErrors.push({ where: "stripe_subscriptions_list", email, message: e?.message || String(e) });
          continue;
        }

        if (!stripeSubsResponse.data || stripeSubsResponse.data.length === 0) { skippedNoSub++; continue; }

        const activeOrTrialing = stripeSubsResponse.data.find(s => s.status === "active" || s.status === "trialing");
        const stripeSub = activeOrTrialing || stripeSubsResponse.data[0];
        processedCustomers++;

        let entityUser;
        try {
          const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
          entityUser = existingUsers?.[0];
        } catch (e) {
          errorsCount++;
          if (sampleErrors.length < 5) sampleErrors.push({ where: "db_user_filter", email, message: String(e?.message || e) });
          continue;
        }

        if (!entityUser) {
          try {
            entityUser = await base44.asServiceRole.entities.User.create({ email, full_name: customer.name || `User ${email}`, role: "user", stripe_customer_id: customer.id });
            createdUsers++;
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) sampleErrors.push({ where: "db_user_create", email, message: String(e?.message || e) });
            continue;
          }
        } else if (!entityUser.stripe_customer_id) {
          try {
            await base44.asServiceRole.entities.User.update(entityUser.id, { stripe_customer_id: customer.id });
            updatedUsers++;
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) sampleErrors.push({ where: "db_user_update", email, message: String(e?.message || e) });
          }
        }

        let existingSubs;
        try {
          existingSubs = await base44.asServiceRole.entities.Subscription.filter({ stripe_subscription_id: stripeSub.id });
        } catch (e) {
          errorsCount++;
          if (sampleErrors.length < 5) sampleErrors.push({ where: "db_sub_filter", email, message: String(e?.message || e) });
          continue;
        }

        if (!existingSubs || existingSubs.length === 0) {
          try {
            await base44.asServiceRole.entities.Subscription.create({
              user_email: email, provider: "stripe", provider_subscription_id: stripeSub.id,
              stripe_customer_id: customer.id, stripe_subscription_id: stripeSub.id,
              status: stripeSub.status, tier: "premium",
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
            });
            createdSubs++;
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) sampleErrors.push({ where: "db_sub_create", email, message: String(e?.message || e) });
          }
        } else {
          try {
            await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
              status: stripeSub.status,
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
            });
            updatedSubs++;
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) sampleErrors.push({ where: "db_sub_update", email, message: String(e?.message || e) });
          }
        }
      } catch (e) {
        errorsCount++;
        if (sampleErrors.length < 5) sampleErrors.push({ where: "customer_processing", customer_id: customer.id, email: customer.email, message: String(e?.message || e) });
      }
    }

    const lastCustomerId = customersPage.data.length > 0 ? customersPage.data[customersPage.data.length - 1]?.id : null;

    return Response.json({
      ok: true, keyPrefix,
      fetchedCustomers: customersPage.data.length,
      processedCustomers, createdSubs, updatedSubs, createdUsers, updatedUsers,
      skippedNoEmail, skippedNoSub,
      hasMore: customersPage.has_more,
      nextStartingAfter: customersPage.has_more ? lastCustomerId : null,
      errorsCount, sampleErrors
    });
  } catch (error) {
    return Response.json({ ok: false, error: "BACKFILL_FAILED", where: "top_level", message: error?.message || String(error), keyPrefix }, { status: 500 });
  }
});