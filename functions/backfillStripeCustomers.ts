// DEPLOYMENT: 2026-02-02T04:00:00Z - No imports

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "./_shared/getStripeClient.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

Deno.serve(async (req: Request) => {
  let keyPrefix = "unknown";
  
  try {
    // Stage: parse_body
    let body;
    try {
      body = await req.json().catch(() => ({}));
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "BACKFILL_FAILED",
        where: "parse_body",
        message: String(e?.message || e),
        keyPrefix
      }, { status: 500 });
    }

    const limit = Math.min(body.limit || 50, 100);
    const starting_after = body.starting_after || undefined;
    const maxSubsPerCustomer = Math.min(body.maxSubsPerCustomer || 10, 20);

    // Stage: auth_me
    let base44, user;
    try {
      base44 = createClientFromRequest(req);
      user = await base44.auth.me();
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "BACKFILL_FAILED",
        where: "auth_me",
        message: String(e?.message || e),
        keyPrefix
      }, { status: 500 });
    }

    if (user?.role !== "admin") {
      return Response.json({ 
        ok: false, 
        error: "FORBIDDEN",
        where: "auth_check",
        keyPrefix 
      }, { status: 403 });
    }

    // Stage: stripe_init
    let stripe;
    try {
      const { stripe: stripeClient, meta } = await getStripeClient(req);
      stripe = stripeClient;
      keyPrefix = meta.masked.slice(0, 4);
      console.log(`[backfillStripeCustomers] env=${meta.environment} source=${meta.source} key=${meta.masked}`);
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "BACKFILL_FAILED",
        where: "stripe_init",
        message: e?.message || String(e),
        keyPrefix
      }, { status: 500 });
    }

    // Stage: stripe_customers_list - Fetch ONE page only
    let customersPage;
    try {
      const listParams: any = { limit };
      if (starting_after) {
        listParams.starting_after = starting_after;
      }
      customersPage = await stripe.customers.list(listParams);
    } catch (e: any) {
      return Response.json({
        ok: false,
        error: "BACKFILL_FAILED",
        where: "stripe_customers_list",
        message: e?.message || String(e),
        keyPrefix
      }, { status: 500 });
    }

    let processedCustomers = 0;
    let createdSubs = 0;
    let updatedSubs = 0;
    let createdUsers = 0;
    let updatedUsers = 0;
    let skippedNoEmail = 0;
    let skippedNoSub = 0;
    let errorsCount = 0;
    const sampleErrors: any[] = [];

    // Process customers SEQUENTIALLY (no Promise.all to avoid timeout)
    for (const customer of customersPage.data) {
      try {
        const email = normEmail(customer.email || "");
        if (!email) {
          skippedNoEmail++;
          continue;
        }

        // Stage: stripe_subscriptions_list
        let stripeSubsResponse;
        try {
          stripeSubsResponse = await stripe.subscriptions.list({
            customer: customer.id,
            status: "all",
            limit: maxSubsPerCustomer,
            expand: ["data.items.data.price"]
          });
        } catch (e: any) {
          errorsCount++;
          if (sampleErrors.length < 5) {
            sampleErrors.push({
              where: "stripe_subscriptions_list",
              email,
              customer_id: customer.id,
              message: e?.message || String(e)
            });
          }
          continue;
        }
        
        if (!stripeSubsResponse.data || stripeSubsResponse.data.length === 0) {
          skippedNoSub++;
          continue;
        }

        // Pick best subscription (active/trialing else latest)
        const activeOrTrialing = stripeSubsResponse.data.find((s: any) => 
          s.status === "active" || s.status === "trialing"
        );
        const stripeSub = activeOrTrialing || stripeSubsResponse.data[0];

        processedCustomers++;

        // Upsert User entity (DO NOT list all users, use filter)
        let entityUser;
        try {
          const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
          entityUser = existingUsers?.[0];
        } catch (e: any) {
          errorsCount++;
          if (sampleErrors.length < 5) {
            sampleErrors.push({
              where: "db_user_filter",
              email,
              message: String(e?.message || e)
            });
          }
          continue;
        }
        
        if (!entityUser) {
          try {
            entityUser = await base44.asServiceRole.entities.User.create({
              email,
              full_name: customer.name || `User ${email}`,
              role: "user",
              stripe_customer_id: customer.id
            });
            createdUsers++;
          } catch (e: any) {
            errorsCount++;
            if (sampleErrors.length < 5) {
              sampleErrors.push({
                where: "db_user_create",
                email,
                message: String(e?.message || e)
              });
            }
            continue;
          }
        } else {
          if (!entityUser.stripe_customer_id) {
            try {
              await base44.asServiceRole.entities.User.update(entityUser.id, {
                stripe_customer_id: customer.id
              });
              updatedUsers++;
            } catch (e: any) {
              errorsCount++;
              if (sampleErrors.length < 5) {
                sampleErrors.push({
                  where: "db_user_update",
                  email,
                  message: String(e?.message || e)
                });
              }
            }
          }
        }

        // Upsert Subscription entity by stripe_subscription_id
        let existingSubs;
        try {
          existingSubs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: stripeSub.id
          });
        } catch (e: any) {
          errorsCount++;
          if (sampleErrors.length < 5) {
            sampleErrors.push({
              where: "db_sub_filter",
              email,
              stripe_sub_id: stripeSub.id,
              message: String(e?.message || e)
            });
          }
          continue;
        }

        if (!existingSubs || existingSubs.length === 0) {
          try {
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
          } catch (e: any) {
            errorsCount++;
            if (sampleErrors.length < 5) {
              sampleErrors.push({
                where: "db_sub_create",
                email,
                stripe_sub_id: stripeSub.id,
                message: String(e?.message || e)
              });
            }
          }
        } else {
          try {
            await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
              status: stripeSub.status,
              current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString()
            });
            updatedSubs++;
          } catch (e: any) {
            errorsCount++;
            if (sampleErrors.length < 5) {
              sampleErrors.push({
                where: "db_sub_update",
                email,
                stripe_sub_id: stripeSub.id,
                message: String(e?.message || e)
              });
            }
          }
        }
      } catch (e: any) {
        errorsCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push({
            where: "customer_processing",
            customer_id: customer.id,
            email: customer.email,
            message: String(e?.message || e)
          });
        }
      }
    }

    const lastCustomerId = customersPage.data.length > 0 
      ? customersPage.data[customersPage.data.length - 1]?.id 
      : null;

    return Response.json({
      ok: true,
      keyPrefix,
      fetchedCustomers: customersPage.data.length,
      processedCustomers,
      createdSubs,
      updatedSubs,
      createdUsers,
      updatedUsers,
      skippedNoEmail,
      skippedNoSub,
      hasMore: customersPage.has_more,
      nextStartingAfter: customersPage.has_more ? lastCustomerId : null,
      errorsCount,
      sampleErrors
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      error: "BACKFILL_FAILED",
      where: "top_level",
      message: error?.message || String(error),
      keyPrefix
    }, { status: 500 });
  }
});