/**
 * Stripe Product Identity Resolver
 *
 * Implements the FULL provider chain for product identity recovery:
 *
 *   Stripe Subscription → Subscription Item → Price → Product
 *                      → CollectionKeeper Plan → Module Scope
 *
 * Resolution priority (highest confidence first):
 *   1.  Persisted registry (by product_id)                → PROVIDER_RESOLVED  [AUTHORITATIVE KEY]
 *   2.  Persisted registry (by price_id)                  → PROVIDER_RESOLVED
 *   3.  Stripe Product metadata (plan_key or modules)     → PROVIDER_RESOLVED
 *   4.  Stripe Price metadata (plan_key or modules)       → PROVIDER_RESOLVED
 *   5.  Stripe Product name (keyword matching)            → PROVIDER_RESOLVED  [DISCOVERY ONLY]
 *   6.  Stripe Price nickname (keyword matching)          → PROVIDER_RESOLVED  [DISCOVERY ONLY]
 *   7.  Current env-var price_id_map                       → PROVIDER_RESOLVED
 *   8.  Apple product ID                                    → PROVIDER_RESOLVED
 *   9.  Legacy local fields (plan_key, modules, etc.)     → LEGACY_RESOLVED
 *   10. Amount + interval                                   → AMOUNT_INFERRED (low)
 *   11. UNRESOLVED
 *
 * Product ID is the durable authoritative key. Once a Product ID has been
 * mapped to a canonical plan, the resolver uses that mapping directly and
 * does NOT depend on name keyword parsing on subsequent runs. Name parsing
 * is used only to discover previously unmapped products.
 *
 * A legacy Stripe Price absent from current environment variables is NOT
 * a reason to fall back to dollar amount. The resolver queries the Stripe
 * Product name, Price nickname, Product metadata, Price metadata, and the
 * persisted registry before falling through.
 *
 * Amount inference is ALWAYS the last resort and is NEVER marked PROVIDER_RESOLVED.
 */

import {
  PLAN_CATALOG,
  LEGACY_AMOUNT_MAP,
  normalizeModule,
} from './productScopeResolver.ts';

// ── Types ───────────────────────────────────────────────────────────────────

export type ProductIdentityClassification =
  | 'PROVIDER_RESOLVED'
  | 'LEGACY_RESOLVED'
  | 'AMOUNT_INFERRED'
  | 'UNRESOLVED';

export interface RegistryEntryLike {
  provider: string;
  price_id: string;
  product_id?: string;
  product_name?: string;
  price_nickname?: string;
  canonical_plan_key: string;
  canonical_product: string;
  canonical_modules: string[];
  billing_interval?: string;
  amount_cents?: number;
  currency?: string;
  stripe_price_active?: boolean;
  is_historical?: boolean;
  mapping_source: string;
  confidence: string;
  first_seen?: string;
  last_verified?: string;
}

export interface ActiveContractLike {
  id: string;
  provider: string;
  provider_subscription_id?: string;
  product?: string;
  product_source?: string;
  modules?: string[];
  billing_interval?: string;
  amount_cents?: number;
  resolved_price_id?: string;
  resolved_product_id?: string;
  resolved_plan_key?: string;
  plan_key?: string;
  primary_module?: string;
  product_kind?: string;
  checkout_type?: string;
}

export interface SubscriptionLike {
  id: string;
  provider?: string;
  provider_subscription_id?: string;
  product_id?: string;
  plan_key?: string;
  modules_csv?: string;
  primary_module?: string;
  product_kind?: string;
  checkout_type?: string;
  billing_interval?: string;
  amount?: number;
}

export interface ProviderTruthLike {
  stripe_subscription?: any | null;
  stripe_lookup_error?: string | null;
  stripe_not_found?: boolean;
}

export interface ResolverInput {
  contract: ActiveContractLike;
  legacy_subscription?: SubscriptionLike | null;
  provider_truth?: ProviderTruthLike | null;
  price_id_map?: Record<string, string>;
  registry?: RegistryEntryLike[];
}

export interface ResolverResult {
  classification: ProductIdentityClassification;
  resolution_source: string;
  resolved_product: string;
  resolved_modules: string[];
  resolved_price_id: string | null;
  resolved_product_id: string | null;
  resolved_plan_key: string | null;
  confidence: 'high' | 'medium' | 'low' | 'unresolved';
  provider_chain_attempted: boolean;
  provider_chain_resolved: boolean;
  mismatch_detected: boolean;
  mismatch_detail: string | null;
  registry_entry_to_persist?: Partial<RegistryEntryLike>;
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

// ── Keyword-based product name → plan key mapping ───────────────────────────

/**
 * Maps a Stripe Product name or Price nickname to a canonical plan key
 * using keyword matching. Returns null if no confident mapping is possible.
 *
 * Examples:
 *   "PipeKeeper Pro - Annual" → pipekeeper_pro_annual
 *   "WhiskeyKeeper Pro Monthly" → whiskeykeeper_pro_monthly
 *   "Founders Bundle - Annual" → founders_bundle_annual
 *   "3-Module Bundle - Monthly" → three_module_bundle_monthly
 *   "4-Module Bundle - Annual" → four_module_bundle_annual
 */
export function mapProductNameToPlan(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();

  // Detect interval
  const isAnnual =
    lower.includes('annual') ||
    lower.includes('yearly') ||
    lower.includes('year');
  const isMonthly =
    lower.includes('monthly') || lower.includes('month') || (!isAnnual && !lower.includes('year'));

  const interval = isAnnual ? 'annual' : 'monthly';

  // Detect module / bundle type
  if (lower.includes('4-module') || lower.includes('four module') || lower.includes('4 module') || lower.includes('all-module') || lower.includes('all module')) {
    return interval === 'annual' ? 'four_module_bundle_annual' : 'four_module_bundle_monthly';
  }
  if (lower.includes('3-module') || lower.includes('three module') || lower.includes('3 module')) {
    return interval === 'annual' ? 'three_module_bundle_annual' : 'three_module_bundle_monthly';
  }
  if (lower.includes('founders') || lower.includes('2-module') || lower.includes('two module') || lower.includes('2 module')) {
    return interval === 'annual' ? 'founders_bundle_annual' : 'founders_bundle_monthly';
  }
  if (lower.includes('pipekeeper') || lower.includes('pipe keeper') || lower.includes('pipe-keeper')) {
    return interval === 'annual' ? 'pipekeeper_pro_annual' : 'pipekeeper_pro_monthly';
  }
  if (lower.includes('whiskeykeeper') || lower.includes('whisky') || lower.includes('whiskey keeper') || lower.includes('whiskey-keeper')) {
    return interval === 'annual' ? 'whiskeykeeper_pro_annual' : 'whiskeykeeper_pro_monthly';
  }
  if (lower.includes('cigarkeeper') || lower.includes('cigar keeper') || lower.includes('cigar-keeper')) {
    return interval === 'annual' ? 'cigarkeeper_pro_annual' : 'cigarkeeper_pro_monthly';
  }
  if (lower.includes('winekeeper') || lower.includes('wine keeper') || lower.includes('wine-keeper')) {
    return interval === 'annual' ? 'winekeeper_pro_annual' : 'winekeeper_pro_monthly';
  }

  return null;
}

// ── Extract price/product data from Stripe subscription ─────────────────────

export interface StripeChainData {
  price_id: string | null;
  product_id: string | null;
  product_name: string | null;
  price_nickname: string | null;
  price_metadata: Record<string, string> | null;
  product_metadata: Record<string, string> | null;
  price_active: boolean | null;
  product_active: boolean | null;
  billing_interval: string;
  amount_cents: number | null;
  currency: string | null;
}

export function extractStripeChainData(
  stripeSubscription: any,
): StripeChainData | null {
  if (!stripeSubscription) return null;
  const items = stripeSubscription.items?.data || [];
  const firstItem = items[0];
  if (!firstItem?.price) return null;

  const price = firstItem.price;
  const productRaw = price.product;
  const productObj =
    typeof productRaw === 'object' && productRaw !== null ? productRaw : null;
  const productId =
    typeof productRaw === 'string' ? productRaw : productObj?.id || null;

  return {
    price_id: price.id || null,
    product_id: productId,
    product_name: productObj?.name || null,
    price_nickname: price.nickname || null,
    price_metadata: price.metadata || null,
    product_metadata: productObj?.metadata || null,
    price_active: typeof price.active === 'boolean' ? price.active : null,
    product_active:
      productObj && typeof productObj.active === 'boolean'
        ? productObj.active
        : null,
    billing_interval: normalizeInterval(
      price.recurring?.interval || null,
    ),
    amount_cents:
      typeof price.unit_amount === 'number' ? price.unit_amount : null,
    currency: price.currency || null,
  };
}

// ── Build a registry entry from Stripe chain data ────────────────────────────

export function buildRegistryEntryFromStripe(
  chain: StripeChainData,
  planKey: string,
  mappingSource: string,
  confidence: 'high' | 'medium' | 'low',
): RegistryEntryLike {
  const plan = PLAN_CATALOG[planKey];
  return {
    provider: 'stripe',
    price_id: chain.price_id || '',
    product_id: chain.product_id || '',
    product_name: chain.product_name || '',
    price_nickname: chain.price_nickname || '',
    canonical_plan_key: planKey,
    canonical_product: plan ? plan.product : 'unknown',
    canonical_modules: plan ? plan.modules : [],
    billing_interval: chain.billing_interval,
    amount_cents: chain.amount_cents,
    currency: chain.currency || 'usd',
    stripe_price_active: chain.price_active,
    is_historical: chain.price_active === false,
    mapping_source: mappingSource,
    confidence,
    first_seen: new Date().toISOString(),
    last_verified: new Date().toISOString(),
  };
}

// ── Main resolver ───────────────────────────────────────────────────────────

export function resolveProductIdentityFromStripeChain(
  input: ResolverInput,
): ResolverResult {
  const { contract, legacy_subscription, provider_truth, price_id_map, registry } = input;

  const empty: ResolverResult = {
    classification: 'UNRESOLVED',
    resolution_source: 'unresolved',
    resolved_product: 'unknown',
    resolved_modules: [],
    resolved_price_id: null,
    resolved_product_id: null,
    resolved_plan_key: null,
    confidence: 'unresolved',
    provider_chain_attempted: false,
    provider_chain_resolved: false,
    mismatch_detected: false,
    mismatch_detail: null,
  };

  let provider_chain_attempted = false;
  let provider_chain_resolved = false;

  // ════════════════════════════════════════════════════════════════════════
  // 1. PERSISTED REGISTRY BY PRODUCT_ID (authoritative — Product ID is the
  //    durable key. Once a Product ID is mapped, name parsing is never used.
  //    Uses the contract's resolved_product_id from a prior recovery pass.)
  // ════════════════════════════════════════════════════════════════════════
  if (registry && contract.resolved_product_id) {
    const entry = registry.find(
      (e) => e.provider === 'stripe' && e.product_id === contract.resolved_product_id,
    );
    if (entry && entry.canonical_plan_key && PLAN_CATALOG[entry.canonical_plan_key]) {
      const plan = PLAN_CATALOG[entry.canonical_plan_key];
      provider_chain_resolved = true;
      return {
        ...empty,
        classification: 'PROVIDER_RESOLVED',
        resolution_source: 'persisted_registry_product_id',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_price_id: contract.resolved_price_id || entry.price_id || null,
        resolved_product_id: contract.resolved_product_id,
        resolved_plan_key: entry.canonical_plan_key,
        confidence: 'high',
        provider_chain_attempted: false,
        provider_chain_resolved: true,
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. PERSISTED REGISTRY BY PRICE_ID (from contract's resolved_price_id)
  // ════════════════════════════════════════════════════════════════════════
  if (registry && contract.resolved_price_id) {
    const entry = registry.find(
      (e) => e.provider === 'stripe' && e.price_id === contract.resolved_price_id,
    );
    if (entry && entry.canonical_plan_key && PLAN_CATALOG[entry.canonical_plan_key]) {
      const plan = PLAN_CATALOG[entry.canonical_plan_key];
      provider_chain_resolved = true;
      return {
        ...empty,
        classification: 'PROVIDER_RESOLVED',
        resolution_source: 'persisted_registry_price_id',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_price_id: contract.resolved_price_id,
        resolved_product_id: contract.resolved_product_id || entry.product_id || null,
        resolved_plan_key: entry.canonical_plan_key,
        confidence: 'high',
        provider_chain_attempted: false,
        provider_chain_resolved: true,
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3-7. STRIPE PROVIDER CHAIN (live discovery for unmapped products)
  // ════════════════════════════════════════════════════════════════════════
  if (provider_truth?.stripe_subscription) {
    provider_chain_attempted = true;
    const chain = extractStripeChainData(provider_truth.stripe_subscription);

    if (chain) {
      // 1. Stripe Product metadata — plan_key
      if (chain.product_metadata?.plan_key && PLAN_CATALOG[chain.product_metadata.plan_key]) {
        const plan = PLAN_CATALOG[chain.product_metadata.plan_key];
        provider_chain_resolved = true;
        return {
          ...empty,
          classification: 'PROVIDER_RESOLVED',
          resolution_source: 'stripe_product_metadata',
          resolved_product: plan.product,
          resolved_modules: plan.modules,
          resolved_price_id: chain.price_id,
          resolved_product_id: chain.product_id,
          resolved_plan_key: chain.product_metadata.plan_key,
          confidence: 'high',
          provider_chain_attempted: true,
          provider_chain_resolved: true,
          registry_entry_to_persist: buildRegistryEntryFromStripe(
            chain, chain.product_metadata.plan_key, 'stripe_product_metadata', 'high',
          ),
        };
      }

      // 1b. Stripe Product metadata — modules
      if (chain.product_metadata?.modules) {
        const mods = chain.product_metadata.modules
          .split(',')
          .map(normalizeModule)
          .filter((m) => m && m !== 'unknown');
        if (mods.length > 0) {
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_product_metadata',
            resolved_product: mods.length > 1 ? 'bundle' : mods[0],
            resolved_modules: mods,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: null,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
            registry_entry_to_persist: buildRegistryEntryFromStripe(
              chain, mods.length > 1 ? 'bundle' : mods[0], 'stripe_product_metadata', 'high',
            ),
          };
        }
      }

      // 2. Stripe Price metadata — plan_key
      if (chain.price_metadata?.plan_key && PLAN_CATALOG[chain.price_metadata.plan_key]) {
        const plan = PLAN_CATALOG[chain.price_metadata.plan_key];
        provider_chain_resolved = true;
        return {
          ...empty,
          classification: 'PROVIDER_RESOLVED',
          resolution_source: 'stripe_price_metadata',
          resolved_product: plan.product,
          resolved_modules: plan.modules,
          resolved_price_id: chain.price_id,
          resolved_product_id: chain.product_id,
          resolved_plan_key: chain.price_metadata.plan_key,
          confidence: 'high',
          provider_chain_attempted: true,
          provider_chain_resolved: true,
          registry_entry_to_persist: buildRegistryEntryFromStripe(
            chain, chain.price_metadata.plan_key, 'stripe_price_metadata', 'high',
          ),
        };
      }

      // 2b. Stripe Price metadata — modules
      if (chain.price_metadata?.modules) {
        const mods = chain.price_metadata.modules
          .split(',')
          .map(normalizeModule)
          .filter((m) => m && m !== 'unknown');
        if (mods.length > 0) {
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_price_metadata',
            resolved_product: mods.length > 1 ? 'bundle' : mods[0],
            resolved_modules: mods,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: null,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
            registry_entry_to_persist: buildRegistryEntryFromStripe(
              chain, mods.length > 1 ? 'bundle' : mods[0], 'stripe_price_metadata', 'high',
            ),
          };
        }
      }

      // 3. Stripe Product name (keyword matching)
      if (chain.product_name) {
        const planKey = mapProductNameToPlan(chain.product_name);
        if (planKey && PLAN_CATALOG[planKey]) {
          const plan = PLAN_CATALOG[planKey];
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_product_name',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: planKey,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
            registry_entry_to_persist: buildRegistryEntryFromStripe(
              chain, planKey, 'stripe_product_name', 'high',
            ),
          };
        }
      }

      // 4. Stripe Price nickname (keyword matching)
      if (chain.price_nickname) {
        const planKey = mapProductNameToPlan(chain.price_nickname);
        if (planKey && PLAN_CATALOG[planKey]) {
          const plan = PLAN_CATALOG[planKey];
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_price_nickname',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: planKey,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
            registry_entry_to_persist: buildRegistryEntryFromStripe(
              chain, planKey, 'stripe_price_nickname', 'high',
            ),
          };
        }
      }

      // 5. Persisted registry — by price_id
      if (registry && chain.price_id) {
        const entry = registry.find(
          (e) => e.provider === 'stripe' && e.price_id === chain.price_id,
        );
        if (entry && entry.canonical_plan_key && PLAN_CATALOG[entry.canonical_plan_key]) {
          const plan = PLAN_CATALOG[entry.canonical_plan_key];
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'persisted_registry',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id || entry.product_id,
            resolved_plan_key: entry.canonical_plan_key,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
          };
        }
      }

      // 6. Persisted registry — by product_id
      if (registry && chain.product_id) {
        const entry = registry.find(
          (e) => e.provider === 'stripe' && e.product_id === chain.product_id,
        );
        if (entry && entry.canonical_plan_key && PLAN_CATALOG[entry.canonical_plan_key]) {
          const plan = PLAN_CATALOG[entry.canonical_plan_key];
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'persisted_registry',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: chain.price_id || entry.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: entry.canonical_plan_key,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
          };
        }
      }

      // 7. Current env-var price_id_map
      if (chain.price_id && price_id_map && price_id_map[chain.price_id]) {
        const planKey = price_id_map[chain.price_id];
        const plan = PLAN_CATALOG[planKey];
        if (plan) {
          provider_chain_resolved = true;
          return {
            ...empty,
            classification: 'PROVIDER_RESOLVED',
            resolution_source: 'stripe_price',
            resolved_product: plan.product,
            resolved_modules: plan.modules,
            resolved_price_id: chain.price_id,
            resolved_product_id: chain.product_id,
            resolved_plan_key: planKey,
            confidence: 'high',
            provider_chain_attempted: true,
            provider_chain_resolved: true,
            registry_entry_to_persist: buildRegistryEntryFromStripe(
              chain, planKey, 'env_var_price_map', 'high',
            ),
          };
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 8. APPLE product ID
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
          ...empty,
          classification: 'PROVIDER_RESOLVED',
          resolution_source: 'apple_product_id',
          resolved_product: plan.product,
          resolved_modules: plan.modules,
          resolved_product_id: appleProductId,
          resolved_plan_key: planKey,
          confidence: 'high',
          provider_chain_attempted: false,
          provider_chain_resolved: true,
        };
      }
      return {
        ...empty,
        resolution_source: 'apple_product_id_unmapped',
        resolved_product_id: appleProductId,
      };
    }
    return {
      ...empty,
      resolution_source: 'no_apple_product_id',
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // 9. LEGACY RESOLUTION — local fields (only if provider chain didn't resolve)
  // ════════════════════════════════════════════════════════════════════════

  // 9a. Local resolved_price_id (matched against env var map)
  const localPriceId = contract.resolved_price_id || null;
  if (localPriceId && price_id_map && price_id_map[localPriceId]) {
    const planKey = price_id_map[localPriceId];
    const plan = PLAN_CATALOG[planKey];
    if (plan) {
      return {
        ...empty,
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'price_id_lookup',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_price_id: localPriceId,
        resolved_plan_key: planKey,
        confidence: 'high',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
  }

  // 9b. plan_key from contract
  if (contract.plan_key && PLAN_CATALOG[contract.plan_key]) {
    const plan = PLAN_CATALOG[contract.plan_key];
    return {
      ...empty,
      classification: 'LEGACY_RESOLVED',
      resolution_source: 'plan_key',
      resolved_product: plan.product,
      resolved_modules: plan.modules,
      resolved_plan_key: contract.plan_key,
      confidence: 'high',
      provider_chain_attempted,
      provider_chain_resolved: false,
    };
  }

  // 9c. modules array
  if (contract.modules && contract.modules.length > 0) {
    const mods = contract.modules
      .map(normalizeModule)
      .filter((m) => m && m !== 'unknown');
    if (mods.length > 0) {
      return {
        ...empty,
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'modules_csv',
        resolved_product: mods.length > 1 ? 'bundle' : mods[0],
        resolved_modules: mods,
        confidence: 'high',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
  }

  // 9d. Legacy subscription fields
  if (legacy_subscription) {
    if (legacy_subscription.plan_key && PLAN_CATALOG[legacy_subscription.plan_key]) {
      const plan = PLAN_CATALOG[legacy_subscription.plan_key];
      return {
        ...empty,
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'legacy_subscription',
        resolved_product: plan.product,
        resolved_modules: plan.modules,
        resolved_plan_key: legacy_subscription.plan_key,
        confidence: 'medium',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
    if (legacy_subscription.modules_csv) {
      const mods = parseModulesCsv(legacy_subscription.modules_csv);
      if (mods.length > 0) {
        return {
          ...empty,
          classification: 'LEGACY_RESOLVED',
          resolution_source: 'legacy_subscription',
          resolved_product: mods.length > 1 ? 'bundle' : mods[0],
          resolved_modules: mods,
          confidence: 'medium',
          provider_chain_attempted,
          provider_chain_resolved: false,
        };
      }
    }
    if (legacy_subscription.primary_module) {
      const mod = normalizeModule(legacy_subscription.primary_module);
      if (mod && mod !== 'unknown') {
        return {
          ...empty,
          classification: 'LEGACY_RESOLVED',
          resolution_source: 'legacy_subscription',
          resolved_product: mod,
          resolved_modules: [mod],
          confidence: 'medium',
          provider_chain_attempted,
          provider_chain_resolved: false,
        };
      }
    }
  }

  // 9e. Existing product field
  const localProduct = (contract.product || 'unknown').toLowerCase();
  if (localProduct !== 'unknown') {
    const knownProducts = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle'];
    if (knownProducts.includes(localProduct)) {
      return {
        ...empty,
        classification: 'LEGACY_RESOLVED',
        resolution_source: 'existing_product_field',
        resolved_product: localProduct,
        resolved_modules: localProduct === 'bundle' ? [] : [localProduct],
        confidence: 'medium',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 10. AMOUNT INFERENCE (last resort, NEVER PROVIDER_RESOLVED)
  // ════════════════════════════════════════════════════════════════════════
  const billingInterval = normalizeInterval(contract.billing_interval);
  const amountCents = contract.amount_cents ?? null;

  if (amountCents != null && billingInterval !== 'unknown') {
    const key = `${amountCents}_${billingInterval}`;
    if (LEGACY_AMOUNT_MAP[key]) {
      const legacy = LEGACY_AMOUNT_MAP[key];
      return {
        ...empty,
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: legacy.product,
        resolved_modules: legacy.modules,
        confidence: 'low',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
    if (amountCents === 2999 && billingInterval === 'annual') {
      return {
        ...empty,
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'],
        confidence: 'low',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
    if (amountCents === 299 && billingInterval === 'monthly') {
      return {
        ...empty,
        classification: 'AMOUNT_INFERRED',
        resolution_source: 'amount_interval_inference',
        resolved_product: 'pipekeeper',
        resolved_modules: ['pipekeeper'],
        confidence: 'low',
        provider_chain_attempted,
        provider_chain_resolved: false,
      };
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 11. UNRESOLVED
  // ════════════════════════════════════════════════════════════════════════
  return {
    ...empty,
    provider_chain_attempted,
    provider_chain_resolved: false,
  };
}

// ── Detect mismatch between provider truth and local data ──────────────────

export function detectProviderMismatch(
  contract: ActiveContractLike,
  resolverResult: ResolverResult,
): { mismatch: boolean; detail: string | null } {
  if (resolverResult.classification !== 'PROVIDER_RESOLVED') {
    return { mismatch: false, detail: null };
  }

  const localProduct = (contract.product || 'unknown').toLowerCase();
  const localModules = (contract.modules || [])
    .map(normalizeModule)
    .filter((m) => m && m !== 'unknown');

  if (localProduct === 'unknown' || !localProduct) {
    return { mismatch: false, detail: null };
  }

  const knownProducts = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle'];
  if (!knownProducts.includes(localProduct)) {
    return { mismatch: false, detail: null };
  }

  if (localProduct !== resolverResult.resolved_product) {
    return {
      mismatch: true,
      detail: `PROVIDER_PRODUCT_MISMATCH: local=${localProduct} provider=${resolverResult.resolved_product}`,
    };
  }

  // Check module mismatch if local has modules
  if (localModules.length > 0 && resolverResult.resolved_modules.length > 0) {
    const localSet = new Set(localModules);
    const providerSet = new Set(resolverResult.resolved_modules);
    if (localSet.size !== providerSet.size ||
      [...localSet].some((m) => !providerSet.has(m))) {
      return {
        mismatch: true,
        detail: `PROVIDER_MODULE_MISMATCH: local=[${localModules.join(',')}] provider=[${resolverResult.resolved_modules.join(',')}]`,
      };
    }
  }

  return { mismatch: false, detail: null };
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

// ── Mutually exclusive user population classification ───────────────────────

export type UserPopulationCategory =
  | 'CURRENT_PROVIDER_VERIFIED'
  | 'CURRENT_APPLE_PROVISIONAL'
  | 'STALE_PROVIDER_MISSING_ONLY'
  | 'EXPIRED_ONLY'
  | 'MIXED_CURRENT_AND_STALE'
  | 'MANUAL_REVIEW';

export interface UserPopulationResult {
  user_id: string;
  category: UserPopulationCategory;
  has_current: boolean;
  has_stale: boolean;
  has_expired: boolean;
  has_missing: boolean;
  has_apple: boolean;
  contract_count: number;
}

export function classifyUserPopulation(
  userId: string,
  contracts: Array<{
    lifecycle_classification: string;
    provider: string;
  }>,
): UserPopulationResult {
  const hasCurrent = contracts.some((c) =>
    ['PROVIDER_ACTIVE', 'PROVIDER_TRIALING', 'PROVIDER_CANCELED_BUT_ENTITLED_UNTIL_DATE'].includes(
      c.lifecycle_classification,
    ),
  );
  const hasApple = contracts.some((c) => c.lifecycle_classification === 'APPLE_PROVISIONAL');
  const hasMissing = contracts.some(
    (c) => c.lifecycle_classification === 'PROVIDER_SUBSCRIPTION_MISSING',
  );
  const hasExpired = contracts.some(
    (c) => c.lifecycle_classification === 'PROVIDER_EXPIRED',
  );
  const hasStale = hasMissing || hasExpired;
  const hasLookupFailed = contracts.some(
    (c) => c.lifecycle_classification === 'PROVIDER_LOOKUP_FAILED',
  );
  const hasNoRef = contracts.some(
    (c) => c.lifecycle_classification === 'NO_PROVIDER_REFERENCE',
  );

  let category: UserPopulationCategory;

  if (hasCurrent && !hasStale) {
    category = 'CURRENT_PROVIDER_VERIFIED';
  } else if (hasApple && !hasCurrent && !hasStale) {
    category = 'CURRENT_APPLE_PROVISIONAL';
  } else if (hasCurrent && hasStale) {
    category = 'MIXED_CURRENT_AND_STALE';
  } else if (hasMissing && !hasExpired && !hasCurrent) {
    category = 'STALE_PROVIDER_MISSING_ONLY';
  } else if (hasExpired && !hasMissing && !hasCurrent) {
    category = 'EXPIRED_ONLY';
  } else {
    category = 'MANUAL_REVIEW';
  }

  return {
    user_id: userId,
    category,
    has_current: hasCurrent,
    has_stale: hasStale,
    has_expired: hasExpired,
    has_missing: hasMissing,
    has_apple: hasApple,
    contract_count: contracts.length,
  };
}