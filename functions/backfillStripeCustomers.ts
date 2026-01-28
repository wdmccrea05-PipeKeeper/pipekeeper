import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient, stripeKeyErrorResponse, safeStripeError } from "./_utils/stripe.ts";

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
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let stripe;
    try {
      stripe = getStripeClient();
    } catch (e) {
      return Response.json(stripeKeyErrorResponse(e), { status: 500 });
    }

    const allCustomers = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const params = { limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      
      const page = await stripe.customers.list(params);
      allCustomers.push(...(page.data || []));
      hasMore = page.has_more;
      startingAfter = page.data?.[page.data.length - 1]?.id;
    }

    let appEmailSet = new Set();
    try {
      const allAppUsers = await base44.asServiceRole.entities.User.list();
      appEmailSet = new Set(allAppUsers.map(u => normEmail(u.email)));
    } catch (e) {
      // User entity might be custom or not accessible
    }

    let created = 0;
    let updated = 0;
    const results = [];

    for (const customer of allCustomers) {
      const customerEmail = normEmail(customer.email);
      if (!customerEmail) continue;

      try {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 25,
          expand: ["data.customer", "data.items.data.price"],
        });

        const best = pickBestSubscription(subs?.data || []);
        if (!best) continue;

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
            console.log(`[backfillStripeCustomers] Could not create user ${customerEmail}: ${e?.message}`);
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
            console.log(`[backfillStripeCustomers] Could not update user ${customerEmail}: ${e?.message}`);
          }
        }

        results.push({
          email: customerEmail,
          stripe_id: customer.id,
          subscription_status: best.status,
        });
      } catch (e) {
        console.error(`[backfillStripeCustomers] Error processing customer ${customer.id}:`, safeStripeError(e));
      }
    }

    return Response.json({
      ok: true,
      totalCustomers: allCustomers.length,
      created,
      updated,
      results,
    });
  } catch (error) {
    console.error("[backfillStripeCustomers] error:", error);
    return Response.json({
      ok: false,
      error: "STRIPE_CALL_FAILED",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});