/**
 * Entitlement Scope Resolver (Frontend/Test Copy)
 *
 * Canonical implementation: base44/shared/entitlementScopeResolver.ts
 * This JS copy exists because Vite cannot resolve .ts files from base44/
 * in frontend code. Keep in sync with the canonical version.
 *
 * Determines which modules a subscription or contract covers.
 * Used by the duplicate billing detector and checkout guard.
 */

const HARDCODED_PRICE_TO_MODULES = {
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'],
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'],
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'],
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'],
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'],
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'],
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
};

const BUNDLE_NAME_TO_MODULES = {
  founders: ['pipekeeper', 'whiskeykeeper'],
  founders_bundle: ['pipekeeper', 'whiskeykeeper'],
  '3-module': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  three_module: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  bundle_3: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  '4-module': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
  four_module: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
  bundle_4: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
};

export function modulesFromPlanKey(planKey) {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_')) return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_')) return ['cigarkeeper'];
  if (key.startsWith('winekeeper_')) return ['winekeeper'];
  if (key.includes('three_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders')) return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

function extractPriceId(record) {
  if (!record) return null;
  if (typeof record.price_id === 'string' && record.price_id) return record.price_id;
  if (typeof record.stripe_price_id === 'string' && record.stripe_price_id) return record.stripe_price_id;
  if (typeof record.productId === 'string' && record.productId) return record.productId;
  if (typeof record.product_id === 'string' && record.product_id) return record.product_id;
  return null;
}

export function resolveEntitlementScope(record) {
  // 1. Explicit modules array (ActiveContract)
  if (Array.isArray(record.modules) && record.modules.length > 0) {
    return record.modules.map(m => String(m).trim().toLowerCase()).filter(Boolean);
  }

  // 2. Price ID → hardcoded map
  const priceId = extractPriceId(record);
  if (priceId) {
    const hardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
    if (hardcoded) return [...hardcoded];
  }

  // 3. Plan key
  const planKey = String(record.plan_key || '').trim();
  if (planKey) {
    const fromKey = modulesFromPlanKey(planKey);
    if (fromKey.length > 0) return fromKey;
  }

  // 4. modules_csv
  const csv = String(record.modules_csv || '').trim();
  if (csv) {
    const mods = csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (mods.length > 0) return mods;
  }

  // 5. product_kind
  const productKind = String(record.product_kind || '').trim().toLowerCase();
  if (productKind === 'founders') return ['pipekeeper', 'whiskeykeeper'];
  if (productKind === 'bundle_3') return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (productKind === 'bundle_4') return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

  // 6. bundle_name
  const bundleName = String(record.bundle_name || '').trim().toLowerCase();
  if (bundleName) {
    const fromBundle = BUNDLE_NAME_TO_MODULES[bundleName];
    if (fromBundle) return [...fromBundle];
  }

  // 7. product (ActiveContract)
  const product = String(record.product || '').trim().toLowerCase();
  if (product && product !== 'bundle' && product !== 'unknown') {
    return [product];
  }

  // 8. primary_module
  const primary = String(record.primary_module || '').trim().toLowerCase();
  if (primary && primary !== 'unknown') return [primary];

  return [];
}

export function scopesIntersect(scopeA, scopeB) {
  const setB = new Set(scopeB.map(s => s.toLowerCase()));
  return scopeA.some(a => setB.has(a.toLowerCase()));
}