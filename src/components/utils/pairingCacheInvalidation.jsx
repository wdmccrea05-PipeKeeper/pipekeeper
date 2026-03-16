/**
 * Pairing Cache Invalidation Utilities
 * 
 * Handles invalidation of stale pairing caches when:
 * - A blend's ai_excluded status changes (e.g., marked as collection-only)
 * - A blend's properties change (rating, blend_type, etc)
 * - A pipe's focus changes
 * 
 * This ensures that pairing recommendations always reflect current blend availability.
 */

export function invalidatePairingCaches(queryClient, userEmail) {
  if (!userEmail) return;
  
  // Invalidate active pairings (forces reload from DB)
  queryClient?.invalidateQueries({ 
    queryKey: ["activePairings", userEmail] 
  });
  
  // Invalidate PairingMatrix queries
  queryClient?.invalidateQueries({ 
    queryKey: ["pairingMatrix"] 
  });
  
  // Invalidate pipe query (in case focus was updated)
  queryClient?.invalidateQueries({ 
    queryKey: ["pipe"] 
  });
  
  // Invalidate pipe list
  queryClient?.invalidateQueries({ 
    queryKey: ["pipes", userEmail] 
  });
  
  // Invalidate blend list
  queryClient?.invalidateQueries({ 
    queryKey: ["blends", userEmail] 
  });
}

/**
 * Invalidate pairings specifically when a blend status changes
 * This is called when:
 * - A blend is marked as collection-only (ai_excluded = true)
 * - A blend is unmarked as collection-only (ai_excluded = false)
 * 
 * This ensures that:
 * 1. MatchingEngine re-fetches eligible blends
 * 2. Pairing recommendations refresh
 * 3. UI immediately reflects the change
 */
export function invalidateBlendStatusPairings(queryClient, userEmail, blendId) {
  // Full invalidation
  invalidatePairingCaches(queryClient, userEmail);
}

/**
 * Called after successfully updating a blend's ai_excluded status
 * Triggers cache refresh to ensure no stale pairing data persists
 */
export function onBlendAiExcludedChange(queryClient, userEmail, blendId, newAiExcludedValue) {
  console.log(`[Pairing Cache] Blend ${blendId} ai_excluded changed to ${newAiExcludedValue}`);
  
  invalidateBlendStatusPairings(queryClient, userEmail, blendId);
  
  // If blend is now collection-only, pairings may have included it
  // Force full regeneration next time MatchingEngine renders
  if (newAiExcludedValue === true) {
    console.log(`[Pairing Cache] Blend marked collection-only - stale pairings will be rebuilt`);
  } else {
    console.log(`[Pairing Cache] Blend marked active - pairings will be updated`);
  }
}