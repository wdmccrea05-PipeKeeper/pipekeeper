/**
 * Regression test: WineKeeper Profile section gating.
 *
 * Verifies that WineKeeper Preferences follow launched-module entitlement gating.
 * With WineKeeper launched, access follows hasEntitlement in canUserAccessModule.
 */
import { describe, expect, it } from "vitest";
import {
  canUserAccessModule,
  WINEKEEPER_PUBLIC_ENABLED,
} from "@/components/utils/moduleReleaseState";

describe("WineKeeper Profile Preferences gating", () => {
  it("WINEKEEPER_PUBLIC_ENABLED is true (public release)", () => {
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(true);
  });

  it("winekeeper_paid=true without admin/tester status grants access when entitled", () => {
    const paidNonAdmin = {
      role: "user",
      winekeeper_paid: true,
      paid_modules_csv: "winekeeper",
    };
    expect(canUserAccessModule("winekeeper", paidNonAdmin, true)).toBe(true);
  });

  it("admin user can access WineKeeper Preferences via canonical gate", () => {
    const adminUser = { role: "admin", winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", adminUser, true)).toBe(true);
  });

  it("internal_tester user can access WineKeeper Preferences via canonical gate", () => {
    const tester = { role: "user", internal_tester: true, winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", tester, true)).toBe(true);
  });

  it("regular non-paid user cannot access WineKeeper Preferences without entitlement", () => {
    const freeUser = { role: "user", winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", freeUser, false)).toBe(false);
  });
});
