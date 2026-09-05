/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { resolveProductIdentityFromStripeChain, extractStripeChainData } from '../lib/billing/stripeProductResolver.js';
import { reconcileEntitlementForUser, RECONCILER_VERSION } from '../lib/billing/reconcileEntitlementForUser.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockStripeSub(opts = {}) {
  const priceId = opts.price_id || 'price_test123';
  const productId = opts.product_id || 'prod_test123';
  const productName = opts.product_name || 'PipeKeeper Pro Annual';
  return {
    id: opts.sub_id || 'sub_test123',
    status: opts.status || 'active',
    current_period_start: 1700000000,
    current_period_end: 1730000000,
    cancel_at_period_end: opts.cancel_at_period_end || false,
    items: {
      data: [{
        price: {
          id: priceId,
          active: opts.price_active !== false,
          unit_amount: opts.amount_cents ?? 2999,
          currency: 'usd',
          recurring: { interval: opts.interval || 'year' },
          nickname: opts.price_nickname || null,
          metadata: opts.price_metadata || {},
          product: opts.product_obj ? {
            id: productId,
            name: productName,
            active: true,
            metadata: opts.product_metadata || {},
          } : productId,
        },
      }],
    },
  };
}

function mockContract(opts = {}) {
  return {
    id: opts.id || 'contract_1',
    user_id: opts.user_id || 'user_1',
    user_email: opts.user_email || 'test@example.com',
    provider: opts.provider || 'stripe',
    provider_subscription_id: opts.provider_subscription_id || 'sub_test123',
    status: opts.status || 'active',
    is_active: opts.is_active !== false,
    product: opts.product || 'unknown',
    modules: opts.modules || [],
    billing_interval: opts.billing_interval || 'annual',
    amount_cents: opts.amount_cents ?? 2999,
    period_start: opts.period_start || '2024-01-01T00:00:00Z',
    period_end: opts.period_end || '2025-01-01T00:00:00Z',
    resolved_product_id: opts.resolved_product_id,
    resolved_price_id: opts.resolved_price_id,
    ...opts.extra,
  };
}

function mockRegistry(productId, planKey, productName = 'PipeKeeper Pro Annual') {
  return [{
    provider: 'stripe',
    price_id: 'price_' + productId,
    product_id: productId,
    product_name: productName,
    canonical_plan_key: planKey,
    canonical_product: planKey.includes('pipe') ? 'pipekeeper' : planKey.includes('whiskey') ? 'whiskeykeeper' : 'bundle',
    canonical_modules: planKey.includes('pipe') ? ['pipekeeper'] : planKey.includes('whiskey') ? ['whiskeykeeper'] : ['pipekeeper', 'whiskeykeeper'],
    mapping_source: 'stripe_product_name',
    confidence: 'high',
  }];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Final Entitlement Reconciliation', () => {

  // 1. Product ID permanence
  describe('Product ID permanence', () => {
    it('uses persisted Product ID mapping even when Stripe Product name changes', () => {
      const registry = mockRegistry('prod_Rv4PUw', 'pipekeeper_pro_annual', 'PipeKeeper Premium Annual Subscription');
      const contract = mockContract({ resolved_product_id: 'prod_Rv4PUw', resolved_price_id: 'price_1SjqMz' });

      // Stripe renamed the product
      const providerTruth = {
        stripe_subscription: mockStripeSub({
          product_id: 'prod_Rv4PUw',
          product_name: 'Renamed Product - Something Different',
          product_obj: true,
        }),
      };

      const result = resolveProductIdentityFromStripeChain({
        contract,
        provider_truth: providerTruth,
        registry,
        price_id_map: {},
      });

      expect(result.classification).toBe('PROVIDER_RESOLVED');
      expect(result.resolution_source).toBe('persisted_registry_product_id');
      expect(result.resolved_product).toBe('pipekeeper');
      expect(result.resolved_modules).toEqual(['pipekeeper']);
      expect(result.resolved_plan_key).toBe('pipekeeper_pro_annual');
    });

    it('falls through to name discovery for unmapped Product IDs', () => {
      const registry = [];
      const contract = mockContract({ resolved_product_id: null, resolved_price_id: null });

      const providerTruth = {
        stripe_subscription: mockStripeSub({
          product_id: 'prod_NEW',
          product_name: 'WhiskeyKeeper Pro Annual',
          product_obj: true,
        }),
      };

      const result = resolveProductIdentityFromStripeChain({
        contract,
        provider_truth: providerTruth,
        registry,
        price_id_map: {},
      });

      expect(result.classification).toBe('PROVIDER_RESOLVED');
      expect(result.resolution_source).toBe('stripe_product_name');
      expect(result.resolved_product).toBe('whiskeykeeper');
    });
  });

  // 2. Entitlement eligibility
  describe('Entitlement eligibility', () => {
    it('creates entitlement for provider-current + PROVIDER_RESOLVED contract', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });
      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: true, status: 'active', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(true);
      expect(result.tier).toBe('pro');
      expect(result.source_type).toBe('paid_contract');
    });

    it('does NOT auto-grant for AMOUNT_INFERRED contract without prior access', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });
      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: true, status: 'active', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'AMOUNT_INFERRED' },
      });

      expect(result.has_access).toBe(false);
      expect(result.tier).toBe('free');
    });

    it('preserves last-known access for AMOUNT_INFERRED contract with prior entitlement', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });
      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: true, status: 'active', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'AMOUNT_INFERRED' },
        previousEntitlement: { has_access: true, tier: 'pro', modules: ['pipekeeper'], source_type: 'paid_contract', verification_status: 'verified_active' },
      });

      expect(result.has_access).toBe(true);
      expect(result.anomalies.some(a => a.includes('product_identity_not_resolved_preserved'))).toBe(true);
    });
  });

  // 3. Multiple current scopes
  describe('Multiple module ownership', () => {
    it('unions scopes across PipeKeeper + WhiskeyKeeper contracts', () => {
      const c1 = mockContract({ id: 'c1', provider_subscription_id: 'sub_pk', modules: ['pipekeeper'], product: 'pipekeeper' });
      const c2 = mockContract({ id: 'c2', provider_subscription_id: 'sub_wk', modules: ['whiskeykeeper'], product: 'whiskeykeeper' });

      const stripeVerification = {
        sub_pk: { provider_subscription_id: 'sub_pk', exists: true, status: 'active', verification_available: true },
        sub_wk: { provider_subscription_id: 'sub_wk', exists: true, status: 'active', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [c1, c2], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED', c2: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(true);
      expect(result.modules).toContain('pipekeeper');
      expect(result.modules).toContain('whiskeykeeper');
      expect(result.modules).not.toContain('cigarkeeper');
      expect(result.modules).not.toContain('winekeeper');
    });
  });

  // 4. Duplicate same scope
  describe('Duplicate same scope', () => {
    it('does not double-count two contracts with same scope', () => {
      const c1 = mockContract({ id: 'c1', provider_subscription_id: 'sub_1', modules: ['pipekeeper'], product: 'pipekeeper' });
      const c2 = mockContract({ id: 'c2', provider_subscription_id: 'sub_2', modules: ['pipekeeper'], product: 'pipekeeper' });

      const stripeVerification = {
        sub_1: { provider_subscription_id: 'sub_1', exists: true, status: 'active', verification_available: true },
        sub_2: { provider_subscription_id: 'sub_2', exists: true, status: 'active', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [c1, c2], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED', c2: 'PROVIDER_RESOLVED' },
      });

      expect(result.modules).toEqual(['pipekeeper']);
      expect(result.contract_count).toBe(2);
    });
  });

  // 5. Canceled through period end
  describe('Canceled but entitled through period end', () => {
    it('keeps access when cancel_at_period_end=true but period not expired', () => {
      const contract = mockContract({
        id: 'c1', status: 'active',
        period_end: '2099-12-31T00:00:00Z',
      });

      const stripeVerification = {
        sub_test123: {
          provider_subscription_id: 'sub_test123', exists: true, status: 'active',
          cancel_at_period_end: true, verification_available: true,
        },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(true);
      expect(result.effective_end).toBe('2099-12-31T00:00:00Z');
    });
  });

  // 6. Provider expired
  describe('Provider expired', () => {
    it('ends paid entitlement when provider says inactive', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });

      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: true, status: 'canceled', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(false);
      expect(result.tier).toBe('free');
    });
  });

  // 7. Provider subscription missing
  describe('Provider subscription missing', () => {
    it('does not grant paid access when subscription not found at provider', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });

      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: false, verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(false);
    });
  });

  // 8. Provider outage
  describe('Provider outage', () => {
    it('preserves last-known access during transient provider failure', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });

      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: false, verification_available: false, raw_error: 'timeout' },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
        previousEntitlement: { has_access: true, tier: 'pro', modules: ['pipekeeper'], source_type: 'paid_contract', verification_status: 'verified_active' },
      });

      expect(result.has_access).toBe(true);
      expect(result.anomalies.some(a => a.includes('verification_unavailable_preserved'))).toBe(true);
    });

    it('does not grant access on outage without prior entitlement', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });

      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: false, verification_available: false, raw_error: 'timeout' },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(false);
    });
  });

  // 9. Apple unresolved provisional
  describe('Apple provisional', () => {
    it('preserves existing Apple access without broadening scope', () => {
      const contract = mockContract({
        id: 'c1', provider: 'apple', provider_subscription_id: 'apple_orig_1',
        product: 'pipekeeper', modules: ['pipekeeper'],
      });

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification: {},
        productIdentityClassifications: { c1: 'UNRESOLVED' },
        previousEntitlement: { has_access: true, tier: 'pro', modules: ['pipekeeper'], source_type: 'provisional_apple', verification_status: 'provisional' },
      });

      expect(result.has_access).toBe(true);
      expect(result.source_type).toBe('provisional_apple');
      expect(result.modules).toEqual(['pipekeeper']);
      // Should not broaden to other modules
      expect(result.modules).not.toContain('whiskeykeeper');
      expect(result.modules).not.toContain('cigarkeeper');
      expect(result.modules).not.toContain('winekeeper');
    });
  });

  // 10. Stale local record
  describe('Stale local record', () => {
    it('excludes contract that is active locally but inactive at provider', () => {
      const contract = mockContract({ id: 'c1', status: 'active' });

      const stripeVerification = {
        sub_test123: { provider_subscription_id: 'sub_test123', exists: true, status: 'canceled', verification_available: true },
      };

      const result = reconcileEntitlementForUser({
        user_id: 'user_1', user_email: 'test@example.com',
        contracts: [contract], subscriptions: [], priceIdMap: {},
        stripeVerification,
        productIdentityClassifications: { c1: 'PROVIDER_RESOLVED' },
      });

      expect(result.has_access).toBe(false);
      expect(result.anomalies.some(a => a.includes('stale_local_contract'))).toBe(true);
    });
  });

  // 11. Reconciler version
  describe('Reconciler version', () => {
    it('uses canonical_v2 with product identity eligibility', () => {
      expect(RECONCILER_VERSION).toBe('canonical_v2');
    });
  });
});