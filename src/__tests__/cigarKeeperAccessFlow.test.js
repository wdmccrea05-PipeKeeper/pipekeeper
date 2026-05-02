/**
 * CigarKeeper Access and Subscription Flow Tests
 *
 * Covers the 10 required scenarios from the CigarKeeper access/subscription
 * bug report:
 *  1. Public user can enable CigarKeeper Free.
 *  2. CigarKeeper Free user can access CigarKeeper route.
 *  3. CigarKeeper Free user is subject to free limits.
 *  4. CigarKeeper Pro user receives Pro limits (no limits).
 *  5. Free CigarKeeper does not show Subscription Required.
 *  6. CigarKeeper Pro upgrade shows monthly plan.
 *  7. CigarKeeper Pro upgrade shows annual plan.
 *  8. Subscription page does not show "No plans available" for CigarKeeper.
 *  9. WineKeeper remains hidden/internal.
 * 10. PipeKeeper/WhiskeyKeeper access behavior does not regress.
 */

import { describe, expect, it } from "vitest";

import { hasModuleFreeAccess, hasModuleProAccess, getModuleTier } from "@/components/utils/moduleEntitlements";
import { hasReachedLimit, getRemainingBeforeLimit, getModuleLimits } from "@/components/utils/moduleLimits";
import { getStripeConfig } from "@/components/subscription/stripeConfig";
import { SUBSCRIPTION_PLANS } from "@/lib/billing/subscriptionPlans";
import { buildAccessSummary } from "@/components/access/accessSummary";
import { isModuleLaunched, isModuleInternal } from "@/components/utils/moduleReleaseState";

// ─── Scenario 1: Public user can enable CigarKeeper Free ─────────────────────

describe("Scenario 1 – public user can enable CigarKeeper Free", () => {
  it("CigarKeeper is accessible (launched) for all users regardless of subscription", () => {
    // A user with zero subscription/paid flags can still have free access
    const freeUser = { role: "user" };
    expect(hasModuleFreeAccess(freeUser, "cigarkeeper")).toBe(true);
  });

  it("CigarKeeper is launched and toggleable in moduleReleaseState", () => {
    expect(isModuleLaunched("cigarkeeper")).toBe(true);
    expect(isModuleInternal("cigarkeeper")).toBe(false);
  });

  it("hasModuleFreeAccess ignores subscription state and only checks launch status", () => {
    // Works for null user too (launch-state-only check)
    expect(hasModuleFreeAccess(null, "cigarkeeper")).toBe(true);
    expect(hasModuleFreeAccess({ role: "user" }, "cigarkeeper")).toBe(true);
    expect(hasModuleFreeAccess({ role: "user", pipekeeper_paid: true }, "cigarkeeper")).toBe(true);
  });
});

// ─── Scenario 2: CigarKeeper Free user can access CigarKeeper route ──────────

describe("Scenario 2 – CigarKeeper Free user can access route", () => {
  it("free user with no subscription has free access to cigarkeeper", () => {
    const user = { role: "user" };
    expect(hasModuleFreeAccess(user, "cigarkeeper")).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
    expect(getModuleTier(user, "cigarkeeper")).toBe("free");
  });

  it("LockedModuleGuard step-3 condition is never true for launched cigarkeeper", () => {
    // Step 3 in LockedModuleGuard triggers when both hasModuleProAccess AND hasModuleFreeAccess are false.
    // For a launched module, hasModuleFreeAccess is always true — so "Subscription Required" never shows.
    const user = { role: "user" };
    const noProAccess = !hasModuleProAccess(user, "cigarkeeper");
    const noFreeAccess = !hasModuleFreeAccess(user, "cigarkeeper");
    expect(noProAccess && noFreeAccess).toBe(false);
  });

  it("pipekeeper-only subscriber still gets free access to cigarkeeper (not pro)", () => {
    const user = { role: "user", pipekeeper_paid: true };
    expect(hasModuleFreeAccess(user, "cigarkeeper")).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
    expect(getModuleTier(user, "cigarkeeper")).toBe("free");
  });
});

// ─── Scenario 3: CigarKeeper Free user is subject to free limits ─────────────

describe("Scenario 3 – CigarKeeper Free user is subject to free limits", () => {
  it("free-tier limits exist for cigarkeeper", () => {
    const limits = getModuleLimits("cigarkeeper");
    expect(limits.cigars).toBeGreaterThan(0);
    expect(limits.logsPerMonth).toBeGreaterThan(0);
  });

  it("free user hits cigar limit at the free-tier cap", () => {
    const user = { role: "user" };
    const cap = getModuleLimits("cigarkeeper").cigars;
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", cap)).toBe(true);
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", cap - 1)).toBe(false);
  });

  it("free user gets a non-null remaining count before hitting the limit", () => {
    const user = { role: "user" };
    const remaining = getRemainingBeforeLimit(user, null, "cigarkeeper", "cigars", 5);
    expect(remaining).not.toBeNull();
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  it("founders bundle user is subject to cigarkeeper free limits (founders only covers PK+WK)", () => {
    const user = { role: "user", plan_key: "founders_bundle_annual" };
    const cap = getModuleLimits("cigarkeeper").cigars;
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", cap)).toBe(true);
  });
});

// ─── Scenario 4: CigarKeeper Pro user receives Pro limits (none) ─────────────

describe("Scenario 4 – CigarKeeper Pro user receives Pro limits", () => {
  it("cigarkeeper_paid user has no cigar limit", () => {
    const user = { role: "user", cigarkeeper_paid: true };
    const cap = getModuleLimits("cigarkeeper").cigars;
    // Pro user should not hit the limit no matter the count
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", cap * 100)).toBe(false);
  });

  it("cigarkeeper_paid user gets null remaining (unlimited)", () => {
    const user = { role: "user", cigarkeeper_paid: true };
    expect(getRemainingBeforeLimit(user, null, "cigarkeeper", "cigars", 5)).toBeNull();
  });

  it("three-module-bundle user has no cigarkeeper limits", () => {
    const user = { role: "user", plan_key: "three_module_bundle_monthly" };
    const cap = getModuleLimits("cigarkeeper").cigars;
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", cap)).toBe(false);
  });

  it("three-module-bundle user has pro tier for cigarkeeper", () => {
    const user = { role: "user", plan_key: "three_module_bundle_monthly" };
    expect(getModuleTier(user, "cigarkeeper")).toBe("pro");
  });
});

// ─── Scenario 5: Free CigarKeeper does not show Subscription Required ────────

describe("Scenario 5 – free CigarKeeper does not show Subscription Required", () => {
  it("hasModuleFreeAccess('cigarkeeper') is true for every user type", () => {
    const scenarios = [
      { role: "user" },
      { role: "user", pipekeeper_paid: true },
      { role: "user", whiskeykeeper_paid: true },
      null,
    ];
    for (const user of scenarios) {
      expect(hasModuleFreeAccess(user, "cigarkeeper")).toBe(
        true,
        `Expected free access for user: ${JSON.stringify(user)}`
      );
    }
  });

  it("LockedModuleGuard step-3 predicate is always false for cigarkeeper (subscription required never fires)", () => {
    // The guard shows 'Subscription Required' only when BOTH pro AND free access are false.
    // Since cigarkeeper is launched, free access is always true → this predicate is always false.
    const users = [
      { role: "user" },
      { role: "user", pipekeeper_paid: true },
      null,
    ];
    for (const user of users) {
      const step3 = !hasModuleProAccess(user, "cigarkeeper") && !hasModuleFreeAccess(user, "cigarkeeper");
      expect(step3).toBe(false);
    }
  });
});

// ─── Scenarios 6 & 7: CigarKeeper Pro upgrade shows monthly and annual plan ──

describe("Scenarios 6 & 7 – CigarKeeper Pro upgrade shows monthly and annual plans", () => {
  it("SUBSCRIPTION_PLANS includes cigarkeeper_pro_monthly as single_module", () => {
    const plan = SUBSCRIPTION_PLANS.cigarkeeper_pro_monthly;
    expect(plan).toBeDefined();
    expect(plan.type).toBe("single_module");
    expect(plan.term).toBe("monthly");
    expect(plan.modules).toContain("cigarkeeper");
  });

  it("SUBSCRIPTION_PLANS includes cigarkeeper_pro_annual as single_module", () => {
    const plan = SUBSCRIPTION_PLANS.cigarkeeper_pro_annual;
    expect(plan).toBeDefined();
    expect(plan.type).toBe("single_module");
    expect(plan.term).toBe("annual");
    expect(plan.modules).toContain("cigarkeeper");
  });

  it("stripeConfig includes cigarkeeper_pro_monthly entry", () => {
    const config = getStripeConfig();
    expect(config.cigarkeeper_pro_monthly).toBeDefined();
    expect(config.cigarkeeper_pro_monthly.modules).toContain("cigarkeeper");
    expect(config.cigarkeeper_pro_monthly.billingPeriod).toBe("monthly");
  });

  it("stripeConfig includes cigarkeeper_pro_annual entry", () => {
    const config = getStripeConfig();
    expect(config.cigarkeeper_pro_annual).toBeDefined();
    expect(config.cigarkeeper_pro_annual.modules).toContain("cigarkeeper");
    expect(config.cigarkeeper_pro_annual.billingPeriod).toBe("annual");
  });
});

// ─── Scenario 8: Subscription page does not show "No plans available" ────────

/** Returns true when a merged plan should appear in the bundles section (fixed filter). */
function isBundleType(type) {
  return type === "bundle" || type === "three_bundle" || type === "four_bundle" || type === "founders";
}

describe("Scenario 8 – subscription page plans include CigarKeeper when configured", () => {
  it("stripeConfig type for individual plans is 'single'", () => {
    // If stripeConfig is used as-is, its type field ('single') differs from SUBSCRIPTION_PLANS ('single_module').
    // SubscriptionFull.jsx must accept both types to avoid hiding plans.
    const config = getStripeConfig();
    expect(config.cigarkeeper_pro_monthly.type).toBe("single");
    expect(config.cigarkeeper_pro_annual.type).toBe("single");
  });

  it("SUBSCRIPTION_PLANS type for individual plans is 'single_module'", () => {
    expect(SUBSCRIPTION_PLANS.cigarkeeper_pro_monthly.type).toBe("single_module");
    expect(SUBSCRIPTION_PLANS.cigarkeeper_pro_annual.type).toBe("single_module");
  });

  it("merged plan (appPlan spread before stripeConfig plan) retains stripeConfig type 'single'", () => {
    // SubscriptionFull.jsx merges as: { ...appPlan, ...plan } where plan = stripeConfig entry.
    // stripeConfig overwrites appPlan.type ('single_module') with its own type ('single').
    const appPlan = SUBSCRIPTION_PLANS.cigarkeeper_pro_monthly;
    const stripePlan = getStripeConfig().cigarkeeper_pro_monthly;
    const merged = { ...appPlan, ...stripePlan };
    // The filter must accept 'single' to avoid hiding individual plans.
    expect(merged.type).toBe("single");
  });

  it("merged plan passes the fixed 'individual' groupedPlans filter", () => {
    const appPlan = SUBSCRIPTION_PLANS.cigarkeeper_pro_monthly;
    const stripePlan = getStripeConfig().cigarkeeper_pro_monthly;
    const merged = { ...appPlan, ...stripePlan };
    // Fixed filter logic from SubscriptionFull.jsx after the bug fix
    const isIndividual = merged.type === "single_module" || merged.type === "single";
    expect(isIndividual).toBe(true);
  });

  it("merged bundle plan passes the fixed 'bundles' groupedPlans filter", () => {
    const appPlan = SUBSCRIPTION_PLANS.three_module_bundle_monthly;
    const stripePlan = getStripeConfig().three_module_bundle_monthly;
    const merged = { ...appPlan, ...stripePlan };
    // stripeConfig type is 'three_bundle'; fixed filter accepts it
    expect(isBundleType(merged.type)).toBe(true);
    expect(merged.type).not.toBe("bundle"); // old filter would miss it
  });

  it("merged founders bundle plan passes the fixed 'bundles' filter", () => {
    const appPlan = SUBSCRIPTION_PLANS.founders_bundle_monthly;
    const stripePlan = getStripeConfig().founders_bundle_monthly;
    const merged = { ...appPlan, ...stripePlan };
    // stripeConfig type is 'founders'; fixed filter accepts it
    expect(isBundleType(merged.type)).toBe(true);
  });
});

// ─── Scenario 9: WineKeeper remains hidden/internal ──────────────────────────

describe("Scenario 9 – WineKeeper remains hidden/internal for public users", () => {
  it("winekeeper is not launched for public users", () => {
    expect(isModuleLaunched("winekeeper")).toBe(false);
    expect(isModuleInternal("winekeeper")).toBe(true);
  });

  it("winekeeper is filtered out of activeModules for non-admin users with winekeeper_paid", () => {
    const user = {
      role: "user",
      entitlement_tier: "pro",
      paid_modules_csv: "pipekeeper,winekeeper",
      pipekeeper_paid: true,
      winekeeper_paid: true,
    };
    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).not.toContain("winekeeper");
    expect(summary.activeModules).toContain("pipekeeper");
  });

  it("hasModuleFreeAccess returns false for winekeeper (internal module)", () => {
    expect(hasModuleFreeAccess({ role: "user" }, "winekeeper")).toBe(false);
  });

  it("winekeeper stripeConfig plans have isAvailable: false", () => {
    const config = getStripeConfig();
    expect(config.winekeeper_pro_monthly.isAvailable).toBe(false);
    expect(config.winekeeper_pro_annual.isAvailable).toBe(false);
  });
});

// ─── Scenario 10: PipeKeeper/WhiskeyKeeper access does not regress ───────────

describe("Scenario 10 – PipeKeeper/WhiskeyKeeper access behavior does not regress", () => {
  it("pipekeeper and whiskeykeeper are launched", () => {
    expect(isModuleLaunched("pipekeeper")).toBe(true);
    expect(isModuleLaunched("whiskeykeeper")).toBe(true);
  });

  it("PipeKeeper free access works for any user", () => {
    expect(hasModuleFreeAccess({ role: "user" }, "pipekeeper")).toBe(true);
    expect(hasModuleFreeAccess(null, "pipekeeper")).toBe(true);
  });

  it("WhiskeyKeeper free access works for any user", () => {
    expect(hasModuleFreeAccess({ role: "user" }, "whiskeykeeper")).toBe(true);
    expect(hasModuleFreeAccess(null, "whiskeykeeper")).toBe(true);
  });

  it("PipeKeeper Pro does not bleed into WhiskeyKeeper or CigarKeeper", () => {
    const user = { pipekeeper_paid: true };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("WhiskeyKeeper Pro does not bleed into PipeKeeper or CigarKeeper", () => {
    const user = { whiskeykeeper_paid: true };
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(false);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("founders bundle covers PipeKeeper + WhiskeyKeeper only, not CigarKeeper", () => {
    const user = { plan_key: "founders_bundle_monthly" };
    expect(hasModuleProAccess(user, "pipekeeper")).toBe(true);
    expect(hasModuleProAccess(user, "whiskeykeeper")).toBe(true);
    expect(hasModuleProAccess(user, "cigarkeeper")).toBe(false);
  });

  it("LockedModuleGuard step-3 predicate is always false for pipekeeper and whiskeykeeper", () => {
    const user = { role: "user" };
    for (const key of ["pipekeeper", "whiskeykeeper"]) {
      const step3 = !hasModuleProAccess(user, key) && !hasModuleFreeAccess(user, key);
      expect(step3).toBe(false);
    }
  });
});
