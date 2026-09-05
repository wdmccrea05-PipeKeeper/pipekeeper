/**
 * Canonical Billing Lifecycle Reconciler (v2)
 *
 * Separates two independent classifications per contract:
 *
 * A. Billing Lifecycle Classification (is this contract current and billable
 *    according to the provider?)
 *    PROVIDER_ACTIVE | PROVIDER_TRIALING | PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE
 *    | PROVIDER_EXPIRED | PROVIDER_SUBSCRIPTION_MISSING | PROVIDER_LOOKUP_FAILED
 *    | APPLE_PROVISIONAL | NO_PROVIDER_REFERENCE | MANUAL_REVIEW
 *
 * B. Product Identity Classification (do we know which CK product/module?)
 *    PROVIDER_RESOLVED | LEGACY_RESOLVED | AMOUNT_INFERRED | UNRESOLVED
 *
 * These are NEVER merged. A contract may be:
 *   Lifecycle: PROVIDER_ACTIVE  (Stripe says subscription is current)
 *   Product:   AMOUNT_INFERRED  (product known only from amount, not provider)
 *
 * Resolution priority for product identity:
 *   1. Live Stripe subscription → price → product  (PROVIDER_RESOLVED)
 *   2. Apple product ID                           (PROVIDER_RESOLVED)
 *   3. Local price_id / plan_key / modules / legacy (LEGACY_RESOLVED)
 *   4. Amount + interval                          (AMOUNT_INFERRED)
 *   5. UNRESOLVED
 */

import {
  PLAN_CATALOG,
  LEGACY_AMOUNT_MAP,
  normalizeModule,
} from './productScopeResolver.ts';

// ── Types ───────────────────────────────────────────────────────────────────

export type LifecycleClassification =
  | 'PROVIDER_ACTIVE'
  | 'PROVIDER_TRIALING'
  | 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'
  | 'PROVIDER_EXPIRED'
  | 'PROVIDER_SUBSCRIPTION_MISSING'
  | 'PROVIDER_LOOKUP_FAILED'
  | 'APPLE_PROVISIONAL'
  | 'NO_PROVIDER_REFERENCE'
  | 'MANUAL_REVIEW';

export type ProductIdentityClassification =
  | 'PROVIDER_RESOLVED'
  | 'LEGACY_RESOLVED'
  | 'AMOUNT_INFERRED'
  | 'UNRESOLVED';

export type LifecycleSource =
  | 'live_stripe_subscription'
  | 'apple_provisional'
  | 'local_only'
  | 'no_provider_reference';

export interface ActiveContractLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider: string;
  provider_subscription_id?: string;
  provider_customer_id?: string;
  status?: string;
  is_active?: boolean;
  product?: string;
  product_source?: string;
  modules?: string[];
  bundle_name?: string;
  billing_interval?: string;
  amount_cents?: number;
  currency?: string;
  period_start?: string;
  period_end?: string;
  resolved_price_id?: string;
  resolved_product_id?: string;
  resolved_plan_key?: string;
  plan_key?: string;
  primary_module?: string;
  product_kind?: string;
  checkout_type?: string;
  source_subscription_id?: string;
}

export interface SubscriptionLike {
  id: string;
  user_id?: string;
  user_email?: string;
  provider?: string;
  provider_subscription_id?: string;
  stripe_subscription_id?: string;
  product_id?: string;
  plan_key?: string;
  modules_csv?: string;
  module_count?: number;
  product_kind?: string;
  checkout_type?: string;
  primary_module?: string;
  billing_interval?: string;
  amount?: number;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
}

export interface ProviderTruth {
  stripe_subscription?: any | null;
  stripe_lookup_error?: string | null;
  stripe_not_found?: boolean;
}

export interface ReconcileContractV2Input {
  contract: ActiveContractLike;
  legacy_subscription?: SubscriptionLike | null;
  provider_truth?: ProviderTruth | null;
  price_id_map?: Record<string, string>;
}

export interface ContractReconciliationV2 {
  contract_id: string;
  user_id: string;
  user_email: string;
  provider: string;
  provider_customer_id: string;
  provider_subscription_id: string;
  internal_subscription_id: string | null;

  // Local state
  local_is_active: boolean;
  local_status: string;

  // Provider state
  provider_status: string | null;
  provider_cancel_at_period_end: boolean | null;
  provider_canceled_at: string | null;
  period_end: string | null;
  provider_period_end: string | null;

  // Two independent classifications
  lifecycle_classification: LifecycleClassification;
  lifecycle_source: LifecycleSource;
  product_identity_classification: ProductIdentityClassification;
  product_resolution_source: string;

  // Resolved product details
  resolved_product: string;
  resolved_modules: string[];
  resolved_price_id: string | null;
  resolved_product_id: string | null;
  resolved_plan_key: string | null;
  confidence: 'high' | 'medium' | 'low' | 'unresolved';

  // Paying eligibility
  current_paying_eligible: boolean;

  // Anomaly codes + recommended action
  anomaly_codes: string[];
  recommended_action: string;

  // Repair fields (stale local status correction only)
  repair_needed: boolean;
  repair_fields: Record<string, any>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeInterval(interval: string | null | undefined): string {
  const raw = String(interval || '').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'annual' || raw === 'yearly' || raw === 'year') return 'annual';
  return 'unknown';
}

function parseModulesCsv(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => normalizeModule(s.trim()))
    .filter((m) => m && m !== 'unknown' && m !== 'bundle');
}

function isPeriodEndInFuture(periodEndEpoch: number | null): boolean {
  if (!periodEndEpoch) return false;
  return periodEndEpoch * 1000 > Date.now();
}

// ── Lifecycle classification ─────────────────────────────────────────────────

export interface LifecycleResult {
  classification: LifecycleClassification;
  source: LifecycleSource;
  provider_status: string | null;
  provider_cancel_at_period_end: boolean | null;
  provider_canceled_at: string | null;
  provider_period_end: string | null;
}

export function classifyBillingLifecycle(
  contract: ActiveContractLike,
  provider_truth: ProviderTruth | null,
): LifecycleResult {
  const provider = contract.provider;

  // ── Stripe ──
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
      const status: string = sub.status || 'unknown';
      const cancelAtPeriodEnd: boolean = sub.cancel_at_period_end === true;
      const canceledAt: string | null = sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null;
      const periodEndEpoch: number | null = sub.current_period_end || null;
      const providerPeriodEnd: string | null = periodEndEpoch
        ? new Date(periodEndEpoch * 1000).toISOString()
        : null;

      const base = {
        source: 'live_stripe_subscription' as LifecycleSource,
        provider_status: status,
        provider_cancel_at_period_end: cancelAtPeriodEnd,
        provider_canceled_at: canceledAt,
        provider_period_end: providerPeriodEnd,
      };

      // Active and will renew
      if (status === 'active' && !cancelAtPeriodEnd) {
        return { classification: 'PROVIDER_ACTIVE', ...base };
      }

      // Active but canceled at period end — still entitled until period_end
      if (status === 'active' && cancelAtPeriodEnd) {
        return {
          classification: 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
          ...base,
        };
      }

      // Trialing
      if (status === 'trialing') {
        return { classification: 'PROVIDER_TRIALING', ...base };
      }

      // Past due — still active during dunning, but flag
      if (status === 'past_due') {
        return { classification: 'PROVIDER_ACTIVE', ...base };
      }

      // Canceled — check if still in period
      if (status === 'canceled') {
        if (isPeriodEndInFuture(periodEndEpoch)) {
          return {
            classification: 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
            ...base,
          };
        }
        return { classification: 'PROVIDER_EXPIRED', ...base };
      }

      // Unpaid, incomplete, incomplete_expired, paused
      if (['unpaid', 'incomplete', 'incomplete_expired'].includes(status)) {
        return { classification: 'PROVIDER_EXPIRED', ...base };
      }

      // Unknown status
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

    // Has subscription ID but no provider truth (verify_stripe=false)
    return {
      classification: 'MANUAL_REVIEW',
      source: 'local_only',
      provider_status: null,
      provider_cancel_at_period_end: null,
      provider_canceled_at: null,
      provider_period_end: null,
    };
  }

  // ── Apple ──
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

  // ── Manual / unknown ──
  return {
    classification: 'MANUAL_REVIEW',
    source: 'local_only',
    provider_status: null,
    provider_cancel_at_period_end: null,
    provider_canceled_at: null,
    provider_period_end: null,
  };
}

// ── Product identity classification ─────────────────────────────────────────

export interface ProductIdentityResult {
  classification: ProductIdentityClassification;
  resolution_source: string;
  resolved_product: string;
  resolved_modules: string[];
  resolved_price_id: string | null;
  resolved_product_id: string | null;
  resolved_plan_key: string | null;
  confidence: 'high' | 'medium' | 'low' | 'unresolved';
}

export function classifyProductIdentity(
  contract: ActiveContractLike,
  legacy_subscription: SubscriptionLike | null,
  provider_truth: ProviderTruth | null,
  price_id_map: Record<string, string> | undefined,
): ProductIdentityResult {
  const empty: ProductIdentityResult = {
    classification: 'UNRESOLVED',
    resolution_source: 'unresolved',
    resolved_product: 'unknown',
    resolved_modules: [],
    resolved_price_id: null,
    resolved_product_id: null,
    resolved_plan_key: null,
    confidence: 'unresolved',
  };

  // ════════════════════════════════════════════════════════════════════════
  // 1. PROVIDER TRUTH — Live Stripe subscription → price → product
  // ════════════════════════════════════════════════════════════════════════
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

      // Try price_id_map
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

      // Try Stripe product metadata
      const productObj =
        typeof firstItem.price.product === 'object'
          ? firstItem.price.product
          : null;
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
          const mods = meta.modules
            .split(',')
            .map(normalizeModule)
            .filter((m) => m && m !== 'unknown');
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

  // ════════════════════════════════════════════════════════════════════════
  // 2. APPLE product ID
  // ════════════════════════════════════════════════════════════════════════
  if (contract.provider === 'apple') {
    const appleProductId =
      contract.resolved_product_id ||
      legacy_subscription?.product_id ||
      null;

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
      // Have product ID but can't map — still unresolved
      return {
        ...empty,
        resolution_source: 'apple_product_id_unmapped',
        resolved_product_id: appleProductId,
      };
    }
    // No Apple product ID
    return {
      ...empty,
      resolution_source: 'no_apple_product_id',
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. LEGACY RESOLUTION — local fields
  // ════════════════════════════════════════════════════════════════════════

  // 3a. Local resolved_price_id (matched against env var map)
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

  // 3b. plan_key from contract
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

  // 3c. modules array
  if (contract.modules && contract.modules.length > 0) {
    const mods = contract.modules
      .map(normalizeModule)
      .filter((m) => m && m !== 'unknown');
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

  // 3d. Legacy subscription fields
  if (legacy_subscription) {
    if (
      legacy_subscription.plan_key &&
      PLAN_CATALOG[legacy_subscription.plan_key]
    ) {
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
        resolved_modules: [
          'pipekeeper',
          'whiskeykeeper',
          'cigarkeeper',
          'winekeeper',
        ],
        resolved_price_id: null,
        resolved_product_id: null,
        resolved_plan_key: null,
        confidence: 'medium',
      };
    }
  }

  // 3e. product_kind / checkout_type from contract
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
      resolved_modules: [
        'pipekeeper',
        'whiskeykeeper',
        'cigarkeeper',
        'winekeeper',
      ],
      resolved_price_id: null,
      resolved_product_id: null,
      resolved_plan_key: null,
      confidence: 'medium',
    };
  }

  // 3f. primary_module from contract
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

  // 3g. Existing product field
  const localProduct = (contract.product || 'unknown').toLowerCase();
  if (localProduct !== 'unknown') {
    const knownProducts = [
      'pipekeeper',
      'whiskeykeeper',
      'cigarkeeper',
      'winekeeper',
      'bundle',
    ];
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

  // ════════════════════════════════════════════════════════════════════════
  // 4. AMOUNT INFERENCE (last resort)
  // ════════════════════════════════════════════════════════════════════════
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
    // Common PipeKeeper patterns
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

  // ════════════════════════════════════════════════════════════════════════
  // 5. UNRESOLVED
  // ════════════════════════════════════════════════════════════════════════
  return empty;
}

// ── Apple product ID → plan mapping ──────────────────────────────────────────

function mapAppleProductIdToPlan(
  appleProductId: string,
  priceIdMap?: Record<string, string>,
): string | null {
  if (!appleProductId) return null;
  if (priceIdMap && priceIdMap[appleProductId]) {
    return priceIdMap[appleProductId];
  }
  if (PLAN_CATALOG[appleProductId]) return appleProductId;
  const lower = appleProductId.toLowerCase();
  if (lower.includes('pipekeeper') && lower.includes('annual'))
    return 'pipekeeper_pro_annual';
  if (lower.includes('pipekeeper') && lower.includes('month'))
    return 'pipekeeper_pro_monthly';
  if (lower.includes('whiskeykeeper') && lower.includes('annual'))
    return 'whiskeykeeper_pro_annual';
  if (lower.includes('whiskeykeeper') && lower.includes('month'))
    return 'whiskeykeeper_pro_monthly';
  if (lower.includes('cigarkeeper') && lower.includes('annual'))
    return 'cigarkeeper_pro_annual';
  if (lower.includes('cigarkeeper') && lower.includes('month'))
    return 'cigarkeeper_pro_monthly';
  if (lower.includes('winekeeper') && lower.includes('annual'))
    return 'winekeeper_pro_annual';
  if (lower.includes('winekeeper') && lower.includes('month'))
    return 'winekeeper_pro_monthly';
  if (lower.includes('founders') && lower.includes('annual'))
    return 'founders_bundle_annual';
  if (lower.includes('founders') && lower.includes('month'))
    return 'founders_bundle_monthly';
  if (lower.includes('four') && lower.includes('annual'))
    return 'four_module_bundle_annual';
  if (lower.includes('four') && lower.includes('month'))
    return 'four_module_bundle_monthly';
  if (lower.includes('three') && lower.includes('annual'))
    return 'three_module_bundle_annual';
  if (lower.includes('three') && lower.includes('month'))
    return 'three_module_bundle_monthly';
  return null;
}

// ── Full contract reconciliation ─────────────────────────────────────────────

export function reconcileContractV2(
  input: ReconcileContractV2Input,
): ContractReconciliationV2 {
  const { contract, legacy_subscription, provider_truth, price_id_map } =
    input;

  const contract_id = contract.id;
  const user_id = contract.user_id || '';
  const user_email = contract.user_email || '';
  const provider = contract.provider;
  const provider_subscription_id = contract.provider_subscription_id || '';
  const provider_customer_id = contract.provider_customer_id || '';
  const internal_subscription_id =
    contract.source_subscription_id || legacy_subscription?.id || null;
  const local_is_active = contract.is_active !== false;
  const local_status = contract.status || 'unknown';
  const period_end = contract.period_end || null;

  // Classify lifecycle
  const lifecycle = classifyBillingLifecycle(contract, provider_truth || null);

  // Classify product identity
  const product = classifyProductIdentity(
    contract,
    legacy_subscription || null,
    provider_truth || null,
    price_id_map,
  );

  // Determine current paying eligibility
  const current_paying_eligible = [
    'PROVIDER_ACTIVE',
    'PROVIDER_TRIALING',
    'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
    'APPLE_PROVISIONAL',
  ].includes(lifecycle.classification);

  // Anomaly codes
  const anomaly_codes: string[] = [];
  if (lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING')
    anomaly_codes.push('STRIPE_SUBSCRIPTION_NOT_FOUND');
  if (lifecycle.classification === 'PROVIDER_EXPIRED')
    anomaly_codes.push('PROVIDER_SAYS_EXPIRED');
  if (
    lifecycle.classification === 'PROVIDER_EXPIRED' ||
    lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING'
  ) {
    if (local_is_active) anomaly_codes.push('STALE_LOCAL_ACTIVE_FLAG');
  }
  if (lifecycle.classification === 'NO_PROVIDER_REFERENCE')
    anomaly_codes.push('NO_PROVIDER_SUBSCRIPTION_ID');
  if (product.classification === 'UNRESOLVED')
    anomaly_codes.push('PRODUCT_IDENTITY_UNRESOLVED');
  if (product.classification === 'AMOUNT_INFERRED')
    anomaly_codes.push('PRODUCT_INFERRED_FROM_AMOUNT');
  if (product.classification === 'LEGACY_RESOLVED')
    anomaly_codes.push('PRODUCT_FROM_LEGACY_DATA');

  // Recommended action
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

  // Repair fields (stale local status correction only)
  const repair_needed =
    (lifecycle.classification === 'PROVIDER_EXPIRED' ||
      lifecycle.classification === 'PROVIDER_SUBSCRIPTION_MISSING') &&
    local_is_active;

  const repair_fields: Record<string, any> = {};
  if (repair_needed) {
    if (lifecycle.provider_status) {
      repair_fields.status = lifecycle.provider_status;
    }
    repair_fields.is_active = false;
    repair_fields.reconciliation_status =
      lifecycle.classification.toLowerCase();
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

export type ScopeCategory =
  | 'pipekeeper'
  | 'whiskeykeeper'
  | 'cigarkeeper'
  | 'winekeeper'
  | 'multi_module_bundle'
  | 'unresolved';

export function classifyScopeCategory(
  result: ContractReconciliationV2,
): ScopeCategory {
  if (
    result.resolved_modules.length === 0 ||
    result.resolved_product === 'unknown'
  ) {
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

// ── Invariants (with correct counting) ─────────────────────────────────────

export interface ReconciliationInvariantV2 {
  level: 'critical' | 'warning';
  code: string;
  contract_id: string;
  message: string;
}

export function checkInvariantsV2(
  results: ContractReconciliationV2[],
): ReconciliationInvariantV2[] {
  const invariants: ReconciliationInvariantV2[] = [];

  // Duplicate provider_subscription_id references
  const subIdMap: Record<string, ContractReconciliationV2[]> = {};
  for (const r of results) {
    if (r.provider_subscription_id) {
      if (!subIdMap[r.provider_subscription_id])
        subIdMap[r.provider_subscription_id] = [];
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
    // Critical: stale local active flag
    if (r.lifecycle_classification === 'PROVIDER_EXPIRED' && r.local_is_active) {
      invariants.push({
        level: 'critical',
        code: 'STALE_LOCAL_ACTIVE_FLAG',
        contract_id: r.contract_id,
        message: `Provider says ${r.provider_status} but local is_active=true`,
      });
    }

    // Critical: Stripe active contract with no subscription ID
    if (r.lifecycle_classification === 'NO_PROVIDER_REFERENCE') {
      invariants.push({
        level: 'critical',
        code: 'NO_PROVIDER_SUBSCRIPTION_ID',
        contract_id: r.contract_id,
        message: 'Stripe contract has no provider_subscription_id',
      });
    }

    // Critical: provider subscription missing
    if (r.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING') {
      invariants.push({
        level: 'critical',
        code: 'STRIPE_SUBSCRIPTION_NOT_FOUND',
        contract_id: r.contract_id,
        message: `Stripe subscription ${r.provider_subscription_id} not found`,
      });
    }

    // Warning: Apple provisional
    if (r.lifecycle_classification === 'APPLE_PROVISIONAL') {
      invariants.push({
        level: 'warning',
        code: 'APPLE_PROVISIONAL',
        contract_id: r.contract_id,
        message: 'Apple contract provisional — awaiting App Store Server API',
      });
    }

    // Warning: product inferred from amount
    if (r.product_identity_classification === 'AMOUNT_INFERRED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_INFERRED_FROM_AMOUNT',
        contract_id: r.contract_id,
        message:
          'Product identity inferred from amount + interval (not provider resolved)',
      });
    }

    // Warning: product from legacy data
    if (r.product_identity_classification === 'LEGACY_RESOLVED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_FROM_LEGACY_DATA',
        contract_id: r.contract_id,
        message: 'Product identity from local/legacy data (not provider resolved)',
      });
    }

    // Warning: product unresolved
    if (r.product_identity_classification === 'UNRESOLVED') {
      invariants.push({
        level: 'warning',
        code: 'PRODUCT_IDENTITY_UNRESOLVED',
        contract_id: r.contract_id,
        message: 'Product identity could not be resolved',
      });
    }

    // Warning: provider lookup failed
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

export type MultiContractClassification =
  | 'SINGLE_CONTRACT'
  | 'LEGITIMATE_MULTI_MODULE'
  | 'LEGITIMATE_HISTORY'
  | 'SAME_SCOPE_NONOVERLAPPING'
  | 'POTENTIAL_DUPLICATE'
  | 'CONFIRMED_DUPLICATE_BILLING'
  | 'STALE_DUPLICATE_RECORD'
  | 'UNRESOLVED';

export interface MultiContractUserAnalysis {
  user_id: string;
  user_email: string;
  contract_count: number;
  contract_ids: string[];
  provider_subscription_ids: string[];
  lifecycle_classifications: string[];
  product_identity_classifications: string[];
  resolved_modules: string[];
  scopes_overlap: boolean;
  periods_overlap: boolean;
  all_current_paying: boolean;
  classification: MultiContractClassification;
}

export function classifyMultiContractUser(
  user_id: string,
  contracts: ContractReconciliationV2[],
): MultiContractUserAnalysis {
  const contract_ids = contracts.map((c) => c.contract_id);
  const provider_subscription_ids = contracts.map(
    (c) => c.provider_subscription_id,
  );
  const lifecycle_classifications = contracts.map(
    (c) => c.lifecycle_classification,
  );
  const product_identity_classifications = contracts.map(
    (c) => c.product_identity_classification,
  );
  const all_modules = new Set<string>();
  for (const c of contracts) {
    for (const m of c.resolved_modules) all_modules.add(m);
  }
  const resolved_modules = Array.from(all_modules).sort();

  // Check scope overlap (same module across contracts)
  const moduleToContracts: Record<string, ContractReconciliationV2[]> = {};
  for (const c of contracts) {
    for (const m of c.resolved_modules) {
      if (!moduleToContracts[m]) moduleToContracts[m] = [];
      moduleToContracts[m].push(c);
    }
  }
  const scopes_overlap = Object.values(moduleToContracts).some(
    (cs) => cs.length > 1,
  );

  // Check period overlap
  const periods_overlap = checkPeriodOverlap(contracts);

  // Check if all contracts are current paying eligible
  const current_paying = contracts.filter((c) => c.current_paying_eligible);
  const all_current_paying =
    current_paying.length === contracts.length && contracts.length > 0;

  // Classify
  let classification: MultiContractClassification = 'UNRESOLVED';

  if (contracts.length === 1) {
    classification = 'SINGLE_CONTRACT';
  } else if (!scopes_overlap && all_modules.size > 1) {
    // Different modules across contracts — legitimate multi-module
    classification = 'LEGITIMATE_MULTI_MODULE';
  } else if (current_paying.length === 1 && contracts.length > 1) {
    // Only one current paying, others historical
    classification = 'LEGITIMATE_HISTORY';
  } else if (scopes_overlap && periods_overlap && all_current_paying) {
    // Same scope, overlapping periods, all current paying
    classification = 'CONFIRMED_DUPLICATE_BILLING';
  } else if (scopes_overlap && periods_overlap) {
    // Same scope, overlapping periods, but not all current
    classification = 'POTENTIAL_DUPLICATE';
  } else if (scopes_overlap && !periods_overlap) {
    // Same scope, non-overlapping periods (historical sequence)
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

function checkPeriodOverlap(
  contracts: ContractReconciliationV2[],
): boolean {
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

// ── Paying population computation ───────────────────────────────────────────

export interface PayingPopulationReport {
  provider_verified_current_paying: number;
  apple_provisional_current_paying: number;
  recognized_current_paying: number;
  locally_active_not_provider_current: number;
  users_with_only_stale_local: number;
  users_with_provider_missing: number;
  users_with_only_expired: number;
  total_locally_active_looking_users: number;
}

export function computePayingPopulation(
  results: ContractReconciliationV2[],
): PayingPopulationReport {
  const byUser: Record<string, ContractReconciliationV2[]> = {};
  for (const r of results) {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  }

  const providerVerifiedPaying = new Set<string>();
  const appleProvisional = new Set<string>();
  const recognizedPaying = new Set<string>();
  const locallyActiveNotProviderCurrent = new Set<string>();
  const usersWithOnlyStaleLocal = new Set<string>();
  const usersWithProviderMissing = new Set<string>();
  const usersWithOnlyExpired = new Set<string>();

  for (const [userId, contracts] of Object.entries(byUser)) {
    const hasProviderVerified = contracts.some(
      (c) =>
        c.lifecycle_classification === 'PROVIDER_ACTIVE' ||
        c.lifecycle_classification === 'PROVIDER_TRIALING' ||
        c.lifecycle_classification ===
          'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE',
    );
    const hasAppleProvisional = contracts.some(
      (c) => c.lifecycle_classification === 'APPLE_PROVISIONAL',
    );
    const hasProviderMissing = contracts.some(
      (c) =>
        c.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING',
    );
    const hasOnlyExpired = contracts.every(
      (c) => c.lifecycle_classification === 'PROVIDER_EXPIRED',
    );
    const hasStaleLocal = contracts.some(
      (c) =>
        c.lifecycle_classification === 'PROVIDER_EXPIRED' &&
        c.local_is_active,
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
    locally_active_not_provider_current:
      locallyActiveNotProviderCurrent.size,
    users_with_only_stale_local: usersWithOnlyStaleLocal.size,
    users_with_provider_missing: usersWithProviderMissing.size,
    users_with_only_expired: usersWithOnlyExpired.size,
    total_locally_active_looking_users: Object.keys(byUser).length,
  };
}