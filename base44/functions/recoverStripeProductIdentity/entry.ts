/**
 * recoverStripeProductIdentity — Authoritative Stripe Product Identity Recovery
 *
 * For every provider-current Stripe contract, retrieves the FULL provider chain:
 *   Stripe Subscription → Subscription Item → Price → Product
 *                      → CollectionKeeper Plan → Module Scope
 *
 * Resolution uses the new stripeProductResolver which checks:
 *   1. Stripe Product metadata (plan_key, modules)
 *   2. Stripe Price metadata (plan_key, modules)
 *   3. Stripe Product name (keyword matching)
 *   4. Stripe Price nickname (keyword matching)
 *   5. Persisted StripeProductRegistry (by price_id, then product_id)
 *   6. Current env-var price_id_map
 *   7. Legacy local fields (LEGACY_RESOLVED)
 *   8. Amount + interval (AMOUNT_INFERRED, last resort, confidence=low)
 *
 * Persists new mappings to StripeProductRegistry.
 * If repair=true, updates ActiveContract with resolved_price_id, resolved_product_id,
 * resolved_plan_key, product_source, provider_verified_at.
 *
 * Does NOT create, revoke, or broaden entitlements.
 * Does NOT alter lifecycle classification.
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
  computePayingPopulation,
} from "../../shared/billingLifecycleReconciler.ts";
import {
  resolveProductIdentityFromStripeChain,
  detectProviderMismatch,
  classifyUserPopulation,
  extractStripeChainData,
  buildRegistryEntryFromStripe,
} from "../../shared/stripeProductResolver.ts";

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);

  // ── Auth: admin-only ──────────────────────────────────────────────────────
  const me = await base44.auth.me();
  if (!me || me.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const repair = body.repair === true;
  const verify_stripe = body.verify_stripe !== false;

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
  console.log("[recoverStripeProductIdentity] Fetching ActiveContract records...");
  const allContracts = await fetchAllEntitiesServer(
    base44.asServiceRole.entities.ActiveContract,
    {},
  );
  const activeContracts = allContracts.filter(
    (c) => c.is_active === true || c.status === "active" || c.status === "trialing",
  );
  console.log(
    `[recoverStripeProductIdentity] Total: ${allContracts.length}, active-looking: ${activeContracts.length}`,
  );

  // ── Fetch ALL legacy Subscription records ──────────────────────────────────
  console.log("[recoverStripeProductIdentity] Fetching legacy Subscription records...");
  const allSubscriptions = await fetchAllEntitiesServer(
    base44.asServiceRole.entities.Subscription,
    {},
  );
  const subByProviderSubId: Record<string, any> = {};
  const subByInternalId: Record<string, any> = {};
  for (const s of allSubscriptions) {
    if (s.provider_subscription_id) subByProviderSubId[s.provider_subscription_id] = s;
    if (s.stripe_subscription_id) subByProviderSubId[s.stripe_subscription_id] = s;
    subByInternalId[s.id] = s;
  }

  // ── Fetch persisted StripeProductRegistry ─────────────────────────────────
  console.log("[recoverStripeProductIdentity] Fetching StripeProductRegistry...");
  let registry: any[] = [];
  try {
    registry = await fetchAllEntitiesServer(
      base44.asServiceRole.entities.StripeProductRegistry,
      {},
    );
    console.log(`[recoverStripeProductIdentity] Registry entries: ${registry.length}`);
  } catch (e: any) {
    console.log(`[recoverStripeProductIdentity] Registry fetch failed: ${e.message}`);
  }

  // ── Get Stripe client ─────────────────────────────────────────────────────
  let stripe: any = null;
  if (verify_stripe) {
    try {
      const { stripe: s } = await getStripeClient(req);
      stripe = s;
      console.log("[recoverStripeProductIdentity] Stripe client initialized");
    } catch (e: any) {
      console.log(`[recoverStripeProductIdentity] Stripe init failed: ${e.message}`);
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
    `[recoverStripeProductIdentity] Unique Stripe sub IDs to query: ${uniqueSubIds.size}`,
  );

  let stripeQueried = 0, stripeFound = 0, stripeNotFound = 0, stripeError = 0;

  if (verify_stripe && stripe) {
    for (const subId of uniqueSubIds) {
      try {
        stripeQueried++;
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price.product", "items.data.price"],
        });
        stripeTruthCache[subId] = { stripe_subscription: sub };
        stripeFound++;
      } catch (e: any) {
        if (e.code === "resource_missing" || e.statusCode === 404 || String(e.message).includes("No such")) {
          stripeTruthCache[subId] = { stripe_not_found: true };
          stripeNotFound++;
        } else {
          stripeTruthCache[subId] = { stripe_lookup_error: e.message };
          stripeError++;
        }
      }
    }
    console.log(
      `[recoverStripeProductIdentity] Stripe: ${stripeQueried} queried, ${stripeFound} found, ${stripeNotFound} not found, ${stripeError} errors`,
    );
  }

  // ── Recover product identity for each contract ────────────────────────────
  const results: any[] = [];
  const registryEntriesToPersist: any[] = [];
  const mismatchDetected: any[] = [];

  for (const contract of activeContracts) {
    const legacy_sub =
      (contract.provider_subscription_id && subByProviderSubId[contract.provider_subscription_id]) ||
      (contract.source_subscription_id && subByInternalId[contract.source_subscription_id]) ||
      null;

    let provider_truth = null;
    if (contract.provider === "stripe" && contract.provider_subscription_id) {
      provider_truth = stripeTruthCache[contract.provider_subscription_id] || null;
    }

    // Run lifecycle classification (from v2 reconciler — unchanged)
    const lifecycleResult = reconcileContractV2({
      contract,
      legacy_subscription: legacy_sub,
      provider_truth,
      price_id_map,
    });

    // Run NEW product identity resolver (full provider chain)
    const productResult = resolveProductIdentityFromStripeChain({
      contract,
      legacy_subscription: legacy_sub,
      provider_truth,
      price_id_map,
      registry,
    });

    // Detect mismatch
    const mismatch = detectProviderMismatch(contract, productResult);

    // Collect registry entries to persist
    if (productResult.registry_entry_to_persist) {
      const entry = productResult.registry_entry_to_persist;
      // Check if we already have this price_id in registry
      const existing = registry.find(
        (r) => r.provider === 'stripe' && r.price_id === entry.price_id,
      );
      if (!existing) {
        registryEntriesToPersist.push(entry);
        // Add to in-memory registry so subsequent contracts can use it
        registry.push(entry);
      }
    }

    if (mismatch.mismatch) {
      mismatchDetected.push({
        contract_id: contract.id,
        user_email: contract.user_email,
        detail: mismatch.detail,
        provider_product: productResult.resolved_product,
        local_product: (contract.product || 'unknown').toLowerCase(),
      });
    }

    results.push({
      contract_id: contract.id,
      user_id: contract.user_id,
      user_email: contract.user_email,
      provider: contract.provider,
      provider_subscription_id: contract.provider_subscription_id,
      lifecycle_classification: lifecycleResult.lifecycle_classification,
      current_paying_eligible: lifecycleResult.current_paying_eligible,
      old_product_identity: lifecycleResult.product_identity_classification,
      old_resolution_source: lifecycleResult.product_resolution_source,
      new_product_identity: productResult.classification,
      new_resolution_source: productResult.resolution_source,
      resolved_product: productResult.resolved_product,
      resolved_modules: productResult.resolved_modules,
      resolved_price_id: productResult.resolved_price_id,
      resolved_product_id: productResult.resolved_product_id,
      resolved_plan_key: productResult.resolved_plan_key,
      confidence: productResult.confidence,
      provider_chain_attempted: productResult.provider_chain_attempted,
      provider_chain_resolved: productResult.provider_chain_resolved,
      mismatch_detected: mismatch.mismatch,
      mismatch_detail: mismatch.detail,
      scope_category: classifyScopeCategory({
        resolved_modules: productResult.resolved_modules,
        resolved_product: productResult.resolved_product,
      } as any),
      repair_fields: repair && productResult.classification === 'PROVIDER_RESOLVED'
        ? {
            resolved_price_id: productResult.resolved_price_id,
            resolved_product_id: productResult.resolved_product_id,
            resolved_plan_key: productResult.resolved_plan_key,
            product_source: productResult.resolution_source,
            provider_verified_at: new Date().toISOString(),
            normalized_at: new Date().toISOString(),
          }
        : null,
    });

    // Apply repair
    if (repair && productResult.classification === 'PROVIDER_RESOLVED') {
      try {
        await base44.entities.ActiveContract.update(contract.id, {
          resolved_price_id: productResult.resolved_price_id,
          resolved_product_id: productResult.resolved_product_id,
          resolved_plan_key: productResult.resolved_plan_key,
          product_source: productResult.resolution_source,
          provider_verified_at: new Date().toISOString(),
          normalized_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.log(`[recoverStripeProductIdentity] Repair failed for ${contract.id}: ${e.message}`);
      }
    }
  }

  // ── Persist new registry entries ──────────────────────────────────────────
  if (registryEntriesToPersist.length > 0) {
    console.log(
      `[recoverStripeProductIdentity] Persisting ${registryEntriesToPersist.length} new registry entries...`,
    );
    try {
      await base44.asServiceRole.entities.StripeProductRegistry.bulkCreate(
        registryEntriesToPersist,
      );
    } catch (e: any) {
      console.log(`[recoverStripeProductIdentity] Registry persist failed: ${e.message}`);
    }
  }

  // ── Build reports ─────────────────────────────────────────────────────────

  // 1. Cross-tab for 72 eligible contracts (current paying eligible)
  const eligibleResults = results.filter((r) => r.current_paying_eligible);
  const crosstab = buildCrosstab(eligibleResults);

  // 2. Provider-current product quality report (64 provider-current Stripe contracts)
  const providerCurrentStripe = results.filter(
    (r) =>
      r.provider === 'stripe' &&
      ['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'].includes(
        r.lifecycle_classification,
      ),
  );
  const providerCurrentQuality = buildProductQualityReport(providerCurrentStripe);

  // 3. Amount inference improvement
  const amountInferenceImprovement = {
    amount_inferred_before_all_86: results.filter(
      (r) => r.old_product_identity === 'AMOUNT_INFERRED',
    ).length,
    amount_inferred_before_provider_current: providerCurrentStripe.filter(
      (r) => r.old_product_identity === 'AMOUNT_INFERRED',
    ).length,
    recovered_from_stripe_price_product: providerCurrentStripe.filter(
      (r) =>
        r.old_product_identity === 'AMOUNT_INFERRED' &&
        r.new_product_identity === 'PROVIDER_RESOLVED',
    ).length,
    remaining_amount_inferred: providerCurrentStripe.filter(
      (r) => r.new_product_identity === 'AMOUNT_INFERRED',
    ).length,
    remaining_amount_inferred_all_86: results.filter(
      (r) => r.new_product_identity === 'AMOUNT_INFERRED',
    ).length,
  };

  // 4. Canonical Stripe product registry table
  const registryTable = buildRegistryTable(results, registry);

  // 5. Unresolved contracts breakdown
  const unresolvedBreakdown = buildUnresolvedBreakdown(results);

  // 6. User population reconciliation (mutually exclusive categories)
  const contractsByUser: Record<string, any[]> = {};
  for (const r of results) {
    if (!contractsByUser[r.user_id]) contractsByUser[r.user_id] = [];
    contractsByUser[r.user_id].push(r);
  }
  const userPopulationResults = [];
  for (const [userId, contracts] of Object.entries(contractsByUser)) {
    userPopulationResults.push(
      classifyUserPopulation(
        userId,
        contracts.map((c) => ({
          lifecycle_classification: c.lifecycle_classification,
          provider: c.provider,
        })),
      ),
    );
  }
  const userPopulationCounts: Record<string, number> = {};
  for (const u of userPopulationResults) {
    userPopulationCounts[u.category] = (userPopulationCounts[u.category] || 0) + 1;
  }
  const userPopulationSum = Object.values(userPopulationCounts).reduce((a, b) => a + b, 0);

  // 7. Paying population (from lifecycle — unchanged)
  const payingPopulation = computePayingPopulation(
    results.map((r) => ({
      ...r,
      contract_id: r.contract_id,
      user_id: r.user_id,
      lifecycle_classification: r.lifecycle_classification,
      local_is_active: true,
      provider_status: null,
      period_end: null,
      period_start: null,
      provider_period_end: null,
    } as any)),
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  const summary = {
    audit_version: "stripe_product_identity_recovery_v1",
    total_active_looking_contracts: results.length,
    total_eligible_contracts: eligibleResults.length,
    provider_current_stripe_contracts: providerCurrentStripe.length,

    // 1. Cross-tab for eligible contracts
    eligible_crosstab: crosstab,

    // 2. Provider-current product quality
    provider_current_product_quality: providerCurrentQuality,

    // 3. Amount inference improvement
    amount_inference_improvement: amountInferenceImprovement,

    // 4. Stripe product registry
    stripe_product_registry: {
      unique_price_ids_found: registryTable.unique_price_ids,
      unique_product_ids_found: registryTable.unique_product_ids,
      mappings_established: registryEntriesToPersist.length,
      unresolved_price_ids: registryTable.unresolved_price_ids,
      registry_table: registryTable.table,
    },

    // 5. Unresolved contracts breakdown
    unresolved_breakdown: unresolvedBreakdown,

    // 6. User population reconciliation
    user_population: {
      categories: userPopulationCounts,
      sum: userPopulationSum,
      matches_total: userPopulationSum === Object.keys(contractsByUser).length,
      previous_discrepancy_explanation: {
        total_locally_active_looking_users: Object.keys(contractsByUser).length,
        recognized_current_paying: payingPopulation.recognized_current_paying,
        difference: Object.keys(contractsByUser).length - payingPopulation.recognized_current_paying,
        users_with_provider_missing: payingPopulation.users_with_provider_missing,
        users_with_only_expired: payingPopulation.users_with_only_expired,
        sum_of_missing_and_expired: payingPopulation.users_with_provider_missing + payingPopulation.users_with_only_expired,
        explanation:
          "The 6+5=11 vs 9 discrepancy is because some users have BOTH missing AND expired contracts (overlap). " +
          "The mutually exclusive categories resolve this: MIXED_CURRENT_AND_STALE users have both current and stale, " +
          "while STALE_PROVIDER_MISSING_ONLY and EXPIRED_ONLY are pure categories.",
      },
    },

    // 7. Paying population (lifecycle — unchanged)
    paying_population: payingPopulation,

    // Mismatches
    provider_product_mismatches: mismatchDetected,

    // Stripe query stats
    stripe_queries: {
      unique_subscription_ids: uniqueSubIds.size,
      attempted: stripeQueried,
      found: stripeFound,
      not_found: stripeNotFound,
      errors: stripeError,
    },

    repair_mode: repair,
    contracts_repaired: repair
      ? results.filter((r) => r.new_product_identity === 'PROVIDER_RESOLVED').length
      : 0,
  };

  return Response.json({
    audit_version: "stripe_product_identity_recovery_v1",
    generated_at: new Date().toISOString(),
    repair_mode: repair,
    summary,
    table: results,
  });
}

// ── Report builders ─────────────────────────────────────────────────────────

function buildCrosstab(eligibleResults: any[]) {
  const lifecycles = ['PROVIDER_ACTIVE', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE', 'APPLE_PROVISIONAL'];
  const products = ['PROVIDER_RESOLVED', 'LEGACY_RESOLVED', 'AMOUNT_INFERRED', 'UNRESOLVED'];

  const crosstab: any = {};
  let total = 0;

  for (const lc of lifecycles) {
    crosstab[lc] = {};
    for (const pi of products) {
      const count = eligibleResults.filter(
        (r) => r.lifecycle_classification === lc && r.new_product_identity === pi,
      ).length;
      crosstab[lc][pi] = count;
    }
    crosstab[lc].Total = eligibleResults.filter(
      (r) => r.lifecycle_classification === lc,
    ).length;
    total += crosstab[lc].Total;
  }

  crosstab.Total = {};
  for (const pi of products) {
    crosstab.Total[pi] = eligibleResults.filter(
      (r) => r.new_product_identity === pi,
    ).length;
  }
  crosstab.Total.Total = total;

  return crosstab;
}

function buildProductQualityReport(providerCurrent: any[]) {
  const counts: Record<string, number> = {
    PROVIDER_RESOLVED: 0,
    LEGACY_RESOLVED: 0,
    AMOUNT_INFERRED: 0,
    UNRESOLVED: 0,
  };
  for (const r of providerCurrent) {
    counts[r.new_product_identity] = (counts[r.new_product_identity] || 0) + 1;
  }
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    ...counts,
    sum,
    matches_total: sum === providerCurrent.length,
  };
}

function buildRegistryTable(results: any[], registry: any[]) {
  const priceMap: Record<string, any> = {};

  for (const r of results) {
    if (r.resolved_price_id && r.provider === 'stripe') {
      if (!priceMap[r.resolved_price_id]) {
        priceMap[r.resolved_price_id] = {
          price_id: r.resolved_price_id,
          product_id: r.resolved_product_id,
          product_name: null,
          price_amount: null,
          interval: null,
          active_archived: null,
          canonical_plan: r.resolved_plan_key,
          canonical_module_scope: r.resolved_modules,
          current_contracts: 0,
          historical_contracts: 0,
          resolution_confidence: r.confidence,
          mapping_source: r.new_resolution_source,
        };
      }
      if (r.current_paying_eligible) {
        priceMap[r.resolved_price_id].current_contracts++;
      } else {
        priceMap[r.resolved_price_id].historical_contracts++;
      }
    }
  }

  // Enrich from registry entries
  for (const entry of registry) {
    if (entry.price_id && !priceMap[entry.price_id] && entry.canonical_plan_key) {
      priceMap[entry.price_id] = {
        price_id: entry.price_id,
        product_id: entry.product_id,
        product_name: entry.product_name,
        price_amount: entry.amount_cents,
        interval: entry.billing_interval,
        active_archived: entry.stripe_price_active ? 'active' : 'archived',
        canonical_plan: entry.canonical_plan_key,
        canonical_module_scope: entry.canonical_modules,
        current_contracts: 0,
        historical_contracts: 0,
        resolution_confidence: entry.confidence,
        mapping_source: entry.mapping_source,
      };
    }
    if (entry.price_id && priceMap[entry.price_id]) {
      priceMap[entry.price_id].product_name = priceMap[entry.price_id].product_name || entry.product_name;
      priceMap[entry.price_id].product_id = priceMap[entry.price_id].product_id || entry.product_id;
    }
  }

  const table = Object.values(priceMap);
  const uniquePriceIds = new Set(table.map((t: any) => t.price_id));
  const uniqueProductIds = new Set(table.map((t: any) => t.product_id).filter(Boolean));
  const unresolvedPriceIds = table.filter((t: any) => !t.canonical_plan).length;

  return {
    table,
    unique_price_ids: uniquePriceIds.size,
    unique_product_ids: uniqueProductIds.size,
    unresolved_price_ids: unresolvedPriceIds,
  };
}

function buildUnresolvedBreakdown(results: any[]) {
  const unresolved = results.filter((r) => r.new_product_identity === 'UNRESOLVED');
  const apple = unresolved.filter((r) => r.provider === 'apple').length;
  const stripeProviderCurrent = unresolved.filter(
    (r) =>
      r.provider === 'stripe' &&
      ['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'].includes(
        r.lifecycle_classification,
      ),
  ).length;
  const stripeStale = unresolved.filter(
    (r) =>
      r.provider === 'stripe' &&
      !['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'].includes(
        r.lifecycle_classification,
      ),
  ).length;

  return {
    apple,
    stripe_provider_current: stripeProviderCurrent,
    stripe_stale_historical: stripeStale,
    total: unresolved.length,
  };
}