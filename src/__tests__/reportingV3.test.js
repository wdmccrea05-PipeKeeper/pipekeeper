/**
 * Tests for the V3 User Subscription Report logic.
 *
 * Covers:
 *  - normalizeInterval — billing interval normalization
 *  - isActivePaid — active paid detection
 *  - normalizeSub — canonical field mapping
 *  - mrrContribution / computeMRRARR — revenue math
 *  - getCalendarRange — today / week / month / quarter / year
 *  - calcRenewalPeriod — renewal revenue math
 *  - runSanityChecks — ARR = MRR * 12, paid <= total, renewal customer counts, etc.
 *  - missing price / interval handling
 */

import { describe, it, expect } from 'vitest';
import {
  norm,
  parseDate,
  inRange,
  getCalendarRange,
  normalizeInterval,
  isActivePaid,
  normalizeSub,
  normalizePlatform,
  mrrContribution,
  computeMRRARR,
  calcRenewalPeriod,
  runSanityChecks,
  PLAN_CATALOG,
  lookupPlanCatalog,
  inferFromAmount,
  getProductFamilyKey,
  deduplicateActivePaidSubs,
} from '../lib/reportingV3Utils.js';

// ─── Helpers used across tests ────────────────────────────────────────────────

function makeSub(overrides = {}) {
  return {
    id:               'sub_001',
    user_id:          'user_001',
    user_email:       'test@example.com',
    status:           'active',
    amount:           9.99,
    billing_interval: 'monthly',
    current_period_end: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

// ─── normalizeInterval ────────────────────────────────────────────────────────

describe('normalizeInterval', () => {
  it('normalises "month" to monthly', () => {
    expect(normalizeInterval({ billing_interval: 'month' })).toBe('monthly');
  });

  it('normalises "monthly" to monthly', () => {
    expect(normalizeInterval({ billing_interval: 'monthly' })).toBe('monthly');
  });

  it('normalises "year" to annual', () => {
    expect(normalizeInterval({ billing_interval: 'year' })).toBe('annual');
  });

  it('normalises "yearly" to annual', () => {
    expect(normalizeInterval({ billing_interval: 'yearly' })).toBe('annual');
  });

  it('normalises "annual" to annual', () => {
    expect(normalizeInterval({ billing_interval: 'annual' })).toBe('annual');
  });

  it('falls back to billing_period field', () => {
    expect(normalizeInterval({ billing_period: 'monthly' })).toBe('monthly');
    expect(normalizeInterval({ billing_period: 'annual' })).toBe('annual');
  });

  it('returns null for unknown values', () => {
    expect(normalizeInterval({ billing_interval: 'quarterly' })).toBeNull();
    expect(normalizeInterval({ billing_interval: '' })).toBeNull();
    expect(normalizeInterval({})).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(normalizeInterval({ billing_interval: 'Monthly' })).toBe('monthly');
    expect(normalizeInterval({ billing_interval: 'ANNUAL' })).toBe('annual');
  });
});

// ─── isActivePaid ─────────────────────────────────────────────────────────────

describe('isActivePaid', () => {
  it('returns true for active status', () => {
    expect(isActivePaid({ status: 'active', amount: 9.99 })).toBe(true);
  });

  it('returns true for active with zero amount (free trial that became active)', () => {
    expect(isActivePaid({ status: 'active', amount: 0 })).toBe(true);
  });

  it('returns true for trialing with amount > 0', () => {
    expect(isActivePaid({ status: 'trialing', amount: 9.99 })).toBe(true);
  });

  it('returns false for trialing with zero amount', () => {
    expect(isActivePaid({ status: 'trialing', amount: 0 })).toBe(false);
  });

  it('returns false for trialing with no amount field', () => {
    expect(isActivePaid({ status: 'trialing' })).toBe(false);
  });

  it('returns true for past_due', () => {
    expect(isActivePaid({ status: 'past_due', amount: 9.99 })).toBe(true);
  });

  it('returns false for canceled', () => {
    expect(isActivePaid({ status: 'canceled', amount: 9.99 })).toBe(false);
  });

  it('returns false for expired', () => {
    expect(isActivePaid({ status: 'expired', amount: 9.99 })).toBe(false);
  });

  it('returns false for incomplete_expired', () => {
    expect(isActivePaid({ status: 'incomplete_expired' })).toBe(false);
  });

  it('returns false for empty status', () => {
    expect(isActivePaid({})).toBe(false);
  });
});

// ─── normalizeSub ─────────────────────────────────────────────────────────────

describe('normalizeSub', () => {
  it('maps canonical fields correctly for a monthly paid sub', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_monthly', billing_interval: 'monthly', amount: 2.99 });
    const sub = normalizeSub(raw);
    expect(sub.userId).toBe('user_001');
    expect(sub.isPaid).toBe(true);
    expect(sub.billingInterval).toBe('monthly');
    expect(sub.price).toBe(2.99);
    expect(sub.module).toBe('pipekeeper');
    expect(sub.renewalAt).toBeInstanceOf(Date);
  });

  it('maps canonical fields correctly for an annual paid sub', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_annual', billing_interval: 'annual', amount: 29.99 });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.price).toBe(29.99);
    expect(sub.module).toBe('pipekeeper');
  });

  it('sets price to null when amount is 0', () => {
    const raw = makeSub({ amount: 0 });
    const sub = normalizeSub(raw);
    expect(sub.price).toBeNull();
  });

  it('sets price to null when amount is missing', () => {
    const raw = makeSub({ amount: undefined });
    const sub = normalizeSub(raw);
    expect(sub.price).toBeNull();
  });

  it('sets billingInterval to null when missing', () => {
    const raw = makeSub({ billing_interval: undefined, billing_period: undefined });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBeNull();
  });

  it('recovers missing price from renewal_amount when amount is absent', () => {
    const raw = makeSub({ amount: undefined, renewal_amount: 12.34, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(12.34);
    expect(sub.fieldResolution.price).toBe('recovered');
  });

  it('recovers interval from metadata_json recurring interval', () => {
    const raw = makeSub({
      amount: 9.99,
      billing_interval: undefined,
      billing_period: undefined,
      metadata_json: JSON.stringify({ recurring: { interval: 'year' } }),
    });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.fieldResolution.billingInterval).toBe('recovered');
  });

  it('recovers plan, interval, and price from Stripe expanded payload fields', () => {
    const raw = makeSub({
      planKey: undefined,
      plan_key: undefined,
      amount: undefined,
      billing_interval: undefined,
      billing_period: undefined,
      items: {
        data: [{
          price: {
            id: 'four_module_bundle_annual',
            unit_amount: 8999,
            recurring: { interval: 'year' },
          },
        }],
      },
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('four_module_bundle_annual');
    expect(sub.billingInterval).toBe('annual');
    expect(sub.price).toBe(89.99);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });

  it('recovers billing fields from provider payload JSON metadata when metadata_json is empty', () => {
    const raw = makeSub({
      amount: undefined,
      billing_interval: undefined,
      billing_period: undefined,
      metadata_json: undefined,
      provider_payload_json: JSON.stringify({
        plan_key: 'whiskeykeeper_pro_monthly',
        price: { unit_amount: 299, recurring: { interval: 'month' } },
      }),
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('whiskeykeeper_pro_monthly');
    expect(sub.billingInterval).toBe('monthly');
    expect(sub.price).toBe(2.99);
  });

  it('recovers interval from period span when direct fields are missing', () => {
    const raw = makeSub({
      amount: 9.99,
      billing_interval: undefined,
      billing_period: undefined,
      current_period_start: '2025-01-01T00:00:00Z',
      current_period_end: '2026-01-01T00:00:00Z',
    });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
  });

  it('recovers interval from identifier tokens when direct interval fields are missing', () => {
    const raw = makeSub({
      amount: 29.99,
      billing_interval: undefined,
      billing_period: undefined,
      current_period_start: undefined,
      current_period_end: undefined,
      price_id: 'price_pipekeeper_annual',
    });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.fieldResolution.sources.billingInterval).toMatch(/^recovered:/);
  });

  it('normalizes unknown plan key from apple product identifier when interval is known', () => {
    const raw = makeSub({
      planKey: undefined,
      plan_key: undefined,
      billing_interval: undefined,
      billing_period: 'year',
      amount: 49.99,
      apple_product_id: 'com.collectionkeeper.founders.annual',
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('founders_bundle_annual');
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(sub.fieldResolution.planKey).toBe('recovered');
  });

  it('recovers plan key directly from metadata plan_key', () => {
    const raw = makeSub({
      planKey: undefined,
      plan_key: undefined,
      amount: undefined,
      billing_interval: undefined,
      metadata_json: JSON.stringify({ plan_key: 'pipekeeper_pro_annual' }),
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('pipekeeper_pro_annual');
    expect(sub.billingInterval).toBe('annual');
    expect(sub.price).toBe(29.99);
    expect(sub.fieldResolution.planKey).toBe('direct');
  });

  it('backfills unknown plan key from modules + interval + tier hint when grounded', () => {
    const raw = makeSub({
      planKey: undefined,
      plan_key: undefined,
      amount: undefined,
      renewal_amount: undefined,
      billing_interval: 'monthly',
      modules_csv: 'cigarkeeper',
      subscription_tier: 'pro',
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('cigarkeeper_pro_monthly');
    expect(sub.fieldResolution.sources.planKey).toBe('recovered:modules_interval_backfill');
  });

  it('parses positive numeric values from formatted currency strings', () => {
    const raw = makeSub({
      amount: undefined,
      billing_interval: 'monthly',
      renewal_amount: '$7.99',
    });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(7.99);
    expect(sub.fieldResolution.price).toBe('recovered');
  });

  it('normalizes cent-based integer amount values into dollars when they match known plan prices', () => {
    const raw = makeSub({
      amount: 299,
      billing_interval: 'monthly',
      planKey: undefined,
      plan_key: undefined,
      modules_csv: undefined,
      primary_module: undefined,
    });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(2.99);
    expect(sub.fieldResolution.price).toBe('direct');
  });

  it('recovers historical legacy plan aliases to canonical plan keys', () => {
    const raw = makeSub({
      planKey: 'pipekeeper_monthly',
      amount: undefined,
      billing_interval: undefined,
      billing_period: undefined,
    });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBe('pipekeeper_pro_monthly');
    expect(sub.billingInterval).toBe('monthly');
    expect(sub.price).toBe(2.99);
  });

  it('uses user paid_modules_csv as a safe final module fallback', () => {
    const raw = makeSub({
      planKey: undefined,
      plan_key: undefined,
      amount: undefined,
      renewal_amount: undefined,
      modules_csv: undefined,
      primary_module: undefined,
      product_kind: undefined,
      product_label: undefined,
    });
    const user = { paid_modules_csv: 'pipekeeper,whiskeykeeper' };
    const sub = normalizeSub(raw, user);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('sets renewalAt to null when current_period_end is missing', () => {
    const raw = makeSub({ current_period_end: undefined });
    const sub = normalizeSub(raw);
    expect(sub.renewalAt).toBeNull();
  });

  it('sets module to unknown when no planKey, no modules_csv, no primary_module, and unrecognized amount', () => {
    // 9.99 is not a valid known plan price, so no product can be resolved
    const raw = makeSub({ product_kind: 'unrecognized_product_kind' });
    const sub = normalizeSub(raw);
    expect(sub.module).toBe('unknown');
    expect(sub.modules).toEqual(['unknown']);
  });

  it('uses started_at for createdAt when available', () => {
    const raw = makeSub({ started_at: '2024-01-15T00:00:00Z', created_date: '2024-03-01T00:00:00Z' });
    const sub = normalizeSub(raw);
    expect(sub.createdAt?.toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('falls back to created_date when started_at is missing', () => {
    const raw = makeSub({ started_at: undefined, created_date: '2024-03-01T00:00:00Z' });
    const sub = normalizeSub(raw);
    expect(sub.createdAt?.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  it('sets platform from subscription provider', () => {
    expect(normalizeSub(makeSub({ provider: 'apple' })).platform).toBe('ios');
    expect(normalizeSub(makeSub({ provider: 'stripe' })).platform).toBe('web');
    expect(normalizeSub(makeSub({ provider: 'google' })).platform).toBe('google');
  });

  it('sets platform to null when provider is unknown and no user', () => {
    const sub = normalizeSub(makeSub({ provider: undefined }));
    expect(sub.platform).toBeNull();
  });

  it('falls back to user platform when provider is missing', () => {
    const user = { platform: 'ios' };
    const sub = normalizeSub(makeSub({ provider: undefined }), user);
    expect(sub.platform).toBe('ios');
  });
});

// ─── PLAN_CATALOG ─────────────────────────────────────────────────────────────

describe('PLAN_CATALOG', () => {
  it('contains all expected plan keys', () => {
    const expectedKeys = [
      'pipekeeper_pro_monthly', 'pipekeeper_pro_annual',
      'whiskeykeeper_pro_monthly', 'whiskeykeeper_pro_annual',
      'cigarkeeper_pro_monthly', 'cigarkeeper_pro_annual',
      'winekeeper_pro_monthly', 'winekeeper_pro_annual',
      'founders_bundle_monthly', 'founders_bundle_annual',
      'three_module_bundle_monthly', 'three_module_bundle_annual',
      'four_module_bundle_monthly', 'four_module_bundle_annual',
    ];
    for (const key of expectedKeys) {
      expect(PLAN_CATALOG).toHaveProperty(key);
    }
  });

  it('every entry has modules, billingInterval, and price', () => {
    for (const [key, entry] of Object.entries(PLAN_CATALOG)) {
      expect(Array.isArray(entry.modules), `${key}: modules must be an array`).toBe(true);
      expect(entry.modules.length, `${key}: modules must not be empty`).toBeGreaterThan(0);
      expect(['monthly', 'annual'], `${key}: billingInterval must be monthly or annual`).toContain(entry.billingInterval);
      expect(typeof entry.price, `${key}: price must be a number`).toBe('number');
      expect(entry.price, `${key}: price must be > 0`).toBeGreaterThan(0);
    }
  });

  it('single-module plans have exactly one module', () => {
    const singles = ['pipekeeper_pro_monthly', 'whiskeykeeper_pro_annual', 'cigarkeeper_pro_monthly', 'winekeeper_pro_annual'];
    for (const key of singles) {
      expect(PLAN_CATALOG[key].modules).toHaveLength(1);
    }
  });

  it('bundle plans have multiple modules', () => {
    expect(PLAN_CATALOG.three_module_bundle_monthly.modules).toHaveLength(3);
    expect(PLAN_CATALOG.four_module_bundle_annual.modules).toHaveLength(4);
    // Founders bundle = PipeKeeper + WhiskeyKeeper ONLY (2 modules, not 4)
    expect(PLAN_CATALOG.founders_bundle_annual.modules).toHaveLength(2);
    expect(PLAN_CATALOG.founders_bundle_monthly.modules).toHaveLength(2);
    expect(PLAN_CATALOG.founders_bundle_annual.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(PLAN_CATALOG.founders_bundle_monthly.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });
});

describe('lookupPlanCatalog', () => {
  it('returns catalog entry for known plan key', () => {
    const entry = lookupPlanCatalog('pipekeeper_pro_monthly');
    expect(entry).not.toBeNull();
    expect(entry.modules).toEqual(['pipekeeper']);
    expect(entry.billingInterval).toBe('monthly');
    expect(entry.price).toBe(2.99);
  });

  it('is case-insensitive', () => {
    expect(lookupPlanCatalog('PIPEKEEPER_PRO_MONTHLY')).not.toBeNull();
    expect(lookupPlanCatalog('Pipekeeper_Pro_Annual')).not.toBeNull();
  });

  it('returns null for unknown plan key', () => {
    expect(lookupPlanCatalog('unknown_plan')).toBeNull();
    expect(lookupPlanCatalog('')).toBeNull();
    expect(lookupPlanCatalog(null)).toBeNull();
  });
});

// ─── normalizeSub: planKey-based resolution ───────────────────────────────────

describe('normalizeSub: planKey-based resolution', () => {
  it('uses catalog price when amount is zero and planKey is known', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 0 });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(2.99);
    expect(sub.planKey).toBe('pipekeeper_pro_monthly');
  });

  it('uses catalog price when amount is missing and planKey is known', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_annual', amount: undefined, billing_interval: undefined, billing_period: undefined });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(29.99);
    expect(sub.billingInterval).toBe('annual');
  });

  it('prefers raw.amount over catalog price when amount is non-zero', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 1.99 });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(1.99); // actual billed amount, not catalog
  });

  it('derives module from planKey', () => {
    const raw = makeSub({ planKey: 'whiskeykeeper_pro_monthly', amount: 2.99, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    expect(sub.module).toBe('whiskeykeeper');
    expect(sub.modules).toEqual(['whiskeykeeper']);
  });

  it('derives multiple modules from bundle planKey', () => {
    const raw = makeSub({ planKey: 'three_module_bundle_monthly', amount: 7.99, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(sub.module).toBe('pipekeeper');
  });

  it('four-module bundle covers all four modules', () => {
    const raw = makeSub({ planKey: 'four_module_bundle_annual', amount: 89.99, billing_interval: 'annual' });
    const sub = normalizeSub(raw);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });

  it('uses catalog billingInterval when billing_interval field is missing', () => {
    const raw = makeSub({ planKey: 'pipekeeper_pro_annual', amount: 0, billing_interval: undefined, billing_period: undefined });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
  });

  it('stores planKey as null when no plan key is present', () => {
    const raw = makeSub({ amount: 9.99 });
    const sub = normalizeSub(raw);
    expect(sub.planKey).toBeNull();
    expect(sub.fieldResolution.planKey).toBe('unresolved');
  });

  it('always exposes modules as an array', () => {
    const raw = makeSub({ amount: 9.99 });
    const sub = normalizeSub(raw);
    expect(Array.isArray(sub.modules)).toBe(true);
    expect(sub.modules.length).toBeGreaterThan(0);
  });
});

// ─── normalizePlatform ────────────────────────────────────────────────────────

describe('normalizePlatform', () => {
  it('returns ios for apple provider', () => {
    expect(normalizePlatform({ provider: 'apple' })).toBe('ios');
    expect(normalizePlatform({ provider: 'ios' })).toBe('ios');
  });

  it('returns google for android/google provider', () => {
    expect(normalizePlatform({ provider: 'google' })).toBe('google');
    expect(normalizePlatform({ provider: 'android' })).toBe('google');
    expect(normalizePlatform({ provider: 'googleplay' })).toBe('google');
  });

  it('returns web for stripe provider', () => {
    expect(normalizePlatform({ provider: 'stripe' })).toBe('web');
    expect(normalizePlatform({ provider: 'web' })).toBe('web');
  });

  it('is case-insensitive for provider', () => {
    expect(normalizePlatform({ provider: 'Apple' })).toBe('ios');
    expect(normalizePlatform({ provider: 'STRIPE' })).toBe('web');
  });

  it('falls back to user.platform when provider is missing', () => {
    expect(normalizePlatform({}, { platform: 'ios' })).toBe('ios');
    expect(normalizePlatform({}, { platform: 'android' })).toBe('google');
    expect(normalizePlatform({}, { platform: 'web' })).toBe('web');
  });

  it('falls back to user.data.platform when user.platform is missing', () => {
    expect(normalizePlatform({}, { data: { platform: 'apple' } })).toBe('ios');
  });

  it('returns null when provider is empty and user platform is empty', () => {
    expect(normalizePlatform({})).toBeNull();
    expect(normalizePlatform({}, null)).toBeNull();
    expect(normalizePlatform({}, { platform: '' })).toBeNull();
    expect(normalizePlatform({}, { platform: 'unknown' })).toBeNull();
  });

  it('provider takes precedence over user platform', () => {
    expect(normalizePlatform({ provider: 'stripe' }, { platform: 'ios' })).toBe('web');
  });
});

// ─── mrrContribution / computeMRRARR ──────────────────────────────────────────

describe('mrrContribution', () => {
  it('returns full price for monthly subscription', () => {
    const sub = normalizeSub(makeSub({ billing_interval: 'monthly', amount: 9.99 }));
    expect(mrrContribution(sub)).toBe(9.99);
  });

  it('returns price/12 for annual subscription', () => {
    const sub = normalizeSub(makeSub({ billing_interval: 'annual', amount: 120 }));
    expect(mrrContribution(sub)).toBeCloseTo(10, 5);
  });

  it('returns 0 for null billing interval', () => {
    const sub = normalizeSub(makeSub({ billing_interval: undefined, amount: 9.99 }));
    expect(mrrContribution(sub)).toBe(0);
  });

  it('returns 0 for null price', () => {
    const sub = normalizeSub(makeSub({ billing_interval: 'monthly', amount: 0 }));
    expect(mrrContribution(sub)).toBe(0);
  });

  it('returns 0 for inactive subscription', () => {
    const sub = normalizeSub(makeSub({ status: 'canceled', amount: 9.99, billing_interval: 'monthly' }));
    expect(mrrContribution(sub)).toBe(0);
  });
});

describe('computeMRRARR', () => {
  it('computes MRR correctly for mixed monthly and annual', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 10 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'monthly', amount: 10 })),
      normalizeSub(makeSub({ id: 'c', billing_interval: 'annual',  amount: 120 })),
    ];
    const { mrr, arr } = computeMRRARR(subs);
    // 10 + 10 + (120/12) = 30
    expect(mrr).toBeCloseTo(30, 2);
    expect(arr).toBeCloseTo(360, 2);
  });

  it('computes MRR for monthly-only subscriptions', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 9.99 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'monthly', amount: 9.99 })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBeCloseTo(19.98, 2);
  });

  it('computes MRR for annual-only subscriptions', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'annual', amount: 99.99 })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBeCloseTo(99.99 / 12, 2);
  });

  it('excludes subs with missing interval from MRR', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 10 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: undefined, amount: 10 })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(10);
  });

  it('excludes subs with missing price from MRR', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 10 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'monthly', amount: 0 })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(10);
  });

  it('returns 0 MRR and 0 ARR for empty array', () => {
    const { mrr, arr } = computeMRRARR([]);
    expect(mrr).toBe(0);
    expect(arr).toBe(0);
  });

  it('returns 0 MRR for free users only', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', status: 'trialing', amount: 0, billing_interval: 'monthly' })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(0);
  });

  it('ARR equals MRR times 12', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 15 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'annual',  amount: 180 })),
    ];
    const { mrr, arr } = computeMRRARR(subs);
    expect(arr).toBeCloseTo(mrr * 12, 2);
  });

  it('displayed ARR == displayed MRR * 12 exactly (regression: sub-cent totalMRR)', () => {
    // Scenario that triggered the confirmed bug:
    // multiple annual subs whose price/12 produces a totalMRR with sub-cent decimals.
    // e.g. 3 × annual $459 → mrrContribution each = 459/12 = 38.25 → totalMRR = 114.75 (clean)
    // Use a price where price/12 is non-terminating to force the rounding issue:
    // $137.65 / 12 = 11.47083... × 10 subs = 114.7083...
    // Old behaviour: mrr = 114.71, arr = round(114.7083... * 12, 2) = 1376.50  ≠ 114.71 * 12 = 1376.52
    const subs = [];
    for (let i = 0; i < 10; i++) {
      subs.push(normalizeSub(makeSub({ id: `sub_${i}`, billing_interval: 'annual', amount: 137.65 })));
    }
    const { mrr, arr } = computeMRRARR(subs);
    // arr must equal round(mrr * 12, 2) exactly — no sub-cent drift
    const expectedArr = parseFloat((mrr * 12).toFixed(2));
    expect(arr).toBe(expectedArr);
  });

  it('counts multiple paid subs for one user correctly', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', billing_interval: 'monthly', amount: 10 })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u1', billing_interval: 'monthly', amount: 10 })),
    ];
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(20);
  });
});

// ─── getCalendarRange ─────────────────────────────────────────────────────────

describe('getCalendarRange', () => {
  const wednesday = new Date('2025-04-02T14:30:00Z'); // Wednesday

  it('today: covers only the current UTC day', () => {
    const { start, end } = getCalendarRange('today', wednesday);
    expect(start.toISOString()).toBe('2025-04-02T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-04-02T23:59:59.999Z');
  });

  it('week: Monday to Sunday (ISO week)', () => {
    const { start, end } = getCalendarRange('week', wednesday);
    expect(start.toISOString()).toBe('2025-03-31T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2025-04-06T23:59:59.999Z');   // Sunday
  });

  it('week: Sunday stays in the same week ending Sunday', () => {
    const sunday = new Date('2025-04-06T10:00:00Z');
    const { start, end } = getCalendarRange('week', sunday);
    expect(start.toISOString()).toBe('2025-03-31T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-04-06T23:59:59.999Z');
  });

  it('week: Monday is the first day of its week', () => {
    const monday = new Date('2025-03-31T00:00:00Z');
    const { start } = getCalendarRange('week', monday);
    expect(start.toISOString()).toBe('2025-03-31T00:00:00.000Z');
  });

  it('month: covers the entire calendar month', () => {
    const { start, end } = getCalendarRange('month', wednesday);
    expect(start.toISOString()).toBe('2025-04-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-04-30T23:59:59.999Z');
  });

  it('quarter: Q2 April–June', () => {
    const { start, end } = getCalendarRange('quarter', wednesday);
    expect(start.toISOString()).toBe('2025-04-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-06-30T23:59:59.999Z');
  });

  it('quarter: Q1 January–March', () => {
    const jan = new Date('2025-01-15T12:00:00Z');
    const { start, end } = getCalendarRange('quarter', jan);
    expect(start.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-03-31T23:59:59.999Z');
  });

  it('year: covers the entire calendar year', () => {
    const { start, end } = getCalendarRange('year', wednesday);
    expect(start.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });

  it('today is always within the current week range', () => {
    const now = new Date('2025-04-02T14:30:00Z');
    const todayRange = getCalendarRange('today', now);
    const weekRange  = getCalendarRange('week',  now);
    // today start must be >= week start
    expect(todayRange.start >= weekRange.start).toBe(true);
    // today end must be <= week end
    expect(todayRange.end <= weekRange.end).toBe(true);
  });
});

// ─── calcRenewalPeriod ────────────────────────────────────────────────────────

describe('calcRenewalPeriod', () => {
  const range = {
    start: new Date('2025-04-01T00:00:00Z'),
    end:   new Date('2025-04-30T23:59:59.999Z'),
  };

  it('counts subscriptions renewing within the range', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 10, current_period_end: '2025-04-15T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u2', amount: 20, current_period_end: '2025-04-20T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'c', user_id: 'u3', amount: 30, current_period_end: '2025-05-01T00:00:00Z' })), // outside
    ];
    const result = calcRenewalPeriod(subs, range);
    expect(result.subscriptions).toBe(2);
    expect(result.customers).toBe(2);
    expect(result.revenue).toBeCloseTo(30, 2);
  });

  it('counts distinct customers even when one user has multiple renewing subs', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 10, current_period_end: '2025-04-10T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u1', amount: 10, current_period_end: '2025-04-20T00:00:00Z' })),
    ];
    const result = calcRenewalPeriod(subs, range);
    expect(result.subscriptions).toBe(2);
    expect(result.customers).toBe(1); // same user
    expect(result.revenue).toBe(20);
  });

  it('excludes subs with null renewalAt from renewal metrics', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 10, current_period_end: undefined })),
    ];
    const result = calcRenewalPeriod(subs, range);
    expect(result.subscriptions).toBe(0);
    expect(result.customers).toBe(0);
    expect(result.revenue).toBe(0);
  });

  it('uses actual billed price for revenue, not MRR-normalised', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', billing_interval: 'annual', amount: 120, current_period_end: '2025-04-10T00:00:00Z' })),
    ];
    const result = calcRenewalPeriod(subs, range);
    // Renewal revenue = actual billed amount ($120), NOT mrr contribution ($10)
    expect(result.revenue).toBe(120);
  });

  it('returns zero for empty input', () => {
    const result = calcRenewalPeriod([], range);
    expect(result.subscriptions).toBe(0);
    expect(result.customers).toBe(0);
    expect(result.revenue).toBe(0);
  });

  it('excludes subs with null price from renewal counts (rule 6)', () => {
    // A sub with no amount and no planKey → price=null → must NOT count in renewals
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 0,  current_period_end: '2025-04-15T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u2', amount: 10, current_period_end: '2025-04-15T00:00:00Z' })),
    ];
    // sub 'a' has price=null (amount=0, no planKey), sub 'b' has price=10
    expect(subs[0].price).toBeNull();
    expect(subs[1].price).toBe(10);

    const result = calcRenewalPeriod(subs, range);
    expect(result.subscriptions).toBe(1);   // only sub 'b'
    expect(result.customers).toBe(1);
    expect(result.revenue).toBe(10);
  });

  it('excludes subs with null billingInterval from renewal counts (rule 6)', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 10, billing_interval: undefined, billing_period: undefined, current_period_end: '2025-04-15T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u2', amount: 10, billing_interval: 'monthly',  current_period_end: '2025-04-15T00:00:00Z' })),
    ];
    expect(subs[0].billingInterval).toBeNull();

    const result = calcRenewalPeriod(subs, range);
    expect(result.subscriptions).toBe(1);   // only sub 'b'
    expect(result.customers).toBe(1);
    expect(result.revenue).toBe(10);
  });

  it('renewal count and revenue always reconcile — no sub can increase count without contributing revenue', () => {
    // Three subs: one valid, one no price, one no interval
    const subs = [
      normalizeSub(makeSub({ id: 'a', user_id: 'u1', amount: 9.99, billing_interval: 'monthly', current_period_end: '2025-04-15T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'b', user_id: 'u2', amount: 0,    billing_interval: 'monthly', current_period_end: '2025-04-15T00:00:00Z' })),
      normalizeSub(makeSub({ id: 'c', user_id: 'u3', amount: 9.99, billing_interval: undefined, current_period_end: '2025-04-15T00:00:00Z' })),
    ];
    const result = calcRenewalPeriod(subs, range);
    // Only sub 'a' qualifies
    expect(result.subscriptions).toBe(1);
    expect(result.revenue).toBeCloseTo(9.99, 2);
    // The sum of per-sub revenue for qualifying subs == reported revenue
    expect(result.revenue / result.subscriptions).toBeCloseTo(9.99, 2);
  });
});

// ─── runSanityChecks ─────────────────────────────────────────────────────────

describe('runSanityChecks', () => {
  function baseParams(overrides = {}) {
    return {
      newAccounts:   { today: 1, week: 3, month: 10, quarter: 25, year: 50 },
      paidAccounts:  5,
      totalAccounts: 50,
      mrr:           100,
      arr:           1200,
      renewals: {
        week:    { customers: 2, subscriptions: 3 },
        month:   { customers: 5, subscriptions: 6 },
        quarter: { customers: 10, subscriptions: 12 },
        year:    { customers: 20, subscriptions: 25 },
      },
      ...overrides,
    };
  }

  it('passes when all checks are valid', () => {
    const result = runSanityChecks(baseParams());
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails when paidAccounts > totalAccounts', () => {
    const result = runSanityChecks(baseParams({ paidAccounts: 100, totalAccounts: 50 }));
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('SANITY_FAIL') && f.includes('paidAccounts'))).toBe(true);
  });

  it('fails when arr !== mrr * 12', () => {
    const result = runSanityChecks(baseParams({ mrr: 100, arr: 1300 }));
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('SANITY_FAIL') && f.includes('arr'))).toBe(true);
  });

  it('passes when arr === mrr * 12 within float tolerance', () => {
    const mrr = 9.99;
    const arr = parseFloat((mrr * 12).toFixed(2));
    const result = runSanityChecks(baseParams({ mrr, arr }));
    expect(result.passed).toBe(true);
  });

  it('fails when renewal customers > renewal subscriptions', () => {
    const result = runSanityChecks(baseParams({
      renewals: {
        week:    { customers: 5, subscriptions: 3 }, // invalid
        month:   { customers: 5, subscriptions: 6 },
        quarter: { customers: 10, subscriptions: 12 },
        year:    { customers: 20, subscriptions: 25 },
      },
    }));
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('customers') && f.includes('subscriptions'))).toBe(true);
  });

  it('can report multiple failures simultaneously', () => {
    const result = runSanityChecks(baseParams({
      paidAccounts:  100,
      totalAccounts: 50,
      mrr: 100,
      arr: 1300,
    }));
    expect(result.failures.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Missing price / interval handling ───────────────────────────────────────

describe('missing field handling', () => {
  it('excludes sub with missing price from MRR but does not throw', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: 'monthly', amount: 0 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'monthly', amount: 10 })),
    ];
    expect(() => computeMRRARR(subs)).not.toThrow();
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(10);
  });

  it('excludes sub with missing interval from MRR but does not throw', () => {
    const subs = [
      normalizeSub(makeSub({ id: 'a', billing_interval: undefined, amount: 10 })),
      normalizeSub(makeSub({ id: 'b', billing_interval: 'monthly', amount: 10 })),
    ];
    expect(() => computeMRRARR(subs)).not.toThrow();
    const { mrr } = computeMRRARR(subs);
    expect(mrr).toBe(10);
  });

  it('sub with missing price still appears in subscription count (not excluded entirely)', () => {
    const raw = makeSub({ amount: 0, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    // isPaid is true (status=active), only price is null
    expect(sub.isPaid).toBe(true);
    expect(sub.price).toBeNull();
    // mrrContribution is 0 but sub still exists
    expect(mrrContribution(sub)).toBe(0);
  });

  it('sub with missing price is excluded from renewal counts but not from subscription count', () => {
    // The sub IS counted in paidSubs (subscription count) but NOT in calcRenewalPeriod
    const range = {
      start: new Date('2025-04-01T00:00:00Z'),
      end:   new Date('2025-04-30T23:59:59.999Z'),
    };
    const pricelessSub = normalizeSub(makeSub({ id: 'a', amount: 0, billing_interval: 'monthly', current_period_end: '2025-04-15T00:00:00Z' }));

    expect(pricelessSub.isPaid).toBe(true);   // counts as active paid
    expect(pricelessSub.price).toBeNull();    // excluded from revenue

    const result = calcRenewalPeriod([pricelessSub], range);
    expect(result.subscriptions).toBe(0);    // excluded from renewals
    expect(result.revenue).toBe(0);
  });
});

// ─── inferFromAmount ──────────────────────────────────────────────────────────

describe('inferFromAmount', () => {
  it('infers monthly interval from 1.99 (legacy single)', () => {
    const r = inferFromAmount(1.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('monthly');
    expect(r.isBundle).toBe(false);
    expect(r.modules).toBeNull(); // single: module unknown from amount alone
  });

  it('infers annual interval from 19.99 (legacy single annual)', () => {
    const r = inferFromAmount(19.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('annual');
    expect(r.isBundle).toBe(false);
  });

  it('infers monthly pro from 2.99', () => {
    const r = inferFromAmount(2.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('monthly');
    expect(r.isBundle).toBe(false);
  });

  it('infers founders bundle monthly from 4.99', () => {
    const r = inferFromAmount(4.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('monthly');
    expect(r.isBundle).toBe(true);
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('infers founders bundle annual from 49.99', () => {
    const r = inferFromAmount(49.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('annual');
    expect(r.isBundle).toBe(true);
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('infers 3-module bundle monthly from 7.99', () => {
    const r = inferFromAmount(7.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('monthly');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  });

  it('infers 4-module bundle annual from 89.99', () => {
    const r = inferFromAmount(89.99);
    expect(r).not.toBeNull();
    expect(r.billingInterval).toBe('annual');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });

  it('returns null for invalid legacy 9.99', () => {
    expect(inferFromAmount(9.99)).toBeNull();
  });

  it('returns null for invalid legacy 99.99', () => {
    expect(inferFromAmount(99.99)).toBeNull();
  });

  it('returns null for completely unknown amounts', () => {
    expect(inferFromAmount(0)).toBeNull();
    expect(inferFromAmount(5.00)).toBeNull();
    expect(inferFromAmount(100)).toBeNull();
  });
});

// ─── getProductFamilyKey ──────────────────────────────────────────────────────

describe('getProductFamilyKey', () => {
  it('single pipekeeper gets single:: key', () => {
    const sub = normalizeSub(makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 2.99, billing_interval: 'monthly' }));
    expect(getProductFamilyKey(sub)).toBe('single::pipekeeper');
  });

  it('bundle sub gets bundle:: key with sorted modules', () => {
    const sub = normalizeSub(makeSub({ planKey: 'founders_bundle_annual', amount: 49.99, billing_interval: 'annual' }));
    expect(getProductFamilyKey(sub)).toMatch(/^bundle::/);
    expect(getProductFamilyKey(sub)).toBe('bundle::pipekeeper,whiskeykeeper');
  });

  it('three-module bundle key includes all three modules sorted', () => {
    const sub = normalizeSub(makeSub({ planKey: 'three_module_bundle_monthly', amount: 7.99, billing_interval: 'monthly' }));
    expect(getProductFamilyKey(sub)).toBe('bundle::cigarkeeper,pipekeeper,whiskeykeeper');
  });

  it('unknown product gets unique key (not collapsed)', () => {
    const sub = normalizeSub(makeSub({ amount: 0, billing_interval: 'monthly' }));
    expect(getProductFamilyKey(sub)).toMatch(/^unknown::/);
  });
});

// ─── deduplicateActivePaidSubs ────────────────────────────────────────────────

describe('deduplicateActivePaidSubs', () => {
  it('keeps a single subscription unchanged', () => {
    const subs = [normalizeSub(makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 2.99, id: 'sub_1' }))];
    const { deduped, duplicatesRemoved } = deduplicateActivePaidSubs(subs);
    expect(deduped).toHaveLength(1);
    expect(duplicatesRemoved).toBe(0);
  });

  it('deduplicates two subscriptions for the same user and product, keeping the most recent', () => {
    const older = normalizeSub(makeSub({
      planKey: 'pipekeeper_pro_monthly', amount: 2.99, id: 'sub_old',
      started_at: '2024-01-01T00:00:00Z',
    }));
    const newer = normalizeSub(makeSub({
      planKey: 'pipekeeper_pro_monthly', amount: 2.99, id: 'sub_new',
      started_at: '2025-01-01T00:00:00Z',
    }));
    const { deduped, duplicatesRemoved } = deduplicateActivePaidSubs([older, newer]);
    expect(deduped).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
    expect(deduped[0].rawId).toBe('sub_new');
  });

  it('does not collapse different products for the same user', () => {
    const pk = normalizeSub(makeSub({ planKey: 'pipekeeper_pro_monthly',    amount: 2.99, id: 'sub_pk' }));
    const wk = normalizeSub(makeSub({ planKey: 'whiskeykeeper_pro_monthly', amount: 2.99, id: 'sub_wk' }));
    const { deduped, duplicatesRemoved } = deduplicateActivePaidSubs([pk, wk]);
    expect(deduped).toHaveLength(2);
    expect(duplicatesRemoved).toBe(0);
  });

  it('does not collapse different users with the same product', () => {
    const user1 = normalizeSub(makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 2.99, id: 'sub_1', user_id: 'user_1', user_email: 'a@example.com' }));
    const user2 = normalizeSub(makeSub({ planKey: 'pipekeeper_pro_monthly', amount: 2.99, id: 'sub_2', user_id: 'user_2', user_email: 'b@example.com' }));
    const { deduped } = deduplicateActivePaidSubs([user1, user2]);
    expect(deduped).toHaveLength(2);
  });

  it('does not collapse two bundle subscriptions with different module sets', () => {
    const founders = normalizeSub(makeSub({ planKey: 'founders_bundle_monthly',     amount: 4.99, id: 'sub_f' }));
    const three    = normalizeSub(makeSub({ planKey: 'three_module_bundle_monthly',  amount: 7.99, id: 'sub_3' }));
    const { deduped } = deduplicateActivePaidSubs([founders, three]);
    expect(deduped).toHaveLength(2);
  });

  it('does not collapse unknown products with each other', () => {
    const unk1 = normalizeSub(makeSub({ amount: 0, id: 'unk_1', billing_interval: 'monthly' }));
    const unk2 = normalizeSub(makeSub({ amount: 0, id: 'unk_2', billing_interval: 'monthly' }));
    // Both are 'unknown', but should not collapse
    const { deduped } = deduplicateActivePaidSubs([unk1, unk2]);
    expect(deduped).toHaveLength(2);
  });
});

// ─── Edge cases A–J (from subscription reporting requirements) ────────────────

describe('Edge cases: subscription normalization correctness', () => {
  // A. single PipeKeeper monthly with full data
  it('A: single PipeKeeper monthly with full data normalizes correctly', () => {
    const raw = makeSub({
      planKey: 'pipekeeper_pro_monthly',
      amount: 2.99,
      billing_interval: 'monthly',
      user_id: 'user_pk',
      user_email: 'pk@example.com',
      status: 'active',
    });
    const sub = normalizeSub(raw);
    expect(sub.module).toBe('pipekeeper');
    expect(sub.modules).toEqual(['pipekeeper']);
    expect(sub.billingInterval).toBe('monthly');
    expect(sub.price).toBe(2.99);
    expect(sub.inferredPrice).toBe(false);
    expect(sub.isPaid).toBe(true);
    expect(sub.isBundle).toBe(false);
    expect(sub.planKey).toBe('pipekeeper_pro_monthly');
  });

  // B. single PipeKeeper annual missing amount but known planKey → price inferred from catalog
  it('B: single PipeKeeper annual — missing amount, known planKey → price inferred from catalog', () => {
    const raw = makeSub({
      planKey: 'pipekeeper_pro_annual',
      amount: 0,
      billing_interval: undefined,
      billing_period: undefined,
    });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(29.99);
    expect(sub.inferredPrice).toBe(true);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.module).toBe('pipekeeper');
    // sub still counts as paid (status=active)
    expect(sub.isPaid).toBe(true);
    expect(mrrContribution(sub)).toBeCloseTo(29.99 / 12, 4);
  });

  // C. single WhiskeyKeeper annual — missing interval but known planKey → interval inferred
  it('C: single WhiskeyKeeper annual — missing billing_interval, known planKey → interval from catalog', () => {
    const raw = makeSub({
      planKey: 'whiskeykeeper_pro_annual',
      amount: 29.99,
      billing_interval: undefined,
      billing_period: undefined,
    });
    const sub = normalizeSub(raw);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.module).toBe('whiskeykeeper');
    expect(sub.modules).toEqual(['whiskeykeeper']);
  });

  // D. founders bundle monthly → PK + WK (2 modules, not 4)
  it('D: founders bundle monthly → PipeKeeper + WhiskeyKeeper only (2 modules)', () => {
    const raw = makeSub({
      planKey: 'founders_bundle_monthly',
      amount: 4.99,
      billing_interval: 'monthly',
    });
    const sub = normalizeSub(raw);
    expect(sub.isBundle).toBe(true);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(sub.modules).toHaveLength(2);
    expect(sub.billingInterval).toBe('monthly');
    expect(sub.price).toBe(4.99);
  });

  // E. founders bundle annual → PK + WK (2 modules, not 4)
  it('E: founders bundle annual → PipeKeeper + WhiskeyKeeper only (2 modules, $49.99)', () => {
    const raw = makeSub({
      planKey: 'founders_bundle_annual',
      amount: 49.99,
      billing_interval: 'annual',
    });
    const sub = normalizeSub(raw);
    expect(sub.isBundle).toBe(true);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(sub.modules).toHaveLength(2);
    expect(sub.billingInterval).toBe('annual');
    expect(sub.price).toBe(49.99);
  });

  // F. duplicate active rows same user same product → keep most recent
  it('F: duplicate active rows for same user+product → dedup keeps most recent', () => {
    const olderSub = makeSub({
      id: 'sub_old', planKey: 'pipekeeper_pro_monthly', amount: 2.99,
      started_at: '2023-06-01T00:00:00Z', user_id: 'user_dup', user_email: 'dup@example.com',
    });
    const newerSub = makeSub({
      id: 'sub_new', planKey: 'pipekeeper_pro_monthly', amount: 2.99,
      started_at: '2025-03-01T00:00:00Z', user_id: 'user_dup', user_email: 'dup@example.com',
    });
    const normalized = [normalizeSub(olderSub), normalizeSub(newerSub)];
    const { deduped, duplicatesRemoved } = deduplicateActivePaidSubs(normalized);
    expect(deduped).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
    expect(deduped[0].rawId).toBe('sub_new');
  });

  // G. active row with unknown product → module='unknown', NOT 'pipekeeper'
  it('G: active row with unknown product (no planKey, no primary_module, unrecognized amount) → module=unknown', () => {
    const raw = makeSub({ amount: 0, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    expect(sub.module).toBe('unknown');
    expect(sub.modules).toEqual(['unknown']);
    expect(sub.isPaid).toBe(true); // status=active, still counts as paid
  });

  // H. row with no amount but known product + interval → infer amount, count in MRR/ARR
  it('H: no amount + known planKey+interval → catalog price inferred, counts in MRR', () => {
    const raw = makeSub({
      planKey: 'pipekeeper_pro_monthly',
      amount: 0,
      billing_interval: 'monthly',
      status: 'active',
    });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(2.99);
    expect(sub.inferredPrice).toBe(true);
    expect(sub.billingInterval).toBe('monthly');
    const { mrr } = computeMRRARR([sub]);
    expect(mrr).toBeCloseTo(2.99, 2);
  });

  // I. row with invalid legacy 9.99/99.99 → not treated as a valid catalog plan
  it('I: amount 9.99 is not a valid catalog price → no interval or module inferred from amount', () => {
    const raw = makeSub({ amount: 9.99, billing_interval: undefined, billing_period: undefined });
    const sub = normalizeSub(raw);
    // Price is still stored (raw billed amount)
    expect(sub.price).toBe(9.99);
    // But interval cannot be inferred from 9.99 (invalid price)
    expect(sub.billingInterval).toBeNull();
    // Module is unknown (9.99 maps to no known plan)
    expect(sub.module).toBe('unknown');
  });

  it('I: amount 99.99 is not a valid catalog price → module unknown, interval null', () => {
    const raw = makeSub({ amount: 99.99, billing_interval: undefined, billing_period: undefined });
    const sub = normalizeSub(raw);
    expect(sub.price).toBe(99.99);
    expect(sub.billingInterval).toBeNull();
    expect(sub.module).toBe('unknown');
  });

  // J. multi-module bundle counts as 1 subscription, modules visible in breakdown
  it('J: 3-module bundle counts as 1 subscription, all 3 modules reflected', () => {
    const raw = makeSub({
      planKey: 'three_module_bundle_monthly',
      amount: 7.99,
      billing_interval: 'monthly',
    });
    const sub = normalizeSub(raw);
    expect(sub.isBundle).toBe(true);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(sub.modules).toHaveLength(3);
    // Subscription contributes as 1 to MRR
    const { mrr } = computeMRRARR([sub]);
    expect(mrr).toBeCloseTo(7.99, 2);
    // Dedup: 1 bundle counts as 1 subscription (not 3)
    const { deduped } = deduplicateActivePaidSubs([sub]);
    expect(deduped).toHaveLength(1);
  });

  // Additional: founders bundle identified by amount when planKey missing
  it('founders bundle inferred by amount 4.99 when no planKey', () => {
    const raw = makeSub({ amount: 4.99, billing_interval: 'monthly', planKey: undefined });
    const sub = normalizeSub(raw);
    expect(sub.isBundle).toBe(true);
    expect(sub.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  // Additional: modules_csv field respected
  it('modules_csv field provides explicit module list when no planKey', () => {
    const raw = makeSub({ modules_csv: 'pipekeeper,cigarkeeper', amount: 0, billing_interval: 'monthly' });
    const sub = normalizeSub(raw);
    expect(sub.modules).toEqual(['pipekeeper', 'cigarkeeper']);
    expect(sub.isBundle).toBe(true);
  });

  // Additional: primary_module field respected
  it('primary_module field provides module when no planKey and no modules_csv', () => {
    const raw = makeSub({ primary_module: 'whiskeykeeper', amount: 2.99, billing_interval: 'monthly', planKey: undefined });
    const sub = normalizeSub(raw);
    expect(sub.module).toBe('whiskeykeeper');
    expect(sub.modules).toEqual(['whiskeykeeper']);
  });
});
