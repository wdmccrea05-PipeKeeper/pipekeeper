/**
 * Regression test: WineKeeper Profile section gating.
 *
 * Verifies that winekeeper_paid=true alone does NOT grant access to the
 * WineKeeper Preferences section while the module release state is 'internal'.
 * Access requires WINEKEEPER_PUBLIC_ENABLED, admin role, or explicit
 * internal-tester status (canUserAccessModule returns true).
 */
import { describe, expect, it } from "vitest";
import {
  canUserAccessModule,
  WINEKEEPER_PUBLIC_ENABLED,
} from "@/components/utils/moduleReleaseState";

describe("WineKeeper Profile Preferences gating", () => {
  it("WINEKEEPER_PUBLIC_ENABLED is false (internal release)", () => {
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });

  it("winekeeper_paid=true without admin/tester status does not grant access", () => {
    const paidNonAdmin = {
      role: "user",
      winekeeper_paid: true,
      paid_modules_csv: "winekeeper",
    };
    // The old bug: winekeeper_paid was a standalone condition; this verifies the gate holds.
    const canAccess = WINEKEEPER_PUBLIC_ENABLED || paidNonAdmin.role === "admin" || canUserAccessModule("winekeeper", paidNonAdmin);
    expect(canAccess).toBe(false);
  });

  it("admin user can access WineKeeper Preferences regardless of paid status", () => {
    const adminUser = { role: "admin", winekeeper_paid: false };
    const canAccess = WINEKEEPER_PUBLIC_ENABLED || adminUser.role === "admin" || canUserAccessModule("winekeeper", adminUser);
    expect(canAccess).toBe(true);
  });

  it("internal_tester user can access WineKeeper Preferences", () => {
    const tester = { role: "user", internal_tester: true, winekeeper_paid: false };
    const canAccess = WINEKEEPER_PUBLIC_ENABLED || tester.role === "admin" || canUserAccessModule("winekeeper", tester);
    expect(canAccess).toBe(true);
  });

  it("regular non-paid user cannot access WineKeeper Preferences", () => {
    const freeUser = { role: "user", winekeeper_paid: false };
    const canAccess = WINEKEEPER_PUBLIC_ENABLED || freeUser.role === "admin" || canUserAccessModule("winekeeper", freeUser);
    expect(canAccess).toBe(false);
  });
});
