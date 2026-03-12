/**
 * aiEligibility.jsx
 * 
 * AI Eligibility Filter — ensures only collector-approved items appear in AI recommendations.
 * Items marked ai_excluded or with scope="collector_only" are filtered out.
 */

/**
 * Filter items to only include AI-eligible entries
 * @param {Array} items - Array of pipe or blend objects
 * @returns {Array} - Filtered array
 */
export function filterAiEligibleItems(items) {
  if (!Array.isArray(items)) return [];
  
  return items.filter(item => {
    // Exclude items explicitly marked
    if (item?.ai_excluded === true) return false;
    
    // Exclude collector-only items
    if (item?.scope === "collector_only") return false;
    
    return true;
  });
}

/**
 * Get statistics on AI eligibility
 * @param {Array} items - Array of pipe or blend objects
 * @returns {Object} - { total, eligible, excluded }
 */
export function getAiEligibilityStats(items) {
  if (!Array.isArray(items)) {
    return { total: 0, eligible: 0, excluded: 0 };
  }
  
  const total = items.length;
  const eligible = filterAiEligibleItems(items).length;
  const excluded = total - eligible;
  
  return { total, eligible, excluded };
}