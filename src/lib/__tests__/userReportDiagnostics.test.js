import { describe, expect, it } from 'vitest';
import { buildDiagnosticsSampleGroups, maskEmail } from '@/lib/userReportDiagnostics';

describe('userReportDiagnostics', () => {
  it('masks emails for privacy-safe diagnostics display', () => {
    expect(maskEmail('Collector@example.com')).toBe('co*******@example.com');
  });

  it('builds only non-empty groups and masks embedded emails', () => {
    const diagnostics = {
      samples: {
        multipleActiveSubscriptions: ['one@example.com', 'two@example.com'],
        failedStripeCallbacks: ['billing@example.com (unpaid)'],
        failedPurchases: ['checkout@example.com timeout'],
        summaryRuntimeMismatch: [],
      },
    };

    const groups = buildDiagnosticsSampleGroups(diagnostics, {
      translate: (key) => `t:${key}`,
    });
    const labels = groups.map((g) => g.label);

    expect(labels).toContain('t:userReport.diagnostics.sampleLabels.multipleActiveSubscriptions');
    expect(labels).toContain('t:userReport.diagnostics.sampleLabels.failedStripeCallbacks');
    expect(labels).toContain('t:userReport.diagnostics.sampleLabels.failedPurchases');
    expect(labels).not.toContain('t:userReport.diagnostics.sampleLabels.summaryRuntimeMismatch');
    expect(groups.find((g) => g.labelKey === 'userReport.diagnostics.sampleLabels.multipleActiveSubscriptions').values[0]).toBe('on*@example.com');
    expect(groups.find((g) => g.labelKey === 'userReport.diagnostics.sampleLabels.failedStripeCallbacks').values[0]).toContain('(unpaid)');
    expect(groups.find((g) => g.labelKey === 'userReport.diagnostics.sampleLabels.failedStripeCallbacks').values[0]).toContain('@example.com');
  });

  it('limits samples per group', () => {
    const diagnostics = {
      samples: {
        staleSyncTimestamp: ['a@example.com', 'b@example.com', 'c@example.com'],
      },
    };

    const groups = buildDiagnosticsSampleGroups(diagnostics, { maxItems: 2 });
    expect(groups[0].values).toHaveLength(2);
  });

  it('uses friendly fallback labels when translator is not provided', () => {
    const diagnostics = {
      samples: {
        multipleActiveSubscriptions: ['a@example.com'],
      },
    };
    const groups = buildDiagnosticsSampleGroups(diagnostics);
    expect(groups[0].label).toBe('Multi-active');
  });
});
