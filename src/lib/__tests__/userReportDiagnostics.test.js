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

    const groups = buildDiagnosticsSampleGroups(diagnostics);
    const labels = groups.map((g) => g.label);

    expect(labels).toContain('Multi-active');
    expect(labels).toContain('Failed Stripe callbacks');
    expect(labels).toContain('Failed purchases');
    expect(labels).not.toContain('Summary/runtime drift');
    expect(groups.find((g) => g.label === 'Multi-active').values[0]).toBe('on*@example.com');
    expect(groups.find((g) => g.label === 'Failed Stripe callbacks').values[0]).toContain('(unpaid)');
    expect(groups.find((g) => g.label === 'Failed Stripe callbacks').values[0]).toContain('@example.com');
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
});
