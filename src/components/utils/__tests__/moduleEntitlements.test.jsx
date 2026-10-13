import { describe, expect, it } from "vitest";
import {
  getModuleTier,
  getModulesWithProAccess,
  hasBundleAccess,
  hasModuleProAccess,
  shouldEnforceFreeLimit,
} from "../moduleEntitlements";

describe("moduleEntitlements fallback scoping", () => {
  it("does not unlock all modules for non-legacy paid users with missing paid_modules_csv", () => {
    const user = { entitlement_tier: "pro" };
    expect(getModulesWithProAccess(user)).toEqual([]);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
  });

  it("uses module flags when paid_modules_csv is missing", () => {
    const user = { entitlement_tier: "pro", pipekeeper_paid: true, whiskeykeeper_paid: true };
    expect(getModulesWithProAccess(user).sort()).toEqual(["pipekeeper", "whiskeykeeper"].sort());
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("allows broad fallback only for explicit legacy/founding users", () => {
    const user = { entitlement_tier: "pro", isFoundingMember: true };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
  });

  it("does not leak PipeKeeper Pro into WhiskeyKeeper or CigarKeeper", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "pipekeeper" };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("does not leak WhiskeyKeeper Pro into PipeKeeper", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "whiskeykeeper" };
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
  });

  it("does not leak CigarKeeper Pro into PipeKeeper or WhiskeyKeeper", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "cigarkeeper" };
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(true);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
  });

  it("resolves founders bundle access only for founders modules", () => {
    const user = { entitlement_tier: "pro", plan_key: "founders_bundle_annual" };
    expect(hasBundleAccess(user, "pipekeeper")).toBe(true);
    expect(hasBundleAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasBundleAccess(user, "cigarkeeper")).toBe(false);
  });

  it("resolves three-module bundle from explicit module entitlements", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper" };
    expect(getModulesWithProAccess(user).sort()).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"].sort());
  });

  it("returns module tier per module key", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "pipekeeper" };
    expect(getModuleTier(user, "pipekeeper")).toBe("pro");
    expect(getModuleTier(user, "whiskeykeeper")).toBe("free");
  });
});

// ─── Test: per-module Pro isolation ──────────────────────────────────────────

describe("per-module Pro isolation (required scenarios 1–3)", () => {
  it("PipeKeeper Pro only unlocks PipeKeeper", () => {
    const user = { pipekeeper_paid: true };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("WhiskeyKeeper Pro only unlocks WhiskeyKeeper", () => {
    const user = { whiskeykeeper_paid: true };
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("CigarKeeper Pro only unlocks CigarKeeper", () => {
    const user = { cigarkeeper_paid: true };
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(true);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
  });
});

// ─── Test: bundle access (required scenarios 4–6) ────────────────────────────

describe("bundle access (required scenarios 4–6)", () => {
  const activeSubscription = (plan_key) => ({
    status: "active",
    provider: "stripe",
    provider_subscription_id: "sub_verified_bundle_fixture",
    plan_key,
  });

  it("Founders Bundle grants only its modules with active subscription evidence", () => {
    const user = { plan_key: "founders_bundle_monthly" };
    const sub = activeSubscription("founders_bundle_monthly");
    expect(hasModuleProAccess(user, "pipekeeper", sub)).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper", sub)).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper", sub)).toBe(false);
  });

  it("3-Module Bundle grants scoped modules with active subscription evidence", () => {
    const user = { plan_key: "three_module_bundle_monthly" };
    const modules = getModulesWithProAccess(user, activeSubscription(user.plan_key));
    expect(modules).toEqual(expect.arrayContaining(["pipekeeper", "whiskeykeeper", "cigarkeeper"]));
    expect(modules).not.toContain("winekeeper");
  });

  it("monthly, annual, and legacy bundle keys resolve when subscription is active", () => {
    for (const plan_key of ["three_module_bundle_monthly", "three_module_bundle_annual", "bundle_3_monthly"]) {
      const modules = getModulesWithProAccess({ plan_key }, activeSubscription(plan_key));
      expect(modules).toEqual(expect.arrayContaining(["pipekeeper", "whiskeykeeper", "cigarkeeper"]));
    }
  });

  it("entitlement hints alone never grant paid access after loading", () => {
    const user = { entitlements: ["three_module_bundle"] };
    expect(getModulesWithProAccess(user, null)).toEqual([]);
    expect(getModulesWithProAccess(user)).toEqual([]);
  });

  it("expired subscriptions override stale bundle plan labels", () => {
    const user = { plan_key: "three_module_bundle_monthly" };
    expect(getModulesWithProAccess(user, { ...activeSubscription(user.plan_key), status: "expired" })).toEqual([]);
  });
});

// ─── Test: login sync downgrade protection (required scenarios 7–8) ──────────

describe("login sync downgrade protection (required scenarios 7–8)", () => {
  it("user with pipekeeper_paid=true retains Pro access even when no subscription data is present", () => {
    // Simulates the state after reconcileEntitlementsOnLogin preserves existing flags
    const user = { pipekeeper_paid: true };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(getModulesWithProAccess(user).length).toBeGreaterThan(0);
    expect(shouldEnforceFreeLimit(user)).toBe(false);
  });

  it("user with multiple paid flags is not treated as free (needs_review state)", () => {
    // User in needs_review state still has paid flags — must not be treated as free
    const user = { pipekeeper_paid: true, whiskeykeeper_paid: true };
    expect(getModulesWithProAccess(user).sort()).toEqual(["pipekeeper", "whiskeykeeper"].sort());
    expect(shouldEnforceFreeLimit(user)).toBe(false);
  });

  it("user with paid_modules_csv retains Pro access without subscription data", () => {
    const user = { paid_modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper" };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(true);
    expect(shouldEnforceFreeLimit(user)).toBe(false);
  });
});

// ─── Test: real-user scenarios (required scenarios 9–10) ─────────────────────

describe("real-user entitlement scenarios (required scenarios 9–10)", () => {
  it("Dallas Hinton scenario: PipeKeeper subscriber does not see PipeKeeper free limits", () => {
    const user = { pipekeeper_paid: true };
    // Should have Pro access for PipeKeeper
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    // shouldEnforceFreeLimit checks all modules — user has at least one paid module
    expect(shouldEnforceFreeLimit(user)).toBe(false);
    // Does NOT bleed into unsubscribed modules
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("Michael Woodbury scenario: paid user does not revert to free on login", () => {
    // Simulates state after reconcileEntitlementsOnLogin preserves flags in needs_review
    const user = {
      pipekeeper_paid: true,
      whiskeykeeper_paid: true,
      entitlement_sync_state: "needs_review",
    };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(getModulesWithProAccess(user).sort()).toEqual(["pipekeeper", "whiskeykeeper"].sort());
    expect(shouldEnforceFreeLimit(user)).toBe(false);
  });
});

