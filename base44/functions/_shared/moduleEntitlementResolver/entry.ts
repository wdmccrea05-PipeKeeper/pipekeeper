/**
 * Shared Module Entitlement Resolver
 *
 * Single source of truth for resolving which paid modules a user has access to.
 * Used by reconcileEntitlementsOnLogin, syncSubscriptionForMe, reconcileEntitlementsBatch,
 * repairUserEntitlementByEmail, fixUserEntitlements, and auditAndRepairModuleEntitlements.
 *
 * NON-NEGOTIABLE RULES:
 * - There is no global Pro tier. Pro is module-specific.
 * - Never downgrade an active subscriber due to blank/stale modules_csv.
 * - Only clear module flags when there is confirmed NO active subscription from any source.
 * - If an active subscription exists but module cannot be resolved:
 *     preserve existing flags, set entitlement_sync_state = 'needs_review'.
 */

// ── Hardcoded price ID → module mapping ───────────────────────────────────────
// These are canonical and must never be derived from env vars alone.
// Env-var-based mapping is checked AFTER these hardcoded IDs.

export const HARDCODED_PRICE_TO_MODULES: Record<string, string[]> = {
  // PipeKeeper
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'], // PipeKeeper Monthly
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'], // PipeKeeper Annual
  // WhiskeyKeeper
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'], // WhiskeyKeeper Monthly
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'], // WhiskeyKeeper Annual
  // CigarKeeper
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'], // CigarKeeper Monthly
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'], // CigarKeeper Annual
  // Founders Bundle (PipeKeeper + WhiskeyKeeper ONLY)
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'], // Founders Bundle Monthly
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'], // Founders Bundle Annual
  // 3-Module Bundle
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], // 3-Module Bundle Monthly
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], // 3-Module Bundle Annual
};

// ── Plan key → module mapping ─────────────────────────────────────────────────

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

// ── Price ID extraction from subscription records ─────────────────────────────

export function extractPriceId(record: Record<string, unknown>): string | null {
  if (!record) return null;
  // Direct fields
  if (record.price_id && typeof record.price_id === 'string') return record.price_id;
  if (record.stripe_price_id && typeof record.stripe_price_id === 'string') return record.stripe_price_id;
  if (record.productId && typeof record.productId === 'string') return record.productId;
  if (record.product_id && typeof record.product_id === 'string') return record.product_id;
  // Metadata object
  const meta = record.metadata;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    if (m.price_id && typeof m.price_id === 'string') return m.price_id;
    if (m.stripe_price_id && typeof m.stripe_price_id === 'string') return m.stripe_price_id;
  }
  // Metadata as JSON string
  if (meta && typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta) as Record<string, unknown>;
      if (parsed.price_id && typeof parsed.price_id === 'string') return parsed.price_id;
      if (parsed.stripe_price_id && typeof parsed.stripe_price_id === 'string') return parsed.stripe_price_id;
    } catch { /* ignore */ }
  }
  // Raw payload
  const rawPayload = record.raw_payload;
  if (rawPayload) {
    try {
      const payload = typeof rawPayload === 'string'
        ? JSON.parse(rawPayload) as Record<string, unknown>
        : rawPayload as Record<string, unknown>;
      const items = (payload as any)?.items;
      if (Array.isArray(items) && items[0]?.price?.id) return items[0].price.id;
      if (payload.price_id && typeof payload.price_id === 'string') return payload.price_id;
    } catch { /* ignore */ }
  }
  return null;
}

// ── Build env-var price ID map (secondary lookup) ─────────────────────────────

function buildEnvPriceMap(): Record<string, string[]> {
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

// ── Resolve modules from a single subscription record ─────────────────────────

export function resolveModulesFromRecord(record: Record<string, unknown>, envPriceMap: Record<string, string[]>): string[] {
  // 1. Try price_id → hardcoded map (authoritative)
  const priceId = extractPriceId(record);
  if (priceId) {
    const hardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
    if (hardcoded) return hardcoded;
    const fromEnv = envPriceMap[priceId];
    if (fromEnv) return fromEnv;
  }
  // 2. Try plan_key / planKey
  const planKey = String(record.plan_key || record.planKey || '').trim();
  if (planKey) {
    const fromKey = modulesFromPlanKey(planKey);
    if (fromKey.length > 0) return fromKey;
  }
  // 3. Try modules_csv
  const csv = String(record.modules_csv || '').trim();
  if (csv) {
    const mods = csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (mods.length > 0) return mods;
  }
  // 4. Try primary_module
  const primary = String(record.primary_module || '').trim().toLowerCase();
  if (primary && primary !== 'unknown') return [primary];
  return [];
}

// ── Active status check ────────────────────────────────────────────────────────

export function isActiveStatus(status: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'incomplete';
}

// ── Unique helper ─────────────────────────────────────────────────────────────

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// ── Main resolver result type ─────────────────────────────────────────────────

export interface ModuleEntitlementResult {
  /** All resolved paid modules (e.g. ['pipekeeper', 'whiskeykeeper']) */
  modules: string[];
  /** true if any active subscription was found */
  hasPaidAccess: boolean;
  /** true if active subscription found but modules could not be resolved */
  hasUnresolvedSubscription: boolean;
  /** 'synced' | 'needs_review' | 'free' */
  syncState: 'synced' | 'needs_review' | 'free';
  /** all price IDs found across active subscriptions */
  priceIds: string[];
  /** subscription sources used */
  sources: string[];
  /** log messages for debugging */
  logs: string[];
}

// ── Resolve module entitlements from DB subscriptions ─────────────────────────

export async function resolveModuleEntitlements(
  base44: any,
  email: string,
  userId: string,
  existingUser: Record<string, unknown> | null = null,
): Promise<ModuleEntitlementResult> {
  const logs: string[] = [];
  const envPriceMap = buildEnvPriceMap();
  const allModules = new Set<string>();
  const allPriceIds: string[] = [];
  const sources: string[] = [];
  let hasActiveSubscription = false;
  let hasUnresolvedSubscription = false;

  // ── Source 1: Subscription table ─────────────────────────────────────────
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    const activeSubs = (Array.isArray(subs) ? subs : []).filter((s: any) =>
      isActiveStatus(String(s.status || ''))
    );

    if (activeSubs.length > 0) {
      hasActiveSubscription = true;
      sources.push('Subscription');
      for (const sub of activeSubs) {
        const priceId = extractPriceId(sub);
        if (priceId) allPriceIds.push(priceId);
        const mods = resolveModulesFromRecord(sub, envPriceMap);
        if (mods.length > 0) {
          mods.forEach(m => allModules.add(m));
        } else {
          hasUnresolvedSubscription = true;
          logs.push(`[moduleEntitlementResolver] Active Subscription/${sub.id || 'unknown'} for ${email} - could not resolve modules (priceId=${priceId || 'none'})`);
        }
      }
    }
  } catch (err: any) {
    logs.push(`[moduleEntitlementResolver] Subscription query failed for ${email}: ${err?.message}`);
  }

  // ── Source 2: ActiveContract table ───────────────────────────────────────
  try {
    const contracts = await base44.asServiceRole.entities.ActiveContract.filter({ is_active: true });
    const matching = (Array.isArray(contracts) ? contracts : []).filter((ac: any) =>
      (ac.user_email && String(ac.user_email).trim().toLowerCase() === email) ||
      (ac.user_id && ac.user_id === userId)
    );

    if (matching.length > 0) {
      hasActiveSubscription = true;
      if (!sources.includes('ActiveContract')) sources.push('ActiveContract');
      for (const ac of matching) {
        const priceId = extractPriceId(ac);
        if (priceId && !allPriceIds.includes(priceId)) allPriceIds.push(priceId);
        const mods = resolveModulesFromRecord(ac, envPriceMap);
        if (mods.length > 0) {
          mods.forEach(m => allModules.add(m));
        } else {
          hasUnresolvedSubscription = true;
          logs.push(`[moduleEntitlementResolver] ActiveContract/${ac.id || 'unknown'} for ${email} - could not resolve modules (priceId=${priceId || 'none'})`);
        }
      }
    }
  } catch { /* ActiveContract may not exist — silent fail */ }

  // ── Determine sync state ─────────────────────────────────────────────────
  if (!hasActiveSubscription) {
    return {
      modules: [],
      hasPaidAccess: false,
      hasUnresolvedSubscription: false,
      syncState: 'free',
      priceIds: allPriceIds,
      sources,
      logs,
    };
  }

  if (allModules.size === 0) {
    // Active subscription found but modules cannot be resolved.
    // Preserve existing paid module flags — do NOT downgrade.
    const preserved = buildPreservedModules(existingUser);
    logs.push(`[moduleEntitlementResolver] Active subscription for ${email} but no modules resolved. Preserving existing: [${preserved.join(',')}]`);
    return {
      modules: preserved,
      hasPaidAccess: true,
      hasUnresolvedSubscription: true,
      syncState: 'needs_review',
      priceIds: allPriceIds,
      sources,
      logs,
    };
  }

  const modules = unique([...allModules]);
  return {
    modules,
    hasPaidAccess: true,
    hasUnresolvedSubscription,
    syncState: hasUnresolvedSubscription ? 'needs_review' : 'synced',
    priceIds: allPriceIds,
    sources,
    logs,
  };
}

// ── Extract existing module flags from user record ────────────────────────────

function buildPreservedModules(user: Record<string, unknown> | null): string[] {
  if (!user) return [];
  const mods: string[] = [];
  // From individual flags
  if (user.pipekeeper_paid)    mods.push('pipekeeper');
  if (user.whiskeykeeper_paid) mods.push('whiskeykeeper');
  if (user.cigarkeeper_paid)   mods.push('cigarkeeper');
  if (user.winekeeper_paid)    mods.push('winekeeper');
  if (mods.length > 0) return mods;
  // From paid_modules_csv
  const csv = String(user.paid_modules_csv || '').trim();
  if (csv) {
    return csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

// ── Build user entitlement update payload ─────────────────────────────────────

export function buildUserEntitlementUpdate(
  result: ModuleEntitlementResult,
  existingUser: Record<string, unknown> | null = null,
): Record<string, unknown> {
  const { modules, hasPaidAccess, syncState } = result;
  const hasBundle = modules.length > 1;

  // When needs_review and modules come from preservation, use existing flags
  const effectiveModules = modules;

  const pipekeeper_paid = effectiveModules.includes('pipekeeper');
  const whiskeykeeper_paid = effectiveModules.includes('whiskeykeeper');
  const cigarkeeper_paid = effectiveModules.includes('cigarkeeper');
  const winekeeper_paid = effectiveModules.includes('winekeeper');

  const entitlementTier = hasPaidAccess
    ? (hasBundle ? `bundle_${effectiveModules.length}` : 'pro')
    : 'free';

  return {
    pipekeeper_paid,
    whiskeykeeper_paid,
    cigarkeeper_paid,
    winekeeper_paid,
    paid_modules_csv: effectiveModules.join(','),
    has_paid_access: hasPaidAccess,
    has_bundle_access: hasBundle,
    entitlement_tier: entitlementTier,
    subscription_level: hasPaidAccess ? 'paid' : 'free',
    entitlement_sync_state: syncState,
    updated_date: new Date().toISOString(),
  };
}
