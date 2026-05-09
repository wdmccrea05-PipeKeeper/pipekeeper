/* eslint-disable */
/**
 * WineKeeper public isolation tests — updated for launched state.
 *
 * VITE_WINEKEEPER_PUBLIC_ENABLED=true → WineKeeper is 'launched'.
 * Access is now gated by paid entitlement (hasEntitlement param), not tester status.
 *
 * H.1  Free user (no entitlement) cannot see WineKeeper nav.
 * H.1b Paid user (with entitlement) CAN see WineKeeper nav.
 * H.4  Free user: shouldExposeModuleInCurator false. Paid user: true.
 * H.5  Free user: canUserAccessModule false. Paid user: true.
 * H.6  Admin/internal user can always see WineKeeper.
 */
import { describe, expect, it } from "vitest";
import {
  canUserAccessModule,
  shouldShowModuleInNav,
  shouldFetchModuleData,
  shouldExposeModuleInCurator,
  canAccessInternalModuleForTesting,
  WINEKEEPER_PUBLIC_ENABLED,
  MODULE_RELEASE_STATES,
} from "@/components/utils/moduleReleaseState";

// ---------------------------------------------------------------------------
// Launch state verification
// ---------------------------------------------------------------------------
describe("WineKeeper launch state", () => {
  it("WINEKEEPER_PUBLIC_ENABLED is boolean", () => {
    expect(typeof WINEKEEPER_PUBLIC_ENABLED).toBe("boolean");
  });

  it("MODULE_RELEASE_STATES.winekeeper follows launch flag", () => {
    expect(MODULE_RELEASE_STATES.winekeeper).toBe(
      WINEKEEPER_PUBLIC_ENABLED ? "launched" : "internal"
    );
  });
});

// ---------------------------------------------------------------------------
// H.1  Nav visibility
// ---------------------------------------------------------------------------
describe("H.1 — WineKeeper nav visibility (launched, entitlement-gated)", () => {
  it("free user (hasEntitlement=false) does not see WineKeeper in nav", () => {
    const user = { role: "user" };
    expect(shouldShowModuleInNav("winekeeper", user, false)).toBe(false);
  });

  it("paid user (hasEntitlement=true) sees WineKeeper in nav", () => {
    const user = { role: "user" };
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it("admin user sees WineKeeper in nav", () => {
    const user = { role: "admin" };
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(true);
  });

  it("internal_tester user sees WineKeeper in nav", () => {
    const user = { role: "user", internal_tester: true };
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H.4  Curator filter visibility
// ---------------------------------------------------------------------------
describe("H.4 — WineKeeper Curator filter visibility (launched, entitlement-gated)", () => {
  it("free user: shouldExposeModuleInCurator returns false", () => {
    expect(shouldExposeModuleInCurator("winekeeper", { role: "user" }, false)).toBe(false);
  });

  it("paid user: shouldExposeModuleInCurator returns true", () => {
    expect(shouldExposeModuleInCurator("winekeeper", { role: "user" }, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it("admin user: shouldExposeModuleInCurator returns true", () => {
    expect(shouldExposeModuleInCurator("winekeeper", { role: "admin" }, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H.5  Session History filter visibility
// ---------------------------------------------------------------------------
describe("H.5 — WineKeeper Session History visibility (launched, entitlement-gated)", () => {
  it("free user: canUserAccessModule false — no wine filter chip", () => {
    expect(canUserAccessModule("winekeeper", { role: "user" }, false)).toBe(false);
  });

  it("paid user: canUserAccessModule true — wine filter chip shown", () => {
    expect(canUserAccessModule("winekeeper", { role: "user" }, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it("free user: shouldFetchModuleData false — no wine tastings fetched", () => {
    expect(shouldFetchModuleData("winekeeper", { role: "user" }, false)).toBe(false);
  });

  it("paid user: shouldFetchModuleData true", () => {
    expect(shouldFetchModuleData("winekeeper", { role: "user" }, true)).toBe(WINEKEEPER_PUBLIC_ENABLED);
  });

  it("admin user can see wine filter in Session History", () => {
    const user = { role: "admin" };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(true);
    expect(shouldFetchModuleData("winekeeper", user, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H.6  Admin / internal tester can always access WineKeeper
// ---------------------------------------------------------------------------
describe("H.6 — Admin/internal user can access WineKeeper", () => {
  it("admin role passes all canonical gates", () => {
    const admin = { role: "admin" };
    expect(canUserAccessModule("winekeeper", admin, true)).toBe(true);
    expect(shouldShowModuleInNav("winekeeper", admin, true)).toBe(true);
    expect(shouldFetchModuleData("winekeeper", admin, true)).toBe(true);
    expect(canAccessInternalModuleForTesting("winekeeper", admin)).toBe(true);
  });

  it("owner role passes all canonical gates", () => {
    const owner = { role: "owner" };
    expect(canUserAccessModule("winekeeper", owner, true)).toBe(true);
    expect(shouldShowModuleInNav("winekeeper", owner, true)).toBe(true);
    expect(canAccessInternalModuleForTesting("winekeeper", owner)).toBe(true);
  });

  it("is_internal_tester flag passes canonical gates", () => {
    const user = { role: "user", is_internal_tester: true };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(true);
  });

  it("canAccessInternalModuleForTesting is false for paid-only user (no tester/admin flag)", () => {
    // Even though WineKeeper is launched, this function must still only return true for testers/admins
    const user = { role: "user", winekeeper_paid: true };
    expect(canAccessInternalModuleForTesting("winekeeper", user)).toBe(false);
  });
});
