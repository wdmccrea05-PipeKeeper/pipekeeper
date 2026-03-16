/**
 * Module Detection System
 * Determines which modules user has access to
 * Powers tutorial selection and feature gating
 */

/**
 * Detect active modules based on user entitlements
 * @param {Object} user - Current user object
 * @param {Object} subscription - Current subscription
 * @returns {Array} Array of active module names
 */
export function detectActiveModules(user, subscription) {
  const modules = ['hub']; // Hub is always available

  if (!user || !subscription) {
    return modules;
  }

  const tier = subscription?.tier?.toLowerCase() || '';
  const status = subscription?.status?.toLowerCase() || '';

  // Paid subscription (premium or pro, active or trialing)
  const isPaid = ['active', 'trialing', 'trial'].includes(status);

  if (isPaid) {
    modules.push('pipekeeper');

    // Pro or Bundle adds WhiskeyKeeper
    if (tier === 'pro') {
      modules.push('whiskeykeeper');
    }
  }

  return modules;
}

/**
 * Check if user has access to a specific module
 */
export function hasModuleAccess(modules, moduleName) {
  return modules.includes(moduleName);
}

/**
 * Get recommended tutorials based on active modules
 */
export function getRecommendedTutorials(modules) {
  const tutorials = [];

  // Hub tutorial always shown first
  tutorials.push({
    module: 'hub',
    id: 'hub-overview',
    title: 'Hub Overview',
    priority: 1
  });

  // PipeKeeper if available
  if (modules.includes('pipekeeper')) {
    tutorials.push({
      module: 'pipekeeper',
      id: 'pipekeeper-getting-started',
      title: 'PipeKeeper Getting Started',
      priority: 2
    });
  }

  // WhiskeyKeeper if available
  if (modules.includes('whiskeykeeper')) {
    tutorials.push({
      module: 'whiskeykeeper',
      id: 'whiskeykeeper-getting-started',
      title: 'WhiskeyKeeper Getting Started',
      priority: 3
    });
  }

  // Bundle tutorial if both pipekeeper and whiskeykeeper
  if (modules.includes('pipekeeper') && modules.includes('whiskeykeeper')) {
    tutorials.push({
      module: 'bundle',
      id: 'bundle-overview',
      title: 'Bundle Overview',
      priority: 2.5
    });
  }

  return tutorials.sort((a, b) => a.priority - b.priority);
}

/**
 * Check if user is viewing onboarding
 */
export function shouldShowOnboardingTutorials(user) {
  // Show onboarding tutorials if:
  // - User just signed up (new account, < 1 hour old)
  // - User hasn't completed onboarding flow
  // - User has no collection items yet
  return !user?.hasCompletedOnboarding;
}

export default {
  detectActiveModules,
  hasModuleAccess,
  getRecommendedTutorials,
  shouldShowOnboardingTutorials
};