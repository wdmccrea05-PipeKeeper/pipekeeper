/**
 * getCanonicalBillingDataset — THE Canonical Billing Source
 *
 * This is the SINGLE canonical row-level billing dataset for CollectionKeeper.
 * All dashboards (User Report, Reconciliation Dashboard, executive KPIs, admin
 * subscription reporting) must derive billing metrics from this function.
 *
 * Architecture:
 *   Provider adapters (Stripe / Apple)
 *     → Canonical billing ledger (contracts + provider lifecycle + product identity)
 *       → Canonical entitlement projection
 *         → Reporting projections (by provider, by plan, by module)
 *
 * What this function does:
 * 1. Fetches all ActiveContract, Subscription, UserEntitlement, SubscriptionEvent,
 *    StripeProductRegistry, and User records
 * 2. Queries LIVE Stripe API for every unique subscription ID (with expand for product)
 * 3. For each contract, resolves product identity via resolveProductIdentityFromStripeChain
 *    (registry-first by Product ID — NOT local string heuristics)
 * 4. Classifies lifecycle via reconcileContractV2 (PROVIDER_ACTIVE/TRIALING/CANCELED_BUT_ENTITLED)
 * 5. Returns ROW-LEVEL canonical billing rows + all projections
 *
 * Key distinctions (Defect B fix):
 * - PLAN = the commercial product purchased (PipeKeeper Individual, Founders Bundle, etc.)
 * - MODULE = the entitlement scope (pipekeeper, whiskeykeeper, cigarkeeper, winekeeper)
 * - A Founders Bundle plan → pipekeeper + whiskeykeeper modules
 * - A 4-Module Bundle plan → all 4 modules
 *
 * Defects fixed (vs getUserSubscriptionReportV3):
 * A: Product identity uses Stripe Product ID chain, not local string heuristics
 * B: Plan and module are separate dimensions
 * C: Entitlement records indexed as Map<UserId, UserEntitlement[]> (not overwritten)
 * D: Provider is a Set from ALL current contracts (not payingContracts[0]?.provider)
 * E: Subscription matching by provider subscription ID (not email fallback)
 * F: No fallback suppression by email+provider+product
 * G: Current payment from provider lifecycle (not local status/period)
 *
 * READ-ONLY: does not mutate any records.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import { buildPriceIdMap, PLAN_CATALOG } from "../../shared/productScopeResolver.ts";
import { resolveProductIdentityFromStripeChain } from "../../shared/stripeProductResolver.ts";
import { reconcileContractV2 } from "../../shared/billingLifecycleReconciler.ts";
import { getStripeClient } from "../../shared/getStripeClient.ts";
import { normEmail, isActiveStatus, isExpired } from "../../shared/subscriptionHelpers.ts";
import { resolveHistoricalPlan } from "../../shared/historicalPlanResolver.ts";

const ACTIVE_LIFECYCLES = ["PROVIDER_ACTIVE", "PROVIDER_TRIALING", "PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE"];

// ── Canonical Plan Catalog (for display) ────────────────────────────────────
const PLAN_DISPLAY: Record<string, { display_name: string; plan_type: 'single' | 'bundle'; modules: string[] }> = {
  pipekeeper_pro_monthly:      { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  pipekeeper_pro_annual:       { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  whiskeykeeper_pro_monthly:  { display_name: 'WhiskeyKeeper Individual', plan_type: 'single', modules: ['whiskeykeeper'] },
  whiskeykeeper_pro_annual:   { display_name: 'WhiskeyKeeper Individual', plan_type: 'single', modules: ['whiskeykeeper'] },
  cigarkeeper_pro_monthly:    { display_name: 'CigarKeeper Individual', plan_type: 'single', modules: ['cigarkeeper'] },
  cigarkeeper_pro_annual:     { display_name: 'CigarKeeper Individual', plan_type: 'single', modules: ['cigarkeeper'] },
  winekeeper_pro_monthly:     { display_name: 'WineKeeper Individual', plan_type: 'single', modules: ['winekeeper'] },
  winekeeper_pro_annual:      { display_name: 'WineKeeper Individual', plan_type: 'single', modules: ['winekeeper'] },
  founders_bundle_monthly:    { display_name: 'Founders Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'] },
  founders_bundle_annual:     { display_name: 'Founders Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'] },
  three_module_bundle_monthly:{ display_name: 'Three-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] },
  three_module_bundle_annual: { display_name: 'Three-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] },
  four_module_bundle_monthly: { display_name: 'Four-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'] },
  four_module_bundle_annual:  { display_name: 'Four-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'] },
};

// Group plan keys by display name (monthly + annual are the same plan family)
const PLAN_FAMILY_KEYS: Record<string, string[]> = {
  'PipeKeeper Individual': ['pipekeeper_pro_monthly', 'pipekeeper_pro_annual'],
  'WhiskeyKeeper Individual': ['whiskeykeeper_pro_monthly', 'whiskeykeeper_pro_annual'],
  'CigarKeeper Individual': ['cigarkeeper_pro_monthly', 'cigarkeeper_pro_annual'],
  'WineKeeper Individual': ['winekeeper_pro_monthly', 'winekeeper_pro_annual'],
  'Founders Bundle': ['founders_bundle_monthly', 'founders_bundle_annual'],
  'Three-Module Bundle': ['three_module_bundle_monthly', 'three_module_bundle_annual'],
  'Four-Module Bundle': ['four_module_bundle_monthly', 'four_module_bundle_annual'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log("[getCanonicalBillingDataset] Starting canonical billing dataset build...");

    // ── 1. Fetch ALL entities + StripeProductRegistry ────────────────────────
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
    // Also check Subscription records for Stripe sub IDs not in contracts
    for (const s of allSubs) {
      const subId = s.provider_subscription_id || s.stripe_subscription_id;
      if (subId && String(s.provider || "stripe").toLowerCase() === "stripe") {
        stripeSubIds.add(subId);
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
          // Read ALL subscription items (Defect: don't assume items.data[0])
          const items = sub.items?.data || [];
          const itemSummaries = items.map((item: any) => {
            const price = item.price;
            const productRef = price?.product;
            const productId = typeof productRef === "object" ? productRef?.id : productRef;
            const productName = typeof productRef === "object" ? productRef?.name : undefined;
            return {
              item_id: item.id,
              price_id: price?.id,
              product_id: productId,
              product_name: productName,
              amount_cents: price?.unit_amount,
              interval: price?.recurring?.interval,
              quantity: item.quantity,
            };
          });
          const primaryItem = itemSummaries[0] || {};
          stripeVerification[subId] = {
            provider_subscription_id: subId,
            exists: true,
            status: sub.status,
            current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : undefined,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
            cancel_at_period_end: sub.cancel_at_period_end,
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : undefined,
            started_at: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : undefined,
            customer: sub.customer,
            price_id: primaryItem.price_id,
            product_id: primaryItem.product_id,
            product_name: primaryItem.product_name,
            amount_cents: primaryItem.amount_cents,
            interval: primaryItem.interval,
            item_count: items.length,
            all_items: itemSummaries,
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
      console.warn(`[getCanonicalBillingDataset] Stripe client unavailable: ${stripeErr?.message}`);
    }

    // ── 3. Build lookup maps ──────────────────────────────────────────────────
    // Defect E fix: Match subscriptions by provider_subscription_id, NOT email fallback
    const subsByProviderSubId = new Map<string, any>();
    const subsByAppleOrigTxn = new Map<string, any>();
    for (const s of allSubs) {
      const subId = s.provider_subscription_id || s.stripe_subscription_id;
      if (subId) subsByProviderSubId.set(String(subId), s);
      // Apple originalTransactionId
      const appleOrigTxn = (s as any).original_transaction_id || (s as any).provider_subscription_id;
      if (s.provider === "apple" && appleOrigTxn) {
        subsByAppleOrigTxn.set(String(appleOrigTxn), s);
      }
    }

    // Defect C fix: Index entitlements as Map<UserId, UserEntitlement[]>
    const entitlementsByUserId = new Map<string, any[]>();
    const entitlementsByEmail = new Map<string, any[]>();
    for (const ue of allEntitlements) {
      const uid = String(ue.user_id || "");
      const email = normEmail(ue.user_email);
      if (uid) {
        if (!entitlementsByUserId.has(uid)) entitlementsByUserId.set(uid, []);
        entitlementsByUserId.get(uid)!.push(ue);
      }
      if (email) {
        if (!entitlementsByEmail.has(email)) entitlementsByEmail.set(email, []);
        entitlementsByEmail.get(email)!.push(ue);
      }
    }

    // User lookup
    const usersById = new Map<string, any>();
    const usersByEmail = new Map<string, any>();
    for (const u of allUsers) {
      usersById.set(String(u.id), u);
      const email = normEmail((u as any).email);
      if (email) usersByEmail.set(email, u);
    }

    // ── 4. BUILD CANONICAL BILLING ROWS (row-level) ───────────────────────────
    const billingRows: any[] = [];
    const staleLocalContracts: any[] = [];

    for (const c of allContracts) {
      const key = String(c.user_id || c.user_email || "");
      const subId = c.provider_subscription_id || "";
      const provider = String(c.provider || "unknown").toLowerCase();

      // Defect E fix: Match subscription by provider subscription ID (not email)
      let matchingSub: any = null;
      if (subId && subsByProviderSubId.has(subId)) {
        matchingSub = subsByProviderSubId.get(subId);
      } else if (provider === "apple" && subsByAppleOrigTxn.has(subId)) {
        matchingSub = subsByAppleOrigTxn.get(subId);
      }
      // NO email fallback — Defect E fix

      // Build provider truth from live Stripe
      const providerTruth = {
        stripe_subscription: stripeSubData[subId] || null,
        stripe_lookup_error: null,
        stripe_not_found: stripeVerification[subId]?.exists === false,
      };

      // Resolve product identity (registry-first by Product ID)
      const resolverResult = resolveProductIdentityFromStripeChain({
        contract: c,
        legacy_subscription: matchingSub,
        provider_truth: providerTruth,
        price_id_map: priceIdMap,
        registry,
      });

      // Classify lifecycle using v2 reconciler
      let lifecycleClassification = "MANUAL_REVIEW";
      let lifecycleResult: any = null;
      try {
        lifecycleResult = reconcileContractV2({
          contract: c,
          legacy_subscription: matchingSub,
          provider_truth: providerTruth,
          price_id_map: priceIdMap,
        });
        lifecycleClassification = lifecycleResult.lifecycle_classification || "MANUAL_REVIEW";
      } catch (e) {
        // Keep MANUAL_REVIEW
      }

      const isCurrent = ACTIVE_LIFECYCLES.includes(lifecycleClassification) || c.is_active === true;

      // Track stale local contracts
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

      // Resolve plan display name — PRIORITIZE the ActiveContract's resolved_plan_key
      // (set by executeBillingReconciliationClosure) over the live Stripe re-resolution,
      // so Apple/manual grants and non-Stripe bundles are correctly classified.
      const planKey = c.resolved_plan_key || resolverResult.resolved_plan_key || matchingSub?.plan_key || "";
      const planDisplay = planKey ? PLAN_DISPLAY[planKey] : null;
      const planFamily = planDisplay ? planDisplay.display_name : null;
      const planType = planDisplay ? planDisplay.plan_type : (planKey ? 'unknown' : 'unknown');
      const bundleType = planDisplay?.plan_type === 'bundle' ? planDisplay.display_name : (c.bundle_name || null);

      // Modules from canonical resolver, falling back to ActiveContract modules
      const modules = (resolverResult.resolved_modules && resolverResult.resolved_modules.length > 0)
        ? resolverResult.resolved_modules
        : (c.modules || []);

      // Entitlement lookup (Defect C fix: get ALL entitlements for this user)
      const userEntitlements = entitlementsByUserId.get(String(c.user_id || "")) ||
        entitlementsByEmail.get(normEmail(c.user_email)) || [];
      const hasEntitlement = userEntitlements.some((ue: any) => ue.has_access === true);
      const entitlementModules = new Set<string>();
      for (const ue of userEntitlements) {
        if (ue.has_access === true && Array.isArray(ue.modules)) {
          for (const m of ue.modules) entitlementModules.add(String(m).toLowerCase());
        }
      }

      // Expected entitlement scopes = modules from the plan
      const expectedScopes = modules;
      const entitlementStatus = hasEntitlement ? "entitled" : (isCurrent ? "paid_no_entitlement" : "not_entitled");
      const entitlementProvenance = userEntitlements[0]?.source_type || "none";

      // Anomaly codes
      const anomalyCodes: string[] = [];
      if (resolverResult.classification === "UNRESOLVED") anomalyCodes.push("UNMAPPED_PRODUCT");
      if (isCurrent && !hasEntitlement) anomalyCodes.push("PAID_NO_ENTITLEMENT");
      if (hasEntitlement && !isCurrent) anomalyCodes.push("ENTITLEMENT_WITHOUT_CONTRACT");
      if (resolverResult.mismatch_detected) anomalyCodes.push("PRODUCT_CONFLICT");
      if (stripeVerification[subId]?.exists === false) anomalyCodes.push("PROVIDER_SUBSCRIPTION_MISSING");
      if (provider === "apple" && !stripeAvailable) anomalyCodes.push("APPLE_PRODUCT_UNVERIFIED");
      if (planType === 'bundle' && modules.length <= 1) anomalyCodes.push("BUNDLE_LOST_MODULE_IDENTITY");
      if (planType === 'single' && modules.length > 1) anomalyCodes.push("SINGLE_PLAN_WITH_MULTIPLE_MODULES");

      // Compute MRR from amount + interval (contracts may not have mrr_cents populated)
      const amountCents = c.amount_cents ?? stripeVerification[subId]?.amount_cents ?? undefined;
      const billingInterval = c.billing_interval || (stripeVerification[subId]?.interval === 'year' ? 'annual' : stripeVerification[subId]?.interval) || undefined;
      let computedMrr = c.mrr_cents ?? 0;
      let finalAmountCents = amountCents;
      if (finalAmountCents == null && matchingSub?.amount) {
        finalAmountCents = Math.round(matchingSub.amount * 100);
        const subInterval = matchingSub.billing_interval || billingInterval;
        if (subInterval === 'year' || subInterval === 'annual') computedMrr = Math.round(finalAmountCents / 12);
        else if (subInterval === 'month' || subInterval === 'monthly') computedMrr = finalAmountCents;
      }
      if ((!computedMrr || computedMrr === 0) && finalAmountCents != null && billingInterval) {
        if (billingInterval === 'annual' || billingInterval === 'year') computedMrr = Math.round(finalAmountCents / 12);
        else if (billingInterval === 'monthly' || billingInterval === 'month') computedMrr = finalAmountCents;
      }

      // Build the canonical billing row
      const row = {
        canonical_contract_id: c.id,
        user_id: c.user_id,
        email: c.user_email,
        provider,
        provider_customer_id: c.provider_customer_id || stripeVerification[subId]?.customer || undefined,
        provider_subscription_id: subId || undefined,
        original_transaction_id: provider === "apple" ? subId : undefined,

        // Lifecycle
        provider_lifecycle_status: stripeVerification[subId]?.status || c.status,
        lifecycle_classification: lifecycleClassification,
        is_current: isCurrent,
        current_paid_through_date: c.period_end || stripeVerification[subId]?.current_period_end || undefined,

        // Product identity (from Stripe chain, NOT local heuristics)
        stripe_price_id: resolverResult.resolved_price_id || stripeVerification[subId]?.price_id || undefined,
        stripe_product_id: resolverResult.resolved_product_id || stripeVerification[subId]?.product_id || undefined,
        stripe_product_name: stripeVerification[subId]?.product_name || undefined,
        stripe_item_count: stripeVerification[subId]?.item_count || 1,

        // Canonical plan (the COMMERCIAL product purchased)
        canonical_plan_key: planKey || undefined,
        plan_family: planFamily,
        plan_type: planType,
        bundle_type: bundleType,

        // Modules (the ENTITLEMENT SCOPE)
        modules,

        // Product resolution metadata
        product_resolution_source: resolverResult.resolution_source,
        product_resolution_confidence: resolverResult.confidence,
        product_identity_classification: resolverResult.classification,

        // Entitlement
        entitlement_scopes: [...entitlementModules],
        expected_entitlement_scopes: expectedScopes,
        entitlement_status: entitlementStatus,
        entitlement_provenance: entitlementProvenance,

        // Billing
        amount_cents: finalAmountCents,
        currency: c.currency || "usd",
        billing_interval: billingInterval,
        mrr_cents: computedMrr,

        // Dates
        first_paid_date: matchingSub?.started_at || matchingSub?.subscriptionStartedAt || c.period_start || undefined,
        renewal_date: c.period_end || stripeVerification[subId]?.current_period_end || undefined,
        cancel_state: c.status === 'canceled' || stripeVerification[subId]?.cancel_at_period_end ? 'canceling' : (c.status === 'expired' ? 'expired' : 'active'),
        canceled_at: stripeVerification[subId]?.canceled_at || undefined,

        // Anomalies
        anomaly_codes: anomalyCodes,
      };
      billingRows.push(row);
    }

    // ── 5. PROJECTIONS ─────────────────────────────────────────────────────────

    // 5a. By Provider (Defect D fix: Set from ALL current contracts, not first)
    const currentRows = billingRows.filter(r => r.is_current);
    const providerUserSets: Record<string, Set<string>> = {
      stripe: new Set(), apple_verified: new Set(), apple_provisional: new Set(),
      google: new Set(), manual: new Set(), other: new Set(),
    };
    const multiProviderUsers = new Set<string>();
    const userProviders = new Map<string, Set<string>>();

    for (const r of currentRows) {
      const key = String(r.user_id || r.email || "");
      if (!key) continue;
      if (r.provider === "stripe") providerUserSets.stripe.add(key);
      else if (r.provider === "apple") {
        if (r.anomaly_codes.includes("APPLE_PRODUCT_UNVERIFIED")) {
          providerUserSets.apple_provisional.add(key);
        } else {
          providerUserSets.apple_verified.add(key);
        }
      }
      else if (r.provider === "google") providerUserSets.google.add(key);
      else if (r.provider === "manual") providerUserSets.manual.add(key);
      else providerUserSets.other.add(key);

      if (!userProviders.has(key)) userProviders.set(key, new Set());
      userProviders.get(key)!.add(r.provider);
    }
    for (const [key, providers] of userProviders) {
      if (providers.size > 1) multiProviderUsers.add(key);
    }

    // 5b. By Plan (commercial plan — PipeKeeper Individual, Founders Bundle, etc.)
    const planUserSets: Record<string, Set<string>> = {};
    const planContractSets: Record<string, Set<string>> = {};
    const planMrr: Record<string, number> = {};
    for (const family of Object.keys(PLAN_FAMILY_KEYS)) {
      planUserSets[family] = new Set();
      planContractSets[family] = new Set();
      planMrr[family] = 0;
    }
    planUserSets['Unknown/Unresolved'] = new Set();
    planContractSets['Unknown/Unresolved'] = new Set();
    planMrr['Unknown/Unresolved'] = 0;

    for (const r of currentRows) {
      const key = String(r.user_id || r.email || "");
      const family = r.plan_family || 'Unknown/Unresolved';
      if (!planUserSets[family]) {
        planUserSets[family] = new Set();
        planContractSets[family] = new Set();
        planMrr[family] = 0;
      }
      if (key) planUserSets[family].add(key);
      planContractSets[family].add(r.canonical_contract_id);
      planMrr[family] += (r.mrr_cents || 0);
    }

    // 5c. By Module (entitlement scope — pipekeeper, whiskeykeeper, etc.)
    const moduleEntitledSets: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(),
    };
    const modulePaidSets: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(),
    };
    const moduleNonPaidSets: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(),
    };

    // From current paying contracts
    for (const r of currentRows) {
      const key = String(r.user_id || r.email || "");
      if (!key) continue;
      for (const m of r.modules) {
        const mod = String(m).toLowerCase();
        if (modulePaidSets[mod]) modulePaidSets[mod].add(key);
      }
    }

    // From UserEntitlement records (includes non-paid grants)
    for (const ue of allEntitlements) {
      if (ue.has_access !== true) continue;
      const key = String(ue.user_id || ue.user_email || "");
      if (!key) continue;
      const isPaid = currentRows.some(r =>
        String(r.user_id || r.email || "") === key && r.modules.some(m => ue.modules?.includes(m))
      );
      for (const m of (ue.modules || [])) {
        const mod = String(m).toLowerCase();
        if (moduleEntitledSets[mod]) {
          moduleEntitledSets[mod].add(key);
          if (!isPaid) moduleNonPaidSets[mod].add(key);
        }
      }
    }

    // 5d. Historical / Ever-purchased — full evidence-chain resolution
    // Builds row-level historical billing rows from BOTH ActiveContract billing rows
    // AND Subscription records, resolving commercial plan for each using the
    // prioritized evidence chain in historicalPlanResolver.
    const historicalBillingRows: any[] = [];

    // 5d.1: Add ActiveContract-derived billing rows as historical rows
    for (const r of billingRows) {
      historicalBillingRows.push({
        ...r,
        source_entity: "ActiveContract",
        reason_unresolved: r.product_identity_classification === "UNRESOLVED"
          ? "Product identity not resolved from Stripe chain"
          : null,
      });
    }

    // 5d.2: For each Subscription NOT covered by an ActiveContract, build a historical row
    const histBillingRowSubIds = new Set(billingRows.map((r: any) => r.provider_subscription_id).filter(Boolean));
    for (const s of allSubs) {
      const subId = s.provider_subscription_id || s.stripe_subscription_id || "";
      if (subId && histBillingRowSubIds.has(subId)) continue; // already covered by ActiveContract

      const key = String(s.user_id || s.user_email || "");
      if (!key) continue;

      const provider = String(s.provider || "stripe").toLowerCase();
      const stripeVer = subId ? stripeVerification[subId] : null;

      // Resolve commercial plan using the full evidence chain
      const resolution = resolveHistoricalPlan(
        s as any,
        stripeVer || null,
        priceIdMap,
        PLAN_DISPLAY,
        registry as any[],
      );

      const subStatus = String(s.status || "unknown").toLowerCase();
      const isCurrent = ["active", "trialing", "past_due"].includes(subStatus) && !isExpired(s.current_period_end);

      historicalBillingRows.push({
        user_id: s.user_id,
        email: s.user_email,
        provider,
        provider_customer_id: s.stripe_customer_id || (stripeVer as any)?.customer || undefined,
        provider_subscription_id: subId || undefined,
        original_transaction_id: provider === "apple" ? subId : undefined,

        provider_lifecycle_status: (stripeVer as any)?.status || s.status,
        lifecycle_classification: stripeVer ? "PROVIDER_VERIFIED" : "HISTORICAL_INFERRED",
        is_current: isCurrent,
        current_paid_through_date: s.current_period_end || (stripeVer as any)?.current_period_end || undefined,

        stripe_price_id: resolution.stripe_price_id || undefined,
        stripe_product_id: resolution.stripe_product_id || undefined,
        stripe_product_name: resolution.stripe_product_name || undefined,
        stripe_item_count: (stripeVer as any)?.item_count || 1,

        canonical_plan_key: resolution.plan_key || undefined,
        plan_family: resolution.plan_family,
        plan_type: resolution.plan_type,
        bundle_type: resolution.bundle_type,

        modules: resolution.modules,

        product_resolution_source: resolution.resolution_source,
        product_resolution_confidence: resolution.confidence,
        product_identity_classification: resolution.classification,
        reason_unresolved: resolution.reason_unresolved,

        amount_cents: s.amount != null ? Math.round(s.amount * 100) : (stripeVer as any)?.amount_cents,
        currency: "usd",
        billing_interval: s.billing_interval || ((stripeVer as any)?.interval === "year" ? "annual" : (stripeVer as any)?.interval) || undefined,

        first_paid_date: s.started_at || s.subscriptionStartedAt || s.current_period_start || undefined,
        renewal_date: s.current_period_end || undefined,
        cancel_state: subStatus === "canceled" ? "canceled" : subStatus === "expired" ? "expired" : "active",

        source_entity: "Subscription",

        // Internal metadata for evidence audit
        internal_plan_key: s.plan_key || undefined,
        internal_product_kind: s.product_kind || undefined,
        internal_checkout_type: s.checkout_type || undefined,
        internal_modules_csv: s.modules_csv || undefined,
        internal_primary_module: s.primary_module || undefined,
      });
    }

    // Recalculate historical_by_plan using resolved plans
    const historicalPlanSets: Record<string, Set<string>> = {};
    for (const family of Object.keys(PLAN_FAMILY_KEYS)) {
      historicalPlanSets[family] = new Set();
    }
    historicalPlanSets['Unknown/Unresolved'] = new Set();

    for (const r of historicalBillingRows) {
      const key = String(r.user_id || r.email || "");
      const family = r.plan_family || 'Unknown/Unresolved';
      if (!historicalPlanSets[family]) historicalPlanSets[family] = new Set();
      if (key) historicalPlanSets[family].add(key);
    }

    // ── 6. PRODUCT ID AUDIT ────────────────────────────────────────────────────
    const productAuditMap = new Map<string, {
      product_id: string; product_name: string; price_ids: Set<string>;
      current_contracts: number; historical_contracts: number;
      current_users: Set<string>; historical_users: Set<string>;
      canonical_plan: string; canonical_modules: string[];
      mapping_source: string; confidence: string;
      unmapped: boolean;
    }>();

    for (const r of billingRows) {
      const pid = r.stripe_product_id;
      if (!pid) continue;
      if (!productAuditMap.has(pid)) {
        const regEntry = (registry as any[]).find((e: any) => e.product_id === pid);
        productAuditMap.set(pid, {
          product_id: pid,
          product_name: r.stripe_product_name || regEntry?.product_name || "",
          price_ids: new Set(),
          current_contracts: 0, historical_contracts: 0,
          current_users: new Set(), historical_users: new Set(),
          canonical_plan: regEntry?.canonical_plan_key || r.canonical_plan_key || "",
          canonical_modules: regEntry?.canonical_modules || r.modules || [],
          mapping_source: regEntry?.mapping_source || r.product_resolution_source || "",
          confidence: regEntry?.confidence || r.product_resolution_confidence || "",
          unmapped: !regEntry && r.product_identity_classification === "UNRESOLVED",
        });
      }
      const entry = productAuditMap.get(pid)!;
      if (r.stripe_price_id) entry.price_ids.add(r.stripe_price_id);
      if (r.is_current) {
        entry.current_contracts++;
        const key = String(r.user_id || r.email || "");
        if (key) entry.current_users.add(key);
      } else {
        entry.historical_contracts++;
        const key = String(r.user_id || r.email || "");
        if (key) entry.historical_users.add(key);
      }
    }

    const productAudit = [...productAuditMap.values()].map(e => ({
      product_id: e.product_id,
      product_name: e.product_name,
      price_ids: [...e.price_ids],
      current_contracts: e.current_contracts,
      historical_contracts: e.historical_contracts,
      current_users: e.current_users.size,
      historical_users: e.historical_users.size,
      canonical_plan: e.canonical_plan,
      canonical_modules: e.canonical_modules,
      mapping_source: e.mapping_source,
      confidence: e.confidence,
      unmapped: e.unmapped,
      flag: e.unmapped ? "UNMAPPED_BILLED_PRODUCT" : null,
    }));

    // ── 7. PRICE ID AUDIT ──────────────────────────────────────────────────────
    const priceAuditMap = new Map<string, {
      price_id: string; product_id: string; amount_cents: number; interval: string;
      current_users: Set<string>; historical_users: Set<string>;
      canonical_plan: string; is_active: boolean;
    }>();

    for (const r of billingRows) {
      const prid = r.stripe_price_id;
      if (!prid) continue;
      if (!priceAuditMap.has(prid)) {
        priceAuditMap.set(prid, {
          price_id: prid, product_id: r.stripe_product_id || "",
          amount_cents: r.amount_cents || 0, interval: r.billing_interval || "",
          current_users: new Set(), historical_users: new Set(),
          canonical_plan: r.canonical_plan_key || "",
          is_active: priceIdMap[prid] != null,
        });
      }
      const entry = priceAuditMap.get(prid)!;
      const key = String(r.user_id || r.email || "");
      if (r.is_current && key) entry.current_users.add(key);
      if (!r.is_current && key) entry.historical_users.add(key);
    }

    const priceAudit = [...priceAuditMap.values()].map(e => ({
      price_id: e.price_id, product_id: e.product_id,
      amount_cents: e.amount_cents, interval: e.interval,
      current_users: e.current_users.size,
      historical_users: e.historical_users.size,
      canonical_plan: e.canonical_plan,
      active: e.is_active ? "active" : "archived",
    }));

    // ── 8. BUNDLE SUBSCRIBER PROOF ─────────────────────────────────────────────
    // Search BOTH ActiveContract-derived billing rows AND Subscription records
    // for bundle evidence (point #12: search ALL sources)
    const bundleRows = billingRows.filter(r =>
      r.plan_type === 'bundle' || (r.modules.length > 1 && r.bundle_type)
    );
    const bundleProof = bundleRows.map(r => ({
      email: r.email,
      user_id: r.user_id,
      provider_subscription_id: r.provider_subscription_id,
      stripe_product_id: r.stripe_product_id,
      stripe_price_id: r.stripe_price_id,
      stripe_product_name: r.stripe_product_name,
      canonical_bundle: r.bundle_type || r.plan_family,
      modules: r.modules,
      lifecycle: r.lifecycle_classification,
      current: r.is_current ? "current" : "historical",
      amount_cents: r.amount_cents,
      interval: r.billing_interval,
      plan_key: r.canonical_plan_key,
      product_resolution_source: r.product_resolution_source,
      source_entity: "ActiveContract",
    }));

    // Also search Subscription records for bundle evidence not in ActiveContract
    const billingRowSubIds = new Set(billingRows.map(r => r.provider_subscription_id).filter(Boolean));
    for (const s of allSubs) {
      const subId = s.provider_subscription_id || s.stripe_subscription_id || "";
      if (subId && billingRowSubIds.has(subId)) continue; // already in billing rows

      const planKey = s.plan_key || "";
      const planDisplay = planKey ? PLAN_DISPLAY[planKey] : null;
      const isBundleSub = planDisplay?.plan_type === 'bundle' ||
        s.product_kind === 'founders' || s.product_kind === 'bundle_3' || s.product_kind === 'bundle_4' ||
        s.checkout_type === 'bundle_2' || s.checkout_type === 'bundle_3' || s.checkout_type === 'bundle_4' ||
        (s.modules_csv && s.modules_csv.split(',').length > 1);

      if (!isBundleSub) continue;

      // Resolve bundle display from plan_key
      const bundleDisplay = planDisplay?.display_name ||
        (s.product_kind === 'founders' || s.checkout_type === 'bundle_2' ? 'Founders Bundle' :
         s.product_kind === 'bundle_3' || s.checkout_type === 'bundle_3' ? 'Three-Module Bundle' :
         s.product_kind === 'bundle_4' || s.checkout_type === 'bundle_4' ? 'Four-Module Bundle' : 'Unknown Bundle');
      const modulesFromCsv = s.modules_csv ? s.modules_csv.split(',').map((m: string) => m.trim().toLowerCase()).filter(Boolean) :
        (planDisplay?.modules || []);

      const subStatus = String(s.status || 'unknown').toLowerCase();
      const isCurrentSub = ['active', 'trialing', 'past_due'].includes(subStatus) &&
        !isExpired(s.current_period_end);

      bundleProof.push({
        email: s.user_email,
        user_id: s.user_id,
        provider_subscription_id: subId || undefined,
        stripe_product_id: s.product_id || undefined,
        stripe_price_id: undefined,
        stripe_product_name: undefined,
        canonical_bundle: bundleDisplay,
        modules: modulesFromCsv,
        lifecycle: isCurrentSub ? "PROVIDER_ACTIVE" : "HISTORICAL",
        current: isCurrentSub ? "current" : "historical",
        amount_cents: s.amount ? Math.round(s.amount * 100) : undefined,
        interval: s.billing_interval || undefined,
        plan_key: planKey || undefined,
        product_resolution_source: "subscription_plan_key",
        source_entity: "Subscription",
      });
    }

    // ── 9. DATA QUALITY / ANOMALIES ────────────────────────────────────────────
    const anomalies: any[] = [];
    const unmappedProducts = productAudit.filter(p => p.unmapped);
    if (unmappedProducts.length > 0) {
      anomalies.push({ type: "UNMAPPED_BILLED_PRODUCT", count: unmappedProducts.length, detail: unmappedProducts });
    }
    const paidNoEntitlement = billingRows.filter(r => r.anomaly_codes.includes("PAID_NO_ENTITLEMENT"));
    if (paidNoEntitlement.length > 0) {
      anomalies.push({ type: "PAID_NO_ENTITLEMENT", count: paidNoEntitlement.length, detail: paidNoEntitlement.map(r => ({ email: r.email, user_id: r.user_id, plan: r.plan_family, provider: r.provider })) });
    }
    const entitlementWithoutContract = billingRows.filter(r => r.anomaly_codes.includes("ENTITLEMENT_WITHOUT_CONTRACT"));
    if (entitlementWithoutContract.length > 0) {
      anomalies.push({ type: "ENTITLEMENT_WITHOUT_CONTRACT", count: entitlementWithoutContract.length });
    }
    const productConflicts = billingRows.filter(r => r.anomaly_codes.includes("PRODUCT_CONFLICT"));
    if (productConflicts.length > 0) {
      anomalies.push({ type: "PRODUCT_CONFLICT", count: productConflicts.length, detail: productConflicts.map(r => ({ email: r.email, contract_id: r.canonical_contract_id })) });
    }
    const bundleLostModules = billingRows.filter(r => r.anomaly_codes.includes("BUNDLE_LOST_MODULE_IDENTITY"));
    if (bundleLostModules.length > 0) {
      anomalies.push({ type: "BUNDLE_LOST_MODULE_IDENTITY", count: bundleLostModules.length, detail: bundleLostModules.map(r => ({ email: r.email, plan: r.plan_family, modules: r.modules })) });
    }
    if (staleLocalContracts.length > 0) {
      anomalies.push({ type: "STALE_LOCAL_CONTRACT", count: staleLocalContracts.length, detail: staleLocalContracts });
    }

    // ── 10. PER-USER BILLING LEDGER ────────────────────────────────────────────
    const userLedgerMap = new Map<string, any>();
    for (const r of billingRows) {
      const key = String(r.user_id || r.email || "");
      if (!key) continue;
      if (!userLedgerMap.has(key)) {
        userLedgerMap.set(key, {
          user_id: r.user_id,
          email: r.email,
          contracts: [],
          current_plans: new Set<string>(),
          historical_plans: new Set<string>(),
          current_providers: new Set<string>(),
          first_paid_date: null,
          latest_renewal: null,
        });
      }
      const ledger = userLedgerMap.get(key)!;
      ledger.contracts.push({
        contract_id: r.canonical_contract_id,
        provider: r.provider,
        plan: r.plan_family,
        modules: r.modules,
        interval: r.billing_interval,
        amount_cents: r.amount_cents,
        lifecycle: r.lifecycle_classification,
        is_current: r.is_current,
        period_end: r.current_paid_through_date,
        product_id: r.stripe_product_id,
        price_id: r.stripe_price_id,
      });
      if (r.is_current) {
        if (r.plan_family) ledger.current_plans.add(r.plan_family);
        ledger.current_providers.add(r.provider);
      } else {
        if (r.plan_family) ledger.historical_plans.add(r.plan_family);
      }
      if (r.first_paid_date && (!ledger.first_paid_date || r.first_paid_date < ledger.first_paid_date)) {
        ledger.first_paid_date = r.first_paid_date;
      }
      if (r.renewal_date && (!ledger.latest_renewal || r.renewal_date > ledger.latest_renewal)) {
        ledger.latest_renewal = r.renewal_date;
      }
    }
    const userLedger = [...userLedgerMap.values()].map(l => ({
      ...l,
      current_plans: [...l.current_plans],
      historical_plans: [...l.historical_plans],
      current_providers: [...l.current_providers],
      contract_count: l.contracts.length,
    }));

    // ── 11. REVENUE ────────────────────────────────────────────────────────────
    // Compute entitled keys from UserEntitlement records (has_access === true)
    const entitledKeys = new Set<string>();
    for (const ue of allEntitlements) {
      if (ue.has_access === true) {
        const key = String(ue.user_id || ue.user_email || "");
        if (key) entitledKeys.add(key);
      }
    }

    const currentMrr = currentRows.reduce((sum, r) => sum + (r.mrr_cents || 0), 0);
    const currentArr = currentMrr * 12;

    // ── 12. BUILD FINAL REPORT ─────────────────────────────────────────────────
    const report = {
      generated_at: new Date().toISOString(),
      audit_version: "canonical_billing_dataset_v1",
      stripe_live_verified: stripeAvailable,

      record_totals: {
        total_users: allUsers.length,
        total_subscription_records: allSubs.length,
        total_active_contract_records: allContracts.length,
        total_user_entitlement_records: allEntitlements.length,
        total_subscription_event_records: allEvents.length,
        total_registry_entries: (registry as any[]).length,
      },

      // ── CURRENT BILLING SUMMARY ──────────────────────────────────────────────
      current_billing_summary: {
        current_paying_users: new Set(currentRows.map(r => String(r.user_id || r.email || "")).filter(Boolean)).size,
        current_contracts: currentRows.length,
        current_entitled_users: entitledKeys.size,
        mrr_cents: currentMrr,
        arr_cents: currentArr,
        mrr: currentMrr / 100,
        arr: currentArr / 100,
      },

      // ── PAYING USERS BY PROVIDER ─────────────────────────────────────────────
      by_provider: {
        stripe: providerUserSets.stripe.size,
        apple_verified: providerUserSets.apple_verified.size,
        apple_provisional: providerUserSets.apple_provisional.size,
        google: providerUserSets.google.size,
        manual: providerUserSets.manual.size,
        other: providerUserSets.other.size,
        multi_provider_users: multiProviderUsers.size,
        note: "A user can have multiple current providers. Totals do not sum to unique paying users.",
      },

      // ── PAYING USERS BY PLAN ─────────────────────────────────────────────────
      by_plan: Object.fromEntries(
        Object.entries(planUserSets).map(([family, users]) => [
          family,
          {
            current_paying_users: users.size,
            current_contracts: planContractSets[family]?.size || 0,
            mrr_cents: planMrr[family] || 0,
            mrr: (planMrr[family] || 0) / 100,
          },
        ])
      ),

      // ── ENTITLED USERS BY MODULE ─────────────────────────────────────────────
      by_module: {
        pipekeeper: {
          paid_entitlement_users: modulePaidSets.pipekeeper.size,
          non_paid_entitlement_users: moduleNonPaidSets.pipekeeper.size,
          total_entitled_users: new Set([...modulePaidSets.pipekeeper, ...moduleNonPaidSets.pipekeeper]).size,
        },
        whiskeykeeper: {
          paid_entitlement_users: modulePaidSets.whiskeykeeper.size,
          non_paid_entitlement_users: moduleNonPaidSets.whiskeykeeper.size,
          total_entitled_users: new Set([...modulePaidSets.whiskeykeeper, ...moduleNonPaidSets.whiskeykeeper]).size,
        },
        cigarkeeper: {
          paid_entitlement_users: modulePaidSets.cigarkeeper.size,
          non_paid_entitlement_users: moduleNonPaidSets.cigarkeeper.size,
          total_entitled_users: new Set([...modulePaidSets.cigarkeeper, ...moduleNonPaidSets.cigarkeeper]).size,
        },
        winekeeper: {
          paid_entitlement_users: modulePaidSets.winekeeper.size,
          non_paid_entitlement_users: moduleNonPaidSets.winekeeper.size,
          total_entitled_users: new Set([...modulePaidSets.winekeeper, ...moduleNonPaidSets.winekeeper]).size,
        },
      },

      // ── HISTORICAL / EVER PURCHASED ──────────────────────────────────────────
      historical_by_plan: Object.fromEntries(
        Object.entries(historicalPlanSets).map(([family, users]) => [family, { ever_purchased_users: users.size }])
      ),

      // ── PRODUCT ID AUDIT ─────────────────────────────────────────────────────
      product_id_audit: productAudit,

      // ── PRICE ID AUDIT ────────────────────────────────────────────────────────
      price_id_audit: priceAudit,

      // ── BUNDLE SUBSCRIBER PROOF ───────────────────────────────────────────────
      bundle_subscriber_proof: {
        total_bundle_rows: bundleProof.length,
        current_bundle_subscribers: bundleProof.filter(r => r.current === "current").length,
        historical_bundle_subscribers: bundleProof.filter(r => r.current === "historical").length,
        detail: bundleProof,
      },

      // ── DATA QUALITY / ANOMALIES ─────────────────────────────────────────────
      data_quality: {
        total_anomalies: anomalies.reduce((sum: number, a: any) => sum + (a.count || 0), 0),
        total_anomaly_categories: anomalies.length,
        stale_local_contracts: staleLocalContracts.length,
        unmapped_products: unmappedProducts.length,
        paid_no_entitlement: paidNoEntitlement.length,
        entitlement_without_contract: entitlementWithoutContract.length,
        product_conflicts: productConflicts.length,
        bundle_lost_module_identity: bundleLostModules.length,
      },
      anomalies: {
        total: anomalies.length,
        detail: anomalies,
      },

      // ── ROW-LEVEL BILLING DATA ───────────────────────────────────────────────
      billing_rows: billingRows,
      billing_rows_summary: {
        total: billingRows.length,
        current: billingRows.filter(r => r.is_current).length,
        historical: billingRows.filter(r => !r.is_current).length,
        provider_resolved: billingRows.filter(r => r.product_identity_classification === "PROVIDER_RESOLVED").length,
        legacy_resolved: billingRows.filter(r => r.product_identity_classification === "LEGACY_RESOLVED").length,
        amount_inferred: billingRows.filter(r => r.product_identity_classification === "AMOUNT_INFERRED").length,
        unresolved: billingRows.filter(r => r.product_identity_classification === "UNRESOLVED").length,
      },

      // ── ROW-LEVEL HISTORICAL BILLING DATA ────────────────────────────────────
      historical_billing_rows: historicalBillingRows,
      historical_billing_rows_summary: {
        total: historicalBillingRows.length,
        from_active_contract: historicalBillingRows.filter(r => r.source_entity === "ActiveContract").length,
        from_subscription: historicalBillingRows.filter(r => r.source_entity === "Subscription").length,
        checkout_explicit: historicalBillingRows.filter(r => r.product_identity_classification === "CHECKOUT_EXPLICIT").length,
        provider_explicit: historicalBillingRows.filter(r => r.product_identity_classification === "PROVIDER_EXPLICIT").length,
        registry_resolved: historicalBillingRows.filter(r => r.product_identity_classification === "REGISTRY_RESOLVED").length,
        internal_explicit: historicalBillingRows.filter(r => r.product_identity_classification === "INTERNAL_EXPLICIT").length,
        multi_item_bundle: historicalBillingRows.filter(r => r.product_identity_classification === "MULTI_ITEM_BUNDLE").length,
        env_price_resolved: historicalBillingRows.filter(r => r.product_identity_classification === "ENV_PRICE_RESOLVED").length,
        product_name_resolved: historicalBillingRows.filter(r => r.product_identity_classification === "PRODUCT_NAME_RESOLVED").length,
        amount_inferred: historicalBillingRows.filter(r => r.product_identity_classification === "AMOUNT_INFERRED").length,
        unresolved: historicalBillingRows.filter(r => r.product_identity_classification === "UNRESOLVED").length,
      },

      // ── MULTI-ITEM SUBSCRIPTION ANALYSIS ──────────────────────────────────────
      multi_item_subscription_analysis: {
        single_item_count: historicalBillingRows.filter(r => (r.stripe_item_count || 1) === 1).length,
        multi_item_count: historicalBillingRows.filter(r => (r.stripe_item_count || 1) > 1).length,
        multi_item_rows: historicalBillingRows.filter(r => (r.stripe_item_count || 1) > 1).map(r => ({
          email: r.email,
          provider_subscription_id: r.provider_subscription_id,
          item_count: r.stripe_item_count,
          plan_family: r.plan_family,
          modules: r.modules,
          classification: r.product_identity_classification,
        })),
      },

      // ── PER-USER BILLING LEDGER ──────────────────────────────────────────────
      user_ledger: userLedger,

      // ── CANONICAL PLAN CATALOG ────────────────────────────────────────────────
      plan_catalog: Object.fromEntries(
        Object.entries(PLAN_DISPLAY).map(([key, info]) => [key, {
          display_name: info.display_name,
          plan_type: info.plan_type,
          modules: info.modules,
        }])
      ),

      stale_local_contracts: {
        total: staleLocalContracts.length,
        detail: staleLocalContracts,
      },

      note: "Canonical billing dataset v1: (1) LIVE Stripe API verification, (2) Product identity via StripeProductRegistry (Product ID is durable key), (3) Lifecycle via reconcileContractV2, (4) Plan and module are SEPARATE dimensions, (5) Provider is a Set from ALL contracts, (6) Entitlements indexed per-user (not overwritten), (7) No email-based subscription matching, (8) No fallback suppression, (9) READ-ONLY.",
    };

    console.log("[getCanonicalBillingDataset] Complete:", {
      current_paying: report.current_billing_summary.current_paying_users,
      current_contracts: report.current_billing_summary.current_contracts,
      stripe_verified: report.by_provider.stripe,
      by_plan: Object.fromEntries(Object.entries(report.by_plan).map(([k, v]: any) => [k, v.current_paying_users])),
      bundle_rows: report.bundle_subscriber_proof.total_bundle_rows,
    });

    return Response.json(report);
  } catch (error) {
    console.error("[getCanonicalBillingDataset] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});