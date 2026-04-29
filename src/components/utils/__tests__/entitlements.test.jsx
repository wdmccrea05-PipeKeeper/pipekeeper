/**
 * Unit tests for buildEntitlements (entitlements.jsx)
 *
 * Covers:
 *   - free tier limits and feature access
 *   - premium tier limits and allowed features
 *   - pro tier (unlimited, all features)
 *   - legacy premium (subscribed before Feb 1 2026 gets all features)
 *   - isOnTrial flag propagation
 */

import { buildEntitlements, PRO_LAUNCH_CUTOFF_ISO } from '../entitlements';

// ─── helpers ─────────────────────────────────────────────────────────────────

const freeInput = {
  isProSubscriber: false,
  isPaidSubscriber: false,
  isOnTrial: false,
  isFreeGrandfathered: false,
  subscriptionStartedAt: null,
};

const premiumInput = {
  isProSubscriber: false,
  isPaidSubscriber: true,
  isOnTrial: false,
  isFreeGrandfathered: false,
  subscriptionStartedAt: '2026-03-01T00:00:00.000Z', // after cutoff → new premium
};

const legacyPremiumInput = {
  isProSubscriber: false,
  isPaidSubscriber: true,
  isOnTrial: false,
  isFreeGrandfathered: false,
  subscriptionStartedAt: '2025-06-01T00:00:00.000Z', // before cutoff → legacy premium
};

const proInput = {
  isProSubscriber: true,
  isPaidSubscriber: false,
  isOnTrial: false,
  isFreeGrandfathered: false,
  subscriptionStartedAt: '2026-03-01T00:00:00.000Z',
};

// ─── tier assignment ──────────────────────────────────────────────────────────

describe('buildEntitlements — tier assignment', () => {
  test('free input returns tier = "free"', () => {
    expect(buildEntitlements(freeInput).tier).toBe('free');
  });

  test('premium input returns tier = "premium"', () => {
    expect(buildEntitlements(premiumInput).tier).toBe('premium');
  });

  test('pro input returns tier = "pro"', () => {
    expect(buildEntitlements(proInput).tier).toBe('pro');
  });
});

// ─── free tier limits ─────────────────────────────────────────────────────────

describe('buildEntitlements — free tier limits', () => {
  test('free tier has limited pipes', () => {
    const { limits } = buildEntitlements(freeInput);
    expect(limits.pipes).toBe(5);
  });

  test('free tier has limited tobaccos', () => {
    const { limits } = buildEntitlements(freeInput);
    expect(limits.tobaccos).toBe(10);
  });

  test('free tier has limited photos per item', () => {
    const { limits } = buildEntitlements(freeInput);
    expect(limits.photosPerItem).toBe(20);
  });
});

// ─── paid tier limits ─────────────────────────────────────────────────────────

describe('buildEntitlements — paid tier limits (premium and pro)', () => {
  test('premium tier has unlimited pipes', () => {
    const { limits } = buildEntitlements(premiumInput);
    expect(limits.pipes).toBe(Infinity);
  });

  test('pro tier has unlimited tobaccos', () => {
    const { limits } = buildEntitlements(proInput);
    expect(limits.tobaccos).toBe(Infinity);
  });
});

// ─── feature gating: free tier ───────────────────────────────────────────────

describe('buildEntitlements — free tier feature gating', () => {
  test('free user cannot use UNLIMITED_COLLECTION', () => {
    expect(buildEntitlements(freeInput).canUse('UNLIMITED_COLLECTION')).toBe(false);
  });

  test('free user cannot use SMOKING_LOG', () => {
    expect(buildEntitlements(freeInput).canUse('SMOKING_LOG')).toBe(false);
  });

  test('free user cannot use PAIRING_ADVANCED', () => {
    expect(buildEntitlements(freeInput).canUse('PAIRING_ADVANCED')).toBe(false);
  });
});

// ─── feature gating: premium tier ────────────────────────────────────────────

describe('buildEntitlements — premium tier feature gating', () => {
  test('new premium user can use UNLIMITED_COLLECTION', () => {
    expect(buildEntitlements(premiumInput).canUse('UNLIMITED_COLLECTION')).toBe(true);
  });

  test('new premium user can use SMOKING_LOG', () => {
    expect(buildEntitlements(premiumInput).canUse('SMOKING_LOG')).toBe(true);
  });

  test('new premium user cannot use pro-only feature PAIRING_ADVANCED', () => {
    expect(buildEntitlements(premiumInput).canUse('PAIRING_ADVANCED')).toBe(false);
  });

  test('new premium user cannot use pro-only feature BULK_EDIT', () => {
    expect(buildEntitlements(premiumInput).canUse('BULK_EDIT')).toBe(false);
  });
});

// ─── feature gating: pro tier ────────────────────────────────────────────────

describe('buildEntitlements — pro tier feature gating', () => {
  test('pro user can use UNLIMITED_COLLECTION', () => {
    expect(buildEntitlements(proInput).canUse('UNLIMITED_COLLECTION')).toBe(true);
  });

  test('pro user can use pro-only PAIRING_ADVANCED', () => {
    expect(buildEntitlements(proInput).canUse('PAIRING_ADVANCED')).toBe(true);
  });

  test('pro user can use pro-only BULK_EDIT', () => {
    expect(buildEntitlements(proInput).canUse('BULK_EDIT')).toBe(true);
  });

  test('pro user can use pro-only AI_IDENTIFY', () => {
    expect(buildEntitlements(proInput).canUse('AI_IDENTIFY')).toBe(true);
  });
});

// ─── legacy premium ───────────────────────────────────────────────────────────

describe('buildEntitlements — legacy premium (subscribed before cutoff)', () => {
  test('isLegacyPremium is true for old subscriber', () => {
    expect(buildEntitlements(legacyPremiumInput).isLegacyPremium).toBe(true);
  });

  test('isLegacyPremium is false for new subscriber', () => {
    expect(buildEntitlements(premiumInput).isLegacyPremium).toBe(false);
  });

  test('legacy premium user can use pro-only PAIRING_ADVANCED', () => {
    expect(buildEntitlements(legacyPremiumInput).canUse('PAIRING_ADVANCED')).toBe(true);
  });

  test('legacy premium user can use pro-only BULK_EDIT', () => {
    expect(buildEntitlements(legacyPremiumInput).canUse('BULK_EDIT')).toBe(true);
  });

  test('PRO_LAUNCH_CUTOFF_ISO matches the expected cutoff date', () => {
    expect(PRO_LAUNCH_CUTOFF_ISO).toBe('2026-02-01T00:00:00.000Z');
  });
});

// ─── trial flag ───────────────────────────────────────────────────────────────

describe('buildEntitlements — isOnTrial flag', () => {
  test('isOnTrial is propagated when true', () => {
    const result = buildEntitlements({ ...freeInput, isOnTrial: true });
    expect(result.isOnTrial).toBe(true);
  });

  test('isOnTrial is false when not set', () => {
    expect(buildEntitlements(freeInput).isOnTrial).toBe(false);
  });
});
