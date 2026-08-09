import { describe, expect, it } from 'vitest';
import { CANONICAL_METRIC_DICTIONARY, getMetricDefinition } from '../canonicalMetricDictionary';
import { buildLifecycleEnvelope } from '../lifecycleModel';
import { findIntegrityFindings, runReportingParityChecks } from '../integrityChecks';

describe('canonicalMetricDictionary', () => {
  it('exposes key lifecycle metrics', () => {
    expect(getMetricDefinition('total_registered_users')).toBeTruthy();
    expect(getMetricDefinition('mrr')).toBeTruthy();
    expect(CANONICAL_METRIC_DICTIONARY.current_paying_users.phase).toBe('subscription');
  });
});

describe('lifecycle envelope', () => {
  it('builds canonical envelope fields', () => {
    const envelope = buildLifecycleEnvelope({
      range: { start: 'a', end: 'b' },
      report: { meta: { generatedAt: '2026-01-01T00:00:00.000Z', reportVersion: 'v9-canonical' } },
    });

    expect(envelope.model.version).toBe('v1-lifecycle-canonical');
    expect(envelope.range.start).toBe('a');
  });
});

describe('integrity checks', () => {
  it('returns pass when checks align', () => {
    const result = runReportingParityChecks({
      userReport: { subscriptionStatus: { currentPayingUsers: 2 } },
      reconciliationReport: {
        reconciliationTotals: { matched_subscriptions: 2, unmatched_payments: 1 },
        reliability: { unmatchedPaidTransactions: 1 },
      },
    });
    expect(result.status).toBe('pass');
  });

  it('detects findings from data quality', () => {
    const findings = findIntegrityFindings({
      userReport: {
        dataQuality: {
          unmatchedSubscriptions: 1,
          syntheticIdentities: 1,
          duplicateContracts: 0,
        },
      },
    });

    expect(findings).toContain('unmatched_subscriptions_present');
    expect(findings).toContain('synthetic_identities_present');
  });
});
