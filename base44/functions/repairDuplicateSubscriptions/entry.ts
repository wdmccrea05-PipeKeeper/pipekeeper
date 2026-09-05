/**
 * Repair Duplicate Subscriptions
 * 
 * Admin-only function to repair accounts with duplicate billing:
 * - Identifies all active subscriptions for a user
 * - Detects monthly + annual conflicts for the same module
 * - Cancels the duplicate monthly subscription at the provider level (Stripe)
 * - Preserves the annual subscription
 * - Reconciles local Subscription/ActiveContract/UserEntitlement records
 * - Returns a detailed billing timeline and refund exposure analysis
 * 
 * Usage: admin invokes with { email: "user@example.com", dryRun: true/false }
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "../../shared/stripeUtils.ts";
import { detectDuplicateConflicts, type SubscriptionLike } from "../../shared/duplicateSubscriptionGuard.ts";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

async function fetchAll(base44: any, entityName: string, query: any) {
  const results: any[] = [];
  let skip = 0;
  const limit = 100;
  while (true) {
    const batch = await base44.asServiceRole.entities[entityName].filter(query, "-created_date", limit, skip);
    results.push(...batch);
    if (batch.length < limit) break;
    skip += limit;
    if (skip > 500) break;
  }
  return results;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden — admin only" }, { status: 403 });

    const body = await req.json();
    const email = normEmail(body?.email || "");
    const dryRun = body?.dryRun !== false; // Default to dry run for safety

    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    // 1. Find user by email
    const users = await base44.asServiceRole.entities.User.filter({});
    const targetUser = users.find((u: any) => normEmail(u.email) === email);
    if (!targetUser) {
      return Response.json({ error: `No user found with email ${email}` }, { status: 404 });
    }

    // 2. Fetch all subscription records
    const allSubs = await fetchAll(base44, "Subscription", { user_email: email });
    const allSubsByUserId = await fetchAll(base44, "Subscription", { user_id: targetUser.id });
    const allSubsCombined = [...new Map([...allSubs, ...allSubsByUserId].map(s => [s.id, s])).values()];

    // 3. Fetch all ActiveContract records
    const allContracts = await fetchAll(base44, "ActiveContract", { user_id: targetUser.id });

    // 4. Fetch all SubscriptionEvent records
    const allEvents = await fetchAll(base44, "SubscriptionEvent", { user_id: targetUser.id });

    // 5. Detect duplicate conflicts
    const subLikes: SubscriptionLike[] = allSubsCombined.map(s => ({
      id: s.id,
      user_id: s.user_id,
      user_email: s.user_email,
      provider: s.provider,
      provider_subscription_id: s.provider_subscription_id,
      status: s.status,
      tier: s.tier,
      billing_interval: s.billing_interval,
      plan_key: s.plan_key,
      modules_csv: s.modules_csv,
      primary_module: s.primary_module,
      amount: s.amount,
      current_period_end: s.current_period_end,
      created_date: s.created_date,
    }));

    const conflicts = detectDuplicateConflicts(subLikes);

    // 6. Build billing timeline from events
    const billingTimeline = allEvents
      .filter((e: any) => e.is_successful_payment || e.is_initial_purchase || e.is_renewal)
      .sort((a: any, b: any) => new Date(a.transaction_at || a.created_date).getTime() - new Date(b.transaction_at || b.created_date).getTime())
      .map((e: any) => ({
        date: e.transaction_at || e.created_date,
        provider: e.provider,
        event_type: e.normalized_event_type,
        amount_cents: e.amount_cents,
        currency: e.currency,
        subscription_id: e.provider_subscription_id,
        product_id: e.product_id,
        is_initial_purchase: e.is_initial_purchase,
        is_renewal: e.is_renewal,
        billing_interval: e.billing_interval,
      }));

    // 7. Identify the annual subscription to preserve
    const annualSubs = allSubsCombined.filter((s: any) => 
      String(s.billing_interval || "").toLowerCase().includes("year") &&
      ["active", "trial", "trialing"].includes(String(s.status || "").toLowerCase())
    );
    const monthlySubs = allSubsCombined.filter((s: any) => 
      String(s.billing_interval || "").toLowerCase().includes("month") &&
      ["active", "trial", "trialing", "past_due"].includes(String(s.status || "").toLowerCase())
    );

    const annualToPreserve = annualSubs[0] || null;
    const monthlyToTerminate = monthlySubs.filter((s: any) => 
      annualToPreserve && s.primary_module === annualToPreserve.primary_module
    );

    // 8. Calculate refund exposure
    const duplicateMonthlyCharges = billingTimeline.filter((e: any) => {
      // Find charges that occurred while annual was active
      if (!annualToPreserve) return false;
      const annualStart = new Date(annualToPreserve.started_at || annualToPreserve.current_period_start || annualToPreserve.created_date).getTime();
      const chargeDate = new Date(e.date).getTime();
      return e.billing_interval === "month" && e.is_renewal && chargeDate >= annualStart;
    });

    const totalDuplicateAmountCents = duplicateMonthlyCharges.reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0);

    // 9. If not dry run, cancel the Stripe monthly subscription(s)
    const cancellationResults: any[] = [];
    if (!dryRun && monthlyToTerminate.length > 0) {
      const stripe = await getStripeClient(req);

      for (const monthlySub of monthlyToTerminate) {
        if (monthlySub.provider === "stripe" && monthlySub.stripe_subscription_id) {
          try {
            // Cancel at Stripe (cancel immediately, not at period end, since it's a duplicate)
            const canceled = await stripe.subscriptions.cancel(monthlySub.stripe_subscription_id);
            
            // Update local Subscription record
            await base44.asServiceRole.entities.Subscription.update(monthlySub.id, {
              status: "canceled",
              cancel_at_period_end: true,
              updated_date: new Date().toISOString(),
            });

            cancellationResults.push({
              subscription_id: monthlySub.id,
              stripe_subscription_id: monthlySub.stripe_subscription_id,
              status: "canceled_at_stripe",
              stripe_status: canceled.status,
            });
          } catch (e: any) {
            cancellationResults.push({
              subscription_id: monthlySub.id,
              stripe_subscription_id: monthlySub.stripe_subscription_id,
              status: "cancellation_failed",
              error: e?.message || String(e),
            });
          }
        } else if (monthlySub.provider === "apple") {
          // Apple subscriptions cannot be canceled by Base44 — user must cancel via App Store
          cancellationResults.push({
            subscription_id: monthlySub.id,
            provider: "apple",
            status: "requires_user_action",
            message: "Apple subscription cannot be canceled by Base44. User must cancel via App Store Settings.",
          });

          // Mark local record as canceled/non-renewing if it's a manual entry
          if (String(monthlySub.provider_subscription_id || "").includes("manual")) {
            await base44.asServiceRole.entities.Subscription.update(monthlySub.id, {
              status: "canceled",
              cancel_at_period_end: true,
              updated_date: new Date().toISOString(),
            });
          }
        }
      }

      // 10. Update ActiveContract records for terminated subscriptions
      for (const result of cancellationResults) {
        if (result.status === "canceled_at_stripe" || (result.status === "requires_user_action" && result.subscription_id)) {
          const contracts = allContracts.filter((c: any) => 
            c.provider_subscription_id === result.stripe_subscription_id ||
            c.id === result.subscription_id
          );
          for (const contract of contracts) {
            await base44.asServiceRole.entities.ActiveContract.update(contract.id, {
              status: "canceled",
              is_active: false,
              normalized_at: new Date().toISOString(),
            });
          }
        }
      }

      // 11. Update the annual ActiveContract to be active
      if (annualToPreserve) {
        const annualContracts = allContracts.filter((c: any) => 
          c.provider_subscription_id === annualToPreserve.provider_subscription_id ||
          c.provider_subscription_id === annualToPreserve.stripe_subscription_id
        );
        for (const contract of annualContracts) {
          await base44.asServiceRole.entities.ActiveContract.update(contract.id, {
            is_active: true,
            status: "active",
            product: "pipekeeper",
            product_source: "manual",
            modules: ["pipekeeper"],
            quality: "trusted",
            issues: [],
            normalized_at: new Date().toISOString(),
          });
        }

        // 12. Update UserEntitlement
        const existingEnt = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: targetUser.id });
        const entData = {
          user_id: targetUser.id,
          user_email: email,
          has_access: true,
          modules: ["pipekeeper"],
          pipekeeper: true,
          whiskeykeeper: false,
          cigarkeeper: false,
          winekeeper: false,
          mrr_cents: Math.round((annualToPreserve.amount || 0) * 100 / 12),
          contract_count: 1,
          primary_product: "pipekeeper",
          primary_provider: annualToPreserve.provider,
          primary_billing_interval: "annual",
          next_renewal_at: annualToPreserve.current_period_end,
          computed_at: new Date().toISOString(),
        };
        if (existingEnt.length > 0) {
          await base44.asServiceRole.entities.UserEntitlement.update(existingEnt[0].id, entData);
        } else {
          await base44.asServiceRole.entities.UserEntitlement.create(entData);
        }

        // 13. Update User record
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          subscription_provider: annualToPreserve.provider,
          subscription_tier: annualToPreserve.tier,
          subscription_status: "active",
          subscription_level: "paid",
          entitlement_tier: annualToPreserve.tier,
          has_paid_access: true,
          pipekeeper_paid: true,
          paid_modules_csv: "pipekeeper",
          updated_date: new Date().toISOString(),
        });
      }
    }

    // 14. Build the report
    return Response.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name,
        current_tier: targetUser.entitlement_tier,
        has_paid_access: targetUser.has_paid_access,
        subscription_provider: targetUser.subscription_provider,
      },
      subscriptions_found: allSubsCombined.length,
      subscriptions: allSubsCombined.map((s: any) => ({
        id: s.id,
        provider: s.provider,
        provider_subscription_id: s.provider_subscription_id,
        stripe_customer_id: s.stripe_customer_id,
        status: s.status,
        tier: s.tier,
        billing_interval: s.billing_interval,
        amount: s.amount,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        created_date: s.created_date,
        updated_date: s.updated_date,
      })),
      active_contracts: allContracts.map((c: any) => ({
        id: c.id,
        provider: c.provider,
        provider_subscription_id: c.provider_subscription_id,
        status: c.status,
        is_active: c.is_active,
        product: c.product,
        billing_interval: c.billing_interval,
        amount_cents: c.amount_cents,
        period_end: c.period_end,
        quality: c.quality,
        issues: c.issues,
      })),
      conflicts_detected: conflicts,
      annual_subscription_to_preserve: annualToPreserve ? {
        id: annualToPreserve.id,
        provider: annualToPreserve.provider,
        provider_subscription_id: annualToPreserve.provider_subscription_id,
        stripe_subscription_id: annualToPreserve.stripe_subscription_id,
        status: annualToPreserve.status,
        billing_interval: annualToPreserve.billing_interval,
        amount: annualToPreserve.amount,
        current_period_end: annualToPreserve.current_period_end,
      } : null,
      monthly_subscriptions_to_terminate: monthlyToTerminate.map((s: any) => ({
        id: s.id,
        provider: s.provider,
        provider_subscription_id: s.provider_subscription_id,
        stripe_subscription_id: s.stripe_subscription_id,
        status: s.status,
        amount: s.amount,
      })),
      billing_timeline: billingTimeline,
      refund_analysis: {
        duplicate_monthly_charges: duplicateMonthlyCharges.length,
        duplicate_charge_dates: duplicateMonthlyCharges.map((e: any) => e.date),
        total_duplicate_amount_cents: totalDuplicateAmountCents,
        total_duplicate_amount_display: `$${(totalDuplicateAmountCents / 100).toFixed(2)}`,
        currency: "usd",
        refund_mechanism: "Stripe refund via dashboard or API — requires admin authorization",
      },
      dry_run: dryRun,
      cancellation_results: cancellationResults,
      repair_complete: !dryRun && cancellationResults.length > 0,
    });
  } catch (error) {
    console.error("[repairDuplicateSubscriptions] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}