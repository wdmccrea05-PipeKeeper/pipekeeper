/**
 * JS mirror of base44/shared/contractReconciler.ts for vitest testing.
 * Kept in sync manually — the TS version is the source of truth.
 */

import { PLAN_CATALOG, LEGACY_AMOUNT_MAP, normalizeModule } from './productScopeResolver.js';

export function normalizeInterval(interval) {
  const raw = String(interval || '').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'annual' || raw === 'yearly' || raw === 'year') return 'annual';
  return 'unknown';
}

function parseModulesCsv(csv) {
  if (!csv) return [];
  return csv.split(',')
    .map(s => normalizeModule(s.trim()))
    .filter(m => m && m !== 'unknown' && m !== 'bundle');
}

function isStaleProviderStatus(providerStatus, localIsActive) {
  if (!providerStatus || !localIsActive) return false;
  const s = providerStatus.toLowerCase();
  return s === 'canceled' || s === 'unpaid' || s === 'incomplete';
}

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

export function reconcileContract(input) {
  const { contract, legacy_subscription = null, provider_truth = null, price_id_map = {} } = input;

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

  const issues = [];
  const repair_fields = {};

  let resolved_product = 'unknown';
  let resolved_modules = [];
  let resolved_plan_key = null;
  let resolved_price_id = null;
  let resolved_product_id = null;
  let resolution_source = 'unresolved';
  let confidence = 'unresolved';
  let provider_status = null;
  let provider_period_end = null;
  let classification = 'UNRESOLVED';

  // STRIPE: Provider truth first
  if (provider === 'stripe') {
    if (provider_truth?.stripe_subscription) {
      const sub = provider_truth.stripe_subscription;
      provider_status = sub.status || null;
      if (sub.current_period_end) {
        provider_period_end = new Date(sub.current_period_end * 1000).toISOString();
      }

      if (isStaleProviderStatus(provider_status, contract.is_active !== false)) {
        issues.push(`STALE: provider_status=${provider_status} but local is_active=true`);
        classification = 'STALE_NOT_ACTIVE';
      }

      const items = sub.items?.data || [];
      const firstItem = items[0];
      if (firstItem?.price) {
        resolved_price_id = firstItem.price.id || null;
        resolved_product_id = firstItem.price.product || null;
      }

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

      if (resolved_product === 'unknown' && resolved_product_id) {
        const product = sub.items?.data?.[0]?.price?.product;
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
    }

    if (provider_truth?.stripe_not_found && classification === 'UNRESOLVED') {
      issues.push('PROVIDER_SUBSCRIPTION_MISSING: Stripe subscription not found');
      classification = 'PROVIDER_SUBSCRIPTION_MISSING';
    }

    if (provider_truth?.stripe_lookup_error && classification === 'UNRESOLVED') {
      issues.push(`PROVIDER_LOOKUP_FAILED: ${provider_truth.stripe_lookup_error}`);
    }
  }

  // APPLE: Never infer from amount
  if (provider === 'apple') {
    const apple_product_id =
      contract.resolved_product_id ||
      legacy_subscription?.product_id ||
      null;

    if (apple_product_id) {
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
        resolved_product_id = apple_product_id;
        resolution_source = 'apple_product_id_unmapped';
        classification = 'PROVISIONAL_APPLE';
        issues.push(`Apple productId ${apple_product_id} not in plan catalog`);
      }
    } else {
      classification = 'PROVISIONAL_APPLE';
      resolution_source = 'no_apple_product_id';
      issues.push('PROVISIONAL_APPLE: no productId, awaiting App Store Server API');
    }
  }

  // FALLBACK: Local resolution
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
    if (resolved_product === 'unknown' && contract.plan_key) {
      const pk = contract.plan_key;
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
      if (legacy_subscription.plan_key && PLAN_CATALOG[legacy_subscription.plan_key]) {
        const plan = PLAN_CATALOG[legacy_subscription.plan_key];
        resolved_product = plan.product;
        resolved_modules = plan.modules;
        resolved_plan_key = legacy_subscription.plan_key;
        resolution_source = 'legacy_subscription';
        confidence = 'medium';
      } else if (legacy_subscription.modules_csv) {
        const mods = parseModulesCsv(legacy_subscription.modules_csv);
        if (mods.length > 0) {
          resolved_product = mods.length > 1 ? 'bundle' : mods[0];
          resolved_modules = mods;
          resolution_source = 'legacy_subscription';
          confidence = 'medium';
        }
      } else if (legacy_subscription.primary_module) {
        const mod = normalizeModule(legacy_subscription.primary_module);
        if (mod && mod !== 'unknown') {
          resolved_product = mod;
          resolved_modules = [mod];
          resolution_source = 'legacy_subscription';
          confidence = 'medium';
        }
      } else if (legacy_subscription.product_kind === 'founders' || legacy_subscription.checkout_type === 'bundle_2') {
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
      const pkind = contract.product_kind || legacy_subscription?.product_kind;
      const ctype = contract.checkout_type || legacy_subscription?.checkout_type;
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
    if (resolved_product === 'unknown' && contract.primary_module) {
      const mod = normalizeModule(contract.primary_module);
      if (mod && mod !== 'unknown' && mod !== 'bundle') {
        resolved_product = mod;
        resolved_modules = [mod];
        resolution_source = 'primary_module';
        confidence = 'medium';
      }
    }

    // 7. Existing product field
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
      if (provider === 'stripe' && provider_truth?.stripe_lookup_error) {
        classification = 'PROVIDER_LOOKUP_FAILED';
      } else if (classification === 'UNRESOLVED') {
        classification = 'UNRESOLVED';
        issues.push('Unresolved: missing price_id, plan_key, modules, primary_module');
      }
    }
  }

  const repair_needed = Object.keys(repair_fields).length > 0;
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

export function classifyScopeCategory(result) {
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

export function checkReconciliationInvariants(results) {
  const invariants = [];

  // Duplicate provider_subscription_id references
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
    if (r.provider === 'stripe' && !r.provider_subscription_id) {
      invariants.push({ level: 'critical', code: 'STRIPE_ACTIVE_NO_SUBSCRIPTION_ID', contract_id: r.contract_id, message: 'Stripe active contract has no provider_subscription_id' });
    }
    if (r.provider === 'stripe' && r.provider_subscription_id && r.classification === 'UNRESOLVED') {
      invariants.push({ level: 'critical', code: 'STRIPE_SUBSCRIPTION_UNRESOLVED_SCOPE', contract_id: r.contract_id, message: `Stripe subscription ${r.provider_subscription_id} exists but product scope unresolved` });
    }
    if (r.classification === 'PROVIDER_MISMATCH') {
      invariants.push({ level: 'critical', code: 'PROVIDER_PRODUCT_MISMATCH', contract_id: r.contract_id, message: `Provider says ${r.resolved_product}, local says ${r.local_product}` });
    }
    if (r.classification === 'UNRESOLVED' && r.provider !== 'apple') {
      invariants.push({ level: 'critical', code: 'ACTIVE_CONTRACT_UNKNOWN_SCOPE', contract_id: r.contract_id, message: 'Active paid contract with unknown entitlement scope' });
    }
    if (r.resolution_source === 'amount_interval_inference' && r.confidence === 'high') {
      invariants.push({ level: 'critical', code: 'AMOUNT_INFERENCE_MARKED_AS_VERIFIED', contract_id: r.contract_id, message: 'Contract marked as verified based only on amount inference' });
    }
    if (r.classification === 'PROVISIONAL_APPLE') {
      invariants.push({ level: 'warning', code: 'APPLE_PROVISIONAL', contract_id: r.contract_id, message: 'Apple contract is provisional — awaiting App Store Server API' });
    }
    if (r.resolution_source === 'amount_interval_inference') {
      invariants.push({ level: 'warning', code: 'HISTORICAL_AMOUNT_INFERENCE', contract_id: r.contract_id, message: 'Product resolved from amount + interval (historical inference, not provider verified)' });
    }
    if (r.classification === 'PROVIDER_LOOKUP_FAILED') {
      invariants.push({ level: 'warning', code: 'PROVIDER_LOOKUP_FAILED', contract_id: r.contract_id, message: 'Temporary provider lookup failure prevented verification' });
    }
    if (r.resolution_source === 'legacy_subscription') {
      invariants.push({ level: 'warning', code: 'LEGACY_MIGRATION_MAPPING', contract_id: r.contract_id, message: 'Product resolved from legacy Subscription record (not provider verified)' });
    }
    if (r.classification === 'STALE_NOT_ACTIVE') {
      invariants.push({ level: 'critical', code: 'STALE_CONTRACT_PROVIDER_SAYS_INACTIVE', contract_id: r.contract_id, message: `Local contract active but provider status is ${r.provider_status}` });
    }
  }

  return invariants;
}