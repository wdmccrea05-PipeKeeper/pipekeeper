/**
 * CANONICAL ACCESS SELECTORS
 */

/**
 * @param {{tier?: string}|null|undefined} summary
 */
export function hasPaidAccess(summary) {
  if (!summary) return false;
  return summary.tier === "pro";
}

export const hasPro = hasPaidAccess;

export function isFree(summary) {
  if (!summary) return true;
  return summary.tier === "free";
}

export function hasModuleAccess(summary, moduleKey) {
  if (!summary) return false;
  return Array.isArray(summary.activeModules) && summary.activeModules.includes(moduleKey);
}

export function getModuleCount(summary) {
  if (!summary) return 0;
  return Array.isArray(summary.activeModules) ? summary.activeModules.length : 0;
}

export function getActiveModules(summary) {
  if (!summary || !Array.isArray(summary.activeModules)) return [];
  return [...summary.activeModules];
}

export function canUseFeature(summary, featureKey) {
  if (!summary || summary.tier === "free") {
    const FREE_FEATURES = [
      "BASIC_PIPEKEEPER",
      "BASIC_WHISKEYKEEPER",
      "SHARE_CARDS",
      "SMOKING_LOG_VIEW",
      "TASTING_LOG_VIEW",
    ];
    return FREE_FEATURES.includes(featureKey);
  }
  return true;
}

export function isFoundingMember(summary) {
  if (!summary) return false;
  return Boolean(summary.isFoundingMember);
}

export function getSubscriptionStatus(summary) {
  if (!summary) return "inactive";
  return summary.status;
}

export function isSubscriptionActive(summary) {
  if (!summary) return false;
  return summary.status === "active" || summary.status === "trialing";
}

export function isSubscriptionInactive(summary) {
  if (!summary) return true;
  return ["canceled", "inactive", "past_due"].includes(summary.status);
}

export function getBillingPeriod(summary) {
  if (!summary) return null;
  return summary.billingPeriod ?? null;
}

export function getPlanKey(summary) {
  if (!summary) return null;
  return summary.planKey ?? null;
}

export function getProvider(summary) {
  if (!summary) return null;
  return summary.provider ?? null;
}

export function getVisibleModules(summary, hiddenModules = []) {
  if (!summary || !Array.isArray(summary.activeModules)) return [];
  return summary.activeModules.filter((m) => !hiddenModules.includes(m));
}

export function getLockedModules(summary) {
  const ALL_MODULES = ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"];
  if (!summary || !Array.isArray(summary.activeModules)) return ALL_MODULES;
  return ALL_MODULES.filter((m) => !summary.activeModules.includes(m));
}

export function formatAccessSummary(summary) {
  if (!summary) return "Free · No modules";

  const tier = summary.tier === "pro" ? "Pro" : "Free";
  const count = Array.isArray(summary.activeModules) ? summary.activeModules.length : 0;
  const modules = count > 0 ? `${count} Module(s)` : "No modules";
  const billing = summary.billingPeriod ? ` · ${summary.billingPeriod === "annual" ? "Annual" : "Monthly"}` : "";
  const founding = summary.isFoundingMember ? " · Founding Member" : "";

  return `${tier} · ${modules}${billing}${founding}`;
}