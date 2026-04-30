/**
 * Regression test: WineKeeper Profile section gating.
 *
 * Verifies that winekeeper_paid=true alone does NOT grant access to the
 * WineKeeper Preferences section while the module release state is 'internal'.
 * Access requires admin role or explicit internal-tester status, both enforced
 * through canUserAccessModule('winekeeper', user, true) — the canonical gate.
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
    // Canonical gate: canUserAccessModule returns false for internal modules when
    // the user is not an internal tester, regardless of paid flags.
    expect(canUserAccessModule("winekeeper", paidNonAdmin, true)).toBe(false);
  });

  it("admin user can access WineKeeper Preferences via canonical gate", () => {
    const adminUser = { role: "admin", winekeeper_paid: false };
    // canUserAccessModule('winekeeper', admin, true) is true because
    // admin role satisfies isInternalModuleTester, which internal modules require.
    expect(canUserAccessModule("winekeeper", adminUser, true)).toBe(true);
  });

  it("internal_tester user can access WineKeeper Preferences via canonical gate", () => {
    const tester = { role: "user", internal_tester: true, winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", tester, true)).toBe(true);
  });

  it("regular non-paid user cannot access WineKeeper Preferences", () => {
    const freeUser = { role: "user", winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", freeUser, true)).toBe(false);
  });
});
