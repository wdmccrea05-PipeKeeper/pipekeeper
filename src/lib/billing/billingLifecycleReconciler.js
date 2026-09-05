/**
 * JS mirror of base44/shared/billingLifecycleReconciler.ts for vitest testing.
 * Kept in sync manually — the TS version is the source of truth.
 */

import { PLAN_CATALOG, LEGACY_AMOUNT_MAP, normalizeModule } from './productScopeResolver.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeInterval(interval) {
  const raw = String(interval || '').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'annual' || raw === 'yearly' || raw === 'year') return 'annual';
  return 'unknown';
}

function parseModulesCsv(csv) {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => normalizeModule(s.trim()))
    .filter((m) => m && m !== 'unknown' && m !== 'bundle');
}

function isPeriodEndInFuture(periodEndEpoch) {
  if (!periodEndEpoch) return false;
  return periodEndEpoch * 1000 > Date.now();
}

// ── Lifecycle classification ─────────────────────────────────────────────────

export function classifyBillingLifecycle(contract, provider_truth) {
  const provider = contract.provider;

  if (provider === 'stripe') {
    if (!contract.provider_subscription_id) {
      return {
        classification: 'NO_PROVIDER_REFERENCE',
        source: 'no_provider_reference',
        provider_status: null,
        provider_cancel_at_period_end: null,
        provider_canceled_at: null,
        provider_period_end: null,
      };
    }

    if (provider_truth?.stripe_subscription) {
      const sub = provider_truth.stripe_subscription;
      const status = sub.status || 'unknown';
      const cancelAtPeriodEnd = sub.cancel_at_period_end === true;
      const canceledAt = sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null;
      const periodEndEpoch = sub.current_period_end || null;
      const providerPeriodEnd = periodEndEpoch
        ? new Date(periodEndEpoch * 1000).toISOString()
        : null;

      const base = {
        source: 'live_stripe_subscription',
        provider_status: status,
        provider_cancel_at_period_end: cancelAtPeriodEnd,
        provider_canceled_at: canceledAt,
        provider_period_end: providerPeriodEnd,
      };

      if (status === 'active' && !cancelAtPeriodEnd) {
        return { classification: 'PROVIDER_ACTIVE', ...base };
      }
      if (status === 'active' && cancelAtPeriodEnd) {
        return { classification: 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE', ...base };
      }
      if (status === 'trialing') {
        return { classification: 'PROVIDER_TRIALING', ...base };
      }
      if (status === 'past_due') {
        return { classification: 'PROVIDER_ACTIVE', ...base };
      }
      if (status === 'canceled') {
        if (isPeriodEndInFuture(periodEndEpoch)) {
          return { classification: 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE', ...base };
        }
        return { classification: 'PROVIDER_EXPIRED', ...base };
      }
      if (['unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
        return { classification: 'PROVIDER_EXPIRED', ...base };
      }
      return { classification: 'MANUAL_REVIEW', ...base };
    }

    if (provider_truth?.stripe_not_found) {
      return {
        classification: 'PROVIDER_SUBSCRIPTION_MISSING',
        source: 'live_stripe_subscription',
        provider_status: null,
        provider_cancel_at_period_end: null,
        provider_canceled_at: null,
        provider_period_end: null,
      };
    }

    if (provider_truth?.stripe_lookup_error) {
      return {
        classification: 'PROVIDER_LOOKUP_FAILED',
        source: 'live_stripe_subscription',
        provider_status: null,
        provider_cancel_at_period_end: null,
        provider_canceled_at: null,
        provider_period_end: null,
      };
    }

    return {
      classification: 'MANUAL_REVIEW',
      source: 'local_only',
      provider_status: null,
      provider_cancel_at_period_end: null,
      provider_canceled_at: null,
      provider_period_end: null,
    };
  }

  if (provider === 'apple') {
    return {
      classification: 'APPLE_PROVISIONAL',
      source: 'apple_provisional',
      provider_status: null,
      provider_cancel_at_period_end: null,
      provider_canceled_at: null,
      provider_period_end: null,
    };
  }

  return {
    classification: 'MANUAL_REVIEW',
    source: 'local_only',
    provider_status: null,
    provider_cancel_at_period_end: null,
    provider_canceled_at: null,
    provider_period_end: null,
  };
}

// ── Apple product ID → plan mapping ──────────────────────────────────────────

function mapAppleProductIdToPlan(appleProductId, priceIdMap) {
  if (!appleProductId) return null;
  if (priceIdMap && priceIdMap[appleProductId]) return priceIdMap[appleProductId];
  if (PLAN_CATALOG[appleProductId]) return appleProductId;
  const lower = appleProductId.toLowerCase();
  if (lower.includes('pipekeeper') && lower.includes('annual')) return 'pipekeeper_pro_annual';
  if (lower.includes('pipekeeper') && lower.includes('month')) return 'pipekeeper_pro_monthly';
  if (lower.includes('whiskeykeeper') && lower.includes('annual')) return 'whiskeykeeper_pro_annual';
  if (lower.includes('whiskeykeeper') && lower.includes('month')) return 'whiskeykeeper_pro_monthly';
  if (lower.includes('cigarkeeper') && lower.includes('annual')) return 'cigarkeeper_pro_annual';
  if (lower.includes('cigarkeeper') && lower.includes('month')) return 'cigarkeeper_pro_monthly';
  if (lower.includes('winekeeper') && lower.includes('annual')) return 'winekeeper_pro_annual';
  if (lower.includes('winekeeper') && lower.includes('month')) return 'winekeeper_pro_monthly';
  if (lower.includes('founders') && lower.includes('annual')) return 'founders_bundle_annual';
  if (lower.includes('founders') && lower.includes('month')) return 'founders_bundle_monthly';
  if (lower.includes('four') && lower.includes('annual')) return 'four_module_bundle_annual';
  if (lower.includes('four') && lower.includes('month')) return 'four_module_bundle_monthly';
  if (lower.includes('three') && lower.includes('annual')) return 'three_module_bundle_annual';
  if (lower.includes('three') && lower.includes('month')) return 'three_module_bundle_monthly';
  return null;
}

// ── Product identity classification ─────────────────────────────────────────

export function classifyProductIdentity(contract, legacy_subscription, provider_truth, price_id_map) {
  const empty = {
    classification: 'UNRESOLVED',
    resolution_source: 'unresolved',
    resolved_product: 'unknown',
    resolved_modules: [],
    resolved_price_id: null,
    resolved_product_id: null,
    resolved_plan_key: null,
    confidence: 'unresolved',
  };

  // 1. PROVIDER TRUTH — Live Stripe subscription
  if (provider_truth?.stripe_subscription) {
    const sub = provider_truth.stripe_subscription;
    const items = sub.items?.data || [];
    const firstItem = items[0];

    if (firstItem?.price) {
      const stripePriceId = firstItem.price.id || null;
      const stripeProductId =
        typeof firstItem.price.product === 'object'
          ? firstItem.price.product?.id
          : firstItem.price.product || null;

      if (stripePriceId && price_id_map && price_id_map[stripePriceId]) {
        const planKey = price_id_map[stripePriceId];
        const plan = PLAN_CATALOG[planKey];
        if (plan) {
          return {
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_price',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: stripePriceId,
            resolved_product_id: stripeProductId,
            resolved_plan_key: planKey,
            confidence: 'high',
          };
        }
      }

      const productObj =
        typeof firstItem.price.product === 'object' ? firstItem.price.product : null;
      if (productObj?.metadata) {
        const meta = productObj.metadata;
        if (meta.plan_key && PLAN_CATALOG[meta.plan_key]) {
          const plan = PLAN_CATALOG[meta.plan_key];
          return {
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_product',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: stripePriceId,
            resolved_product_id: stripeProductId,
            resolved_plan_key: meta.plan_key,
            confidence: 'high',
          };
        }
        if (meta.modules) {
          const mods = meta.modules.split(',').map(normalizeModule).filter((m) => m && m !== 'unknown');
          if (mods.length > 0) {
            return {
              classification: 'PROVIDER_RESOLVED',
              resolution_source: 'stripe_product',
              resolved_product: mods.length > 1 ? 'bundle' : mods[0],
              resolved_modules: mods,
              resolved_price_id: stripePriceId,
              resolved_product_id: stripeProductId,
              resolved_plan_key: null,
              confidence: 'high',
            };
          }
        }
      }
    }
  }

  // 2. APPLE product ID
  if (contract.provider === 'apple') {
    const appleProductId = contract.resolved_product_id || legacy_subscription?.product_id || null;
    if (appleProductId) {
      const planKey = mapAppleProductIdToPlan(appleProductId, price_id_map);
      if (planKey && PLAN_CATALOG[planKey]) {
        const plan = PLAN_CATALOG[planKey];
        return {
          classification: 'PROVIDER_RESOLVED',
          resolution_source: 'apple_product_id',
          resolved_product: plan.product,
          resolved_modules: plan.modules,
          resolved_price_id: null,
          resolved_product_id: appleProductId,
          resolved_plan_key: planKey,
          confidence: 'high',
        };
      }
      return { ...empty, resolution_source: 'apple_product_id_unmapped', resolved_product_id: appleProductId };
    }
    return { ...empty, resolution_source: 'no_apple_product_id' };
  }

  // 3. LEGACY RESOLUTION
  const localPriceId = contract.resolved_price_id || null;
  if (localPriceId && price_id_map && price_id_map[localPriceId]) {
    const planKey = price_id_map[localPriceId];
    const plan = PLAN_CATALOG[planKey];
    if (plan) {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'price_id_lookup',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_price_id: localPriceId,
        resolved_product_id: contract.resolved_product_id || null,
        resolved_plan_key: planKey,
        confidence: 'high',
      };
    }
  }

  if (contract.plan_key && PLAN_CATALOG[contract.plan_key]) {
    const plan = PLAN_CATALOG[contract.plan_key];
    return {
      classification: 'LEGACY_RESOLVED',
      resolution_source: 'plan_key',
      resolved_product: plan.product,
      resolved_modules: plan.modules,
      resolved_price_id: null,
      resolved_product_id: null,
      resolved_plan_key: contract.plan_key,
      confidence: 'high',
    };
  }

  if (contract.modules && contract.modules.length > 0) {
    const mods = contract.modules.map(normalizeModule).filter((m) => m && m !== 'unknown');
    if (mods.length > 0) {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'modules_csv',
        resolved_product: mods.length > 1 ? 'bundle' : mods[0],
        resolved_modules: mods,
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'high',
      };
    }
  }

  if (legacy_subscription) {
    if (legacy_subscription.plan_key && PLAN_CATALOG[legacy_subscription.plan_key]) {
      const plan = PLAN_CATALOG[legacy_subscription.plan_key];
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'legacy_subscription',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: legacy_subscription.plan_key,
        confidence: 'medium',
      };
    }
    if (legacy_subscription.modules_csv) {
      const mods = parseModulesCsv(legacy_subscription.modules_csv);
      if (mods.length > 0) {
        return {
          classification: 'LEGACY_RESOLVED',
          resolution_source: 'legacy_subscription',
          resolved_product: mods.length > 1 ? 'bundle' : mods[0],
          resolved_modules: mods,
          resolved_price_id: null,
          resolved_product_id: null,
          resolved_plan_key: null,
          confidence: 'medium',
        };
      }
    }
    if (legacy_subscription.primary_module) {
      const mod = normalizeModule(legacy_subscription.primary_module);
      if (mod && mod !== 'unknown') {
        return {
          classification: 'LEGACY_RESOLVED',
          resolution_source: 'legacy_subscription',
          resolved_product: mod,
          resolved_modules: [mod],
          resolved_price_id: null,
          resolved_product_id: null,
          resolved_plan_key: null,
          confidence: 'medium',
        };
      }
    }
    const pkind = legacy_subscription.product_kind;
    const ctype = legacy_subscription.checkout_type;
    if (pkind === 'founders' || ctype === 'bundle_2') {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'legacy_subscription',
        resolved_product: 'bundle',
        resolved_modules: ['pipekeeper', 'whiskeykeeper'],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
    if (ctype === 'bundle_3') {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'legacy_subscription',
        resolved_product: 'bundle',
        resolved_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
    if (ctype === 'bundle_4') {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'legacy_subscription',
        resolved_product: 'bundle',
        resolved_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
  }

  const contractPkind = contract.product_kind;
  const contractCtype = contract.checkout_type;
  if (contractPkind === 'founders' || contractCtype === 'bundle_2') {
    return {
      classification: 'LEGACY_RESOLVED',
      resolution_source: 'product_kind',
      resolved_product: 'bundle',
      resolved_modules: ['pipekeeper', 'whiskeykeeper'],
      resolved_price_id: null,
      resolved_product_id: null,
      resolved_plan_key: null,
      confidence: 'medium',
    };
  }
  if (contractCtype === 'bundle_3') {
    return {
      classification: 'LEGACY_RESOLVED',
      resolution_source: 'product_kind',
      resolved_product: 'bundle',
      resolved_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      resolved_price_id: null,
      resolved_product_id: null,
      resolved_plan_key: null,
      confidence: 'medium',
    };
  }
  if (contractCtype === 'bundle_4') {
    return {
      classification: 'LEGACY_RESOLVED',
      resolution_source: 'product_kind',
      resolved_product: 'bundle',
      resolved_modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      resolved_price_id: null,
      resolved_product_id: null,
      resolved_plan_key: null,
      confidence: 'medium',
    };
  }

  if (contract.primary_module) {
    const mod = normalizeModule(contract.primary_module);
    if (mod && mod !== 'unknown' && mod !== 'bundle') {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'primary_module',
        resolved_product: mod,
        resolved_modules: [mod],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
  }

  const localProduct = (contract.product || 'unknown').toLowerCase();
  if (localProduct !== 'unknown') {
    const knownProducts = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle'];
    if (knownProducts.includes(localProduct)) {
      return {
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'existing_product_field',
        resolved_product: localProduct,
        resolved_modules: localProduct === 'bundle' ? [] : [localProduct],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
  }

  // 4. AMOUNT INFERENCE
  const billingInterval = normalizeInterval(contract.billing_interval);
  const amountCents = contract.amount_cents ?? null;

  if (amountCents != null && billingInterval !== 'unknown') {
    const key = `${amountCents}_${billingInterval}`;
    if (LEGACY_AMOUNT_MAP[key]) {
      const legacy = LEGACY_AMOUNT_MAP[key];
      return {
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: legacy.product,
        resolved_modules: legacy.modules,
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'low',
      };
    }
    if (amountCents === 2999 && billingInterval === 'annual') {
      return {
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'low',
      };
    }
    if (amountCents === 299 && billingInterval === 'monthly') {
      return {
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'low',
      };
    }
  }

  return empty;
}

// ── Full contract reconciliation ─────────────────────────────────────────────

export function reconcileContractV2(input) {
  const { contract, legacy_subscription, provider_truth, price_id_map } = input;

  const contract_id = contract.id;
  const user_id = contract.user_id || '';
  const user_email = contract.user_email || '';
  const provider = contract.provider;
  const provider_subscription_id = contract.provider_subscription_id || '';
  const provider_customer_id = contract.provider_customer_id || '';
  const internal_subscription_id = contract.source_subscription_id || legacy_subscription?.id || null;
  const local_is_active = contract.is_active !== false;
  const local_status = contract.status || 'unknown';
  const period_end = contract.period_end || null;

  const lifecycle = classifyBillingLifecycle(contract, provider_truth || null);
  const product = classifyProductIdentity(contract, legacy_subscription || null, provider_truth || null, price_id_map);

  const current_paying_eligible = [
    'PROVIDER_ACTIVE',
    'PROVIDER_TRIALING',
    'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
    'APPLE_PROVISIONAL',
  ].includes(lifecycle.classification);

  const anomaly_codes = [];
  if (lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING') anomaly_codes.push('STRIPE_SUBSCRIPTION_NOT_FOUND');
  if (lifecycle.classification === 'PROVIDER_EXPIRED') anomaly_codes.push('PROVIDER_SAYS_EXPIRED');
  if (lifecycle.classification === 'PROVIDER_EXPIRED' || lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING') {
    if (local_is_active) anomaly_codes.push('STALE_LOCAL_ACTIVE_FLAG');
  }
  if (lifecycle.classification === 'NO_PROVIDER_REFERENCE') anomaly_codes.push('NO_PROVIDER_SUBSCRIPTION_ID');
  if (product.classification === 'UNRESOLVED') anomaly_codes.push('PRODUCT_IDENTITY_UNRESOLVED');
  if (product.classification === 'AMOUNT_INFERRED') anomaly_codes.push('PRODUCT_INFERRED_FROM_AMOUNT');
  if (product.classification === 'LEGACY_RESOLVED') anomaly_codes.push('PRODUCT_FROM_LEGACY_DATA');

  let recommended_action = 'NONE';
  if (lifecycle.classification === 'PROVIDER_EXPIRED' && local_is_active) {
    recommended_action = 'CORRECT_STALE_LOCAL_STATUS';
  } else if (lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING') {
    recommended_action = 'INVESTIGATE_ORPHAN_CONTRACT';
  } else if (lifecycle.classification === 'NO_PROVIDER_REFERENCE') {
    recommended_action = 'ATTEMPT_PROVIDER_RECOVERY';
  } else if (product.classification === 'AMOUNT_INFERRED') {
    recommended_action = 'ENRICH_PRODUCT_FROM_PROVIDER';
  } else if (product.classification === 'UNRESOLVED') {
    recommended_action = 'MANUAL_PRODUCT_RESOLUTION';
  }

  const repair_needed =
    (lifecycle.classification === 'PROVIDER_EXPIRED' || lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING') &&
    local_is_active;

  const repair_fields = {};
  if (repair_needed) {
    if (lifecycle.provider_status) repair_fields.status = lifecycle.provider_status;
    repair_fields.is_active = false;
    repair_fields.reconciliation_status = lifecycle.classification.toLowerCase();
    repair_fields.provider_verified_at = new Date().toISOString();
    repair_fields.normalized_at = new Date().toISOString();
  }

  return {
    contract_id,
    user_id,
    user_email,
    provider,
    provider_customer_id,
    provider_subscription_id,
    internal_subscription_id,
    local_is_active,
    local_status,
    provider_status: lifecycle.provider_status,
    provider_cancel_at_period_end: lifecycle.provider_cancel_at_period_end,
    provider_canceled_at: lifecycle.provider_canceled_at,
    period_end,
    provider_period_end: lifecycle.provider_period_end,
    lifecycle_classification: lifecycle.classification,
    lifecycle_source: lifecycle.source,
    product_identity_classification: product.classification,
    product_resolution_source: product.resolution_source,
    resolved_product: product.resolved_product,
    resolved_modules: product.resolved_modules,
    resolved_price_id: product.resolved_price_id,
    resolved_product_id: product.resolved_product_id,
    resolved_plan_key: product.resolved_plan_key,
    confidence: product.confidence,
    current_paying_eligible,
    anomaly_codes,
    recommended_action,
    repair_needed,
    repair_fields,
  };
}

// ── Scope category classification ───────────────────────────────────────────

export function classifyScopeCategory(result) {
  if (result.resolved_modules.length === 0 || result.resolved_product === 'unknown') {
    return 'unresolved';
  }
  if (result.resolved_modules.length > 1) return 'multi_module_bundle';
  const mod = result.resolved_modules[0];
  if (mod === 'pipekeeper') return 'pipekeeper';
  if (mod === 'cigarkeeper') return 'cigarkeeper';
  if (mod === 'whiskeykeeper') return 'whiskeykeeper';
  if (mod === 'winekeeper') return 'winekeeper';
  return 'unresolved';
}

// ── Invariants ───────────────────────────────────────────────────────────────

export function checkInvariantsV2(results) {
  const invariants = [];

  const subIdMap = {};
  for (const r of results) {
    if (r.provider_subscription_id) {
      if (!subIdMap[r.provider_subscription_id]) subIdMap[r.provider_subscription_id] = [];
      subIdMap[r.provider_subscription_id].push(r);
    }
  }
  for (const [subId, rs] of Object.entries(subIdMap)) {
    if (rs.length > 1) {
      for (const r of rs) {
        invariants.push({
          level: 'critical',
          code: 'DUPLICATE_PROVIDER_SUBSCRIPTION_REFERENCE',
          contract_id: r.contract_id,
          message: `Multiple ActiveContracts reference the same provider subscription ${subId}`,
        });
      }
    }
  }

  for (const r of results) {
    if (r.lifecycle_classification === 'PROVIDER_EXPIRED' && r.local_is_active) {
      invariants.push({
        level: 'critical',
        code: 'STALE_LOCAL_ACTIVE_FLAG',
        contract_id: r.contract_id,
        message: `Provider says ${r.provider_status} but local is_active=true`,
      });
    }
    if (r.lifecycle_classification === 'NO_PROVIDER_REFERENCE') {
      invariants.push({
        level: 'critical',
        code: 'NO_PROVIDER_SUBSCRIPTION_ID',
        contract_id: r.contract_id,
        message: 'Stripe contract has no provider_subscription_id',
      });
    }
    if (r.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING') {
      invariants.push({
        level: 'critical',
        code: 'STRIPE_SUBSCRIPTION_NOT_FOUND',
        contract_id: r.contract_id,
        message: `Stripe subscription ${r.provider_subscription_id} not found`,
      });
    }
    if (r.lifecycle_classification === 'APPLE_PROVISIONAL') {
      invariants.push({
        level: 'warning',
        code: 'APPLE_PROVISIONAL',
        contract_id: r.contract_id,
        message: 'Apple contract provisional — awaiting App Store Server API',
      });
    }
    if (r.product_identity_classification === 'AMOUNT_INFERRED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_INFERRED_FROM_AMOUNT',
        contract_id: r.contract_id,
        message: 'Product identity inferred from amount + interval (not provider resolved)',
      });
    }
    if (r.product_identity_classification === 'LEGACY_RESOLVED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_FROM_LEGACY_DATA',
        contract_id: r.contract_id,
        message: 'Product identity from local/legacy data (not provider resolved)',
      });
    }
    if (r.product_identity_classification === 'UNRESOLVED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_IDENTITY_UNRESOLVED',
        contract_id: r.contract_id,
        message: 'Product identity could not be resolved',
      });
    }
    if (r.lifecycle_classification === 'PROVIDER_LOOKUP_FAILED') {
      invariants.push({
        level: 'warning',
        code: 'PROVIDER_LOOKUP_FAILED',
        contract_id: r.contract_id,
        message: 'Temporary provider lookup failure',
      });
    }
  }

  return invariants;
}

// ── Multi-contract user classification ───────────────────────────────────────

function checkPeriodOverlap(contracts) {
  const periods = contracts
    .filter((c) => c.provider_period_end || c.period_end)
    .map((c) => {
      const end = c.provider_period_end || c.period_end;
      const start = c.period_start || null;
      return { start, end };
    });
  if (periods.length < 2) return false;
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i];
      const b = periods[j];
      const aEnd = a.end ? new Date(a.end).getTime() : Infinity;
      const aStart = a.start ? new Date(a.start).getTime() : 0;
      const bEnd = b.end ? new Date(b.end).getTime() : Infinity;
      const bStart = b.start ? new Date(b.start).getTime() : 0;
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

export function classifyMultiContractUser(user_id, contracts) {
  const contract_ids = contracts.map((c) => c.contract_id);
  const provider_subscription_ids = contracts.map((c) => c.provider_subscription_id);
  const lifecycle_classifications = contracts.map((c) => c.lifecycle_classification);
  const product_identity_classifications = contracts.map((c) => c.product_identity_classification);
  const all_modules = new Set();
  for (const c of contracts) {
    for (const m of c.resolved_modules) all_modules.add(m);
  }
  const resolved_modules = Array.from(all_modules).sort();

  const moduleToContracts = {};
  for (const c of contracts) {
    for (const m of c.resolved_modules) {
      if (!moduleToContracts[m]) moduleToContracts[m] = [];
      moduleToContracts[m].push(c);
    }
  }
  const scopes_overlap = Object.values(moduleToContracts).some((cs) => cs.length > 1);
  const periods_overlap = checkPeriodOverlap(contracts);
  const current_paying = contracts.filter((c) => c.current_paying_eligible);
  const all_current_paying = current_paying.length === contracts.length && contracts.length > 0;

  let classification = 'UNRESOLVED';
  if (contracts.length === 1) {
    classification = 'SINGLE_CONTRACT';
  } else if (!scopes_overlap && all_modules.size > 1) {
    classification = 'LEGITIMATE_MULTI_MODULE';
  } else if (current_paying.length === 1 && contracts.length > 1) {
    classification = 'LEGITIMATE_HISTORY';
  } else if (scopes_overlap && periods_overlap && all_current_paying) {
    classification = 'CONFIRMED_DUPLICATE_BILLING';
  } else if (scopes_overlap && periods_overlap) {
    classification = 'POTENTIAL_DUPLICATE';
  } else if (scopes_overlap && !periods_overlap) {
    classification = 'SAME_SCOPE_NONOVERLAPPING';
  } else if (
    contracts.some(
      (c) =>
        c.lifecycle_classification === 'PROVIDER_EXPIRED' ||
        c.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING',
    )
  ) {
    classification = 'STALE_DUPLICATE_RECORD';
  }

  return {
    user_id,
    user_email: contracts[0]?.user_email || '',
    contract_count: contracts.length,
    contract_ids,
    provider_subscription_ids,
    lifecycle_classifications,
    product_identity_classifications,
    resolved_modules,
    scopes_overlap,
    periods_overlap,
    all_current_paying,
    classification,
  };
}

// ── Paying population computation ───────────────────────────────────────────

export function computePayingPopulation(results) {
  const byUser = {};
  for (const r of results) {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  }

  const providerVerifiedPaying = new Set();
  const appleProvisional = new Set();
  const recognizedPaying = new Set();
  const locallyActiveNotProviderCurrent = new Set();
  const usersWithOnlyStaleLocal = new Set();
  const usersWithProviderMissing = new Set();
  const usersWithOnlyExpired = new Set();

  for (const [userId, contracts] of Object.entries(byUser)) {
    const hasProviderVerified = contracts.some(
      (c) =>
        c.lifecycle_classification === 'PROVIDER_ACTIVE' ||
        c.lifecycle_classification === 'PROVIDER_TRIALING' ||
        c.lifecycle_classification === 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
    );
    const hasAppleProvisional = contracts.some((c) => c.lifecycle_classification === 'APPLE_PROVISIONAL');
    const hasProviderMissing = contracts.some((c) => c.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING');
    const hasOnlyExpired = contracts.every((c) => c.lifecycle_classification === 'PROVIDER_EXPIRED');
    const hasStaleLocal = contracts.some(
      (c) => c.lifecycle_classification === 'PROVIDER_EXPIRED' && c.local_is_active,
    );

    if (hasProviderVerified) {
      providerVerifiedPaying.add(userId);
      recognizedPaying.add(userId);
    } else if (hasAppleProvisional) {
      appleProvisional.add(userId);
      recognizedPaying.add(userId);
    } else {
      locallyActiveNotProviderCurrent.add(userId);
    }

    if (hasProviderMissing) usersWithProviderMissing.add(userId);
    if (hasOnlyExpired) usersWithOnlyExpired.add(userId);
    if (hasStaleLocal) usersWithOnlyStaleLocal.add(userId);
  }

  return {
    provider_verified_current_paying: providerVerifiedPaying.size,
    apple_provisional_current_paying: appleProvisional.size,
    recognized_current_paying: recognizedPaying.size,
    locally_active_not_provider_current: locallyActiveNotProviderCurrent.size,
    users_with_only_stale_local: usersWithOnlyStaleLocal.size,
    users_with_provider_missing: usersWithProviderMissing.size,
    users_with_only_expired: usersWithOnlyExpired.size,
    total_locally_active_looking_users: Object.keys(byUser).length,
  };
}