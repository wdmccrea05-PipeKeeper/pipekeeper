/**
 * WineKeeper public isolation tests — Section H requirements.
 *
 * H.1  Public user cannot see WineKeeper nav item.
 * H.4  Public user cannot see WineKeeper in Curator filters.
 * H.5  Public user cannot see WineKeeper in Session History.
 * H.6  Admin/internal user can see WineKeeper.
 *
 * All assertions use canonical gates from moduleReleaseState.jsx.
 * No standalone isAdmin or winekeeper_paid checks are used.
 */
import { describe, expect, it } from "vitest";
import {
  canUserAccessModule,
  shouldShowModuleInNav,
  shouldFetchModuleData,
  shouldExposeModuleInCurator,
  canAccessInternalModuleForTesting,
  WINEKEEPER_PUBLIC_ENABLED,
} from "@/components/utils/moduleReleaseState";

// ---------------------------------------------------------------------------
// H.1  Nav visibility
// ---------------------------------------------------------------------------
describe("H.1 — WineKeeper nav visibility", () => {
  it("public free user does not see WineKeeper in nav", () => {
    const user = { role: "user", winekeeper_paid: false };
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(false);
    expect(shouldShowModuleInNav("winekeeper", user, false)).toBe(false);
  });

  it("public paid user does not see WineKeeper in nav", () => {
    const user = { role: "user", winekeeper_paid: true, paid_modules_csv: "winekeeper" };
    // winekeeper_paid alone must not unlock the nav entry.
    expect(shouldShowModuleInNav("winekeeper", user, true)).toBe(false);
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
describe("H.4 — WineKeeper Curator filter visibility", () => {
  it("public user: shouldExposeModuleInCurator returns false for winekeeper", () => {
    const user = { role: "user", winekeeper_paid: false };
    expect(shouldExposeModuleInCurator("winekeeper", user, true)).toBe(false);
  });

  it("public paid user: shouldExposeModuleInCurator returns false for winekeeper", () => {
    const user = { role: "user", winekeeper_paid: true, paid_modules_csv: "winekeeper" };
    expect(shouldExposeModuleInCurator("winekeeper", user, true)).toBe(false);
  });

  it("admin user: shouldExposeModuleInCurator returns true for winekeeper", () => {
    const user = { role: "admin" };
    expect(shouldExposeModuleInCurator("winekeeper", user, true)).toBe(true);
  });

  it("internal_tester: shouldExposeModuleInCurator returns true for winekeeper", () => {
    const user = { role: "user", internal_tester: true };
    expect(shouldExposeModuleInCurator("winekeeper", user, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H.5  Session History filter visibility
// ---------------------------------------------------------------------------
describe("H.5 — WineKeeper Session History visibility", () => {
  it("public user: canUserAccessModule('winekeeper') is false — no wine filter chip", () => {
    const user = { role: "user", winekeeper_paid: false };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(false);
  });

  it("public user: shouldFetchModuleData returns false — no wine tastings fetched", () => {
    const user = { role: "user", winekeeper_paid: false };
    expect(shouldFetchModuleData("winekeeper", user, true)).toBe(false);
  });

  it("admin user can see wine filter in Session History", () => {
    const user = { role: "admin" };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(true);
    expect(shouldFetchModuleData("winekeeper", user, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H.6  Admin / internal tester can access WineKeeper
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

  it("is_admin flag passes canonical gates", () => {
    const user = { role: "user", is_admin: true };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(true);
  });

  it("is_internal_tester flag passes canonical gates", () => {
    const user = { role: "user", is_internal_tester: true };
    expect(canUserAccessModule("winekeeper", user, true)).toBe(true);
  });

  it("WINEKEEPER_PUBLIC_ENABLED is false — module is internal-only", () => {
    // This constant drives the release state; it must remain false until launch.
    expect(WINEKEEPER_PUBLIC_ENABLED).toBe(false);
  });
});
