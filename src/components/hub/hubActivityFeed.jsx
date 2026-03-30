import { base44 } from '@/api/base44Client';

/**
 * Get recent cross-module activity for the current user only.
 * @param {string|null} userEmail
 * @param {object} options
 * @param {boolean} options.includeWhiskey
 * @returns {Promise<Array>}
 */
export async function getRecentCrossModuleActivity(userEmail = null, options = {}) {
  const { includeWhiskey = false } = options;

  if (!userEmail) return [];

  try {
    const activities = [];

    try {
      const logs = await base44.entities.SmokingLog.filter({ created_by: userEmail }, '-date', 5);
      if (logs && logs.length > 0) {
        activities.push(
          ...logs.map((log) => ({
            id: `smoking-${log.id}`,
            type: 'smoking',
            module: 'pipes',
            date: new Date(log.date),
            title: log.pipe_name,
            subtitle: log.blend_name,
            icon: '🔴',
          }))
        );
      }
    } catch (err) {
      console.warn('[hubActivityFeed] Error fetching smoking logs:', err?.message);
    }

    if (includeWhiskey) {
      try {
        const tastings = await base44.entities.TastingLog.filter({ created_by: userEmail }, '-tasting_date', 5);
        if (tastings && tastings.length > 0) {
          activities.push(
            ...tastings.map((tasting) => ({
              id: `tasting-${tasting.id}`,
              type: 'tasting',
              module: 'whiskey',
              date: new Date(tasting.tasting_date),
              title: tasting.bottle_name,
              subtitle: tasting.notes ? tasting.notes.substring(0, 50) : 'Tasting logged',
              icon: '🥃',
            }))
          );
        }
      } catch (err) {
        console.warn('[hubActivityFeed] Error fetching tasting logs:', err?.message);
      }
    }

    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    return activities.slice(0, 5);
  } catch (error) {
    console.warn('[hubActivityFeed] Error fetching cross-module activity:', error);
    return [];
  }
}

export function formatActivityDate(date) {
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
