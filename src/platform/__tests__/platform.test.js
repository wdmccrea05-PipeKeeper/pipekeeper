/**
 * Unit tests for the CollectionKeeper platform layer.
 *
 * Covers:
 *   - moduleTypes: constants, ACTIVE_MODULES, isValidModuleType
 *   - itemModel: normalizeItem, normalizeItems, normalizePipeKeeperItems
 *   - aiEligibility: isItemAiEligible, filterAiEligibleItems, getAiEligibilityStats
 *   - valuation: getItemValue, calculateCollectionValue, getValueSummary
 *   - reporting: getReportableItems, buildReportData
 *   - dashboard: aggregateCollectionStats, aggregateModuleSummary, aggregatePlatformStats, getRecentActivity
 *   - platform/entitlements: isModuleEnabled, getEnabledModules, buildModuleEntitlements
 *   - moduleAdapters: getAdapter, normalizeItemForPlatform, isItemAiEligibleViaAdapter
 */

import { describe, test, expect } from "vitest";

import {
  MODULE_TYPES,
  ACTIVE_MODULES,
  MODULE_DISPLAY_NAMES,
  isValidModuleType,
} from "../moduleTypes.js";

import {
  normalizeItem,
  normalizeItems,
  normalizePipeKeeperItems,
} from "../itemModel.js";

import {
  isItemAiEligible,
  filterAiEligibleItems,
  filterAiExcludedItems,
  getAiEligibilityStats,
} from "../aiEligibility.js";

import {
  getItemValue,
  calculateCollectionValue,
  getValueSummary,
  getMultiModuleValueSummary,
} from "../valuation.js";

import {
  getReportableItems,
  buildReportData,
  buildMultiModuleReportData,
} from "../reporting.js";

import {
  aggregateCollectionStats,
  aggregateModuleSummary,
  aggregatePlatformStats,
  getRecentActivity,
} from "../dashboard.js";

import {
  PLATFORM_MODULES,
  PIPEKEEPER_ENABLED_MODULES,
  isModuleEnabled,
  getEnabledModules,
  buildModuleEntitlements,
} from "../entitlements.js";

import {
  getAdapter,
  normalizeItemForPlatform,
  isItemAiEligibleViaAdapter,
} from "../moduleAdapters/index.js";

// ─── moduleTypes ──────────────────────────────────────────────────────────────

describe("moduleTypes — constants", () => {
  test("MODULE_TYPES defines pipe and tobacco", () => {
    expect(MODULE_TYPES.PIPE).toBe("pipe");
    expect(MODULE_TYPES.TOBACCO).toBe("tobacco");
  });

  test("MODULE_TYPES defines future modules", () => {
    expect(MODULE_TYPES.WHISKEY).toBe("whiskey");
    expect(MODULE_TYPES.CIGAR).toBe("cigar");
    expect(MODULE_TYPES.COFFEE).toBe("coffee");
  });

  test("ACTIVE_MODULES contains pipe and tobacco", () => {
    expect(ACTIVE_MODULES).toContain("pipe");
    expect(ACTIVE_MODULES).toContain("tobacco");
  });

  test("ACTIVE_MODULES contains launched platform modules and excludes blocked future modules", () => {
    expect(ACTIVE_MODULES).toContain("whiskey");
    expect(ACTIVE_MODULES).not.toContain("cigar");
    expect(ACTIVE_MODULES).not.toContain("coffee");
  });

  test("MODULE_DISPLAY_NAMES returns human readable labels", () => {
    expect(MODULE_DISPLAY_NAMES[MODULE_TYPES.PIPE]).toBe("Pipes");
    expect(MODULE_DISPLAY_NAMES[MODULE_TYPES.TOBACCO]).toBe("Tobacco");
  });

  test("isValidModuleType returns true for known types", () => {
    expect(isValidModuleType("pipe")).toBe(true);
    expect(isValidModuleType("tobacco")).toBe(true);
    expect(isValidModuleType("whiskey")).toBe(true);
  });

  test("isValidModuleType returns false for unknown types", () => {
    expect(isValidModuleType("unknown")).toBe(false);
    expect(isValidModuleType(null)).toBe(false);
    expect(isValidModuleType(undefined)).toBe(false);
  });
});

// ─── itemModel ────────────────────────────────────────────────────────────────

describe("itemModel — normalizeItem", () => {
  test("normalizes a raw pipe record", () => {
    const raw = {
      id: "p1",
      name: "Dunhill Shell",
      purchase_price: 250,
      estimated_value: 300,
      is_favorite: true,
      ai_excluded: false,
    };
    const item = normalizeItem(raw, "pipe");
    expect(item.id).toBe("p1");
    expect(item.module_type).toBe("pipe");
    expect(item.name).toBe("Dunhill Shell");
    expect(item.purchase_price).toBe(250);
    expect(item.estimated_value).toBe(300);
    expect(item.favorite).toBe(true);
    expect(item.ai_excluded).toBe(false);
    expect(item.public_visibility).toBe(true);
  });

  test("respects module_type on raw item over override", () => {
    const raw = { id: "t1", name: "Blend A", module_type: "tobacco" };
    const item = normalizeItem(raw, "pipe");
    expect(item.module_type).toBe("tobacco");
  });

  test("falls back to override when raw item lacks module_type", () => {
    const raw = { id: "t1", name: "Blend A" };
    const item = normalizeItem(raw, "tobacco");
    expect(item.module_type).toBe("tobacco");
  });

  test("sets module_type to null when unrecognized", () => {
    const raw = { id: "x1", name: "Unknown", module_type: "unknownType" };
    const item = normalizeItem(raw);
    expect(item.module_type).toBeNull();
  });

  test("defaults ai_excluded to false", () => {
    expect(normalizeItem({ id: "p2" }).ai_excluded).toBe(false);
  });

  test("defaults public_visibility to true", () => {
    expect(normalizeItem({ id: "p2" }).public_visibility).toBe(true);
  });

  test("preserves _raw field", () => {
    const raw = { id: "p3", customField: "xyz" };
    expect(normalizeItem(raw)._raw).toBe(raw);
  });

  test("returns null for null input", () => {
    expect(normalizeItem(null)).toBeNull();
  });
});

describe("itemModel — normalizeItems", () => {
  test("normalizes an array", () => {
    const items = normalizeItems([{ id: "a" }, { id: "b" }], "pipe");
    expect(items).toHaveLength(2);
    expect(items[0].module_type).toBe("pipe");
  });

  test("returns empty array for non-array input", () => {
    expect(normalizeItems(null)).toEqual([]);
  });
});

describe("itemModel — normalizePipeKeeperItems", () => {
  test("combines pipes and blends with correct module types", () => {
    const result = normalizePipeKeeperItems({
      pipes: [{ id: "p1", name: "Pipe 1" }],
      blends: [{ id: "b1", name: "Blend 1" }],
    });
    expect(result).toHaveLength(2);
    expect(result[0].module_type).toBe("pipe");
    expect(result[1].module_type).toBe("tobacco");
  });

  test("handles empty input", () => {
    expect(normalizePipeKeeperItems({})).toEqual([]);
  });
});

// ─── aiEligibility ────────────────────────────────────────────────────────────

describe("aiEligibility — isItemAiEligible", () => {
  test("returns true when ai_excluded is false", () => {
    expect(isItemAiEligible({ ai_excluded: false })).toBe(true);
  });

  test("returns false when ai_excluded is true", () => {
    expect(isItemAiEligible({ ai_excluded: true })).toBe(false);
  });

  test("returns true when ai_excluded is absent", () => {
    expect(isItemAiEligible({ id: "x" })).toBe(true);
  });

  test("returns false for null item", () => {
    expect(isItemAiEligible(null)).toBe(false);
  });
});

describe("aiEligibility — filterAiEligibleItems", () => {
  const items = [
    { id: "a", ai_excluded: false },
    { id: "b", ai_excluded: true },
    { id: "c" },
  ];

  test("keeps eligible items and removes excluded", () => {
    const result = filterAiEligibleItems(items);
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  test("returns empty array for non-array input", () => {
    expect(filterAiEligibleItems(null)).toEqual([]);
  });
});

describe("aiEligibility — filterAiExcludedItems", () => {
  test("returns only excluded items", () => {
    const items = [{ id: "a", ai_excluded: false }, { id: "b", ai_excluded: true }];
    expect(filterAiExcludedItems(items).map((i) => i.id)).toEqual(["b"]);
  });
});

describe("aiEligibility — getAiEligibilityStats", () => {
  test("computes correct counts", () => {
    const items = [
      { ai_excluded: false },
      { ai_excluded: true },
      { ai_excluded: false },
    ];
    const stats = getAiEligibilityStats(items);
    expect(stats.total).toBe(3);
    expect(stats.eligible).toBe(2);
    expect(stats.excluded).toBe(1);
  });

  test("returns zeros for empty array", () => {
    const stats = getAiEligibilityStats([]);
    expect(stats.total).toBe(0);
    expect(stats.eligible).toBe(0);
    expect(stats.excluded).toBe(0);
  });
});

// ─── valuation ────────────────────────────────────────────────────────────────

describe("valuation — getItemValue", () => {
  test("prefers estimated_value over purchase_price", () => {
    expect(getItemValue({ estimated_value: 100, purchase_price: 50 })).toBe(100);
  });

  test("falls back to purchase_price when estimated_value is absent", () => {
    expect(getItemValue({ purchase_price: 50 })).toBe(50);
  });

  test("returns 0 when both values are absent", () => {
    expect(getItemValue({})).toBe(0);
  });

  test("returns 0 for null item", () => {
    expect(getItemValue(null)).toBe(0);
  });
});

describe("valuation — calculateCollectionValue", () => {
  test("sums item values", () => {
    const items = [
      { estimated_value: 100 },
      { purchase_price: 50 },
      { estimated_value: 200, purchase_price: 100 },
    ];
    expect(calculateCollectionValue(items)).toBe(350);
  });

  test("returns 0 for empty array", () => {
    expect(calculateCollectionValue([])).toBe(0);
  });

  test("returns 0 for non-array input", () => {
    expect(calculateCollectionValue(null)).toBe(0);
  });
});

describe("valuation — getValueSummary", () => {
  test("produces correct summary", () => {
    const items = [
      { estimated_value: 200, purchase_price: 150 },
      { estimated_value: 100, purchase_price: 80 },
    ];
    const summary = getValueSummary(items);
    expect(summary.itemCount).toBe(2);
    expect(summary.totalEstimatedValue).toBe(300);
    expect(summary.totalPurchasePrice).toBe(230);
    expect(summary.totalValue).toBe(300);
    expect(summary.averageValue).toBe(150);
  });

  test("returns zeroed summary for empty array", () => {
    const summary = getValueSummary([]);
    expect(summary.itemCount).toBe(0);
    expect(summary.totalValue).toBe(0);
  });
});

describe("valuation — getMultiModuleValueSummary", () => {
  test("produces per-module and combined summaries", () => {
    const result = getMultiModuleValueSummary({
      pipe: [{ estimated_value: 200 }],
      tobacco: [{ estimated_value: 50 }],
    });
    expect(result.pipe.totalValue).toBe(200);
    expect(result.tobacco.totalValue).toBe(50);
    expect(result.combined.totalValue).toBe(250);
  });
});

// ─── reporting ────────────────────────────────────────────────────────────────

describe("reporting — getReportableItems", () => {
  const items = [
    { id: "a", public_visibility: true },
    { id: "b", public_visibility: false },
    { id: "c" },
  ];

  test("returns all items when includePrivate is true (default)", () => {
    expect(getReportableItems(items)).toHaveLength(3);
  });

  test("excludes private items when includePrivate is false", () => {
    const result = getReportableItems(items, { includePrivate: false });
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  test("returns empty array for non-array input", () => {
    expect(getReportableItems(null)).toEqual([]);
  });
});

describe("reporting — buildReportData", () => {
  const items = [
    { id: "a", estimated_value: 100, is_favorite: true, ai_excluded: false },
    { id: "b", estimated_value: 50, is_favorite: false, ai_excluded: true },
  ];

  test("calculates totalCount and totalValue", () => {
    const report = buildReportData(items);
    expect(report.totalCount).toBe(2);
    expect(report.totalValue).toBe(150);
  });

  test("counts favorites correctly", () => {
    expect(buildReportData(items).favoriteCount).toBe(1);
  });

  test("counts ai_excluded correctly", () => {
    expect(buildReportData(items).aiExcludedCount).toBe(1);
  });

  test("ai_excluded items are still included in the report", () => {
    // ai_excluded only affects AI recommendations, not reports
    expect(buildReportData(items).items).toHaveLength(2);
  });
});

describe("reporting — buildMultiModuleReportData", () => {
  test("produces per-module and combined report data", () => {
    const result = buildMultiModuleReportData({
      pipe: [{ id: "p1", estimated_value: 200 }],
      tobacco: [{ id: "t1", estimated_value: 30 }],
    });
    expect(result.pipe.totalCount).toBe(1);
    expect(result.tobacco.totalCount).toBe(1);
    expect(result.combined.totalCount).toBe(2);
    expect(result.combined.totalValue).toBe(230);
  });
});

// ─── dashboard ────────────────────────────────────────────────────────────────

describe("dashboard — aggregateCollectionStats", () => {
  const items = [
    { id: "a", estimated_value: 100, is_favorite: true, ai_excluded: false },
    { id: "b", purchase_price: 50, is_favorite: false, ai_excluded: true },
    { id: "c", estimated_value: 200 },
  ];

  test("counts total items", () => {
    expect(aggregateCollectionStats(items).totalItemCount).toBe(3);
  });

  test("counts favorites", () => {
    expect(aggregateCollectionStats(items).favoriteCount).toBe(1);
  });

  test("counts ai eligible and excluded", () => {
    const stats = aggregateCollectionStats(items);
    expect(stats.aiExcludedCount).toBe(1);
    expect(stats.aiEligibleCount).toBe(2);
  });

  test("sums collection value", () => {
    expect(aggregateCollectionStats(items).totalCollectionValue).toBe(350);
  });

  test("returns zeros for empty array", () => {
    const stats = aggregateCollectionStats([]);
    expect(stats.totalItemCount).toBe(0);
    expect(stats.totalCollectionValue).toBe(0);
  });

  test("returns zeros for non-array input", () => {
    const stats = aggregateCollectionStats(null);
    expect(stats.totalItemCount).toBe(0);
  });
});

describe("dashboard — aggregateModuleSummary", () => {
  test("returns per-module stats", () => {
    const result = aggregateModuleSummary({
      pipe: [{ estimated_value: 100 }],
      tobacco: [{ estimated_value: 20 }, { estimated_value: 30 }],
    });
    expect(result.pipe.totalItemCount).toBe(1);
    expect(result.tobacco.totalItemCount).toBe(2);
    expect(result.tobacco.totalCollectionValue).toBe(50);
  });
});

describe("dashboard — aggregatePlatformStats", () => {
  test("returns combined stats and module breakdown", () => {
    const result = aggregatePlatformStats({
      pipe: [{ estimated_value: 100 }],
      tobacco: [{ estimated_value: 50 }],
    });
    expect(result.totalItemCount).toBe(2);
    expect(result.totalCollectionValue).toBe(150);
    expect(result.modules.pipe.totalItemCount).toBe(1);
    expect(result.modules.tobacco.totalItemCount).toBe(1);
  });
});

describe("dashboard — getRecentActivity", () => {
  test("returns items sorted by updated_at descending", () => {
    const items = [
      { id: "a", updated_at: "2024-01-01" },
      { id: "b", updated_at: "2024-06-01" },
      { id: "c", updated_at: "2024-03-01" },
    ];
    const result = getRecentActivity(items, 2);
    expect(result[0].id).toBe("b");
    expect(result[1].id).toBe("c");
    expect(result).toHaveLength(2);
  });

  test("returns empty array for non-array input", () => {
    expect(getRecentActivity(null)).toEqual([]);
  });
});

// ─── platform/entitlements ───────────────────────────────────────────────────

describe("platform/entitlements — PLATFORM_MODULES", () => {
  test("defines all expected module keys", () => {
    expect(PLATFORM_MODULES.PIPE).toBe("pipes");
    expect(PLATFORM_MODULES.TOBACCO).toBe("tobacco");
    expect(PLATFORM_MODULES.WHISKEY).toBe("whiskey");
    expect(PLATFORM_MODULES.CIGAR).toBe("cigars");
    expect(PLATFORM_MODULES.COFFEE).toBe("coffee");
  });
});

describe("platform/entitlements — isModuleEnabled", () => {
  test("returns true for pipes (currently enabled)", () => {
    expect(isModuleEnabled(PLATFORM_MODULES.PIPE)).toBe(true);
  });

  test("returns true for tobacco (currently enabled)", () => {
    expect(isModuleEnabled(PLATFORM_MODULES.TOBACCO)).toBe(true);
  });

  test("returns false for whiskey by default until explicitly enabled in entitlements", () => {
    expect(isModuleEnabled(PLATFORM_MODULES.WHISKEY)).toBe(false);
  });

  test("returns true for whiskey when entitlement data enables it", () => {
    expect(getEnabledModules({ whiskeykeeper_enabled: true })).toContain(PLATFORM_MODULES.WHISKEY);
    expect(buildModuleEntitlements({ whiskeykeeper_enabled: true })[PLATFORM_MODULES.WHISKEY].enabled).toBe(true);
  });

  test("accepts custom enabled modules list", () => {
    expect(isModuleEnabled("whiskey", ["whiskey"])).toBe(true);
    expect(isModuleEnabled("pipes", ["whiskey"])).toBe(false);
  });
});

describe("platform/entitlements — getEnabledModules", () => {
  test("returns pipes and tobacco for all entitlement tiers", () => {
    const modules = getEnabledModules({ tier: "free" });
    expect(modules).toContain("pipes");
    expect(modules).toContain("tobacco");
  });

  test("returns PIPEKEEPER_ENABLED_MODULES when no entitlements provided", () => {
    expect(getEnabledModules()).toEqual(PIPEKEEPER_ENABLED_MODULES);
  });
});

describe("platform/entitlements — buildModuleEntitlements", () => {
  test("marks pipes and tobacco as enabled", () => {
    const result = buildModuleEntitlements();
    expect(result.pipes.enabled).toBe(true);
    expect(result.tobacco.enabled).toBe(true);
  });

  test("marks future modules as not enabled", () => {
    const result = buildModuleEntitlements();
    expect(result.whiskey.enabled).toBe(false);
    expect(result.cigars.enabled).toBe(false);
    expect(result.coffee.enabled).toBe(false);
  });
});

// ─── moduleAdapters ───────────────────────────────────────────────────────────

describe("moduleAdapters — getAdapter", () => {
  test("returns pipe adapter for MODULE_TYPES.PIPE", () => {
    const adapter = getAdapter("pipe");
    expect(adapter).not.toBeNull();
    expect(adapter.moduleType).toBe("pipe");
  });

  test("returns tobacco adapter for MODULE_TYPES.TOBACCO", () => {
    const adapter = getAdapter("tobacco");
    expect(adapter).not.toBeNull();
    expect(adapter.moduleType).toBe("tobacco");
  });

  test("returns whiskey adapter for registered whiskey module type", () => {
    expect(getAdapter("whiskey")).not.toBeNull();
  });
});

describe("moduleAdapters — normalizeItemForPlatform", () => {
  test("normalizes a pipe record via the pipe adapter", () => {
    const raw = { id: "p1", name: "Test Pipe", is_favorite: true };
    const item = normalizeItemForPlatform(raw, "pipe");
    expect(item.module_type).toBe("pipe");
    expect(item.favorite).toBe(true);
  });

  test("returns raw item when no adapter is registered", () => {
    const raw = { id: "x1", name: "Unknown" };
    expect(normalizeItemForPlatform(raw, "unknown")).toBe(raw);
  });
});

describe("moduleAdapters — isItemAiEligibleViaAdapter", () => {
  test("returns true for an included pipe", () => {
    expect(isItemAiEligibleViaAdapter({ ai_excluded: false }, "pipe")).toBe(true);
  });

  test("returns false for an excluded pipe", () => {
    expect(isItemAiEligibleViaAdapter({ ai_excluded: true }, "pipe")).toBe(false);
  });

  test("falls back to platform ai_excluded when no adapter registered", () => {
    expect(isItemAiEligibleViaAdapter({ ai_excluded: false }, "whiskey")).toBe(true);
    expect(isItemAiEligibleViaAdapter({ ai_excluded: true }, "whiskey")).toBe(false);
  });
});
