/**
 * Reconcile Subscriber Populations — Canonical v2
 *
 * The single canonical counting service for subscriber populations.
 * All dashboards, audits, and health checks must derive counts from this.
 *
 * v2 corrections:
 * - Uses canonical productScopeResolver to resolve unknown module scopes
 * - Distinguishes provider-verified (Stripe) vs provisional (Apple) paying
 * - Fixes bodellmd-type orphan classification (checks actual records, not contract_count field)
 * - Reports unique users vs active contracts separately
 * - Adds anomaly detection for impossible/inconsistent states
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { resolveProductScope, buildPriceIdMap } from "../../shared/productScopeResolver.ts";

import { normEmail, isActiveStatus, isExpired } from "../../shared/subscriptionHelpers.ts";
const now = () => new Date();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log("[reconcileSubscriberPopulations] Starting v2 reconciliation...");

    // ── Fetch all relevant entities ──────────────────────────────────────────
    const [allUsers, allSubs, allContracts, allEntitlements, allEvents] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.User, {}, "-created_date", 5000, 200, "User"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 200, "Subscription"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {}, "-created_date", 5000, 200, "ActiveContract"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.UserEntitlement, {}, "-created_date", 5000, 200, "UserEntitlement"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.SubscriptionEvent, {}, "-created_date", 5000, 200, "SubscriptionEvent"),
    ]);

    // ── Build price ID map from environment ───────────────────────────────────
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

    // ── Build lookup maps ─────────────────────────────────────────────────────
    const subsByEmail = new Map<string, any[]>();
    for (const s of allSubs) {
      const email = normEmail(s.user_email);
      if (email) {
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email)!.push(s);
      }
    }

    // ── 1. HISTORICAL POPULATION ─────────────────────────────────────────────
    const historicalKeys = new Set<string>();
    for (const s of allSubs) { const k = s.user_id || s.user_email; if (k) historicalKeys.add(String(k)); }
    for (const c of allContracts) { const k = c.user_id || c.user_email; if (k) historicalKeys.add(String(k)); }
    for (const e of allEvents) { const k = e.user_id || e.user_email || e.normalized_email; if (k) historicalKeys.add(String(k)); }

    // ── 2. CURRENT PAYING — with product scope resolution ────────────────────
    const verifiedPayingKeys = new Set<string>();   // Stripe (provider-verified)
    const provisionalPayingKeys = new Set<string>(); // Apple (pending verification)
    const allCurrentPayingKeys = new Set<string>();  // union
    const activeContractCount = { total: 0, resolved: 0, unresolved: 0 };
    const currentPayingByModule: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(), bundle: new Set(),
    };
    const unresolvedScopeContracts: any[] = [];

    for (const c of allContracts) {
      if (!isActiveStatus(c.status)) continue;
      if (isExpired(c.period_end)) continue;
      activeContractCount.total++;

      const key = String(c.user_id || c.user_email || "");
      if (!key) continue;

      // Find matching legacy Subscription for additional evidence
      const email = normEmail(c.user_email);
      const matchingSubs = subsByEmail.get(email) || [];
      const bestSub = matchingSubs[0]; // first matching sub for evidence

      // Resolve product scope using all available evidence
      const scope = resolveProductScope({
        price_id: bestSub?.product_id || null,
        plan_key: bestSub?.plan_key || null,
        modules_csv: bestSub?.modules_csv || null,
        modules: Array.isArray(c.modules) ? c.modules : null,
        primary_module: bestSub?.primary_module || null,
        product_kind: bestSub?.product_kind || null,
        checkout_type: bestSub?.checkout_type || null,
        amount_cents: c.amount_cents ?? null,
        amount: bestSub?.amount ?? null,
        billing_interval: c.billing_interval || bestSub?.billing_interval || null,
        product: c.product || null,
        bundle_name: c.bundle_name || null,
      }, priceIdMap);

      if (scope.confidence === 'unresolved') {
        activeContractCount.unresolved++;
        unresolvedScopeContracts.push({
          contract_id: c.id,
          user_id: c.user_id,
          email: c.user_email,
          provider: c.provider,
          amount_cents: c.amount_cents,
          billing_interval: c.billing_interval,
          period_end: c.period_end,
          unresolved_reason: scope.unresolved_reason,
        });
      } else {
        activeContractCount.resolved++;
      }

      // Add to paying sets
      allCurrentPayingKeys.add(key);
      const provider = String(c.provider || "unknown").toLowerCase();
      if (provider === 'stripe') {
        verifiedPayingKeys.add(key);
      } else if (provider === 'apple') {
        provisionalPayingKeys.add(key);
      } else if (provider === 'manual') {
        verifiedPayingKeys.add(key); // manual grants are admin-verified
      } else {
        provisionalPayingKeys.add(key); // unknown → provisional
      }

      // Module breakdown (only for resolved scopes)
      if (scope.modules.length > 0) {
        if (scope.modules.length > 1) {
          currentPayingByModule.bundle.add(key);
        }
        for (const m of scope.modules) {
          const mod = String(m).toLowerCase();
          if (currentPayingByModule[mod]) currentPayingByModule[mod].add(key);
        }
      }
    }

    // ── 3. CURRENT ENTITLED ──────────────────────────────────────────────────
    const entitledKeys = new Set<string>();
    for (const ue of allEntitlements) {
      if (ue.has_access === true) {
        const key = String(ue.user_id || ue.user_email || "");
        if (key) entitledKeys.add(key);
      }
    }

    // ── 4. ENTITLEMENT WITHOUT CONTRACT — with corrected classification ──────
    const entitledWithoutContract: any[] = [];
    for (const ue of allEntitlements) {
      if (ue.has_access !== true) continue;
      const key = String(ue.user_id || ue.user_email || "");
      const email = normEmail(ue.user_email);

      // Check for ACTUAL records, not just the contract_count field (which can be stale)
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

      if (hasActiveContract) continue; // has active contract — not an anomaly

      // Classify based on ACTUAL records, not contract_count field
      let classification = "unknown";
      if (!hasAnySubRecord && !hasAnyContractRecord) {
        // No records at all — true orphan (regardless of what contract_count says)
        classification = "true_orphan";
      } else if (hasActiveLegacySub) {
        classification = "stale_contract_local_period_end";
      } else if (hasAnySubRecord || hasAnyContractRecord) {
        // Records exist but all are expired/canceled
        classification = "stale_entitlement_expired_contract";
      }

      entitledWithoutContract.push({
        user_id: ue.user_id,
        email: ue.user_email,
        modules: ue.modules || [],
        contract_count_field: ue.contract_count || 0, // the stale field
        actual_sub_records: matchingSubs.length,
        actual_contract_records: matchingContracts.length,
        primary_provider: ue.primary_provider || "",
        has_active_contract: hasActiveContract,
        has_legacy_active_sub: hasActiveLegacySub,
        classification,
        computed_at: ue.computed_at,
      });
    }

    // ── 5. EXPIRED CONTRACTS ─────────────────────────────────────────────────
    const expiredContracts: any[] = [];
    for (const c of allContracts) {
      const status = String(c.status || "").toLowerCase();
      if (!["expired", "canceled"].includes(status)) continue;
      if (!isExpired(c.period_end)) continue;
      const email = normEmail(c.user_email);
      const matchingSubs = subsByEmail.get(email) || [];
      const hasActiveLegacy = matchingSubs.some((s: any) =>
        isActiveStatus(s.status) && !isExpired(s.current_period_end)
      );
      expiredContracts.push({
        user_id: c.user_id,
        email: c.user_email,
        status: c.status,
        provider: c.provider,
        period_end: c.period_end,
        product: c.product,
        modules: c.modules,
        is_active_flag: c.is_active,
        quality: c.quality,
        issues: c.issues || [],
        has_active_legacy_sub: hasActiveLegacy,
        reconciliation: hasActiveLegacy ? "renewed_but_local_contract_stale" : "genuinely_expired",
      });
    }

    // ── 6. ANOMALY DETECTION ─────────────────────────────────────────────────
    const anomalies: any[] = [];

    // a) Paid verified contract but no entitlement
    for (const key of verifiedPayingKeys) {
      if (!entitledKeys.has(key)) {
        anomalies.push({ type: 'paid_no_entitlement', user_key: key, description: 'Active paying contract but no UserEntitlement record' });
      }
    }

    // b) Multiple active contracts for same provider subscription
    const subIdToContracts = new Map<string, number>();
    for (const c of allContracts) {
      if (!isActiveStatus(c.status) || isExpired(c.period_end)) continue;
      const subId = String(c.provider_subscription_id || '');
      if (subId) {
        subIdToContracts.set(subId, (subIdToContracts.get(subId) || 0) + 1);
      }
    }
    for (const [subId, count] of subIdToContracts) {
      if (count > 1) {
        anomalies.push({ type: 'duplicate_contract_for_same_sub', provider_subscription_id: subId, count, description: `${count} ActiveContract records for the same provider subscription` });
      }
    }

    // c) Unresolved product scope
    if (activeContractCount.unresolved > 0) {
      anomalies.push({ type: 'unresolved_product_scope', count: activeContractCount.unresolved, description: `${activeContractCount.unresolved} active contracts with unresolved product/module scope` });
    }

    // d) True orphan entitlements
    const trueOrphans = entitledWithoutContract.filter(e => e.classification === 'true_orphan');
    if (trueOrphans.length > 0) {
      anomalies.push({ type: 'true_orphan_entitlements', count: trueOrphans.length, emails: trueOrphans.map(e => e.email), description: 'Users with has_access=true but no Subscription or ActiveContract record at all' });
    }

    // ── 7. BUILD RECONCILIATION TABLE ────────────────────────────────────────
    const report = {
      generated_at: new Date().toISOString(),
      audit_version: "canonical_reconciliation_v2",

      record_totals: {
        total_users: allUsers.length,
        total_subscription_records: allSubs.length,
        total_active_contract_records: allContracts.length,
        total_user_entitlement_records: allEntitlements.length,
        total_subscription_event_records: allEvents.length,
      },

      // ── CORRECTED POPULATION MODEL ──
      canonical_populations: {
        current_recognized_paying: allCurrentPayingKeys.size,
        provider_verified_paying: verifiedPayingKeys.size,
        provisional_paying: provisionalPayingKeys.size,
        current_entitled: entitledKeys.size,
        historical_subscribers: historicalKeys.size,
        unique_current_paying_people: allCurrentPayingKeys.size,
        active_contracts: activeContractCount.total,
      },

      // ── BY PROVIDER (verified vs provisional) ──
      by_provider: {
        stripe_verified: verifiedPayingKeys.size - [...verifiedPayingKeys].filter(k => false).length, // all stripe are verified
        apple_verified: 0, // Apple App Store Server API not configured
        apple_provisional: provisionalPayingKeys.size,
        manual_verified: 0,
        google: 0,
      },

      // ── BY MODULE/SCOPE ──
      by_module: {
        pipekeeper: currentPayingByModule.pipekeeper.size,
        cigarkeeper: currentPayingByModule.cigarkeeper.size,
        whiskeykeeper: currentPayingByModule.whiskeykeeper.size,
        winekeeper: currentPayingByModule.winekeeper.size,
        multi_module_bundles: currentPayingByModule.bundle.size,
        unresolved_scope: activeContractCount.unresolved,
      },

      // ── ACTIVE CONTRACT SCOPE RESOLUTION ──
      scope_resolution: {
        total_active_contracts: activeContractCount.total,
        resolved: activeContractCount.resolved,
        unresolved: activeContractCount.unresolved,
        unresolved_detail: unresolvedScopeContracts,
      },

      // ── ENTITLEMENT RECONCILIATION ──
      entitlement_anomalies: {
        total: entitledWithoutContract.length,
        classifications: entitledWithoutContract.reduce((acc: Record<string, number>, e: any) => {
          acc[e.classification] = (acc[e.classification] || 0) + 1;
          return acc;
        }, {}),
        detail: entitledWithoutContract,
      },

      // ── EXPIRED RECONCILIATION ──
      expired_anomalies: {
        total: expiredContracts.length,
        genuinely_expired: expiredContracts.filter(e => e.reconciliation === "genuinely_expired").length,
        renewed_but_stale: expiredContracts.filter(e => e.reconciliation === "renewed_but_local_contract_stale").length,
        detail: expiredContracts,
      },

      // ── ANOMALY DETECTION ──
      anomalies: {
        total: anomalies.length,
        detail: anomalies,
      },

      // ── PROVIDER VERIFICATION STATUS ──
      provider_verification: {
        stripe: { verified: true, count: verifiedPayingKeys.size, note: "Stripe subscriptions are verified via webhook sync" },
        apple: { verified: false, count: provisionalPayingKeys.size, note: "Apple App Store Server API credentials not configured. All Apple users are PROVISIONAL." },
        apple_credentials_configured: false,
        apple_credentials_blocker: "App Store Server API requires issuer ID, key ID, private key, and bundle ID. These must be configured as secrets.",
      },

      // ── UNIQUE USERS vs CONTRACTS ──
      unique_users_vs_contracts: {
        unique_current_paying_people: allCurrentPayingKeys.size,
        active_contracts: activeContractCount.total,
        note: "One person can have multiple active contracts for different modules. These counts are NOT the same.",
      },

      // ── RECONCILIATION TABLE ──
      reconciliation_table: [
        { population: "Any subscription history (old audit denominator)", unique_users: historicalKeys.size },
        { population: "Current recognized paying (verified + provisional)", unique_users: allCurrentPayingKeys.size },
        { population: "Provider-verified paying", unique_users: verifiedPayingKeys.size },
        { population: "Provisional paying (pending verification)", unique_users: provisionalPayingKeys.size },
        { population: "Current entitled users", unique_users: entitledKeys.size },
        { population: "Current paid PipeKeeper", unique_users: currentPayingByModule.pipekeeper.size },
        { population: "Current paid CigarKeeper", unique_users: currentPayingByModule.cigarkeeper.size },
        { population: "Current paid WhiskeyKeeper", unique_users: currentPayingByModule.whiskeykeeper.size },
        { population: "Current paid WineKeeper", unique_users: currentPayingByModule.winekeeper.size },
        { population: "Multi-module bundles", unique_users: currentPayingByModule.bundle.size },
        { population: "Unresolved scope (anomaly)", unique_users: activeContractCount.unresolved },
        { population: "Expired/lapsed subscribers", unique_users: expiredContracts.length },
        { population: "Entitlement without contract", unique_users: entitledWithoutContract.length },
      ],

      note: "v2 corrections: (1) verified vs provisional split, (2) product scope resolution for unknown contracts, (3) true orphan classification based on actual records not contract_count field, (4) unique users vs active contracts reported separately.",
    };

    console.log("[reconcileSubscriberPopulations] v2 reconciliation complete");
    return Response.json(report);
  } catch (error) {
    console.error("[reconcileSubscriberPopulations] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});