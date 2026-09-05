import { base44 } from '@/api/base44Client';
import { CANONICAL_METRIC_DICTIONARY, CANONICAL_METRIC_DICTIONARY_VERSION, CANONICAL_REPORTING_TIMEZONE } from './canonicalMetricDictionary';
import { buildLifecycleEnvelope } from './lifecycleModel';
import { FORMAL_AUDIT_OUTPUTS } from './formalAuditOutputs';
import { runReportingParityChecks, findIntegrityFindings } from './integrityChecks';

async function invokeCanonical(functionName, payload = {}) {
  const response = await base44.functions.invoke(functionName, payload);
  return response?.data ?? response;
}

/**
 * getCanonicalBillingDataset — THE canonical billing source.
 *
 * This replaces getUserSubscriptionReportV3 for ALL billing metrics:
 * - Paid Users by Provider
 * - Paid Users by Plan (NEW — separates commercial plans from module entitlements)
 * - Entitled Users by Module (NEW — separates module entitlements from plans)
 * - Revenue / MRR / ARR
 * - Data Quality / Anomalies
 * - Bundle Subscriber Proof
 * - Product ID Audit
 * - Price ID Audit
 * - Per-User Billing Ledger
 *
 * getUserSubscriptionReportV3 is kept ONLY for non-billing analytics
 * (user activity, acquisition, first-time paid, reliability) until those
 * are migrated. Its billing aggregates (providerBreakdown, productBreakdown,
 * currentPayingUsers, currentEntitledUsers, revenue) are DEPRECATED.
 */
export async function getCanonicalBillingDataset(payload = {}) {
  return invokeCanonical('getCanonicalBillingDataset', payload);
}

/**
 * getCanonicalUserLifecycleReport — merged report for UserReport.jsx.
 *
 * Billing sections come from getCanonicalBillingDataset (canonical).
 * Non-billing sections (user activity, acquisition, first-time paid,
 * reliability) come from getUserSubscriptionReportV3 (legacy, to be migrated).
 *
 * The returned object has:
 *   - `billing` → canonical billing dataset (by_provider, by_plan, by_module, etc.)
 *   - `userActivity`, `acquisition`, `reliability`, `firstPaidEvidenceSummary`,
 *     `newFirstTimePaidUsersDetail` → from V3 (non-billing)
 *   - `meta`, `dateRange` → from V3
 *   - `deprecated_v3_billing` → the old V3 billing aggregates (for comparison only)
 */
export async function getCanonicalUserLifecycleReport(payload = {}) {
  const [billingDataset, v3Report] = await Promise.all([
    invokeCanonical('getCanonicalBillingDataset', payload),
    invokeCanonical('getUserSubscriptionReportV3', payload),
  ]);

  return {
    // ── CANONICAL BILLING (from getCanonicalBillingDataset) ───────────────────
    billing: billingDataset,

    // ── NON-BILLING ANALYTICS (from getUserSubscriptionReportV3 — to be migrated) ─
    userActivity: v3Report?.userActivity || {},
    acquisition: v3Report?.acquisition || {},
    reliability: v3Report?.reliability || {},
    firstPaidEvidenceSummary: v3Report?.firstPaidEvidenceSummary || null,
    newFirstTimePaidUsersDetail: v3Report?.newFirstTimePaidUsersDetail || [],

    // ── META ──────────────────────────────────────────────────────────────────
    meta: v3Report?.meta || { generatedAt: new Date().toISOString(), reportingTimezone: CANONICAL_REPORTING_TIMEZONE },
    dateRange: v3Report?.dateRange || null,

    // ── DEPRECATED V3 BILLING (for comparison/audit only — DO NOT use for display) ─
    deprecated_v3_billing: {
      providerBreakdown: v3Report?.providerBreakdown || {},
      productBreakdown: v3Report?.productBreakdown || {},
      subscriptionStatus: v3Report?.subscriptionStatus || {},
      revenue: v3Report?.revenue || {},
      renewals: v3Report?.renewals || {},
      dataQuality: v3Report?.dataQuality || {},
      entitlementReconciliation: v3Report?.entitlementReconciliation || null,
      auditUsers: v3Report?.auditUsers || [],
      auditSubscriptions: v3Report?.auditSubscriptions || [],
      canonicalCurrentPaidSubscriptionsDetail: v3Report?.canonicalCurrentPaidSubscriptionsDetail || [],
      subscriptionHistoryDetail: v3Report?.subscriptionHistoryDetail || [],
      subscriptionReconciliationTotals: v3Report?.subscriptionReconciliationTotals || null,
      multiSubscriptionUsers: v3Report?.multiSubscriptionUsers || [],
      excludedRecords: v3Report?.excludedRecords || [],
    },

    // ── CANONICAL ENVELOPE ─────────────────────────────────────────────────────
    canonicalEnvelope: buildLifecycleEnvelope({ range: v3Report?.dateRange, report: v3Report }),
    canonicalDictionaryVersion: CANONICAL_METRIC_DICTIONARY_VERSION,
    canonicalTimezone: v3Report?.meta?.reportingTimezone || CANONICAL_REPORTING_TIMEZONE,
    metricKeys: Object.keys(CANONICAL_METRIC_DICTIONARY),
  };
}

export async function getCanonicalReconciliationReport(payload = {}) {
  const [billingDataset, unmatched] = await Promise.all([
    invokeCanonical('getCanonicalBillingDataset', payload),
    invokeCanonical('getUnmatchedPayments', {}),
  ]);
  return {
    billing: billingDataset,
    unmatched,
  };
}

export async function getCanonicalCuratorAnalytics(periodDays) {
  const [recommendation, segment] = await Promise.all([
    invokeCanonical('getRecommendationAnalytics', { period_days: periodDays }),
    invokeCanonical('getUserSegmentAnalytics', { period_days: periodDays }),
  ]);
  return {
    recommendation,
    segment,
  };
}

export async function getCanonicalExecutiveKpis(dateRange = '30d') {
  const [billingDataset, reconciliation] = await Promise.all([
    getCanonicalBillingDataset({ dateRange }),
    getCanonicalReconciliationReport({ dateRange }),
  ]);
  const billing = billingDataset || {};
  const parity = runReportingParityChecks({ billingDataset, reconciliationReport: reconciliation });
  const integrityFindings = findIntegrityFindings({ billingDataset });

  return {
    generatedAt: new Date().toISOString(),
    dateRange,
    kpis: {
      totalRegisteredUsers: billing.record_totals?.total_users || 0,
      currentPayingUsers: billing.current_billing_summary?.current_paying_users || 0,
      currentEntitledUsers: billing.current_billing_summary?.current_entitled_users || 0,
      mrr: billing.current_billing_summary?.mrr || 0,
      arr: billing.current_billing_summary?.arr || 0,
      unmatchedPayments: reconciliation?.unmatched?.unmatchedPayments?.length || 0,
    },
    parity,
    integrityFindings,
    auditOutputs: FORMAL_AUDIT_OUTPUTS,
  };
}