import { describe, it, expect } from 'vitest';
import { reconcileContract, classifyScopeCategory, checkReconciliationInvariants } from '../lib/billing/contractReconciler.js';
import { PLAN_CATALOG } from '../lib/billing/productScopeResolver.js';

// Test price_id_map: mirrors env var → plan key mapping
const PRICE_ID_MAP = {
  'price_pipekeeper_monthly': 'pipekeeper_pro_monthly',
  'price_pipekeeper_annual': 'pipekeeper_pro_annual',
  'price_whiskeykeeper_monthly': 'whiskeykeeper_pro_monthly',
  'price_whiskeykeeper_annual': 'whiskeykeeper_pro_annual',
  'price_cigarkeeper_monthly': 'cigarkeeper_pro_monthly',
  'price_cigarkeeper_annual': 'cigarkeeper_pro_annual',
  'price_winekeeper_monthly': 'winekeeper_pro_monthly',
  'price_winekeeper_annual': 'winekeeper_pro_annual',
  'price_founders_monthly': 'founders_bundle_monthly',
  'price_founders_annual': 'founders_bundle_annual',
  'price_three_bundle_monthly': 'three_module_bundle_monthly',
  'price_three_bundle_annual': 'three_module_bundle_annual',
  'price_four_bundle_monthly': 'four_module_bundle_monthly',
  'price_four_bundle_annual': 'four_module_bundle_annual',
};

describe('Contract Reconciler — Stripe authoritative recovery', () => {
  it('recovers PipeKeeper from Stripe when local product is unknown', () => {
    const contract = {
      id: 'contract_1',
      user_id: 'user_1',
      provider: 'stripe',
      provider_subscription_id: 'sub_abc',
      product: 'unknown',
      is_active: true,
      billing_interval: 'annual',
      amount_cents: 2999,
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_abc',
        status: 'active',
        current_period_end: 1798160000,
        items: {
          data: [{
            price: {
              id: 'price_pipekeeper_annual',
              product: 'prod_pipekeeper',
            },
          }],
        },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVIDER_RECOVERED');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolved_modules).toEqual(['pipekeeper']);
    expect(result.resolved_price_id).toBe('price_pipekeeper_annual');
    expect(result.resolved_product_id).toBe('prod_pipekeeper');
    expect(result.resolution_source).toBe('stripe_price');
    expect(result.confidence).toBe('high');
    expect(result.repair_needed).toBe(true);
    expect(result.repair_fields.product).toBe('pipekeeper');
  });

  it('classifies PROVIDER_MATCHED when local agrees with Stripe', () => {
    const contract = {
      id: 'contract_2',
      user_id: 'user_2',
      provider: 'stripe',
      provider_subscription_id: 'sub_def',
      product: 'pipekeeper',
      is_active: true,
      billing_interval: 'annual',
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_def',
        status: 'active',
        current_period_end: 1798160000,
        items: {
          data: [{
            price: { id: 'price_pipekeeper_annual', product: 'prod_pk' },
          }],
        },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVIDER_MATCHED');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.local_matches_provider).toBe(true);
  });
});

describe('Contract Reconciler — local mismatch', () => {
  it('classifies PROVIDER_MISMATCH when Stripe says WhiskeyKeeper but local says PipeKeeper', () => {
    const contract = {
      id: 'contract_3',
      user_id: 'user_3',
      provider: 'stripe',
      provider_subscription_id: 'sub_xyz',
      product: 'pipekeeper',
      is_active: true,
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_xyz',
        status: 'active',
        current_period_end: 1798160000,
        items: {
          data: [{
            price: { id: 'price_whiskeykeeper_annual', product: 'prod_wk' },
          }],
        },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVIDER_MISMATCH');
    expect(result.resolved_product).toBe('whiskeykeeper');
    expect(result.local_product).toBe('pipekeeper');
    expect(result.local_matches_provider).toBe(false);
    expect(result.issues.some(i => i.includes('PROVIDER_MISMATCH'))).toBe(true);
    expect(result.repair_fields.product).toBe('whiskeykeeper');
  });

  it('does not silently trust local state when provider says different', () => {
    const contract = {
      id: 'contract_3b',
      user_id: 'user_3b',
      provider: 'stripe',
      provider_subscription_id: 'sub_xyz2',
      product: 'whiskeykeeper',
      is_active: true,
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_xyz2',
        status: 'active',
        items: { data: [{ price: { id: 'price_cigarkeeper_annual', product: 'prod_ck' } }] },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVIDER_MISMATCH');
    expect(result.resolved_product).toBe('cigarkeeper');
    expect(result.local_product).toBe('whiskeykeeper');
  });
});

describe('Contract Reconciler — price collision', () => {
  it('resolves product from Price/Product ID, not amount', () => {
    // Two products both cost $29.99 — must resolve from price ID
    const contract = {
      id: 'contract_4',
      user_id: 'user_4',
      provider: 'stripe',
      provider_subscription_id: 'sub_collision',
      product: 'unknown',
      is_active: true,
      billing_interval: 'annual',
      amount_cents: 2999, // same as PipeKeeper annual
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_collision',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_whiskeykeeper_annual', product: 'prod_wk' },
          }],
        },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.resolved_product).toBe('whiskeykeeper');
    expect(result.resolution_source).toBe('stripe_price');
    expect(result.confidence).toBe('high');
    // Must NOT be resolved from amount
    expect(result.resolution_source).not.toBe('amount_interval_inference');
  });
});

describe('Contract Reconciler — legacy fallback', () => {
  it('resolves as historical/inferred (NOT provider verified) when provider unavailable', () => {
    const contract = {
      id: 'contract_5',
      user_id: 'user_5',
      provider: 'stripe',
      provider_subscription_id: 'sub_legacy',
      product: 'unknown',
      is_active: true,
    };
    const legacy_subscription = {
      id: 'sub_legacy_internal',
      plan_key: 'pipekeeper_pro_annual',
      provider_subscription_id: 'sub_legacy',
    };
    const provider_truth = {
      stripe_lookup_error: 'API temporarily unavailable',
    };

    const result = reconcileContract({ contract, legacy_subscription, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('HISTORICAL_INFERRED');
    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolution_source).toBe('legacy_subscription');
    expect(result.confidence).not.toBe('high');
    // Must NOT be provider verified
    expect(result.resolution_source).not.toBe('stripe_price');
  });
});

describe('Contract Reconciler — amount-only fallback', () => {
  it('resolves provisionally from $19.99/year but marks source as amount_interval_inference', () => {
    const contract = {
      id: 'contract_6',
      user_id: 'user_6',
      provider: 'stripe',
      provider_subscription_id: 'sub_old',
      product: 'unknown',
      is_active: true,
      billing_interval: 'annual',
      amount_cents: 1999,
    };
    // No provider truth, no legacy subscription
    const result = reconcileContract({ contract, price_id_map: PRICE_ID_MAP });

    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolution_source).toBe('amount_interval_inference');
    expect(result.confidence).toBe('low');
    // Must NOT be marked as provider verified
    expect(result.resolution_source).not.toBe('stripe_price');
    expect(result.confidence).not.toBe('high');
  });

  it('does NOT mark amount-inferred as high confidence', () => {
    const contract = {
      id: 'contract_6b',
      user_id: 'user_6b',
      provider: 'stripe',
      provider_subscription_id: 'sub_old2',
      product: 'unknown',
      is_active: true,
      billing_interval: 'monthly',
      amount_cents: 299,
    };
    const result = reconcileContract({ contract, price_id_map: PRICE_ID_MAP });

    expect(result.resolution_source).toBe('amount_interval_inference');
    expect(result.confidence).toBe('low');
    expect(result.confidence).not.toBe('high');
  });
});

describe('Contract Reconciler — multiple modules (no duplicate billing)', () => {
  it('treats PipeKeeper + WhiskeyKeeper as 2 contracts, 1 customer, no conflict', () => {
    const contract1 = {
      id: 'contract_pk',
      user_id: 'user_multi',
      provider: 'stripe',
      provider_subscription_id: 'sub_pk',
      product: 'pipekeeper',
      is_active: true,
    };
    const contract2 = {
      id: 'contract_wk',
      user_id: 'user_multi',
      provider: 'stripe',
      provider_subscription_id: 'sub_wk',
      product: 'whiskeykeeper',
      is_active: true,
    };
    const truth1 = {
      stripe_subscription: {
        id: 'sub_pk', status: 'active',
        items: { data: [{ price: { id: 'price_pipekeeper_monthly', product: 'prod_pk' } }] },
      },
    };
    const truth2 = {
      stripe_subscription: {
        id: 'sub_wk', status: 'active',
        items: { data: [{ price: { id: 'price_whiskeykeeper_monthly', product: 'prod_wk' } }] },
      },
    };

    const r1 = reconcileContract({ contract: contract1, provider_truth: truth1, price_id_map: PRICE_ID_MAP });
    const r2 = reconcileContract({ contract: contract2, provider_truth: truth2, price_id_map: PRICE_ID_MAP });

    expect(r1.resolved_product).toBe('pipekeeper');
    expect(r2.resolved_product).toBe('whiskeykeeper');
    expect(r1.user_id).toBe(r2.user_id);
    // Different scopes — no duplicate billing conflict
    const scopes = new Set([r1.resolved_product, r2.resolved_product]);
    expect(scopes.size).toBe(2);
  });
});

describe('Contract Reconciler — scope arithmetic', () => {
  it('every active contract belongs to exactly one reporting category', () => {
    const contracts = [
      { id: 'c1', user_id: 'u1', provider: 'stripe', provider_subscription_id: 's1', product: 'pipekeeper', is_active: true },
      { id: 'c2', user_id: 'u2', provider: 'stripe', provider_subscription_id: 's2', product: 'whiskeykeeper', is_active: true },
      { id: 'c3', user_id: 'u3', provider: 'apple', product: 'unknown', is_active: true },
      { id: 'c4', user_id: 'u4', provider: 'stripe', provider_subscription_id: 's4', product: 'unknown', is_active: true, billing_interval: 'annual', amount_cents: 1999 },
    ];
    const truths = {
      s1: { stripe_subscription: { id: 's1', status: 'active', items: { data: [{ price: { id: 'price_pipekeeper_annual', product: 'prod_pk' } }] } } },
      s2: { stripe_subscription: { id: 's2', status: 'active', items: { data: [{ price: { id: 'price_whiskeykeeper_annual', product: 'prod_wk' } }] } } },
      s4: { stripe_subscription: { id: 's4', status: 'active', items: { data: [{ price: { id: 'price_unknown', product: 'prod_unknown' } }] } } },
    };

    const results = contracts.map(c => reconcileContract({
      contract: c,
      provider_truth: truths[c.provider_subscription_id] || null,
      price_id_map: PRICE_ID_MAP,
    }));

    const categories = results.map(classifyScopeCategory);
    const counts = {};
    for (const cat of categories) {
      counts[cat] = (counts[cat] || 0) + 1;
    }

    // Sum of all categories must equal total contracts
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(contracts.length);
    // 4 contracts → categories must sum to 4
    expect(total).toBe(4);
  });
});

describe('Contract Reconciler — Apple contracts', () => {
  it('marks as PROVISIONAL_APPLE when no productId exists', () => {
    const contract = {
      id: 'contract_apple_1',
      user_id: 'user_apple',
      provider: 'apple',
      provider_subscription_id: 'apple_txn_123',
      product: 'unknown',
      is_active: true,
      amount_cents: 0,
    };

    const result = reconcileContract({ contract, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVISIONAL_APPLE');
    expect(result.resolved_product).toBe('unknown');
    expect(result.resolution_source).toBe('no_apple_product_id');
  });

  it('does NOT infer Apple product from $0 amount', () => {
    const contract = {
      id: 'contract_apple_2',
      user_id: 'user_apple2',
      provider: 'apple',
      provider_subscription_id: 'apple_txn_456',
      product: 'unknown',
      is_active: true,
      amount_cents: 0,
      billing_interval: 'month',
    };

    const result = reconcileContract({ contract, price_id_map: PRICE_ID_MAP });

    // Must NOT resolve from amount
    expect(result.resolved_product).not.toBe('pipekeeper');
    expect(result.classification).toBe('PROVISIONAL_APPLE');
  });

  it('resolves Apple product when productId is available in legacy subscription', () => {
    const contract = {
      id: 'contract_apple_3',
      user_id: 'user_apple3',
      provider: 'apple',
      provider_subscription_id: 'apple_txn_789',
      product: 'unknown',
      is_active: true,
    };
    const legacy_subscription = {
      id: 'sub_apple_legacy',
      product_id: 'com.collectionkeeper.pipekeeper.annual',
    };

    const result = reconcileContract({ contract, legacy_subscription, price_id_map: PRICE_ID_MAP });

    expect(result.resolved_product).toBe('pipekeeper');
    expect(result.resolution_source).toBe('apple_product_id');
    expect(result.confidence).toBe('high');
  });
});

describe('Contract Reconciler — stale contracts', () => {
  it('classifies STALE_NOT_ACTIVE when provider says canceled but local says active', () => {
    const contract = {
      id: 'contract_stale',
      user_id: 'user_stale',
      provider: 'stripe',
      provider_subscription_id: 'sub_stale',
      product: 'pipekeeper',
      is_active: true,
      status: 'active',
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_stale',
        status: 'canceled',
        current_period_end: 1798160000,
        items: { data: [{ price: { id: 'price_pipekeeper_annual', product: 'prod_pk' } }] },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('STALE_NOT_ACTIVE');
    expect(result.provider_status).toBe('canceled');
    expect(result.issues.some(i => i.includes('STALE'))).toBe(true);
  });
});

describe('Contract Reconciler — missing subscription', () => {
  it('classifies PROVIDER_SUBSCRIPTION_MISSING when Stripe has no such subscription', () => {
    const contract = {
      id: 'contract_missing',
      user_id: 'user_missing',
      provider: 'stripe',
      provider_subscription_id: 'sub_ghost',
      product: 'pipekeeper',
      is_active: true,
    };
    const provider_truth = { stripe_not_found: true };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.classification).toBe('PROVIDER_SUBSCRIPTION_MISSING');
    expect(result.issues.some(i => i.includes('PROVIDER_SUBSCRIPTION_MISSING'))).toBe(true);
  });
});

describe('Contract Reconciler — reconciliation invariants', () => {
  it('flags duplicate provider_subscription_id references', () => {
    const results = [
      {
        contract_id: 'c1', user_id: 'u1', provider: 'stripe',
        provider_subscription_id: 'sub_dup', classification: 'PROVIDER_MATCHED',
        resolved_product: 'pipekeeper', local_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'], resolution_source: 'stripe_price', confidence: 'high',
        issues: [],
      },
      {
        contract_id: 'c2', user_id: 'u2', provider: 'stripe',
        provider_subscription_id: 'sub_dup', classification: 'PROVIDER_MATCHED',
        resolved_product: 'pipekeeper', local_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'], resolution_source: 'stripe_price', confidence: 'high',
        issues: [],
      },
    ];

    const invariants = checkReconciliationInvariants(results);
    const dupInv = invariants.find(i => i.code === 'DUPLICATE_PROVIDER_SUBSCRIPTION_REFERENCE');
    expect(dupInv).toBeDefined();
    expect(dupInv.level).toBe('critical');
  });

  it('flags Stripe active contract with no subscription ID', () => {
    const results = [{
      contract_id: 'c1', user_id: 'u1', provider: 'stripe',
      provider_subscription_id: '', classification: 'UNRESOLVED',
      resolved_product: 'unknown', local_product: 'unknown',
      resolved_modules: [], resolution_source: 'unresolved', confidence: 'unresolved',
      issues: [],
    }];

    const invariants = checkReconciliationInvariants(results);
    expect(invariants.some(i => i.code === 'STRIPE_ACTIVE_NO_SUBSCRIPTION_ID')).toBe(true);
  });

  it('flags amount inference marked as high confidence', () => {
    const results = [{
      contract_id: 'c1', user_id: 'u1', provider: 'stripe',
      provider_subscription_id: 'sub1', classification: 'HISTORICAL_INFERRED',
      resolved_product: 'pipekeeper', local_product: 'unknown',
      resolved_modules: ['pipekeeper'], resolution_source: 'amount_interval_inference', confidence: 'high',
      issues: [],
    }];

    const invariants = checkReconciliationInvariants(results);
    expect(invariants.some(i => i.code === 'AMOUNT_INFERENCE_MARKED_AS_VERIFIED')).toBe(true);
  });

  it('warns on Apple provisional', () => {
    const results = [{
      contract_id: 'c1', user_id: 'u1', provider: 'apple',
      provider_subscription_id: 'apple_txn', classification: 'PROVISIONAL_APPLE',
      resolved_product: 'unknown', local_product: 'unknown',
      resolved_modules: [], resolution_source: 'no_apple_product_id', confidence: 'unresolved',
      issues: [],
    }];

    const invariants = checkReconciliationInvariants(results);
    const appleInv = invariants.find(i => i.code === 'APPLE_PROVISIONAL');
    expect(appleInv).toBeDefined();
    expect(appleInv.level).toBe('warning');
  });

  it('warns on historical amount inference', () => {
    const results = [{
      contract_id: 'c1', user_id: 'u1', provider: 'stripe',
      provider_subscription_id: 'sub1', classification: 'HISTORICAL_INFERRED',
      resolved_product: 'pipekeeper', local_product: 'unknown',
      resolved_modules: ['pipekeeper'], resolution_source: 'amount_interval_inference', confidence: 'low',
      issues: [],
    }];

    const invariants = checkReconciliationInvariants(results);
    expect(invariants.some(i => i.code === 'HISTORICAL_AMOUNT_INFERENCE' && i.level === 'warning')).toBe(true);
  });
});

describe('Contract Reconciler — bundle resolution', () => {
  it('resolves 4-module bundle from Stripe price ID', () => {
    const contract = {
      id: 'contract_bundle',
      user_id: 'user_bundle',
      provider: 'stripe',
      provider_subscription_id: 'sub_bundle',
      product: 'unknown',
      is_active: true,
    };
    const provider_truth = {
      stripe_subscription: {
        id: 'sub_bundle',
        status: 'active',
        items: { data: [{ price: { id: 'price_four_bundle_annual', product: 'prod_4mod' } }] },
      },
    };

    const result = reconcileContract({ contract, provider_truth, price_id_map: PRICE_ID_MAP });

    expect(result.resolved_product).toBe('bundle');
    expect(result.resolved_modules).toEqual(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
    expect(result.resolved_plan_key).toBe('four_module_bundle_annual');
    expect(classifyScopeCategory(result)).toBe('multi_module_bundle');
  });
});