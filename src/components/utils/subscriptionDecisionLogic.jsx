/**
 * Subscription Decision Logic
 * Determines user's current state and recommends next upgrade path
 */

import { MODULES, getActiveModules, getModuleDisplayName } from './moduleRegistry';
import { hasModuleProAccess } from './moduleEntitlements';
import { detectBundleTier, getUpgradeSuggestion } from './bundlePricingEngine';

/**
 * Get user's current subscription state
 * @param {object} user - User object
 * @returns {object} - Current state including modules, tier, next options
 */
export function getUserSubscriptionState(user) {
  if (!user) return null;

  const activeModules = getActiveModules();
  const paidModules = activeModules.filter(module => hasModuleProAccess(user, module));
  const freeModules = activeModules.filter(module => !hasModuleProAccess(user, module));
  const currentTier = detectBundleTier(paidModules);

  return {
    paidModules,       // Modules user has Pro access to
    freeModules,       // Modules available but not purchased
    tier: currentTier,  // 'single', 'dual', 'bundle_3', 'bundle_4'
    totalPaid: paidModules.length,
    totalAvailable: activeModules.length,
    isFounder: user?.entitlements?.includes('pro_founders_pipe_whiskey'),
  };
}

/**
 * Determine what upgrade to recommend next
 * Returns the next best purchase option
 * @param {object} user - User object
 * @param {string} billingPeriod - 'monthly' or 'annual'
 * @returns {object|null} - Upgrade recommendation or null if user has all modules
 */
export function getNextUpgradeRecommendation(user, billingPeriod = 'monthly') {
  if (!user) return null;

  const state = getUserSubscriptionState(user);
  if (!state) return null;

  const { paidModules, freeModules, totalPaid } = state;

  // All modules purchased - no upgrade available
  if (freeModules.length === 0) {
    return null;
  }

  // 3 modules: offer 4-module bundle if available
  if (totalPaid === 3 && freeModules.length > 0) {
    const nextModule = freeModules[0];
    return {
      type: 'bundle_4',
      reason: 'upgrade_to_full_bundle',
      currentModules: paidModules,
      addingModule: nextModule,
      allModules: [...paidModules, nextModule],
      suggestion: getUpgradeSuggestion(paidModules, nextModule, billingPeriod),
    };
  }

  // 2 modules: offer 3-module bundle or single module
  if (totalPaid === 2) {
    const thirdModule = freeModules[0];
    const bundleSuggestion = getUpgradeSuggestion(paidModules, thirdModule, billingPeriod);

    // If bundle is significantly cheaper, recommend it; otherwise recommend single module
    if (bundleSuggestion.savingsPercentage > 0) {
      return {
        type: 'bundle_3',
        reason: 'upgrade_to_bundle',
        currentModules: paidModules,
        addingModule: thirdModule,
        allModules: [...paidModules, thirdModule],
        suggestion: bundleSuggestion,
      };
    } else {
      return {
        type: 'single',
        reason: 'add_module',
        currentModules: paidModules,
        addingModule: thirdModule,
        allModules: [...paidModules, thirdModule],
      };
    }
  }

  // 1 module: offer next single module or explore bundles
  if (totalPaid === 1) {
    // If user adds a second module, then a third could trigger bundle
    // For now, just offer the next module
    return {
      type: 'single',
      reason: 'add_module',
      currentModules: paidModules,
      addingModule: freeModules[0],
      allModules: [...paidModules, freeModules[0]],
    };
  }

  // 0 modules: offer first module or recommend starting bundle if user has trial
  if (totalPaid === 0) {
    return {
      type: 'single',
      reason: 'first_module',
      currentModules: [],
      addingModule: freeModules[0],
      allModules: [freeModules[0]],
    };
  }

  return null;
}

/**
 * Get all upgrade paths available to user
 * Returns all possible upgrade options
 * @param {object} user - User object
 * @returns {array} - Array of possible upgrade paths
 */
export function getAvailableUpgradePaths(user) {
  if (!user) return [];

  const state = getUserSubscriptionState(user);
  if (!state) return [];

  const { paidModules, freeModules, totalPaid } = state;
  const paths = [];

  // Add remaining single modules
  freeModules.forEach(module => {
    const displayName = getModuleDisplayName(module);
    paths.push({
      type: 'single',
      modules: [module],
      description: `Add ${displayName} to your collection`,
      fromState: 'single',
    });
  });

  // Add bundle options
  if (totalPaid >= 2 && totalPaid <= 3) {
    // Can upgrade to 3-module bundle if not already there
    if (totalPaid < 3) {
      paths.push({
        type: 'bundle_3',
        modules: [...paidModules, freeModules[0]].slice(0, 3),
        description: 'Upgrade to 3-module bundle',
        fromState: totalPaid === 2 ? 'dual' : 'single',
      });
    }

    // Can upgrade to 4-module bundle if available
    if (freeModules.length > 0) {
      paths.push({
        type: 'bundle_4',
        modules: [...paidModules, ...freeModules],
        description: 'Upgrade to 4-module bundle',
        fromState: totalPaid === 3 ? 'bundle_3' : 'other',
      });
    }
  }

  return paths;
}

/**
 * Check if user is eligible for founders offer
 * @param {object} user - User object
 * @returns {boolean}
 */
export function isFoundersOfferEligible(user) {
  if (!user) return false;

  // Already has founders offer
  if (user?.entitlements?.includes('pro_founders_pipe_whiskey')) {
    return false;
  }

  // Has both PipeKeeper and WhiskeyKeeper but through regular subscriptions
  const hasPipeKeeper = hasModuleProAccess(user, MODULES.PIPEKEEPER);
  const hasWhiskeyKeeper = hasModuleProAccess(user, MODULES.WHISKEYKEEPER);

  // Only eligible if they don't already have founders (checked above)
  // This is for new purchases, so return false (offer is legacy)
  return false;
}

/**
 * Determine if a bundle upgrade can be processed
 * Returns true if we can safely transition from current subscriptions to bundle
 * @param {object} user - User object
 * @param {array} bundleModules - Modules in the target bundle
 * @returns {object} - { canUpgrade: boolean, reason: string, conflicts: array }
 */
export function canProcessBundleUpgrade(user, bundleModules) {
  const state = getUserSubscriptionState(user);
  if (!state) return { canUpgrade: false, reason: 'invalid_user' };

  const { paidModules } = state;

  // Check if user is trying to downgrade (bundle has fewer modules than current)
  if (bundleModules.length < paidModules.length) {
    return {
      canUpgrade: false,
      reason: 'cannot_downgrade',
      currentModules: paidModules,
      bundleModules,
    };
  }

  // Check for conflicts (modules in bundle that user doesn't have)
  const newModules = bundleModules.filter(m => !paidModules.includes(m));

  if (newModules.length === 0) {
    return {
      canUpgrade: false,
      reason: 'already_has_bundle',
      currentModules: paidModules,
    };
  }

  // Safe to upgrade
  return {
    canUpgrade: true,
    reason: 'eligible_for_upgrade',
    currentModules: paidModules,
    bundleModules,
    newModules,
  };
}

/**
 * Determine which subscriptions should be canceled when upgrading
 * Returns list of subscription IDs to cancel
 * @param {object} user - User object
 * @param {array} targetBundleModules - Modules in target bundle
 * @returns {array} - Subscription IDs to cancel
 */
export function getSubscriptionsToCancelOnUpgrade(user, targetBundleModules) {
  // This will be populated when we fetch the user's actual subscription records
  // For now, return empty array - handled in checkoutSessionCreation
  return [];
}

/**
 * Get summary of user's current and proposed subscription state
 * @param {object} user - User object
 * @param {array} proposedModules - Proposed modules to purchase
 * @returns {object} - Comparison of current vs proposed state
 */
export function getSubscriptionSummary(user, proposedModules = null) {
  const current = getUserSubscriptionState(user);

  if (!proposedModules) {
    return {
      current,
      proposed: null,
    };
  }

  const proposedTier = detectBundleTier(proposedModules);
  const newModules = proposedModules.filter(m => !current.paidModules.includes(m));
  const removedModules = current.paidModules.filter(m => !proposedModules.includes(m));

  return {
    current,
    proposed: {
      paidModules: proposedModules,
      tier: proposedTier,
      newModules,
      removedModules,
      changes: newModules.length > 0 || removedModules.length > 0,
    },
  };
}