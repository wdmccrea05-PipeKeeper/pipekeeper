/**
 * Tests for the V2 User Subscription Report logic.
 *
 * Covers:
 *  - Product classification (classifyProductKind)
 *  - Bundle classification (classifyBundleKind)
 *  - Interval normalization (classifyInterval)
 *  - MRR / ARR calculation (computeMRR, mrrContribution)
 *  - Calendar range computation (getCalendarRange)
 *  - Renewal revenue by period (calcRenewalPeriod)
 *  - Account deduplication (deduplicateUsers)
 *  - Warning / exclusion behavior
 */

import { describe, it, expect } from 'vitest';
import {
  classifyProductKind,
  classifyBundleKind,
  classifyInterval,
  mrrContribution,
  computeMRR,
  getCalendarRange,
  calcRenewalPeriod,
  deduplicateUsers,
  isBundleSignal,
  matchProductKeyword,
  norm,
} from '../lib/reportingV2Utils.js';

// ─── Product classification ────────────────────────────────────────────────────

describe('classifyProductKind', () => {
  it('returns pipekeeper when product_kind is explicit', () => {
    expect(classifyProductKind({ product_kind: 'pipekeeper' }).product).toBe('pipekeeper');
    expect(classifyProductKind({ product_kind: 'PipeKeeper' }).product).toBe('pipekeeper');
  });

  it('returns each known product from explicit product_kind', () => {
    expect(classifyProductKind({ product_kind: 'whiskeykeeper' }).product).toBe('whiskeykeeper');
    expect(classifyProductKind({ product_kind: 'cigarkeeper' }).product).toBe('cigarkeeper');
    expect(classifyProductKind({ product_kind: 'winekeeper' }).product).toBe('winekeeper');
  });

  it('returns bundle when product_kind is bundle or founders', () => {
    expect(classifyProductKind({ product_kind: 'bundle' }).product).toBe('bundle');
    expect(classifyProductKind({ product_kind: 'founders' }).product).toBe('bundle');
  });

  it('uses modules_csv as second priority', () => {
    expect(classifyProductKind({ modules_csv: 'pipekeeper,whiskeykeeper' }).product).toBe('pipekeeper');
    expect(classifyProductKind({ modules_csv: 'whiskeykeeper' }).product).toBe('whiskeykeeper');
  });

  it('recognises bundle from checkout_type', () => {
    expect(classifyProductKind({ checkout_type: 'bundle_3' }).product).toBe('bundle');
    expect(classifyProductKind({ checkout_type: 'bundle_4' }).product).toBe('bundle');
  });

  it('recognises bundle from bundle_name', () => {
    expect(classifyProductKind({ bundle_name: 'founders' }).product).toBe('bundle');
  });

  it('uses price_id for classification', () => {
    expect(classifyProductKind({ price_id: 'price_pipekeeper_monthly' }).product).toBe('pipekeeper');
    expect(classifyProductKind({ price_id: 'price_whiskeykeeper_annual' }).product).toBe('whiskeykeeper');
  });

  it('uses fuzzy fallback fields and marks fromFallback', () => {
    const result = classifyProductKind({ name: 'PipeKeeper Subscription' });
    expect(result.product).toBe('pipekeeper');
    expect(result.fromFallback).toBe(true);
  });

  it('returns unknown when no signal is found', () => {
    expect(classifyProductKind({}).product).toBe('unknown');
    expect(classifyProductKind({ status: 'active', amount: 2.99 }).product).toBe('unknown');
  });

  it('does not mark explicit matches as fromFallback', () => {
    expect(classifyProductKind({ product_kind: 'pipekeeper' }).fromFallback).toBe(false);
    expect(classifyProductKind({ modules_csv: 'cigarkeeper' }).fromFallback).toBe(false);
  });

  it('cigar alias resolves to cigarkeeper', () => {
    expect(classifyProductKind({ product_kind: 'cigar' }).product).toBe('cigarkeeper');
  });

  it('wine alias resolves to winekeeper', () => {
    expect(classifyProductKind({ product_kind: 'wine' }).product).toBe('winekeeper');
  });
});

// ─── Bundle classification ─────────────────────────────────────────────────────

describe('classifyBundleKind', () => {
  it('returns founders when product_kind is founders', () => {
    expect(classifyBundleKind({ product_kind: 'founders' })).toBe('founders');
  });

  it('returns founders when bundle_name contains founders', () => {
    expect(classifyBundleKind({ bundle_name: 'Founders Bundle' })).toBe('founders');
  });

  it('returns fourModules for bundle_4 checkout_type', () => {
    expect(classifyBundleKind({ checkout_type: 'bundle_4' })).toBe('fourModules');
  });

  it('returns threeModules for bundle_3 checkout_type', () => {
    expect(classifyBundleKind({ checkout_type: 'bundle_3' })).toBe('threeModules');
  });

  it('returns fourModules for 4_module price_id', () => {
    expect(classifyBundleKind({ price_id: 'price_4_module_annual' })).toBe('fourModules');
  });

  it('returns threeModules for 3_module price_id', () => {
    expect(classifyBundleKind({ price_id: 'price_3_module_monthly' })).toBe('threeModules');
  });

  it('founders takes precedence over 4-module signals', () => {
    expect(classifyBundleKind({ bundle_name: 'founders', checkout_type: 'bundle_4' })).toBe('founders');
  });

  it('returns null for non-bundle subscription', () => {
    expect(classifyBundleKind({ product_kind: 'pipekeeper' })).toBeNull();
    expect(classifyBundleKind({})).toBeNull();
  });
});

// ─── Interval normalization ────────────────────────────────────────────────────

describe('classifyInterval', () => {
  it('returns monthly for billing_interval=month', () => {
    expect(classifyInterval({ billing_interval: 'month' }).interval).toBe('monthly');
    expect(classifyInterval({ billing_interval: 'monthly' }).interval).toBe('monthly');
  });

  it('returns annual for billing_interval=year/yearly/annual', () => {
    expect(classifyInterval({ billing_interval: 'year' }).interval).toBe('annual');
    expect(classifyInterval({ billing_interval: 'yearly' }).interval).toBe('annual');
    expect(classifyInterval({ billing_interval: 'annual' }).interval).toBe('annual');
  });

  it('uses billing_period as fallback', () => {
    expect(classifyInterval({ billing_period: 'monthly' }).interval).toBe('monthly');
    expect(classifyInterval({ billing_period: 'year' }).interval).toBe('annual');
  });

  it('infers from price_id keywords', () => {
    expect(classifyInterval({ price_id: 'price_pipekeeper_annual_v1' }).interval).toBe('annual');
    expect(classifyInterval({ price_id: 'price_pipekeeper_monthly_v1' }).interval).toBe('monthly');
  });

  it('infers from period length (300+ days → annual)', () => {
    const start = new Date('2025-01-01T00:00:00Z');
    const end   = new Date('2026-01-01T00:00:00Z');
    const result = classifyInterval({ current_period_start: start, current_period_end: end });
    expect(result.interval).toBe('annual');
    expect(result.fromInference).toBe(true);
  });

  it('infers from period length (30 days → monthly)', () => {
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-05-01T00:00:00Z');
    const result = classifyInterval({ current_period_start: start, current_period_end: end });
    expect(result.interval).toBe('monthly');
    expect(result.fromInference).toBe(true);
  });

  it('returns unknown when no signal is found', () => {
    expect(classifyInterval({}).interval).toBe('unknown');
    expect(classifyInterval({ amount: 2.99, status: 'active' }).interval).toBe('unknown');
  });

  it('does not mark direct matches as fromInference', () => {
    expect(classifyInterval({ billing_interval: 'monthly' }).fromInference).toBe(false);
  });
});

// ─── MRR / ARR ────────────────────────────────────────────────────────────────

describe('mrrContribution', () => {
  it('returns full amount for monthly subscription', () => {
    expect(mrrContribution({ billingInterval: 'monthly', amount: 2.99 })).toBe(2.99);
  });

  it('returns amount/12 for annual subscription', () => {
    expect(mrrContribution({ billingInterval: 'annual', amount: 29.99 })).toBeCloseTo(29.99 / 12, 5);
  });

  it('returns 0 for unknown interval', () => {
    expect(mrrContribution({ billingInterval: 'unknown', amount: 9.99 })).toBe(0);
  });
});

describe('computeMRR', () => {
  it('sums monthly subscriptions directly', () => {
    const subs = [
      { productKind: 'pipekeeper', billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'whiskeykeeper', billingInterval: 'monthly', amount: 2.99 },
    ];
    const { mrr, arr } = computeMRR(subs);
    expect(mrr).toBeCloseTo(5.98, 2);
    expect(arr).toBeCloseTo(71.76, 1);
  });

  it('divides annual subscription by 12', () => {
    const subs = [{ productKind: 'pipekeeper', billingInterval: 'annual', amount: 29.99 }];
    const { mrr } = computeMRR(subs);
    expect(mrr).toBeCloseTo(29.99 / 12, 2);
  });

  it('excludes unknown product from MRR', () => {
    const subs = [
      { productKind: 'pipekeeper', billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'unknown',    billingInterval: 'monthly', amount: 9.99 },
    ];
    expect(computeMRR(subs).mrr).toBeCloseTo(2.99, 2);
  });

  it('excludes unknown interval from MRR', () => {
    const subs = [
      { productKind: 'pipekeeper', billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'pipekeeper', billingInterval: 'unknown', amount: 9.99 },
    ];
    expect(computeMRR(subs).mrr).toBeCloseTo(2.99, 2);
  });

  it('returns 0 MRR for empty list', () => {
    expect(computeMRR([]).mrr).toBe(0);
    expect(computeMRR([]).arr).toBe(0);
  });

  it('ARR equals MRR * 12 (within floating-point tolerance)', () => {
    const subs = [
      { productKind: 'pipekeeper', billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'cigarkeeper', billingInterval: 'annual', amount: 29.99 },
    ];
    const { mrr, arr } = computeMRR(subs);
    expect(Math.abs(arr - mrr * 12)).toBeLessThan(0.02);
  });
});

// ─── Calendar ranges ──────────────────────────────────────────────────────────

describe('getCalendarRange', () => {
  // Fixed reference: Wednesday 2025-04-02T10:00:00Z
  const REF = new Date('2025-04-02T10:00:00.000Z');

  it('week: starts on Monday and ends on Sunday', () => {
    const { start, end } = getCalendarRange('week', REF);
    // 2025-03-31 is the Monday of that week
    expect(start.toISOString().slice(0, 10)).toBe('2025-03-31');
    expect(end.toISOString().slice(0, 10)).toBe('2025-04-06');
    expect(start.getUTCHours()).toBe(0);
    expect(end.getUTCHours()).toBe(23);
  });

  it('month: starts on 1st and ends on last day', () => {
    const { start, end } = getCalendarRange('month', REF);
    expect(start.toISOString().slice(0, 10)).toBe('2025-04-01');
    expect(end.toISOString().slice(0, 10)).toBe('2025-04-30');
  });

  it('quarter: Q2 starts April 1 and ends June 30', () => {
    const { start, end } = getCalendarRange('quarter', REF);
    expect(start.toISOString().slice(0, 10)).toBe('2025-04-01');
    expect(end.toISOString().slice(0, 10)).toBe('2025-06-30');
  });

  it('year: starts Jan 1 and ends Dec 31', () => {
    const { start, end } = getCalendarRange('year', REF);
    expect(start.toISOString().slice(0, 10)).toBe('2025-01-01');
    expect(end.toISOString().slice(0, 10)).toBe('2025-12-31');
  });

  it('week starting on a Monday includes that day', () => {
    const monday = new Date('2025-03-31T08:00:00.000Z');
    const { start } = getCalendarRange('week', monday);
    expect(start.toISOString().slice(0, 10)).toBe('2025-03-31');
  });

  it('week starting on a Sunday gives previous Monday', () => {
    const sunday = new Date('2025-04-06T10:00:00.000Z');
    const { start } = getCalendarRange('week', sunday);
    expect(start.toISOString().slice(0, 10)).toBe('2025-03-31');
  });

  it('quarter boundaries: Q1 Jan-Mar, Q3 Jul-Sep', () => {
    const q1 = getCalendarRange('quarter', new Date('2025-02-15T00:00:00Z'));
    expect(q1.start.toISOString().slice(0, 10)).toBe('2025-01-01');
    expect(q1.end.toISOString().slice(0, 10)).toBe('2025-03-31');

    const q3 = getCalendarRange('quarter', new Date('2025-08-01T00:00:00Z'));
    expect(q3.start.toISOString().slice(0, 10)).toBe('2025-07-01');
    expect(q3.end.toISOString().slice(0, 10)).toBe('2025-09-30');
  });
});

// ─── Renewal revenue by period ────────────────────────────────────────────────

describe('calcRenewalPeriod', () => {
  const buildSub = (userId, endDate, amount = 2.99, product = 'pipekeeper') => ({
    userId,
    userEmail: `${userId}@test.com`,
    productKind: product,
    currentPeriodEnd: new Date(endDate),
    amount,
  });

  it('counts subscriptions renewing within the period', () => {
    const subs = [
      buildSub('user1', '2025-04-15T00:00:00Z'),
      buildSub('user2', '2025-04-20T00:00:00Z'),
    ];
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-04-30T23:59:59Z');
    const result = calcRenewalPeriod(subs, start, end);
    expect(result.subscriptions).toBe(2);
    expect(result.customers).toBe(2);
    expect(result.revenue).toBeCloseTo(5.98, 2);
  });

  it('excludes subscriptions renewing outside the period', () => {
    const subs = [
      buildSub('user1', '2025-05-15T00:00:00Z'),
    ];
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-04-30T23:59:59Z');
    expect(calcRenewalPeriod(subs, start, end).subscriptions).toBe(0);
  });

  it('deduplicates customers (multiple subs, one user)', () => {
    const subs = [
      buildSub('user1', '2025-04-10T00:00:00Z', 2.99),
      buildSub('user1', '2025-04-15T00:00:00Z', 2.99),
    ];
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-04-30T23:59:59Z');
    const result = calcRenewalPeriod(subs, start, end);
    expect(result.subscriptions).toBe(2);
    expect(result.customers).toBe(1);
  });

  it('handles subs without currentPeriodEnd gracefully', () => {
    const subs = [
      { userId: 'u1', userEmail: 'u1@t.com', productKind: 'pipekeeper', currentPeriodEnd: null, amount: 2.99 },
    ];
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-04-30T23:59:59Z');
    expect(calcRenewalPeriod(subs, start, end).subscriptions).toBe(0);
  });

  it('returns 0 revenue for empty subscription list', () => {
    const start = new Date('2025-04-01T00:00:00Z');
    const end   = new Date('2025-04-30T23:59:59Z');
    const result = calcRenewalPeriod([], start, end);
    expect(result.subscriptions).toBe(0);
    expect(result.customers).toBe(0);
    expect(result.revenue).toBe(0);
  });
});

// ─── Account deduplication ─────────────────────────────────────────────────────

describe('deduplicateUsers', () => {
  it('keeps first occurrence of each email', () => {
    const users = [
      { email: 'alice@test.com', id: '1' },
      { email: 'ALICE@TEST.COM', id: '2' },
      { email: 'bob@test.com',   id: '3' },
    ];
    const deduped = deduplicateUsers(users);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe('1');
    expect(deduped[1].id).toBe('3');
  });

  it('excludes users with empty email', () => {
    const users = [
      { email: '',   id: '1' },
      { email: null, id: '2' },
      { email: 'valid@test.com', id: '3' },
    ];
    expect(deduplicateUsers(users)).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateUsers([])).toHaveLength(0);
  });
});

// ─── Bundle signal detection ───────────────────────────────────────────────────

describe('isBundleSignal', () => {
  it('returns true for bundle-related strings', () => {
    expect(isBundleSignal('founders')).toBe(true);
    expect(isBundleSignal('bundle_3')).toBe(true);
    expect(isBundleSignal('bundle_4')).toBe(true);
    expect(isBundleSignal('3_module')).toBe(true);
    expect(isBundleSignal('4_module')).toBe(true);
    expect(isBundleSignal('Founders Bundle Annual')).toBe(true);
  });

  it('returns false for single-product strings', () => {
    expect(isBundleSignal('pipekeeper')).toBe(false);
    expect(isBundleSignal('whiskeykeeper')).toBe(false);
    expect(isBundleSignal('monthly')).toBe(false);
  });
});

// ─── Product keyword matching ─────────────────────────────────────────────────

describe('matchProductKeyword', () => {
  it('matches each product by canonical keyword', () => {
    expect(matchProductKeyword('pipekeeper_pro_monthly')).toBe('pipekeeper');
    expect(matchProductKeyword('WHISKEYKEEPER_ANNUAL')).toBe('whiskeykeeper');
    expect(matchProductKeyword('cigarkeeper_v2')).toBe('cigarkeeper');
    expect(matchProductKeyword('winekeeper_monthly')).toBe('winekeeper');
  });

  it('matches cigar/wine aliases', () => {
    expect(matchProductKeyword('cigar_premium')).toBe('cigarkeeper');
    expect(matchProductKeyword('wine_annual')).toBe('winekeeper');
  });

  it('returns null for unrecognised value', () => {
    expect(matchProductKeyword('annual')).toBeNull();
    expect(matchProductKeyword('premium')).toBeNull();
    expect(matchProductKeyword('')).toBeNull();
  });
});

// ─── Warning / exclusion behavior ────────────────────────────────────────────

describe('warning and exclusion behavior', () => {
  it('computeMRR produces correct result while excluding unknown-product subs', () => {
    const subs = [
      { productKind: 'pipekeeper',    billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'unknown',       billingInterval: 'monthly', amount: 9.99 },
      { productKind: 'cigarkeeper',   billingInterval: 'annual',  amount: 29.99 },
    ];
    const { mrr } = computeMRR(subs);
    // pipekeeper: 2.99, cigarkeeper: 29.99/12 ≈ 2.499
    expect(mrr).toBeCloseTo(2.99 + 29.99 / 12, 2);
  });

  it('computeMRR excludes unknown-interval subs without zeroing the whole report', () => {
    const subs = [
      { productKind: 'pipekeeper', billingInterval: 'monthly', amount: 2.99 },
      { productKind: 'pipekeeper', billingInterval: 'unknown', amount: 5.00 },
    ];
    expect(computeMRR(subs).mrr).toBeCloseTo(2.99, 2);
  });

  it('classifyProductKind returns unknown when no metadata is present', () => {
    expect(classifyProductKind({ status: 'active', amount: 2.99 }).product).toBe('unknown');
  });

  it('classifyInterval returns unknown when no interval metadata is present', () => {
    expect(classifyInterval({ status: 'active', amount: 2.99 }).interval).toBe('unknown');
  });

  it('classifyProductKind marks fuzzy fallback correctly', () => {
    const r = classifyProductKind({ description: 'Your PipeKeeper subscription' });
    expect(r.product).toBe('pipekeeper');
    expect(r.fromFallback).toBe(true);
  });
});
