/**
 * reconcileEntitlementForUser — Backend Function
 *
 * The canonical Contract → Entitlement reconciler backend wrapper.
 *
 * Fetches all data for a single user (or all users), provider-verifies Stripe
 * contracts against live Stripe API, runs the canonical reconciler, and
 * upserts the UserEntitlement record (idempotent — never creates duplicates).
 *
 * Usage:
 *   POST with { user_id?: string, user_email?: string, dry_run?: boolean, verify_stripe?: boolean }
 *   - If user_id/user_email provided: reconcile that single user
 *   - If neither: reconcile ALL users with active contracts
 *   - dry_run: compute but don't write to DB
 *   - verify_stripe: query live Stripe API (default true for single-user, false for all-users)
 *
 * Idempotency: Running repeatedly produces the same correct state.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import {
  reconcileEntitlementForUser,
  buildPriceIdMapFromEnv,
  RECONCILER_VERSION,
  type StripeVerificationResult,
} from "../../shared/reconcileEntitlementForUser.ts";
import { getStripeClient } from "../../shared/getStripeClient.ts";

const normEmail = (e: unknown) => String(e || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, user_email, dry_run = false, verify_stripe } = body;

    const targetUserId = user_id || (user_email ? null : null);
    const targetEmail = normEmail(user_email);

    // Determine if we're doing single-user or all-users
    const isSingleUser = !!(targetUserId || targetEmail);
    const shouldVerifyStripe = verify_stripe ?? isSingleUser; // default: verify for single user

    console.log(`[reconcileEntitlementForUser] mode=${isSingleUser ? 'single' : 'all'} verify_stripe=${shouldVerifyStripe} dry_run=${dry_run}`);

    const priceIdMap = buildPriceIdMapFromEnv((k) => Deno.env.get(k));

    // ── Fetch contracts, subs, entitlements ──────────────────────────────────
    let contractFilter = {};
    let subFilter = {};
    let entitlementFilter = {};

    if (isSingleUser) {
      if (targetUserId) {
        contractFilter = { user_id: targetUserId };
        subFilter = { user_id: targetUserId };
        entitlementFilter = { user_id: targetUserId };
      } else if (targetEmail) {
        contractFilter = { user_email: targetEmail };
        subFilter = { user_email: targetEmail };
        entitlementFilter = { user_email: targetEmail };
      }
    }

    const [contracts, subscriptions, existingEntitlements, referralGrants] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, contractFilter, "-created_date", 5000, 50, "ActiveContract"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, subFilter, "-created_date", 5000, 50, "Subscription"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.UserEntitlement, entitlementFilter, "-created_date", 5000, 50, "UserEntitlement"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ReferralEarnedAccess, isSingleUser ? (targetUserId ? { user_id: targetUserId } : {}) : {}, "-created_date", 5000, 50, "ReferralEarnedAccess"),
    ]);

    // ── If all-users mode, group by user and process each ─────────────────────
    if (!isSingleUser) {
      const userMap = new Map<string, { contracts: any[]; subs: any[]; grants: any[] }>();
      for (const c of contracts) {
        const key = c.user_id || normEmail(c.user_email);
        if (!userMap.has(key)) userMap.set(key, { contracts: [], subs: [], grants: [] });
        userMap.get(key)!.contracts.push(c);
      }
      for (const s of subscriptions) {
        const key = s.user_id || normEmail(s.user_email);
        if (!userMap.has(key)) userMap.set(key, { contracts: [], subs: [], grants: [] });
        userMap.get(key)!.subs.push(s);
      }
      for (const g of referralGrants) {
        const key = g.user_id;
        if (key && userMap.has(key)) userMap.get(key)!.grants.push(g);
      }

      const results: any[] = [];
      for (const [ukey, data] of userMap) {
        const firstContract = data.contracts[0];
        const uid = firstContract?.user_id || ukey;
        const uemail = normEmail(firstContract?.user_email || '');
        if (!uid && !uemail) continue;

        const result = await processSingleUser({
          base44,
          user_id: uid,
          user_email: uemail,
          contracts: data.contracts,
          subscriptions: data.subs,
          nonPaidGrants: data.grants,
          existingEntitlements: existingEntitlements.filter((e: any) => e.user_id === uid || normEmail(e.user_email) === uemail),
          priceIdMap,
          verifyStripe: shouldVerifyStripe,
          dryRun: dry_run,
        });
        results.push(result);
      }

      return Response.json({
        reconciler_version: RECONCILER_VERSION,
        mode: "all_users",
        users_processed: results.length,
        entitlements_repaired: results.filter((r: any) => r.repaired).length,
        entitlements_unchanged: results.filter((r: any) => !r.repaired).length,
        results,
      });
    }

    // ── Single user mode ──────────────────────────────────────────────────────
    const result = await processSingleUser({
      base44,
      user_id: targetUserId || subscriptions[0]?.user_id || contracts[0]?.user_id || '',
      user_email: targetEmail || normEmail(subscriptions[0]?.user_email || contracts[0]?.user_email || ''),
      contracts,
      subscriptions,
      nonPaidGrants: referralGrants,
      existingEntitlements,
      priceIdMap,
      verifyStripe: shouldVerifyStripe,
      dryRun: dry_run,
    });

    return Response.json({
      reconciler_version: RECONCILER_VERSION,
      mode: "single_user",
      ...result,
    });
  } catch (error) {
    console.error("[reconcileEntitlementForUser] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});

// ── Single user processor ─────────────────────────────────────────────────────

async function processSingleUser({
  base44, user_id, user_email, contracts, subscriptions, nonPaidGrants, existingEntitlements, priceIdMap, verifyStripe, dryRun,
}: any): Promise<any> {
  // ── Provider-verify Stripe contracts ──────────────────────────────────────
  const stripeVerification: Record<string, StripeVerificationResult> = {};

  if (verifyStripe) {
    const stripeContracts = contracts.filter((c: any) =>
      String(c.provider || '').toLowerCase() === 'stripe' && c.provider_subscription_id
    );

    if (stripeContracts.length > 0) {
      try {
        const { stripe } = await getStripeClient(base44.req);
        for (const c of stripeContracts) {
          const subId = c.provider_subscription_id;
          try {
            const sub: any = await stripe.subscriptions.retrieve(subId);
            stripeVerification[subId] = {
              provider_subscription_id: subId,
              exists: true,
              status: sub.status,
              current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : undefined,
              current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
              cancel_at_period_end: sub.cancel_at_period_end,
              canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
              price_id: sub.items?.data?.[0]?.price?.id,
              product_id: sub.items?.data?.[0]?.price?.product,
              verification_available: true,
            };
          } catch (err: any) {
            if (err?.statusCode === 404 || String(err?.message || '').includes('No such subscription')) {
              stripeVerification[subId] = {
                provider_subscription_id: subId,
                exists: false,
                verification_available: true,
              };
            } else {
              // API error — verification unavailable (don't downgrade)
              stripeVerification[subId] = {
                provider_subscription_id: subId,
                exists: false,
                verification_available: false,
                raw_error: err?.message || 'unknown',
              };
              console.warn(`[reconcileEntitlementForUser] Stripe verification unavailable for ${subId}: ${err?.message}`);
            }
          }
        }
      } catch (stripeErr) {
        // Stripe client init failed — mark all as verification_unavailable
        console.warn(`[reconcileEntitlementForUser] Stripe client unavailable: ${stripeErr?.message}`);
        for (const c of stripeContracts) {
          if (!stripeVerification[c.provider_subscription_id]) {
            stripeVerification[c.provider_subscription_id] = {
              provider_subscription_id: c.provider_subscription_id,
              exists: false,
              verification_available: false,
              raw_error: stripeErr?.message || 'stripe_client_init_failed',
            };
          }
        }
      }
    }
  }

  // ── Run canonical reconciler ──────────────────────────────────────────────
  const previousEntitlement = existingEntitlements[0] || undefined;
  const result = reconcileEntitlementForUser({
    user_id,
    user_email,
    contracts,
    subscriptions,
    nonPaidGrants,
    priceIdMap,
    stripeVerification,
    previousEntitlement: previousEntitlement ? {
      has_access: previousEntitlement.has_access,
      tier: previousEntitlement.tier,
      modules: previousEntitlement.modules,
      source_type: previousEntitlement.source_type,
      verification_status: previousEntitlement.verification_status,
    } : undefined,
  });

  // ── Upsert UserEntitlement (idempotent) ────────────────────────────────────
  let repaired = false;
  let action = "no_change";

  if (!dryRun) {
    const computed_at = new Date().toISOString();
    const entitlementData = {
      user_id,
      user_email: result.user_email,
      has_access: result.has_access,
      tier: result.tier,
      active_contract_ids: result.active_contract_ids,
      backing_subscription_ids: result.backing_subscription_ids,
      modules: result.modules,
      pipekeeper: result.pipekeeper,
      whiskeykeeper: result.whiskeykeeper,
      cigarkeeper: result.cigarkeeper,
      winekeeper: result.winekeeper,
      mrr_cents: result.mrr_cents,
      contract_count: result.contract_count,
      primary_product: result.primary_product,
      primary_provider: result.primary_provider,
      primary_billing_interval: result.primary_billing_interval,
      next_renewal_at: result.next_renewal_at,
      source_type: result.source_type,
      verification_status: result.verification_status,
      granted_at: result.granted_at,
      effective_start: result.effective_start,
      effective_end: result.effective_end,
      non_paid_grants: result.non_paid_grants,
      reconciler_version: result.reconciler_version,
      computed_at,
    };

    if (existingEntitlements.length === 0) {
      // Create new
      if (result.has_access || result.source_type !== 'none') {
        await base44.asServiceRole.entities.UserEntitlement.create(entitlementData);
        repaired = true;
        action = "created";
      }
    } else if (existingEntitlements.length === 1) {
      // Update existing
      const existing = existingEntitlements[0];
      const needsUpdate =
        existing.has_access !== result.has_access ||
        existing.tier !== result.tier ||
        JSON.stringify(existing.modules || []) !== JSON.stringify(result.modules) ||
        existing.source_type !== result.source_type ||
        existing.verification_status !== result.verification_status ||
        existing.contract_count !== result.contract_count;

      if (needsUpdate) {
        await base44.asServiceRole.entities.UserEntitlement.update(existing.id, entitlementData);
        repaired = true;
        action = "updated";
      }
    } else {
      // Multiple entitlements for same user — deduplicate: update first, delete rest
      const [first, ...rest] = existingEntitlements;
      await base44.asServiceRole.entities.UserEntitlement.update(first.id, entitlementData);
      for (const extra of rest) {
        await base44.asServiceRole.entities.UserEntitlement.delete(extra.id);
      }
      repaired = true;
      action = `deduplicated (${existingEntitlements.length} → 1)`;
    }
  }

  return {
    user_id,
    user_email: result.user_email,
    has_access: result.has_access,
    tier: result.tier,
    modules: result.modules,
    source_type: result.source_type,
    verification_status: result.verification_status,
    contract_count: result.contract_count,
    active_contract_ids: result.active_contract_ids,
    anomalies: result.anomalies,
    stripe_verification: Object.keys(stripeVerification).length > 0
      ? Object.fromEntries(Object.entries(stripeVerification).map(([k, v]) => [k, { exists: v.exists, status: v.status, verification_available: v.verification_available }]))
      : undefined,
    repaired,
    action,
  };
}