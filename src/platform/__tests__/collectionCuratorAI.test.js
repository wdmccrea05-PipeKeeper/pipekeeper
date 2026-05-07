/**
 * Unit tests for platform/collectionCuratorAI.js
 *
 * Covers:
 *   - buildStructuredResult
 *   - buildAIContext (AI exclusion, module adapter normalization)
 *   - buildModuleAwarePromptPreamble
 *   - getActiveOptimizeScopes
 *   - getActiveIdentifyTypes
 *   - buildInsightSummary
 */

import { describe, test, expect } from "vitest";

import {
  buildStructuredResult,
  buildAIContext,
  buildModuleAwarePromptPreamble,
  getActiveOptimizeScopes,
  getActiveIdentifyTypes,
  buildInsightSummary,
  OPTIMIZE_SCOPES,
  IDENTIFY_ITEM_TYPES,
  AI_INSIGHT_TYPES,
} from "../collectionCuratorAI.js";

import { MODULE_TYPES, ACTIVE_MODULES } from "../moduleTypes.js";

// ─── buildStructuredResult ───────────────────────────────────────────────────

describe("buildStructuredResult", () => {
  test("returns all fields when all params are provided", () => {
    const result = buildStructuredResult({
      recommendation: "Use your Billiard pipe",
      reason: "The chamber size complements this blend",
      confidence: 0.9,
      suggestedAction: "Pair with your Dunhill Early Morning Pipe",
      data: { pipeId: "p1" },
    });
    expect(result.recommendation).toBe("Use your Billiard pipe");
    expect(result.reason).toBe("The chamber size complements this blend");
    expect(result.confidence).toBe(0.9);
    expect(result.suggestedAction).toBe("Pair with your Dunhill Early Morning Pipe");
    expect(result.data).toEqual({ pipeId: "p1" });
  });

  test("defaults recommendation and reason to empty strings", () => {
    const result = buildStructuredResult({});
    expect(result.recommendation).toBe("");
    expect(result.reason).toBe("");
  });

  test("defaults confidence to null when not provided", () => {
    expect(buildStructuredResult({}).confidence).toBeNull();
  });

  test("clamps confidence between 0 and 1", () => {
    expect(buildStructuredResult({ confidence: 1.5 }).confidence).toBe(1);
    expect(buildStructuredResult({ confidence: -0.2 }).confidence).toBe(0);
  });

  test("defaults suggestedAction to null", () => {
    expect(buildStructuredResult({}).suggestedAction).toBeNull();
  });

  test("defaults data to null", () => {
    expect(buildStructuredResult({}).data).toBeNull();
  });
});

// ─── buildAIContext ──────────────────────────────────────────────────────────

describe("buildAIContext — AI exclusion enforcement", () => {
  const pipes = [
    { id: "p1", name: "Billiard", ai_excluded: false },
    { id: "p2", name: "Collector Piece", ai_excluded: true },
  ];
  const blends = [
    { id: "b1", name: "Dunhill Early Morning Pipe", ai_excluded: false },
    { id: "b2", name: "Rare Tin", ai_excluded: true },
  ];

  test("excludes ai_excluded pipes from AI context", () => {
    const ctx = buildAIContext({ pipes, blends });
    const pipesInContext = ctx.itemsByModule[MODULE_TYPES.PIPE];
    expect(pipesInContext).toHaveLength(1);
    expect(pipesInContext[0].id).toBe("p1");
  });

  test("excludes ai_excluded blends from AI context", () => {
    const ctx = buildAIContext({ pipes, blends });
    const blendsInContext = ctx.itemsByModule[MODULE_TYPES.TOBACCO];
    expect(blendsInContext).toHaveLength(1);
    expect(blendsInContext[0].id).toBe("b1");
  });

  test("reports correct eligibleItemCount", () => {
    const ctx = buildAIContext({ pipes, blends });
    expect(ctx.eligibleItemCount).toBe(2);
  });

  test("reports correct totalItemCount including excluded items", () => {
    const ctx = buildAIContext({ pipes, blends });
    expect(ctx.totalItemCount).toBe(4);
  });

  test("reports correct excludedItemCount", () => {
    const ctx = buildAIContext({ pipes, blends });
    expect(ctx.excludedItemCount).toBe(2);
  });
});

describe("buildAIContext — module structure", () => {
  test("activeModules contains pipe and tobacco", () => {
    const ctx = buildAIContext({});
    expect(ctx.activeModules).toContain(MODULE_TYPES.PIPE);
    expect(ctx.activeModules).toContain(MODULE_TYPES.TOBACCO);
  });

  test("returns empty arrays for empty inputs", () => {
    const ctx = buildAIContext({});
    expect(ctx.itemsByModule[MODULE_TYPES.PIPE]).toHaveLength(0);
    expect(ctx.itemsByModule[MODULE_TYPES.TOBACCO]).toHaveLength(0);
  });

  test("normalizes pipes via pipe adapter", () => {
    const ctx = buildAIContext({ pipes: [{ id: "p1", name: "Test Pipe", is_favorite: true }] });
    const normalized = ctx.itemsByModule[MODULE_TYPES.PIPE][0];
    expect(normalized.module_type).toBe(MODULE_TYPES.PIPE);
    expect(normalized.favorite).toBe(true);
  });

  test("normalizes blends via tobacco adapter", () => {
    const ctx = buildAIContext({ blends: [{ id: "b1", name: "Test Blend" }] });
    const normalized = ctx.itemsByModule[MODULE_TYPES.TOBACCO][0];
    expect(normalized.module_type).toBe(MODULE_TYPES.TOBACCO);
  });

  test("normalizes blend estimated_value from canonical quantity-based valuation chain", () => {
    const ctx = buildAIContext({
      blends: [{
        id: "b1",
        name: "Test Blend",
        quantity: 2,
        cellar_quantity: 1,
        estimated_unit_value: 12,
      }],
    });
    const normalized = ctx.itemsByModule[MODULE_TYPES.TOBACCO][0];
    expect(normalized.estimated_value).toBe(36);
  });

  test("builds usage profiles for pipes", () => {
    const ctx = buildAIContext({
      pipes: [{ id: "p1", name: "Billiard", shape: "billiard", chamber_volume: "medium" }],
    });
    const profile = ctx.usageProfilesByModule[MODULE_TYPES.PIPE][0];
    expect(profile.id).toBe("p1");
    expect(profile.shape).toBe("billiard");
    expect(profile.chamber_volume).toBe("medium");
  });
});

// ─── buildModuleAwarePromptPreamble ──────────────────────────────────────────

describe("buildModuleAwarePromptPreamble", () => {
  test("mentions Collection Curator AI", () => {
    const ctx = buildAIContext({ pipes: [{ id: "p1" }], blends: [{ id: "b1" }] });
    const preamble = buildModuleAwarePromptPreamble(ctx);
    expect(preamble).toContain("Collection Curator AI");
  });

  test("mentions active module names", () => {
    const ctx = buildAIContext({ pipes: [{ id: "p1" }] });
    const preamble = buildModuleAwarePromptPreamble(ctx);
    expect(preamble.toLowerCase()).toContain("pipe");
    expect(preamble.toLowerCase()).toContain("tobacco");
  });

  test("mentions excluded item count when exclusions exist", () => {
    const ctx = buildAIContext({
      pipes: [{ id: "p1", ai_excluded: true }],
    });
    const preamble = buildModuleAwarePromptPreamble(ctx);
    expect(preamble).toContain("AI Exclusion");
    expect(preamble).toContain("1");
  });

  test("does not mention exclusion when no items are excluded", () => {
    const ctx = buildAIContext({ pipes: [{ id: "p1", ai_excluded: false }] });
    const preamble = buildModuleAwarePromptPreamble(ctx);
    expect(preamble).not.toContain("AI Exclusion");
  });

  test("includes structured output instructions", () => {
    const preamble = buildModuleAwarePromptPreamble(buildAIContext({}));
    expect(preamble).toContain("Recommendation");
    expect(preamble).toContain("Reason");
    expect(preamble).toContain("Suggested Action");
  });
});

// ─── getActiveOptimizeScopes ─────────────────────────────────────────────────

describe("getActiveOptimizeScopes", () => {
  test("returns at least one scope", () => {
    const scopes = getActiveOptimizeScopes();
    expect(scopes.length).toBeGreaterThan(0);
  });

  test("all returned scopes have only active modules", () => {
    const scopes = getActiveOptimizeScopes();
    for (const scope of scopes) {
      for (const m of scope.modules) {
        expect(ACTIVE_MODULES).toContain(m);
      }
    }
  });

  test("includes pipe rotation scope", () => {
    const scopes = getActiveOptimizeScopes();
    expect(scopes.some((s) => s.id === "pipe_rotation")).toBe(true);
  });

  test("includes tobacco usage scope", () => {
    const scopes = getActiveOptimizeScopes();
    expect(scopes.some((s) => s.id === "tobacco_usage")).toBe(true);
  });

  test("includes pipe + tobacco pairings scope", () => {
    const scopes = getActiveOptimizeScopes();
    expect(scopes.some((s) => s.id === "pipe_tobacco_pairings")).toBe(true);
  });
});

// ─── getActiveIdentifyTypes ──────────────────────────────────────────────────

describe("getActiveIdentifyTypes", () => {
  test("returns only active item types", () => {
    const types = getActiveIdentifyTypes();
    for (const t of types) {
      expect(t.active).toBe(true);
    }
  });

  test("includes pipe identify type", () => {
    const types = getActiveIdentifyTypes();
    expect(types.some((t) => t.id === "pipe")).toBe(true);
  });

  test("includes tobacco tin identify type", () => {
    const types = getActiveIdentifyTypes();
    expect(types.some((t) => t.id === "tobacco_tin")).toBe(true);
  });

  test("does not include inactive future types", () => {
    const types = getActiveIdentifyTypes();
    expect(types.some((t) => t.id === "whiskey_bottle")).toBe(false);
    expect(types.some((t) => t.id === "cigar_band")).toBe(true);
  });
});

// ─── buildInsightSummary ─────────────────────────────────────────────────────

describe("buildInsightSummary", () => {
  test("returns structured insight for pairing refresh", () => {
    const insight = buildInsightSummary(AI_INSIGHT_TYPES.PAIRING_REFRESH);
    expect(insight.type).toBe(AI_INSIGHT_TYPES.PAIRING_REFRESH);
    expect(insight.label).toContain("Pairing matrix refreshed");
    expect(insight.details).toBeNull();
  });

  test("returns structured insight for optimization recalculation", () => {
    const insight = buildInsightSummary(AI_INSIGHT_TYPES.OPTIMIZATION_RECALC);
    expect(insight.label).toContain("optimization recalculated");
  });

  test("includes details when provided", () => {
    const details = { pipeCount: 5, blendCount: 12 };
    const insight = buildInsightSummary(AI_INSIGHT_TYPES.ROTATION_UPDATE, details);
    expect(insight.details).toEqual(details);
  });

  test("handles unknown insight type gracefully", () => {
    const insight = buildInsightSummary("unknown_type");
    expect(insight.type).toBe("unknown_type");
    expect(insight.label).toBe("unknown_type");
  });
});
