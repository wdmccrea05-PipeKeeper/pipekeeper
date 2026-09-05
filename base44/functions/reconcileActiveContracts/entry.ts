/**
 * reconcileActiveContracts — Canonical Billing Lifecycle Reconciliation (v2)
 *
 * DIAGNOSTIC PASS — does NOT create, revoke, or broaden entitlements.
 * Only corrects stale local status when provider truth proves it.
 *
 * For every active-looking ActiveContract (is_active=true OR status in
 * active/trialing), produces TWO independent classifications:
 *
 *   A. Billing Lifecycle (is this contract current and billable?)
 *   B. Product Identity (do we know which CK product/module?)
 *
 * Queries the LIVE Stripe API for every unique provider_subscription_id.
 * If the same subscription ID is referenced by multiple local contracts,
 * queries Stripe ONCE and classifies all references from that single result.
 *
 * Produces a canonical 86-row export with all required columns.
 *
 * Admin-only.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "../../shared/getStripeClient.ts";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { buildPriceIdMap } from "../../shared/productScopeResolver.ts";
import {
  reconcileContractV2,
  classifyScopeCategory,
  checkInvariantsV2,
  classifyMultiContractUser,
  computePayingPopulation,
  type ContractReconciliationV2,
} from "../../shared/billingLifecycleReconciler.ts";

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);

  // ── Auth: admin-only ──────────────────────────────────────────────────────
  const me = await base44.auth.me();
  if (!me || me.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const repair = body.repair === true; // default false — diagnostic pass
  const verify_stripe = body.verify_stripe !== false; // default true

  // ── Build price ID map from env vars ──────────────────────────────────────
  const priceIdEnv: Record<string, string | undefined> = {
    VITE_STRIPE_PIPEKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_PIPEKEEPER_MONTHLY"),
    VITE_STRIPE_PIPEKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_PIPEKEEPER_ANNUAL"),
    VITE_STRIPE_WHISKEYKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_MONTHLY"),
    VITE_STRIPE_WHISKEYKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_WHISKEYKEEPER_ANNUAL"),
    VITE_STRIPE_CIGARKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_CIGARKEEPER_MONTHLY"),
    VITE_STRIPE_CIGARKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_CIGARKEEPER_ANNUAL"),
    VITE_STRIPE_WINEKEEPER_MONTHLY: Deno.env.get("VITE_STRIPE_WINEKEEPER_MONTHLY"),
    VITE_STRIPE_WINEKEEPER_ANNUAL: Deno.env.get("VITE_STRIPE_WINEKEEPER_ANNUAL"),
    VITE_STRIPE_FOUNDERS_MONTHLY: Deno.env.get("VITE_STRIPE_FOUNDERS_MONTHLY"),
    VITE_STRIPE_FOUNDERS_ANNUAL: Deno.env.get("VITE_STRIPE_FOUNDERS_ANNUAL"),
    VITE_STRIPE_THREE_BUNDLE_MONTHLY: Deno.env.get("VITE_STRIPE_THREE_BUNDLE_MONTHLY"),
    VITE_STRIPE_THREE_BUNDLE_ANNUAL: Deno.env.get("VITE_STRIPE_THREE_BUNDLE_ANNUAL"),
    VITE_STRIPE_FOUR_BUNDLE_MONTHLY: Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_MONTHLY"),
    VITE_STRIPE_FOUR_BUNDLE_ANNUAL: Deno.env.get("VITE_STRIPE_FOUR_BUNDLE_ANNUAL"),
  };
  const price_id_map = buildPriceIdMap(priceIdEnv);

  // ── Fetch ALL ActiveContract records ──────────────────────────────────────
  console.log("[reconcileActiveContracts] Fetching all ActiveContract records...");
  const allContracts = await fetchAllEntitiesServer(
    base44.asServiceRole.entities.ActiveContract,
    {},
  );
  // Active-looking: is_active=true OR status in (active, trialing)
  const activeContracts = allContracts.filter(
    (c) =>
      c.is_active === true ||
      c.status === "active" ||
      c.status === "trialing",
  );
  console.log(
    `[reconcileActiveContracts] Total contracts: ${allContracts.length}, active-looking: ${activeContracts.length}`,
  );

  // ── Fetch ALL legacy Subscription records ──────────────────────────────────
  console.log("[reconcileActiveContracts] Fetching legacy Subscription records...");
  const allSubscriptions = await fetchAllEntitiesServer(
    base44.asServiceRole.entities.Subscription,
    {},
  );
  console.log(
    `[reconcileActiveContracts] Legacy subscriptions: ${allSubscriptions.length}`,
  );

  // Build lookup maps
  const subByProviderSubId: Record<string, any> = {};
  const subByInternalId: Record<string, any> = {};
  for (const s of allSubscriptions) {
    if (s.provider_subscription_id)
      subByProviderSubId[s.provider_subscription_id] = s;
    if (s.stripe_subscription_id)
      subByProviderSubId[s.stripe_subscription_id] = s;
    subByInternalId[s.id] = s;
  }

  // ── Get Stripe client ─────────────────────────────────────────────────────
  let stripe: any = null;
  if (verify_stripe) {
    try {
      const { stripe: s } = await getStripeClient(req);
      stripe = s;
      console.log("[reconcileActiveContracts] Stripe client initialized");
    } catch (e: any) {
      console.log(
        `[reconcileActiveContracts] Stripe client init failed: ${e.message}`,
      );
    }
  }

  // ── Query Stripe ONCE per unique provider_subscription_id ──────────────────
  const stripeTruthCache: Record<string, any> = {};
  const uniqueSubIds = new Set<string>();
  for (const c of activeContracts) {
    if (c.provider === "stripe" && c.provider_subscription_id) {
      uniqueSubIds.add(c.provider_subscription_id);
    }
  }
  console.log(
    `[reconcileActiveContracts] Unique Stripe subscription IDs to query: ${uniqueSubIds.size}`,
  );

  let stripeQueried = 0;
  let stripeFound = 0;
  let stripeNotFound = 0;
  let stripeError = 0;

  if (verify_stripe && stripe) {
    for (const subId of uniqueSubIds) {
      try {
        stripeQueried++;
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price.product"],
        });
        stripeTruthCache[subId] = { stripe_subscription: sub };
        stripeFound++;
      } catch (e: any) {
        if (
          e.code === "resource_missing" ||
          e.statusCode === 404 ||
          String(e.message).includes("No such")
        ) {
          stripeTruthCache[subId] = { stripe_not_found: true };
          stripeNotFound++;
        } else {
          stripeTruthCache[subId] = { stripe_lookup_error: e.message };
          stripeError++;
        }
      }
    }
    console.log(
      `[reconcileActiveContracts] Stripe queries: ${stripeQueried} attempted, ${stripeFound} found, ${stripeNotFound} not found, ${stripeError} errors`,
    );
  }

  // ── Reconcile each contract ───────────────────────────────────────────────
  const results: ContractReconciliationV2[] = [];

  for (const contract of activeContracts) {
    const legacy_sub =
      (contract.provider_subscription_id &&
        subByProviderSubId[contract.provider_subscription_id]) ||
      (contract.source_subscription_id &&
        subByInternalId[contract.source_subscription_id]) ||
      null;

    // Get cached Stripe truth (or null for non-Stripe / no sub ID)
    let provider_truth = null;
    if (contract.provider === "stripe" && contract.provider_subscription_id) {
      provider_truth = stripeTruthCache[contract.provider_subscription_id] || null;
      // If verify_stripe=false, provider_truth stays null → MANUAL_REVIEW
    }

    const result = reconcileContractV2({
      contract,
      legacy_subscription: legacy_sub,
      provider_truth,
      price_id_map,
    });
    results.push(result);

    // Repair stale local status only (no entitlement changes)
    if (repair && result.repair_needed && result.repair_fields) {
      try {
        await base44.entities.ActiveContract.update(
          contract.id,
          result.repair_fields,
        );
      } catch (e: any) {
        console.log(
          `[reconcileActiveContracts] Repair failed for ${contract.id}: ${e.message}`,
        );
      }
    }
  }

  // ── Lifecycle category counts ─────────────────────────────────────────────
  const lifecycleCounts: Record<string, number> = {};
  for (const r of results) {
    lifecycleCounts[r.lifecycle_classification] =
      (lifecycleCounts[r.lifecycle_classification] || 0) + 1;
  }

  // ── Product identity category counts ─────────────────────────────────────
  const productIdentityCounts: Record<string, number> = {};
  for (const r of results) {
    productIdentityCounts[r.product_identity_classification] =
      (productIdentityCounts[r.product_identity_classification] || 0) + 1;
  }

  // ── Product resolution source counts ─────────────────────────────────────
  const resolutionSourceCounts: Record<string, number> = {};
  for (const r of results) {
    resolutionSourceCounts[r.product_resolution_source] =
      (resolutionSourceCounts[r.product_resolution_source] || 0) + 1;
  }

  // ── Scope category counts ──────────────────────────────────────────────────
  const scopeCounts: Record<string, number> = {
    pipekeeper: 0,
    whiskeykeeper: 0,
    cigarkeeper: 0,
    winekeeper: 0,
    multi_module_bundle: 0,
    unresolved: 0,
  };
  for (const r of results) {
    const cat = classifyScopeCategory(r);
    scopeCounts[cat] = (scopeCounts[cat] || 0) + 1;
  }

  // ── Paying eligibility counts ──────────────────────────────────────────────
  const payingEligible = results.filter((r) => r.current_paying_eligible).length;
  const notEligible = results.length - payingEligible;

  // ── Invariants ─────────────────────────────────────────────────────────────
  const invariants = checkInvariantsV2(results);
  const criticalInvariants = invariants.filter((i) => i.level === "critical");
  const warningInvariants = invariants.filter((i) => i.level === "warning");
  // Unique contracts with at least one warning
  const contractsWithWarnings = new Set(
    warningInvariants.map((w) => w.contract_id),
  );

  // ── Multi-contract user analysis ───────────────────────────────────────────
  const contractsByUser: Record<string, ContractReconciliationV2[]> = {};
  for (const r of results) {
    if (!contractsByUser[r.user_id]) contractsByUser[r.user_id] = [];
    contractsByUser[r.user_id].push(r);
  }

  const multiContractAnalyses = [];
  for (const [userId, contracts] of Object.entries(contractsByUser)) {
    if (contracts.length > 1) {
      multiContractAnalyses.push(
        classifyMultiContractUser(userId, contracts),
      );
    }
  }

  const multiContractCounts: Record<string, number> = {};
  for (const a of multiContractAnalyses) {
    multiContractCounts[a.classification] =
      (multiContractCounts[a.classification] || 0) + 1;
  }

  // ── Paying population ──────────────────────────────────────────────────────
  const payingPopulation = computePayingPopulation(results);

  // ── Customer distribution ──────────────────────────────────────────────────
  const customerDistribution = {
    one_contract: 0,
    two_contracts: 0,
    three_contracts: 0,
    four_plus_contracts: 0,
  };
  for (const rs of Object.values(contractsByUser)) {
    if (rs.length === 1) customerDistribution.one_contract++;
    else if (rs.length === 2) customerDistribution.two_contracts++;
    else if (rs.length === 3) customerDistribution.three_contracts++;
    else customerDistribution.four_plus_contracts++;
  }

  // ── Arithmetic invariant checks ────────────────────────────────────────────
  const lifecycleSum = Object.values(lifecycleCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const productIdentitySum = Object.values(productIdentityCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const scopeSum = Object.values(scopeCounts).reduce((a, b) => a + b, 0);
  const payingSum = payingEligible + notEligible;

  // ── Canonical 86-row export table ───────────────────────────────────────────
  const table = results.map((r) => ({
    active_contract_id: r.contract_id,
    user_id: r.user_id,
    user_email: r.user_email,
    provider: r.provider,
    provider_customer_id: r.provider_customer_id,
    provider_subscription_id: r.provider_subscription_id,
    local_is_active: r.local_is_active,
    local_status: r.local_status,
    provider_status: r.provider_status,
    provider_cancel_at_period_end: r.provider_cancel_at_period_end,
    provider_canceled_at: r.provider_canceled_at,
    period_end: r.period_end,
    provider_period_end: r.provider_period_end,
    lifecycle_classification: r.lifecycle_classification,
    lifecycle_source: r.lifecycle_source,
    product_identity_classification: r.product_identity_classification,
    product_resolution_source: r.product_resolution_source,
    resolved_price_id: r.resolved_price_id,
    resolved_product_id: r.resolved_product_id,
    resolved_plan_key: r.resolved_plan_key,
    resolved_product: r.resolved_product,
    resolved_modules: r.resolved_modules,
    scope_category: classifyScopeCategory(r),
    confidence: r.confidence,
    current_paying_eligible: r.current_paying_eligible,
    anomaly_codes: r.anomaly_codes,
    recommended_action: r.recommended_action,
  }));

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = {
    audit_version: "active_contract_reconciliation_v2",
    total_active_looking_contracts: results.length,

    // A. Lifecycle categories (must sum to 86)
    lifecycle_categories: {
      PROVIDER_ACTIVE: lifecycleCounts["PROVIDER_ACTIVE"] || 0,
      PROVIDER_TRIALING: lifecycleCounts["PROVIDER_TRIALING"] || 0,
      PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE:
        lifecycleCounts["PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE"] || 0,
      PROVIDER_EXPIRED: lifecycleCounts["PROVIDER_EXPIRED"] || 0,
      PROVIDER_SUBSCRIPTION_MISSING:
        lifecycleCounts["PROVIDER_SUBSCRIPTION_MISSING"] || 0,
      PROVIDER_LOOKUP_FAILED: lifecycleCounts["PROVIDER_LOOKUP_FAILED"] || 0,
      APPLE_PROVISIONAL: lifecycleCounts["APPLE_PROVISIONAL"] || 0,
      NO_PROVIDER_REFERENCE: lifecycleCounts["NO_PROVIDER_REFERENCE"] || 0,
      MANUAL_REVIEW: lifecycleCounts["MANUAL_REVIEW"] || 0,
      sum: lifecycleSum,
      matches_total: lifecycleSum === results.length,
    },

    // B. Product identity categories (must sum to 86)
    product_identity_categories: {
      PROVIDER_RESOLVED: productIdentityCounts["PROVIDER_RESOLVED"] || 0,
      LEGACY_RESOLVED: productIdentityCounts["LEGACY_RESOLVED"] || 0,
      AMOUNT_INFERRED: productIdentityCounts["AMOUNT_INFERRED"] || 0,
      UNRESOLVED: productIdentityCounts["UNRESOLVED"] || 0,
      sum: productIdentitySum,
      matches_total: productIdentitySum === results.length,
    },

    // Product resolution source breakdown
    product_resolution_sources: resolutionSourceCounts,
    resolution_source_sum: Object.values(resolutionSourceCounts).reduce(
      (a, b) => a + b,
      0,
    ),

    // C. Scope categories (must sum to 86)
    scope_categories: {
      pipekeeper: scopeCounts.pipekeeper,
      whiskeykeeper: scopeCounts.whiskeykeeper,
      cigarkeeper: scopeCounts.cigarkeeper,
      winekeeper: scopeCounts.winekeeper,
      multi_module_bundle: scopeCounts.multi_module_bundle,
      unresolved: scopeCounts.unresolved,
      sum: scopeSum,
      matches_total: scopeSum === results.length,
    },

    // D. Paying population
    paying_population: payingPopulation,
    paying_eligibility: {
      current_paying_eligible: payingEligible,
      not_current_paying_eligible: notEligible,
      sum: payingSum,
      matches_total: payingSum === results.length,
    },

    // E. Multi-contract users
    multi_contract_users: {
      users_with_1_contract: customerDistribution.one_contract,
      users_with_2_contracts: customerDistribution.two_contracts,
      users_with_3_contracts: customerDistribution.three_contracts,
      users_with_4_plus_contracts: customerDistribution.four_plus_contracts,
      classifications: multiContractCounts,
      detail: multiContractAnalyses,
    },

    // Stripe query stats
    stripe_queries: {
      unique_subscription_ids: uniqueSubIds.size,
      attempted: stripeQueried,
      found: stripeFound,
      not_found: stripeNotFound,
      errors: stripeError,
      contracts_with_stripe_sub_id: results.filter(
        (r) => r.provider === "stripe" && r.provider_subscription_id,
      ).length,
      contracts_without_stripe_sub_id: results.filter(
        (r) => r.provider === "stripe" && !r.provider_subscription_id,
      ).length,
    },

    // Invariants
    invariants: {
      critical_count: criticalInvariants.length,
      warning_count: warningInvariants.length,
      contracts_with_at_least_one_warning: contractsWithWarnings.size,
      total_warning_findings: warningInvariants.length,
      critical: criticalInvariants,
      warning: warningInvariants,
    },

    repair_mode: repair,
    contracts_repaired: repair
      ? results.filter((r) => r.repair_needed).length
      : 0,
  };

  return Response.json({
    audit_version: "active_contract_reconciliation_v2",
    generated_at: new Date().toISOString(),
    repair_mode: repair,
    summary,
    table,
  });
}