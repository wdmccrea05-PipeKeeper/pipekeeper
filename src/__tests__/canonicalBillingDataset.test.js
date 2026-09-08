/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { resolveProductIdentityFromStripeChain } from '../lib/billing/stripeProductResolver.js';
import { reconcileEntitlementForUser } from '../lib/billing/reconcileEntitlementForUser.js';
import { PLAN_CATALOG } from '../lib/billing/productScopeResolver.js';

// ── Canonical Billing Dataset Invariants ────────────────────────────────────
// These tests verify the invariants that must hold for the canonical billing
// dataset. If any fail, the User Report is showing incorrect billing data.

function mockStripeSub(opts = {}) {
  return {
    id: opts.sub_id || 'sub_test',
    status: opts.status || 'active',
    current_period_start: 1700000000,
    current_period_end: 1893456000, // far future
    items: { data: [{
      id: 'si_test',
      price: {
        id: opts.price_id || 'price_test',
        unit_amount: opts.amount_cents ?? 2999,
        recurring: { interval: opts.interval || 'year' },
        product: opts.product_obj ? {
          id: opts.product_id || 'prod_test',
          name: opts.product_name || 'PipeKeeper Pro Annual',
          active: true,
          metadata: {},
        } : (opts.product_id || 'prod_test'),
      },
      quantity: 1,
    }] },
  };
}

function mockContract(opts = {}) {
  return {
    id: opts.id || 'c1',
    user_id: opts.user_id || 'u1',
    user_email: opts.user_email || 'test@example.com',
    provider: opts.provider || 'stripe',
    provider_subscription_id: opts.sub_id || 'sub_test',
    status: opts.status || 'active',
    product: opts.product || 'unknown',
    modules: opts.modules || [],
    billing_interval: opts.billing_interval || 'annual',
    amount_cents: opts.amount_cents ?? 2999,
    period_start: '2026-01-01T00:00:00Z',
    period_end: '2099-01-01T00:00:00Z',
    resolved_product_id: opts.resolved_product_id,
    resolved_price_id: opts.resolved_price_id,
  };
}

describe('Canonical Billing Dataset Invariants', () => {

  // Invariant 1: A mapped bundle Product ID must NOT report as PipeKeeper individual
  it('bundle Product ID is classified as bundle, not PipeKeeper individual', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_founders', product_id: 'prod_founders',
      product_name: 'Founders Bundle Annual', canonical_plan_key: 'founders_bundle_annual',
      canonical_product: 'bundle', canonical_modules: ['pipekeeper', 'whiskeykeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    const contract = mockContract({
      resolved_product_id: 'prod_founders',
      resolved_price_id: 'price_founders',
      product: 'pipekeeper', // stale local field says pipekeeper
      modules: ['pipekeeper'], // stale local modules
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: {
        stripe_subscription: mockStripeSub({
          product_id: 'prod_founders',
          product_name: 'Founders Bundle Annual',
          product_obj: true,
          price_id: 'price_founders',
        }),
        stripe_lookup_error: null, stripe_not_found: false,
      },
      registry,
      price_id_map: {},
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('bundle');
    expect(result.resolved_modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    // The stale local product=pipekeeper must NOT override the registry mapping
    expect(result.resolved_product).not.toBe('pipekeeper');
  });

  // Invariant 2: A bundle subscriber must receive all bundle module projections
  it('bundle subscriber gets all bundle modules in entitlement', () => {
    const contract = mockContract({
      product: 'bundle',
      modules: ['pipekeeper', 'whiskeykeeper'],
      resolved_product_id: 'prod_founders',
      resolved_price_id: 'price_founders',
    });

    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [contract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    expect(result.has_access).toBe(true);
    expect(result.modules).toContain('pipekeeper');
    expect(result.modules).toContain('whiskeykeeper');
    expect(result.modules.length).toBe(2);
  });

  // Invariant 3: A multi-entitlement user must NOT lose entitlements due to Map overwrite
  it('user with multiple module entitlements preserves all modules', () => {
    const contract = mockContract({
      product: 'bundle',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
    });

    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [contract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    expect(result.modules).toContain('pipekeeper');
    expect(result.modules).toContain('whiskeykeeper');
    expect(result.modules).toContain('cigarkeeper');
    expect(result.modules.length).toBe(3);
  });

  // Invariant 4: A user with two providers must NOT be reduced to first provider
  it('user with stripe and apple contracts has both providers', () => {
    const stripeContract = mockContract({
      id: 'c1', user_id: 'u1', provider: 'stripe', sub_id: 'sub_stripe',
    });
    const appleContract = mockContract({
      id: 'c2', user_id: 'u1', provider: 'apple', sub_id: 'sub_apple',
    });

    const stripeVerification = {
      sub_stripe: { provider_subscription_id: 'sub_stripe', exists: true, status: 'active', verification_available: true },
      sub_apple: { provider_subscription_id: 'sub_apple', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [stripeContract, appleContract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED', c2: 'PROVIDER_RESOLVED' },
    });

    expect(result.has_access).toBe(true);
    // The user should have access from both contracts
    expect(result.contract_count).toBe(2);
  });

  // Invariant 5: Two provider subscription IDs must NOT be merged by email/product match
  it('two different subscription IDs are not merged', () => {
    const c1 = mockContract({ id: 'c1', user_id: 'u1', sub_id: 'sub_A' });
    const c2 = mockContract({ id: 'c2', user_id: 'u1', sub_id: 'sub_B' });

    const stripeVerification = {
      sub_A: { provider_subscription_id: 'sub_A', exists: true, status: 'active', verification_available: true },
      sub_B: { provider_subscription_id: 'sub_B', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [c1, c2], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED', c2: 'PROVIDER_RESOLVED' },
    });

    // Both contracts are counted, not merged into one
    expect(result.contract_count).toBe(2);
  });

  // Invariant 6: A known provider Product ID must NOT appear as Unknown
  it('contract with registry-mapped Product ID is PROVIDER_RESOLVED, not UNRESOLVED', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_1', product_id: 'prod_known',
      product_name: 'PipeKeeper Pro Annual', canonical_plan_key: 'pipekeeper_pro_annual',
      canonical_product: 'pipekeeper', canonical_modules: ['pipekeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    const contract = mockContract({ resolved_product_id: 'prod_known', resolved_price_id: 'price_1' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: {
        stripe_subscription: mockStripeSub({ product_id: 'prod_known', product_obj: true }),
        stripe_lookup_error: null, stripe_not_found: false,
      },
      registry,
      price_id_map: {},
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.classification).not.toBe('UNRESOLVED');
    expect(result.resolved_product).not.toBe('unknown');
  });

  // Invariant 7: A current Stripe subscription is classified by registry mapping, not local marker
  it('current Stripe subscription uses registry mapping, not local product field', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_3mod', product_id: 'prod_3mod',
      product_name: 'Three-Module Bundle Annual', canonical_plan_key: 'three_module_bundle_annual',
      canonical_product: 'bundle', canonical_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    // Local fields say pipekeeper, but Stripe Product ID says 3-module bundle
    const contract = mockContract({
      product: 'pipekeeper',
      modules: ['pipekeeper'],
      resolved_product_id: 'prod_3mod',
      resolved_price_id: 'price_3mod',
    });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: {
        stripe_subscription: mockStripeSub({
          product_id: 'prod_3mod',
          product_name: 'Three-Module Bundle Annual',
          product_obj: true,
          price_id: 'price_3mod',
        }),
        stripe_lookup_error: null, stripe_not_found: false,
      },
      registry,
      price_id_map: {},
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('bundle');
    expect(result.resolved_modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    // Local product=pipekeeper must NOT override registry
    expect(result.resolved_product).not.toBe('pipekeeper');
  });

  // Invariant 8: Product/plan cards can be traced to underlying provider rows
  it('every billing row has provider subscription ID and product resolution source', () => {
    const contract = mockContract({ sub_id: 'sub_test' });
    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [contract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    // The result must have traceable provenance
    expect(result.has_access).toBe(true);
    expect(result.source_type).toBe('paid_contract');
    expect(result.active_contract_ids).toContain('c1');
  });

  // Invariant 9: MRR is computed from amount + interval
  it('annual subscription MRR = amount / 12, monthly MRR = amount', () => {
    const annualContract = mockContract({
      amount_cents: 2999,
      billing_interval: 'annual',
    });
    const monthlyContract = mockContract({
      amount_cents: 299,
      billing_interval: 'monthly',
    });

    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const annualResult = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [annualContract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    const monthlyResult = reconcileEntitlementForUser({
      user_id: 'u2', user_email: 'test2@example.com',
      contracts: [monthlyContract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    // Annual: $29.99/year → $2.50/month (250 cents)
    expect(annualResult.mrr_cents).toBe(250);
    // Monthly: $2.99/month → $2.99/month (299 cents)
    expect(monthlyResult.mrr_cents).toBe(299);
  });

  // Invariant 10: Plan catalog has all expected plans
  it('PLAN_CATALOG contains all expected plans with correct modules', () => {
    expect(PLAN_CATALOG.pipekeeper_pro_annual.modules).toEqual(['pipekeeper']);
    expect(PLAN_CATALOG.founders_bundle_annual.modules).toEqual(['pipekeeper', 'whiskeykeeper']);
    expect(PLAN_CATALOG.three_module_bundle_annual.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
    expect(PLAN_CATALOG.four_module_bundle_annual.modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  });
});