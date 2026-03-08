/**
 * Unit tests for canonical entitlement resolver (premiumAccess.jsx)
 *
 * Covers:
 *   - getEntitlementTier: all resolution paths (user fields, subscription entity, admin override)
 *   - hasPaidAccess / hasPremiumAccess / hasProAccess
 *   - isLegacyPremium
 *   - getPlanLabel
 */

import {
  getEntitlementTier,
  hasPaidAccess,
  hasPremiumAccess,
  hasProAccess,
  isLegacyPremium,
  getPlanLabel,
} from '../premiumAccess';

// ─── getEntitlementTier ───────────────────────────────────────────────────────

describe('getEntitlementTier — free user', () => {
  test('returns free for null user and no subscription', () => {
    expect(getEntitlementTier(null, null)).toBe('free');
  });

  test('returns free for empty user object', () => {
    expect(getEntitlementTier({}, null)).toBe('free');
  });

  test('returns free for unknown tier string', () => {
    expect(getEntitlementTier({ entitlement_tier: 'vip' }, null)).toBe('free');
  });
});

describe('getEntitlementTier — premium user', () => {
  test('resolves via user.entitlement_tier = "premium"', () => {
    expect(getEntitlementTier({ entitlement_tier: 'premium' }, null)).toBe('premium');
  });

  test('resolves via user.data.entitlement_tier (nested data blob)', () => {
    expect(getEntitlementTier({ data: { entitlement_tier: 'premium' } }, null)).toBe('premium');
  });

  test('resolves via legacy synonyms: "paid"', () => {
    expect(getEntitlementTier({ entitlement_tier: 'paid' }, null)).toBe('premium');
  });

  test('resolves via legacy synonyms: "subscriber"', () => {
    expect(getEntitlementTier({ entitlement_tier: 'subscriber' }, null)).toBe('premium');
  });

  test('resolves via legacy user field subscription_tier', () => {
    expect(getEntitlementTier({ subscription_tier: 'premium' }, null)).toBe('premium');
  });

  test('resolves via subscription entity with active status and premium tier', () => {
    const sub = { status: 'active', tier: 'premium' };
    expect(getEntitlementTier({}, sub)).toBe('premium');
  });

  test('resolves via subscription entity with trialing status', () => {
    const sub = { status: 'trialing', tier: 'premium' };
    expect(getEntitlementTier({}, sub)).toBe('premium');
  });
});

describe('getEntitlementTier — pro user', () => {
  test('resolves via user.entitlement_tier = "pro"', () => {
    expect(getEntitlementTier({ entitlement_tier: 'pro' }, null)).toBe('pro');
  });

  test('resolves via subscription entity with pro tier', () => {
    const sub = { status: 'active', tier: 'pro' };
    expect(getEntitlementTier({}, sub)).toBe('pro');
  });
});

describe('getEntitlementTier — admin override', () => {
  test('admin role always gets pro tier', () => {
    expect(getEntitlementTier({ role: 'admin' }, null)).toBe('pro');
  });

  test('owner role always gets pro tier', () => {
    expect(getEntitlementTier({ role: 'owner' }, null)).toBe('pro');
  });

  test('is_admin flag grants pro tier', () => {
    expect(getEntitlementTier({ is_admin: true }, null)).toBe('pro');
  });
});

describe('getEntitlementTier — inactive subscription is not granted', () => {
  test('canceled subscription does not grant access', () => {
    const sub = { status: 'canceled', tier: 'premium' };
    expect(getEntitlementTier({}, sub)).toBe('free');
  });

  test('expired subscription does not grant access', () => {
    const sub = { status: 'expired', tier: 'pro' };
    expect(getEntitlementTier({}, sub)).toBe('free');
  });
});

// ─── hasPaidAccess / hasPremiumAccess / hasProAccess ─────────────────────────

describe('feature gating: hasPaidAccess', () => {
  test('free user has no paid access', () => {
    expect(hasPaidAccess(null, null)).toBe(false);
  });

  test('premium user has paid access', () => {
    expect(hasPaidAccess({ entitlement_tier: 'premium' }, null)).toBe(true);
  });

  test('pro user has paid access', () => {
    expect(hasPaidAccess({ entitlement_tier: 'pro' }, null)).toBe(true);
  });
});

describe('feature gating: hasPremiumAccess', () => {
  test('free user has no premium access', () => {
    expect(hasPremiumAccess(null, null)).toBe(false);
  });

  test('premium user has premium access', () => {
    expect(hasPremiumAccess({ entitlement_tier: 'premium' }, null)).toBe(true);
  });

  test('pro user has premium access (pro includes premium)', () => {
    expect(hasPremiumAccess({ entitlement_tier: 'pro' }, null)).toBe(true);
  });
});

describe('feature gating: hasProAccess', () => {
  test('free user has no pro access', () => {
    expect(hasProAccess(null, null)).toBe(false);
  });

  test('premium user has no pro access', () => {
    expect(hasProAccess({ entitlement_tier: 'premium' }, null)).toBe(false);
  });

  test('pro user has pro access', () => {
    expect(hasProAccess({ entitlement_tier: 'pro' }, null)).toBe(true);
  });
});

// ─── isLegacyPremium ──────────────────────────────────────────────────────────

describe('isLegacyPremium', () => {
  test('returns false for null subscription', () => {
    expect(isLegacyPremium(null)).toBe(false);
  });

  test('returns false for pro subscription (never legacy)', () => {
    expect(isLegacyPremium({ tier: 'pro', started_at: '2025-01-01T00:00:00.000Z' })).toBe(false);
  });

  test('returns true for premium subscription started before Feb 1 2026', () => {
    expect(isLegacyPremium({ tier: 'premium', started_at: '2025-06-01T00:00:00.000Z' })).toBe(true);
  });

  test('returns false for premium subscription started after Feb 1 2026', () => {
    expect(isLegacyPremium({ tier: 'premium', started_at: '2026-03-01T00:00:00.000Z' })).toBe(false);
  });

  test('uses subscriptionStartedAt if available', () => {
    expect(isLegacyPremium({ tier: 'premium', subscriptionStartedAt: '2025-12-31T00:00:00.000Z' })).toBe(true);
  });

  test('returns false when no start date is provided', () => {
    expect(isLegacyPremium({ tier: 'premium' })).toBe(false);
  });
});

// ─── getPlanLabel ─────────────────────────────────────────────────────────────

describe('getPlanLabel', () => {
  test('returns "Free" for free user', () => {
    expect(getPlanLabel(null, null)).toBe('Free');
  });

  test('returns "Premium" for premium user', () => {
    expect(getPlanLabel({ entitlement_tier: 'premium' }, null)).toBe('Premium');
  });

  test('returns "Pro" for pro user', () => {
    expect(getPlanLabel({ entitlement_tier: 'pro' }, null)).toBe('Pro');
  });
});
