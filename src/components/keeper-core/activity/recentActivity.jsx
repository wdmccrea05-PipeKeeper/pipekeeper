/**
 * Keeper Core — Recent Activity Service
 * 
 * Centralized logic for aggregating recent cross-module activity.
 * Used by Hub activity feed and curator context.
 */

import { base44 } from '@/api/base44Client';

/**
 * Get recent cross-module activity for the current user
 * Aggregates smoking logs, tastings, and item additions
 * @param {string} userEmail - Current user's email for scoping (optional, uses all if not provided)
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} Array of activity items sorted by date
 */
export async function getRecentCrossModuleActivity(userEmail = null, options = {}) {
  const { maxItems = 5, includeModules = ['pipes', 'whiskey'] } = options;

  try {
    const activities = [];

    // Fetch recent smoking logs (PipeKeeper)
    if (includeModules.includes('pipes')) {
      try {
        const logs = await base44.entities.SmokingLog.list('-date', maxItems);
        if (logs && logs.length > 0) {
          activities.push(
            ...logs.map(log => ({
              id: `smoking-${log.id}`,
              type: 'smoking',
              module: 'pipes',
              date: new Date(log.date),
              title: log.pipe_name || 'Unknown Pipe',
              subtitle: log.blend_name || 'Unknown Blend',
              icon: '🔴',
              entity: log,
            }))
          );
        }
      } catch (err) {
        console.warn('[recentActivity] Error fetching smoking logs:', err?.message);
      }
    }

    // Fetch recent tasting logs (WhiskeyKeeper)
    if (includeModules.includes('whiskey')) {
      try {
        const tastings = await base44.entities.TastingLog.list('-tasting_date', maxItems);
        if (tastings && tastings.length > 0) {
          activities.push(
            ...tastings.map(tasting => ({
              id: `tasting-${tasting.id}`,
              type: 'tasting',
              module: 'whiskey',
              date: new Date(tasting.tasting_date),
              title: tasting.bottle_name || 'Unknown Bottle',
              subtitle: tasting.notes ? tasting.notes.substring(0, 50) : 'Tasting logged',
              icon: '🥃',
              entity: tasting,
            }))
          );
        }
      } catch (err) {
        console.warn('[recentActivity] Error fetching tasting logs:', err?.message);
      }
    }

    // Sort by date (most recent first)
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Return top N activities
    return activities.slice(0, maxItems);
  } catch (error) {
    console.warn('[recentActivity] Error fetching cross-module activity:', error?.message);
    return [];
  }
}

/**
 * Format activity date for display
 * @param {Date} date - Date to format
 * @returns {string} Human-readable relative date
 */
export function formatActivityDate(date) {
  if (!date) return 'unknown';

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get activity summary stats
 * @param {Array} activities - Activity items from getRecentCrossModuleActivity
 * @returns {Object} Activity statistics
 */
export function getActivityStats(activities = []) {
  const stats = {
    total: activities.length,
    byType: { smoking: 0, tasting: 0 },
    byModule: { pipes: 0, whiskey: 0 },
    lastActivityDate: null,
  };

  if (activities.length === 0) {
    return stats;
  }

  activities.forEach(activity => {
    stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
    stats.byModule[activity.module] = (stats.byModule[activity.module] || 0) + 1;
  });

  stats.lastActivityDate = activities[0].date;

  return stats;
}