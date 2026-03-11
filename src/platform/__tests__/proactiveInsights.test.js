/**
 * Unit tests for platform/proactiveInsights.js
 *
 * Covers:
 *   - buildInsight: canonical shape validation
 *   - generatePipeRotationInsights: underused, overused, AI exclusion
 *   - generateTobaccoDiversityInsights: low variety, overconcentration
 *   - generateTobaccoAgingInsights: aging-ready, open-at-risk
 *   - generatePairingInsights: unpaired pipes, over-reliance
 *   - generateCollectionHealthInsights: collector-only items
 *   - generateProactiveInsights: deduplication, severity sorting
 *   - getCachedProactiveInsights / invalidateInsightCache
 */

import { describe, test, expect, beforeEach } from "vitest";

import {
  buildInsight,
  generatePipeRotationInsights,
  generateTobaccoDiversityInsights,
  generateTobaccoAgingInsights,
  generatePairingInsights,
  generateCollectionHealthInsights,
  generateProactiveInsights,
  getCachedProactiveInsights,
  invalidateInsightCache,
  INSIGHT_CATEGORIES,
  INSIGHT_SEVERITY,
  INSIGHT_SCOPE,
} from "../proactiveInsights.js";

// ─── buildInsight ─────────────────────────────────────────────────────────────

describe("buildInsight", () => {
  test("returns all required fields", () => {
    const insight = buildInsight({
      id: "test_id",
      title: "Test Title",
      summary: "Summary text",
      category: INSIGHT_CATEGORIES.ROTATION,
      scope: INSIGHT_SCOPE.PIPE,
      severity: INSIGHT_SEVERITY.MEDIUM,
      reason: "Because reasons",
      suggested_action: "Do this",
    });
    expect(insight.id).toBe("test_id");
    expect(insight.title).toBe("Test Title");
    expect(insight.summary).toBe("Summary text");
    expect(insight.category).toBe(INSIGHT_CATEGORIES.ROTATION);
    expect(insight.scope).toBe(INSIGHT_SCOPE.PIPE);
    expect(insight.severity).toBe(INSIGHT_SEVERITY.MEDIUM);
    expect(insight.reason).toBe("Because reasons");
    expect(insight.suggested_action).toBe("Do this");
  });

  test("defaults related_items to empty array", () => {
    const insight = buildInsight({
      id: "x",
      title: "",
      summary: "",
      category: "",
      scope: "",
      severity: "",
      reason: "",
      suggested_action: "",
    });
    expect(insight.related_items).toEqual([]);
  });

  test("defaults is_dismissed to false", () => {
    const insight = buildInsight({
      id: "x", title: "", summary: "", category: "", scope: "", severity: "", reason: "", suggested_action: "",
    });
    expect(insight.is_dismissed).toBe(false);
  });

  test("sets created_at and updated_at timestamps", () => {
    const insight = buildInsight({
      id: "x", title: "", summary: "", category: "", scope: "", severity: "", reason: "", suggested_action: "",
    });
    expect(typeof insight.created_at).toBe("string");
    expect(typeof insight.updated_at).toBe("string");
  });

  test("accepts related_items", () => {
    const insight = buildInsight({
      id: "x", title: "", summary: "", category: "", scope: "", severity: "", reason: "", suggested_action: "",
      related_items: ["a", "b"],
    });
    expect(insight.related_items).toEqual(["a", "b"]);
  });
});

// ─── generatePipeRotationInsights ────────────────────────────────────────────

describe("generatePipeRotationInsights", () => {
  const now = new Date().toISOString();
  const longAgo = new Date(Date.now() - 50 * 86_400_000).toISOString();
  const recentlyUsed = new Date(Date.now() - 1 * 86_400_000).toISOString();

  const pipes = [
    { id: "p1", name: "Billiard", ai_excluded: false },
    { id: "p2", name: "Briar", ai_excluded: false },
    { id: "p3", name: "Meerschaum", ai_excluded: false },
    { id: "p4", name: "Collector Piece", ai_excluded: true },
  ];

  test("returns underused insight when pipes have not been used recently", () => {
    const logs = { p1: longAgo, p2: longAgo };
    const insights = generatePipeRotationInsights(pipes, logs);
    const ids = insights.map((i) => i.id);
    expect(ids).toContain("rotation_underused_pipes");
  });

  test("excludes ai_excluded pipes from rotation analysis", () => {
    // Only collector pipe (ai_excluded) hasn't been used — others used recently
    const logs = { p1: now, p2: now, p3: now };
    const insights = generatePipeRotationInsights(pipes, logs);
    const rotationInsight = insights.find((i) => i.id === "rotation_underused_pipes");
    // p4 is ai_excluded, so it should not count as underused
    expect(rotationInsight).toBeUndefined();
  });

  test("returns empty array when all pipes are used recently", () => {
    const logs = { p1: now, p2: now, p3: now };
    const insights = generatePipeRotationInsights([pipes[0], pipes[1], pipes[2]], logs);
    expect(insights.find((i) => i.id === "rotation_underused_pipes")).toBeUndefined();
  });

  test("returns empty array when no eligible pipes exist", () => {
    const excludedOnly = [{ id: "p1", ai_excluded: true }];
    expect(generatePipeRotationInsights(excludedOnly, {})).toEqual([]);
  });

  test("underused insight includes related_items", () => {
    const logs = { p1: longAgo };
    const insights = generatePipeRotationInsights([pipes[0]], logs);
    const insight = insights.find((i) => i.id === "rotation_underused_pipes");
    expect(insight.related_items).toContain("p1");
  });

  test("returns rest insight when a pipe was used very recently and others exist", () => {
    const manyPipes = [
      { id: "p1", ai_excluded: false },
      { id: "p2", ai_excluded: false },
      { id: "p3", ai_excluded: false },
      { id: "p4", ai_excluded: false },
    ];
    const logs = { p1: recentlyUsed };
    const insights = generatePipeRotationInsights(manyPipes, logs);
    expect(insights.find((i) => i.id === "rotation_overused_pipes")).toBeDefined();
  });

  test("insight has correct category and scope", () => {
    const logs = { p1: longAgo };
    const insights = generatePipeRotationInsights([pipes[0]], logs);
    const insight = insights[0];
    expect(insight.category).toBe(INSIGHT_CATEGORIES.ROTATION);
    expect(insight.scope).toBe(INSIGHT_SCOPE.PIPE);
  });
});

// ─── generateTobaccoDiversityInsights ────────────────────────────────────────

describe("generateTobaccoDiversityInsights", () => {
  test("returns low variety insight when only one blend type present", () => {
    const blends = [
      { id: "b1", blend_type: "aromatic", ai_excluded: false },
      { id: "b2", blend_type: "aromatic", ai_excluded: false },
      { id: "b3", blend_type: "aromatic", ai_excluded: false },
    ];
    const insights = generateTobaccoDiversityInsights(blends);
    expect(insights.find((i) => i.id === "diversity_low_blend_variety")).toBeDefined();
  });

  test("does not return low variety when sufficient diversity exists", () => {
    const blends = [
      { id: "b1", blend_type: "aromatic", ai_excluded: false },
      { id: "b2", blend_type: "virginia", ai_excluded: false },
      { id: "b3", blend_type: "latakia", ai_excluded: false },
    ];
    const insights = generateTobaccoDiversityInsights(blends);
    expect(insights.find((i) => i.id === "diversity_low_blend_variety")).toBeUndefined();
  });

  test("returns overconcentration insight when one family dominates", () => {
    const blends = [
      { id: "b1", blend_type: "aromatic", ai_excluded: false },
      { id: "b2", blend_type: "aromatic", ai_excluded: false },
      { id: "b3", blend_type: "aromatic", ai_excluded: false },
      { id: "b4", blend_type: "aromatic", ai_excluded: false },
      { id: "b5", blend_type: "virginia", ai_excluded: false },
    ];
    const insights = generateTobaccoDiversityInsights(blends);
    expect(insights.find((i) => i.id === "diversity_overconcentration")).toBeDefined();
  });

  test("excludes ai_excluded blends from diversity analysis", () => {
    const blends = [
      { id: "b1", blend_type: "aromatic", ai_excluded: true },
      { id: "b2", blend_type: "aromatic", ai_excluded: true },
      { id: "b3", blend_type: "aromatic", ai_excluded: true },
    ];
    expect(generateTobaccoDiversityInsights(blends)).toEqual([]);
  });

  test("returns empty array for empty blend list", () => {
    expect(generateTobaccoDiversityInsights([])).toEqual([]);
  });
});

// ─── generateTobaccoAgingInsights ────────────────────────────────────────────

describe("generateTobaccoAgingInsights", () => {
  const twoYearsAgo = new Date(Date.now() - 2.5 * 365 * 86_400_000).toISOString();
  const sixMonthsAgo = new Date(Date.now() - 7 * 30 * 86_400_000).toISOString();
  const recentDate = new Date(Date.now() - 30 * 86_400_000).toISOString();

  test("returns aging-ready insight for blends cellared 2+ years", () => {
    const blends = [{ id: "b1", created_at: twoYearsAgo, ai_excluded: false }];
    const insights = generateTobaccoAgingInsights(blends);
    expect(insights.find((i) => i.id === "aging_ready_blends")).toBeDefined();
  });

  test("does not return aging insight for recently added blends", () => {
    const blends = [{ id: "b1", created_at: recentDate, ai_excluded: false }];
    const insights = generateTobaccoAgingInsights(blends);
    expect(insights.find((i) => i.id === "aging_ready_blends")).toBeUndefined();
  });

  test("returns open-at-risk insight for stale open blends", () => {
    const blends = [
      { id: "b1", status: "open", opened_at: sixMonthsAgo, ai_excluded: false },
    ];
    const insights = generateTobaccoAgingInsights(blends);
    expect(insights.find((i) => i.id === "inventory_open_at_risk")).toBeDefined();
  });

  test("does not return open-at-risk for recently opened blends", () => {
    const blends = [
      { id: "b1", status: "open", opened_at: recentDate, ai_excluded: false },
    ];
    const insights = generateTobaccoAgingInsights(blends);
    expect(insights.find((i) => i.id === "inventory_open_at_risk")).toBeUndefined();
  });

  test("excludes ai_excluded blends from aging analysis", () => {
    const blends = [{ id: "b1", created_at: twoYearsAgo, ai_excluded: true }];
    expect(generateTobaccoAgingInsights(blends)).toEqual([]);
  });
});

// ─── generatePairingInsights ─────────────────────────────────────────────────

describe("generatePairingInsights", () => {
  const pipes = [
    { id: "p1", ai_excluded: false },
    { id: "p2", ai_excluded: false },
    { id: "p3", ai_excluded: false },
  ];
  const blends = [
    { id: "b1", ai_excluded: false },
    { id: "b2", ai_excluded: false },
    { id: "b3", ai_excluded: false },
  ];

  test("returns unpaired insight when some pipes have no pairings", () => {
    const pairings = [{ pipe_id: "p1", tobacco_id: "b1", session_count: 1 }];
    const insights = generatePairingInsights(pipes, blends, pairings);
    expect(insights.find((i) => i.id === "pairing_unpaired_pipes")).toBeDefined();
  });

  test("includes unpaired pipe IDs in related_items", () => {
    const pairings = [{ pipe_id: "p1", tobacco_id: "b1", session_count: 1 }];
    const insights = generatePairingInsights(pipes, blends, pairings);
    const insight = insights.find((i) => i.id === "pairing_unpaired_pipes");
    expect(insight.related_items).toContain("p2");
    expect(insight.related_items).toContain("p3");
  });

  test("does not return unpaired insight when no pairings exist at all", () => {
    const insights = generatePairingInsights(pipes, blends, []);
    expect(insights.find((i) => i.id === "pairing_unpaired_pipes")).toBeUndefined();
  });

  test("returns empty array when no eligible pipes or blends", () => {
    expect(generatePairingInsights([], blends)).toEqual([]);
    expect(generatePairingInsights(pipes, [])).toEqual([]);
  });

  test("scope is cross_module", () => {
    const pairings = [{ pipe_id: "p1", session_count: 1 }];
    const insights = generatePairingInsights(pipes, blends, pairings);
    const insight = insights.find((i) => i.id === "pairing_unpaired_pipes");
    if (insight) expect(insight.scope).toBe(INSIGHT_SCOPE.CROSS_MODULE);
  });
});

// ─── generateCollectionHealthInsights ────────────────────────────────────────

describe("generateCollectionHealthInsights", () => {
  test("returns collector-items insight when excluded items exist", () => {
    const pipes = [{ id: "p1", ai_excluded: true }];
    const blends = [];
    const insights = generateCollectionHealthInsights(pipes, blends);
    expect(insights.find((i) => i.id === "collection_health_excluded_items")).toBeDefined();
  });

  test("does not return collector-items insight when no excluded items", () => {
    const pipes = [{ id: "p1", ai_excluded: false }];
    const blends = [{ id: "b1", ai_excluded: false }];
    const insights = generateCollectionHealthInsights(pipes, blends);
    expect(insights.find((i) => i.id === "collection_health_excluded_items")).toBeUndefined();
  });

  test("includes excluded item IDs in related_items", () => {
    const pipes = [{ id: "p1", ai_excluded: true }];
    const blends = [{ id: "b1", ai_excluded: true }];
    const insights = generateCollectionHealthInsights(pipes, blends);
    const insight = insights.find((i) => i.id === "collection_health_excluded_items");
    expect(insight.related_items).toContain("p1");
    expect(insight.related_items).toContain("b1");
  });

  test("returns empty array when no items", () => {
    expect(generateCollectionHealthInsights([], [])).toEqual([]);
  });
});

// ─── generateProactiveInsights ────────────────────────────────────────────────

describe("generateProactiveInsights", () => {
  const longAgo = new Date(Date.now() - 50 * 86_400_000).toISOString();

  test("returns an array", () => {
    expect(Array.isArray(generateProactiveInsights({}))).toBe(true);
  });

  test("deduplicates insights by id", () => {
    const pipes = [{ id: "p1", ai_excluded: false }];
    const latestLogByPipe = { p1: longAgo };
    const results = generateProactiveInsights({ pipes, latestLogByPipe });
    const ids = results.map((i) => i.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  test("returns high severity insights before low severity", () => {
    const pipes = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      ai_excluded: false,
    }));
    // All underused — will generate high severity if >= 50% are underused
    const results = generateProactiveInsights({ pipes, latestLogByPipe: {} });
    if (results.length >= 2) {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 0; i < results.length - 1; i++) {
        expect(severityOrder[results[i].severity] ?? 3).toBeLessThanOrEqual(
          severityOrder[results[i + 1].severity] ?? 3
        );
      }
    }
  });

  test("handles empty input gracefully", () => {
    expect(() => generateProactiveInsights({})).not.toThrow();
    expect(generateProactiveInsights({})).toEqual([]);
  });

  test("each insight has all required fields", () => {
    const pipes = [{ id: "p1", ai_excluded: false }];
    const blends = [
      { id: "b1", blend_type: "aromatic", ai_excluded: false },
      { id: "b2", blend_type: "aromatic", ai_excluded: false },
      { id: "b3", blend_type: "aromatic", ai_excluded: false },
    ];
    const results = generateProactiveInsights({ pipes, blends });
    for (const insight of results) {
      expect(insight).toHaveProperty("id");
      expect(insight).toHaveProperty("title");
      expect(insight).toHaveProperty("summary");
      expect(insight).toHaveProperty("category");
      expect(insight).toHaveProperty("scope");
      expect(insight).toHaveProperty("severity");
      expect(insight).toHaveProperty("reason");
      expect(insight).toHaveProperty("suggested_action");
      expect(insight).toHaveProperty("related_items");
      expect(insight).toHaveProperty("is_dismissed");
      expect(insight).toHaveProperty("created_at");
      expect(insight).toHaveProperty("updated_at");
    }
  });
});

// ─── getCachedProactiveInsights / invalidateInsightCache ─────────────────────

describe("getCachedProactiveInsights", () => {
  beforeEach(() => {
    invalidateInsightCache();
  });

  test("returns an array", () => {
    expect(Array.isArray(getCachedProactiveInsights({}))).toBe(true);
  });

  test("returns same reference on second call (cache hit)", () => {
    const first = getCachedProactiveInsights({ _cacheKey: 42 });
    const second = getCachedProactiveInsights({ _cacheKey: 42 });
    expect(first).toBe(second);
  });

  test("regenerates when cache key changes", () => {
    const first = getCachedProactiveInsights({ _cacheKey: 1 });
    const second = getCachedProactiveInsights({ _cacheKey: 2 });
    // Different keys must produce different cache entries (not necessarily different results
    // for empty input, but the references should differ)
    expect(first).not.toBe(second);
  });

  test("invalidateInsightCache forces regeneration", () => {
    const first = getCachedProactiveInsights({ _cacheKey: 99 });
    invalidateInsightCache();
    const second = getCachedProactiveInsights({ _cacheKey: 99 });
    expect(first).not.toBe(second);
  });
});
