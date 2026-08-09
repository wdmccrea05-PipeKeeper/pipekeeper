import { base44 } from '@/api/base44Client';
import { CANONICAL_METRIC_DICTIONARY, CANONICAL_METRIC_DICTIONARY_VERSION, CANONICAL_REPORTING_TIMEZONE } from './canonicalMetricDictionary';
import { buildLifecycleEnvelope } from './lifecycleModel';
import { FORMAL_AUDIT_OUTPUTS } from './formalAuditOutputs';
import { runReportingParityChecks, findIntegrityFindings } from './integrityChecks';

async function invokeCanonical(functionName, payload = {}) {
  const response = await base44.functions.invoke(functionName, payload);
  return response?.data ?? response;
}

export async function getCanonicalUserLifecycleReport(payload = {}) {
  const report = await invokeCanonical('getUserSubscriptionReportV3', payload);
  return {
    ...report,
    canonicalEnvelope: buildLifecycleEnvelope({ range: report?.dateRange, report }),
    canonicalDictionaryVersion: CANONICAL_METRIC_DICTIONARY_VERSION,
    canonicalTimezone: report?.meta?.reportingTimezone || CANONICAL_REPORTING_TIMEZONE,
    metricKeys: Object.keys(CANONICAL_METRIC_DICTIONARY),
  };
}

export async function getCanonicalReconciliationReport(payload = {}) {
  const [report, unmatched] = await Promise.all([
    invokeCanonical('getUserSubscriptionReportV3', payload),
    invokeCanonical('getUnmatchedPayments', {}),
  ]);
  return {
    report,
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
  const [userReport, reconciliation] = await Promise.all([
    getCanonicalUserLifecycleReport({ dateRange }),
    getCanonicalReconciliationReport({ dateRange }),
  ]);
  const reconciliationReport = reconciliation?.report || {};
  const parity = runReportingParityChecks({ userReport, reconciliationReport });
  const integrityFindings = findIntegrityFindings({ userReport });

  return {
    generatedAt: new Date().toISOString(),
    dateRange,
    kpis: {
      totalRegisteredUsers: userReport?.userActivity?.totalRegisteredUsers || 0,
      currentPayingUsers: userReport?.subscriptionStatus?.currentPayingUsers || 0,
      currentEntitledUsers: userReport?.subscriptionStatus?.currentEntitledUsers || 0,
      newFirstTimePaidUsers: userReport?.acquisition?.newFirstTimePaidUsers || 0,
      mrr: userReport?.revenue?.mrr || 0,
      arr: userReport?.revenue?.arr || 0,
      reactivatedPaidUsers: userReport?.acquisition?.reactivatedPaidUsers || 0,
      unmatchedPayments: reconciliationReport?.reconciliationTotals?.unmatched_payments
        || reconciliation?.unmatched?.unmatchedPayments?.length
        || 0,
    },
    parity,
    integrityFindings,
    auditOutputs: FORMAL_AUDIT_OUTPUTS,
  };
}
