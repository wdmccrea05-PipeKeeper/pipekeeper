import { describe, it, expect } from 'vitest';
import { resolveHistoricalPlan } from '../lib/billing/historicalPlanResolver';

const PLAN_DISPLAY = {
  pipekeeper_pro_monthly: { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  pipekeeper_pro_annual: { display_name: 'PipeKeeper Individual', plan_type: 'single', modules: ['pipekeeper'] },
  whiskeykeeper_pro_annual: { display_name: 'WhiskeyKeeper Individual', plan_type: 'single', modules: ['whiskeykeeper'] },
  founders_bundle_monthly: { display_name: 'Founders Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'] },
  three_module_bundle_monthly: { display_name: 'Three-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'] },
  four_module_bundle_monthly: { display_name: 'Four-Module Bundle', plan_type: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'] },
};

const PRICE_ID_MAP = {
  price_pk_m: 'pipekeeper_pro_monthly',
  price_pk_a: 'pipekeeper_pro_annual',
  price_wk_a: 'whiskeykeeper_pro_annual',
  price_founders_m: 'founders_bundle_monthly',
  price_3bundle_m: 'three_module_bundle_monthly',
  price_4bundle_m: 'four_module_bundle_monthly',
};

describe('historicalPlanResolver', () => {

  // ── 1. Bundle purchase found only in checkout metadata ──
  it('resolves bundle from checkout_type metadata', () => {
    const result = resolveHistoricalPlan(
      { checkout_type: 'bundle_3', plan_key: '', product_kind: '', modules_csv: '' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('CHECKOUT_EXPLICIT');
    expect(result.confidence).toBe('high');
    expect(result.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  });

  it('resolves Founders bundle from checkout_type bundle_2', () => {
    const result = resolveHistoricalPlan(
      { checkout_type: 'bundle_2' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Founders Bundle');
    expect(result.classification).toBe('CHECKOUT_EXPLICIT');
  });

  // ── 2. Bundle purchase found only from archived Price ──
  it('resolves bundle from env price map (archived price)', () => {
    const result = resolveHistoricalPlan(
      { plan_key: '', product_kind: '', modules_csv: '', product_id: 'price_3bundle_m' },
      { price_id: 'price_3bundle_m', product_id: 'prod_3bundle' },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('ENV_PRICE_RESOLVED');
    expect(result.confidence).toBe('high');
  });

  // ── 3. Bundle purchase represented by multiple subscription items ──
  it('resolves bundle from multi-item subscription', () => {
    const result = resolveHistoricalPlan(
      { plan_key: '', product_kind: '', modules_csv: '' },
      {
        item_count: 2,
        all_items: [
          { product_name: 'PipeKeeper Pro', price_id: 'price_pk_m' },
          { product_name: 'WhiskeyKeeper Pro', price_id: 'price_wk_m' },
        ],
      },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Founders Bundle');
    expect(result.classification).toBe('MULTI_ITEM_BUNDLE');
    expect(result.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
  });

  it('resolves 4-module bundle from 4-item subscription', () => {
    const result = resolveHistoricalPlan(
      {},
      {
        item_count: 4,
        all_items: [
          { product_name: 'PipeKeeper Pro' },
          { product_name: 'WhiskeyKeeper Pro' },
          { product_name: 'CigarKeeper Pro' },
          { product_name: 'WineKeeper Pro' },
        ],
      },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Four-Module Bundle');
    expect(result.classification).toBe('MULTI_ITEM_BUNDLE');
  });

  // ── 4. Bundle purchase preserved only in internal plan_key ──
  it('resolves bundle from internal plan_key', () => {
    const result = resolveHistoricalPlan(
      { plan_key: 'three_module_bundle_monthly' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
    expect(result.confidence).toBe('high');
  });

  // ── 5. Same Stripe Product used for individual and bundle Price ──
  it('resolves single from product name when same product has bundle price', () => {
    // A generic PipeKeeper product name should resolve to PipeKeeper Individual
    const result = resolveHistoricalPlan(
      { plan_key: '', product_kind: '', modules_csv: '' },
      { product_name: 'PipeKeeper Pro', price_id: 'price_pk_m' },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    // Env price map should take priority over product name
    expect(result.classification).toBe('ENV_PRICE_RESOLVED');
    expect(result.plan_family).toBe('PipeKeeper Individual');
  });

  it('resolves bundle from product name when no other evidence', () => {
    const result = resolveHistoricalPlan(
      {},
      { product_name: 'Three-Module Bundle', price_id: 'price_unknown' },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('PRODUCT_NAME_RESOLVED');
    expect(result.confidence).toBe('medium');
  });

  // ── 6. Subscription upgraded from individual to bundle ──
  it('resolves current state as bundle when plan_key is bundle', () => {
    // The resolver resolves the CURRENT state of the subscription
    // Historical plan changes are detected by examining multiple billing rows
    const result = resolveHistoricalPlan(
      { plan_key: 'founders_bundle_monthly' },
      { product_name: 'PipeKeeper Pro', price_id: 'price_founders_m' },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    // Internal plan_key takes priority over product name
    expect(result.plan_family).toBe('Founders Bundle');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  // ── 7. Historical plan differs from current plan ──
  it('resolves product_kind single with primary_module', () => {
    const result = resolveHistoricalPlan(
      { product_kind: 'single', primary_module: 'whiskeykeeper' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('WhiskeyKeeper Individual');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  // ── 8. Unresolved remains unresolved when evidence conflicts ──
  it('remains unresolved when no evidence matches', () => {
    const result = resolveHistoricalPlan(
      { plan_key: '', product_kind: '', modules_csv: '', amount: 99.99, billing_interval: 'month' },
      { price_id: 'price_unknown', product_name: 'Unknown Product' },
      PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.classification).toBe('UNRESOLVED');
    expect(result.plan_family).toBeNull();
    expect(result.reason_unresolved).toBeTruthy();
  });

  it('remains unresolved with empty subscription and no stripe data', () => {
    const result = resolveHistoricalPlan({}, null, PRICE_ID_MAP, PLAN_DISPLAY);
    expect(result.classification).toBe('UNRESOLVED');
    expect(result.reason_unresolved).toBe('No evidence found for commercial plan');
  });

  // ── modules_csv resolution ──
  it('resolves bundle from modules_csv with 3 modules', () => {
    const result = resolveHistoricalPlan(
      { modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  it('resolves single from modules_csv with 1 module', () => {
    const result = resolveHistoricalPlan(
      { modules_csv: 'whiskeykeeper' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('WhiskeyKeeper Individual');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  // ── product_kind resolution ──
  it('resolves founders from product_kind', () => {
    const result = resolveHistoricalPlan(
      { product_kind: 'founders' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Founders Bundle');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  it('resolves 4-module bundle from product_kind', () => {
    const result = resolveHistoricalPlan(
      { product_kind: 'bundle_4' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('Four-Module Bundle');
    expect(result.classification).toBe('INTERNAL_EXPLICIT');
  });

  // ── Amount inference (weak, last resort) ──
  it('infers PipeKeeper annual from amount/interval', () => {
    const result = resolveHistoricalPlan(
      { amount: 29.99, billing_interval: 'year' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.plan_family).toBe('PipeKeeper Individual');
    expect(result.classification).toBe('AMOUNT_INFERRED');
    expect(result.confidence).toBe('low');
  });

  it('does not infer from high annual amount (could be bundle)', () => {
    const result = resolveHistoricalPlan(
      { amount: 99.99, billing_interval: 'year' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.classification).toBe('UNRESOLVED');
    expect(result.reason_unresolved).toContain('does not match');
  });

  // ── Registry resolution ──
  it('resolves from registry mapping', () => {
    const registry = [{
      product_id: 'prod_xxx',
      canonical_plan_key: 'three_module_bundle_monthly',
      canonical_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
    }];
    const result = resolveHistoricalPlan(
      {},
      { product_id: 'prod_xxx', price_id: 'price_xxx' },
      PRICE_ID_MAP, PLAN_DISPLAY, registry,
    );
    expect(result.plan_family).toBe('Three-Module Bundle');
    expect(result.classification).toBe('REGISTRY_RESOLVED');
    expect(result.confidence).toBe('high');
  });

  // ── Priority ordering ──
  it('checkout_type takes priority over plan_key', () => {
    const result = resolveHistoricalPlan(
      { checkout_type: 'bundle_3', plan_key: 'pipekeeper_pro_monthly' },
      null, PRICE_ID_MAP, PLAN_DISPLAY,
    );
    expect(result.classification).toBe('CHECKOUT_EXPLICIT');
    expect(result.plan_family).toBe('Three-Module Bundle');
  });

  it('registry takes priority over internal plan_key', () => {
    const registry = [{
      product_id: 'prod_xxx',
      canonical_plan_key: 'four_module_bundle_monthly',
      canonical_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
    }];
    const result = resolveHistoricalPlan(
      { plan_key: 'pipekeeper_pro_monthly', product_id: 'price_xxx' },
      { product_id: 'prod_xxx', price_id: 'price_xxx' },
      PRICE_ID_MAP, PLAN_DISPLAY, registry,
    );
    expect(result.classification).toBe('REGISTRY_RESOLVED');
    expect(result.plan_family).toBe('Four-Module Bundle');
  });
});