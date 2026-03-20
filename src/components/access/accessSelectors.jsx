/**
 * CANONICAL ACCESS SELECTORS
 * ═════════════════════════════════════════════════════════════════════════════════
 *
 * Pure functions to query access rights from AccessSummary.
 * ALL feature access checks MUST go through these selectors.
 * NO OTHER ENTITLEMENT LOGIC IS ALLOWED.
 */

import type { AccessSummary, ModuleKey } from "./accessSummary";

/**
 * Does user have paid (pro) access?
 */
export function hasPaidAccess(summary: AccessSummary | null | undefined): boolean {
  if (!summary) return false;
  return summary.tier === "pro";
}

/**
 * Alias for hasPaidAccess (common naming).
 */
export const hasPro = hasPaidAccess;

/**
 * Is user on free tier?
 */
export function isFree(summary: AccessSummary | null | undefined): boolean {
  if (!summary) return true; // Default to free
  return summary.tier === "free";
}

/**
 * Does user have access to a specific module?
 */
export function hasModuleAccess(summary: AccessSummary | null | undefined, moduleKey: ModuleKey | string): boolean {
  if (!summary) return false;
  return summary.activeModules.includes(moduleKey as ModuleKey);
}

/**
 * How many modules does user have access to?
 */
export function getModuleCount(summary: AccessSummary | null | undefined): number {
  if (!summary) return 0;
  return summary.activeModules.length;
}

/**
 * Get all active modules for user.
 */
export function getActiveModules(summary: AccessSummary | null | undefined): ModuleKey[] {
  if (!summary) return [];
  return [...summary.activeModules];
}

/**
 * Can user access a specific feature?
 * Composes module access + feature availability.
 *
 * FEATURE REGISTRY:
 *   Free tier:
 *     - Basic module viewing (PipeKeeper, WhiskeyKeeper)
 *     - Smoking logs, Tasting logs (read-only)
 *     - Basic sharing
 *
 *   Pro tier:
 *     - All features for all modules
 *
 * Usage:
 *   canUseFeature(summary, "pipe_specialization")  // true if has pipekeeper + pro
 *   canUseFeature(summary, "cellar_management")    // true if has whiskeykeeper + pro
 */
export function canUseFeature(summary: AccessSummary | null | undefined, featureKey: string): boolean {
  if (!summary || summary.tier === "free") {
    // Free tier allowed features
    const FREE_FEATURES = [
      "BASIC_PIPEKEEPER", // View pipes, basic log
      "BASIC_WHISKEYKEEPER", // View bottles, basic tasting log
      "SHARE_CARDS", // Basic sharing
      "SMOKING_LOG_VIEW", // View (not create)
      "TASTING_LOG_VIEW", // View (not create)
    ];
    return FREE_FEATURES.includes(featureKey);
  }

  // Pro tier: all features allowed
  return true;
}

/**
 * Is user a founding member?
 */
export function isFoundingMember(summary: AccessSummary | null | undefined): boolean {
  if (!summary) return false;
  return summary.isFoundingMember;
}

/**
 * What is user's subscription status?
 */
export function getSubscriptionStatus(summary: AccessSummary | null | undefined) {
  if (!summary) return "inactive";
  return summary.status;
}

/**
 * Is subscription in good standing?
 * (Active or trialing, not canceled or past due)
 */
export function isSubscriptionActive(summary: AccessSummary | null | undefined): boolean {
  if (!summary) return false;
  return summary.status === "active" || summary.status === "trialing";
}

/**
 * Is subscription past due or canceled?
 */
export function isSubscriptionInactive(summary: AccessSummary | null | undefined): boolean {
  if (!summary) return true;
  return summary.status === "canceled" || summary.status === "inactive" || summary.status === "past_due";
}

/**
 * What is the billing period? (monthly / annual / null)
 */
export function getBillingPeriod(summary: AccessSummary | null | undefined) {
  if (!summary) return null;
  return summary.billingPeriod;
}

/**
 * What is the plan key? (e.g., "pipekeeper_pro", "3_module_bundle")
 */
export function getPlanKey(summary: AccessSummary | null | undefined) {
  if (!summary) return null;
  return summary.planKey;
}

/**
 * What is the subscription provider?
 */
export function getProvider(summary: AccessSummary | null | undefined) {
  if (!summary) return null;
  return summary.provider;
}

/**
 * Get visible modules based on access + preferences.
 *
 * Filters activeModules to only those not hidden by user preferences.
 *
 * Usage:
 *   const visible = getVisibleModules(summary, userProfile?.hiddenModules)
 *   // Returns: ["pipekeeper"] if user has both pipekeeper+whiskeykeeper but hides whiskey
 */
export function getVisibleModules(
  summary: AccessSummary | null | undefined,
  hiddenModules: string[] = []
): ModuleKey[] {
  if (!summary) return [];
  return summary.activeModules.filter((m) => !hiddenModules.includes(m));
}

/**
 * Which modules does user NOT have access to?
 * Useful for upsell messaging.
 *
 * Example: User has pipekeeper, so getLockedModules returns [whiskeykeeper, cigarkeeper, winekeeper]
 */
export function getLockedModules(summary: AccessSummary | null | undefined): ModuleKey[] {
  const ALL_MODULES: ModuleKey[] = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
  if (!summary) return ALL_MODULES;
  return ALL_MODULES.filter((m) => !summary.activeModules.includes(m));
}

/**
 * Build a human-readable access description.
 * Usage: Display in UI, logs, debugging
 *
 * Example: "Pro · 2 Modules (PipeKeeper, WhiskeyKeeper) · Annual"
 */
export function formatAccessSummary(summary: AccessSummary | null | undefined): string {
  if (!summary) return "Free · No modules";

  const tier = summary.tier === "pro" ? "Pro" : "Free";
  const modules = summary.activeModules.length > 0 ? `${summary.activeModules.length} Module(s)` : "No modules";
  const billing = summary.billingPeriod ? ` · ${summary.billingPeriod === "annual" ? "Annual" : "Monthly"}` : "";
  const founding = summary.isFoundingMember ? " · Founding Member" : "";

  return `${tier} · ${modules}${billing}${founding}`;
}