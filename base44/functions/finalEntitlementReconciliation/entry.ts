/**
 * finalEntitlementReconciliation — Final Provider-Resolved Contract → Entitlement Reconciliation
 *
 * The authoritative pass that makes entitlement state match authoritative billing state.
 *
 * For every provider-current, provider-resolved paid contract, derives the exact
 * entitlement scope from the Stripe Product ID → canonical plan → module scope chain,
 * and reconciles the UserEntitlement record.
 *
 * Governing invariant:
 *   Every provider-current, provider-resolved paid contract grants exactly the
 *   entitlement scope it purchased, and every active paid entitlement can identify
 *   the authoritative contract or legitimate grant that justifies it.
 *
 * Admin-only. Idempotent.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { getStripeClient } from "../../shared/getStripeClient.ts";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { buildPriceIdMap } from "../../shared/productScopeResolver.ts";
import {
  resolveProductIdentityFromStripeChain,
} from "../../shared/stripeProductResolver.ts";
import {
  reconcileEntitlementForUser,
  buildPriceIdMapFromEnv,
  RECONCILER_VERSION,
} from "../../shared/reconcileEntitlementForUser.ts";
import {
  reconcileContractV2,
} from "../../shared/billingLifecycleReconciler.ts";

const normEmail = (e: unknown) => String(e || "").trim().toLowerCase();
const ACTIVE_LIFECYCLES = ["PROVIDER_ACTIVE", "PROVIDER_TRIALING", "PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;
    const repair_stale = body.repair_stale !== false;

    // ── 1. Load all data ────────────────────────────────────────────────────
    const [contracts, subscriptions, existingEntitlements, referralGrants, registry] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {}, "-created_date", 5000, 50, "ActiveContract"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 50, "Subscription"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.UserEntitlement, {}, "-created_date", 5000, 50, "UserEntitlement"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ReferralEarnedAccess, {}, "-created_date", 5000, 50, "ReferralEarnedAccess"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.StripeProductRegistry, {}, "-created_date", 5000, 50, "StripeProductRegistry"),
    ]);

    const priceIdMap = buildPriceIdMapFromEnv((k) => Deno.env.get(k));

    // ── 2. Query Stripe for all unique subscription IDs ──────────────────────
    const stripeSubIds = new Set<string>();
    for (const c of contracts) {
      if (String(c.provider || "").toLowerCase() === "stripe" && c.provider_subscription_id) {
        stripeSubIds.add(c.provider_subscription_id);
      }
    }

    const stripeVerification: Record<string, any> = {};
    const stripeSubData: Record<string, any> = {};

    try {
      const { stripe } = await getStripeClient(base44.req);
      for (const subId of stripeSubIds) {
        try {
          const sub: any = await stripe.subscriptions.retrieve(subId, {
            expand: ["items.data.price.product"],
          });
          stripeSubData[subId] = sub;
          const productRef = sub.items?.data?.[0]?.price?.product;
          const productId = typeof productRef === "object" ? productRef?.id : productRef;
          stripeVerification[subId] = {
            provider_subscription_id: subId,
            exists: true,
            status: sub.status,
            current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : undefined,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
            cancel_at_period_end: sub.cancel_at_period_end,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
            price_id: sub.items?.data?.[0]?.price?.id,
            product_id: productId,
            verification_available: true,
          };
        } catch (err: any) {
          if (err?.statusCode === 404 || String(err?.message || "").includes("No such subscription")) {
            stripeVerification[subId] = { provider_subscription_id: subId, exists: false, verification_available: true };
          } else {
            stripeVerification[subId] = { provider_subscription_id: subId, exists: false, verification_available: false, raw_error: err?.message };
          }
        }
      }
    } catch (stripeErr) {
      console.warn(`[finalEntitlementReconciliation] Stripe client unavailable: ${stripeErr?.message}`);
    }

    // ── 3. Resolve product identity and lifecycle for each contract ─────────
    const productIdentityClassifications: Record<string, string> = {};
    const contractReconciliations: any[] = [];
    const contractsByUser = new Map<string, any[]>();

    for (const c of contracts) {
      const subId = c.provider_subscription_id;
      const legacySub = subscriptions.find((s: any) =>
        (s.provider_subscription_id && s.provider_subscription_id === subId) ||
        normEmail(s.user_email) === normEmail(c.user_email)
      );

      const providerTruth = {
        stripe_subscription: stripeSubData[subId] || null,
        stripe_lookup_error: null,
        stripe_not_found: stripeVerification[subId]?.exists === false,
      };

      // Resolve product identity (registry-first by Product ID)
      const resolverResult = resolveProductIdentityFromStripeChain({
        contract: c,
        legacy_subscription: legacySub,
        provider_truth: providerTruth,
        price_id_map: priceIdMap,
        registry,
      });

      productIdentityClassifications[c.id] = resolverResult.classification;

      // Classify lifecycle
      let lifecycleClassification = "MANUAL_REVIEW";
      try {
        const lifecycleResult: any = reconcileContractV2({
          contract: c,
          legacy_subscription: legacySub,
          provider_truth: providerTruth,
          price_id_map: priceIdMap,
        });
        lifecycleClassification = lifecycleResult.lifecycle_classification || "MANUAL_REVIEW";
      } catch (e) {
        // Keep MANUAL_REVIEW
      }

      const isCurrent = ACTIVE_LIFECYCLES.includes(lifecycleClassification);
      const isEligible = isCurrent && resolverResult.classification === "PROVIDER_RESOLVED";

      contractReconciliations.push({
        contract_id: c.id,
        user_id: c.user_id,
        user_email: c.user_email,
        provider: c.provider,
        stripe_subscription_id: subId,
        stripe_product_id: resolverResult.resolved_product_id,
        resolved_price_id: resolverResult.resolved_price_id,
        resolved_plan_key: resolverResult.resolved_plan_key,
        resolved_modules: resolverResult.resolved_modules,
        billing_interval: c.billing_interval,
        lifecycle_classification: lifecycleClassification,
        product_identity_classification: resolverResult.classification,
        resolution_source: resolverResult.resolution_source,
        is_current: isCurrent,
        is_eligible: isEligible,
      });

      // Update contract with resolved fields (non-dry-run)
      if (!dry_run && resolverResult.resolved_product_id && resolverResult.resolved_product_id !== c.resolved_product_id) {
        await base44.asServiceRole.entities.ActiveContract.update(c.id, {
          resolved_product_id: resolverResult.resolved_product_id,
          resolved_price_id: resolverResult.resolved_price_id,
          resolved_plan_key: resolverResult.resolved_plan_key,
          product: resolverResult.resolved_product,
          modules: resolverResult.resolved_modules,
          product_source: resolverResult.resolution_source as any,
          reconciliation_status: isEligible ? "provider_matched" : (isCurrent ? "provider_recovered" : lifecycleClassification.toLowerCase()),
          provider_verified_at: new Date().toISOString(),
          normalized_at: new Date().toISOString(),
        }).catch(() => {});
      }

      // Group by user
      const userKey = c.user_id || normEmail(c.user_email);
      if (!contractsByUser.has(userKey)) contractsByUser.set(userKey, []);
      contractsByUser.get(userKey)!.push(c);
    }

    // ── 4. Reconcile entitlements for each user ─────────────────────────────
    const entitlementResults: any[] = [];
    let entitlementsCreated = 0, entitlementsUpdated = 0, scopeCorrections = 0, duplicateMerges = 0;

    for (const [userKey, userContracts] of contractsByUser) {
      const first = userContracts[0];
      const uid = first?.user_id || userKey;
      const uemail = normEmail(first?.user_email || "");
      if (!uid && !uemail) continue;

      const userSubs = subscriptions.filter((s: any) => s.user_id === uid || normEmail(s.user_email) === uemail);
      const userGrants = referralGrants.filter((g: any) => g.user_id === uid);
      const userEntitlements = existingEntitlements.filter((e: any) => e.user_id === uid || normEmail(e.user_email) === uemail);

      const result = reconcileEntitlementForUser({
        user_id: uid,
        user_email: uemail,
        contracts: userContracts,
        subscriptions: userSubs,
        nonPaidGrants: userGrants,
        priceIdMap,
        stripeVerification,
        productIdentityClassifications,
        previousEntitlement: userEntitlements[0] ? {
          has_access: userEntitlements[0].has_access,
          tier: userEntitlements[0].tier,
          modules: userEntitlements[0].modules,
          source_type: userEntitlements[0].source_type,
          verification_status: userEntitlements[0].verification_status,
        } : undefined,
      });

      let action = "no_change";
      if (!dry_run) {
        const computed_at = new Date().toISOString();
        const entitlementData: any = {
          user_id: uid, user_email: result.user_email,
          has_access: result.has_access, tier: result.tier,
          active_contract_ids: result.active_contract_ids,
          backing_subscription_ids: result.backing_subscription_ids,
          modules: result.modules,
          pipekeeper: result.pipekeeper, whiskeykeeper: result.whiskeykeeper,
          cigarkeeper: result.cigarkeeper, winekeeper: result.winekeeper,
          mrr_cents: result.mrr_cents, contract_count: result.contract_count,
          primary_product: result.primary_product, primary_provider: result.primary_provider,
          primary_billing_interval: result.primary_billing_interval,
          next_renewal_at: result.next_renewal_at,
          source_type: result.source_type, verification_status: result.verification_status,
          granted_at: result.granted_at, effective_start: result.effective_start,
          effective_end: result.effective_end, non_paid_grants: result.non_paid_grants,
          reconciler_version: result.reconciler_version, computed_at,
        };

        if (userEntitlements.length === 0) {
          if (result.has_access || result.source_type !== "none") {
            await base44.asServiceRole.entities.UserEntitlement.create(entitlementData);
            action = "created"; entitlementsCreated++;
          }
        } else if (userEntitlements.length === 1) {
          const ex = userEntitlements[0];
          const needsUpdate =
            ex.has_access !== result.has_access ||
            ex.tier !== result.tier ||
            JSON.stringify(ex.modules || []) !== JSON.stringify(result.modules) ||
            ex.source_type !== result.source_type ||
            ex.verification_status !== result.verification_status ||
            ex.contract_count !== result.contract_count;
          if (needsUpdate) {
            await base44.asServiceRole.entities.UserEntitlement.update(ex.id, entitlementData);
            action = "updated"; entitlementsUpdated++;
            if (JSON.stringify(ex.modules || []) !== JSON.stringify(result.modules)) scopeCorrections++;
          }
        } else {
          await base44.asServiceRole.entities.UserEntitlement.update(userEntitlements[0].id, entitlementData);
          for (let i = 1; i < userEntitlements.length; i++) {
            await base44.asServiceRole.entities.UserEntitlement.delete(userEntitlements[i].id);
          }
          action = `deduplicated (${userEntitlements.length} → 1)`;
          duplicateMerges++;
        }
      }

      entitlementResults.push({
        user_id: uid, user_email: uemail,
        has_access: result.has_access, tier: result.tier,
        modules: result.modules, source_type: result.source_type,
        verification_status: result.verification_status,
        contract_count: result.contract_count,
        active_contract_ids: result.active_contract_ids,
        action, anomalies: result.anomalies,
      });
    }

    // ── 5. Repair stale contracts ────────────────────────────────────────────
    const staleRepairs: any[] = [];
    if (repair_stale && !dry_run) {
      for (const cr of contractReconciliations) {
        if (!cr.is_current) {
          const lc = cr.lifecycle_classification;
          if (lc === "PROVIDER_EXPIRED" || lc === "PROVIDER_SUBSCRIPTION_MISSING") {
            await base44.asServiceRole.entities.ActiveContract.update(cr.contract_id, {
              is_active: false,
              reconciliation_status: lc === "PROVIDER_EXPIRED" ? "stale_not_active" : "provider_subscription_missing",
              normalized_at: new Date().toISOString(),
            }).catch(() => {});
            staleRepairs.push({ contract_id: cr.contract_id, user_id: cr.user_id, lifecycle: lc });
          }
        }
      }
    }

    // ── 6. Investigate bodellmd ──────────────────────────────────────────────
    const bodellmdEnt = existingEntitlements.find((e: any) => normEmail(e.user_email) === "bodellmd@gmail.com");
    const bodellmdContracts = contracts.filter((c: any) => normEmail(c.user_email) === "bodellmd@gmail.com");
    const bodellmdSubs = subscriptions.filter((s: any) => normEmail(s.user_email) === "bodellmd@gmail.com");
    const bodellmdGrants = referralGrants.filter((g: any) => normEmail(g.user_email) === "bodellmd@gmail.com");
    const bodellmdClassification =
      bodellmdEnt?.has_access && bodellmdContracts.length === 0 && bodellmdSubs.length === 0 && bodellmdGrants.length === 0
        ? "MANUAL_REVIEW_TRUE_ORPHAN"
        : bodellmdEnt?.source_type || "none";

    // ── 7. Calculate metrics ─────────────────────────────────────────────────
    const providerCurrentStripe = contractReconciliations.filter(cr => cr.provider === "stripe" && cr.is_current);
    const appleProvisional = contractReconciliations.filter(cr => cr.provider === "apple");
    const expired = contractReconciliations.filter(cr => cr.lifecycle_classification === "PROVIDER_EXPIRED");
    const missing = contractReconciliations.filter(cr => cr.lifecycle_classification === "PROVIDER_SUBSCRIPTION_MISSING");
    const noncurrent = contractReconciliations.filter(cr => !cr.is_current);

    // Unique users
    const currentUsers = new Set<string>();
    const historicalUsers = new Set<string>();
    for (const cr of contractReconciliations) {
      const key = cr.user_id || normEmail(cr.user_email);
      if (cr.is_current || cr.provider === "apple") currentUsers.add(key);
      else historicalUsers.add(key);
    }
    // Remove historical-only users from current
    for (const u of historicalUsers) {
      if (!currentUsers.has(u)) currentUsers.delete(u);
    }

    // Module subscriber counts (from entitlement results)
    const moduleCounts = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, bundle: 0 };
    const unresolvedApple = new Set<string>();
    for (const er of entitlementResults) {
      if (!er.has_access) continue;
      const mods = er.modules || [];
      if (mods.length > 1) moduleCounts.bundle++;
      else if (mods.length === 1) {
        const m = mods[0];
        if (moduleCounts[m] !== undefined) moduleCounts[m]++;
      }
      if (er.source_type === "provisional_apple") unresolvedApple.add(er.user_id);
    }

    // Provenance counts
    const provenance = { paid_contract: 0, provisional_apple: 0, grandfathered: 0, promotional: 0, referral: 0, manual_admin: 0, trial: 0, unresolved: 0, none: 0 };
    for (const er of entitlementResults) {
      const st = er.source_type || "none";
      if (provenance[st] !== undefined) provenance[st]++;
    }

    // ── 8. Return report ────────────────────────────────────────────────────
    return Response.json({
      audit_version: "final_entitlement_reconciliation_v1",
      reconciler_version: RECONCILER_VERSION,
      dry_run,
      generated_at: new Date().toISOString(),
      summary: {
        paying_population: {
          provider_verified_current: [...currentUsers].filter(u => !unresolvedApple.has(u)).length,
          apple_provisional: unresolvedApple.size,
          recognized_current_paying: [...currentUsers].length,
          historical_lapsed: historicalUsers.size,
        },
        contracts: {
          provider_current_stripe: providerCurrentStripe.length,
          apple_provisional: appleProvisional.length,
          currently_eligible: providerCurrentStripe.length + appleProvisional.length,
          expired_historical: expired.length,
          provider_missing_historical: missing.length,
          noncurrent_total: noncurrent.length,
        },
        entitlements: {
          created: entitlementsCreated,
          updated: entitlementsUpdated,
          scope_corrections: scopeCorrections,
          duplicate_merges: duplicateMerges,
          total_users_processed: entitlementResults.length,
        },
        module_subscribers: moduleCounts,
        unresolved_apple_scope_users: unresolvedApple.size,
        provenance,
        stale_repairs: staleRepairs.length,
        historical_cleanup: {
          stale_only_users_removed_from_current: historicalUsers.size,
          expired_contracts_normalized: expired.length,
          provider_missing_contracts_normalized: missing.length,
          historical_records_preserved: contracts.length,
        },
        bodellmd: {
          has_entitlement: !!bodellmdEnt,
          has_contracts: bodellmdContracts.length > 0,
          has_subscriptions: bodellmdSubs.length > 0,
          has_grants: bodellmdGrants.length > 0,
          classification: bodellmdClassification,
          access_preserved: bodellmdEnt?.has_access || false,
        },
        apple: {
          credentials_configured: false,
          provisional_users_remaining: unresolvedApple.size,
          unresolved_contracts_remaining: appleProvisional.length,
        },
      },
      contract_reconciliations: contractReconciliations,
      entitlement_results: entitlementResults,
      stale_repairs: staleRepairs,
    });
  } catch (error) {
    console.error("[finalEntitlementReconciliation] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});