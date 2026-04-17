import { describe, expect, it } from "vitest";
import {
  canAccessInternalModuleForTesting,
  canUserAccessModule,
  shouldFetchModuleData,
  shouldShowModuleInNav,
} from "@/components/utils/moduleReleaseState";

describe("moduleReleaseState internal tester access model", () => {
  it("allows admin users to access internal CigarKeeper", () => {
    const user = { role: "admin" };
    expect(canAccessInternalModuleForTesting("cigarkeeper", user)).toBe(true);
    expect(canUserAccessModule("cigarkeeper", user, false)).toBe(true);
    expect(shouldShowModuleInNav("cigarkeeper", user, false)).toBe(true);
    expect(shouldFetchModuleData("cigarkeeper", user, false)).toBe(true);
  });

  it("allows internal tester users to access internal CigarKeeper", () => {
    const user = { internal_tester: true };
    expect(canAccessInternalModuleForTesting("cigarkeeper", user)).toBe(true);
    expect(canUserAccessModule("cigarkeeper", user, false)).toBe(true);
  });

  it("allows explicitly granted non-admin users to access internal CigarKeeper", () => {
    const user = {
      role: "user",
      paid_modules_csv: "pipekeeper,cigarkeeper",
      cigarkeeper_paid: true,
    };
    expect(canAccessInternalModuleForTesting("cigarkeeper", user)).toBe(true);
    expect(canUserAccessModule("cigarkeeper", user, false)).toBe(true);
    expect(shouldShowModuleInNav("cigarkeeper", user, false)).toBe(true);
  });

  it("denies ungranted regular users from internal CigarKeeper", () => {
    const user = { role: "user", paid_modules_csv: "pipekeeper" };
    expect(canAccessInternalModuleForTesting("cigarkeeper", user)).toBe(false);
    expect(canUserAccessModule("cigarkeeper", user, true)).toBe(false);
    expect(shouldShowModuleInNav("cigarkeeper", user, true)).toBe(false);
    expect(shouldFetchModuleData("cigarkeeper", user, true)).toBe(false);
  });

  it("keeps WineKeeper blocked even if explicitly listed in entitlements", () => {
    const user = {
      role: "user",
      paid_modules_csv: "winekeeper",
      winekeeper_paid: true,
    };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(false);
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(false);
    expect(shouldFetchModuleData("winekeeper", user, true)).toBe(false);
  });
});
