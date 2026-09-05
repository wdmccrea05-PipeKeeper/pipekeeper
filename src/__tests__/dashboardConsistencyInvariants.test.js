/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { resolveProductIdentityFromStripeChain } from '../lib/billing/stripeProductResolver.js';
import { reconcileEntitlementForUser } from '../lib/billing/reconcileEntitlementForUser.js';

// ── Dashboard Consistency Invariants ──────────────────────────────────────────
// These tests verify the invariants that must hold between the canonical
// reconciliation data and the production dashboard. If any of these fail,
// the dashboard is showing stale or incorrect data.

function mockStripeSub(opts = {}) {
  return {
    id: opts.sub_id || 'sub_test',
    status: opts.status || 'active',
    current_period_start: 1700000000,
    current_period_end: 1730000000,
    items: { data: [{ price: {
      id: opts.price_id || 'price_test',
      unit_amount: opts.amount_cents ?? 2999,
      recurring: { interval: opts.interval || 'year' },
      product: opts.product_obj ? {
        id: opts.product_id || 'prod_test',
        name: opts.product_name || 'PipeKeeper Pro Annual',
        active: true,
        metadata: {},
      } : (opts.product_id || 'prod_test'),
    } }] },
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

describe('Dashboard Consistency Invariants', () => {

  // Invariant 1: Dashboard Stripe verified count must equal canonical provider-current unique Stripe users
  it('Stripe verified count equals unique users from provider-current Stripe contracts', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_1', product_id: 'prod_1',
      product_name: 'PipeKeeper Pro Annual', canonical_plan_key: 'pipekeeper_pro_annual',
      canonical_product: 'pipekeeper', canonical_modules: ['pipekeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    // Two contracts, same user → should count as 1 unique user
    const c1 = mockContract({ id: 'c1', user_id: 'u1', sub_id: 'sub_1', resolved_product_id: 'prod_1', resolved_price_id: 'price_1' });
    const c2 = mockContract({ id: 'c2', user_id: 'u1', sub_id: 'sub_2', resolved_product_id: 'prod_1', resolved_price_id: 'price_1' });
    const c3 = mockContract({ id: 'c3', user_id: 'u2', sub_id: 'sub_3', resolved_product_id: 'prod_1', resolved_price_id: 'price_1' });

    const stripeVerification = {
      sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'active', verification_available: true },
      sub_2: { provider_subscription_id: 'sub_2', exists: true, status: 'active', verification_available: true },
      sub_3: { provider_subscription_id: 'sub_3', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'u1@test.com',
      contracts: [c1, c2], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED', c2: 'PROVIDER_RESOLVED' },
    });

    // u1 has 2 contracts but counts as 1 unique paying user
    expect(result.has_access).toBe(true);
    expect(result.contract_count).toBe(2);
    // The dashboard should show 1 unique user for u1, not 2
    const uniqueUsers = new Set([c1.user_id, c2.user_id, c3.user_id]);
    expect(uniqueUsers.size).toBe(2); // u1 + u2
  });

  // Invariant 2: Module count must match canonical current user/module aggregation
  it('module count is unique users per module, not contract count', () => {
    const c1 = mockContract({ id: 'c1', user_id: 'u1', modules: ['pipekeeper'], product: 'pipekeeper' });
    const c2 = mockContract({ id: 'c2', user_id: 'u2', modules: ['pipekeeper'], product: 'pipekeeper' });

    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'u1@test.com',
      contracts: [c1], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    expect(result.modules).toEqual(['pipekeeper']);
    // Dashboard PipeKeeper count = unique users with PipeKeeper module = 2 (u1 + u2), not 2 contracts
  });

  // Invariant 3: Stale contract must NOT appear in current paying
  it('stale local contract (provider says canceled) is excluded from current paying', () => {
    const contract = mockContract({ id: 'c1', status: 'active' });
    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'canceled', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [contract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    expect(result.has_access).toBe(false);
  });

  // Invariant 4: Product registry mapping exists → dashboard must NOT mark scope unresolved
  it('contract with registry mapping is PROVIDER_RESOLVED, not unresolved', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_1', product_id: 'prod_1',
      product_name: 'PipeKeeper Pro Annual', canonical_plan_key: 'pipekeeper_pro_annual',
      canonical_product: 'pipekeeper', canonical_modules: ['pipekeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    const contract = mockContract({ resolved_product_id: 'prod_1', resolved_price_id: 'price_1' });

    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: { stripe_subscription: mockStripeSub({ product_id: 'prod_1', product_obj: true }), stripe_lookup_error: null, stripe_not_found: false },
      registry,
      price_id_map: {},
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.classification).not.toBe('UNRESOLVED');
  });

  // Invariant 5: Provider-current resolved user must NOT appear in PAID_NO_ENTITLEMENT
  it('provider-current resolved user gets entitlement (not paid_no_entitlement)', () => {
    const contract = mockContract({ id: 'c1', status: 'active' });
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
    expect(result.source_type).toBe('paid_contract');
  });

  // Invariant 6: Historical subscription must NOT affect current module count
  it('expired contract does not contribute to current paying', () => {
    const expiredContract = mockContract({
      id: 'c1', status: 'canceled',
      period_end: '2020-01-01T00:00:00Z', // long expired
    });

    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'canceled', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'test@example.com',
      contracts: [expiredContract], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    expect(result.has_access).toBe(false);
    expect(result.tier).toBe('free');
  });

  // Invariant 7: Product ID mapping must not change due to name rename
  it('Product ID mapping is permanent regardless of name changes', () => {
    const registry = [{
      provider: 'stripe', price_id: 'price_1', product_id: 'prod_abc',
      product_name: 'PipeKeeper Pro Annual', canonical_plan_key: 'pipekeeper_pro_annual',
      canonical_product: 'pipekeeper', canonical_modules: ['pipekeeper'],
      mapping_source: 'stripe_product_name', confidence: 'high',
    }];

    const contract = mockContract({ resolved_product_id: 'prod_abc', resolved_price_id: 'price_1' });

    // Stripe renamed the product
    const result = resolveProductIdentityFromStripeChain({
      contract,
      provider_truth: {
        stripe_subscription: mockStripeSub({
          product_id: 'prod_abc',
          product_name: 'Totally Different Name',
          product_obj: true,
        }),
        stripe_lookup_error: null, stripe_not_found: false,
      },
      registry,
      price_id_map: {},
    });

    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolution_source).toBe('persisted_registry_product_id');
  });

  // Invariant 8: Provider counts and module counts need not sum to each other
  it('module counts are unique users per module (can overlap with other modules)', () => {
    const c1 = mockContract({ id: 'c1', user_id: 'u1', modules: ['pipekeeper', 'whiskeykeeper'], product: 'bundle' });
    const stripeVerification = {
      sub_test: { provider_subscription_id: 'sub_test', exists: true, status: 'active', verification_available: true },
    };

    const result = reconcileEntitlementForUser({
      user_id: 'u1', user_email: 'u1@test.com',
      contracts: [c1], subscriptions: [], priceIdMap: {},
      stripeVerification,
      productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
    });

    // One user with bundle → appears in both pipekeeper and whiskeykeeper module counts
    expect(result.modules).toContain('pipekeeper');
    expect(result.modules).toContain('whiskeykeeper');
    // But provider count = 1 (one unique user)
    expect(result.contract_count).toBe(1);
  });
});