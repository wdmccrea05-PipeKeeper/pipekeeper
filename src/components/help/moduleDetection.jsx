/**
 * Module Detection System
 * Determines which modules user has access to based on new module-based entitlements
 * Supports: founders, premium, pro, mixed modules, bundle states
 */

/**
 * Detect active modules based on user entitlements
 * @param {Object} user - Current user object with entitlement fields
 * @param {Object} subscription - Current subscription object
 * @returns {Array} Array of active module names
 */
export function detectActiveModules(user, subscription) {
  const modules = ['hub']; // Hub is always available to all

  if (!user) {
    return modules;
  }

  // Check for explicit module entitlements on user object (module-based model)
  // These take precedence over tier-based logic
  if (user.pipekeeper_enabled || user.has_pipekeeper) {
    modules.push('pipekeeper');
  }

  if (user.whiskeykeeper_enabled || user.has_whiskeykeeper) {
    modules.push('whiskeykeeper');
  }

  // Founders get both PipeKeeper + WhiskeyKeeper free
  if (user.isFoundingMember || user.founding_member) {
    if (!modules.includes('pipekeeper')) modules.push('pipekeeper');
    if (!modules.includes('whiskeykeeper')) modules.push('whiskeykeeper');
  }

  // Fallback to subscription tier logic if no explicit module flags
  // (for backward compatibility with older subscription model)
  if (subscription && modules.length === 1) {
    const tier = subscription?.tier?.toLowerCase() || '';
    const status = subscription?.status?.toLowerCase() || '';
    const isPaid = ['active', 'trialing', 'trial'].includes(status);

    if (isPaid) {
      // Premium tier includes PipeKeeper
      if (tier === 'premium') {
        modules.push('pipekeeper');
      }
      // Pro tier includes PipeKeeper + WhiskeyKeeper
      else if (tier === 'pro') {
        modules.push('pipekeeper');
        modules.push('whiskeykeeper');
      }
    }
  }

  // Future modules (coming soon, always show in help even if not active yet)
  // These are shown for awareness and roadmap context
  // Do not add to active modules until enabled

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