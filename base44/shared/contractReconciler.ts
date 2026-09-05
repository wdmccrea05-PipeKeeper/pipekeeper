/**
 * Canonical Contract Reconciler
 *
 * Reconstructs the authoritative chain for every active contract:
 *   Customer → Provider → Provider Subscription → Provider Price/Product
 *           → CollectionKeeper Plan → Module Scope → Entitlement
 *
 * Resolution priority:
 *
 * Stripe:
 *   1. Live Stripe Subscription → Subscription Item → Price ID → Product ID
 *   2. Local price_id (matched against env var price IDs)
 *   3. plan_key
 *   4. modules_csv / modules array
 *   5. primary_module
 *   6. product_kind / checkout_type
 *   7. legacy Subscription record
 *   8. amount + interval (LAST resort, marked amount_interval_inference)
 *
 * Apple:
 *   1. Apple productId (from contract or legacy subscription)
 *   2. Legacy subscription product_id
 *   3. Historical mappings
 *   4. UNRESOLVED if nothing (NEVER infer from amount_cents)
 *
 * Every contract gets a classification:
 *   PROVIDER_MATCHED           — Stripe identifies product, agrees with local
 *   PROVIDER_RECOVERED          — Local was missing/wrong, Stripe identified it
 *   PROVIDER_MISMATCH          — Stripe identifies a different product than local
 *   PROVIDER_SUBSCRIPTION_MISSING — Local references a Stripe sub that doesn't exist
 *   PROVIDER_LOOKUP_FAILED     — Temporary API failure prevented verification
 *   HISTORICAL_INFERRED        — No provider truth, resolved from local/legacy
 *   UNRESOLVED                 — No evidence could resolve the product
 *   PROVISIONAL_APPLE          — Apple, no productId, awaiting App Store Server API
 *   STALE_NOT_ACTIVE           — Local says active but provider says canceled/expired
 */

import {
  PLAN_CATALOG,
  LEGACY_AMOUNT_MAP,
  buildPriceIdMap,
  normalizeModule,
  type ProductScopeResult,
} from './productScopeResolver.ts';

// ── Types ───────────────────────────────────────────────────────────────────

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
  provider_verified_at?: string;
  reconciliation_status?: string;
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

export type ContractClassification =
  | 'PROVIDER_MATCHED'
  | 'PROVIDER_RECOVERED'
  | 'PROVIDER_MISMATCH'
  | 'PROVIDER_SUBSCRIPTION_MISSING'
  | 'PROVIDER_LOOKUP_FAILED'
  | 'HISTORICAL_INFERRED'
  | 'UNRESOLVED'
  | 'PROVISIONAL_APPLE'
  | 'STALE_NOT_ACTIVE';

export interface ContractReconciliationResult {
  contract_id: string;
  user_id: string;
  user_email: string;
  provider: string;
  provider_subscription_id: string;
  provider_customer_id: string;
  internal_subscription_id: string | null;
  classification: ContractClassification;
  resolved_product: string;
  resolved_modules: string[];
  resolved_plan_key: string | null;
  resolved_price_id: string | null;
  resolved_product_id: string | null;
  resolution_source: string;
  confidence: 'high' | 'medium' | 'low' | 'unresolved';
  provider_status: string | null;
  provider_period_end: string | null;
  local_product: string;
  local_matches_provider: boolean;
  billing_interval: string;
  amount_cents: number | null;
  period_start: string | null;
  period_end: string | null;
  issues: string[];
  repair_needed: boolean;
  repair_fields: Record<string, any>;
}

export interface ReconcileContractInput {
  contract: ActiveContractLike;
  legacy_subscription?: SubscriptionLike | null;
  provider_truth?: ProviderTruth | null;
  price_id_map?: Record<string, string>;
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
  return csv.split(',')
    .map(s => normalizeModule(s.trim()))
    .filter(m => m && m !== 'unknown' && m !== 'bundle');
}

function isStaleProviderStatus(providerStatus: string | null, localIsActive: boolean): boolean {
  if (!providerStatus || !localIsActive) return false;
  const s = providerStatus.toLowerCase();
  // If provider says canceled/expired/unpaid but local says active
  return s === 'canceled' || s === 'unpaid' || s === 'incomplete';
}

// ── Main reconciler ─────────────────────────────────────────────────────────

export function reconcileContract(input: ReconcileContractInput): ContractReconciliationResult {
  const { contract, legacy_subscription, provider_truth, price_id_map } = input;

  const contract_id = contract.id;
  const user_id = contract.user_id || '';
  const user_email = contract.user_email || '';
  const provider = contract.provider;
  const provider_subscription_id = contract.provider_subscription_id || '';
  const provider_customer_id = contract.provider_customer_id || '';
  const internal_subscription_id = contract.source_subscription_id || legacy_subscription?.id || null;
  const local_product = (contract.product || 'unknown').toLowerCase();
  const billing_interval = normalizeInterval(contract.billing_interval);
  const amount_cents = contract.amount_cents ?? null;
  const period_start = contract.period_start || null;
  const period_end = contract.period_end || null;

  const issues: string[] = [];
  const repair_fields: Record<string, any> = {};

  let resolved_product = 'unknown';
  let resolved_modules: string[] = [];
  let resolved_plan_key: string | null = null;
  let resolved_price_id: string | null = null;
  let resolved_product_id: string | null = null;
  let resolution_source = 'unresolved';
  let confidence: 'high' | 'medium' | 'low' | 'unresolved' = 'unresolved';
  let provider_status: string | null = null;
  let provider_period_end: string | null = null;
  let classification: ContractClassification = 'UNRESOLVED';

  // ════════════════════════════════════════════════════════════════════════
  // STRIPE: Provider truth first
  // ════════════════════════════════════════════════════════════════════════
  if (provider === 'stripe') {
    // Check for stale provider status first
    if (provider_truth?.stripe_subscription) {
      const sub = provider_truth.stripe_subscription;
      provider_status = sub.status || null;
      if (sub.current_period_end) {
        provider_period_end = new Date(sub.current_period_end * 1000).toISOString();
      }

      // Detect stale: provider says canceled/expired but local says active
      if (isStaleProviderStatus(provider_status, contract.is_active !== false)) {
        issues.push(`STALE: provider_status=${provider_status} but local is_active=true`);
        classification = 'STALE_NOT_ACTIVE';
        // Still try to resolve product, but mark stale
      }

      // Extract price ID and product ID from Stripe subscription items
      const items = sub.items?.data || [];
      const firstItem = items[0];
      if (firstItem?.price) {
        resolved_price_id = firstItem.price.id || null;
        resolved_product_id = firstItem.price.product || null;
      }

      // Try to resolve plan from Stripe price ID via price_id_map
      if (resolved_price_id && price_id_map && price_id_map[resolved_price_id]) {
        resolved_plan_key = price_id_map[resolved_price_id];
        const plan = PLAN_CATALOG[resolved_plan_key];
        if (plan) {
          resolved_product = plan.product;
          resolved_modules = plan.modules;
          resolution_source = 'stripe_price';
          confidence = 'high';
        }
      }

      // If price_id_map didn't resolve but we have a Stripe price, try product metadata
      if (resolved_product === 'unknown' && resolved_product_id) {
        // Check Stripe product metadata for plan_key or modules
        const product = sub.items?.data?.[0]?.price?.product;
        // The product could be expanded or just an ID. If it's an object with metadata:
        if (product && typeof product === 'object' && product.metadata) {
          const meta = product.metadata;
          if (meta.plan_key && PLAN_CATALOG[meta.plan_key]) {
            resolved_plan_key = meta.plan_key;
            const plan = PLAN_CATALOG[meta.plan_key];
            resolved_product = plan.product;
            resolved_modules = plan.modules;
            resolution_source = 'stripe_product_metadata';
            confidence = 'high';
          } else if (meta.modules) {
            const mods = meta.modules.split(',').map(normalizeModule).filter(Boolean);
            if (mods.length > 0) {
              resolved_product = mods.length > 1 ? 'bundle' : mods[0];
              resolved_modules = mods;
              resolution_source = 'stripe_product_metadata';
              confidence = 'high';
            }
          }
        }
      }

      // Classify based on what we resolved
      // Stale detection takes priority over match/recover/mismatch
      const wasStale = classification === 'STALE_NOT_ACTIVE';

      if (resolved_product !== 'unknown') {
        if (local_product === 'unknown' || !local_product) {
          classification = wasStale ? 'STALE_NOT_ACTIVE' : 'PROVIDER_RECOVERED';
          repair_fields.product = resolved_product;
          repair_fields.modules = resolved_modules;
          repair_fields.product_source = 'stripe_price';
          repair_fields.resolved_price_id = resolved_price_id;
          repair_fields.resolved_product_id = resolved_product_id;
          repair_fields.resolved_plan_key = resolved_plan_key;
          if (provider_status) repair_fields.status = provider_status;
          if (provider_period_end) {
            repair_fields.period_end = provider_period_end;
            repair_fields.period_end_source = 'provider';
          }
        } else if (local_product !== resolved_product) {
          classification = wasStale ? 'STALE_NOT_ACTIVE' : 'PROVIDER_MISMATCH';
          issues.push(`PROVIDER_MISMATCH: local=${local_product} provider=${resolved_product}`);
          repair_fields.product = resolved_product;
          repair_fields.modules = resolved_modules;
          repair_fields.product_source = 'stripe_price';
          repair_fields.resolved_price_id = resolved_price_id;
          repair_fields.resolved_product_id = resolved_product_id;
          repair_fields.resolved_plan_key = resolved_plan_key;
        } else {
          // Match — but might still need to update resolved_* fields
          classification = wasStale ? 'STALE_NOT_ACTIVE' : 'PROVIDER_MATCHED';
          if (!contract.resolved_price_id) repair_fields.resolved_price_id = resolved_price_id;
          if (!contract.resolved_product_id) repair_fields.resolved_product_id = resolved_product_id;
          if (!contract.resolved_plan_key) repair_fields.resolved_plan_key = resolved_plan_key;
          if (provider_status && contract.status !== provider_status) {
            repair_fields.status = provider_status;
          }
          if (provider_period_end && contract.period_end !== provider_period_end) {
            repair_fields.period_end = provider_period_end;
            repair_fields.period_end_source = 'provider';
          }
        }
      }
      // If we have the Stripe subscription but couldn't resolve product from it,
      // fall through to local resolution but mark as PROVIDER_LOOKUP_FAILED
      // only if we truly can't determine the product at all
    }

    // PROVIDER_SUBSCRIPTION_MISSING
    if (provider_truth?.stripe_not_found && classification === 'UNRESOLVED') {
      issues.push('PROVIDER_SUBSCRIPTION_MISSING: Stripe subscription not found');
      classification = 'PROVIDER_SUBSCRIPTION_MISSING';
    }

    // PROVIDER_LOOKUP_FAILED — fall through to local resolution
    if (provider_truth?.stripe_lookup_error && classification === 'UNRESOLVED') {
      issues.push(`PROVIDER_LOOKUP_FAILED: ${provider_truth.stripe_lookup_error}`);
      // Don't set classification yet — try local resolution first
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // APPLE: Never infer from amount
  // ════════════════════════════════════════════════════════════════════════
  if (provider === 'apple') {
    // Check for Apple product ID in contract or legacy subscription
    const apple_product_id =
      contract.resolved_product_id ||
      legacy_subscription?.product_id ||
      null;

    if (apple_product_id) {
      // Try to map Apple product ID to plan
      const plan_key = mapAppleProductIdToPlan(apple_product_id, price_id_map);
      if (plan_key && PLAN_CATALOG[plan_key]) {
        const plan = PLAN_CATALOG[plan_key];
        resolved_product = plan.product;
        resolved_modules = plan.modules;
        resolved_plan_key = plan_key;
        resolved_product_id = apple_product_id;
        resolution_source = 'apple_product_id';
        confidence = 'high';
        classification = local_product === 'unknown' ? 'PROVIDER_RECOVERED' :
          local_product === resolved_product ? 'PROVIDER_MATCHED' : 'PROVIDER_MISMATCH';
      } else {
        // Have product ID but can't map it
        resolved_product_id = apple_product_id;
        resolution_source = 'apple_product_id_unmapped';
        classification = 'PROVISIONAL_APPLE';
        issues.push(`Apple productId ${apple_product_id} not in plan catalog`);
      }
    } else {
      // No Apple product ID — do NOT infer from amount
      classification = 'PROVISIONAL_APPLE';
      resolution_source = 'no_apple_product_id';
      issues.push('PROVISIONAL_APPLE: no productId, awaiting App Store Server API');
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // FALLBACK: Local resolution (when provider truth unavailable or failed)
  // ════════════════════════════════════════════════════════════════════════
  if (resolved_product === 'unknown' && classification !== 'PROVISIONAL_APPLE' && classification !== 'PROVIDER_SUBSCRIPTION_MISSING') {
    // 1. Local price_id
    const local_price_id = contract.resolved_price_id || null;
    if (local_price_id && price_id_map && price_id_map[local_price_id]) {
      const plan_key = price_id_map[local_price_id];
      const plan = PLAN_CATALOG[plan_key];
      if (plan) {
        resolved_product = plan.product;
        resolved_modules = plan.modules;
        resolved_plan_key = plan_key;
        resolved_price_id = local_price_id;
        resolution_source = 'price_id_lookup';
        confidence = 'high';
      }
    }

    // 2. plan_key from contract
    if (resolved_product === 'unknown' && (contract as any).plan_key) {
      const pk = (contract as any).plan_key;
      if (PLAN_CATALOG[pk]) {
        const plan = PLAN_CATALOG[pk];
        resolved_product = plan.product;
        resolved_modules = plan.modules;
        resolved_plan_key = pk;
        resolution_source = 'plan_key';
        confidence = 'high';
      }
    }

    // 3. modules array
    if (resolved_product === 'unknown' && contract.modules && contract.modules.length > 0) {
      const mods = contract.modules.map(normalizeModule).filter(m => m && m !== 'unknown');
      if (mods.length > 0) {
        resolved_product = mods.length > 1 ? 'bundle' : mods[0];
        resolved_modules = mods;
        resolution_source = 'modules_csv';
        confidence = 'high';
      }
    }

    // 4. Legacy subscription fields
    if (resolved_product === 'unknown' && legacy_subscription) {
      // Legacy plan_key
      if (legacy_subscription.plan_key && PLAN_CATALOG[legacy_subscription.plan_key]) {
        const plan = PLAN_CATALOG[legacy_subscription.plan_key];
        resolved_product = plan.product;
        resolved_modules = plan.modules;
        resolved_plan_key = legacy_subscription.plan_key;
        resolution_source = 'legacy_subscription';
        confidence = 'medium';
      }
      // Legacy modules_csv
      else if (legacy_subscription.modules_csv) {
        const mods = parseModulesCsv(legacy_subscription.modules_csv);
        if (mods.length > 0) {
          resolved_product = mods.length > 1 ? 'bundle' : mods[0];
          resolved_modules = mods;
          resolution_source = 'legacy_subscription';
          confidence = 'medium';
        }
      }
      // Legacy primary_module
      else if (legacy_subscription.primary_module) {
        const mod = normalizeModule(legacy_subscription.primary_module);
        if (mod && mod !== 'unknown') {
          resolved_product = mod;
          resolved_modules = [mod];
          resolution_source = 'legacy_subscription';
          confidence = 'medium';
        }
      }
      // Legacy product_kind
      else if (legacy_subscription.product_kind === 'founders' || legacy_subscription.checkout_type === 'bundle_2') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper'];
        resolution_source = 'legacy_subscription';
        confidence = 'medium';
      } else if (legacy_subscription.checkout_type === 'bundle_3') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
        resolution_source = 'legacy_subscription';
        confidence = 'medium';
      } else if (legacy_subscription.checkout_type === 'bundle_4') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
        resolution_source = 'legacy_subscription';
        confidence = 'medium';
      }
    }

    // 5. product_kind / checkout_type from contract
    if (resolved_product === 'unknown') {
      const pkind = (contract as any).product_kind || legacy_subscription?.product_kind;
      const ctype = (contract as any).checkout_type || legacy_subscription?.checkout_type;
      if (pkind === 'founders' || ctype === 'bundle_2') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper'];
        resolution_source = 'product_kind';
        confidence = 'medium';
      } else if (ctype === 'bundle_3') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
        resolution_source = 'product_kind';
        confidence = 'medium';
      } else if (ctype === 'bundle_4') {
        resolved_product = 'bundle';
        resolved_modules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
        resolution_source = 'product_kind';
        confidence = 'medium';
      }
    }

    // 6. primary_module from contract
    if (resolved_product === 'unknown' && (contract as any).primary_module) {
      const mod = normalizeModule((contract as any).primary_module);
      if (mod && mod !== 'unknown' && mod !== 'bundle') {
        resolved_product = mod;
        resolved_modules = [mod];
        resolution_source = 'primary_module';
        confidence = 'medium';
      }
    }

    // 7. Existing product field if known
    if (resolved_product === 'unknown' && local_product !== 'unknown') {
      const knownProducts = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle'];
      if (knownProducts.includes(local_product)) {
        resolved_product = local_product;
        resolved_modules = local_product === 'bundle' ? [] : [local_product];
        resolution_source = 'existing_product_field';
        confidence = 'medium';
      }
    }

    // 8. Amount + interval (LAST resort)
    if (resolved_product === 'unknown' && amount_cents != null && billing_interval !== 'unknown') {
      const key = `${amount_cents}_${billing_interval}`;
      if (LEGACY_AMOUNT_MAP[key]) {
        const legacy = LEGACY_AMOUNT_MAP[key];
        resolved_product = legacy.product;
        resolved_modules = legacy.modules;
        resolution_source = 'amount_interval_inference';
        confidence = 'low';
      } else if (amount_cents === 2999 && billing_interval === 'annual') {
        resolved_product = 'pipekeeper';
        resolved_modules = ['pipekeeper'];
        resolution_source = 'amount_interval_inference';
        confidence = 'low';
      } else if (amount_cents === 299 && billing_interval === 'monthly') {
        resolved_product = 'pipekeeper';
        resolved_modules = ['pipekeeper'];
        resolution_source = 'amount_interval_inference';
        confidence = 'low';
      }
    }

    // Set classification for fallback resolutions
    if (resolved_product !== 'unknown') {
      if (provider === 'stripe' && provider_truth?.stripe_lookup_error && classification !== 'STALE_NOT_ACTIVE') {
        classification = 'HISTORICAL_INFERRED';
      } else if (classification === 'UNRESOLVED') {
        classification = 'HISTORICAL_INFERRED';
      }
    } else {
      // Still unresolved
      if (provider === 'stripe' && provider_truth?.stripe_lookup_error) {
        classification = 'PROVIDER_LOOKUP_FAILED';
      } else if (classification === 'UNRESOLVED') {
        classification = 'UNRESOLVED';
        issues.push(`Unresolved: missing price_id, plan_key, modules, primary_module`);
      }
    }
  }

  // Determine repair needed
  const repair_needed = Object.keys(repair_fields).length > 0;

  // Check if local matches provider
  const local_matches_provider =
    classification === 'PROVIDER_MATCHED' ||
    (resolved_product !== 'unknown' && local_product === resolved_product);

  return {
    contract_id,
    user_id,
    user_email,
    provider,
    provider_subscription_id,
    provider_customer_id,
    internal_subscription_id,
    classification,
    resolved_product,
    resolved_modules,
    resolved_plan_key,
    resolved_price_id,
    resolved_product_id,
    resolution_source,
    confidence,
    provider_status,
    provider_period_end,
    local_product,
    local_matches_provider,
    billing_interval,
    amount_cents,
    period_start,
    period_end,
    issues,
    repair_needed,
    repair_fields,
  };
}

// ── Apple product ID → plan mapping ──────────────────────────────────────────

function mapAppleProductIdToPlan(
  appleProductId: string,
  priceIdMap?: Record<string, string>
): string | null {
  if (!appleProductId) return null;
  // Apple product IDs often mirror the Stripe price ID env var naming.
  // Check if the Apple product ID matches any known price ID.
  if (priceIdMap && priceIdMap[appleProductId]) {
    return priceIdMap[appleProductId];
  }
  // Check if the Apple product ID directly matches a plan key
  if (PLAN_CATALOG[appleProductId]) {
    return appleProductId;
  }
  // Common Apple product ID patterns
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

// ── Scope category classification (for arithmetic reconciliation) ────────────

export type ScopeCategory =
  | 'pipekeeper'
  | 'cigarkeeper'
  | 'whiskeykeeper'
  | 'winekeeper'
  | 'multi_module_bundle'
  | 'unresolved';

export function classifyScopeCategory(result: ContractReconciliationResult): ScopeCategory {
  if (result.resolved_modules.length === 0 || result.resolved_product === 'unknown') {
    return 'unresolved';
  }
  if (result.resolved_modules.length > 1) {
    return 'multi_module_bundle';
  }
  const mod = result.resolved_modules[0];
  if (mod === 'pipekeeper') return 'pipekeeper';
  if (mod === 'cigarkeeper') return 'cigarkeeper';
  if (mod === 'whiskeykeeper') return 'whiskeykeeper';
  if (mod === 'winekeeper') return 'winekeeper';
  return 'unresolved';
}

// ── Reconciliation invariants ───────────────────────────────────────────────

export interface ReconciliationInvariant {
  level: 'critical' | 'warning';
  code: string;
  contract_id: string;
  message: string;
}

export function checkReconciliationInvariants(results: ContractReconciliationResult[]): ReconciliationInvariant[] {
  const invariants: ReconciliationInvariant[] = [];

  // Check for duplicate provider_subscription_id references
  const subIdMap: Record<string, ContractReconciliationResult[]> = {};
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
    // Critical: Stripe active contract with no provider subscription ID
    if (r.provider === 'stripe' && !r.provider_subscription_id) {
      invariants.push({
        level: 'critical',
        code: 'STRIPE_ACTIVE_NO_SUBSCRIPTION_ID',
        contract_id: r.contract_id,
        message: 'Stripe active contract has no provider_subscription_id',
      });
    }

    // Critical: Stripe provider subscription exists but product scope unresolved
    if (r.provider === 'stripe' && r.provider_subscription_id &&
        r.classification === 'UNRESOLVED') {
      invariants.push({
        level: 'critical',
        code: 'STRIPE_SUBSCRIPTION_UNRESOLVED_SCOPE',
        contract_id: r.contract_id,
        message: `Stripe subscription ${r.provider_subscription_id} exists but product scope unresolved`,
      });
    }

    // Critical: provider product differs from local product
    if (r.classification === 'PROVIDER_MISMATCH') {
      invariants.push({
        level: 'critical',
        code: 'PROVIDER_PRODUCT_MISMATCH',
        contract_id: r.contract_id,
        message: `Provider says ${r.resolved_product}, local says ${r.local_product}`,
      });
    }

    // Critical: active paid contract with unknown entitlement scope
    if (r.classification === 'UNRESOLVED' && r.provider !== 'apple') {
      invariants.push({
        level: 'critical',
        code: 'ACTIVE_CONTRACT_UNKNOWN_SCOPE',
        contract_id: r.contract_id,
        message: 'Active paid contract with unknown entitlement scope',
      });
    }

    // Critical: contract marked provider verified based only on amount inference
    if (r.resolution_source === 'amount_interval_inference' &&
        r.confidence === 'high') {
      invariants.push({
        level: 'critical',
        code: 'AMOUNT_INFERENCE_MARKED_AS_VERIFIED',
        contract_id: r.contract_id,
        message: 'Contract marked as verified based only on amount inference',
      });
    }

    // Warning: Apple provisional
    if (r.classification === 'PROVISIONAL_APPLE') {
      invariants.push({
        level: 'warning',
        code: 'APPLE_PROVISIONAL',
        contract_id: r.contract_id,
        message: 'Apple contract is provisional — awaiting App Store Server API',
      });
    }

    // Warning: historical amount-based inference
    if (r.resolution_source === 'amount_interval_inference') {
      invariants.push({
        level: 'warning',
        code: 'HISTORICAL_AMOUNT_INFERENCE',
        contract_id: r.contract_id,
        message: 'Product resolved from amount + interval (historical inference, not provider verified)',
      });
    }

    // Warning: temporary provider lookup failure
    if (r.classification === 'PROVIDER_LOOKUP_FAILED') {
      invariants.push({
        level: 'warning',
        code: 'PROVIDER_LOOKUP_FAILED',
        contract_id: r.contract_id,
        message: 'Temporary provider lookup failure prevented verification',
      });
    }

    // Warning: legacy migration mapping
    if (r.resolution_source === 'legacy_subscription') {
      invariants.push({
        level: 'warning',
        code: 'LEGACY_MIGRATION_MAPPING',
        contract_id: r.contract_id,
        message: 'Product resolved from legacy Subscription record (not provider verified)',
      });
    }

    // Critical: stale not active
    if (r.classification === 'STALE_NOT_ACTIVE') {
      invariants.push({
        level: 'critical',
        code: 'STALE_CONTRACT_PROVIDER_SAYS_INACTIVE',
        contract_id: r.contract_id,
        message: `Local contract active but provider status is ${r.provider_status}`,
      });
    }
  }

  return invariants;
}