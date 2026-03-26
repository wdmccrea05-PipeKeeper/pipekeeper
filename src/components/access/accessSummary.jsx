/**
 * CANONICAL ACCESS SUMMARY SYSTEM
 * Hotfix goals:
 * - correctly map current plan keys (three_module_bundle / four_module_bundle)
 * - derive active modules from modules_csv / activeModules metadata when present
 * - fail safely to PipeKeeper for ambiguous Pro access in the current release
 */

const STRIPE_PRODUCT_MAP = {
  founders_bundle_annual: { modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], billingPeriod: 'annual' },

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

function normalizeTier(tier) {
  const t = String(tier || '').trim().toLowerCase();
  if (['pro', 'premium', 'paid', 'plus', 'subscriber'].includes(t)) return 'pro';
  if (t.startsWith('bundle_')) return 'pro';
  return 'free';
}

function subscriptionGrantsPaidAccess(subscription) {
  if (!subscription) return false;
  const status = String(subscription?.status || '').toLowerCase();
  // 'incomplete' intentionally excluded — payment has not been confirmed
  return ['active', 'trialing', 'past_due'].includes(status);
}

function resolveTier(user, subscription) {
  if (user?.role === 'admin' || user?.is_admin === true) return 'pro';

  const userTier = user?.entitlement_tier || user?.tier || user?.data?.entitlement_tier || user?.subscription_tier;
  if (normalizeTier(userTier) === 'pro') return 'pro';

  if (subscriptionGrantsPaidAccess(subscription)) return 'pro';
  return 'free';
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
  return String(value || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m) => VALID_MODULES.includes(m));
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
    modules = metadataModules.length ? metadataModules.slice(0, 3) : ['pipekeeper'];
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
    activeModules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
    planKey = 'founders_bundle_annual';
    billingPeriod = 'annual';
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