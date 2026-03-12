/**
 * Collection Curator AI Platform Module
 * Provides utilities for curator AI features
 */

export function getActiveOptimizeScopes(pipes = [], blends = []) {
  const eligiblePipes = pipes.filter(p => !p?.ai_excluded);
  const eligibleBlends = blends.filter(b => !b?.ai_excluded);
  
  return {
    pipes: eligiblePipes.length,
    blends: eligibleBlends.length,
    total: eligiblePipes.length + eligibleBlends.length
  };
}

export function getAiEligibilityStats(items) {
  if (!Array.isArray(items)) return { eligible: 0, excluded: 0 };
  
  const eligible = items.filter(item => !item?.ai_excluded).length;
  const excluded = items.length - eligible;
  
  return { eligible, excluded };
}