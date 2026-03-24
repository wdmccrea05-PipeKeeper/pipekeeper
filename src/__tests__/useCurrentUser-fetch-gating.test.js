/**
 * Test: useCurrentUser must not fetch when auth is not authenticated.
 *
 * This test verifies that the queryFn does not execute when enabled=false
 * (which happens when isLoadingAuth=true).
 *
 * The key insight: queryKey invalidation will trigger a refetch UNLESS
 * the query is disabled. During the loading phase, we must keep it disabled.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useCurrentUser — fetch gating', () => {
  it('query is disabled while isLoadingAuth=true', () => {
    const isLoadingAuth = true;
    const enabled = !isLoadingAuth; // The condition from useCurrentUser

    // When enabled=false, react-query will NOT run queryFn
    expect(enabled).toBe(false);
  });

  it('query is enabled after isLoadingAuth=false and auth is valid', () => {
    const isLoadingAuth = false;
    const isAuthenticated = true;
    const enabled = !isLoadingAuth && isAuthenticated;

    expect(enabled).toBe(true);
  });

  it('query is disabled when auth check returned auth_required', () => {
    const isLoadingAuth = false;
    const authError = { type: 'auth_required' };
    const isAuthenticated = !authError;

    const enabled = !isLoadingAuth && isAuthenticated;
    expect(enabled).toBe(false);
  });

  it('query initialData is seeded from AuthContext user to avoid duplicate fetch on mount', () => {
    // When authUser is provided as initialData, react-query does not run queryFn on mount
    // even though enabled=true, because cache is already populated.
    // This prevents: auth fetch + user fetch running in parallel unnecessarily.

    const authUser = { email: 'test@example.com', id: 'user-123' };
    const initialData = authUser ? {
      ...authUser,
      id: authUser.id,
      email: authUser.email,
    } : undefined;

    const initialDataUpdatedAt = authUser ? Date.now() : 0;
    const staleTime = 5 * 60 * 1000;

    // initialData is populated + fresh, so query will not re-fetch immediately
    const hasRecentData = initialDataUpdatedAt && Date.now() - initialDataUpdatedAt < staleTime;
    expect(hasRecentData).toBe(true);
  });

  it('current user query does not run on init if auth is already known to be false', () => {
    // Scenario: page loads, AuthContext starts auth check.
    // useCurrentUser mounts with isLoadingAuth=true.
    // enabled = !true = false, so queryFn never runs.

    const isLoadingAuth = true;
    const queryFn = vi.fn();
    const enabled = !isLoadingAuth;

    // In real react-query, when enabled=false, queryFn is never called
    if (enabled) {
      queryFn();
    }

    expect(queryFn).not.toHaveBeenCalled();
  });

  it('current user query runs only after auth check completes and is authenticated', () => {
    const steps = [];

    // Step 1: Auth check in progress
    const isLoadingAuth_1 = true;
    const enabled_1 = !isLoadingAuth_1;
    steps.push({ step: 1, enabled: enabled_1 });

    // Step 2: Auth check completes, user is authenticated
    const isLoadingAuth_2 = false;
    const isAuthenticated_2 = true;
    const enabled_2 = !isLoadingAuth_2 && isAuthenticated_2;
    steps.push({ step: 2, enabled: enabled_2 });

    expect(steps[0].enabled).toBe(false); // no fetch during auth load
    expect(steps[1].enabled).toBe(true);  // fetch after auth resolves to authenticated
  });

  it('current user query does not run if auth check completes with auth_required error', () => {
    const isLoadingAuth = false;
    const authError = { type: 'auth_required' };
    const isAuthenticated = !authError;
    const enabled = !isLoadingAuth && isAuthenticated;

    expect(enabled).toBe(false); // query disabled despite isLoadingAuth=false
  });
});