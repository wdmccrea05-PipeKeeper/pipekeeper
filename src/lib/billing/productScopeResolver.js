/**
 * Frontend/test copy of the canonical product scope resolver.
 * Mirrors base44/shared/productScopeResolver.ts exactly.
 * Keep in sync — tests import from this file.
 */

export const PLAN_CATALOG = {
  pipekeeper_pro_monthly:     { product: 'pipekeeper',   modules: ['pipekeeper'],     term: 'monthly', display_price_cents: 299 },
  pipekeeper_pro_annual:      { product: 'pipekeeper',   modules: ['pipekeeper'],     term: 'annual',  display_price_cents: 2999 },
  whiskeykeeper_pro_monthly:  { product: 'whiskeykeeper', modules: ['whiskeykeeper'], term: 'monthly', display_price_cents: 299 },
  whiskeykeeper_pro_annual:   { product: 'whiskeykeeper', modules: ['whiskeykeeper'], term: 'annual',  display_price_cents: 2999 },
  cigarkeeper_pro_monthly:    { product: 'cigarkeeper',  modules: ['cigarkeeper'],    term: 'monthly', display_price_cents: 299 },
  cigarkeeper_pro_annual:     { product: 'cigarkeeper',  modules: ['cigarkeeper'],    term: 'annual',  display_price_cents: 2999 },
  winekeeper_pro_monthly:     { product: 'winekeeper',   modules: ['winekeeper'],    term: 'monthly', display_price_cents: 299 },
  winekeeper_pro_annual:      { product: 'winekeeper',   modules: ['winekeeper'],    term: 'annual',  display_price_cents: 2999 },
  founders_bundle_monthly:    { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'],                 bundle_name: 'Founders',  term: 'monthly', display_price_cents: 499 },
  founders_bundle_annual:     { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'],                 bundle_name: 'Founders',  term: 'annual',  display_price_cents: 4999 },
  three_module_bundle_monthly:{ product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],  bundle_name: '3-Module', term: 'monthly', display_price_cents: 799 },
  three_module_bundle_annual: { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],  bundle_name: '3-Module', term: 'annual',  display_price_cents: 7999 },
  four_module_bundle_monthly: { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], bundle_name: '4-Module', term: 'monthly', display_price_cents: 899 },
  four_module_bundle_annual:  { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], bundle_name: '4-Module', term: 'annual',  display_price_cents: 8999 },
};

export const LEGACY_AMOUNT_MAP = {
  '1999_annual': { product: 'pipekeeper', modules: ['pipekeeper'], note: 'Legacy PipeKeeper annual at $19.99/year' },
  '199_monthly': { product: 'pipekeeper', modules: ['pipekeeper'], note: 'Legacy PipeKeeper monthly at $1.99/month' },
  '999_monthly': { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'], note: 'Legacy Founders bundle monthly at $9.99/month' },
};

const MODULE_ALIASES = {
  pipe: 'pipekeeper', whiskey: 'whiskeykeeper', cigar: 'cigarkeeper', wine: 'winekeeper', coffee: 'pipekeeper',
};

export function normalizeModule(m) {
  const key = String(m || '').trim().toLowerCase();
  return MODULE_ALIASES[key] || key;
}

export function buildPriceIdMap(priceIdEnv) {
  const map = {};
  const envToPlan = {
    VITE_STRIPE_PIPEKEEPER_MONTHLY: 'pipekeeper_pro_monthly',
    VITE_STRIPE_PIPEKEEPER_ANNUAL: 'pipekeeper_pro_annual',
    VITE_STRIPE_WHISKEYKEEPER_MONTHLY: 'whiskeykeeper_pro_monthly',
    VITE_STRIPE_WHISKEYKEEPER_ANNUAL: 'whiskeykeeper_pro_annual',
    VITE_STRIPE_CIGARKEEPER_MONTHLY: 'cigarkeeper_pro_monthly',
    VITE_STRIPE_CIGARKEEPER_ANNUAL: 'cigarkeeper_pro_annual',
    VITE_STRIPE_WINEKEEPER_MONTHLY: 'winekeeper_pro_monthly',
    VITE_STRIPE_WINEKEEPER_ANNUAL: 'winekeeper_pro_annual',
    VITE_STRIPE_FOUNDERS_MONTHLY: 'founders_bundle_monthly',
    VITE_STRIPE_FOUNDERS_ANNUAL: 'founders_bundle_annual',
    VITE_STRIPE_THREE_BUNDLE_MONTHLY: 'three_module_bundle_monthly',
    VITE_STRIPE_THREE_BUNDLE_ANNUAL: 'three_module_bundle_annual',
    VITE_STRIPE_FOUR_BUNDLE_MONTHLY: 'four_module_bundle_monthly',
    VITE_STRIPE_FOUR_BUNDLE_ANNUAL: 'four_module_bundle_annual',
  };
  for (const [envKey, planKey] of Object.entries(envToPlan)) {
    const priceId = priceIdEnv[envKey];
    if (priceId) map[priceId] = planKey;
  }
  return map;
}

function normalizeInterval(interval) {
  const raw = String(interval || '').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'annual' || raw === 'yearly' || raw === 'year') return 'annual';
  return 'unknown';
}

function parseModulesCsv(csv) {
  if (!csv) return [];
  return csv.split(',').map(s => normalizeModule(s.trim())).filter(m => m && m !== 'unknown' && m !== 'bundle');
}

function buildUnresolvedReason(input) {
  const missing = [];
  if (!input.price_id && !input.product_id) missing.push('price_id');
  if (!input.plan_key) missing.push('plan_key');
  if (!input.modules_csv && !Array.isArray(input.modules)) missing.push('modules');
  if (!input.primary_module) missing.push('primary_module');
  if (input.amount_cents == null && input.amount == null) missing.push('amount');
  return `Missing: ${missing.join(', ')}`;
}

export function resolveProductScope(input, priceIdMap) {
  const interval = normalizeInterval(input.billing_interval);

  // 1. Price ID
  if (input.price_id && priceIdMap && priceIdMap[input.price_id]) {
    const plan = PLAN_CATALOG[priceIdMap[input.price_id]];
    if (plan) return { product: plan.product, modules: plan.modules, bundle_name: plan.bundle_name || null, billing_interval: plan.term, confidence: 'high', source: `price_id_lookup (${input.price_id})` };
  }

  // 2. plan_key
  if (input.plan_key && PLAN_CATALOG[input.plan_key]) {
    const plan = PLAN_CATALOG[input.plan_key];
    return { product: plan.product, modules: plan.modules, bundle_name: plan.bundle_name || null, billing_interval: plan.term, confidence: 'high', source: `plan_key (${input.plan_key})` };
  }

  // 3. modules_csv / modules array
  const modulesFromCsv = parseModulesCsv(input.modules_csv);
  const modulesFromArray = Array.isArray(input.modules) ? input.modules.map(normalizeModule).filter(Boolean) : [];
  const directModules = modulesFromCsv.length > 0 ? modulesFromCsv : modulesFromArray;
  if (directModules.length > 0) {
    const isBundle = directModules.length > 1;
    return { product: isBundle ? 'bundle' : directModules[0], modules: directModules, bundle_name: isBundle ? `${directModules.length}-Module` : null, billing_interval: interval, confidence: 'high', source: 'modules_csv_or_array' };
  }

  // 4. primary_module
  if (input.primary_module) {
    const mod = normalizeModule(input.primary_module);
    if (mod && mod !== 'bundle' && mod !== 'unknown') {
      return { product: mod, modules: [mod], bundle_name: null, billing_interval: interval, confidence: 'medium', source: `primary_module (${input.primary_module})` };
    }
  }

  // 5. product_kind / checkout_type
  if (input.product_kind === 'founders' || input.checkout_type === 'bundle_2') {
    return { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper'], bundle_name: 'Founders', billing_interval: interval, confidence: 'medium', source: 'product_kind=founders' };
  }
  if (input.checkout_type === 'bundle_3') {
    return { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], bundle_name: '3-Module', billing_interval: interval, confidence: 'medium', source: 'checkout_type=bundle_3' };
  }
  if (input.checkout_type === 'bundle_4') {
    return { product: 'bundle', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], bundle_name: '4-Module', billing_interval: interval, confidence: 'medium', source: 'checkout_type=bundle_4' };
  }

  // 6. Amount + interval
  const amountCents = input.amount_cents ?? (input.amount ? Math.round(input.amount * 100) : null);
  if (amountCents != null && interval) {
    const key = `${amountCents}_${interval}`;
    if (LEGACY_AMOUNT_MAP[key]) {
      const legacy = LEGACY_AMOUNT_MAP[key];
      return { product: legacy.product, modules: legacy.modules, bundle_name: null, billing_interval: interval, confidence: 'low', source: `amount_lookup (${legacy.note})` };
    }
    if (amountCents === 2999 && interval === 'annual') {
      return { product: 'pipekeeper', modules: ['pipekeeper'], bundle_name: null, billing_interval: 'annual', confidence: 'low', source: 'amount_lookup ($29.99/year → single module, historically PipeKeeper)' };
    }
    if (amountCents === 299 && interval === 'monthly') {
      return { product: 'pipekeeper', modules: ['pipekeeper'], bundle_name: null, billing_interval: 'monthly', confidence: 'low', source: 'amount_lookup ($2.99/month → single module, historically PipeKeeper)' };
    }
  }

  // 7. Existing product field
  const knownProducts = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper', 'bundle'];
  if (input.product && knownProducts.includes(String(input.product).toLowerCase())) {
    const product = String(input.product).toLowerCase();
    return { product, modules: product === 'bundle' ? [] : [product], bundle_name: input.bundle_name || null, billing_interval: interval, confidence: 'medium', source: `existing_product_field (${product})` };
  }

  // 8. Unresolved
  return { product: 'unknown', modules: [], bundle_name: null, billing_interval: interval, confidence: 'unresolved', source: 'no_evidence', unresolved_reason: buildUnresolvedReason(input) };
}