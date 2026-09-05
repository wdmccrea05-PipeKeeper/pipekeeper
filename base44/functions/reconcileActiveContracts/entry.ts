/**
 * reconcileActiveContracts — Contract-level reconciliation
 *
 * Reconstructs the authoritative chain for EVERY active contract:
 *   Customer → Provider → Subscription → Price/Product → Plan → Module Scope
 *
 * For each active Stripe contract, queries the LIVE Stripe API to get the
 * authoritative subscription → item → price → product chain.
 *
 * Produces a per-contract reconciliation table (one row per ActiveContract)
 * with classification, resolved scope, and repair fields.
 *
 * Optionally repairs ActiveContract records in place when repair=true.
 *
 * Admin-only.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { getStripeClient } from "../../shared/getStripeClient.ts";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { buildPriceIdMap } from "../../shared/productScopeResolver.ts";
import {
  reconcileContract,
  classifyScopeCategory,
  checkReconciliationInvariants,
  type ContractReconciliationResult,
  type ProviderTruth,
} from "../../shared/contractReconciler.ts";

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);

  // ── Auth: admin-only ──────────────────────────────────────────────────────
  const me = await base44.auth.me();
  if (!me || me.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const repair = body.repair === true;
  const verify_stripe = body.verify_stripe !== false; // default true

  // ── Build price ID map from env vars ──────────────────────────────────────
  const priceIdEnv: Record<string, string | undefined> = {
    VITE_STRIPE_PIPEKEEPER_MONTHLY: Deno.env.get('VITE_STRIPE_PIPEKEEPER_MONTHLY'),
    VITE_STRIPE_PIPEKEEPER_ANNUAL: Deno.env.get('VITE_STRIPE_PIPEKEEPER_ANNUAL'),
    VITE_STRIPE_WHISKEYKEEPER_MONTHLY: Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY'),
    VITE_STRIPE_WHISKEYKEEPER_ANNUAL: Deno.env.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL'),
    VITE_STRIPE_CIGARKEEPER_MONTHLY: Deno.env.get('VITE_STRIPE_CIGARKEEPER_MONTHLY'),
    VITE_STRIPE_CIGARKEEPER_ANNUAL: Deno.env.get('VITE_STRIPE_CIGARKEEPER_ANNUAL'),
    VITE_STRIPE_WINEKEEPER_MONTHLY: Deno.env.get('VITE_STRIPE_WINEKEEPER_MONTHLY'),
    VITE_STRIPE_WINEKEEPER_ANNUAL: Deno.env.get('VITE_STRIPE_WINEKEEPER_ANNUAL'),
    VITE_STRIPE_FOUNDERS_MONTHLY: Deno.env.get('VITE_STRIPE_FOUNDERS_MONTHLY'),
    VITE_STRIPE_FOUNDERS_ANNUAL: Deno.env.get('VITE_STRIPE_FOUNDERS_ANNUAL'),
    VITE_STRIPE_THREE_BUNDLE_MONTHLY: Deno.env.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY'),
    VITE_STRIPE_THREE_BUNDLE_ANNUAL: Deno.env.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL'),
    VITE_STRIPE_FOUR_BUNDLE_MONTHLY: Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY'),
    VITE_STRIPE_FOUR_BUNDLE_ANNUAL: Deno.env.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL'),
  };
  const price_id_map = buildPriceIdMap(priceIdEnv);

  // ── Fetch ALL ActiveContract records ──────────────────────────────────────
  console.log('[reconcileActiveContracts] Fetching all ActiveContract records...');
  const allContracts = await fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {});
  // A contract is "active" if is_active=true OR status is active/trialing
  // (is_active was not always set during historical migration)
  const activeContracts = allContracts.filter(c =>
    c.is_active === true ||
    c.status === 'active' ||
    c.status === 'trialing'
  );
  console.log(`[reconcileActiveContracts] Total contracts: ${allContracts.length}, active: ${activeContracts.length}`);

  // ── Fetch ALL legacy Subscription records ──────────────────────────────────
  console.log('[reconcileActiveContracts] Fetching legacy Subscription records...');
  const allSubscriptions = await fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {});
  console.log(`[reconcileActiveContracts] Legacy subscriptions: ${allSubscriptions.length}`);

  // Build lookup maps
  const subByProviderSubId: Record<string, any> = {};
  const subByInternalId: Record<string, any> = {};
  for (const s of allSubscriptions) {
    if (s.provider_subscription_id) subByProviderSubId[s.provider_subscription_id] = s;
    if (s.stripe_subscription_id) subByProviderSubId[s.stripe_subscription_id] = s;
    subByInternalId[s.id] = s;
  }

  // ── Get Stripe client (if verifying) ──────────────────────────────────────
  let stripe: any = null;
  if (verify_stripe) {
    try {
      const { stripe: s } = await getStripeClient(req);
      stripe = s;
      console.log('[reconcileActiveContracts] Stripe client initialized');
    } catch (e) {
      console.log(`[reconcileActiveContracts] Stripe client init failed: ${e.message}`);
    }
  }

  // ── Reconcile each contract ───────────────────────────────────────────────
  const results: ContractReconciliationResult[] = [];
  let stripeChecked = 0;
  let stripeRecovered = 0;
  let stripeMatched = 0;
  let stripeMismatch = 0;
  let stripeMissing = 0;
  let stripeLookupFailed = 0;
  let staleNotActive = 0;

  for (const contract of activeContracts) {
    const legacy_sub =
      (contract.provider_subscription_id && subByProviderSubId[contract.provider_subscription_id]) ||
      (contract.source_subscription_id && subByInternalId[contract.source_subscription_id]) ||
      null;

    let provider_truth: ProviderTruth | null = null;

    // Query Stripe live for active Stripe contracts
    if (verify_stripe && stripe && contract.provider === 'stripe' && contract.provider_subscription_id) {
      try {
        stripeChecked++;
        const sub = await stripe.subscriptions.retrieve(
          contract.provider_subscription_id,
          { expand: ['items.data.price.product'] }
        );
        provider_truth = { stripe_subscription: sub };
      } catch (e: any) {
        if (e.code === 'resource_missing' || e.statusCode === 404 || String(e.message).includes('No such')) {
          provider_truth = { stripe_not_found: true };
          stripeMissing++;
        } else {
          provider_truth = { stripe_lookup_error: e.message };
          stripeLookupFailed++;
        }
      }
    }

    const result = reconcileContract({
      contract,
      legacy_subscription: legacy_sub,
      provider_truth,
      price_id_map,
    });
    results.push(result);

    // Count Stripe outcomes
    if (result.classification === 'PROVIDER_RECOVERED') stripeRecovered++;
    if (result.classification === 'PROVIDER_MATCHED') stripeMatched++;
    if (result.classification === 'PROVIDER_MISMATCH') stripeMismatch++;
    if (result.classification === 'STALE_NOT_ACTIVE') staleNotActive++;

    // Repair if needed
    if (repair && result.repair_needed && result.repair_fields) {
      try {
        const updateData = { ...result.repair_fields };
        updateData.reconciliation_status = result.classification.toLowerCase();
        updateData.provider_verified_at = new Date().toISOString();
        updateData.normalized_at = new Date().toISOString();
        await base44.entities.ActiveContract.update(contract.id, updateData);
      } catch (e) {
        console.log(`[reconcileActiveContracts] Repair failed for ${contract.id}: ${e.message}`);
      }
    }
  }

  // ── Scope category distribution ───────────────────────────────────────────
  const scopeCounts: Record<string, number> = {
    pipekeeper: 0,
    cigarkeeper: 0,
    whiskeykeeper: 0,
    winekeeper: 0,
    multi_module_bundle: 0,
    unresolved: 0,
  };
  for (const r of results) {
    const cat = classifyScopeCategory(r);
    scopeCounts[cat] = (scopeCounts[cat] || 0) + 1;
  }

  // ── Unique customer distribution ──────────────────────────────────────────
  const contractsByUser: Record<string, ContractReconciliationResult[]> = {};
  for (const r of results) {
    if (!contractsByUser[r.user_id]) contractsByUser[r.user_id] = [];
    contractsByUser[r.user_id].push(r);
  }
  const uniqueCustomers = Object.keys(contractsByUser).length;
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

  // ── Classification summary ─────────────────────────────────────────────────
  const classificationCounts: Record<string, number> = {};
  for (const r of results) {
    classificationCounts[r.classification] = (classificationCounts[r.classification] || 0) + 1;
  }

  // ── Invariants ────────────────────────────────────────────────────────────
  const invariants = checkReconciliationInvariants(results);
  const criticalInvariants = invariants.filter(i => i.level === 'critical');
  const warningInvariants = invariants.filter(i => i.level === 'warning');

  // ── Scope arithmetic check ────────────────────────────────────────────────
  const scopeSum = Object.values(scopeCounts).reduce((a, b) => a + b, 0);
  const scopeArithmeticValid = scopeSum === results.length;

  // ── Build the full 55-row table ───────────────────────────────────────────
  const table = results.map(r => ({
    contract_id: r.contract_id,
    user_id: r.user_id,
    user_email: r.user_email,
    provider: r.provider,
    provider_customer_id: r.provider_customer_id,
    provider_subscription_id: r.provider_subscription_id,
    internal_subscription_id: r.internal_subscription_id,
    resolved_price_id: r.resolved_price_id,
    resolved_product_id: r.resolved_product_id,
    resolved_plan_key: r.resolved_plan_key,
    local_product: r.local_product,
    resolved_product: r.resolved_product,
    resolved_modules: r.resolved_modules,
    billing_interval: r.billing_interval,
    amount_cents: r.amount_cents,
    period_start: r.period_start,
    period_end: r.period_end,
    provider_status: r.provider_status,
    provider_period_end: r.provider_period_end,
    classification: r.classification,
    resolution_source: r.resolution_source,
    confidence: r.confidence,
    local_matches_provider: r.local_matches_provider,
    scope_category: classifyScopeCategory(r),
    issues: r.issues,
    repair_needed: r.repair_needed,
  }));

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = {
    total_active_contracts: results.length,
    scope_arithmetic: {
      pipekeeper: scopeCounts.pipekeeper,
      cigarkeeper: scopeCounts.cigarkeeper,
      whiskeykeeper: scopeCounts.whiskeykeeper,
      winekeeper: scopeCounts.winekeeper,
      multi_module_bundle: scopeCounts.multi_module_bundle,
      unresolved: scopeCounts.unresolved,
      sum: scopeSum,
      matches_total: scopeArithmeticValid,
    },
    classifications: classificationCounts,
    stripe: {
      contracts_checked: stripeChecked,
      product_recovered: stripeRecovered,
      already_correct: stripeMatched,
      mismatches: stripeMismatch,
      subscription_missing: stripeMissing,
      lookup_failures: stripeLookupFailed,
    },
    apple: {
      active_contracts: results.filter(r => r.provider === 'apple').length,
      product_identified: results.filter(r => r.provider === 'apple' && r.classification === 'PROVIDER_MATCHED').length,
      provisional_unresolved: results.filter(r => r.provider === 'apple' && r.classification === 'PROVISIONAL_APPLE').length,
      verification_blocker: 'Apple App Store Server API credentials not configured',
    },
    customers: {
      unique_current_paying: uniqueCustomers,
      one_contract: customerDistribution.one_contract,
      two_contracts: customerDistribution.two_contracts,
      three_contracts: customerDistribution.three_contracts,
      four_plus_contracts: customerDistribution.four_plus_contracts,
    },
    stale_contracts: staleNotActive,
    invariants: {
      critical_count: criticalInvariants.length,
      warning_count: warningInvariants.length,
      critical: criticalInvariants,
      warning: warningInvariants,
    },
    repair_mode: repair,
    contracts_repaired: repair ? results.filter(r => r.repair_needed).length : 0,
  };

  return Response.json({
    audit_version: 'active_contract_reconciliation_v1',
    generated_at: new Date().toISOString(),
    repair_mode: repair,
    summary,
    table,
  });
}