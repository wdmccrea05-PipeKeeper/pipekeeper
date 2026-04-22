import { describe, expect, it } from "vitest";
import {
  getModuleTier,
  getModulesWithProAccess,
  hasBundleAccess,
  hasModuleProAccess,
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
