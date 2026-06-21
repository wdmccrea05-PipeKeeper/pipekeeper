import { base44 } from '@/api/base44Client';
import { normalizeSmokingLog, normalizeTastingLog } from '@/components/utils/activityNormalizer';
import { formatDate } from '@/components/utils/localeFormatters';

/**
 * Get recent cross-module activity for the current user only.
 * Uses canonical normalizer so all surfaces share the same activity model.
 * @param {string|null} userEmail
 * @param {object} options
 * @param {boolean} options.includeWhiskey
 * @param {boolean} options.includeWine   - include wine tastings (admin/internal only)
 * @param {number}  options.limit
 * @returns {Promise<Array>}
 */
export async function getRecentCrossModuleActivity(userEmail = null, options = {}) {
  const { includeWhiskey = false, includeWine = false, limit = 5 } = options;

  if (!userEmail) return [];

  try {
    const activities = [];

    try {
      const logs = await base44.entities.SmokingLog.filter({ created_by: userEmail }, '-date', limit);
      if (logs?.length > 0) {
        activities.push(...logs.map((log) => ({
          ...normalizeSmokingLog(log),
          module: 'pipes',
          icon: '🔴',
        })));
      }
    } catch (err) {
      console.warn('[hubActivityFeed] Error fetching smoking logs:', err?.message);
    }

    if (includeWhiskey) {
      try {
        const tastings = await base44.entities.TastingLog.filter({ created_by: userEmail }, '-tasting_date', limit);
        if (tastings?.length > 0) {
          activities.push(...tastings.map((tasting) => ({
            ...normalizeTastingLog(tasting),
            module: 'whiskey',
            icon: '🥃',
          })));
        }
      } catch (err) {
        console.warn('[hubActivityFeed] Error fetching tasting logs:', err?.message);
      }
    }

    if (includeWine) {
      try {
        const wineTastings = await base44.entities.WineTasting.filter({ created_by: userEmail }, '-date', limit);
        if (wineTastings?.length > 0) {
          activities.push(...wineTastings.map((wt) => ({
            id: wt.id,
            type: 'wine_tasting',
            title: wt.wine_name || 'Wine Tasting',
            subtitle: wt.notes ? wt.notes.slice(0, 60) : '',
            date: wt.date,
            rating: wt.rating,
            module: 'wine',
            icon: '🍷',
          })));
        }
      } catch (err) {
        console.warn('[hubActivityFeed] Error fetching wine tastings:', err?.message);
      }
    }

    activities.sort((a, b) => {
      try { return new Date(b.date) - new Date(a.date); } catch { return 0; }
    });
    return activities.slice(0, limit);
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

  return formatDate(date, 'short');
}