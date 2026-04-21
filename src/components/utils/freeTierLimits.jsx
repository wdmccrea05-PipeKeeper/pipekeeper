/**
 * Free tier item limits for modules
 * Paid tiers have unlimited access
 */

const FREE_TIER_LIMITS = {
  pipekeeper: {
    pipes: 5,
    blends: 10,
    smokingLogs: 100,
  },
  whiskeykeeper: {
    bottles: 10,
    tastingLogs: 50,
  },
  cigarkeeper: {
    cigars: 10,
    humidors: 1,
    cigarSessions: 100,
  },
};

/**
 * Check if user is at limit for a resource
 * Returns { atLimit: boolean, count: number, limit: number }
 */
export function checkFreeTierLimit(moduleId, resourceType, currentCount, user) {
  // Paid users have no limits
  if (moduleId === 'pipekeeper' && user?.pipekeeper_paid) return { atLimit: false, count: currentCount, limit: null };
  if (moduleId === 'whiskeykeeper' && user?.whiskeykeeper_paid) return { atLimit: false, count: currentCount, limit: null };
  if (moduleId === 'cigarkeeper' && user?.cigarkeeper_paid) return { atLimit: false, count: currentCount, limit: null };
  if (moduleId === 'winekeeper' && user?.winekeeper_paid) return { atLimit: false, count: currentCount, limit: null };

  const limit = FREE_TIER_LIMITS[moduleId]?.[resourceType];
  if (!limit) return { atLimit: false, count: currentCount, limit: null };

  return {
    atLimit: currentCount >= limit,
    count: currentCount,
    limit,
  };
}

/**
 * Get the limit for a resource type
 */
export function getFreeTierLimit(moduleId, resourceType) {
  return FREE_TIER_LIMITS[moduleId]?.[resourceType] || null;
}