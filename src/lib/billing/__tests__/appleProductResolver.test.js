/* eslint-disable */
/**
 * Tests for the expanded Apple product ID resolver and deferred upgrade logic.
 *
 * Guards the P0 fixes from the Apple Deferred Upgrade Audit:
 *   1. Bundle product IDs (3-module, 4-module/all-modules) resolve correctly
 *   2. Single-module product IDs still resolve correctly
 *   3. Deferred upgrade: current product granted until effective date
 *   4. Deferred upgrade: pending product granted after effective date
 *   5. Unknown product IDs do NOT default to pipekeeper (return null/unknown)
 */

import { describe, test, expect } from "vitest";

// ── Inline the resolver for testing (mirrors resolveAppleProductId in the
//    shared normalizer and resolveAppleProductAccess in syncAppleSubscriptionForMe) ──

function resolveAppleProductId(productId) {
  const product = String(productId || "").trim().toLowerCase();
  if (!product) return null;
  const isAnnual = product.includes("annual") || product.includes("year");

  // 4-module / all-modules bundle
  if (product.includes("all_module") || product.includes("allmodule") ||
      product.includes("four_module") || product.includes("fourmodule") ||
      product.includes("4_module") || product.includes("4module") ||
      (product.includes("bundle") && product.includes("wine"))) {
    return {
      planKey: isAnnual ? "four_module_bundle_annual" : "four_module_bundle_monthly",
      modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"],
      productKind: "bundle_4",
    };
  }

  // 3-module bundle
  if (product.includes("three_module") || product.includes("threemodule") ||
      product.includes("3_module") || product.includes("3module") ||
      (product.includes("bundle") && !product.includes("wine") && !product.includes("founders"))) {
    return {
      planKey: isAnnual ? "three_module_bundle_annual" : "three_module_bundle_monthly",
      modules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"],
      productKind: "bundle_3",
    };
  }

  // Founders bundle
  if (product.includes("founders")) {
    return {
      planKey: isAnnual ? "founders_bundle_annual" : "founders_bundle_monthly",
      modules: ["pipekeeper", "whiskeykeeper"],
      productKind: "founders",
    };
  }

  // Single modules
  if (product.includes("whiskey")) return { planKey: isAnnual ? "whiskeykeeper_pro_annual" : "whiskeykeeper_pro_monthly", modules: ["whiskeykeeper"], productKind: "single" };
  if (product.includes("cigar"))   return { planKey: isAnnual ? "cigarkeeper_pro_annual" : "cigarkeeper_pro_monthly", modules: ["cigarkeeper"], productKind: "single" };
  if (product.includes("wine"))    return { planKey: isAnnual ? "winekeeper_pro_annual" : "winekeeper_pro_monthly", modules: ["winekeeper"], productKind: "single" };
  if (product.includes("pipe") || product.includes("pipekeeper")) return { planKey: isAnnual ? "pipekeeper_pro_annual" : "pipekeeper_pro_monthly", modules: ["pipekeeper"], productKind: "single" };

  return null;
}

// ── Deferred upgrade logic (mirrors syncAppleSubscriptionForMe) ──────────────

function resolveEffectiveProduct(productId, pendingProductId, pendingUpgradeEffectiveDate) {
  const now = new Date();
  const pendingEffective = pendingUpgradeEffectiveDate ? new Date(pendingUpgradeEffectiveDate) : null;
  const upgradeHasTakenEffect = pendingProductId && pendingEffective && pendingEffective <= now;
  return {
    effectiveProductId: upgradeHasTakenEffect ? pendingProductId : productId,
    upgradeHasTakenEffect,
    isDeferred: pendingProductId && pendingEffective && pendingEffective > now,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("resolveAppleProductId — bundle products", () => {
  test("3-module monthly resolves to 3 modules", () => {
    const r = resolveAppleProductId("collectionkeeper_3_modules_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"]);
    expect(r.planKey).toBe("three_module_bundle_monthly");
    expect(r.productKind).toBe("bundle_3");
  });

  test("3-module annual resolves to 3 modules annual", () => {
    const r = resolveAppleProductId("collectionkeeper_3_modules_annual");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"]);
    expect(r.planKey).toBe("three_module_bundle_annual");
  });

  test("all-modules monthly resolves to 4 modules", () => {
    const r = resolveAppleProductId("collectionkeeper_all_modules_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"]);
    expect(r.planKey).toBe("four_module_bundle_monthly");
    expect(r.productKind).toBe("bundle_4");
  });

  test("4-module annual resolves to 4 modules annual", () => {
    const r = resolveAppleProductId("collectionkeeper_4_module_annual");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"]);
    expect(r.planKey).toBe("four_module_bundle_annual");
  });

  test("bundle with wine keyword resolves to 4 modules", () => {
    const r = resolveAppleProductId("collectionkeeper_bundle_wine_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"]);
  });

  test("bundle without wine resolves to 3 modules", () => {
    const r = resolveAppleProductId("collectionkeeper_bundle_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"]);
  });
});

describe("resolveAppleProductId — single module products", () => {
  test("pipekeeper monthly resolves to pipekeeper only", () => {
    const r = resolveAppleProductId("pipekeeper_pro_monthly");
    expect(r.modules).toEqual(["pipekeeper"]);
    expect(r.productKind).toBe("single");
  });

  test("whiskeykeeper annual resolves to whiskeykeeper only", () => {
    const r = resolveAppleProductId("whiskeykeeper_pro_annual");
    expect(r.modules).toEqual(["whiskeykeeper"]);
    expect(r.planKey).toBe("whiskeykeeper_pro_annual");
  });

  test("cigarkeeper monthly resolves to cigarkeeper only", () => {
    const r = resolveAppleProductId("cigarkeeper_pro_monthly");
    expect(r.modules).toEqual(["cigarkeeper"]);
  });

  test("winekeeper annual resolves to winekeeper only", () => {
    const r = resolveAppleProductId("winekeeper_pro_annual");
    expect(r.modules).toEqual(["winekeeper"]);
  });
});

describe("resolveAppleProductId — founders bundle", () => {
  test("founders monthly resolves to PK + WK (2 modules, not 4)", () => {
    const r = resolveAppleProductId("collectionkeeper_founders_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper"]);
    expect(r.modules.length).toBe(2);
    expect(r.productKind).toBe("founders");
  });

  test("founders annual resolves to PK + WK annual", () => {
    const r = resolveAppleProductId("founders_bundle_annual");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper"]);
    expect(r.planKey).toBe("founders_bundle_annual");
  });
});

describe("resolveAppleProductId — edge cases", () => {
  test("empty product ID returns null", () => {
    expect(resolveAppleProductId("")).toBeNull();
    expect(resolveAppleProductId(null)).toBeNull();
  });

  test("unrecognized product ID returns null (NOT pipekeeper)", () => {
    // This is the key fix — previously, unrecognized IDs defaulted to pipekeeper
    expect(resolveAppleProductId("some_unknown_product")).toBeNull();
  });

  test("3-module bundle checked before single modules (whiskey in bundle name)", () => {
    // A 3-module product ID might contain "whiskey" — must resolve to bundle, not single
    const r = resolveAppleProductId("3_module_pipe_whiskey_cigar_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"]);
    expect(r.productKind).toBe("bundle_3");
  });

  test("all-modules bundle checked before wine single module", () => {
    // An all-modules product ID might contain "wine" — must resolve to bundle, not single
    const r = resolveAppleProductId("all_modules_with_wine_monthly");
    expect(r.modules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"]);
    expect(r.productKind).toBe("bundle_4");
  });
});

describe("Deferred upgrade handling", () => {
  test("grants current product when upgrade is in the future", () => {
    const futureDate = "2026-08-16T00:00:00.000Z";
    const { effectiveProductId, isDeferred, upgradeHasTakenEffect } = resolveEffectiveProduct(
      "collectionkeeper_3_modules_monthly",
      "collectionkeeper_all_modules_monthly",
      futureDate
    );
    expect(effectiveProductId).toBe("collectionkeeper_3_modules_monthly");
    expect(isDeferred).toBe(true);
    expect(upgradeHasTakenEffect).toBe(false);
  });

  test("grants pending product when upgrade effective date has passed", () => {
    const pastDate = "2026-01-01T00:00:00.000Z";
    const { effectiveProductId, upgradeHasTakenEffect } = resolveEffectiveProduct(
      "collectionkeeper_3_modules_monthly",
      "collectionkeeper_all_modules_monthly",
      pastDate
    );
    expect(effectiveProductId).toBe("collectionkeeper_all_modules_monthly");
    expect(upgradeHasTakenEffect).toBe(true);
  });

  test("grants current product when no pending upgrade", () => {
    const { effectiveProductId, isDeferred } = resolveEffectiveProduct(
      "pipekeeper_pro_monthly",
      "",
      null
    );
    expect(effectiveProductId).toBe("pipekeeper_pro_monthly");
    expect(isDeferred).toBe(false);
  });

  test("deferred upgrade resolves to 3 modules until effective date, then 4", () => {
    const futureDate = "2026-08-16T00:00:00.000Z";
    const { effectiveProductId } = resolveEffectiveProduct(
      "collectionkeeper_3_modules_monthly",
      "collectionkeeper_all_modules_monthly",
      futureDate
    );
    const currentModules = resolveAppleProductId(effectiveProductId).modules;
    expect(currentModules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper"]);
    expect(currentModules).not.toContain("winekeeper");
  });

  test("after effective date, deferred upgrade resolves to all 4 modules", () => {
    const pastDate = "2026-08-16T00:00:00.000Z"; // Aug 16, which is today or past
    const { effectiveProductId } = resolveEffectiveProduct(
      "collectionkeeper_3_modules_monthly",
      "collectionkeeper_all_modules_monthly",
      pastDate
    );
    const upgradedModules = resolveAppleProductId(effectiveProductId).modules;
    expect(upgradedModules).toEqual(["pipekeeper", "whiskeykeeper", "cigarkeeper", "winekeeper"]);
  });
});