/**
 * Standardized cache invalidation utilities
 * Ensures both root and scoped query keys are invalidated
 */

/**
 * Invalidate all queries for a specific entity type
 * Handles both root keys and user-scoped keys
 * 
 * @param {object} queryClient - React Query client instance
 * @param {string} entityType - Entity type (e.g., 'pipes', 'blends', 'tobacco')
 * @param {string} userEmail - Optional user email for scoped invalidation
 */
export function invalidateEntityQueries(queryClient, entityType, userEmail = null) {
  // Invalidate root key
  queryClient.invalidateQueries({ 
    predicate: (query) => query.queryKey[0] === entityType
  });
  
  // Also invalidate user-scoped if provided
  if (userEmail) {
    queryClient.invalidateQueries({ 
      queryKey: [entityType, userEmail] 
    });
  }
}

/**
 * Invalidate pipe-related queries
 */
export function invalidatePipeQueries(queryClient, userEmail = null) {
  invalidateEntityQueries(queryClient, 'pipes', userEmail);
  invalidateEntityQueries(queryClient, 'pipe', userEmail);
  
  // Also invalidate related queries
  queryClient.invalidateQueries({ 
    predicate: (query) => {
      const key = query.queryKey[0];
      return key === 'pairing-matrix' || 
             key === 'collection-optimization' ||
             key === 'smoking-logs';
    }
  });
}

/**
 * Invalidate tobacco/blend-related queries
 */
export function invalidateBlendQueries(queryClient, userEmail = null) {
  invalidateEntityQueries(queryClient, 'blends', userEmail);
  invalidateEntityQueries(queryClient, 'tobacco', userEmail);
  invalidateEntityQueries(queryClient, 'tobacco-blend', userEmail);
  invalidateEntityQueries(queryClient, 'tobacco-blends', userEmail);
  
  // Invalidate related queries
  queryClient.invalidateQueries({ 
    predicate: (query) => {
      const key = query.queryKey[0];
      return key === 'pairing-matrix' || 
             key === 'tobacco-containers';
    }
  });
}

/**
 * Invalidate user profile queries
 */
export function invalidateProfileQueries(queryClient, userEmail = null) {
  invalidateEntityQueries(queryClient, 'user-profile', userEmail);
  invalidateEntityQueries(queryClient, 'current-user', userEmail);
  queryClient.invalidateQueries({ queryKey: ['current-user'] });
}

/**
 * Invalidate community-related queries
 */
export function invalidateCommunityQueries(queryClient, userEmail = null) {
  const communityKeys = [
    'public-profiles',
    'user-connections',
    'friendships',
    'messages',
    'comments',
    'abuse-reports'
  ];
  
  communityKeys.forEach(key => {
    invalidateEntityQueries(queryClient, key, userEmail);
  });
}

/**
 * Invalidate all AI-generated data
 */
export function invalidateAIQueries(queryClient, userEmail = null) {
  const aiKeys = [
    'pairing-matrix',
    'collection-optimization',
    'optimization-batch',
    'saved-pairings',
    'activePairings',
    'saved-optimization',
    'activeOptimization'
  ];
  
  aiKeys.forEach(key => {
    invalidateEntityQueries(queryClient, key, userEmail);
  });
}

/**
 * Complete cache refresh - use sparingly
 */
export function invalidateAllQueries(queryClient) {
  queryClient.invalidateQueries();
}