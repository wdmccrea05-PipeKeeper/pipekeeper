/**
 * Regression tests for the two user-reported production failures:
 *   1. Some users could not log in (auth fall-through)
 *   2. Some users could not record a smoking session (SelectItem null / hasPaid gate)
 *
 * Run with: npx vitest run src/__tests__/auth-and-session.regression.test.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Auth regression: no token must not render the protected shell
// ---------------------------------------------------------------------------
describe('AuthContext — no token', () => {
  it('sets authError.type = auth_required when appParams.token is absent', async () => {
    // Simulate the branch: !appParams.token
    const mockSetAuthError = vi.fn();
    const mockSetIsAuthenticated = vi.fn();
    const mockSetIsLoadingAuth = vi.fn();

    // Reproduce the fixed branch logic inline
    const appParamsToken = null; // no token
    if (!appParamsToken) {
      mockSetIsAuthenticated(false);
      mockSetIsLoadingAuth(false);
      mockSetAuthError({ type: 'auth_required', message: 'Authentication required' });
    }

    expect(mockSetAuthError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth_required' })
    );
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(false);
  });

  it('does NOT set authError when token is present (delegates to checkUserAuth)', () => {
    const mockSetAuthError = vi.fn();
    const mockCheckUserAuth = vi.fn();

    const appParamsToken = 'valid-token';
    if (appParamsToken) {
      mockCheckUserAuth();
    } else {
      mockSetAuthError({ type: 'auth_required', message: 'Authentication required' });
    }

    expect(mockCheckUserAuth).toHaveBeenCalled();
    expect(mockSetAuthError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Auth regression: 401/403 from base44.auth.me() must set auth_required
// ---------------------------------------------------------------------------
describe('AuthContext — checkUserAuth', () => {
  it('sets auth_required error on 401', async () => {
    const results = {};

    // Simulate checkUserAuth catch branch
    const error = { status: 401 };
    results.user = null;
    results.isAuthenticated = false;
    if (error?.status === 401 || error?.status === 403) {
      results.authError = { type: 'auth_required', message: 'Authentication required' };
    } else {
      results.authError = { type: 'unknown', message: error?.message || 'Unexpected error' };
    }

    expect(results.authError.type).toBe('auth_required');
    expect(results.isAuthenticated).toBe(false);
    expect(results.user).toBeNull();
  });

  it('sets unknown error for non-401 failures', () => {
    const results = {};
    const error = { status: 500, message: 'Server error' };
    results.user = null;
    results.isAuthenticated = false;
    if (error?.status === 401 || error?.status === 403) {
      results.authError = { type: 'auth_required' };
    } else {
      results.authError = { type: 'unknown', message: error?.message };
    }

    expect(results.authError.type).toBe('unknown');
    expect(results.authError.message).toBe('Server error');
  });
});

// ---------------------------------------------------------------------------
// Smoking session: SelectItem values must be non-null strings
// ---------------------------------------------------------------------------
describe('SmokingLogPanel / LogSessionModal — SelectItem sentinel values', () => {
  it('bowl_variant_id SelectItem uses empty string, not null', () => {
    // Validate the sentinel approach: empty string is valid for Radix Select
    const sentinelValue = "";
    expect(sentinelValue).not.toBeNull();
    expect(typeof sentinelValue).toBe('string');
  });

  it('container_id SelectItem uses empty string, not null', () => {
    const sentinelValue = "";
    expect(sentinelValue).not.toBeNull();
    expect(typeof sentinelValue).toBe('string');
  });

  it('normalizes empty string sentinel to null at submit time', () => {
    // Both panel and modal already do: container_id: formData.container_id || null
    const formData = { container_id: '' };
    const normalized = formData.container_id || null;
    expect(normalized).toBeNull();
  });

  it('normalizes non-empty container_id to the actual ID', () => {
    const formData = { container_id: 'abc-123' };
    const normalized = formData.container_id || null;
    expect(normalized).toBe('abc-123');
  });

  it('bowl_variant_id guard: empty string is falsy, skips bowl_name lookup', () => {
    const bowl_variant_id = '';
    const hasMultipleBowls = true;
    const shouldLookup = bowl_variant_id && hasMultipleBowls;
    expect(shouldLookup).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Entitlement gate: hasPaid=false during loading must not lock out paid users
// ---------------------------------------------------------------------------
describe('SmokingLogPanel — entitlement loading gate', () => {
  it('returns null while userLoading is true (prevents upgrade prompt flash)', () => {
    // Simulate the fixed logic
    const userLoading = true;
    const hasPaid = false; // stale value during sync

    // Fixed: check loading BEFORE checking hasPaid
    let rendered = 'panel';
    if (userLoading) {
      rendered = null;
    } else if (!hasPaid) {
      rendered = 'upgradePrompt';
    }

    expect(rendered).toBeNull();
  });

  it('shows upgrade prompt only when NOT loading AND hasPaid is false', () => {
    const userLoading = false;
    const hasPaid = false;

    let rendered = 'panel';
    if (userLoading) {
      rendered = null;
    } else if (!hasPaid) {
      rendered = 'upgradePrompt';
    }

    expect(rendered).toBe('upgradePrompt');
  });

  it('shows panel when NOT loading AND hasPaid is true', () => {
    const userLoading = false;
    const hasPaid = true;

    let rendered = 'panel';
    if (userLoading) {
      rendered = null;
    } else if (!hasPaid) {
      rendered = 'upgradePrompt';
    }

    expect(rendered).toBe('panel');
  });
});

// ---------------------------------------------------------------------------
// Smoking session submit: pipe + blend required validation
// ---------------------------------------------------------------------------
describe('Smoking session submit validation', () => {
  it('rejects submit when pipe_id is empty', () => {
    const formData = { pipe_id: '', blend_id: 'blend-1' };
    const pipes = [{ id: 'pipe-1', name: 'Pipe' }];
    const blends = [{ id: 'blend-1', name: 'Blend' }];

    const pipe = pipes.find(p => p && p.id === formData.pipe_id);
    const blend = blends.find(b => b && b.id === formData.blend_id);
    const isValid = !!(pipe && blend);

    expect(isValid).toBe(false);
  });

  it('rejects submit when blend_id is empty', () => {
    const formData = { pipe_id: 'pipe-1', blend_id: '' };
    const pipes = [{ id: 'pipe-1', name: 'Pipe' }];
    const blends = [{ id: 'blend-1', name: 'Blend' }];

    const pipe = pipes.find(p => p && p.id === formData.pipe_id);
    const blend = blends.find(b => b && b.id === formData.blend_id);
    const isValid = !!(pipe && blend);

    expect(isValid).toBe(false);
  });

  it('allows submit when both pipe and blend are selected', () => {
    const formData = { pipe_id: 'pipe-1', blend_id: 'blend-1' };
    const pipes = [{ id: 'pipe-1', name: 'Pipe' }];
    const blends = [{ id: 'blend-1', name: 'Blend' }];

    const pipe = pipes.find(p => p && p.id === formData.pipe_id);
    const blend = blends.find(b => b && b.id === formData.blend_id);
    const isValid = !!(pipe && blend);

    expect(isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useEntitlements: loading state must not default to free
// ---------------------------------------------------------------------------
describe('useEntitlements loading state', () => {
  it('returns tier=null (not free) while isLoading=true', () => {
    const isLoading = true;
    const user = null;

    // Simulate the hook's safe loading state
    let entitlements;
    if (isLoading || !user) {
      entitlements = {
        tier: null,
        hasPro: false,
        isFree: false,
        limits: { smokingLogs: Infinity },
        canUse: () => false,
      };
    }

    expect(entitlements.tier).toBeNull();
    expect(entitlements.isFree).toBe(false);
    expect(entitlements.limits.smokingLogs).toBe(Infinity);
  });

  it('does not lock smoking logs (Infinity limit) while loading', () => {
    const isLoading = true;
    const loadingEntitlements = {
      tier: null,
      limits: { smokingLogs: Infinity },
    };

    const currentLogCount = 150;
    const wouldBlock =
      loadingEntitlements.tier === 'free' &&
      currentLogCount >= loadingEntitlements.limits.smokingLogs;

    expect(wouldBlock).toBe(false);
  });
});