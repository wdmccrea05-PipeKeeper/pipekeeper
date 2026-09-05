/* eslint-disable */
import { describe, it, expect } from 'vitest';
import {
  reconcileContractV2,
  classifyBillingLifecycle,
  classifyProductIdentity,
  classifyScopeCategory,
  checkInvariantsV2,
  classifyMultiContractUser,
  computePayingPopulation,
} from '../lib/billing/billingLifecycleReconciler.js';

// ── Mock helpers ─────────────────────────────────────────────────────────────

function makeContract(overrides = {}) {
  return {
    id: 'contract_1',
    user_id: 'user_1',
    user_email: 'test@test.com',
    provider: 'stripe',
    provider_subscription_id: 'sub_123',
    provider_customer_id: 'cus_123',
    status: 'active',
    is_active: true,
    product: 'unknown',
    billing_interval: 'monthly',
    amount_cents: 299,
    ...overrides,
  };
}

function makeStripeSub(overrides = {}) {
  return {
    id: 'sub_123',
    status: 'active',
    cancel_at_period_end: false,
    canceled_at: null,
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    items: {
      data: [
        {
          price: {
            id: 'price_test1',
            product: 'prod_test1',
          },
        },
      ],
    },
    ...overrides,
  };
}

function makePriceIdMap() {
  return {
    price_test1: 'pipekeeper_pro_monthly',
    price_apple1: 'pipekeeper_pro_annual',
  };
}

// ── Lifecycle classification tests ──────────────────────────────────────────

describe('classifyBillingLifecycle', () => {
  it('PROVIDER_ACTIVE — Stripe active, not canceling', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({ status: 'active', cancel_at_period_end: false }),
    });
    expect(result.classification).toBe('PROVIDER_ACTIVE');
    expect(result.source).toBe('live_stripe_subscription');
  });

  it('PROVIDER_TRIALING — Stripe trialing', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({ status: 'trialing' }),
    });
    expect(result.classification).toBe('PROVIDER_TRIALING');
  });

  it('PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE — active + cancel_at_period_end', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({
        status: 'active',
        cancel_at_period_end: true,
      }),
    });
    expect(result.classification).toBe('PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE');
  });

  it('PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE — canceled but period in future', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      }),
    });
    expect(result.classification).toBe('PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE');
  });

  it('PROVIDER_EXPIRED — canceled and period ended', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({
        status: 'canceled',
        current_period_end: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
      }),
    });
    expect(result.classification).toBe('PROVIDER_EXPIRED');
  });

  it('PROVIDER_EXPIRED — unpaid status', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_subscription: makeStripeSub({ status: 'unpaid' }),
    });
    expect(result.classification).toBe('PROVIDER_EXPIRED');
  });

  it('PROVIDER_SUBSCRIPTION_MISSING — Stripe says not found', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, { stripe_not_found: true });
    expect(result.classification).toBe('PROVIDER_SUBSCRIPTION_MISSING');
  });

  it('PROVIDER_LOOKUP_FAILED — API error', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, {
      stripe_lookup_error: 'rate limited',
    });
    expect(result.classification).toBe('PROVIDER_LOOKUP_FAILED');
  });

  it('NO_PROVIDER_REFERENCE — Stripe contract with no subscription ID', () => {
    const contract = makeContract({ provider_subscription_id: '' });
    const result = classifyBillingLifecycle(contract, null);
    expect(result.classification).toBe('NO_PROVIDER_REFERENCE');
  });

  it('APPLE_PROVISIONAL — Apple contract', () => {
    const contract = makeContract({ provider: 'apple', provider_subscription_id: 'apple_txn_123' });
    const result = classifyBillingLifecycle(contract, null);
    expect(result.classification).toBe('APPLE_PROVISIONAL');
  });

  it('MANUAL_REVIEW — manual provider', () => {
    const contract = makeContract({ provider: 'manual' });
    const result = classifyBillingLifecycle(contract, null);
    expect(result.classification).toBe('MANUAL_REVIEW');
  });

  it('MANUAL_REVIEW — Stripe with subscription ID but no provider truth', () => {
    const contract = makeContract();
    const result = classifyBillingLifecycle(contract, null);
    expect(result.classification).toBe('MANUAL_REVIEW');
    expect(result.source).toBe('local_only');
  });
});

// ── Product identity classification tests ────────────────────────────────────

describe('classifyProductIdentity', () => {
  it('PROVIDER_RESOLVED — from Stripe price ID', () => {
    const contract = makeContract({ product: 'unknown' });
    const result = classifyProductIdentity(
      contract,
      null,
      { stripe_subscription: makeStripeSub() },
      makePriceIdMap(),
    );
    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('stripe_price');
    expect(result.resolved_product).toBe('pipekeeper');
  });

  it('PROVIDER_RESOLVED — from Apple product ID', () => {
    const contract = makeContract({
      provider: 'apple',
      resolved_product_id: 'pipekeeper_pro_annual',
    });
    const result = classifyProductIdentity(contract, null, null, makePriceIdMap());
    expect(result.classification).toBe('PROVIDER_RESOLVED');
    expect(result.resolution_source).toBe('apple_product_id');
  });

  it('LEGACY_RESOLVED — from local plan_key', () => {
    const contract = makeContract({ plan_key: 'pipekeeper_pro_monthly' });
    const result = classifyProductIdentity(contract, null, null, makePriceIdMap());
    expect(result.classification).toBe('LEGACY_RESOLVED');
    expect(result.resolution_source).toBe('plan_key');
  });

  it('LEGACY_RESOLVED — from legacy subscription', () => {
    const contract = makeContract({ product: 'unknown', amount_cents: null });
    const legacy = {
      id: 'sub_legacy',
      plan_key: 'pipekeeper_pro_monthly',
    };
    const result = classifyProductIdentity(contract, legacy, null, makePriceIdMap());
    expect(result.classification).toBe('LEGACY_RESOLVED');
    expect(result.resolution_source).toBe('legacy_subscription');
  });

  it('AMOUNT_INFERRED — from amount + interval', () => {
    const contract = makeContract({
      product: 'unknown',
      amount_cents: 299,
      billing_interval: 'monthly',
    });
    const result = classifyProductIdentity(contract, null, null, makePriceIdMap());
    expect(result.classification).toBe('AMOUNT_INFERRED');
    expect(result.resolution_source).toBe('amount_interval_inference');
    expect(result.confidence).toBe('low');
  });

  it('UNRESOLVED — no evidence', () => {
    const contract = makeContract({
      product: 'unknown',
      amount_cents: null,
      billing_interval: null,
    });
    const result = classifyProductIdentity(contract, null, null, makePriceIdMap());
    expect(result.classification).toBe('UNRESOLVED');
  });

  it('UNRESOLVED — Apple with no product ID', () => {
    const contract = makeContract({ provider: 'apple' });
    const result = classifyProductIdentity(contract, null, null, makePriceIdMap());
    expect(result.classification).toBe('UNRESOLVED');
    expect(result.resolution_source).toBe('no_apple_product_id');
  });
});

// ── Independence of lifecycle and product identity ───────────────────────────

describe('Lifecycle and product identity are independent', () => {
  it('PROVIDER_ACTIVE + AMOUNT_INFERRED (the 60-contract case)', () => {
    // Stripe subscription exists and is active, but price ID not in map
    const contract = makeContract({
      product: 'unknown',
      amount_cents: 299,
      billing_interval: 'monthly',
    });
    const result = reconcileContractV2({
      contract,
      legacy_subscription: null,
      provider_truth: {
        stripe_subscription: makeStripeSub({
          items: { data: [{ price: { id: 'price_UNKNOWN', product: 'prod_UNKNOWN' } }] },
        }),
      },
      price_id_map: makePriceIdMap(),
    });
    expect(result.lifecycle_classification).toBe('PROVIDER_ACTIVE');
    expect(result.product_identity_classification).toBe('AMOUNT_INFERRED');
    expect(result.current_paying_eligible).toBe(true);
  });

  it('PROVIDER_EXPIRED + PROVIDER_RESOLVED (stale but product known)', () => {
    const contract = makeContract({ product: 'unknown' });
    const result = reconcileContractV2({
      contract,
      legacy_subscription: null,
      provider_truth: {
        stripe_subscription: makeStripeSub({
          status: 'canceled',
          current_period_end: Math.floor(Date.now() / 1000) - 86400,
        }),
      },
      price_id_map: makePriceIdMap(),
    });
    expect(result.lifecycle_classification).toBe('PROVIDER_EXPIRED');
    expect(result.product_identity_classification).toBe('PROVIDER_RESOLVED');
    expect(result.current_paying_eligible).toBe(false);
  });

  it('PROVIDER_SUBSCRIPTION_MISSING + AMOUNT_INFERRED', () => {
    const contract = makeContract({
      product: 'unknown',
      amount_cents: 299,
      billing_interval: 'monthly',
    });
    const result = reconcileContractV2({
      contract,
      legacy_subscription: null,
      provider_truth: { stripe_not_found: true },
      price_id_map: makePriceIdMap(),
    });
    expect(result.lifecycle_classification).toBe('PROVIDER_SUBSCRIPTION_MISSING');
    expect(result.product_identity_classification).toBe('AMOUNT_INFERRED');
    expect(result.current_paying_eligible).toBe(false);
  });

  it('APPLE_PROVISIONAL + UNRESOLVED', () => {
    const contract = makeContract({ provider: 'apple', provider_subscription_id: 'txn_1' });
    const result = reconcileContractV2({
      contract,
      legacy_subscription: null,
      provider_truth: null,
      price_id_map: makePriceIdMap(),
    });
    expect(result.lifecycle_classification).toBe('APPLE_PROVISIONAL');
    expect(result.product_identity_classification).toBe('UNRESOLVED');
    expect(result.current_paying_eligible).toBe(true);
  });
});

// ── Scope category tests ─────────────────────────────────────────────────────

describe('classifyScopeCategory', () => {
  it('pipekeeper for single module', () => {
    const result = {
      resolved_modules: ['pipekeeper'],
      resolved_product: 'pipekeeper',
    };
    expect(classifyScopeCategory(result)).toBe('pipekeeper');
  });

  it('multi_module_bundle for multiple modules', () => {
    const result = {
      resolved_modules: ['pipekeeper', 'whiskeykeeper'],
      resolved_product: 'bundle',
    };
    expect(classifyScopeCategory(result)).toBe('multi_module_bundle');
  });

  it('unresolved for empty modules', () => {
    const result = { resolved_modules: [], resolved_product: 'unknown' };
    expect(classifyScopeCategory(result)).toBe('unresolved');
  });
});

// ── Invariant counting tests ──────────────────────────────────────────────────

describe('checkInvariantsV2', () => {
  it('counts unique contracts with warnings, not just total findings', () => {
    const results = [
      {
        contract_id: 'c1',
        provider_subscription_id: 'sub_1',
        lifecycle_classification: 'APPLE_PROVISIONAL',
        product_identity_classification: 'UNRESOLVED',
        local_is_active: true,
        provider: 'apple',
        provider_status: null,
      },
      {
        contract_id: 'c2',
        provider_subscription_id: 'sub_2',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'AMOUNT_INFERRED',
        local_is_active: true,
        provider: 'stripe',
        provider_status: 'active',
      },
    ];
    const invariants = checkInvariantsV2(results);
    const warnings = invariants.filter((i) => i.level === 'warning');
    // c1 has APPLE_PROVISIONAL + PRODUCT_IDENTITY_UNRESOLVED = 2 warnings
    // c2 has PRODUCT_INFERRED_FROM_AMOUNT = 1 warning
    // Total findings = 3
    expect(warnings.length).toBe(3);
    // Unique contracts with warnings = 2
    const uniqueContracts = new Set(warnings.map((w) => w.contract_id));
    expect(uniqueContracts.size).toBe(2);
  });

  it('flags stale local active flag as critical', () => {
    const results = [
      {
        contract_id: 'c1',
        provider_subscription_id: 'sub_1',
        lifecycle_classification: 'PROVIDER_EXPIRED',
        product_identity_classification: 'PROVIDER_RESOLVED',
        local_is_active: true,
        provider: 'stripe',
        provider_status: 'canceled',
      },
    ];
    const invariants = checkInvariantsV2(results);
    const critical = invariants.filter((i) => i.level === 'critical');
    expect(critical.some((c) => c.code === 'STALE_LOCAL_ACTIVE_FLAG')).toBe(true);
  });
});

// ── Multi-contract user classification tests ──────────────────────────────────

describe('classifyMultiContractUser', () => {
  it('SINGLE_CONTRACT for one contract', () => {
    const contracts = [
      { ...makeContract({ id: 'c1' }), contract_id: 'c1', resolved_modules: ['pipekeeper'] },
    ];
    const result = classifyMultiContractUser('user_1', contracts);
    expect(result.classification).toBe('SINGLE_CONTRACT');
  });

  it('LEGITIMATE_MULTI_MODULE for different modules', () => {
    const contracts = [
      {
        contract_id: 'c1',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_1',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        current_paying_eligible: true,
        period_start: null,
        period_end: null,
        provider_period_end: null,
      },
      {
        contract_id: 'c2',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_2',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['whiskeykeeper'],
        current_paying_eligible: true,
        period_start: null,
        period_end: null,
        provider_period_end: null,
      },
    ];
    const result = classifyMultiContractUser('user_1', contracts);
    expect(result.classification).toBe('LEGITIMATE_MULTI_MODULE');
    expect(result.scopes_overlap).toBe(false);
  });

  it('CONFIRMED_DUPLICATE_BILLING for same scope, overlapping, all current', () => {
    const now = Date.now();
    const contracts = [
      {
        contract_id: 'c1',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_1',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        current_paying_eligible: true,
        period_start: new Date(now).toISOString(),
        period_end: new Date(now + 30 * 86400000).toISOString(),
        provider_period_end: new Date(now + 30 * 86400000).toISOString(),
      },
      {
        contract_id: 'c2',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_2',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        current_paying_eligible: true,
        period_start: new Date(now + 10 * 86400000).toISOString(),
        period_end: new Date(now + 40 * 86400000).toISOString(),
        provider_period_end: new Date(now + 40 * 86400000).toISOString(),
      },
    ];
    const result = classifyMultiContractUser('user_1', contracts);
    expect(result.classification).toBe('CONFIRMED_DUPLICATE_BILLING');
    expect(result.scopes_overlap).toBe(true);
    expect(result.periods_overlap).toBe(true);
  });

  it('LEGITIMATE_HISTORY for one current + one expired', () => {
    const contracts = [
      {
        contract_id: 'c1',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_1',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        current_paying_eligible: true,
        period_start: null,
        period_end: null,
        provider_period_end: null,
      },
      {
        contract_id: 'c2',
        user_id: 'user_1',
        user_email: 'a@b.com',
        provider_subscription_id: 'sub_2',
        lifecycle_classification: 'PROVIDER_EXPIRED',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        current_paying_eligible: false,
        period_start: null,
        period_end: null,
        provider_period_end: null,
      },
    ];
    const result = classifyMultiContractUser('user_1', contracts);
    expect(result.classification).toBe('LEGITIMATE_HISTORY');
  });
});

// ── Paying population computation tests ──────────────────────────────────────

describe('computePayingPopulation', () => {
  it('separates provider-verified from Apple provisional from stale', () => {
    const results = [
      {
        contract_id: 'c1',
        user_id: 'user_verified',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        local_is_active: true,
      },
      {
        contract_id: 'c2',
        user_id: 'user_apple',
        lifecycle_classification: 'APPLE_PROVISIONAL',
        local_is_active: true,
      },
      {
        contract_id: 'c3',
        user_id: 'user_stale',
        lifecycle_classification: 'PROVIDER_EXPIRED',
        local_is_active: true,
      },
      {
        contract_id: 'c4',
        user_id: 'user_missing',
        lifecycle_classification: 'PROVIDER_SUBSCRIPTION_MISSING',
        local_is_active: true,
      },
    ];
    const report = computePayingPopulation(results);
    expect(report.provider_verified_current_paying).toBe(1);
    expect(report.apple_provisional_current_paying).toBe(1);
    expect(report.recognized_current_paying).toBe(2);
    expect(report.locally_active_not_provider_current).toBe(2);
    expect(report.total_locally_active_looking_users).toBe(4);
  });

  it('user with both verified and expired contracts counts as verified', () => {
    const results = [
      {
        contract_id: 'c1',
        user_id: 'user_mixed',
        lifecycle_classification: 'PROVIDER_ACTIVE',
        local_is_active: true,
      },
      {
        contract_id: 'c2',
        user_id: 'user_mixed',
        lifecycle_classification: 'PROVIDER_EXPIRED',
        local_is_active: true,
      },
    ];
    const report = computePayingPopulation(results);
    expect(report.provider_verified_current_paying).toBe(1);
    expect(report.recognized_current_paying).toBe(1);
  });
});

// ── Arithmetic invariant tests ───────────────────────────────────────────────

describe('Arithmetic invariants', () => {
  it('lifecycle + product identity + scope classifications each sum to total', () => {
    // Simulate the 86-contract population
    const results = [];
    // 9 PROVIDER_ACTIVE + PROVIDER_RESOLVED
    for (let i = 0; i < 9; i++) {
      results.push({
        contract_id: `c_${i}`,
        user_id: `u_${i}`,
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'PROVIDER_RESOLVED',
        resolved_modules: ['pipekeeper'],
        resolved_product: 'pipekeeper',
      });
    }
    // 60 PROVIDER_ACTIVE + AMOUNT_INFERRED
    for (let i = 9; i < 69; i++) {
      results.push({
        contract_id: `c_${i}`,
        user_id: `u_${i}`,
        lifecycle_classification: 'PROVIDER_ACTIVE',
        product_identity_classification: 'AMOUNT_INFERRED',
        resolved_modules: ['pipekeeper'],
        resolved_product: 'pipekeeper',
      });
    }
    // 8 PROVIDER_SUBSCRIPTION_MISSING + AMOUNT_INFERRED
    for (let i = 69; i < 77; i++) {
      results.push({
        contract_id: `c_${i}`,
        user_id: `u_${i}`,
        lifecycle_classification: 'PROVIDER_SUBSCRIPTION_MISSING',
        product_identity_classification: 'AMOUNT_INFERRED',
        resolved_modules: ['pipekeeper'],
        resolved_product: 'pipekeeper',
      });
    }
    // 1 PROVIDER_EXPIRED + PROVIDER_RESOLVED
    results.push({
      contract_id: 'c_77',
      user_id: 'u_77',
      lifecycle_classification: 'PROVIDER_EXPIRED',
      product_identity_classification: 'PROVIDER_RESOLVED',
      resolved_modules: ['pipekeeper'],
      resolved_product: 'pipekeeper',
    });
    // 8 APPLE_PROVISIONAL + UNRESOLVED
    for (let i = 78; i < 86; i++) {
      results.push({
        contract_id: `c_${i}`,
        user_id: `u_${i}`,
        lifecycle_classification: 'APPLE_PROVISIONAL',
        product_identity_classification: 'UNRESOLVED',
        resolved_modules: [],
        resolved_product: 'unknown',
      });
    }

    expect(results.length).toBe(86);

    // Lifecycle sum
    const lifecycleCounts = {};
    for (const r of results) {
      lifecycleCounts[r.lifecycle_classification] =
        (lifecycleCounts[r.lifecycle_classification] || 0) + 1;
    }
    const lifecycleSum = Object.values(lifecycleCounts).reduce((a, b) => a + b, 0);
    expect(lifecycleSum).toBe(86);

    // Product identity sum
    const productCounts = {};
    for (const r of results) {
      productCounts[r.product_identity_classification] =
        (productCounts[r.product_identity_classification] || 0) + 1;
    }
    const productSum = Object.values(productCounts).reduce((a, b) => a + b, 0);
    expect(productSum).toBe(86);

    // Scope sum
    const scopeCounts = { pipekeeper: 0, whiskeykeeper: 0, cigarkeeper: 0, winekeeper: 0, multi_module_bundle: 0, unresolved: 0 };
    for (const r of results) {
      const cat = classifyScopeCategory(r);
      scopeCounts[cat]++;
    }
    const scopeSum = Object.values(scopeCounts).reduce((a, b) => a + b, 0);
    expect(scopeSum).toBe(86);

    // Paying eligibility sum
    const payingEligible = results.filter((r) =>
      ['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE', 'APPLE_PROVISIONAL'].includes(
        r.lifecycle_classification,
      ),
    ).length;
    const notEligible = results.length - payingEligible;
    expect(payingEligible + notEligible).toBe(86);
  });
});