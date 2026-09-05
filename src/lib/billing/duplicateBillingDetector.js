/**
 * Duplicate Billing Detector (Frontend/Test Copy)
 *
 * Canonical implementation: base44/shared/duplicateBillingDetector.ts
 * Keep in sync with the canonical version.
 */

import {
  resolveEntitlementScope,
  scopesIntersect,
} from './entitlementScopeResolver.js';

// ── Types (exported as plain objects for JS) ──────────────────────────────────

// ── Status helpers ───────────────────────────────────────────────────────────

function isActiveStatus(status) {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'trial';
}

function isCanceledActiveThroughPeriodEnd(record) {
  const status = String(record.status || '').toLowerCase();
  if (status !== 'canceled') return false;
  if (!record.cancel_at_period_end) return false;
  const periodEnd = record.current_period_end || record.period_end;
  if (!periodEnd) return false;
  return new Date(periodEnd).getTime() > Date.now();
}

export function isBillableObligation(record) {
  const status = String(record.status || '').toLowerCase();
  if (status === 'incomplete') return false;
  if (status === 'expired') return false;
  if (isActiveStatus(status)) return true;
  if (isCanceledActiveThroughPeriodEnd(record)) return true;
  return false;
}

function isCurrentlyActive(record) {
  return isBillableObligation(record);
}

// ── Period helpers ───────────────────────────────────────────────────────────

function getPeriodStart(record) {
  return String(
    record.current_period_start || record.period_start || record.started_at ||
    record.subscriptionStartedAt || record.created_date || ''
  ).trim();
}

function getPeriodEnd(record) {
  const periodEnd = record.current_period_end || record.period_end;
  if (periodEnd) return String(periodEnd).trim();
  const canceledAt = record.canceled_at;
  if (canceledAt) return String(canceledAt).trim();
  return '';
}

const FAR_FUTURE = Date.now() + 365 * 24 * 60 * 60 * 1000;

export function periodsOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1 || 0).getTime();
  const e1 = new Date(end1 || FAR_FUTURE).getTime();
  const s2 = new Date(start2 || 0).getTime();
  const e2 = new Date(end2 || FAR_FUTURE).getTime();
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// ── Build obligation from record ──────────────────────────────────────────────

export function buildObligation(record) {
  const scope = resolveEntitlementScope(record);
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

export function detectDuplicateBilling(records, charges = []) {
  const obligations = records.map(r => buildObligation(r));
  const results = [];

  // Group obligations by module
  const byModule = new Map();
  for (const ob of obligations) {
    for (const mod of ob.module_scope) {
      if (!byModule.has(mod)) byModule.set(mod, []);
      byModule.get(mod).push(ob);
    }
  }

  for (const [mod, obs] of byModule) {
    if (obs.length <= 1) continue;

    for (let i = 0; i < obs.length; i++) {
      for (let j = i + 1; j < obs.length; j++) {
        const a = obs[i];
        const b = obs[j];

        if (!periodsOverlap(a.period_start, a.period_end, b.period_start, b.period_end)) continue;
        if (!a.is_billable && !b.is_billable) continue;

        const overlapStart = new Date(Math.max(
          new Date(a.period_start || 0).getTime(),
          new Date(b.period_start || 0).getTime()
        )).toISOString();
        const overlapEndRaw = Math.min(
          new Date(a.period_end || FAR_FUTURE).getTime(),
          new Date(b.period_end || FAR_FUTURE).getTime()
        );
        const overlapEnd = new Date(overlapEndRaw).toISOString();

        // For charge evidence, check if each subscription has ANY successful charge.
        // A charge at the start of an annual period covers the entire year, so we
        // check against the subscription's full billing period — not just the exact
        // overlap window. This correctly handles annual subscriptions charged at
        // period start that cover the overlapping months.
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

        // Charges that fall within the overlap window (for refund amount calc)
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

        let classification;
        let requiresRefund = false;
        let requiresAdminReview = false;

        if (!a.is_billable || !b.is_billable) {
          classification = 'HISTORICAL_OVERLAP_NO_CHARGE';
        } else if (bothHaveCharges) {
          classification = 'CONFIRMED_DUPLICATE_BILLING';
          requiresRefund = true;
        } else if (a.is_currently_active && b.is_currently_active) {
          if (charges.length === 0) {
            classification = 'POTENTIAL_DUPLICATE_SUBSCRIPTION';
          } else {
            classification = 'HISTORICAL_OVERLAP_NO_CHARGE';
          }
        } else {
          classification = 'MANUAL_REVIEW';
          requiresAdminReview = true;
        }

        // Use overlap-window charges for refund amount, but all charges for evidence
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
          currency: (chargesA[0] || chargesB[0])?.currency || 'usd',
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

export function summarizeAudit(perUserResults) {
  const summary = {
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

    for (const c of conflicts) {
      if (c.classification === 'CONFIRMED_DUPLICATE_BILLING' && c.total_duplicate_charge_cents > 0) {
        summary.confirmed_charges_by_currency[c.currency] =
          (summary.confirmed_charges_by_currency[c.currency] || 0) + c.total_duplicate_charge_cents;
      }
    }
  }

  return summary;
}

export { scopesIntersect };