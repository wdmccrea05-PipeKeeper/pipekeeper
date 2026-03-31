/**
 * Module Detection System
 * Uses canonical access summary so help/tutorial recommendations follow:
 * - actual entitlements
 * - release-state gating
 * - internal/admin tester rules
 */

import { buildAccessSummary } from "@/components/access";

/**
 * Detect active modules based on canonical access rules.
 * @param {Object} user - Current user object
 * @param {Object} subscription - Current subscription object
 * @returns {Array} Array of active module names
 */
export function detectActiveModules(user, subscription) {
  const modules = ["hub"]; // Hub is always available

  if (!user) {
    return modules;
  }

  const access = buildAccessSummary(user, subscription);
  const activeModules = Array.isArray(access?.activeModules) ? access.activeModules : [];

  return [...modules, ...activeModules];
}

/**
 * Check if user has access to a specific module
 */
export function hasModuleAccess(modules, moduleName) {
  return modules.includes(moduleName);
}

/**
 * Get recommended tutorials based on active modules
 * Adapts tutorials to user's specific module access pattern
 */
export function getRecommendedTutorials(modules, user) {
  const tutorials = [];

  tutorials.push({
    module: "hub",
    id: "hub-overview",
    titleKey: "tutorial.hubOverview",
    priority: 1,
  });

  if (modules.includes("pipekeeper")) {
    tutorials.push({
      module: "pipekeeper",
      id: "pipekeeper-getting-started",
      titleKey: "tutorial.pipekeeperGettingStarted",
      priority: 2,
    });
  }

  if (modules.includes("whiskeykeeper")) {
    tutorials.push({
      module: "whiskeykeeper",
      id: "whiskeykeeper-getting-started",
      titleKey: "tutorial.whiskeykeeperGettingStarted",
      priority: 3,
    });
  }

  if (modules.includes("pipekeeper") && modules.includes("whiskeykeeper")) {
    tutorials.push({
      module: "collection",
      id: "cross-module-pairings",
      titleKey: "tutorial.crossModulePairings",
      priority: 2.5,
      description: "Discover flavor pairings between your pipes and spirits",
    });
  }

  if (modules.some((m) => ["pipekeeper", "whiskeykeeper"].includes(m))) {
    tutorials.push({
      module: "curator",
      id: "curator-introduction",
      titleKey: "tutorial.curatorIntroduction",
      priority: 4,
    });
  }

  return tutorials.sort((a, b) => a.priority - b.priority);
}

/**
 * Check if user is viewing onboarding
 */
export function shouldShowOnboardingTutorials(user) {
  return !user?.hasCompletedOnboarding;
}

export default {
  detectActiveModules,
  hasModuleAccess,
  getRecommendedTutorials,
  shouldShowOnboardingTutorials,
};