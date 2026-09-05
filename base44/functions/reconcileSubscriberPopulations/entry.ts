/**
 * Reconcile Subscriber Populations — Canonical v3
 *
 * THE single canonical counting service for subscriber populations.
 * All dashboards, audits, and health checks must derive counts from this.
 *
 * v3 corrections (replaces v2):
 * - Queries LIVE Stripe API for every unique subscription ID (with expand for product)
 * - Uses resolveProductIdentityFromStripeChain (registry-first by Product ID) for product identity
 * - Uses reconcileContractV2 for lifecycle classification (PROVIDER_ACTIVE/TRIALING/CANCELED_BUT_ENTITLED)
 * - Only counts contracts with provider-current lifecycle as current paying
 * - Does NOT count stale local contracts (status=active but provider says canceled/expired)
 * - Uses StripeProductRegistry for canonical Product ID → plan → module mapping
 * - Reports unique current paying users per module (deduplicated by user)
 * - Includes contract → product → user proof table for drill-down
 * - READ-ONLY: does not mutate any records
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { buildPriceIdMap } from "../../shared/productScopeResolver.ts";
import { resolveProductIdentityFromStripeChain } from "../../shared/stripeProductResolver.ts";
import { reconcileContractV2 } from "../../shared/billingLifecycleReconciler.ts";
import { getStripeClient } from "../../shared/getStripeClient.ts";
import { normEmail, isActiveStatus, isExpired } from "../../shared/subscriptionHelpers.ts";

const ACTIVE_LIFECYCLES = ["PROVIDER_ACTIVE", "PROVIDER_TRIALING", "PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log("[reconcileSubscriberPopulations] Starting v3 canonical reconciliation...");

    // ── 1. Fetch all relevant entities + StripeProductRegistry ────────────────
    const [allUsers, allSubs, allContracts, allEntitlements, allEvents, registry] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.User, {}, "-created_date", 5000, 200, "User"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 200, "Subscription"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {}, "-created_date", 5000, 200, "ActiveContract"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.UserEntitlement, {}, "-created_date", 5000, 200, "UserEntitlement"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.SubscriptionEvent, {}, "-created_date", 5000, 200, "SubscriptionEvent"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.StripeProductRegistry, {}, "-created_date", 5000, 200, "StripeProductRegistry"),
    ]);

    const priceIdMap = buildPriceIdMap({
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
    });

    // ── 2. Query LIVE Stripe for all unique subscription IDs ─────────────────
    const stripeSubIds = new Set<string>();
    for (const c of allContracts) {
      if (String(c.provider || "").toLowerCase() === "stripe" && c.provider_subscription_id) {
        stripeSubIds.add(c.provider_subscription_id);
      }
    }

    const stripeVerification: Record<string, any> = {};
    const stripeSubData: Record<string, any> = {};
    let stripeAvailable = false;

    try {
      const { stripe } = await getStripeClient(base44.req);
      stripeAvailable = true;
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
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
            cancel_at_period_end: sub.cancel_at_period_end,
            price_id: sub.items?.data?.[0]?.price?.id,
            product_id: productId,
            product_name: typeof productRef === "object" ? productRef?.name : undefined,
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
      console.warn(`[reconcileSubscriberPopulations] Stripe client unavailable: ${stripeErr?.message}`);
    }

    // ── 3. Build lookup maps ──────────────────────────────────────────────────
    const subsByEmail = new Map<string, any[]>();
    for (const s of allSubs) {
      const email = normEmail(s.user_email);
      if (email) {
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email)!.push(s);
      }
    }

    // ── 4. HISTORICAL POPULATION ─────────────────────────────────────────────
    const historicalKeys = new Set<string>();
    for (const s of allSubs) { const k = s.user_id || s.user_email; if (k) historicalKeys.add(String(k)); }
    for (const c of allContracts) { const k = c.user_id || c.user_email; if (k) historicalKeys.add(String(k)); }
    for (const e of allEvents) { const k = e.user_id || e.user_email || e.normalized_email; if (k) historicalKeys.add(String(k)); }

    // ── 5. CANONICAL CURRENT PAYING — with live Stripe + registry ────────────
    const verifiedPayingKeys = new Set<string>();    // Stripe (provider-verified)
    const provisionalPayingKeys = new Set<string>();  // Apple (pending verification)
    const allCurrentPayingKeys = new Set<string>();   // union
    const currentPayingByModule: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(), bundle: new Set(),
    };
    const unresolvedScopeUsers = new Set<string>();
    const proofTable: any[] = [];
    let contractsTotal = 0, contractsCurrent = 0, contractsResolved = 0, contractsUnresolved = 0;
    const staleLocalContracts: any[] = [];

    for (const c of allContracts) {
      contractsTotal++;
      const key = String(c.user_id || c.user_email || "");
      const subId = c.provider_subscription_id || "";
      const email = normEmail(c.user_email);
      const matchingSubs = subsByEmail.get(email) || [];
      const bestSub = matchingSubs[0];

      // Build provider truth from live Stripe
      const providerTruth = {
        stripe_subscription: stripeSubData[subId] || null,
        stripe_lookup_error: null,
        stripe_not_found: stripeVerification[subId]?.exists === false,
      };

      // Resolve product identity (registry-first by Product ID)
      const resolverResult = resolveProductIdentityFromStripeChain({
        contract: c,
        legacy_subscription: bestSub,
        provider_truth: providerTruth,
        price_id_map: priceIdMap,
        registry,
      });

      // Classify lifecycle using v2 reconciler
      let lifecycleClassification = "MANUAL_REVIEW";
      try {
        const lifecycleResult: any = reconcileContractV2({
          contract: c,
          legacy_subscription: bestSub,
          provider_truth: providerTruth,
          price_id_map: priceIdMap,
        });
        lifecycleClassification = lifecycleResult.lifecycle_classification || "MANUAL_REVIEW";
      } catch (e) {
        // Keep MANUAL_REVIEW
      }

      const isCurrent = ACTIVE_LIFECYCLES.includes(lifecycleClassification);
      const provider = String(c.provider || "unknown").toLowerCase();

      // Build proof table row
      const proofRow = {
        contract_id: c.id,
        user_id: c.user_id,
        user_email: c.user_email,
        provider,
        stripe_subscription_id: subId || undefined,
        stripe_price_id: resolverResult.resolved_price_id || stripeVerification[subId]?.price_id || undefined,
        stripe_product_id: resolverResult.resolved_product_id || stripeVerification[subId]?.product_id || undefined,
        stripe_product_name: stripeVerification[subId]?.product_name || undefined,
        registry_mapped: resolverResult.classification === "PROVIDER_RESOLVED" && resolverResult.resolution_source?.includes("registry"),
        canonical_plan: resolverResult.resolved_plan_key || undefined,
        canonical_modules: resolverResult.resolved_modules || [],
        product_identity_classification: resolverResult.classification,
        resolution_source: resolverResult.resolution_source,
        lifecycle_classification: lifecycleClassification,
        is_current: isCurrent,
        stripe_status: stripeVerification[subId]?.status,
        period_end: c.period_end,
      };
      proofTable.push(proofRow);

      // Track stale local contracts (active locally but not current at provider)
      if (isActiveStatus(c.status) && !isExpired(c.period_end) && !isCurrent) {
        staleLocalContracts.push({
          contract_id: c.id,
          user_id: c.user_id,
          email: c.user_email,
          provider,
          local_status: c.status,
          provider_status: stripeVerification[subId]?.status || "unknown",
          lifecycle_classification: lifecycleClassification,
          period_end: c.period_end,
        });
      }

      if (!isCurrent) continue;
      contractsCurrent++;

      if (!key) continue;
      allCurrentPayingKeys.add(key);

      // Provider classification
      if (provider === "stripe") {
        verifiedPayingKeys.add(key);
      } else if (provider === "apple") {
        provisionalPayingKeys.add(key);
      } else if (provider === "manual") {
        verifiedPayingKeys.add(key);
      } else {
        provisionalPayingKeys.add(key);
      }

      // Module breakdown from canonical resolved modules
      const modules = resolverResult.resolved_modules || [];
      if (modules.length === 0 || resolverResult.classification === "UNRESOLVED") {
        contractsUnresolved++;
        unresolvedScopeUsers.add(key);
      } else {
        contractsResolved++;
        if (modules.length > 1) {
          currentPayingByModule.bundle.add(key);
        }
        for (const m of modules) {
          const mod = String(m).toLowerCase();
          if (currentPayingByModule[mod]) {
            currentPayingByModule[mod].add(key);
          }
        }
      }
    }

    // ── 6. CURRENT ENTITLED ──────────────────────────────────────────────────
    const entitledKeys = new Set<string>();
    for (const ue of allEntitlements) {
      if (ue.has_access === true) {
        const key = String(ue.user_id || ue.user_email || "");
        if (key) entitledKeys.add(key);
      }
    }

    // ── 7. ENTITLEMENT WITHOUT CONTRACT — canonical classification ────────────
    const entitledWithoutContract: any[] = [];
    for (const ue of allEntitlements) {
      if (ue.has_access !== true) continue;
      const key = String(ue.user_id || ue.user_email || "");
      const email = normEmail(ue.user_email);
      const hasActiveContract = allCurrentPayingKeys.has(key);
      const matchingSubs = subsByEmail.get(email) || [];
      const matchingContracts = allContracts.filter((c: any) =>
        normEmail(c.user_email) === email || c.user_id === ue.user_id
      );
      const hasAnySubRecord = matchingSubs.length > 0;
      const hasAnyContractRecord = matchingContracts.length > 0;
      const hasActiveLegacySub = matchingSubs.some((s: any) =>
        isActiveStatus(s.status) && !isExpired(s.current_period_end)
      );

      if (hasActiveContract) continue;

      let classification = "unknown";
      if (!hasAnySubRecord && !hasAnyContractRecord) {
        classification = "true_orphan";
      } else if (hasActiveLegacySub) {
        classification = "stale_contract_local_period_end";
      } else if (hasAnySubRecord || hasAnyContractRecord) {
        classification = "stale_entitlement_expired_contract";
      }

      entitledWithoutContract.push({
        user_id: ue.user_id,
        email: ue.user_email,
        modules: ue.modules || [],
        contract_count_field: ue.contract_count || 0,
        actual_sub_records: matchingSubs.length,
        actual_contract_records: matchingContracts.length,
        primary_provider: ue.primary_provider || "",
        has_active_contract: hasActiveContract,
        has_legacy_active_sub: hasActiveLegacySub,
        classification,
        computed_at: ue.computed_at,
      });
    }

    // ── 8. ANOMALY DETECTION (canonical) ─────────────────────────────────────
    const anomalies: any[] = [];

    // a) Paid verified contract but no entitlement
    for (const key of verifiedPayingKeys) {
      if (!entitledKeys.has(key)) {
        anomalies.push({ type: "paid_no_entitlement", user_key: key, description: "Active paying contract but no UserEntitlement record" });
      }
    }

    // b) Multiple active contracts for same provider subscription
    const subIdToContracts = new Map<string, number>();
    for (const cr of proofTable) {
      if (!cr.is_current) continue;
      const subId = String(cr.stripe_subscription_id || "");
      if (subId) {
        subIdToContracts.set(subId, (subIdToContracts.get(subId) || 0) + 1);
      }
    }
    for (const [subId, count] of subIdToContracts) {
      if (count > 1) {
        anomalies.push({ type: "duplicate_contract_for_same_sub", provider_subscription_id: subId, count, description: `${count} ActiveContract records for the same provider subscription` });
      }
    }

    // c) Unresolved product scope (among current contracts)
    if (contractsUnresolved > 0) {
      anomalies.push({ type: "unresolved_product_scope", count: contractsUnresolved, description: `${contractsUnresolved} current contracts with unresolved product/module scope` });
    }

    // d) True orphan entitlements
    const trueOrphans = entitledWithoutContract.filter(e => e.classification === "true_orphan");
    if (trueOrphans.length > 0) {
      anomalies.push({ type: "true_orphan_entitlements", count: trueOrphans.length, emails: trueOrphans.map(e => e.email), description: "Users with has_access=true but no Subscription or ActiveContract record at all" });
    }

    // e) Stale local contracts (active locally but not at provider)
    if (staleLocalContracts.length > 0) {
      anomalies.push({ type: "stale_local_contract", count: staleLocalContracts.length, description: `${staleLocalContracts.length} contracts active locally but not current at provider`, detail: staleLocalContracts });
    }

    // ── 9. Build registry usage proof ────────────────────────────────────────
    const registryProof = (registry as any[]).map((entry: any) => {
      const contractsUsing = proofTable.filter(cr =>
        cr.is_current && cr.stripe_product_id === entry.product_id
      );
      const uniqueUsers = new Set(contractsUsing.map(cr => cr.user_id || cr.user_email));
      return {
        product_id: entry.product_id,
        price_id: entry.price_id,
        product_name: entry.product_name,
        canonical_plan: entry.canonical_plan_key,
        canonical_modules: entry.canonical_modules,
        mapping_source: entry.mapping_source,
        confidence: entry.confidence,
        current_contracts_using: contractsUsing.length,
        current_unique_users: uniqueUsers.size,
      };
    });

    // ── 10. BUILD REPORT ──────────────────────────────────────────────────────
    const report = {
      generated_at: new Date().toISOString(),
      audit_version: "canonical_reconciliation_v3",
      stripe_live_verified: stripeAvailable,

      record_totals: {
        total_users: allUsers.length,
        total_subscription_records: allSubs.length,
        total_active_contract_records: allContracts.length,
        total_user_entitlement_records: allEntitlements.length,
        total_subscription_event_records: allEvents.length,
        total_registry_entries: (registry as any[]).length,
      },

      canonical_populations: {
        current_recognized_paying: allCurrentPayingKeys.size,
        provider_verified_paying: verifiedPayingKeys.size,
        provisional_paying: provisionalPayingKeys.size,
        current_entitled: entitledKeys.size,
        historical_subscribers: historicalKeys.size,
        unique_current_paying_people: allCurrentPayingKeys.size,
        active_contracts: contractsCurrent,
        total_contracts: contractsTotal,
      },

      by_provider: {
        stripe_verified: verifiedPayingKeys.size - [...verifiedPayingKeys].filter(k => false).length,
        apple_verified: 0,
        apple_provisional: provisionalPayingKeys.size,
        manual_verified: 0,
        google: 0,
      },

      by_module: {
        pipekeeper: currentPayingByModule.pipekeeper.size,
        cigarkeeper: currentPayingByModule.cigarkeeper.size,
        whiskeykeeper: currentPayingByModule.whiskeykeeper.size,
        winekeeper: currentPayingByModule.winekeeper.size,
        multi_module_bundles: currentPayingByModule.bundle.size,
        unresolved_scope: unresolvedScopeUsers.size,
      },

      scope_resolution: {
        total_active_contracts: contractsCurrent,
        resolved: contractsResolved,
        unresolved: contractsUnresolved,
      },

      entitlement_anomalies: {
        total: entitledWithoutContract.length,
        classifications: entitledWithoutContract.reduce((acc: Record<string, number>, e: any) => {
          acc[e.classification] = (acc[e.classification] || 0) + 1;
          return acc;
        }, {}),
        detail: entitledWithoutContract,
      },

      anomalies: {
        total: anomalies.length,
        detail: anomalies,
      },

      provider_verification: {
        stripe: { verified: stripeAvailable, count: verifiedPayingKeys.size, note: stripeAvailable ? "Stripe subscriptions verified via live API query" : "Stripe API unavailable — using local state only" },
        apple: { verified: false, count: provisionalPayingKeys.size, note: "Apple App Store Server API credentials not configured. All Apple users are PROVISIONAL." },
        apple_credentials_configured: false,
      },

      // ── PROOF TABLE: contract → product → user ──────────────────────────────
      proof_table: proofTable,
      proof_table_summary: {
        total_rows: proofTable.length,
        current_rows: proofTable.filter(r => r.is_current).length,
        provider_resolved: proofTable.filter(r => r.product_identity_classification === "PROVIDER_RESOLVED").length,
        legacy_resolved: proofTable.filter(r => r.product_identity_classification === "LEGACY_RESOLVED").length,
        amount_inferred: proofTable.filter(r => r.product_identity_classification === "AMOUNT_INFERRED").length,
        unresolved: proofTable.filter(r => r.product_identity_classification === "UNRESOLVED").length,
      },

      // ── REGISTRY USAGE PROOF ───────────────────────────────────────────────
      registry_usage: registryProof,

      // ── STALE LOCAL CONTRACTS ──────────────────────────────────────────────
      stale_local_contracts: {
        total: staleLocalContracts.length,
        detail: staleLocalContracts,
      },

      unique_users_vs_contracts: {
        unique_current_paying_people: allCurrentPayingKeys.size,
        active_contracts: contractsCurrent,
        note: "One person can have multiple active contracts for different modules. Module counts are UNIQUE USERS per module, not contract counts. A user with PipeKeeper + WhiskeyKeeper appears once in each module card.",
      },

      reconciliation_table: [
        { population: "Any subscription history (old audit denominator)", unique_users: historicalKeys.size },
        { population: "Current recognized paying (verified + provisional)", unique_users: allCurrentPayingKeys.size },
        { population: "Provider-verified paying (Stripe live)", unique_users: verifiedPayingKeys.size },
        { population: "Provisional paying (Apple pending verification)", unique_users: provisionalPayingKeys.size },
        { population: "Current entitled users", unique_users: entitledKeys.size },
        { population: "Current paid PipeKeeper (unique users)", unique_users: currentPayingByModule.pipekeeper.size },
        { population: "Current paid CigarKeeper (unique users)", unique_users: currentPayingByModule.cigarkeeper.size },
        { population: "Current paid WhiskeyKeeper (unique users)", unique_users: currentPayingByModule.whiskeykeeper.size },
        { population: "Current paid WineKeeper (unique users)", unique_users: currentPayingByModule.winekeeper.size },
        { population: "Multi-module bundles (unique users)", unique_users: currentPayingByModule.bundle.size },
        { population: "Unresolved scope (anomaly)", unique_users: unresolvedScopeUsers.size },
        { population: "Entitlement without contract", unique_users: entitledWithoutContract.length },
        { population: "Stale local contracts (not current at provider)", unique_users: staleLocalContracts.length },
      ],

      note: "v3 canonical: (1) LIVE Stripe API verification for every subscription, (2) Product identity resolved via StripeProductRegistry (Product ID is durable key), (3) Lifecycle classified via reconcileContractV2 (PROVIDER_ACTIVE/TRIALING/CANCELED_BUT_ENTITLED only count as current), (4) Module counts are UNIQUE USERS per module, (5) Stale local contracts excluded from current paying, (6) READ-ONLY — no mutations.",
    };

    console.log("[reconcileSubscriberPopulations] v3 complete:", {
      current_paying: allCurrentPayingKeys.size,
      stripe_verified: verifiedPayingKeys.size,
      apple_provisional: provisionalPayingKeys.size,
      pipekeeper: currentPayingByModule.pipekeeper.size,
    });

    return Response.json(report);
  } catch (error) {
    console.error("[reconcileSubscriberPopulations] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});