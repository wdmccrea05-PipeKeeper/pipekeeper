import { describe, expect, it } from "vitest";
import {
  canAccessInternalModuleForTesting,
  canUserAccessModule,
  shouldFetchModuleData,
  shouldShowModuleInNav,
} from "@/components/utils/moduleReleaseState";

describe("moduleReleaseState launched CigarKeeper model", () => {
  it("uses entitlement gating for launched CigarKeeper", () => {
    const user = { role: "user" };
    expect(canUserAccessModule("cigarkeeper", user, true)).toBe(true);
    expect(shouldShowModuleInNav("cigarkeeper", user, true)).toBe(true);
    expect(shouldFetchModuleData("cigarkeeper", user, true)).toBe(true);
    expect(canUserAccessModule("cigarkeeper", user, false)).toBe(false);
    expect(shouldShowModuleInNav("cigarkeeper", user, false)).toBe(false);
    expect(shouldFetchModuleData("cigarkeeper", user, false)).toBe(false);
  });

  it("still allows internal-tester detection via explicit grants", () => {
    const user = {
      role: "user",
      paid_modules_csv: "pipekeeper,cigarkeeper",
      cigarkeeper_paid: true,
    };
    expect(canAccessInternalModuleForTesting("cigarkeeper", user)).toBe(true);
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
