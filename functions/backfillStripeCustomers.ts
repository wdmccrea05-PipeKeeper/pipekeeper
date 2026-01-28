import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, getStripeKeyPrefix, safeStripeError } from "./_utils/stripe.ts";

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function isoFromUnixSeconds(sec) {
  if (!sec) return null;
  const ms = Number(sec) * 1000;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizeSubscriptionStartDate(startedAt, periodStart, createdDate) {
  return startedAt || periodStart || createdDate || null;
}

function pickBestSubscription(subs) {
  if (!Array.isArray(subs) || subs.length === 0) return null;

  const rank = (s) => {
    const st = (s?.status || "").toLowerCase();
    if (st === "active") return 5;
    if (st === "trialing") return 4;
    if (st === "past_due") return 3;
    if (st === "incomplete" || st === "incomplete_expired") return 0;
    return 2;
  };

  const validSubs = subs.filter(s => rank(s) > 0);
  if (validSubs.length === 0) return null;

  return [...validSubs].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (rb !== ra) return rb - ra;

    const ea = Number(a?.current_period_end || 0);
    const eb = Number(b?.current_period_end || 0);
    return eb - ea;
  })[0];
}

Deno.serve(async (req) => {
  const keyPrefix = getStripeKeyPrefix();
  
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN", 
        message: "Admin access required",
        keyPrefix 
      }, { status: 403 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(body?.limit || 100, 1), 100);
    const starting_after = body?.starting_after || null;
    const max_customers = Math.min(body?.max_customers || 100, 100);

    // Initialize and validate Stripe client
    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_KEY_INVALID",
        keyPrefix,
        message: safeStripeError(e),
      }, { status: 500 });
    }

    // Sanity check: verify Stripe connection
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_AUTH_FAILED",
        keyPrefix,
        stripeSanityOk: false,
        message: safeStripeError(e),
      }, { status: 500 });
    }

    // Fetch ONE page of customers
    const params = { limit };
    if (starting_after) params.starting_after = starting_after;

    let page;
    try {
      page = await stripe.customers.list(params);
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_CALL_FAILED",
        keyPrefix,
        stripeSanityOk: true,
        message: safeStripeError(e),
      }, { status: 500 });
    }

    const customers = page.data || [];
    const hasMore = page.has_more;
    const nextStartingAfter = hasMore && customers.length > 0 
      ? customers[customers.length - 1].id 
      : null;

    // Get existing app users
    let appEmailSet = new Set();
    try {
      const allAppUsers = await base44.asServiceRole.entities.User.list();
      appEmailSet = new Set(allAppUsers.map(u => normEmail(u.email)));
    } catch (e) {
      // User entity might be custom or not accessible
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errorsCount = 0;
    const sampleErrors = [];
    const results = [];

    // Process customers in this batch
    for (const customer of customers.slice(0, max_customers)) {
      const customerEmail = normEmail(customer.email);
      if (!customerEmail) {
        skipped++;
        continue;
      }

      try {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 25,
          expand: ["data.customer", "data.items.data.price"],
        });

        const best = pickBestSubscription(subs?.data || []);
        if (!best) {
          skipped++;
          continue;
        }

        const periodEnd = isoFromUnixSeconds(best.current_period_end);
        const periodStart = isoFromUnixSeconds(best.current_period_start);

        const billingInterval =
          best.items?.data?.[0]?.price?.recurring?.interval ||
          best.items?.data?.[0]?.plan?.interval ||
          "year";

        const unitAmount = best.items?.data?.[0]?.price?.unit_amount;
        const amount = Number.isFinite(unitAmount) ? unitAmount / 100 : null;

        const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: best.id,
        });

        const subscriptionStartedAt = normalizeSubscriptionStartDate(
          isoFromUnixSeconds(best.metadata?.started_at_unix) || isoFromUnixSeconds(best.start_date),
          periodStart,
          isoFromUnixSeconds(best.created)
        );

        const subPayload = {
          user_email: customerEmail,
          status: best.status,
          stripe_subscription_id: best.id,
          stripe_customer_id: customer.id,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          subscriptionStartedAt,
          cancel_at_period_end: !!best.cancel_at_period_end,
          billing_interval: billingInterval,
          amount,
        };

        if (existingSubs?.length) {
          await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, subPayload);
        } else {
          await base44.asServiceRole.entities.Subscription.create(subPayload);
        }

        if (!appEmailSet.has(customerEmail)) {
          const status = String(best.status || "").toLowerCase();
          const endOk = !periodEnd || new Date(periodEnd).getTime() > Date.now();
          const isPaid = (status === "active" || status === "trialing") && endOk;

          try {
            await base44.asServiceRole.entities.User.create({
              email: customerEmail,
              full_name: customer.name || "User from Stripe",
              subscription_level: isPaid ? "paid" : "free",
              subscription_status: best.status,
              stripe_customer_id: customer.id,
            });

            created++;
            appEmailSet.add(customerEmail);
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) {
              sampleErrors.push({ email: customerEmail, error: safeStripeError(e) });
            }
          }
        } else {
          try {
            const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
            if (users?.length) {
              const status = String(best.status || "").toLowerCase();
              const endOk = !periodEnd || new Date(periodEnd).getTime() > Date.now();
              const isPaid = (status === "active" || status === "trialing") && endOk;

              await base44.asServiceRole.entities.User.update(users[0].id, {
                subscription_level: isPaid ? "paid" : (users[0].subscription_level || "free"),
                subscription_status: best.status,
                stripe_customer_id: customer.id,
              });
              updated++;
            }
          } catch (e) {
            errorsCount++;
            if (sampleErrors.length < 5) {
              sampleErrors.push({ email: customerEmail, error: safeStripeError(e) });
            }
          }
        }

        results.push({
          email: customerEmail,
          stripe_id: customer.id,
          subscription_status: best.status,
        });
      } catch (e) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({ email: customerEmail, error: safeStripeError(e) });
        }
      }
    }

    return Response.json({
      ok: true,
      keyPrefix,
      stripeSanityOk: true,
      fetchedCustomers: customers.length,
      hasMore,
      nextStartingAfter,
      created,
      updated,
      skipped,
      errorsCount,
      sampleErrors,
      results,
    });
  } catch (error) {
    console.error("[backfillStripeCustomers] error:", error);
    return Response.json({
      ok: false,
      error: "BACKFILL_FAILED",
      keyPrefix,
      message: safeStripeError(error)
    }, { status: 500 });
  }
});