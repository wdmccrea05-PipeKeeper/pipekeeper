import { describe, expect, it } from "vitest";
import { getModulesWithProAccess, hasModuleProAccess } from "../moduleEntitlements";

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
});
