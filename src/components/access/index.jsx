/**
 * CANONICAL ACCESS SYSTEM — MAIN EXPORT
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * USAGE GUIDE:
 * ────────────
 *
 * 1. BUILD SUMMARY (in hooks or components that have user + subscription data):
 *
 *    import { buildAccessSummary } from '@/components/access'
 *    import { useCurrentUser } from '@/components/hooks/useCurrentUser'
 *
 *    const { user, subscription } = useCurrentUser()
 *    const access = buildAccessSummary(user, subscription)
 *
 * 2. QUERY SUMMARY (anywhere you need to check access):
 *
 *    import { hasPaidAccess, hasModuleAccess, canUseFeature } from '@/components/access'
 *
 *    // Pro access?
 *    if (hasPaidAccess(access)) { ... }
 *
 *    // Has specific module?
 *    if (hasModuleAccess(access, 'pipekeeper')) { ... }
 *
 *    // Can use feature?
 *    if (canUseFeature(access, 'pipe_specialization')) { ... }
 *
 * 3. NEVER DO THIS:
 *
 *    ❌ Check hasPaidAccess and assume all modules unlocked
 *    ❌ Import from premiumAccess.js, resolveEntitlementTier, moduleEntitlements
 *    ❌ Check subscription.tier directly
 *    ❌ Build custom entitlement logic
 *    ❌ Use hardcoded module lists
 *
 * TYPES:
 * ──────
 *   AccessSummary
 *     - tier: "free" | "pro"
 *     - status: "inactive" | "trialing" | "active" | "past_due" | "canceled" | "grace_period"
 *     - billingPeriod: "monthly" | "annual" | null
 *     - provider: "stripe" | "apple" | "manual" | null
 *     - activeModules: ModuleKey[]
 *     - planKey: string | null
 *     - isFoundingMember: boolean
 *
 *   ModuleKey = "pipekeeper" | "whiskeykeeper" | "cigarkeeper" | "winekeeper"
 */

export { buildAccessSummary } from "./accessSummary";

export {
  hasPaidAccess,
  hasPro,
  isFree,
  hasModuleAccess,
  getModuleCount,
  getActiveModules,
  canUseFeature,
  isFoundingMember,
  getSubscriptionStatus,
  isSubscriptionActive,
  isSubscriptionInactive,
  getBillingPeriod,
  getPlanKey,
  getProvider,
  getVisibleModules,
  getLockedModules,
  formatAccessSummary,
} from "./accessSelectors";