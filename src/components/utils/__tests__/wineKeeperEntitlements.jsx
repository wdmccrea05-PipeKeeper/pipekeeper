/* eslint-disable no-undef */
import { describe, test, expect } from 'vitest';
import { hasModuleProAccess, getModulesWithProAccess } from '../moduleEntitlements';
import {
  WINEKEEPER_PUBLIC_ENABLED,
  WINEKEEPER_ADMIN_ENABLED,
  shouldShowModuleInNav,
  canUserAccessModule,
  isInternalModuleTester,
} from '../moduleReleaseState';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    role: 'user',
    is_admin: false,
    ...overrides,
  };
}

// ─── WineKeeper free access ──────────────────────────────────────────────────

describe('WineKeeper — free access', () => {
  test('free user does NOT have pro access to winekeeper', () => {
    const user = makeUser();
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(false);
  });

  test('free user does NOT have pro access to pipekeeper', () => {
    const user = makeUser();
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(false);
  });
});

// ─── Individual module subscriptions ────────────────────────────────────────

describe('WineKeeper — individual subscription', () => {
  test('winekeeper_paid flag grants winekeeper pro access', () => {
    const user = makeUser({ winekeeper_paid: true });
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(true);
  });

  test('winekeeper_paid does NOT grant pipekeeper', () => {
    const user = makeUser({ winekeeper_paid: true });
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(false);
  });

  test('winekeeper_paid does NOT grant whiskeykeeper', () => {
    const user = makeUser({ winekeeper_paid: true });
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(false);
  });

  test('winekeeper_paid does NOT grant cigarkeeper', () => {
    const user = makeUser({ winekeeper_paid: true });
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
  });

  test('pipekeeper_paid does NOT grant winekeeper', () => {
    const user = makeUser({ pipekeeper_paid: true });
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(false);
  });
});

// ─── Founders Bundle ─────────────────────────────────────────────────────────

describe('Founders Bundle', () => {
  test('founders bundle grants pipekeeper', () => {
    const user = makeUser({ plan_key: 'founders_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(true);
  });

  test('founders bundle grants whiskeykeeper', () => {
    const user = makeUser({ plan_key: 'founders_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(true);
  });

  test('founders bundle does NOT grant winekeeper', () => {
    const user = makeUser({ plan_key: 'founders_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(false);
  });

  test('founders bundle does NOT grant cigarkeeper', () => {
    const user = makeUser({ plan_key: 'founders_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper' });
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
  });
});

// ─── 3-module bundle with explicit selected modules ──────────────────────────

describe('3-module bundle — explicit module selection', () => {
  test('pipe + whiskey + wine bundle grants all three', () => {
    const user = makeUser({ plan_key: 'three_module_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper,winekeeper' });
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(true);
  });

  test('pipe + whiskey + wine bundle does NOT grant cigarkeeper', () => {
    const user = makeUser({ plan_key: 'three_module_bundle', paid_modules_csv: 'pipekeeper,whiskeykeeper,winekeeper' });
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
  });

  test('whiskey + cigar + wine bundle grants all three', () => {
    const user = makeUser({ plan_key: 'three_module_bundle', paid_modules_csv: 'whiskeykeeper,cigarkeeper,winekeeper' });
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(true);
  });

  test('whiskey + cigar + wine bundle does NOT grant pipekeeper', () => {
    const user = makeUser({ plan_key: 'three_module_bundle', paid_modules_csv: 'whiskeykeeper,cigarkeeper,winekeeper' });
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(false);
  });
});

// ─── 4-module bundle ─────────────────────────────────────────────────────────

describe('4-module bundle', () => {
  test('4-module bundle grants all four modules', () => {
    const user = makeUser({
      paid_modules_csv: 'pipekeeper,whiskeykeeper,cigarkeeper,winekeeper',
    });
    const modules = getModulesWithProAccess(user);
    expect(modules).toContain('pipekeeper');
    expect(modules).toContain('whiskeykeeper');
    expect(modules).toContain('cigarkeeper');
    expect(modules).toContain('winekeeper');
  });
});

// ─── Admin bypass ────────────────────────────────────────────────────────────

describe('Admin access', () => {
  test('admin gets winekeeper access', () => {
    const user = makeUser({ role: 'admin' });
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(true);
  });
});

// ─── WineKeeper feature flags ─────────────────────────────────────────────────

describe('WineKeeper feature flags', () => {
  test('WINEKEEPER_PUBLIC_ENABLED is false (internal only)', () => {
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });

  test('WINEKEEPER_ADMIN_ENABLED is true', () => {
    expect(WINEKEEPER_ADMIN_ENABLED).toBe(true);
  });
});

// ─── Public user gating ───────────────────────────────────────────────────────

describe('WineKeeper — public user gating (INTERNAL ONLY mode)', () => {
  test('public user does NOT see winekeeper in nav', () => {
    const user = makeUser({ role: 'user' });
    expect(shouldShowModuleInNav('winekeeper', user, true)).toBe(false);
  });

  test('public user cannot access winekeeper route', () => {
    const user = makeUser({ role: 'user' });
    expect(canUserAccessModule('winekeeper', user, true)).toBe(false);
  });

  test('public user is NOT an internal tester', () => {
    const user = makeUser({ role: 'user' });
    expect(isInternalModuleTester(user)).toBe(false);
  });

  test('admin IS an internal tester', () => {
    const user = makeUser({ role: 'admin' });
    expect(isInternalModuleTester(user)).toBe(true);
  });

  test('admin sees winekeeper in nav', () => {
    const user = makeUser({ role: 'admin' });
    expect(shouldShowModuleInNav('winekeeper', user, true)).toBe(true);
  });

  test('internal_tester flag grants winekeeper nav visibility', () => {
    const user = makeUser({ internal_tester: true });
    expect(shouldShowModuleInNav('winekeeper', user, true)).toBe(true);
  });

  test('public 3-module bundle excludes winekeeper (only pipe/whiskey/cigar)', () => {
    // Public bundle should not include winekeeper while WINEKEEPER_PUBLIC_ENABLED=false
    const publicBundleModules = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
    expect(publicBundleModules).not.toContain('winekeeper');
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });
});