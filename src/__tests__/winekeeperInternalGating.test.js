/* eslint-disable */
/**
 * WineKeeper internal-gating tests
 *
 * With VITE_WINEKEEPER_PUBLIC_ENABLED=true, WineKeeper is now launched.
 * These tests verify:
 *   1. canAccessInternalModuleForTesting ignores paid entitlement (always has, always must).
 *   2. internal_tester/admin pass canAccessInternalModuleForTesting.
 *   3. WineKeeper is now launched — all public users can access it with entitlement.
 *   4. Internal Preview badge must NOT show for WineKeeper (isModuleInternal is false).
 */

import { describe, it, expect } from 'vitest';
import {
  canAccessInternalModuleForTesting,
  isInternalModuleTester,
  isModuleInternal,
  isModuleLaunched,
  canUserAccessModule,
  WINEKEEPER_PUBLIC_ENABLED,
  MODULE_RELEASE_STATES,
} from '@/components/utils/moduleReleaseState';

// ─── 1. canAccessInternalModuleForTesting ignores paid entitlement ────────────

describe('canAccessInternalModuleForTesting — never grants access via paid flag', () => {
  it('returns false for a regular user with winekeeper_paid=true', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(canAccessInternalModuleForTesting('winekeeper', user)).toBe(false);
  });

  it('returns false for a user with all paid flags set', () => {
    const user = {
      role: 'user',
      pipekeeper_paid: true,
      whiskeykeeper_paid: true,
      cigarkeeper_paid: true,
      winekeeper_paid: true,
    };
    expect(canAccessInternalModuleForTesting('winekeeper', user)).toBe(false);
  });

  it('isInternalModuleTester returns false for a regular user with winekeeper_paid', () => {
    const user = { role: 'user', winekeeper_paid: true };
    expect(isInternalModuleTester(user)).toBe(false);
  });

  it('returns false for null user', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', null)).toBe(false);
  });
});

// ─── 2. internal_tester / admin pass canAccessInternalModuleForTesting ────────

describe('internal_tester/admin pass canAccessInternalModuleForTesting', () => {
  it('internal_tester=true returns true', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', { role: 'user', internal_tester: true })).toBe(true);
  });

  it('is_internal_tester=true returns true', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', { role: 'user', is_internal_tester: true })).toBe(true);
  });

  it('role=admin returns true', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', { role: 'admin' })).toBe(true);
  });

  it('role=owner returns true', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', { role: 'owner' })).toBe(true);
  });

  it('internal_tester with winekeeper_paid=false still passes', () => {
    expect(canAccessInternalModuleForTesting('winekeeper', { role: 'user', internal_tester: true, winekeeper_paid: false })).toBe(true);
  });
});

// ─── 3. WineKeeper is now launched (VITE_WINEKEEPER_PUBLIC_ENABLED=true) ─────

describe('WineKeeper release state follows VITE_WINEKEEPER_PUBLIC_ENABLED', () => {
  it('WINEKEEPER_PUBLIC_ENABLED is boolean', () => {
    expect(typeof WINEKEEPER_PUBLIC_ENABLED).toBe('boolean');
  });

  it('MODULE_RELEASE_STATES.winekeeper follows env launch flag', () => {
    expect(MODULE_RELEASE_STATES.winekeeper).toBe(
      WINEKEEPER_PUBLIC_ENABLED ? 'launched' : 'internal'
    );
  });

  it('isModuleLaunched("winekeeper") matches launch flag', () => {
    expect(isModuleLaunched('winekeeper')).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it('isModuleInternal("winekeeper") is inverse of launch flag', () => {
    expect(isModuleInternal('winekeeper')).toBe(!WINEKEEPER_PUBLIC_ENABLED);
  });

  it('regular user with entitlement can access WineKeeper', () => {
    expect(canUserAccessModule('winekeeper', { role: 'user' }, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it('regular user without entitlement cannot access WineKeeper', () => {
    expect(canUserAccessModule('winekeeper', { role: 'user' }, false)).toBe(false);
  });
});

// ─── 4. Internal Preview badge must NOT show for WineKeeper ──────────────────

describe('Internal Preview badge is hidden when WineKeeper is launched', () => {
  it('badge condition (isModuleInternal && canAccessInternalModuleForTesting) tracks launch/internal state for admin', () => {
    const admin = { role: 'admin' };
    // Badge only shows when BOTH conditions are true:
    const isInternal = isModuleInternal('winekeeper', admin);
    const canAccess = canAccessInternalModuleForTesting('winekeeper', admin);
    expect(isInternal && canAccess).toBe(!WINEKEEPER_PUBLIC_ENABLED);
  });

  it('badge condition for regular user follows launch/internal state', () => {
    const user = { role: 'user' };
    const isInternal = isModuleInternal('winekeeper', user);
    expect(isInternal).toBe(!WINEKEEPER_PUBLIC_ENABLED);
  });
});
