/**
 * CANONICAL ACCESS SUMMARY SYSTEM
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for user access rights.
 * Combines subscription data, module selections, and tier information into a unified contract.
 *
 * CONTRACT:
 *   type AccessSummary = {
 *     tier: "free" | "pro";
 *     status: SubscriptionStatus;
 *     billingPeriod: "monthly" | "annual" | null;
 *     provider: "stripe" | "apple" | "manual" | null;
 *     activeModules: ModuleKey[];
 *     planKey: string | null;          // e.g., "pipekeeper_pro", "3_module_bundle"
 *     isFoundingMember: boolean;
 *   }
 */

// ModuleKey: "pipekeeper" | "whiskeykeeper" | "cigarkeeper" | "winekeeper"
// SubscriptionStatus: "inactive" | "trialing" | "active" | "past_due" | "canceled" | "grace_period"
// AccessSummary: { tier, status, billingPeriod, provider, activeModules, planKey, isFoundingMember }

/**
 * Stripe product → module mapping.
 * CRITICAL: This MUST match your Stripe pricing configuration exactly.
 */
const STRIPE_PRODUCT_MAP: Record<string, { modules: ModuleKey[]; billingPeriod: "monthly" | "annual" }> = {
  // FOUNDERS (all modules, special legacy tier)
  founders_bundle_annual: { modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"], billingPeriod: "annual" },

  // SINGLE MODULE PRO
  pipekeeper_pro_monthly: { modules: ["pipekeeper"], billingPeriod: "monthly" },
  pipekeeper_pro_annual: { modules: ["pipekeeper"], billingPeriod: "annual" },
  whiskeykeeper_pro_monthly: { modules: ["whiskeykeeper"], billingPeriod: "monthly" },
  whiskeykeeper_pro_annual: { modules: ["whiskeykeeper"], billingPeriod: "annual" },
  cigarkeeper_pro_monthly: { modules: ["cigarkeeper"], billingPeriod: "monthly" },
  cigarkeeper_pro_annual: { modules: ["cigarkeeper"], billingPeriod: "annual" },
  winekeeper_pro_monthly: { modules: ["winekeeper"], billingPeriod: "monthly" },
  winekeeper_pro_annual: { modules: ["winekeeper"], billingPeriod: "annual" },

  // BUNDLES
  // 3-module bundle: derived from subscription metadata (which 3 modules)
  // 4-module bundle: all modules
  "3_module_bundle_monthly": { modules: [], billingPeriod: "monthly" }, // Filled from metadata
  "3_module_bundle_annual": { modules: [], billingPeriod: "annual" },   // Filled from metadata
  "4_module_bundle_monthly": { modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"], billingPeriod: "monthly" },
  "4_module_bundle_annual": { modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"], billingPeriod: "annual" },
};

/**
 * Build access summary from user and subscription entities.
 *
 * LOGIC:
 *   1. Check tier (free / pro)
 *   2. If free: activeModules = []
 *   3. If pro: map Stripe product to modules
 *   4. If founding member: unlock all modules
 */
export function buildAccessSummary(user, subscription) {
  // Determine tier
  const tier = resolveTier(user, subscription);

  // Determine provider
  const provider = resolveProvider(user, subscription);

  // Determine status
  const status = resolveStatus(subscription) as SubscriptionStatus;

  // Determine billing period
  let billingPeriod: "monthly" | "annual" | null = null;

  // Determine modules
  let activeModules: ModuleKey[] = [];
  let planKey: string | null = null;

  if (tier === "pro" && subscription) {
    const mapped = mapSubscriptionToModules(subscription);
    activeModules = mapped.modules;
    planKey = mapped.planKey;
    billingPeriod = mapped.billingPeriod;
  }

  // Founding members unlock all modules
  const isFoundingMember = user?.isFoundingMember === true;
  if (isFoundingMember && tier === "pro") {
    activeModules = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
    planKey = "founders_bundle_annual";
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

/**
 * Resolve tier from user and subscription data.
 * Returns "free" or "pro" only.
 */
function resolveTier(user, subscription) {
  // Admin is always pro
  if (user?.role === "admin" || user?.is_admin === true) return "pro";

  // Top-level tier field on user (set by webhook)
  const userTier = user?.entitlement_tier || user?.tier;
  if (userTier && normalizeTier(userTier) === "pro") return "pro";

  // Check subscription grants paid access
  if (subscription && subscriptionGrantsPaidAccess(subscription)) {
    return "pro";
  }

  return "free";
}

/**
 * Resolve provider from user and subscription.
 */
function resolveProvider(user, subscription) {
  const userProvider = user?.subscription_provider;
  if (userProvider === "stripe" || userProvider === "apple") return userProvider;

  const subProvider = subscription?.provider;
  if (subProvider === "stripe" || subProvider === "apple") return subProvider;

  return null;
}

/**
 * Resolve subscription status.
 */
function resolveStatus(subscription) {
  if (!subscription) return "inactive";

  const status = String(subscription?.status || "").toLowerCase();
  if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled") {
    return status as SubscriptionStatus;
  }

  return "inactive";
}

/**
 * Map subscription product/plan to module access.
 * Returns { modules, planKey, billingPeriod }
 */
function mapSubscriptionToModules(subscription) {
  // Try to get plan from multiple fields
  const planKey = subscription?.plan_key || subscription?.planKey || subscription?.plan || subscription?.product_id || null;

  if (!planKey) {
    return { modules: [], planKey: null, billingPeriod: null };
  }

  // Look up in Stripe product map
  const mapped = STRIPE_PRODUCT_MAP[planKey];

  if (!mapped) {
    return { modules: [], planKey, billingPeriod: null };
  }

  // For 3-module bundles, get the actual modules from subscription metadata
  let modules = [...mapped.modules];
  if ((planKey === "3_module_bundle_monthly" || planKey === "3_module_bundle_annual") && mapped.modules.length === 0) {
    const metaModules = subscription?.metadata?.activeModules;
    if (Array.isArray(metaModules)) {
      modules = metaModules.filter((m) => isValidModuleKey(m));
    }
  }

  return {
    modules,
    planKey,
    billingPeriod: mapped.billingPeriod,
  };
}

/**
 * Normalize tier string to "free" or "pro".
 */
function normalizeTier(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "pro") return "pro";
  if (t === "premium") return "pro"; // Legacy
  if (t === "paid" || t === "plus" || t === "subscriber") return "pro"; // Legacy
  if (t.startsWith("bundle_")) return "pro"; // Legacy
  return "free";
}

/**
 * Check if subscription grants paid access.
 * Considers status (active, trialing, grace period).
 */
function subscriptionGrantsPaidAccess(subscription) {
  if (!subscription) return false;

  const status = String(subscription?.status || "").toLowerCase();

  // Active and trialing grant access
  if (status === "active" || status === "trialing") return true;

  // Grace period (if implemented) grants access
  // For now, only active and trialing
  return false;
}

/**
 * Validate module key.
 */
function isValidModuleKey(key) {
  return ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"].includes(key);
}