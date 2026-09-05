/**
 * Entitlement Scope Resolver
 *
 * Canonical resolver for determining which modules a subscription or contract
 * covers. Used by the duplicate billing detector and checkout guard to compare
 * entitlement scope — NOT merely tier names or user identity.
 *
 * A "scope" is a set of module strings: ['pipekeeper'], ['pipekeeper','whiskeykeeper'], etc.
 * Two subscriptions conflict only if their scopes intersect AND their billing
 * periods overlap AND both represent actual billing obligations.
 */

// ── Hardcoded price ID → module mapping (authoritative) ──────────────────────

export const HARDCODED_PRICE_TO_MODULES: Record<string, string[]> = {
  // PipeKeeper
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'],
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'],
  // WhiskeyKeeper
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'],
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'],
  // CigarKeeper
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'],
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'],
  // Founders Bundle (PipeKeeper + WhiskeyKeeper)
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'],
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'],
  // 3-Module Bundle
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
};

// ── Bundle name → module mapping ─────────────────────────────────────────────

export const BUNDLE_NAME_TO_MODULES: Record<string, string[]> = {
  founders: ['pipekeeper', 'whiskeykeeper'],
  founders_bundle: ['pipekeeper', 'whiskeykeeper'],
  '3-module': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  three_module: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  bundle_3: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
  '4-module': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
  four_module: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
  bundle_4: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
};

// ── Plan key → module mapping ─────────────────────────────────────────────────

export function modulesFromPlanKey(planKey: string): string[] {
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

// ── Price ID extraction ──────────────────────────────────────────────────────

export function extractPriceId(record: Record<string, unknown>): string | null {
  if (!record) return null;
  if (typeof record.price_id === 'string' && record.price_id) return record.price_id;
  if (typeof record.stripe_price_id === 'string' && record.stripe_price_id) return record.stripe_price_id;
  if (typeof record.productId === 'string' && record.productId) return record.productId;
  if (typeof record.product_id === 'string' && record.product_id) return record.product_id;
  return null;
}

// ── Build env-var price ID map (secondary lookup) ────────────────────────────

export function buildEnvPriceMap(): Record<string, string[]> {
  const e = typeof Deno !== 'undefined' ? Deno.env : { get: () => '' };
  const map: Record<string, string[]> = {};
  const add = (envKey: string, modules: string[]) => {
    const id = e.get(envKey);
    if (id && !HARDCODED_PRICE_TO_MODULES[id]) map[id] = modules;
  };
  add('VITE_STRIPE_PIPEKEEPER_MONTHLY', ['pipekeeper']);
  add('VITE_STRIPE_PIPEKEEPER_ANNUAL', ['pipekeeper']);
  add('VITE_STRIPE_WHISKEYKEEPER_MONTHLY', ['whiskeykeeper']);
  add('VITE_STRIPE_WHISKEYKEEPER_ANNUAL', ['whiskeykeeper']);
  add('VITE_STRIPE_CIGARKEEPER_MONTHLY', ['cigarkeeper']);
  add('VITE_STRIPE_CIGARKEEPER_ANNUAL', ['cigarkeeper']);
  add('VITE_STRIPE_WINEKEEPER_MONTHLY', ['winekeeper']);
  add('VITE_STRIPE_WINEKEEPER_ANNUAL', ['winekeeper']);
  add('VITE_STRIPE_THREE_BUNDLE_MONTHLY', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  add('VITE_STRIPE_THREE_BUNDLE_ANNUAL', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']);
  add('VITE_STRIPE_FOUR_BUNDLE_MONTHLY', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  add('VITE_STRIPE_FOUR_BUNDLE_ANNUAL', ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
  add('VITE_STRIPE_FOUNDERS_MONTHLY', ['pipekeeper', 'whiskeykeeper']);
  add('VITE_STRIPE_FOUNDERS_ANNUAL', ['pipekeeper', 'whiskeykeeper']);
  return map;
}

// ── Main scope resolver ──────────────────────────────────────────────────────

export function resolveEntitlementScope(
  record: Record<string, unknown>,
  envPriceMap?: Record<string, string[]>
): string[] {
  // 1. Explicit modules array (ActiveContract)
  if (Array.isArray(record.modules) && record.modules.length > 0) {
    return (record.modules as string[])
      .map(m => String(m).trim().toLowerCase())
      .filter(Boolean);
  }

  const priceMap = envPriceMap || (typeof Deno !== 'undefined' ? buildEnvPriceMap() : {});

  // 2. Price ID → hardcoded map (authoritative)
  const priceId = extractPriceId(record);
  if (priceId) {
    const hardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
    if (hardcoded) return [...hardcoded];
    const fromEnv = priceMap[priceId];
    if (fromEnv) return [...fromEnv];
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

  // 7. product (ActiveContract) — only if not 'bundle' or 'unknown'
  const product = String(record.product || '').trim().toLowerCase();
  if (product && product !== 'bundle' && product !== 'unknown') {
    return [product];
  }

  // 8. primary_module (single-module subscriptions)
  const primary = String(record.primary_module || '').trim().toLowerCase();
  if (primary && primary !== 'unknown') return [primary];

  return [];
}

// ── Scope intersection helper ─────────────────────────────────────────────────

export function scopesIntersect(scopeA: string[], scopeB: string[]): boolean {
  const setB = new Set(scopeB.map(s => s.toLowerCase()));
  return scopeA.some(a => setB.has(a.toLowerCase()));
}