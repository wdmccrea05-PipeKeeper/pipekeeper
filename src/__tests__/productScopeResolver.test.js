/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { resolveProductScope, buildPriceIdMap, PLAN_CATALOG, normalizeModule } from '../lib/billing/productScopeResolver';

const TEST_PRICE_MAP = buildPriceIdMap({
  VITE_STRIPE_PIPEKEEPER_MONTHLY: 'price_pk_m',
  VITE_STRIPE_PIPEKEEPER_ANNUAL: 'price_pk_a',
  VITE_STRIPE_WHISKEYKEEPER_MONTHLY: 'price_wk_m',
  VITE_STRIPE_WHISKEYKEEPER_ANNUAL: 'price_wk_a',
  VITE_STRIPE_CIGARKEEPER_MONTHLY: 'price_ck_m',
  VITE_STRIPE_CIGARKEEPER_ANNUAL: 'price_ck_a',
  VITE_STRIPE_WINEKEEPER_MONTHLY: 'price_vk_m',
  VITE_STRIPE_WINEKEEPER_ANNUAL: 'price_vk_a',
  VITE_STRIPE_FOUNDERS_MONTHLY: 'price_fb_m',
  VITE_STRIPE_FOUNDERS_ANNUAL: 'price_fb_a',
  VITE_STRIPE_THREE_BUNDLE_MONTHLY: 'price_3b_m',
  VITE_STRIPE_THREE_BUNDLE_ANNUAL: 'price_3b_a',
  VITE_STRIPE_FOUR_BUNDLE_MONTHLY: 'price_4b_m',
  VITE_STRIPE_FOUR_BUNDLE_ANNUAL: 'price_4b_a',
});

// ═══════════════════════════════════════════════════════════════════════════
// PRICE ID LOOKUP (highest confidence)
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — Price ID lookup', () => {
  it('resolves PipeKeeper monthly from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_pk_m', billing_interval: 'monthly' }, TEST_PRICE_MAP);
    expect(r.product).toBe('pipekeeper');
    expect(r.modules).toEqual(['pipekeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves PipeKeeper annual from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_pk_a', billing_interval: 'year' }, TEST_PRICE_MAP);
    expect(r.product).toBe('pipekeeper');
    expect(r.modules).toEqual(['pipekeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves WhiskeyKeeper annual from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_wk_a' }, TEST_PRICE_MAP);
    expect(r.product).toBe('whiskeykeeper');
    expect(r.modules).toEqual(['whiskeykeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves CigarKeeper monthly from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_ck_m' }, TEST_PRICE_MAP);
    expect(r.product).toBe('cigarkeeper');
    expect(r.modules).toEqual(['cigarkeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves WineKeeper annual from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_vk_a' }, TEST_PRICE_MAP);
    expect(r.product).toBe('winekeeper');
    expect(r.modules).toEqual(['winekeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves Founders bundle monthly from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_fb_m' }, TEST_PRICE_MAP);
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(r.bundle_name).toBe('Founders');
    expect(r.confidence).toBe('high');
  });

  it('resolves 3-module bundle annual from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_3b_a' }, TEST_PRICE_MAP);
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(r.bundle_name).toBe('3-Module');
    expect(r.confidence).toBe('high');
  });

  it('resolves 4-module bundle monthly from price ID', () => {
    const r = resolveProductScope({ price_id: 'price_4b_m' }, TEST_PRICE_MAP);
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
    expect(r.bundle_name).toBe('4-Module');
    expect(r.confidence).toBe('high');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLAN KEY LOOKUP
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — Plan key lookup', () => {
  it('resolves from plan_key pipekeeper_pro_annual', () => {
    const r = resolveProductScope({ plan_key: 'pipekeeper_pro_annual' });
    expect(r.product).toBe('pipekeeper');
    expect(r.modules).toEqual(['pipekeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves from plan_key three_module_bundle_monthly', () => {
    const r = resolveProductScope({ plan_key: 'three_module_bundle_monthly' });
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves from plan_key four_module_bundle_annual', () => {
    const r = resolveProductScope({ plan_key: 'four_module_bundle_annual' });
    expect(r.product).toBe('bundle');
    expect(r.modules).toHaveLength(4);
    expect(r.confidence).toBe('high');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODULES_CSV / MODULES ARRAY
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — modules_csv and array', () => {
  it('resolves single module from modules_csv', () => {
    const r = resolveProductScope({ modules_csv: 'pipekeeper', billing_interval: 'year' });
    expect(r.product).toBe('pipekeeper');
    expect(r.modules).toEqual(['pipekeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves multi-module from modules_csv', () => {
    const r = resolveProductScope({ modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper' });
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(r.confidence).toBe('high');
  });

  it('resolves from modules array with aliases', () => {
    const r = resolveProductScope({ modules: ['pipe', 'whiskey'] });
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(r.product).toBe('bundle');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY_MODULE
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — primary_module', () => {
  it('resolves from primary_module pipekeeper', () => {
    const r = resolveProductScope({ primary_module: 'pipekeeper', billing_interval: 'month' });
    expect(r.product).toBe('pipekeeper');
    expect(r.confidence).toBe('medium');
  });

  it('normalizes primary_module alias', () => {
    const r = resolveProductScope({ primary_module: 'cigar' });
    expect(r.product).toBe('cigarkeeper');
    expect(r.confidence).toBe('medium');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT_KIND / CHECKOUT_TYPE
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — product_kind and checkout_type', () => {
  it('resolves founders from product_kind', () => {
    const r = resolveProductScope({ product_kind: 'founders' });
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(r.bundle_name).toBe('Founders');
    expect(r.confidence).toBe('medium');
  });

  it('resolves bundle_3 from checkout_type', () => {
    const r = resolveProductScope({ checkout_type: 'bundle_3' });
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(r.confidence).toBe('medium');
  });

  it('resolves bundle_4 from checkout_type', () => {
    const r = resolveProductScope({ checkout_type: 'bundle_4' });
    expect(r.modules).toHaveLength(4);
    expect(r.confidence).toBe('medium');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AMOUNT LOOKUP (legacy and current)
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — amount lookup', () => {
  it('resolves legacy $19.99/year as PipeKeeper (pre-price-increase)', () => {
    const r = resolveProductScope({ amount_cents: 1999, billing_interval: 'year' });
    expect(r.product).toBe('pipekeeper');
    expect(r.modules).toEqual(['pipekeeper']);
    expect(r.confidence).toBe('low');
    expect(r.source).toContain('Legacy');
  });

  it('resolves legacy $1.99/month as PipeKeeper', () => {
    const r = resolveProductScope({ amount_cents: 199, billing_interval: 'month' });
    expect(r.product).toBe('pipekeeper');
    expect(r.confidence).toBe('low');
  });

  it('resolves $29.99/year as single module (historically PipeKeeper)', () => {
    const r = resolveProductScope({ amount_cents: 2999, billing_interval: 'year' });
    expect(r.product).toBe('pipekeeper');
    expect(r.confidence).toBe('low');
  });

  it('resolves $2.99/month as single module (historically PipeKeeper)', () => {
    const r = resolveProductScope({ amount_cents: 299, billing_interval: 'month' });
    expect(r.product).toBe('pipekeeper');
    expect(r.confidence).toBe('low');
  });

  it('resolves legacy $9.99/month as Founders bundle', () => {
    const r = resolveProductScope({ amount_cents: 999, billing_interval: 'month' });
    expect(r.product).toBe('bundle');
    expect(r.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(r.confidence).toBe('low');
  });

  it('accepts amount in dollars (legacy Subscription.amount)', () => {
    const r = resolveProductScope({ amount: 19.99, billing_interval: 'year' });
    expect(r.product).toBe('pipekeeper');
    expect(r.confidence).toBe('low');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EXISTING PRODUCT FIELD
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — existing product field', () => {
  it('uses existing product field when known', () => {
    const r = resolveProductScope({ product: 'whiskeykeeper', billing_interval: 'annual' });
    expect(r.product).toBe('whiskeykeeper');
    expect(r.modules).toEqual(['whiskeykeeper']);
    expect(r.confidence).toBe('medium');
  });

  it('uses existing bundle product with bundle_name', () => {
    const r = resolveProductScope({ product: 'bundle', bundle_name: 'Founders' });
    expect(r.product).toBe('bundle');
    expect(r.confidence).toBe('medium');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNRESOLVED
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — unresolved', () => {
  it('returns unresolved when no evidence', () => {
    const r = resolveProductScope({});
    expect(r.product).toBe('unknown');
    expect(r.modules).toEqual([]);
    expect(r.confidence).toBe('unresolved');
    expect(r.unresolved_reason).toBeDefined();
  });

  it('returns unresolved for unknown amount+interval', () => {
    const r = resolveProductScope({ amount_cents: 555, billing_interval: 'month' });
    expect(r.confidence).toBe('unresolved');
  });

  it('returns unresolved for product=unknown', () => {
    const r = resolveProductScope({ product: 'unknown', amount_cents: 555, billing_interval: 'week' });
    expect(r.confidence).toBe('unresolved');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY ORDER
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — priority order', () => {
  it('price_id takes priority over plan_key', () => {
    const r = resolveProductScope({ price_id: 'price_pk_a', plan_key: 'whiskeykeeper_pro_annual' }, TEST_PRICE_MAP);
    expect(r.product).toBe('pipekeeper');
    expect(r.source).toContain('price_id');
  });

  it('plan_key takes priority over modules_csv', () => {
    const r = resolveProductScope({ plan_key: 'pipekeeper_pro_annual', modules_csv: 'whiskeykeeper' });
    expect(r.product).toBe('pipekeeper');
    expect(r.source).toContain('plan_key');
  });

  it('modules_csv takes priority over amount', () => {
    const r = resolveProductScope({ modules_csv: 'cigarkeeper', amount_cents: 1999, billing_interval: 'year' });
    expect(r.product).toBe('cigarkeeper');
    expect(r.source).toContain('modules_csv');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MODULE NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — module normalization', () => {
  it('normalizes pipe → pipekeeper', () => {
    expect(normalizeModule('pipe')).toBe('pipekeeper');
  });

  it('normalizes whiskey → whiskeykeeper', () => {
    expect(normalizeModule('whiskey')).toBe('whiskeykeeper');
  });

  it('normalizes cigar → cigarkeeper', () => {
    expect(normalizeModule('cigar')).toBe('cigarkeeper');
  });

  it('normalizes wine → winekeeper', () => {
    expect(normalizeModule('wine')).toBe('winekeeper');
  });

  it('passes through canonical names', () => {
    expect(normalizeModule('pipekeeper')).toBe('pipekeeper');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERVAL NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════
describe('Product Scope Resolver — interval normalization', () => {
  it('normalizes year → annual', () => {
    const r = resolveProductScope({ amount_cents: 1999, billing_interval: 'year' });
    expect(r.billing_interval).toBe('annual');
  });

  it('normalizes yearly → annual', () => {
    const r = resolveProductScope({ amount_cents: 1999, billing_interval: 'yearly' });
    expect(r.billing_interval).toBe('annual');
  });

  it('normalizes month → monthly', () => {
    const r = resolveProductScope({ amount_cents: 299, billing_interval: 'month' });
    expect(r.billing_interval).toBe('monthly');
  });
});