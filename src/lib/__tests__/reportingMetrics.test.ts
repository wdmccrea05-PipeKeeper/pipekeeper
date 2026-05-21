import { describe, expect, it } from 'vitest';

import {
  calculateRunRate,
  countUsersActiveWithin,
  isReportingActiveStatus,
  parseMetricDate,
  summarizeRevenueRowsInRange,
} from '../../../base44/functions/_shared/reportingMetrics.ts';

describe('reportingMetrics', () => {
  it('treats paid, trial, and past_due statuses as reporting-active', () => {
    expect(isReportingActiveStatus('active')).toBe(true);
    expect(isReportingActiveStatus('trial')).toBe(true);
    expect(isReportingActiveStatus('trialing')).toBe(true);
    expect(isReportingActiveStatus('past_due')).toBe(true);
    expect(isReportingActiveStatus('paid')).toBe(true);
    expect(isReportingActiveStatus('canceled')).toBe(false);
  });

  it('calculates MRR and ARR from mixed billing intervals', () => {
    const rows = [
      { amount: 8.99, interval: 'month' as const },
      { amount: 89.99, interval: 'year' as const },
    ];

    expect(
      calculateRunRate(rows, {
        getAmount: (row) => row.amount,
        getInterval: (row) => row.interval,
      }),
    ).toEqual({
      mrr: 16.49,
      arr: 197.88,
    });
  });

  it('summarizes renewals in-range with deduped customer counts', () => {
    const now = new Date('2026-05-21T00:00:00.000Z');
    const rows = [
      { user: 'u1', amount: 8.99, interval: 'month' as const, renewal: '2026-05-22T00:00:00.000Z' },
      { user: 'u1', amount: 29.99, interval: 'year' as const, renewal: '2026-05-25T00:00:00.000Z' },
      { user: 'u2', amount: 7.99, interval: 'month' as const, renewal: '2026-06-01T00:00:00.000Z' },
    ];

    expect(
      summarizeRevenueRowsInRange(rows, { start: now, end: new Date('2026-05-31T00:00:00.000Z') }, {
        getUserKey: (row) => row.user,
        getAmount: (row) => row.amount,
        getInterval: (row) => row.interval,
        getDate: (row) => parseMetricDate(row.renewal),
      }),
    ).toEqual({
      customers: 1,
      customerCount: 1,
      subscriptions: 2,
      subscriptionCount: 2,
      count: 2,
      monthly: 1,
      annual: 1,
      revenue: 38.98,
      totalAmount: 38.98,
    });
  });

  it('counts actual active users from activity timestamps instead of estimates', () => {
    const now = new Date('2026-05-21T12:00:00.000Z');
    const users = [
      { updated_date: '2026-05-21T08:00:00.000Z' },
      { updated_date: '2026-05-20T15:00:00.000Z' },
      { created_date: '2026-05-15T09:00:00.000Z' },
      { updated_date: '2026-05-10T09:00:00.000Z' },
    ];

    expect(
      countUsersActiveWithin(
        users,
        now,
        1,
        (user) => parseMetricDate(user.updated_date || user.created_date),
      ),
    ).toBe(2);

    expect(
      countUsersActiveWithin(
        users,
        now,
        7,
        (user) => parseMetricDate(user.updated_date || user.created_date),
      ),
    ).toBe(3);
  });
});
