/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  resolveProductIdentityFromStripeChain,
  detectProviderMismatch,
  mapProductNameToPlan,
  extractStripeChainData,
  classifyUserPopulation,
} from '../lib/billing/stripeProductResolver.js';

// ── Helper: build a mock Stripe subscription with expanded price+product ───

function mockStripeSub(opts = {}) {
  const {
    priceId = 'price_test123',
    productId = 'prod_test123',
    productName = null,
    priceNickname = null,
    priceMetadata = {},
    productMetadata = {},
    priceActive = true,
    productActive = true,
    interval = 'year',
    unitAmount = 2999,
    currency = 'usd',
    subStatus = 'active',
  } = opts;

  const product = {
    id: productId,
    object: 'product',
    active: productActive,
    name: productName,
    metadata: productMetadata,
  };

  const price = {
    id: priceId,
    object: 'price',
    active: priceActive,
    nickname: priceNickname,
    metadata: priceMetadata,
    unit_amount: unitAmount,
    currency,
    recurring: { interval, aggregate_usage: null, interval_count: 1, usage_type: 'licensed' },
    product: product, // expanded
  };

  return {
    id: 'sub_test123',
    object: 'subscription',
    status: subStatus,
    current_period_end: 1735689600,
    items: {
    object: 'list',
      data: [{ id: 'si_test', price }],
    },
  };
}

function mockContract(opts = {}) {
  return {
    id: 'contract_test1',
    provider: 'stripe',
    provider_subscription_id: 'sub_test123',
    product: 'unknown',
    modules: [],
    billing_interval: 'annual',
    amount_cents: 2999,
    ...opts,
  };
}

describe('StripeProductResolver — mapProductNameToPlan', () => {
  it('maps PipeKeeper annual product name', () => {
    expect(mapProductNameToPlan('PipeKeeper Pro - Annual')).toBe('pipekeeper_pro_annual');
  });

  it('maps WhiskeyKeeper monthly product name', () => {
    expect(mapProductNameToPlan('WhiskeyKeeper Pro Monthly')).toBe('whiskeykeeper_pro_monthly');
  });

  it('maps Founders bundle annual', () => {
    expect(mapProductNameToPlan('Founders Bundle - Annual')).toBe('founders_bundle_annual');
  });

  it('maps 4-Module bundle monthly', () => {
    expect(mapProductNameToPlan('4-Module Bundle - Monthly')).toBe('four_module_bundle_monthly');
  });

  it('maps 3-Module bundle annual', () => {
    expect(mapProductNameToPlan('3-Module Bundle - Annual')).toBe('three_module_bundle_annual');
  });

  it('returns null for unrecognizable name', () => {
    expect(mapProductNameToPlan('Generic Product')).toBeNull();
  });
});

describe('StripeProductResolver — Archived Stripe Price', () => {
  it('resolves PROVIDER_RESOLVED from archived price via product name', () => {
    const sub = mockStripeSub({
      priceId: 'price_legacy_archived',
      productName: 'PipeKeeper Pro - Annual',
      priceActive: false, // archived
      productActive: true,
    });
    const contract = mockContract({ resolved_price_id: null, product: 'unknown' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {}, // price_id NOT in env map
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('stripe_product_name');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolved_plan_key).toBe('pipekeeper_pro_annual');
    expect(result.confidence).toBe('high');
    expect(result.provider_chain_resolved).toBe(true);
    expect(result.registry_entry_to_persist).toBeDefined();
    expect(result.registry_entry_to_persist.is_historical).toBe(true);
  });
});

describe('StripeProductResolver — Unknown local Price, Product identifies it', () => {
  it('resolves PROVIDER_RESOLVED when price_id is not in env map but product name identifies PipeKeeper', () => {
    const sub = mockStripeSub({
      priceId: 'price_old_not_in_env',
      productName: 'PipeKeeper Pro - Annual',
    });
    const contract = mockContract({ product: 'unknown' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {}, // empty — price_id not recognized
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('stripe_product_name');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.confidence).toBe('high');
  });
});

describe('StripeProductResolver — Same amount, different products', () => {
  it('resolves PipeKeeper from product name when amount is $29.99/year (not amount inference)', () => {
    const sub = mockStripeSub({
      priceId: 'price_pipekeeper_annual',
      productName: 'PipeKeeper Pro - Annual',
      unitAmount: 2999,
      interval: 'year',
    });
    const contract = mockContract({ amount_cents: 2999, billing_interval: 'annual' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).not.toBe('amount_interval_inference');
    expect(result.resolved_product).toBe('pipekeeper');
  });

  it('resolves WhiskeyKeeper from product name when amount is also $29.99/year', () => {
    const sub = mockStripeSub({
      priceId: 'price_whiskeykeeper_annual',
      productName: 'WhiskeyKeeper Pro - Annual',
      unitAmount: 2999,
      interval: 'year',
    });
    const contract = mockContract({ amount_cents: 2999, billing_interval: 'annual' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('whiskeykeeper');
    expect(result.resolution_source).not.toBe('amount_interval_inference');
  });
});

describe('StripeProductResolver — Legacy confirmed by Stripe (upgrade)', () => {
  it('upgrades LEGACY_RESOLVED to PROVIDER_RESOLVED when Stripe confirms same product', () => {
    const sub = mockStripeSub({
      priceId: 'price_current_pipekeeper',
      productName: 'PipeKeeper Pro - Annual',
    });
    const contract = mockContract({
      product: 'pipekeeper',
      modules: ['pipekeeper'],
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('pipekeeper');

    const mismatch = detectProviderMismatch(contract, result);
    expect(mismatch.mismatch).toBe(false);
  });
});

describe('StripeProductResolver — Legacy mismatch', () => {
  it('detects PROVIDER_PRODUCT_MISMATCH when local says PipeKeeper but Stripe says WhiskeyKeeper', () => {
    const sub = mockStripeSub({
      priceId: 'price_whiskey_annual',
      productName: 'WhiskeyKeeper Pro - Annual',
    });
    const contract = mockContract({
      product: 'pipekeeper', // local says pipekeeper
      modules: ['pipekeeper'],
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('whiskeykeeper'); // provider truth wins

    const mismatch = detectProviderMismatch(contract, result);
    expect(mismatch.mismatch).toBe(true);
    expect(mismatch.detail).toContain('PROVIDER_PRODUCT_MISMATCH');
    expect(mismatch.detail).toContain('pipekeeper');
    expect(mismatch.detail).toContain('whiskeykeeper');
  });
});

describe('StripeProductResolver — Amount-only evidence (no provider)', () => {
  it('falls back to AMOUNT_INFERRED with confidence=low when no provider evidence', () => {
    const contract = mockContract({
      amount_cents: 1999,
      billing_interval: 'annual',
      product: 'unknown',
      modules: [],
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: null, // no Stripe subscription
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('AMOUNT_INFERRED');
    expect(result.resolution_source).toBe('amount_interval_inference');
    expect(result.confidence).toBe('low');
    expect(result.provider_chain_attempted).toBe(false);
  });

  it('falls back to AMOUNT_INFERRED when Stripe subscription found but chain cannot resolve', () => {
    const sub = mockStripeSub({
      priceId: 'price_unknown',
      productName: null,
      priceNickname: null,
      priceMetadata: {},
      productMetadata: {},
    });
    const contract = mockContract({
      amount_cents: 2999,
      billing_interval: 'annual',
      product: 'unknown',
      modules: [],
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('AMOUNT_INFERRED');
    expect(result.confidence).toBe('low');
    expect(result.provider_chain_attempted).toBe(true);
    expect(result.provider_chain_resolved).toBe(false);
  });
});

describe('StripeProductResolver — Apple (never infer from amount)', () => {
  it('resolves Apple product ID to PROVIDER_RESOLVED', () => {
    const contract = mockContract({
      provider: 'apple',
      resolved_product_id: 'com.collectionkeeper.pipekeeper.annual',
      amount_cents: 2999,
      billing_interval: 'annual',
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: null,
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolution_source).toBe('apple_product_id');
  });

  it('returns UNRESOLVED for Apple with no product ID (never amount inference)', () => {
    const contract = mockContract({
      provider: 'apple',
      resolved_product_id: null,
      amount_cents: 2999,
      billing_interval: 'annual',
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: null,
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('UNRESOLVED');
    expect(result.resolution_source).toBe('no_apple_product_id');
  });
});

describe('StripeProductResolver — Persisted registry', () => {
  it('resolves from persisted registry by price_id when product name is absent', () => {
    const sub = mockStripeSub({
      priceId: 'price_legacy_in_registry',
      productName: null,
      priceNickname: null,
      priceMetadata: {},
      productMetadata: {},
    });
    const contract = mockContract({ product: 'unknown' });

    const registry = [
      {
        provider: 'stripe',
        price_id: 'price_legacy_in_registry',
        product_id: 'prod_legacy',
        canonical_plan_key: 'pipekeeper_pro_annual',
        canonical_product: 'pipekeeper',
        canonical_modules: ['pipekeeper'],
        mapping_source: 'stripe_product_name',
        confidence: 'high',
      },
    ];

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry,
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('persisted_registry');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolved_plan_key).toBe('pipekeeper_pro_annual');
  });

  it('resolves from persisted registry by product_id when price_id differs', () => {
    const sub = mockStripeSub({
      priceId: 'price_new_version',
      productId: 'prod_pipekeeper_legacy',
      productName: null,
    });
    const contract = mockContract({ product: 'unknown' });

    const registry = [
      {
        provider: 'stripe',
        price_id: 'price_old_version',
        product_id: 'prod_pipekeeper_legacy',
        canonical_plan_key: 'pipekeeper_pro_annual',
        canonical_product: 'pipekeeper',
        canonical_modules: ['pipekeeper'],
        mapping_source: 'stripe_product_name',
        confidence: 'high',
      },
    ];

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry,
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('persisted_registry');
    expect(result.resolved_product).toBe('pipekeeper');
  });
});

describe('StripeProductResolver — Product metadata', () => {
  it('resolves from Stripe Product metadata plan_key', () => {
    const sub = mockStripeSub({
      productMetadata: { plan_key: 'whiskeykeeper_pro_annual' },
      productName: null,
    });
    const contract = mockContract({ product: 'unknown' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('stripe_product_metadata');
    expect(result.resolved_product).toBe('whiskeykeeper');
  });

  it('resolves from Stripe Price metadata modules', () => {
    const sub = mockStripeSub({
      priceMetadata: { modules: 'pipekeeper,whiskeykeeper' },
      productName: null,
    });
    const contract = mockContract({ product: 'unknown' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: sub },
      price_id_map: {},
      registry: [],
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('stripe_price_metadata');
    expect(result.resolved_product).toBe('bundle');
    expect(result.resolved_modules).toContain('pipekeeper');
    expect(result.resolved_modules).toContain('whiskeykeeper');
  });
});

describe('StripeProductResolver — User population classification', () => {
  it('classifies user with only current contracts as CURRENT_PROVIDER_VERIFIED', () => {
    const result = classifyUserPopulation('user1', [
      { lifecycle_classification: 'PROVIDER_ACTIVE', provider: 'stripe' },
    ]);
    expect(result.category).toBe('CURRENT_PROVIDER_VERIFIED');
  });

  it('classifies user with only Apple as CURRENT_APPLE_PROVISIONAL', () => {
    const result = classifyUserPopulation('user2', [
      { lifecycle_classification: 'APPLE_PROVISIONAL', provider: 'apple' },
    ]);
    expect(result.category).toBe('CURRENT_APPLE_PROVISIONAL');
  });

  it('classifies user with current + expired as MIXED_CURRENT_AND_STALE', () => {
    const result = classifyUserPopulation('user3', [
      { lifecycle_classification: 'PROVIDER_ACTIVE', provider: 'stripe' },
      { lifecycle_classification: 'PROVIDER_EXPIRED', provider: 'stripe' },
    ]);
    expect(result.category).toBe('MIXED_CURRENT_AND_STALE');
  });

  it('classifies user with only missing as STALE_PROVIDER_MISSING_ONLY', () => {
    const result = classifyUserPopulation('user4', [
      { lifecycle_classification: 'PROVIDER_SUBSCRIPTION_MISSING', provider: 'stripe' },
    ]);
    expect(result.category).toBe('STALE_PROVIDER_MISSING_ONLY');
  });

  it('classifies user with only expired as EXPIRED_ONLY', () => {
    const result = classifyUserPopulation('user5', [
      { lifecycle_classification: 'PROVIDER_EXPIRED', provider: 'stripe' },
    ]);
    expect(result.category).toBe('EXPIRED_ONLY');
  });
});

describe('StripeProductResolver — extractStripeChainData', () => {
  it('extracts chain data from expanded subscription', () => {
    const sub = mockStripeSub({
      priceId: 'price_abc',
      productId: 'prod_xyz',
      productName: 'Test Product',
      priceNickname: 'Test Nickname',
      unitAmount: 4999,
      interval: 'year',
    });

    const chain = extractStripeChainData(sub);
    expect(chain.price_id).toBe('price_abc');
    expect(chain.product_id).toBe('prod_xyz');
    expect(chain.product_name).toBe('Test Product');
    expect(chain.price_nickname).toBe('Test Nickname');
    expect(chain.amount_cents).toBe(4999);
    expect(chain.billing_interval).toBe('annual');
  });

  it('handles product as string ID (not expanded)', () => {
    const sub = {
      id: 'sub_test',
      status: 'active',
      items: {
        data: [{
          price: {
            id: 'price_abc',
            product: 'prod_xyz', // string, not expanded
            unit_amount: 2999,
            recurring: { interval: 'year' },
          },
        }],
      },
    };

    const chain = extractStripeChainData(sub);
    expect(chain.price_id).toBe('price_abc');
    expect(chain.product_id).toBe('prod_xyz');
    expect(chain.product_name).toBeNull();
    expect(chain.product_metadata).toBeNull();
  });
});