/**
 * CANONICAL ACCESS SUMMARY SYSTEM
 *
 * Rules:
 * - activeModules only contains modules that are BOTH entitled AND released
 * - Only modules whose effective release state is 'launched' pass through for normal users
 * - WhiskeyKeeper is now publicly launched — paid subscribers gain full access
 * - Admin/internal testers bypass release-state gating
 * - Founding members get all 4 modules (subject to release-state gate)
 * - Never fabricate module access from CollectionKeeper shell presence
 * - Never infer all modules from tier === 'pro' alone
 */

import {
  getEffectiveModuleReleaseState,
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';
import { getEntitlementTier } from '@/components/utils/premiumAccess';

const STRIPE_PRODUCT_MAP = {
  founders_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper'], billingPeriod: 'monthly' },
  founders_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper'], billingPeriod: 'annual' },

  pipekeeper_pro_monthly: { modules: ['pipekeeper'], billingPeriod: 'monthly' },
  pipekeeper_pro_annual: { modules: ['pipekeeper'], billingPeriod: 'annual' },
  whiskeykeeper_pro_monthly: { modules: ['whiskeykeeper'], billingPeriod: 'monthly' },
  whiskeykeeper_pro_annual: { modules: ['whiskeykeeper'], billingPeriod: 'annual' },
  cigarkeeper_pro_monthly: { modules: ['cigarkeeper'], billingPeriod: 'monthly' },
  cigarkeeper_pro_annual: { modules: ['cigarkeeper'], billingPeriod: 'annual' },
  winekeeper_pro_monthly: { modules: ['winekeeper'], billingPeriod: 'monthly' },
  winekeeper_pro_annual: { modules: ['winekeeper'], billingPeriod: 'annual' },

  three_module_bundle_monthly: { modules: [], billingPeriod: 'monthly' },
  three_module_bundle_annual: { modules: [], billingPeriod: 'annual' },
  four_module_bundle_monthly: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], billingPeriod: 'monthly' },
  four_module_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], billingPeriod: 'annual' },
};

const VALID_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

/**
 * Filter modules by effective release state.
 * Normal users: only 'launched' modules pass through.
 * Admin/internal testers: all modules pass through unchanged.
 */
function filterModulesByReleaseState(modules, user) {
  if (!Array.isArray(modules)) return [];
  if (isInternalModuleTester(user)) return modules;
  return modules.filter((m) => getEffectiveModuleReleaseState(m, user) === 'launched');
}

function resolveTier(user, subscription) {
  const canonical = getEntitlementTier(user, subscription);
  return canonical === 'pro' ? 'pro' : 'free';
}

function resolveProvider(user, subscription) {
  const provider = user?.subscription_provider || subscription?.provider || null;
  return provider === 'stripe' || provider === 'apple' ? provider : null;
}

function resolveStatus(subscription) {
  if (!subscription) return 'inactive';
  const status = String(subscription?.status || '').toLowerCase();
  if (['active', 'trialing', 'past_due', 'canceled', 'incomplete'].includes(status)) return status;
  return 'inactive';
}

function parseModulesCsv(value) {
  return [...new Set(
    String(value || '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter((m) => VALID_MODULES.includes(m))
  )];
}

function parseMetadataModules(subscription) {
  const metadata = subscription?.metadata || {};

  if (Array.isArray(metadata?.activeModules)) {
    return metadata.activeModules.map((m) => String(m || '').trim().toLowerCase()).filter((m) => VALID_MODULES.includes(m));
  }

  if (typeof metadata?.activeModules === 'string') {
    try {
      const parsed = JSON.parse(metadata.activeModules);
      if (Array.isArray(parsed)) {
        return parsed.map((m) => String(m || '').trim().toLowerCase()).filter((m) => VALID_MODULES.includes(m));
      }
    } catch {
      // fall through
    }
  }

  return parseModulesCsv(
    metadata?.modules_csv ||
    subscription?.modules_csv ||
    subscription?.paid_modules_csv ||
    subscription?.active_modules_csv
  );
}

function mapSubscriptionToModules(subscription) {
  const planKey =
    subscription?.plan_key ||
    subscription?.planKey ||
    subscription?.plan ||
    subscription?.product_id ||
    null;

  if (!planKey) {
    return { modules: [], planKey: null, billingPeriod: null };
  }

  const mapped = STRIPE_PRODUCT_MAP[planKey] || null;
  if (!mapped) {
    const metadataModules = parseMetadataModules(subscription);
    return {
      modules: metadataModules,
      planKey,
      billingPeriod: planKey.includes('annual') ? 'annual' : planKey.includes('monthly') ? 'monthly' : null,
    };
  }

  let modules = [...mapped.modules];

  if (planKey.startsWith('three_module_bundle_')) {
    const metadataModules = parseMetadataModules(subscription);
    // Use metadata modules if present; otherwise keep empty
    modules = metadataModules.length ? metadataModules.slice(0, 3) : [];
  }

  return { modules, planKey, billingPeriod: mapped.billingPeriod };
}

export function buildAccessSummary(user, subscription) {
  const tier = resolveTier(user, subscription);
  const provider = resolveProvider(user, subscription);
  const status = resolveStatus(subscription);

  let billingPeriod = null;
  let activeModules = [];
  let planKey = null;

  if (tier === 'pro' && subscription) {
    const mapped = mapSubscriptionToModules(subscription);
    activeModules = mapped.modules;
    planKey = mapped.planKey;
    billingPeriod = mapped.billingPeriod;
  }

  // User-level fallback if the subscription row is stale but User was already updated.
  if (tier === 'pro' && activeModules.length === 0) {
    activeModules = parseModulesCsv(user?.paid_modules_csv);
  }

  // If tier is pro but modules are still unresolved, preserve empty state honestly.
  // The UI should show a syncing / restore-needed message instead of fabricating access.
  // Do NOT default to pipekeeper — that masks entitlement sync failures.

  const isFoundingMember = user?.isFoundingMember === true;
  if (isFoundingMember && tier === 'pro') {
    // Founding members are entitled to all 4 modules — but only those that are released.
    // Release-state filter below handles gating until WK/CigarK/WineK launch.
    activeModules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
    planKey = planKey || 'founders_bundle_annual';
    billingPeriod = billingPeriod || 'annual';
  }

  // ─── RELEASE-STATE GATE ───────────────────────────────────────────────────
  // Filter activeModules to only those whose effective release state is 'launched'.
  // Admin/internal testers bypass this filter — all their entitled modules pass through.
  // This is the single enforcement point that prevents WhiskeyKeeper (state: 'internal')
  // from appearing in normal users' activeModules before it officially launches.
  activeModules = filterModulesByReleaseState(activeModules, user);

  // Safety: ensure activeModules is always an array
  if (!activeModules || activeModules.length === 0) {
    activeModules = [];
  }

  return {
    tier,
    status,
    billingPeriod,
    provider,
    activeModules,
    planKey,
    isFoundingMember,
  };
}
