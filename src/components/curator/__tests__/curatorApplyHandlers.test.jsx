import { describe, expect, it, vi, beforeEach } from "vitest";
import { base44 } from "@/api/base44Client";
import { applyCuratorRecommendation } from "../curatorApplyHandlers.js";

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Pipe: { update: vi.fn().mockResolvedValue({ ok: true }) },
      TobaccoBlend: { update: vi.fn().mockResolvedValue({ ok: true }) },
      Bottle: { update: vi.fn().mockResolvedValue({ ok: true }) },
    },
  },
}));

describe("applyCuratorRecommendation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies pipe specialization update", async () => {
    const item = {
      type: "specialization",
      recordType: "pipe",
      recordId: "pipe-1",
      proposedChanges: { specialization: "Outdoor Rotation" },
    };

    await applyCuratorRecommendation(item);

    expect(base44.entities.Pipe.update).toHaveBeenCalledWith("pipe-1", {
      specialization: "Outdoor Rotation",
    });
  });

  it("applies blend reclassification update", async () => {
    const item = {
      type: "reclassification",
      recordType: "blend",
      recordId: "blend-1",
      proposedChanges: { blend_type: "Virginia" },
    };

    await applyCuratorRecommendation(item);

    expect(base44.entities.TobaccoBlend.update).toHaveBeenCalledWith("blend-1", {
      blend_type: "Virginia",
    });
  });

  it("applies bottle metadata update", async () => {
    const item = {
      type: "metadata_update",
      recordType: "bottle",
      recordId: "bottle-1",
      proposedChanges: { retail_price: 69.99 },
    };

    await applyCuratorRecommendation(item);

    expect(base44.entities.Bottle.update).toHaveBeenCalledWith("bottle-1", {
      retail_price: 69.99,
    });
  });

  it("allows non-mutating session builder items", async () => {
    const item = {
      type: "session_builder",
      recordType: "pipe",
      recordId: "pipe-1",
      proposedChanges: {},
    };

    await expect(applyCuratorRecommendation(item)).resolves.toEqual({ ok: true });
  });

  it("throws on empty proposed changes for mutating items", async () => {
    const item = {
      type: "specialization",
      recordType: "pipe",
      recordId: "pipe-1",
      proposedChanges: {},
    };

    await expect(applyCuratorRecommendation(item)).rejects.toThrow(
      "Recommendation has no fields to apply."
    );
  });
});