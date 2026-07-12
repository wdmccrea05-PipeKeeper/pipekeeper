/**
 * Unit tests for AuthContext bootstrap (AuthContext.jsx)
 *
 * Covers:
 *   - Successful login: user is set and isAuthenticated becomes true
 *   - 401/403 error: authError.type is 'auth_required' and isAuthenticated is false
 *   - Unknown error during auth check: authError.type is 'unknown'
 *   - No token: isAuthenticated stays false without calling base44.auth.me
 *   - useAuth throws when used outside AuthProvider
 *
 * All network calls are fully mocked — no real HTTP requests.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../lib/AuthContext';

// Mock the base44 client
vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(),
      logout: vi.fn(),
      redirectToLogin: vi.fn(),
    },
  },
}));

// Mock app-params — token present by default (overridden per test when needed)
vi.mock('@/lib/app-params', () => ({
  appParams: {
    appId: 'test-app-id',
    token: 'test-token',
    fromUrl: 'http://localhost/',
    functionsVersion: null,
  },
}));

// Mock createAxiosClient so no real HTTP calls are made
vi.mock('@base44/sdk/dist/utils/axios-client', () => ({
  createAxiosClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ id: 'test-app-id', public_settings: {} }),
  })),
}));

import { base44 } from '@/api/base44Client';

// ─── wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// ─── successful auth bootstrap ────────────────────────────────────────────────

describe('AuthContext — successful login bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    base44.auth.me.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
    });
  });

  test('isAuthenticated becomes true after successful auth check', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authError).toBeNull();
  });

  test('user object is populated after successful auth check', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.user).toMatchObject({ id: 'user-1', email: 'user@example.com' });
  });
});

// ─── 401/403 auth error ───────────────────────────────────────────────────────

describe('AuthContext — 401/403 auth error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const authError = Object.assign(new Error('Unauthorized'), { status: 401 });
    base44.auth.me.mockRejectedValue(authError);
  });

  test('isAuthenticated is false when auth check returns 401', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
  });

  test('authError.type is auth_required on 401', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.authError).toMatchObject({ type: 'auth_required' });
  });

  test('user is null on 401', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.user).toBeNull();
  });
});

// ─── unknown error ────────────────────────────────────────────────────────────

describe('AuthContext — unknown error during auth check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    base44.auth.me.mockRejectedValue(new Error('Unexpected server failure'));
  });

  test('authError.type is unknown for non-401 errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.authError).toMatchObject({ type: 'unknown' });
  });

  test('isAuthenticated is false on unknown error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoadingAuth).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthContext — logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    base44.auth.me.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    base44.auth.logout.mockImplementation(() => {});
  });

  test('logout clears the user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => {
      result.current.logout(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── useAuth outside provider ─────────────────────────────────────────────────

describe('useAuth — used outside AuthProvider', () => {
  test('throws an error when used without AuthProvider wrapper', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });
});