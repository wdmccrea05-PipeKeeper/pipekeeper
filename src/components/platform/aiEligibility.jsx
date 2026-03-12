/**
 * AI Eligibility Platform Module
 * Filters items based on ai_excluded flag
 */

export function filterAiEligibleItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !item?.ai_excluded);
}

export function getAiEligibilityStats(items) {
  if (!Array.isArray(items)) return { eligible: 0, excluded: 0 };
  
  const eligible = items.filter(item => !item?.ai_excluded).length;
  const excluded = items.length - eligible;
  
  return { eligible, excluded };
}