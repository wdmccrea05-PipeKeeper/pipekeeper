/**
 * Duplicate Billing Detector
 *
 * Corrected conflict detection that:
 * - Compares entitlement SCOPE (modules), not tier names or user identity
 * - Detects temporal overlap of billing periods
 * - Reconciles with charge evidence from SubscriptionEvent
 * - Classifies into: NO_CONFLICT, HISTORICAL_OVERLAP_NO_CHARGE,
 *   POTENTIAL_DUPLICATE_SUBSCRIPTION, CONFIRMED_DUPLICATE_BILLING, MANUAL_REVIEW
 *
 * Key principles:
 * - Multiple subscription records are NOT inherently a conflict.
 * - Different modules (PipeKeeper + WhiskeyKeeper) = legitimate.
 * - Historical/lapsed/renewed subscriptions = legitimate.
 * - Canceled-then-repurchased = legitimate.
 * - Failed/abandoned checkout (incomplete) = not a billing obligation.
 * - Only CONFIRMED_DUPLICATE_BILLING enters the refund-remediation workflow.
 */

import {
  resolveEntitlementScope,
  scopesIntersect,
} from './entitlementScopeResolver.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionObligation {
  id: string;
  source: 'Subscription' | 'ActiveContract';
  provider: string;
  provider_subscription_id: string;
  module_scope: string[];
  billing_interval: string;
  status: string;
  period_start: string;
  period_end: string;
  started_at: string;
  canceled_at: string;
  created_date: string;
  is_currently_active: boolean;
  is_billable: boolean;
}

export interface ChargeEvidence {
  event_id: string;
  transaction_at: string;
  amount_cents: number;
  currency: string;
  provider_subscription_id: string;
}

export type ConflictClassification =
  | 'NO_CONFLICT'
  | 'HISTORICAL_OVERLAP_NO_CHARGE'
  | 'POTENTIAL_DUPLICATE_SUBSCRIPTION'
  | 'CONFIRMED_DUPLICATE_BILLING'
  | 'MANUAL_REVIEW';

export interface DuplicateBillingResult {
  classification: ConflictClassification;
  module: string;
  obligations: [SubscriptionObligation, SubscriptionObligation];
  overlapping_period: { start: string; end: string };
  charges: ChargeEvidence[];
  total_duplicate_charge_cents: number;
  currency: string;
  description: string;
  requires_refund: boolean;
  requires_admin_review: boolean;
}

// ── Status helpers ───────────────────────────────────────────────────────────

function isActiveStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

function isCanceledActiveThroughPeriodEnd(record: Record<string, unknown>): boolean {
  const status = String(record.status || '').toLowerCase();
  if (status !== 'canceled') return false;
  const cancelAtPeriodEnd = record.cancel_at_period_end;
  if (!cancelAtPeriodEnd) return false;
  const periodEnd = record.current_period_end || record.period_end;
  if (!periodEnd) return false;
  return new Date(periodEnd).getTime() > Date.now();
}

function isBillableObligation(record: Record<string, unknown>): boolean {
  const status = String(record.status || '').toLowerCase();
  if (status === 'incomplete') return false;
  if (status === 'expired') return false;
  if (isActiveStatus(status)) return true;
  if (isCanceledActiveThroughPeriodEnd(record)) return true;
  return false;
}

function isCurrentlyActive(record: Record<string, unknown>): boolean {
  return isBillableObligation(record);
}

// ── Period helpers ───────────────────────────────────────────────────────────

function getPeriodStart(record: Record<string, unknown>): string {
  return String(
    record.current_period_start || record.period_start || record.started_at ||
    record.subscriptionStartedAt || record.created_date || ''
  ).trim();
}

function getPeriodEnd(record: Record<string, unknown>): string {
  const periodEnd = record.current_period_end || record.period_end;
  if (periodEnd) return String(periodEnd).trim();
  const canceledAt = record.canceled_at;
  if (canceledAt) return String(canceledAt).trim();
  return '';
}

const FAR_FUTURE = Date.now() + 365 * 24 * 60 * 60 * 1000;

function periodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1 || 0).getTime();
  const e1 = new Date(end1 || FAR_FUTURE).getTime();
  const s2 = new Date(start2 || 0).getTime();
  const e2 = new Date(end2 || FAR_FUTURE).getTime();
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// ── Build obligation from record ─────────────────────────────────────────────

export function buildObligation(
  record: Record<string, unknown>,
  envPriceMap?: Record<string, string[]>
): SubscriptionObligation {
  const scope = resolveEntitlementScope(record, envPriceMap);
  return {
    id: String(record.id || ''),
    source: Array.isArray(record.modules) ? 'ActiveContract' : 'Subscription',
    provider: String(record.provider || 'unknown').toLowerCase(),
    provider_subscription_id: String(
      record.provider_subscription_id || record.stripe_subscription_id || ''
    ),
    module_scope: scope,
    billing_interval: String(record.billing_interval || '').toLowerCase(),
    status: String(record.status || '').toLowerCase(),
    period_start: getPeriodStart(record),
    period_end: getPeriodEnd(record),
    started_at: String(
      record.started_at || record.subscriptionStartedAt || record.created_date || ''
    ).trim(),
    canceled_at: String(record.canceled_at || '').trim(),
    created_date: String(record.created_date || '').trim(),
    is_currently_active: isCurrentlyActive(record),
    is_billable: isBillableObligation(record),
  };
}

// ── Main detector ────────────────────────────────────────────────────────────

export function detectDuplicateBilling(
  records: Record<string, unknown>[],
  charges: ChargeEvidence[] = []
): DuplicateBillingResult[] {
  const obligations = records.map(r => buildObligation(r));
  const results: DuplicateBillingResult[] = [];

  // Group obligations by module
  const byModule = new Map<string, SubscriptionObligation[]>();
  for (const ob of obligations) {
    for (const mod of ob.module_scope) {
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod)!.push(ob);
    }
  }

  for (const [mod, obs] of byModule) {
    if (obs.length <= 1) continue;

    // Find overlapping pairs
    for (let i = 0; i < obs.length; i++) {
      for (let j = i + 1; j < obs.length; j++) {
        const a = obs[i];
        const b = obs[j];

        if (!periodsOverlap(a.period_start, a.period_end, b.period_start, b.period_end)) {
          continue;
        }

        // Skip if neither is billable (both historical)
        if (!a.is_billable && !b.is_billable) continue;

        // Compute overlap window
        const overlapStart = new Date(Math.max(
          new Date(a.period_start || 0).getTime(),
          new Date(b.period_start || 0).getTime()
        )).toISOString();
        const overlapEndRaw = Math.min(
          new Date(a.period_end || FAR_FUTURE).getTime(),
          new Date(b.period_end || FAR_FUTURE).getTime()
        );
        const overlapEnd = new Date(overlapEndRaw).toISOString();

        // For charge evidence, check if each subscription has ANY successful charge
        // during its own billing period. A charge at the start of an annual period
        // covers the entire year, so we check against the subscription's full billing
        // period — not just the exact overlap window.
        const aStart = new Date(a.period_start || a.started_at || 0).getTime();
        const aEnd = new Date(a.period_end || FAR_FUTURE).getTime();
        const bStart = new Date(b.period_start || b.started_at || 0).getTime();
        const bEnd = new Date(b.period_end || FAR_FUTURE).getTime();

        const chargesA = charges.filter(c =>
          c.provider_subscription_id &&
          c.provider_subscription_id === a.provider_subscription_id &&
          new Date(c.transaction_at || 0).getTime() >= aStart &&
          new Date(c.transaction_at || 0).getTime() <= aEnd
        );
        const chargesB = charges.filter(c =>
          c.provider_subscription_id &&
          c.provider_subscription_id === b.provider_subscription_id &&
          new Date(c.transaction_at || 0).getTime() >= bStart &&
          new Date(c.transaction_at || 0).getTime() <= bEnd
        );

        // Charges within the overlap window (for refund amount calc)
        const overlapChargesA = chargesA.filter(c => {
          const t = new Date(c.transaction_at || 0).getTime();
          return t >= new Date(overlapStart).getTime() && t <= new Date(overlapEnd).getTime();
        });
        const overlapChargesB = chargesB.filter(c => {
          const t = new Date(c.transaction_at || 0).getTime();
          return t >= new Date(overlapStart).getTime() && t <= new Date(overlapEnd).getTime();
        });

        const hasChargesA = chargesA.length > 0;
        const hasChargesB = chargesB.length > 0;
        const bothHaveCharges = hasChargesA && hasChargesB;

        let classification: ConflictClassification;
        let requiresRefund = false;
        let requiresAdminReview = false;

        if (!a.is_billable || !b.is_billable) {
          // One is historical — not a current conflict
          classification = 'HISTORICAL_OVERLAP_NO_CHARGE';
        } else if (bothHaveCharges) {
          classification = 'CONFIRMED_DUPLICATE_BILLING';
          requiresRefund = true;
        } else if (a.is_currently_active && b.is_currently_active) {
          if (charges.length === 0) {
            // No charge data available — potential duplicate
            classification = 'POTENTIAL_DUPLICATE_SUBSCRIPTION';
          } else {
            // Charge data exists but didn't find overlapping charges for both
            classification = 'HISTORICAL_OVERLAP_NO_CHARGE';
          }
        } else {
          classification = 'MANUAL_REVIEW';
          requiresAdminReview = true;
        }

        const refundCharges = [...overlapChargesA, ...overlapChargesB];
        const totalDuplicate =
          chargesA.reduce((sum, c) => sum + (c.amount_cents || 0), 0) +
          chargesB.reduce((sum, c) => sum + (c.amount_cents || 0), 0);

        results.push({
          classification,
          module: mod,
          obligations: [a, b],
          overlapping_period: { start: overlapStart, end: overlapEnd },
          charges: refundCharges.length > 0 ? refundCharges : [...chargesA, ...chargesB],
          total_duplicate_charge_cents: totalDuplicate,
          currency: chargesA[0]?.currency || chargesB[0]?.currency || 'usd',
          description:
            `Module '${mod}': ${a.source}/${a.id} (${a.provider}, ${a.billing_interval}, status=${a.status}) ` +
            `overlaps ${b.source}/${b.id} (${b.provider}, ${b.billing_interval}, status=${b.status}). ` +
            `Classification: ${classification}.`,
          requires_refund: requiresRefund,
          requires_admin_review: requiresAdminReview,
        });
      }
    }
  }

  return results;
}

// ── Aggregate audit report ────────────────────────────────────────────────────

export interface AuditSummary {
  total_users_evaluated: number;
  users_with_multiple_records: number;
  legitimate_different_module: number;
  legitimate_historical_lapse_renewal: number;
  historical_overlap_no_charge: number;
  potential_duplicate_subscription: number;
  confirmed_duplicate_billing: number;
  manual_review: number;
  confirmed_charges_by_currency: Record<string, number>;
}

export function summarizeAudit(
  perUserResults: Map<string, DuplicateBillingResult[]>
): AuditSummary {
  const summary: AuditSummary = {
    total_users_evaluated: perUserResults.size,
    users_with_multiple_records: 0,
    legitimate_different_module: 0,
    legitimate_historical_lapse_renewal: 0,
    historical_overlap_no_charge: 0,
    potential_duplicate_subscription: 0,
    confirmed_duplicate_billing: 0,
    manual_review: 0,
    confirmed_charges_by_currency: {},
  };

  for (const [userId, conflicts] of perUserResults) {
    if (conflicts.length === 0) continue;
    summary.users_with_multiple_records++;

    const hasConfirmed = conflicts.some(c => c.classification === 'CONFIRMED_DUPLICATE_BILLING');
    const hasPotential = conflicts.some(c => c.classification === 'POTENTIAL_DUPLICATE_SUBSCRIPTION');
    const hasHistoricalOverlap = conflicts.some(c => c.classification === 'HISTORICAL_OVERLAP_NO_CHARGE');
    const hasManualReview = conflicts.some(c => c.classification === 'MANUAL_REVIEW');

    if (hasConfirmed) summary.confirmed_duplicate_billing++;
    if (hasPotential) summary.potential_duplicate_subscription++;
    if (hasHistoricalOverlap) summary.historical_overlap_no_charge++;
    if (hasManualReview) summary.manual_review++;

    // Sum confirmed charges by currency
    for (const c of conflicts) {
      if (c.classification === 'CONFIRMED_DUPLICATE_BILLING' && c.total_duplicate_charge_cents > 0) {
        summary.confirmed_charges_by_currency[c.currency] =
          (summary.confirmed_charges_by_currency[c.currency] || 0) + c.total_duplicate_charge_cents;
      }
    }
  }

  return summary;
}