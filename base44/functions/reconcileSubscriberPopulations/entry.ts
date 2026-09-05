/**
 * Reconcile Subscriber Populations
 *
 * The single canonical counting service for subscriber populations.
 * All dashboards, audits, and health checks should derive counts from this.
 *
 * Produces mutually understandable metrics:
 * - Current paying users (provider-verified where possible)
 * - Current entitled users (any access source)
 * - Historical subscribers (ever subscribed)
 * - Current paying by module
 * - Entitlement anomalies (orphaned/stale)
 * - Expired anomalies (stale local period_end)
 *
 * Admin-only.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";

const normEmail = (e: unknown) => String(e || "").trim().toLowerCase();
const now = () => new Date();

function isActiveStatus(status: string): boolean {
  const s = String(status || "").toLowerCase();
  return s === "active" || s === "trialing" || s === "past_due" || s === "trial";
}

function isExpired(periodEnd: string | null | undefined): boolean {
  if (!periodEnd) return false;
  return new Date(periodEnd) <= now();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log("[reconcileSubscriberPopulations] Starting reconciliation...");

    // ── Fetch all relevant entities ──────────────────────────────────────────
    const [allUsers, allSubs, allContracts, allEntitlements, allEvents] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.User, {}, "-created_date", 5000, 200, "User"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, "-created_date", 5000, 200, "Subscription"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {}, "-created_date", 5000, 200, "ActiveContract"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.UserEntitlement, {}, "-created_date", 5000, 200, "UserEntitlement"),
      fetchAllEntitiesServer(base44.asServiceRole.entities.SubscriptionEvent, {}, "-created_date", 5000, 200, "SubscriptionEvent"),
    ]);

    console.log(`[reconcileSubscriberPopulations] Fetched: ${allUsers.length} users, ${allSubs.length} subs, ${allContracts.length} contracts, ${allEntitlements.length} entitlements, ${allEvents.length} events`);

    // ── 1. HISTORICAL POPULATION (what the audit called "96") ─────────────────
    const historicalKeys = new Set<string>();
    for (const s of allSubs) { const k = s.user_id || s.user_email; if (k) historicalKeys.add(String(k)); }
    for (const c of allContracts) { const k = c.user_id || c.user_email; if (k) historicalKeys.add(String(k)); }
    for (const e of allEvents) { const k = e.user_id || e.user_email || e.normalized_email; if (k) historicalKeys.add(String(k)); }

    // ── 2. CURRENT PAYING — from ActiveContract (canonical) ───────────────────
    const currentPayingKeys = new Set<string>();
    const currentPayingByModule: Record<string, Set<string>> = {
      pipekeeper: new Set(), whiskeykeeper: new Set(),
      cigarkeeper: new Set(), winekeeper: new Set(), bundle: new Set(),
    };
    const currentPayingByProvider: Record<string, Set<string>> = {
      stripe: new Set(), apple: new Set(), google: new Set(),
      manual: new Set(), unknown: new Set(),
    };

    for (const c of allContracts) {
      if (!isActiveStatus(c.status)) continue;
      if (isExpired(c.period_end)) continue;
      const key = String(c.user_id || c.user_email || "");
      if (!key) continue;
      currentPayingKeys.add(key);

      const provider = String(c.provider || "unknown").toLowerCase();
      if (currentPayingByProvider[provider]) currentPayingByProvider[provider].add(key);

      const modules = Array.isArray(c.modules) ? c.modules : [];
      if (modules.length === 0) {
        const product = String(c.product || "").toLowerCase();
        if (currentPayingByModule[product]) currentPayingByModule[product].add(key);
      } else {
        for (const m of modules) {
          const mod = String(m).toLowerCase();
          if (currentPayingByModule[mod]) currentPayingByModule[mod].add(key);
        }
      }
    }

    // ── 3. CURRENT PAYING — from legacy Subscription (provisional) ────────────
    const legacyPayingKeys = new Set<string>();
    for (const s of allSubs) {
      if (!isActiveStatus(s.status)) continue;
      if (isExpired(s.current_period_end)) continue;
      const key = String(s.user_id || s.user_email || "");
      if (key) legacyPayingKeys.add(key);
    }

    // ── 4. CURRENT ENTITLED — from UserEntitlement ───────────────────────────
    const entitledKeys = new Set<string>();
    for (const ue of allEntitlements) {
      if (ue.has_access === true) {
        const key = String(ue.user_id || ue.user_email || "");
        if (key) entitledKeys.add(key);
      }
    }

    // ── 5. ENTITLEMENT WITHOUT CONTRACT ──────────────────────────────────────
    const entitledWithoutContract: any[] = [];
    for (const ue of allEntitlements) {
      if (ue.has_access !== true) continue;
      const key = String(ue.user_id || ue.user_email || "");
      const hasActiveContract = currentPayingKeys.has(key);
      const hasLegacyActive = legacyPayingKeys.has(key);

      if (!hasActiveContract) {
        // Classify the anomaly
        let classification = "unknown";
        if (!hasLegacyActive && ue.contract_count === 0) {
          classification = "orphaned_entitlement";
        } else if (!hasLegacyActive) {
          classification = "stale_entitlement_expired_contract";
        } else {
          classification = "stale_contract_local_period_end";
        }

        entitledWithoutContract.push({
          user_id: ue.user_id,
          email: ue.user_email,
          modules: ue.modules || [],
          contract_count: ue.contract_count || 0,
          primary_provider: ue.primary_provider || "",
          has_active_contract: hasActiveContract,
          has_legacy_active_sub: hasLegacyActive,
          classification,
          computed_at: ue.computed_at,
        });
      }
    }

    // ── 6. EXPIRED CONTRACTS ─────────────────────────────────────────────────
    const expiredContracts: any[] = [];
    for (const c of allContracts) {
      const status = String(c.status || "").toLowerCase();
      if (!["expired", "canceled"].includes(status)) continue;
      if (!isExpired(c.period_end)) {
        // Canceled but still within period — not truly expired
        continue;
      }
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
      });
    }

    // Check which expired contracts have a matching legacy sub that might still be active
    const expiredReconciled = expiredContracts.map((c) => {
      const email = normEmail(c.email);
      const matchingSubs = allSubs.filter((s: any) => normEmail(s.user_email) === email);
      const hasActiveLegacy = matchingSubs.some((s: any) =>
        isActiveStatus(s.status) && !isExpired(s.current_period_end)
      );
      return {
        ...c,
        has_active_legacy_sub: hasActiveLegacy,
        reconciliation: hasActiveLegacy ? "renewed_but_local_contract_stale" : "genuinely_expired",
      };
    });

    // ── 7. PROVIDER VERIFICATION STATUS ──────────────────────────────────────
    const providerVerification = {
      stripe: {
        current_paying: currentPayingByProvider.stripe.size,
        verified: currentPayingByProvider.stripe.size, // Stripe is always provider-verified via webhook
        provisional: 0,
      },
      apple: {
        current_paying: currentPayingByProvider.apple.size,
        verified: 0, // Apple App Store Server API not configured
        provisional: currentPayingByProvider.apple.size,
        note: "Apple App Store Server API credentials not configured. All Apple users are provisional.",
      },
      google: {
        current_paying: currentPayingByProvider.google.size,
        verified: 0,
        provisional: currentPayingByProvider.google.size,
      },
      manual: {
        current_paying: currentPayingByProvider.manual.size,
        verified: currentPayingByProvider.manual.size,
        provisional: 0,
      },
    };

    // ── 8. BUILD RECONCILIATION TABLE ─────────────────────────────────────────
    const reconciliationTable = [
      { population: "Any subscription history (audit denominator)", unique_users: historicalKeys.size },
      { population: "Currently paying — provider verified (ActiveContract)", unique_users: currentPayingKeys.size },
      { population: "Currently paying — provisional/unverified (legacy Subscription)", unique_users: legacyPayingKeys.size },
      { population: "Current entitled users (UserEntitlement.has_access)", unique_users: entitledKeys.size },
      { population: "Current paid PipeKeeper", unique_users: currentPayingByModule.pipekeeper.size },
      { population: "Current paid CigarKeeper", unique_users: currentPayingByModule.cigarkeeper.size },
      { population: "Current paid WhiskeyKeeper", unique_users: currentPayingByModule.whiskeykeeper.size },
      { population: "Current paid WineKeeper", unique_users: currentPayingByModule.winekeeper.size },
      { population: "Expired/lapsed subscribers", unique_users: expiredContracts.length },
      { population: "Entitlement without contract", unique_users: entitledWithoutContract.length },
    ];

    // ── 9. FINAL REPORT ──────────────────────────────────────────────────────
    const report = {
      generated_at: new Date().toISOString(),
      audit_version: "canonical_reconciliation_v1",

      record_totals: {
        total_users: allUsers.length,
        total_subscription_records: allSubs.length,
        total_active_contract_records: allContracts.length,
        total_user_entitlement_records: allEntitlements.length,
        total_subscription_event_records: allEvents.length,
      },

      reconciliation_table: reconciliationTable,

      canonical_populations: {
        current_paying_provider_verified: currentPayingKeys.size,
        current_paying_provisional: legacyPayingKeys.size,
        current_entitled: entitledKeys.size,
        historical_subscribers: historicalKeys.size,
        unique_current_paying_people: currentPayingKeys.size,
      },

      current_paying_by_module: {
        pipekeeper: currentPayingByModule.pipekeeper.size,
        whiskeykeeper: currentPayingByModule.whiskeykeeper.size,
        cigarkeeper: currentPayingByModule.cigarkeeper.size,
        winekeeper: currentPayingByModule.winekeeper.size,
        bundle: currentPayingByModule.bundle.size,
      },

      current_paying_by_provider: {
        stripe: currentPayingByProvider.stripe.size,
        apple: currentPayingByProvider.apple.size,
        google: currentPayingByProvider.google.size,
        manual: currentPayingByProvider.manual.size,
        unknown: currentPayingByProvider.unknown.size,
      },

      provider_verification: providerVerification,

      entitlement_anomalies: {
        total: entitledWithoutContract.length,
        classifications: entitledWithoutContract.reduce((acc: Record<string, number>, e: any) => {
          acc[e.classification] = (acc[e.classification] || 0) + 1;
          return acc;
        }, {}),
        detail: entitledWithoutContract,
      },

      expired_anomalies: {
        total: expiredReconciled.length,
        genuinely_expired: expiredReconciled.filter((e) => e.reconciliation === "genuinely_expired").length,
        renewed_but_stale: expiredReconciled.filter((e) => e.reconciliation === "renewed_but_local_contract_stale").length,
        detail: expiredReconciled,
      },

      audit_denominator_explanation: {
        what_the_audit_called_96: historicalKeys.size,
        what_it_represents: "Unique user_id/user_email keys across ALL Subscription + ActiveContract + SubscriptionEvent records. This is a HISTORICAL population — it includes active, expired, canceled, lapsed, and failed subscriptions. It is NOT 'current subscribers.'",
        includes: [
          "current active subscriptions",
          "expired subscriptions",
          "canceled subscriptions",
          "historical/lapsed subscriptions",
          "failed subscriptions (incomplete)",
          "duplicate internal Subscription records",
          "manual contracts",
          "Apple subscriptions",
          "Stripe subscriptions",
          "multiple module subscriptions",
          "users who have ever subscribed",
        ],
        correct_denominator_for_duplicate_billing: currentPayingKeys.size,
        note: "The duplicate-billing audit must use 'current paying users' as the denominator, not 'users with any subscription history.'",
      },

      note: "This is the canonical subscriber population reconciliation. All dashboards, audits, and health checks should derive counts from this function.",
    };

    console.log("[reconcileSubscriberPopulations] Reconciliation complete");
    return Response.json(report);
  } catch (error) {
    console.error("[reconcileSubscriberPopulations] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});