/**
 * WineKeeper public launch flag tests.
 *
 * Covers requirements:
 *   1. WineKeeper hidden when VITE_WINEKEEPER_PUBLIC_ENABLED is false (default)
 *   2. WineKeeper visible when VITE_WINEKEEPER_PUBLIC_ENABLED is true
 *   3. WineKeeper subscription plans appear when launched (stripeConfig)
 *   4. WineKeeper plans hidden when internal (stripeConfig)
 *   5. 4-module bundle appears when WineKeeper is launched (stripeConfig)
 *   6. WineKeeper checkout route is /WineKeeper
 *   7. WineKeeper paid flag alone does not expose module when internal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// 1 & 7 — Internal mode (default: no env var set)
// ─────────────────────────────────────────────────────────────────────────────
describe('WineKeeper internal (flag false)', () => {
  it('WINEKEEPER_PUBLIC_ENABLED is false when env var is absent', async () => {
    const { WINEKEEPER_PUBLIC_ENABLED } = await import('@/components/utils/moduleReleaseState');
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });

  it('winekeeper release state is internal when flag is false', async () => {
    const { getModuleReleaseState } = await import('@/components/utils/moduleReleaseState');
    expect(getModuleReleaseState('winekeeper')).toBe('internal');
  });

  it('isModuleLaunched returns false for winekeeper when flag is false', async () => {
    const { isModuleLaunched } = await import('@/components/utils/moduleReleaseState');
    expect(isModuleLaunched('winekeeper')).toBe(false);
  });

  it('winekeeper_paid=true alone does not expose module when internal', async () => {
    const { canUserAccessModule } = await import('@/components/utils/moduleReleaseState');
    const paidUser = { role: 'user', winekeeper_paid: true, paid_modules_csv: 'winekeeper' };
    expect(canUserAccessModule('winekeeper', paidUser, true)).toBe(false);
  });

  it('shouldShowModuleInNav returns false for public paid user when internal', async () => {
    const { shouldShowModuleInNav } = await import('@/components/utils/moduleReleaseState');
    const paidUser = { role: 'user', winekeeper_paid: true };
    expect(shouldShowModuleInNav('winekeeper', paidUser, true)).toBe(false);
  });

  it('shouldExposeModuleInCurator returns false for public user when internal', async () => {
    const { shouldExposeModuleInCurator } = await import('@/components/utils/moduleReleaseState');
    const publicUser = { role: 'user' };
    expect(shouldExposeModuleInCurator('winekeeper', publicUser, true)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 — Launched mode (env var set to 'true')
// ─────────────────────────────────────────────────────────────────────────────
describe('WineKeeper launched (flag true)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_WINEKEEPER_PUBLIC_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('WINEKEEPER_PUBLIC_ENABLED is true when env var is set', async () => {
    const { WINEKEEPER_PUBLIC_ENABLED } = await import('@/components/utils/moduleReleaseState');
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(true);
  });

  it('winekeeper release state is launched when flag is true', async () => {
    const { getModuleReleaseState } = await import('@/components/utils/moduleReleaseState');
    expect(getModuleReleaseState('winekeeper')).toBe('launched');
  });

  it('isModuleLaunched returns true for winekeeper when flag is true', async () => {
    const { isModuleLaunched } = await import('@/components/utils/moduleReleaseState');
    expect(isModuleLaunched('winekeeper')).toBe(true);
  });

  it('shouldShowModuleInNav returns true for entitled user when launched', async () => {
    const { shouldShowModuleInNav } = await import('@/components/utils/moduleReleaseState');
    const paidUser = { role: 'user', winekeeper_paid: true };
    expect(shouldShowModuleInNav('winekeeper', paidUser, true)).toBe(true);
  });

  it('shouldExposeModuleInCurator returns true for entitled user when launched', async () => {
    const { shouldExposeModuleInCurator } = await import('@/components/utils/moduleReleaseState');
    const paidUser = { role: 'user', winekeeper_paid: true };
    expect(shouldExposeModuleInCurator('winekeeper', paidUser, true)).toBe(true);
  });

  it('canUserAccessModule returns true for entitled user when launched', async () => {
    const { canUserAccessModule } = await import('@/components/utils/moduleReleaseState');
    const paidUser = { role: 'user', winekeeper_paid: true };
    expect(canUserAccessModule('winekeeper', paidUser, true)).toBe(true);
  });

  it('free user without entitlement does not access winekeeper even when launched', async () => {
    const { canUserAccessModule } = await import('@/components/utils/moduleReleaseState');
    const freeUser = { role: 'user' };
    expect(canUserAccessModule('winekeeper', freeUser, false)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 & 4 — Stripe plan availability mirrors winekeeper launch state
// ─────────────────────────────────────────────────────────────────────────────
describe('WineKeeper Stripe plan availability — internal mode', () => {
  beforeEach(() => {
    vi.resetModules();
    // Ensure env var not set (internal mode)
    vi.stubEnv('VITE_WINEKEEPER_PUBLIC_ENABLED', '');
    vi.stubEnv('VITE_STRIPE_WINEKEEPER_MONTHLY', 'price_wine_monthly_test');
    vi.stubEnv('VITE_STRIPE_WINEKEEPER_ANNUAL', 'price_wine_annual_test');
    vi.stubEnv('VITE_STRIPE_FOUR_BUNDLE_MONTHLY', 'price_four_monthly_test');
    vi.stubEnv('VITE_STRIPE_FOUR_BUNDLE_ANNUAL', 'price_four_annual_test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('winekeeper_pro_monthly is unavailable when internal', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_monthly.isAvailable).toBe(false);
  });

  it('winekeeper_pro_annual is unavailable when internal', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_annual.isAvailable).toBe(false);
  });

  it('four_module_bundle_monthly is unavailable when winekeeper is internal', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.four_module_bundle_monthly.isAvailable).toBe(false);
  });

  it('four_module_bundle_annual is unavailable when winekeeper is internal', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.four_module_bundle_annual.isAvailable).toBe(false);
  });

  it('winekeeper unavailableReason mentions not publicly launched when internal', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_monthly.unavailableReason).toMatch(/not publicly launched/i);
  });
});

describe('WineKeeper Stripe plan availability — launched mode', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_WINEKEEPER_PUBLIC_ENABLED', 'true');
    vi.stubEnv('VITE_STRIPE_WINEKEEPER_MONTHLY', 'price_wine_monthly_test');
    vi.stubEnv('VITE_STRIPE_WINEKEEPER_ANNUAL', 'price_wine_annual_test');
    vi.stubEnv('VITE_STRIPE_FOUR_BUNDLE_MONTHLY', 'price_four_monthly_test');
    vi.stubEnv('VITE_STRIPE_FOUR_BUNDLE_ANNUAL', 'price_four_annual_test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('winekeeper_pro_monthly is available when launched and env var exists', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_monthly.isAvailable).toBe(true);
  });

  it('winekeeper_pro_annual is available when launched and env var exists', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_annual.isAvailable).toBe(true);
  });

  it('four_module_bundle_monthly is available when winekeeper is launched and env var exists', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.four_module_bundle_monthly.isAvailable).toBe(true);
  });

  it('four_module_bundle_annual is available when winekeeper is launched and env var exists', async () => {
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.four_module_bundle_annual.isAvailable).toBe(true);
  });

  it('winekeeper_pro_monthly is unavailable when launched but env var missing', async () => {
    vi.stubEnv('VITE_STRIPE_WINEKEEPER_MONTHLY', '');
    const { buildStripeConfig } = await import('@/components/subscription/stripeConfig');
    const config = buildStripeConfig();
    expect(config.winekeeper_pro_monthly.isAvailable).toBe(false);
    expect(config.winekeeper_pro_monthly.unavailableReason).toMatch(/not configured/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 — Checkout route
// ─────────────────────────────────────────────────────────────────────────────
describe('WineKeeper checkout success route', () => {
  it('winekeeper success route is /WineKeeper', async () => {
    const { getModuleSuccessRoute } = await import('@/components/subscription/moduleRoutes');
    expect(getModuleSuccessRoute('winekeeper')).toBe('/WineKeeper');
  });

  it('other module routes are unchanged', async () => {
    const { getModuleSuccessRoute } = await import('@/components/subscription/moduleRoutes');
    expect(getModuleSuccessRoute('pipekeeper')).toBe('/PipeKeeper');
    expect(getModuleSuccessRoute('whiskeykeeper')).toBe('/WhiskeyKeeper');
    expect(getModuleSuccessRoute('cigarkeeper')).toBe('/CigarKeeper');
  });
});
