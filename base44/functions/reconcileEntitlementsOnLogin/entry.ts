/**
 * Reconcile entitlements on login.
 *
 * Intended use:
 * - call immediately after login/app boot
 * - restore local entitlement truth from Subscription rows
 * - optionally refresh from Stripe when customer id is present
 *
 * SAFE BEHAVIOR:
 * - never downgrades an active subscriber due to blank/stale modules_csv
 * - writes all module flags: pipekeeper_paid, whiskeykeeper_paid, cigarkeeper_paid, winekeeper_paid
 * - if active subscription exists but modules unresolved: preserves existing flags,
 *   sets entitlement_sync_state = 'needs_review'
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Hardcoded price ID → module mapping (canonical, non-negotiable) ────────────
const HARDCODED_PRICE_TO_MODULES: Record<string, string[]> = {
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

function normEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function isActiveStatus(status: unknown): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'trialing' || s === 'past_due' || s === 'incomplete';
}

function extractPriceId(record: any): string | null {
  if (!record) return null;
  if (record.price_id) return record.price_id;
  if (record.stripe_price_id) return record.stripe_price_id;
  if (record.productId) return record.productId;
  if (record.product_id) return record.product_id;
  const meta = record.metadata;
  if (meta && typeof meta === 'object') {
    if (meta.price_id) return meta.price_id;
    if (meta.stripe_price_id) return meta.stripe_price_id;
  }
  if (meta && typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta);
      if (parsed.price_id) return parsed.price_id;
      if (parsed.stripe_price_id) return parsed.stripe_price_id;
    } catch { /* ignore */ }
  }
  const raw = record.raw_payload;
  if (raw) {
    try {
      const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (payload?.items?.[0]?.price?.id) return payload.items[0].price.id;
    } catch { /* ignore */ }
  }
  return null;
}

function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (key.startsWith('winekeeper_'))    return ['winekeeper'];
  if (key.includes('three_module'))     return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module'))      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders'))         return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

function buildEnvPriceMap(): Record<string, string[]> {
  const e = Deno.env;
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
  add('VITE_STRIPE_FOUNDERS_MONTHLY', ['pipekeeper', 'whiskeykeeper']);
  add('VITE_STRIPE_FOUNDERS_ANNUAL', ['pipekeeper', 'whiskeykeeper']);
  return map;
}

function resolveModulesFromRecord(record: any, envPriceMap: Record<string, string[]>): string[] {
  // 1. Hardcoded price ID (most authoritative)
  const priceId = extractPriceId(record);
  if (priceId) {
    const fromHardcoded = HARDCODED_PRICE_TO_MODULES[priceId];
    if (fromHardcoded) return fromHardcoded;
    const fromEnv = envPriceMap[priceId];
    if (fromEnv) return fromEnv;
  }
  // 2. Plan key
  const planKey = String(record.plan_key || record.planKey || '').trim();
  if (planKey) {
    const fromKey = modulesFromPlanKey(planKey);
    if (fromKey.length > 0) return fromKey;
  }
  // 3. modules_csv
  const csv = String(record.modules_csv || '').trim();
  if (csv) {
    const mods = csv.split(',').map((m: string) => m.trim().toLowerCase()).filter(Boolean);
    if (mods.length > 0) return mods;
  }
  // 4. primary_module
  const primary = String(record.primary_module || '').trim().toLowerCase();
  if (primary && primary !== 'unknown') return [primary];
  return [];
}

function buildPreservedModules(user: any): string[] {
  if (!user) return [];
  const mods: string[] = [];
  if (user.pipekeeper_paid)    mods.push('pipekeeper');
  if (user.whiskeykeeper_paid) mods.push('whiskeykeeper');
  if (user.cigarkeeper_paid)   mods.push('cigarkeeper');
  if (user.winekeeper_paid)    mods.push('winekeeper');
  if (mods.length > 0) return mods;
  const csv = String(user.paid_modules_csv || '').trim();
  if (csv) return csv.split(',').map((m: string) => m.trim().toLowerCase()).filter(Boolean);
  return [];
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const email = normEmail(me.email);
    const userRows = await base44.asServiceRole.entities.User.filter({ email });
    const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;

    if (!user) {
      return Response.json({ success: false, error: 'User entity not found' }, { status: 404 });
    }

    // Load active subscriptions
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: email });
    const activeSubs = (Array.isArray(subs) ? subs : []).filter((sub: any) =>
      isActiveStatus(sub.status)
    );

    // Also check ActiveContract
    let activeContracts: any[] = [];
    try {
      const contracts = await base44.asServiceRole.entities.ActiveContract.filter({ is_active: true });
      activeContracts = (Array.isArray(contracts) ? contracts : []).filter((ac: any) =>
        (ac.user_email && normEmail(ac.user_email) === email) || ac.user_id === (me.id || me.auth_user_id)
      );
    } catch { /* ActiveContract may not exist */ }

    const hasActiveSubscription = activeSubs.length > 0 || activeContracts.length > 0;

    // If no active subscriptions at all → check for existing paid flags before clearing
    if (!hasActiveSubscription) {
      const preservedModules = buildPreservedModules(user);

      // SAFE RULE: if user has existing paid flags, do NOT clear them just because local
      // subscription lookup returned empty. Preserve and mark for review instead.
      if (preservedModules.length > 0) {
        console.warn(
          `[reconcileEntitlementsOnLogin] No active subscription found for ${email} but user has existing paid flags: [${preservedModules.join(',')}]. Preserving and marking needs_review.`
        );

        await base44.asServiceRole.entities.User.update(user.id, {
          pipekeeper_paid: preservedModules.includes('pipekeeper'),
          whiskeykeeper_paid: preservedModules.includes('whiskeykeeper'),
          cigarkeeper_paid: preservedModules.includes('cigarkeeper'),
          winekeeper_paid: preservedModules.includes('winekeeper'),
          has_paid_access: true,
          entitlement_sync_state: 'needs_review',
          updated_date: new Date().toISOString(),
        });

        return Response.json({
          success: true,
          entitlementTier: user.entitlement_tier || 'pro',
          paidModules: preservedModules,
          hasPaidAccess: true,
          hasBundleAccess: preservedModules.length > 1,
          subscriptionCount: 0,
          syncState: 'needs_review',
          warning: 'No local active subscription found; preserved existing paid modules',
          reason: 'no local active subscription found; preserved existing paid modules',
        });
      }

      // No paid flags and no active subscription → safe to set free
      await base44.asServiceRole.entities.User.update(user.id, {
        pipekeeper_paid: false,
        whiskeykeeper_paid: false,
        cigarkeeper_paid: false,
        winekeeper_paid: false,
        paid_modules_csv: '',
        has_paid_access: false,
        has_bundle_access: false,
        entitlement_tier: 'free',
        subscription_level: 'free',
        entitlement_sync_state: 'synced',
        updated_date: new Date().toISOString(),
      });
      return Response.json({
        success: true,
        entitlementTier: 'free',
        paidModules: [],
        hasPaidAccess: false,
        hasBundleAccess: false,
        subscriptionCount: 0,
        syncState: 'synced',
      });
    }

    // Resolve modules from all active subscriptions
    const envPriceMap = buildEnvPriceMap();
    const allModules = new Set<string>();
    let hasUnresolved = false;

    for (const sub of [...activeSubs, ...activeContracts]) {
      const mods = resolveModulesFromRecord(sub, envPriceMap);
      if (mods.length > 0) {
        mods.forEach(m => allModules.add(m));
      } else {
        hasUnresolved = true;
        console.warn(`[reconcileEntitlementsOnLogin] Could not resolve modules for active sub ${sub.id || 'unknown'} (email=${email}, priceId=${extractPriceId(sub) || 'none'})`);
      }
    }

    // SAFE RULE: if active subscription exists but modules not resolved → preserve existing, mark needs_review
    if (allModules.size === 0) {
      const preserved = buildPreservedModules(user);
      console.warn(`[reconcileEntitlementsOnLogin] Active subscription for ${email} but no modules resolved. Preserving: [${preserved.join(',')}]`);

      await base44.asServiceRole.entities.User.update(user.id, {
        pipekeeper_paid: preserved.includes('pipekeeper'),
        whiskeykeeper_paid: preserved.includes('whiskeykeeper'),
        cigarkeeper_paid: preserved.includes('cigarkeeper'),
        winekeeper_paid: preserved.includes('winekeeper'),
        has_paid_access: true,
        entitlement_sync_state: 'needs_review',
        updated_date: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        entitlementTier: user.entitlement_tier || 'pro',
        paidModules: preserved,
        hasPaidAccess: true,
        hasBundleAccess: preserved.length > 1,
        subscriptionCount: activeSubs.length,
        syncState: 'needs_review',
        warning: 'Active subscription found but modules could not be resolved. Existing flags preserved.',
      });
    }

    const paidModules = unique([...allModules]);
    const hasBundle = paidModules.length > 1;
    const entitlementTier = hasBundle ? `bundle_${paidModules.length}` : 'pro';
    const syncState = hasUnresolved ? 'needs_review' : 'synced';

    await base44.asServiceRole.entities.User.update(user.id, {
      pipekeeper_paid: paidModules.includes('pipekeeper'),
      whiskeykeeper_paid: paidModules.includes('whiskeykeeper'),
      cigarkeeper_paid: paidModules.includes('cigarkeeper'),
      winekeeper_paid: paidModules.includes('winekeeper'),
      paid_modules_csv: paidModules.join(','),
      has_paid_access: true,
      has_bundle_access: hasBundle,
      entitlement_tier: entitlementTier,
      subscription_level: 'paid',
      entitlement_sync_state: syncState,
      updated_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      entitlementTier,
      paidModules,
      hasPaidAccess: true,
      hasBundleAccess: hasBundle,
      subscriptionCount: activeSubs.length,
      syncState,
    });
  } catch (error) {
    console.error('[reconcileEntitlementsOnLogin] fatal error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});
