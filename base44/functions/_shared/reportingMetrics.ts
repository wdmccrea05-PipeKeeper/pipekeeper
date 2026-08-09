export type MetricInterval = 'month' | 'year';
export type PeriodKind = 'week' | 'month' | 'quarter' | 'year';
export const CANONICAL_REPORTING_TIMEZONE = 'America/Indianapolis';

export const CANONICAL_METRIC_DICTIONARY_VERSION = 'v1-lifecycle-canonical';
export const CANONICAL_LIFECYCLE_MODEL_VERSION = 'v1-lifecycle-canonical';

// Backend mirror: keep this lightweight dictionary in the Deno shared layer.
// Frontend richer descriptors live in src/lib/analytics/canonicalMetricDictionary.js.
export const CANONICAL_METRIC_DICTIONARY = {
  total_registered_users: {
    sourceEntities: ['User'],
    formula: 'count(non-merged registered users)',
  },
  current_paying_users: {
    sourceEntities: ['ActiveContract', 'Subscription', 'SubscriptionEvent'],
    formula: 'distinct users with canonical paying status',
  },
  mrr: {
    sourceEntities: ['ActiveContract', 'Subscription'],
    formula: 'sum(monthly-normalized amount for paying contracts)',
  },
  arr: {
    sourceEntities: ['ActiveContract', 'Subscription'],
    formula: 'mrr*12',
  },
} as const;

export const REPORTING_ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial', 'past_due', 'paid']);

export function normalizeMetricStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isReportingActiveStatus(value: unknown): boolean {
  return REPORTING_ACTIVE_STATUSES.has(normalizeMetricStatus(value));
}

export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function parseMetricDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeMetricInterval(value: unknown): MetricInterval | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['month', 'monthly', 'mo'].includes(normalized)) return 'month';
  if (['year', 'yearly', 'annual', 'yr'].includes(normalized)) return 'year';
  return null;
}

export function toMonthlyRunRate(amount: number, interval: MetricInterval | null): number {
  if (!Number.isFinite(amount)) return 0;
  if (interval === 'year') return amount / 12;
  return amount;
}

export function calculateRunRate<T>(
  rows: T[],
  selectors: {
    getAmount: (row: T) => number;
    getInterval: (row: T) => MetricInterval | null;
  },
) {
  const mrr = roundMoney(rows.reduce((sum, row) => sum + toMonthlyRunRate(selectors.getAmount(row), selectors.getInterval(row)), 0));
  return {
    mrr,
    arr: roundMoney(mrr * 12),
  };
}

export function periodRange(kind: PeriodKind, now: Date) {
  const start = new Date(now);
  const end = new Date(now);
  if (kind === 'week') {
    const dow = start.getUTCDay();
    const fromMonday = dow === 0 ? 6 : dow - 1;
    start.setUTCDate(start.getUTCDate() - fromMonday);
    start.setUTCHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (kind === 'month') {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(start.getUTCMonth() + 1, 1);
    end.setUTCHours(0, 0, 0, 0);
  } else if (kind === 'quarter') {
    const quarter = Math.floor(start.getUTCMonth() / 3);
    start.setUTCMonth(quarter * 3, 1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCMonth(quarter * 3 + 3, 1);
    end.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1);
    end.setUTCHours(0, 0, 0, 0);
  }
  return { start, end };
}

export function inDateRange(date: Date | null, range: { start: Date; end: Date }) {
  if (!date) return false;
  return date >= range.start && date < range.end;
}

export function rollingRange(now: Date, days: number) {
  const start = new Date(now);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days);
  return { start, end };
}

export function summarizeRevenueRows<T>(
  rows: T[],
  selectors: {
    getUserKey: (row: T) => string | null | undefined;
    getAmount: (row: T) => number;
    getInterval: (row: T) => MetricInterval | null;
  },
) {
  const customers = new Set<string>();
  let revenue = 0;
  let monthly = 0;
  let annual = 0;

  for (const row of rows) {
    const userKey = selectors.getUserKey(row);
    if (userKey) customers.add(String(userKey));
    const amount = selectors.getAmount(row);
    if (Number.isFinite(amount)) {
      revenue += amount;
    }
    const interval = selectors.getInterval(row);
    if (interval === 'month') monthly += 1;
    if (interval === 'year') annual += 1;
  }

  return {
    customers: customers.size,
    customerCount: customers.size,
    subscriptions: rows.length,
    subscriptionCount: rows.length,
    count: rows.length,
    monthly,
    annual,
    revenue: roundMoney(revenue),
    totalAmount: roundMoney(revenue),
  };
}

export function summarizeRevenueRowsInRange<T>(
  rows: T[],
  range: { start: Date; end: Date },
  selectors: {
    getUserKey: (row: T) => string | null | undefined;
    getAmount: (row: T) => number;
    getInterval: (row: T) => MetricInterval | null;
    getDate: (row: T) => Date | null;
  },
) {
  return summarizeRevenueRows(
    rows.filter((row) => inDateRange(selectors.getDate(row), range)),
    selectors,
  );
}

export function countUsersActiveWithin<T>(
  rows: T[],
  now: Date,
  days: number,
  getActivityDate: (row: T) => Date | null,
) {
  const range = {
    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
    end: new Date(now),
  };
  return rows.filter((row) => inDateRange(getActivityDate(row), range)).length;
}
