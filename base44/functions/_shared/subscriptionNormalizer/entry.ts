/**
 * Canonical subscription normalizer shared across Deno edge functions.
 *
 * This file is the single source of truth for:
 *   - PLAN_CATALOG (plan keys, modules, prices, intervals)
 *   - inferFromAmount (billing interval and module inference from known prices)
 *   - modulesFromPlanKey (canonical founders = PK+WK, NOT 4 modules)
 *   - buildPriceIdToPlanKeyMap (env-var-based price ID → planKey resolution)
 *   - normalizeSub (raw subscription row → NormalizedSubscription)
 *
 * ============================================================
 * CANONICAL RULES (source of truth)
 * ============================================================
 *
 * 1. Founders bundle = PipeKeeper + WhiskeyKeeper ONLY (2 modules, $4.99/mo, $49.99/yr).
 *    Do NOT map founders to 4 modules anywhere in the codebase.
 *
 * 2. Valid prices (current and legacy):
 *    1.99 / 19.99   → legacy single-module (monthly/annual)
 *    2.99 / 29.99   → pro single-module (monthly/annual)
 *    4.99 / 49.99   → founders bundle PK+WK (monthly/annual)
 *    7.99 / 79.99   → 3-module bundle (monthly/annual)
 *    8.99 / 89.99   → 4-module bundle (monthly/annual)
 *
 * 3. INVALID prices: 9.99 / 99.99 — do not treat as known plans.
 *
 * 4. Module resolution priority (NEVER defaults to 'pipekeeper'):
 *    a. planKey → PLAN_CATALOG (authoritative)
 *    b. modules_csv field
 *    c. primary_module field
 *    d. Bundle amount inference (resolves modules from price)
 *    e. 'unknown' — never defaults to PipeKeeper
 *
 * ============================================================
 * USAGE
 * ============================================================
 *
 * Import from the Deno function that needs it:
 *   import { normalizeSub, PLAN_CATALOG } from "../_shared/subscriptionNormalizer/entry.ts";
 *
 * NOTE: This object is intentionally duplicated in:
 *   - src/lib/reportingV3Utils.js (for vitest testing in Node)
 *   - base44/functions/getUserSubscriptionReportV3/entry.ts (inline for Deno)
 * Keep all three in sync when editing any of them.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntervalKind = 'monthly' | 'annual';
export type PlatformKind = 'ios' | 'web' | 'google';

export interface PlanCatalogEntry {
  modules: string[];
  billingInterval: IntervalKind;
  price: number;
  label: string;
}

export interface AmountInference {
  billingInterval: IntervalKind;
  modules: string[] | null; // null for singles (module can't be determined from price alone)
  isBundle: boolean;
  label: string;
}

export interface NormalizedSubscription {
  rawId: string;
  userId: string;
  userEmail: string;
  isPaid: boolean;
  planKey: string | null;
  billingInterval: IntervalKind | null;
  price: number | null;
  inferredPrice: boolean;
  renewalAmount: number | null;
  createdAt: Date | null;
  renewalAt: Date | null;
  module: string;
  modules: string[];
  isBundle: boolean;
  platform: PlatformKind | null;
  productLabel: string;
}

// ─── PLAN_CATALOG ─────────────────────────────────────────────────────────────

/**
 * Canonical plan catalog.
 *
 * Founders bundle = PK+WK (2 modules). Do NOT map founders to 4 modules.
 */
export const PLAN_CATALOG: Record<string, PlanCatalogEntry> = {
  // ── Legacy "premium" single-module plans ──────────────────────────────────
  pipekeeper_premium_monthly:    { modules: ['pipekeeper'],              billingInterval: 'monthly', price: 1.99,  label: 'PipeKeeper (Legacy)'           },
  pipekeeper_premium_annual:     { modules: ['pipekeeper'],              billingInterval: 'annual',  price: 19.99, label: 'PipeKeeper (Legacy Annual)'    },
  whiskeykeeper_premium_monthly: { modules: ['whiskeykeeper'],           billingInterval: 'monthly', price: 1.99,  label: 'WhiskeyKeeper (Legacy)'        },
  whiskeykeeper_premium_annual:  { modules: ['whiskeykeeper'],           billingInterval: 'annual',  price: 19.99, label: 'WhiskeyKeeper (Legacy Annual)' },

  // ── Current "pro" single-module plans ─────────────────────────────────────
  pipekeeper_pro_monthly:        { modules: ['pipekeeper'],              billingInterval: 'monthly', price: 2.99,  label: 'PipeKeeper Pro' },
  pipekeeper_pro_annual:         { modules: ['pipekeeper'],              billingInterval: 'annual',  price: 29.99, label: 'PipeKeeper Pro Annual' },
  whiskeykeeper_pro_monthly:     { modules: ['whiskeykeeper'],           billingInterval: 'monthly', price: 2.99,  label: 'WhiskeyKeeper Pro' },
  whiskeykeeper_pro_annual:      { modules: ['whiskeykeeper'],           billingInterval: 'annual',  price: 29.99, label: 'WhiskeyKeeper Pro Annual' },
  cigarkeeper_pro_monthly:       { modules: ['cigarkeeper'],             billingInterval: 'monthly', price: 2.99,  label: 'CigarKeeper Pro' },
  cigarkeeper_pro_annual:        { modules: ['cigarkeeper'],             billingInterval: 'annual',  price: 29.99, label: 'CigarKeeper Pro Annual' },
  winekeeper_pro_monthly:        { modules: ['winekeeper'],              billingInterval: 'monthly', price: 2.99,  label: 'WineKeeper Pro' },
  winekeeper_pro_annual:         { modules: ['winekeeper'],              billingInterval: 'annual',  price: 29.99, label: 'WineKeeper Pro Annual' },

  // ── Founders bundle: PipeKeeper + WhiskeyKeeper ONLY ($4.99/mo, $49.99/yr) ─
  // CANONICAL: 2 modules. Do NOT use 4 modules for founders anywhere.
  founders_bundle_monthly:       { modules: ['pipekeeper', 'whiskeykeeper'],                              billingInterval: 'monthly', price: 4.99,  label: 'Founders Bundle (PK+WK)' },
  founders_bundle_annual:        { modules: ['pipekeeper', 'whiskeykeeper'],                              billingInterval: 'annual',  price: 49.99, label: 'Founders Bundle Annual (PK+WK)' },

  // ── Larger bundles ────────────────────────────────────────────────────────
  three_module_bundle_monthly:   { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],               billingInterval: 'monthly', price: 7.99,  label: '3-Module Bundle' },
  three_module_bundle_annual:    { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],               billingInterval: 'annual',  price: 79.99, label: '3-Module Bundle Annual' },
  four_module_bundle_monthly:    { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], billingInterval: 'monthly', price: 8.99,  label: '4-Module Bundle' },
  four_module_bundle_annual:     { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], billingInterval: 'annual',  price: 89.99, label: '4-Module Bundle Annual' },
};

export function lookupPlanCatalog(planKey: string | null): PlanCatalogEntry | null {
  if (!planKey) return null;
  return PLAN_CATALOG[planKey.trim().toLowerCase()] ?? null;
}

// ─── Amount inference ─────────────────────────────────────────────────────────

/**
 * Infer billing attributes from a known subscription amount.
 *
 * Returns null for invalid/unrecognized amounts (e.g., 9.99, 99.99).
 * For single-module amounts, `modules` is null — the module cannot be
 * determined from the price alone.
 */
export function inferFromAmount(amount: number): AmountInference | null {
  const a = parseFloat(Number(amount).toFixed(2));
  if (a === 1.99)  return { billingInterval: 'monthly', modules: null, isBundle: false, label: 'Legacy Premium' };
  if (a === 19.99) return { billingInterval: 'annual',  modules: null, isBundle: false, label: 'Legacy Premium Annual' };
  if (a === 2.99)  return { billingInterval: 'monthly', modules: null, isBundle: false, label: 'Pro' };
  if (a === 29.99) return { billingInterval: 'annual',  modules: null, isBundle: false, label: 'Pro Annual' };
  // Founders bundle: PK + WK ONLY (2 modules)
  if (a === 4.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true, label: 'Founders Bundle (PK+WK)' };
  if (a === 49.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper'], isBundle: true, label: 'Founders Bundle Annual (PK+WK)' };
  if (a === 7.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true, label: '3-Module Bundle' };
  if (a === 79.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], isBundle: true, label: '3-Module Bundle Annual' };
  if (a === 8.99)  return { billingInterval: 'monthly', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle' };
  if (a === 89.99) return { billingInterval: 'annual',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle Annual' };
  return null;
}

// ─── PlanKey from price ID ────────────────────────────────────────────────────

/**
 * Build a price ID → planKey map from env vars at call time.
 * Used by syncSubscriptionForMe, stripeWebhook, repairStripeByEmail, repairStripeTiers.
 */
export function buildPriceIdToPlanKeyMap(): Record<string, string> {
  // deno-lint-ignore no-explicit-any
  const e: any = typeof Deno !== 'undefined' ? Deno.env : { get: () => '' };
  return {
    [e.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']:    'pipekeeper_pro_monthly',
    [e.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']:     'pipekeeper_pro_annual',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: 'whiskeykeeper_pro_monthly',
    [e.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']:  'whiskeykeeper_pro_annual',
    [e.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']:   'cigarkeeper_pro_monthly',
    [e.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']:    'cigarkeeper_pro_annual',
    [e.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']:    'winekeeper_pro_monthly',
    [e.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']:     'winekeeper_pro_annual',
    [e.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']:  'three_module_bundle_monthly',
    [e.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']:   'three_module_bundle_annual',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']:   'four_module_bundle_monthly',
    [e.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']:    'four_module_bundle_annual',
    [e.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']:      'founders_bundle_monthly',
    [e.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']:       'founders_bundle_annual',
  };
}

// ─── Module resolution from planKey ──────────────────────────────────────────

/**
 * Canonical module list from planKey.
 * Founders = PK+WK (2 modules). four_module = all 4.
 *
 * Returns [] (empty) when planKey is unknown — do NOT default to pipekeeper.
 */
export function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (key.startsWith('winekeeper_'))    return ['winekeeper'];
  if (key.includes('three_module'))     return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module'))      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders'))         return ['pipekeeper', 'whiskeykeeper']; // 2 modules, NOT 4
  return [];
}

// ─── Apple product ID resolution ─────────────────────────────────────────────

/**
 * Resolve an Apple App Store product ID to a canonical planKey + modules.
 *
 * Bundles are checked FIRST because bundle IDs may contain single-module
 * keywords (e.g. a 3-module product ID might contain "whiskey").
 *
 * Mirrors resolveAppleProductAccess in syncAppleSubscriptionForMe — keep both
 * in sync when editing.
 */
export function resolveAppleProductId(productId: string): {
  planKey: string;
  modules: string[];
  productKind: string;
  billingInterval: IntervalKind;
} | null {
  const product = String(productId || '').trim().toLowerCase();
  if (!product) return null;
  const isAnnual = product.includes('annual') || product.includes('year');

  // 4-module / all-modules bundle
  if (product.includes('all_module') || product.includes('allmodule') ||
      product.includes('four_module') || product.includes('fourmodule') ||
      product.includes('4_module') || product.includes('4module') ||
      (product.includes('bundle') && product.includes('wine'))) {
    return {
      planKey: isAnnual ? 'four_module_bundle_annual' : 'four_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      productKind: 'bundle_4',
      billingInterval: isAnnual ? 'annual' : 'monthly',
    };
  }

  // 3-module bundle
  if (product.includes('three_module') || product.includes('threemodule') ||
      product.includes('3_module') || product.includes('3module') ||
      (product.includes('bundle') && !product.includes('wine') && !product.includes('founders'))) {
    return {
      planKey: isAnnual ? 'three_module_bundle_annual' : 'three_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      productKind: 'bundle_3',
      billingInterval: isAnnual ? 'annual' : 'monthly',
    };
  }

  // Founders bundle (2 modules: PK + WK)
  if (product.includes('founders')) {
    return {
      planKey: isAnnual ? 'founders_bundle_annual' : 'founders_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper'],
      productKind: 'founders',
      billingInterval: isAnnual ? 'annual' : 'monthly',
    };
  }

  // Single modules
  if (product.includes('whiskey')) {
    return { planKey: isAnnual ? 'whiskeykeeper_pro_annual' : 'whiskeykeeper_pro_monthly', modules: ['whiskeykeeper'], productKind: 'single', billingInterval: isAnnual ? 'annual' : 'monthly' };
  }
  if (product.includes('cigar')) {
    return { planKey: isAnnual ? 'cigarkeeper_pro_annual' : 'cigarkeeper_pro_monthly', modules: ['cigarkeeper'], productKind: 'single', billingInterval: isAnnual ? 'annual' : 'monthly' };
  }
  if (product.includes('wine')) {
    return { planKey: isAnnual ? 'winekeeper_pro_annual' : 'winekeeper_pro_monthly', modules: ['winekeeper'], productKind: 'single', billingInterval: isAnnual ? 'annual' : 'monthly' };
  }
  if (product.includes('pipe') || product.includes('pipekeeper')) {
    return { planKey: isAnnual ? 'pipekeeper_pro_annual' : 'pipekeeper_pro_monthly', modules: ['pipekeeper'], productKind: 'single', billingInterval: isAnnual ? 'annual' : 'monthly' };
  }

  // Unrecognized — return null so callers can mark as unknown/needs_review
  return null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function norm(v: unknown): string { return String(v ?? '').trim().toLowerCase(); }

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeInterval(raw: Record<string, unknown>): IntervalKind | null {
  const v = norm(raw.billing_interval || raw.billing_period || '');
  if (v === 'month' || v === 'monthly') return 'monthly';
  if (v === 'year' || v === 'yearly' || v === 'annual') return 'annual';
  return null;
}

function normalizePlatform(raw: Record<string, unknown>, user: Record<string, unknown> | null): PlatformKind | null {
  const provider = norm(raw.provider || '');
  if (provider === 'apple' || provider === 'ios') return 'ios';
  if (provider === 'google' || provider === 'android' || provider === 'googleplay') return 'google';
  if (provider === 'stripe' || provider === 'web') return 'web';
  if (user) {
    const dataVal = user.data as Record<string, unknown> | undefined;
    const up = norm(dataVal?.platform || user.platform || '');
    if (up === 'apple' || up === 'ios') return 'ios';
    if (up === 'android' || up === 'googleplay' || up === 'google') return 'google';
    if (up && up !== 'unknown') return 'web';
  }
  return null;
}

function isActivePaid(raw: Record<string, unknown>): boolean {
  const status = norm(raw.status);
  const amount = Math.max(0, Number(raw.amount || 0));
  if (status === 'active') return true;
  if (status === 'trialing' && amount > 0) return true;
  if (status === 'past_due') return true;
  return false;
}

function buildProductLabel(modules: string[], baseLabel: string): string {
  if (modules.length > 1) return baseLabel;
  const m = modules[0];
  if (m === 'pipekeeper')    return 'PipeKeeper';
  if (m === 'whiskeykeeper') return 'WhiskeyKeeper';
  if (m === 'cigarkeeper')   return 'CigarKeeper';
  if (m === 'winekeeper')    return 'WineKeeper';
  return baseLabel;
}

// ─── normalizeSub ─────────────────────────────────────────────────────────────

/**
 * Normalize a raw subscription row into a canonical NormalizedSubscription.
 *
 * Module resolution priority (NEVER defaults to 'pipekeeper'):
 *   1. planKey → PLAN_CATALOG (authoritative)
 *   2. modules_csv stored field
 *   3. primary_module stored field
 *   4. Amount inference for bundle prices (resolves modules definitively)
 *   5. 'unknown' — truly unresolvable rows stay unknown
 *
 * @param raw   Raw subscription record (from DB or Stripe)
 * @param user  Optional user record for platform fallback
 */
export function normalizeSub(
  raw: Record<string, unknown>,
  user: Record<string, unknown> | null = null,
): NormalizedSubscription {
  const planKey = norm(raw.planKey || raw.plan_key || '') || null;
  const catalog = lookupPlanCatalog(planKey);

  const rawAmount = Math.max(0, Number(raw.amount || 0));
  const amountInference = rawAmount > 0 ? inferFromAmount(rawAmount) : null;

  // Price: actual billed amount → catalog price → null
  const inferredPrice = rawAmount === 0 && catalog != null;
  const price: number | null = rawAmount > 0 ? rawAmount : (catalog?.price ?? null);
  const renewalAmount = price;

  // Billing interval: field → catalog → amount inference → null
  const fieldInterval = normalizeInterval(raw as Record<string, unknown>);
  const billingInterval: IntervalKind | null =
    fieldInterval ??
    (catalog?.billingInterval ?? null) ??
    (amountInference?.billingInterval ?? null);

  // Module resolution — NEVER defaults to 'pipekeeper'
  let modules: string[];
  let productLabel: string;

  if (catalog) {
    modules = catalog.modules;
    productLabel = buildProductLabel(catalog.modules, catalog.label);
  } else {
    const csvModules = String(raw.modules_csv || '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);

    if (csvModules.length > 0) {
      modules = csvModules;
      productLabel = buildProductLabel(modules, modules.length > 1 ? 'Bundle' : modules[0]);
    } else if (norm(raw.primary_module || '')) {
      modules = [norm(raw.primary_module as string)];
      productLabel = buildProductLabel(modules, modules[0]);
    } else if (amountInference?.modules) {
      modules = amountInference.modules;
      productLabel = amountInference.label;
    } else {
      // Apple product ID fallback — resolve from raw product_id when planKey/csv/amount all miss
      const productId = norm(raw.product_id || '');
      const provider = norm(raw.provider || '');
      const appleResolved = provider === 'apple' && productId ? resolveAppleProductId(productId) : null;
      if (appleResolved) {
        modules = appleResolved.modules;
        productLabel = appleResolved.productKind === 'single' ? buildProductLabel(modules, modules[0]) : 'Bundle';
      } else {
        modules = ['unknown'];
        productLabel = 'Unknown';
      }
    }
  }

  return {
    rawId:          String(raw.id || raw.stripe_subscription_id || ''),
    userId:         String(raw.user_id || ''),
    userEmail:      norm(raw.user_email as string || ''),
    isPaid:         isActivePaid(raw),
    planKey,
    billingInterval,
    price,
    inferredPrice,
    renewalAmount,
    createdAt:      parseDate(raw.started_at || raw.created_date || raw.current_period_start),
    renewalAt:      parseDate(raw.current_period_end),
    module:         modules[0],
    modules,
    isBundle:       modules.length > 1,
    platform:       normalizePlatform(raw as Record<string, unknown>, user),
    productLabel,
  };
}

// ─── MRR contribution ─────────────────────────────────────────────────────────

export function mrrContribution(sub: NormalizedSubscription): number {
  if (!sub.isPaid || sub.price === null) return 0;
  if (sub.billingInterval === 'monthly') return sub.price;
  if (sub.billingInterval === 'annual')  return sub.price / 12;
  return 0;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Get the product-family key for deduplication.
 *
 * Bundles dedup by sorted module list.
 * Singles dedup by module name.
 * Unknown products do NOT collapse — each gets its own key.
 */
export function getProductFamilyKey(sub: NormalizedSubscription): string {
  if (sub.isBundle) return 'bundle::' + [...sub.modules].sort().join(',');
  if (sub.module === 'unknown') {
    // Unknown products do not collapse — use rawId as unique identifier.
    return 'unknown::' + (sub.rawId || sub.userEmail || sub.planKey || sub.userId || 'empty');
  }
  return 'single::' + sub.module;
}

/**
 * Deduplicate normalized subscriptions by (userIdentity, productFamily).
 * Keeps the most recent row per grouping.
 */
export function deduplicateActivePaidSubs(
  subs: NormalizedSubscription[],
): { deduped: NormalizedSubscription[]; duplicatesRemoved: number } {
  const byKey = new Map<string, NormalizedSubscription>();
  let duplicatesRemoved = 0;

  for (const sub of subs) {
    const userKey = sub.userId || sub.userEmail;
    if (!userKey) continue;
    const dedupKey = `${userKey}::${getProductFamilyKey(sub)}`;
    const existing = byKey.get(dedupKey);
    if (!existing) {
      byKey.set(dedupKey, sub);
    } else {
      duplicatesRemoved++;
      const existingTs = existing.createdAt?.getTime() ?? 0;
      if ((sub.createdAt?.getTime() ?? 0) > existingTs) byKey.set(dedupKey, sub);
    }
  }

  return { deduped: [...byKey.values()], duplicatesRemoved };
}