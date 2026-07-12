/**
 * Unit tests for canonical entitlement resolver (premiumAccess.jsx)
 *
 * Final business rule:
 * - Premium is collapsed into Pro-equivalent access
 * - User-facing labels are Free / Pro only
 */

import { describe, test, expect } from 'vitest';
import {
  getEntitlementTier,
  hasPaidAccess,
  hasPremiumAccess,
  hasProAccess,
  isLegacyPremium,
  getPlanLabel,
  buildCanonicalEntitlements,
} from "../premiumAccess";

describe("getEntitlementTier — free user", () => {
  test("returns free for null user and no subscription", () => {
    expect(getEntitlementTier(null, null)).toBe("free");
  });

  test("returns free for empty user object", () => {
    expect(getEntitlementTier({}, null)).toBe("free");
  });

  test("returns free for unknown tier string", () => {
    expect(getEntitlementTier({ entitlement_tier: "vip" }, null)).toBe("free");
  });
});

describe("getEntitlementTier — legacy paid users collapse to pro", () => {
  test('resolves via user.entitlement_tier = "premium"', () => {
    expect(getEntitlementTier({ entitlement_tier: "premium" }, null)).toBe("pro");
  });

  test("resolves via user.data.entitlement_tier (nested data blob)", () => {
    expect(getEntitlementTier({ data: { entitlement_tier: "premium" } }, null)).toBe("pro");
  });

  test('resolves via legacy synonym: "paid"', () => {
    expect(getEntitlementTier({ entitlement_tier: "paid" }, null)).toBe("pro");
  });

  test('resolves via legacy synonym: "subscriber"', () => {
    expect(getEntitlementTier({ entitlement_tier: "subscriber" }, null)).toBe("pro");
  });

  test("resolves via legacy user field subscription_tier", () => {
    expect(getEntitlementTier({ subscription_tier: "premium" }, null)).toBe("pro");
  });

  test("resolves via subscription entity with active status and premium tier", () => {
    const sub = { status: "active", tier: "premium" };
    expect(getEntitlementTier({}, sub)).toBe("pro");
  });

  test("resolves via subscription entity with trialing status", () => {
    const sub = { status: "trialing", tier: "premium" };
    expect(getEntitlementTier({}, sub)).toBe("pro");
  });
});

describe("getEntitlementTier — pro user", () => {
  test('resolves via user.entitlement_tier = "pro"', () => {
    expect(getEntitlementTier({ entitlement_tier: "pro" }, null)).toBe("pro");
  });

  test("resolves via subscription entity with pro tier", () => {
    const sub = { status: "active", tier: "pro" };
    expect(getEntitlementTier({}, sub)).toBe("pro");
  });
});

describe("getEntitlementTier — admin override", () => {
  test("admin role always gets pro tier", () => {
    expect(getEntitlementTier({ role: "admin" }, null)).toBe("pro");
  });

  test("owner role always gets pro tier", () => {
    expect(getEntitlementTier({ role: "owner" }, null)).toBe("pro");
  });

  test("is_admin flag grants pro tier", () => {
    expect(getEntitlementTier({ is_admin: true }, null)).toBe("pro");
  });
});

describe("getEntitlementTier — inactive subscription is not granted", () => {
  test("canceled subscription does not grant access", () => {
    const sub = { status: "canceled", tier: "premium" };
    expect(getEntitlementTier({}, sub)).toBe("free");
  });

  test("expired subscription does not grant access", () => {
    const sub = { status: "expired", tier: "pro" };
    expect(getEntitlementTier({}, sub)).toBe("free");
  });

  test("explicit free entitlement_tier is not overridden by stale legacy tier fields", () => {
    expect(
      getEntitlementTier(
        { entitlement_tier: "free", subscription_tier: "pro", data: { subscription_tier: "pro" } },
        null
      )
    ).toBe("free");
  });
});

describe("feature gating: hasPaidAccess", () => {
  test("free user has no paid access", () => {
    expect(hasPaidAccess(null, null)).toBe(false);
  });

  test("premium user has paid access", () => {
    expect(hasPaidAccess({ entitlement_tier: "premium" }, null)).toBe(true);
  });

  test("pro user has paid access", () => {
    expect(hasPaidAccess({ entitlement_tier: "pro" }, null)).toBe(true);
  });
});

describe("feature gating: hasPremiumAccess", () => {
  test("free user has no premium access", () => {
    expect(hasPremiumAccess(null, null)).toBe(false);
  });

  test("premium user has premium access", () => {
    expect(hasPremiumAccess({ entitlement_tier: "premium" }, null)).toBe(true);
  });

  test("pro user has premium access (pro includes premium)", () => {
    expect(hasPremiumAccess({ entitlement_tier: "pro" }, null)).toBe(true);
  });
});

describe("feature gating: hasProAccess", () => {
  test("free user has no pro access", () => {
    expect(hasProAccess(null, null)).toBe(false);
  });

  test("premium user has pro-equivalent access", () => {
    expect(hasProAccess({ entitlement_tier: "premium" }, null)).toBe(true);
  });

  test("pro user has pro access", () => {
    expect(hasProAccess({ entitlement_tier: "pro" }, null)).toBe(true);
  });
});

describe("isLegacyPremium", () => {
  test("returns false for null subscription", () => {
    expect(isLegacyPremium(null)).toBe(false);
  });

  test("returns false for pro subscription (never legacy)", () => {
    expect(isLegacyPremium({ tier: "pro", started_at: "2025-01-01T00:00:00.000Z" })).toBe(false);
  });

  test("returns true for premium subscription started before Feb 1 2026", () => {
    expect(isLegacyPremium({ tier: "premium", started_at: "2025-06-01T00:00:00.000Z" })).toBe(true);
  });

  test("returns false for premium subscription started after Feb 1 2026", () => {
    expect(isLegacyPremium({ tier: "premium", started_at: "2026-03-01T00:00:00.000Z" })).toBe(false);
  });

  test("uses subscriptionStartedAt if available", () => {
    expect(
      isLegacyPremium({ tier: "premium", subscriptionStartedAt: "2025-12-31T00:00:00.000Z" })
    ).toBe(true);
  });

  test("returns false when no start date is provided", () => {
    expect(isLegacyPremium({ tier: "premium" })).toBe(false);
  });
});

describe("getPlanLabel", () => {
  test('returns "Free" for free user', () => {
    expect(getPlanLabel(null, null)).toBe("Free");
  });

  test('returns "Pro" for premium user', () => {
    expect(getPlanLabel({ entitlement_tier: "premium" }, null)).toBe("Pro");
  });

  test('returns "Pro" for pro user', () => {
    expect(getPlanLabel({ entitlement_tier: "pro" }, null)).toBe("Pro");
  });
});

describe("buildCanonicalEntitlements paid module fallback safety", () => {
  test("does not grant broad module access for non-legacy pro users missing paid_modules_csv", () => {
    const ents = buildCanonicalEntitlements(
      { entitlement_tier: "pro" },
      { status: "active", tier: "pro" }
    );
    expect(ents.paidModules).toEqual([]);
  });

  test("uses explicit module paid flags when paid_modules_csv is missing", () => {
    const ents = buildCanonicalEntitlements(
      { entitlement_tier: "pro", pipekeeper_paid: true, whiskeykeeper_paid: true },
      { status: "active", tier: "pro" }
    );
    expect(ents.paidModules.sort()).toEqual(["pipekeeper", "whiskeykeeper"].sort());
  });

  test("preserves broad access for explicit legacy/founding users", () => {
    const ents = buildCanonicalEntitlements(
      { entitlement_tier: "pro", isFoundingMember: true },
      { status: "active", tier: "premium", started_at: "2025-01-01T00:00:00.000Z" }
    );
    expect(ents.paidModules.length).toBeGreaterThan(0);
  });
});