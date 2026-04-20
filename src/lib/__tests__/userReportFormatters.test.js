import { describe, it, expect } from 'vitest';
import {
  formatUserReportDate,
  formatUserReportList,
  buildUserReportPlanSummary,
  buildUserReportBillingContextText,
  buildUserReportRenewalContextText,
} from '../userReportFormatters.js';

const translations = {
  'userReport.userTable.multiPlanLabel': 'Multiple Active Plans ({count})',
  'userReport.userTable.unknownValue': 'Unknown',
  'userReport.userTable.billingContextCsv':
    'Primary billing product: {primaryProduct}; Primary status: {primaryStatus}; Effective intervals: {intervalSummary}; Effective platforms: {platformSummary}',
  'userReport.userTable.renewalContextCsv':
    '{renewalCount} renewing subscription(s); Next renewal: {nextRenewalDate}; Total renewal: ${totalAmount}',
};

function t(key, vars = {}) {
  const template = translations[key] ?? key;
  return template.replace(/\{([^}]+)\}/g, (_, token) => String(vars[token] ?? `{${token}}`));
}

describe('userReportFormatters', () => {
  it('formats valid dates and falls back for invalid values', () => {
    expect(formatUserReportDate('2026-02-01T00:00:00Z')).toMatch(/\d/);
    expect(formatUserReportDate('invalid-date')).toBe('-');
    expect(formatUserReportDate(null)).toBe('-');
  });

  it('formats list values for billing/effective summaries', () => {
    expect(formatUserReportList(['monthly', 'annual'])).toBe('monthly, annual');
    expect(formatUserReportList([])).toBe('-');
  });

  it('builds plan summary from effective-access truth for multi-plan users', () => {
    const row = { has_multiple_active_plans: true, active_subscription_count: 3 };
    expect(buildUserReportPlanSummary(row, t)).toBe('Multiple Active Plans (3)');
  });

  it('builds plan summary from single-product users without losing product label', () => {
    const row = { has_multiple_active_plans: false, product: 'PipeKeeper Pro' };
    expect(buildUserReportPlanSummary(row, t)).toBe('PipeKeeper Pro');
  });

  it('builds billing context with explicit primary billing + effective summaries', () => {
    const row = {
      active_subscription_count: 2,
      primary_billing_product: 'Founders Bundle (PK+WK)',
      primary_billing_status: 'active',
      billing_interval: 'mixed',
      platform: 'mixed',
    };
    expect(buildUserReportBillingContextText(row, t)).toContain('Primary billing product: Founders Bundle (PK+WK)');
    expect(buildUserReportBillingContextText(row, t)).toContain('Primary status: active');
    expect(buildUserReportBillingContextText(row, t)).toContain('Effective intervals: mixed');
    expect(buildUserReportBillingContextText(row, t)).toContain('Effective platforms: mixed');
  });

  it('builds renewal context from canonical renewal totals and next renewal date', () => {
    const row = {
      active_subscription_count: 2,
      renewal_subscription_count: 2,
      renewal_next_date: '2026-05-10T00:00:00Z',
      renewal_total_amount: 57.98,
    };
    const summary = buildUserReportRenewalContextText(row, t);
    expect(summary).toContain('2 renewing subscription(s)');
    expect(summary).toContain('Total renewal: $57.98');
  });
});
