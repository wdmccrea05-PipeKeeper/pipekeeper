/**
 * Audit Duplicate Billing
 *
 * Re-runs the production duplicate-billing audit using the CORRECTED detector.
 *
 * The previous audit flagged any user with multiple subscription records as a
 * "conflict" — which was too broad. This audit uses the corrected logic that:
 * - Compares entitlement scope (modules), not tier names
 * - Detects temporal overlap of billing periods
 * - Reconciles with charge evidence from SubscriptionEvent
 * - Classifies into: NO_CONFLICT, HISTORICAL_OVERLAP_NO_CHARGE,
 *   POTENTIAL_DUPLICATE_SUBSCRIPTION, CONFIRMED_DUPLICATE_BILLING, MANUAL_REVIEW
 *
 * Admin-only. Returns the full classification report.
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.46";
import { fetchAllEntitiesServer } from "../../shared/fetchAllEntitiesServer.ts";
import {
  detectDuplicateBilling,
  summarizeAudit,
  type ChargeEvidence,
} from "../../shared/duplicateBillingDetector.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[auditDuplicateBilling] Starting corrected audit...');

    // ── Fetch all subscription-related records ──────────────────────────────
    const [allSubs, allContracts, allEvents] = await Promise.all([
      fetchAllEntitiesServer(base44.asServiceRole.entities.Subscription, {}, '-created_date', 5000, 200, 'Subscription'),
      fetchAllEntitiesServer(base44.asServiceRole.entities.ActiveContract, {}, '-created_date', 5000, 200, 'ActiveContract'),
      fetchAllEntitiesServer(base44.asServiceRole.entities.SubscriptionEvent, {}, '-created_date', 5000, 200, 'SubscriptionEvent'),
    ]);

    console.log(`[auditDuplicateBilling] Fetched: ${allSubs.length} subs, ${allContracts.length} contracts, ${allEvents.length} events`);

    // ── Group records by user ───────────────────────────────────────────────
    const users = new Map<string, {
      subs: any[];
      contracts: any[];
      events: any[];
      email: string;
    }>();

    const getUserBucket = (key: string, email?: string) => {
      if (!users.has(key)) {
        users.set(key, { subs: [], contracts: [], events: [], email: email || key });
      }
      return users.get(key)!;
    };

    for (const sub of allSubs) {
      const key = sub.user_id || sub.user_email;
      if (!key) continue;
      getUserBucket(String(key), sub.user_email).subs.push(sub);
    }

    for (const contract of allContracts) {
      const key = contract.user_id || contract.user_email;
      if (!key) continue;
      getUserBucket(String(key), contract.user_email).contracts.push(contract);
    }

    for (const event of allEvents) {
      const key = event.user_id || event.user_email || event.normalized_email;
      if (!key) continue;
      getUserBucket(String(key), event.user_email || event.normalized_email).events.push(event);
    }

    console.log(`[auditDuplicateBilling] Found ${users.size} unique users with subscription records`);

    // ── Run detector for each user ──────────────────────────────────────────
    const perUserResults = new Map<string, any[]>();
    const flaggedUsers: any[] = [];
    let usersWithMultipleRecords = 0;

    for (const [userKey, data] of users) {
      const allRecords = [...data.subs, ...data.contracts];

      // Build charge evidence from successful payment events
      const charges: ChargeEvidence[] = data.events
        .filter((e: any) => e.is_successful_payment)
        .map((e: any) => ({
          event_id: String(e.event_id || e.id || ''),
          transaction_at: String(e.transaction_at || e.created_date || ''),
          amount_cents: Number(e.amount_cents || 0),
          currency: String(e.currency || 'usd'),
          provider_subscription_id: String(e.provider_subscription_id || ''),
        }));

      const conflicts = detectDuplicateBilling(allRecords, charges);
      perUserResults.set(userKey, conflicts);

      if (allRecords.length > 1) {
        usersWithMultipleRecords++;
      }

      if (conflicts.length > 0) {
        flaggedUsers.push({
          user_key: userKey,
          email: data.email,
          subscription_count: data.subs.length,
          contract_count: data.contracts.length,
          event_count: data.events.length,
          conflicts: conflicts.map(c => ({
            classification: c.classification,
            module: c.module,
            obligations: c.obligations.map(o => ({
              id: o.id,
              source: o.source,
              provider: o.provider,
              billing_interval: o.billing_interval,
              status: o.status,
              is_currently_active: o.is_currently_active,
              is_billable: o.is_billable,
              period_start: o.period_start,
              period_end: o.period_end,
            })),
            overlapping_period: c.overlapping_period,
            charges: c.charges,
            total_duplicate_charge_cents: c.total_duplicate_charge_cents,
            currency: c.currency,
            description: c.description,
            requires_refund: c.requires_refund,
            requires_admin_review: c.requires_admin_review,
          })),
        });
      }
    }

    // ── Build summary ──────────────────────────────────────────────────────
    const summary = summarizeAudit(perUserResults);

    // Add additional context
    const report = {
      audit_timestamp: new Date().toISOString(),
      audit_version: 'corrected_v2',
      summary: {
        ...summary,
        users_with_multiple_records: usersWithMultipleRecords,
        total_subscription_records: allSubs.length,
        total_active_contract_records: allContracts.length,
        total_subscription_events: allEvents.length,
      },
      flagged_users: flaggedUsers,
      classification_legend: {
        NO_CONFLICT: 'Legitimate module separation or historical lifecycle.',
        HISTORICAL_OVERLAP_NO_CHARGE: 'Records overlap internally, but provider transaction history does not show duplicate successful billing. May require database cleanup but is NOT a customer refund incident.',
        POTENTIAL_DUPLICATE_SUBSCRIPTION: 'Two provider subscriptions overlap for the same entitlement, but charge evidence requires further investigation.',
        CONFIRMED_DUPLICATE_BILLING: 'Successful charges occurred for overlapping subscriptions covering the same entitlement during the same billing period. Enters refund-remediation workflow.',
        MANUAL_REVIEW: 'Evidence is insufficient to determine customer intent or billing status safely.',
      },
      note: 'Previous audit result (30 of 96 users with conflicts) is WITHDRAWN as unverified. This corrected audit uses entitlement scope, temporal overlap, and charge evidence to classify conflicts.',
    };

    console.log('[auditDuplicateBilling] Audit complete:', JSON.stringify(report.summary, null, 2));

    return Response.json(report);
  } catch (error) {
    console.error('[auditDuplicateBilling] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});