import { describe, expect, it, vi } from "vitest";
import { runCuratorAction } from "../curatorActionService";

describe("runCuratorAction", () => {
  it("returns success for normalized items", async () => {
    const result = await runCuratorAction({
      actionType: "optimize_collection",
      executor: vi.fn().mockResolvedValue({ items: [{ id: "1", title: "A", type: "specialization", recordId: "p1" }] }),
      normalizer: (raw, actionType) => ({
        actionType,
        summary: "1 recommendation found",
        items: [{ id: "1", title: "A", type: "specialization", recordId: "p1" }],
      }),
    });

    expect(result.status).toBe("success");
    expect(result.items).toHaveLength(1);
  });

  it("returns empty when no items are produced", async () => {
    const result = await runCuratorAction({
      actionType: "optimize_collection",
      executor: vi.fn().mockResolvedValue({ items: [] }),
      normalizer: () => ({ summary: "No items", items: [] }),
    });

    expect(result.status).toBe("empty");
  });

  it("returns error when normalizer output is invalid", async () => {
    const result = await runCuratorAction({
      actionType: "optimize_collection",
      executor: vi.fn().mockResolvedValue({}),
      normalizer: () => null,
    });

    expect(result.status).toBe("error");
  });
});
