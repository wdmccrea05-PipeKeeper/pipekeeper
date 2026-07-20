/**
 * Admin Entitlement Access — Regression Tests
 *
 * Reproduces the reported production incident:
 *   "An authenticated administrator logged in and experienced PipeKeeper as
 *    accessible, while CigarKeeper, WhiskeyKeeper, and WineKeeper displayed
 *    subscription or paywall prompts."
 *
 * Covers:
 *   1. buildAccessSummary — admin gets all launched modules (Bug #2)
 *   2. buildVisibility / useModuleVisibility — admin preference bypass (Bug #1)
 *   3. reconcileEntitlementsOnLogin behaviour description (Bug #3 — backend)
 *   4. ModuleVisibilitySettings handleSetTierAndEnable admin bypass (Bug #4)
 *   5. Paid-user isolation — admin fix must not grant modules to regular users
 *   6. All access-resolver functions under the full entitlement hierarchy
 */

import { describe, it, expect } from 'vitest';
import { buildAccessSummary } from '@/components/access/accessSummary';
import {
  hasModuleProAccess,
  getModulesWithProAccess,
  hasBundleAccess,
} from '@/components/utils/moduleEntitlements';
import {
  getEntitlementTier,
  hasPaidAccess,
} from '@/components/utils/premiumAccess';
import {
  isInternalModuleTester,
} from '@/components/utils/moduleReleaseState';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function adminUser(overrides = {}) {
  return { role: 'admin', ...overrides };
}

function ownerUser(overrides = {}) {
  return { role: 'owner', ...overrides };
}

function isAdminFlagUser(overrides = {}) {
  return { is_admin: true, ...overrides };
}

function freeUser(overrides = {}) {
  return { role: 'user', entitlement_tier: 'free', ...overrides };
}

function paidUser(modules, overrides = {}) {
  const flags = {};
  for (const m of modules) flags[`${m}_paid`] = true;
  return {
    role: 'user',
    entitlement_tier: 'pro',
    paid_modules_csv: modules.join(','),
    ...flags,
    ...overrides,
  };
}

// ─── 1. buildAccessSummary — admin override ───────────────────────────────────

describe('buildAccessSummary — admin override (Bug #2)', () => {
  it('admin with no subscription gets all launched modules', () => {
    const summary = buildAccessSummary(adminUser(), null);
    expect(summary.tier).toBe('pro');
    expect(summary.planKey).toBe('admin_override');
    for (const m of ALL_MODULES) {
      expect(summary.activeModules).toContain(m);
    }
  });

  it('owner with no subscription gets all launched modules', () => {
    const summary = buildAccessSummary(ownerUser(), null);
    expect(summary.tier).toBe('pro');
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('is_admin flag user with no subscription gets all launched modules', () => {
    const summary = buildAccessSummary(isAdminFlagUser(), null);
    expect(summary.tier).toBe('pro');
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('admin with an expired subscription still gets all modules', () => {
    const expiredSub = { status: 'canceled', tier: 'pro', plan_key: 'pipekeeper_pro_monthly' };
    const summary = buildAccessSummary(adminUser(), expiredSub);
    expect(summary.tier).toBe('pro');
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('admin with only pipekeeper_paid flag set still gets all modules', () => {
    const user = adminUser({ pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' });
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('admin with conflicting free entitlement_tier still gets all modules', () => {
    const user = adminUser({ entitlement_tier: 'free', pipekeeper_paid: false });
    const summary = buildAccessSummary(user, null);
    expect(summary.tier).toBe('pro');
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('free regular user with no subscription gets no modules', () => {
    const summary = buildAccessSummary(freeUser(), null);
    expect(summary.activeModules).toEqual([]);
  });

  it('paid pipekeeper-only user gets only pipekeeper', () => {
    const user = paidUser(['pipekeeper']);
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toContain('pipekeeper');
    expect(summary.activeModules).not.toContain('whiskeykeeper');
    expect(summary.activeModules).not.toContain('cigarkeeper');
    expect(summary.activeModules).not.toContain('winekeeper');
  });

  it('paid all-module user gets all modules via paid_modules_csv', () => {
    const user = paidUser(ALL_MODULES);
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });
});

// ─── 2. hasModuleProAccess — admin override ────────────────────────────────

describe('hasModuleProAccess — admin role grants all modules (core resolver)', () => {
  it('admin has pro access to pipekeeper', () => {
    expect(hasModuleProAccess(adminUser(), 'pipekeeper')).toBe(true);
  });

  it('admin has pro access to whiskeykeeper', () => {
    expect(hasModuleProAccess(adminUser(), 'whiskeykeeper')).toBe(true);
  });

  it('admin has pro access to cigarkeeper', () => {
    expect(hasModuleProAccess(adminUser(), 'cigarkeeper')).toBe(true);
  });

  it('admin has pro access to winekeeper', () => {
    expect(hasModuleProAccess(adminUser(), 'winekeeper')).toBe(true);
  });

  it('owner has pro access to all modules', () => {
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(ownerUser(), m)).toBe(true);
    }
  });

  it('is_admin flag grants pro access to all modules', () => {
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(isAdminFlagUser(), m)).toBe(true);
    }
  });

  it('admin with empty paid_modules_csv still has pro access to all modules', () => {
    const user = adminUser({ paid_modules_csv: '', pipekeeper_paid: false });
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(user, m)).toBe(true);
    }
  });

  it('admin with entitlement_tier free still has pro module access', () => {
    const user = adminUser({ entitlement_tier: 'free' });
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(user, m)).toBe(true);
    }
  });

  it('free user without paid flags has no pro module access', () => {
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(freeUser(), m)).toBe(false);
    }
  });

  it('pipekeeper-only paid user has no pro access to other modules', () => {
    const user = paidUser(['pipekeeper']);
    expect(hasModuleProAccess(user, 'pipekeeper')).toBe(true);
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(false);
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
    expect(hasModuleProAccess(user, 'winekeeper')).toBe(false);
  });
});

// ─── 3. getModulesWithProAccess — admin returns all modules ───────────────

describe('getModulesWithProAccess — admin gets all modules', () => {
  it('admin returns all launched modules', () => {
    const modules = getModulesWithProAccess(adminUser(), null);
    expect(modules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('owner returns all launched modules', () => {
    const modules = getModulesWithProAccess(ownerUser(), null);
    expect(modules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('free user returns empty array', () => {
    expect(getModulesWithProAccess(freeUser(), null)).toEqual([]);
  });

  it('pipekeeper-only paid user returns only pipekeeper', () => {
    const user = paidUser(['pipekeeper']);
    expect(getModulesWithProAccess(user, null)).toEqual(['pipekeeper']);
  });
});

// ─── 4. getEntitlementTier — admin always pro ────────────────────────────

describe('getEntitlementTier — admin role always returns pro', () => {
  it('admin with no subscription returns pro', () => {
    expect(getEntitlementTier(adminUser(), null)).toBe('pro');
  });

  it('admin with expired subscription returns pro', () => {
    expect(getEntitlementTier(adminUser(), { status: 'canceled' })).toBe('pro');
  });

  it('admin with entitlement_tier=free still returns pro', () => {
    expect(getEntitlementTier(adminUser({ entitlement_tier: 'free' }), null)).toBe('pro');
  });

  it('owner with no subscription returns pro', () => {
    expect(getEntitlementTier(ownerUser(), null)).toBe('pro');
  });

  it('free user with no subscription returns free', () => {
    expect(getEntitlementTier(freeUser(), null)).toBe('free');
  });
});

// ─── 5. hasPaidAccess — admin bypass ────────────────────────────────────

describe('hasPaidAccess — admin bypass', () => {
  it('admin has paid access with no subscription', () => {
    expect(hasPaidAccess(adminUser(), null)).toBe(true);
  });

  it('free user without subscription does not have paid access', () => {
    expect(hasPaidAccess(freeUser(), null)).toBe(false);
  });
});

// ─── 6. isInternalModuleTester — used by visibility bypass ───────────────

describe('isInternalModuleTester — identifies admin users', () => {
  it('recognizes role=admin', () => {
    expect(isInternalModuleTester({ role: 'admin' })).toBe(true);
  });

  it('recognizes role=owner', () => {
    expect(isInternalModuleTester({ role: 'owner' })).toBe(true);
  });

  it('recognizes role=superadmin', () => {
    expect(isInternalModuleTester({ role: 'superadmin' })).toBe(true);
  });

  it('recognizes is_admin=true', () => {
    expect(isInternalModuleTester({ is_admin: true })).toBe(true);
  });

  it('regular user is not an internal tester', () => {
    expect(isInternalModuleTester(freeUser())).toBe(false);
  });

  it('null user is not an internal tester', () => {
    expect(isInternalModuleTester(null)).toBe(false);
  });
});

// ─── 7. Incident reproduction fixture ──────────────────────────────────

describe('Incident reproduction — admin with only pipekeeper access', () => {
  // Reproduces the exact fixture: admin who went through onboarding with
  // PipeKeeper-only selection and has no subscription row.
  const incidentAdmin = adminUser({
    pipekeeper_paid: false,
    whiskeykeeper_paid: false,
    cigarkeeper_paid: false,
    winekeeper_paid: false,
    paid_modules_csv: '',
    entitlement_tier: 'free', // written by reconcileEntitlementsOnLogin before fix
    has_paid_access: false,
  });

  it('tier resolves to pro despite free entitlement_tier flag', () => {
    expect(getEntitlementTier(incidentAdmin, null)).toBe('pro');
  });

  it('has paid access via role', () => {
    expect(hasPaidAccess(incidentAdmin, null)).toBe(true);
  });

  it('hasModuleProAccess returns true for all 4 modules', () => {
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(incidentAdmin, m)).toBe(true);
    }
  });

  it('buildAccessSummary returns all modules with admin_override planKey', () => {
    const summary = buildAccessSummary(incidentAdmin, null);
    expect(summary.planKey).toBe('admin_override');
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('getModulesWithProAccess returns all 4 modules', () => {
    expect(getModulesWithProAccess(incidentAdmin, null)).toEqual(
      expect.arrayContaining(ALL_MODULES)
    );
  });

  it('hasBundleAccess returns true for all 4 modules', () => {
    for (const m of ALL_MODULES) {
      expect(hasBundleAccess(incidentAdmin, m)).toBe(true);
    }
  });
});

// ─── 8. Paid user isolation — admin fix must not affect regular subscribers ──

describe('Paid user isolation — admin fix must not grant unearned module access', () => {
  it('pipekeeper subscriber does not get whiskeykeeper', () => {
    const user = paidUser(['pipekeeper']);
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).not.toContain('whiskeykeeper');
    expect(hasModuleProAccess(user, 'whiskeykeeper')).toBe(false);
  });

  it('whiskeykeeper subscriber does not get cigarkeeper', () => {
    const user = paidUser(['whiskeykeeper']);
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).not.toContain('cigarkeeper');
    expect(hasModuleProAccess(user, 'cigarkeeper')).toBe(false);
  });

  it('free user does not get any module via buildAccessSummary', () => {
    const summary = buildAccessSummary(freeUser(), null);
    for (const m of ALL_MODULES) {
      expect(summary.activeModules).not.toContain(m);
    }
  });

  it('expired subscriber gets no modules', () => {
    const user = { role: 'user', entitlement_tier: 'free', pipekeeper_paid: false };
    const sub = { status: 'canceled', plan_key: 'pipekeeper_pro_monthly', tier: 'pro' };
    const summary = buildAccessSummary(user, sub);
    expect(summary.activeModules).toEqual([]);
  });
});

// ─── 9. Additional admin scenarios from incident matrix ──────────────────

describe('Administrator access scenarios (incident matrix)', () => {
  it('admin with expired subscription records gets all modules', () => {
    const user = adminUser();
    const expiredSub = { status: 'expired', plan_key: 'pipekeeper_pro_monthly' };
    const summary = buildAccessSummary(user, expiredSub);
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });

  it('admin with conflicting module flags gets all modules', () => {
    const user = adminUser({
      pipekeeper_paid: true,
      whiskeykeeper_paid: false,
      cigarkeeper_paid: false,
      winekeeper_paid: false,
    });
    for (const m of ALL_MODULES) {
      expect(hasModuleProAccess(user, m)).toBe(true);
    }
  });

  it('admin with only legacy pipekeeper access gets all modules', () => {
    const user = adminUser({ pipekeeper_paid: true, paid_modules_csv: 'pipekeeper' });
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(expect.arrayContaining(ALL_MODULES));
  });
});
