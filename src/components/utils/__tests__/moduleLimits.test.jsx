import { describe, expect, it } from "vitest";
import { getRemainingBeforeLimit, hasReachedLimit } from "../moduleLimits";

describe("moduleLimits module-scoped enforcement", () => {
  it("does not bypass whiskey limits for PipeKeeper-only pro users", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "pipekeeper" };
    expect(hasReachedLimit(user, null, "whiskeykeeper", "bottles", 10)).toBe(true);
  });

  it("does not bypass pipe limits for WhiskeyKeeper-only pro users", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "whiskeykeeper" };
    expect(hasReachedLimit(user, null, "pipekeeper", "pipes", 10)).toBe(true);
  });

  it("does not grant legacy flags when no subscription record exists", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "whiskeykeeper" };
    expect(hasReachedLimit(user, null, "whiskeykeeper", "bottles", 999)).toBe(true);
    expect(getRemainingBeforeLimit(user, null, "whiskeykeeper", "bottles", 999)).toBe(0);
  });

  it("uses legacy flags only while subscription state is still loading", () => {
    const user = { entitlement_tier: "pro", paid_modules_csv: "whiskeykeeper" };
    expect(hasReachedLimit(user, undefined, "whiskeykeeper", "bottles", 999)).toBe(false);
    expect(getRemainingBeforeLimit(user, undefined, "whiskeykeeper", "bottles", 999)).toBeNull();
  });

  it("founders bundle does not unlock cigarkeeper by default", () => {
    const user = { entitlement_tier: "pro", plan_key: "founders_bundle_annual" };
    expect(hasReachedLimit(user, null, "cigarkeeper", "cigars", 10)).toBe(true);
  });
});
