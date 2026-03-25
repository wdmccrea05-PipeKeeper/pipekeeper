import { describe, expect, it, vi } from "vitest";
import * as PipeEntity from "@/entities/Pipe";
import * as BlendEntity from "@/entities/Blend";
import { applyCuratorRecommendation } from "../curatorApplyHandlers";

vi.mock("@/entities/Pipe", () => ({
  Pipe: { update: vi.fn().mockResolvedValue({ ok: true }) },
}));

vi.mock("@/entities/Blend", () => ({
  Blend: { update: vi.fn().mockResolvedValue({ ok: true }) },
}));

describe("applyCuratorRecommendation", () => {
  it("applies pipe specialization update", async () => {
    const item = {
      type: "specialization",
      recordType: "pipe",
      recordId: "pipe-1",
      proposedChanges: { specialization: "Outdoor Rotation" },
    };

    await applyCuratorRecommendation(item);
    expect(PipeEntity.Pipe.update).toHaveBeenCalledWith("pipe-1", {
      specialization: "Outdoor Rotation",
    });
  });

  it("applies blend reclassification", async () => {
    const item = {
      type: "reclassification",
      recordType: "blend",
      recordId: "blend-1",
      proposedChanges: { blend_type: "Virginia" },
    };

    await applyCuratorRecommendation(item);
    expect(BlendEntity.Blend.update).toHaveBeenCalledWith("blend-1", {
      blend_type: "Virginia",
    });
  });

  it("throws on empty proposed changes", async () => {
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
