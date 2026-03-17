/**
 * Keeper Core — Curator Hub Context Builder
 * 
 * Centralized logic for preparing ecosystem-level context for the Curator.
 * Builds prompts and data summaries for cross-module AI insights.
 */

import { getEnabledModules as getPlatformEnabledModules } from '../modules/keeperModules';
import { getActivityStats } from '../activity/recentActivity';
import { getAIEligibleModules } from '@/components/utils/moduleAccess';

/**
 * Build high-level ecosystem context for the Curator
 * @param {Object} summary - Collection summary from collectionSummary service
 * @param {Array} recentActivities - Recent activities from recentActivity service
 * @param {Object} userProfile - User profile data (optional)
 * @returns {Object} Curator context object
 */
export function buildCuratorHubContext(summary = {}, recentActivities = [], userProfile = {}) {
  const enabledModules = getEnabledModules();
  const activityStats = getActivityStats(recentActivities);

  return {
    ecosystem: {
      totalItems: summary.total?.items || 0,
      totalValue: summary.total?.value || 0,
      enabledModuleCount: summary.enabledModuleCount || 0,
      activeModules: enabledModules.map(m => ({
        type: m.type,
        titleKey: m.titleKey,
        icon: m.icon,
        itemCount: summary[m.type]?.count || 0,
        value: summary[m.type]?.value || 0,
      })),
    },
    activity: {
      recentCount: activityStats.total,
      lastActivityDate: activityStats.lastActivityDate,
      activityByType: activityStats.byType,
      activityByModule: activityStats.byModule,
    },
    user: {
      hasProfile: !!userProfile?.user_email,
      preferencesSet: !!(userProfile?.preferred_blend_types?.length > 0),
      smokingHistory: activityStats.byType.smoking > 0,
      tastingHistory: activityStats.byType.tasting > 0,
    },
  };
}

/**
 * Generate prompt seeds for Curator based on ecosystem context
 * @param {Object} curatorContext - Context from buildCuratorHubContext
 * @returns {Array} Array of suggested prompt seeds
 */
export function generateCuratorPromptSeeds(curatorContext = {}) {
  const seeds = [];

  const { ecosystem = {}, activity = {}, user = {} } = curatorContext;

  // Base ecosystem seed
  if (ecosystem.enabledModuleCount > 0) {
    seeds.push({
      id: 'what-deserves-attention',
      text: 'What deserves attention across my collection?',
      description: 'Cross-module collection insights',
      icon: '🔍',
    });
  }

  // Smoking/tasting history seed
  if (activity.activityByModule.pipes > 0 && activity.activityByModule.whiskey > 0) {
    seeds.push({
      id: 'summarize-activity',
      text: 'Summarize my PipeKeeper and WhiskeyKeeper activity.',
      description: 'Recent activity overview',
      icon: '📊',
    });
  }

  // What to enjoy next seed
  if (activity.activityByType.smoking > 0 || activity.activityByType.tasting > 0) {
    seeds.push({
      id: 'next-smoke-pour',
      text: 'What should I smoke or pour next?',
      description: 'Personalized recommendations',
      icon: '🎯',
    });
  }

  // Collection growth seed
  if (ecosystem.totalItems > 5) {
    seeds.push({
      id: 'collection-gaps',
      text: 'What gaps exist in my collection?',
      description: 'Collection analysis and recommendations',
      icon: '🎁',
    });
  }

  // Pairing seed (if pipes enabled)
  const pipesModule = ecosystem.activeModules.find(m => m.type === 'pipes');
  if (pipesModule && pipesModule.itemCount > 0) {
    seeds.push({
      id: 'tobacco-pairing',
      text: 'Which of my blends pair best with certain pipes?',
      description: 'Pipe-tobacco pairing insights',
      icon: '🔗',
    });
  }

  return seeds;
}

/**
 * Build summary text for Curator entry point
 * @param {Object} curatorContext - Context from buildCuratorHubContext
 * @returns {string} Ecosystem summary text
 */
export function buildCuratorEntryText(curatorContext = {}) {
  const { ecosystem = {} } = curatorContext;

  const itemCount = ecosystem.totalItems || 0;
  const moduleCount = ecosystem.enabledModuleCount || 0;

  if (itemCount === 0 || moduleCount === 0) {
    return 'Start your collection and I can help curate it.';
  }

  if (moduleCount === 1) {
    return `${itemCount} items in your collection. Ask me anything.`;
  }

  return `${itemCount} items across ${moduleCount} modules. What insights would you like?`;
}

/**
 * Prepare context payload for passing to Curator page
 * @param {Object} curatorContext - Context from buildCuratorHubContext
 * @returns {Object} Navigation state object for /Curator page
 */
export function prepareCuratorNavigationState(curatorContext = {}) {
  return {
    context: 'ecosystem',
    ecosystemContext: curatorContext,
    promptSeeds: generateCuratorPromptSeeds(curatorContext),
    timestamp: new Date().toISOString(),
  };
}