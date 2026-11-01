import { describe, expect, it, vi, beforeEach } from "vitest";
import { base44 } from "@/api/base44Client";
import curatorActionExecutor from "../curatorActionExecutor.jsx";

vi.mock("@/api/base44Client", () => ({
  base44: {
    integrations: {
      Core: {
        InvokeLLM: vi.fn(),
      },
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("../collectionContextBudget", () => ({
  buildSafeCollectionContext: vi.fn(() => ({ ok: true })),
  buildPromptBlock: vi.fn(() => "COMPRESSED_CONTEXT"),
}));

describe("curatorActionExecutor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fall back to a direct LLM call when the server function fails", async () => {
    base44.functions.invoke.mockRejectedValueOnce(new Error("no function"));
    base44.integrations.Core.InvokeLLM.mockResolvedValueOnce("fallback response");

    await expect(curatorActionExecutor({
      actionType: "recommend_specializations",
      context: { pipes: [], blends: [], bottles: [] },
      requestId: "req_1",
    })).rejects.toThrow("Curator LLM call failed: no function");
    expect(base44.functions.invoke).toHaveBeenCalledWith(
      "invokeCuratorLLM",
      expect.objectContaining({ actionType: "recommend_specializations", requestId: "req_1" })
    );
    expect(base44.integrations.Core.InvokeLLM).not.toHaveBeenCalled();
  });

  it("prefers invokeCuratorLLM function when available", async () => {
    base44.functions.invoke.mockResolvedValueOnce({
      result: JSON.stringify({
        summary: "1 bottle recommendation",
        items: [
          {
            id: "rec_2",
            type: "metadata_update",
            title: "Add Retail Price",
            explanation: "Useful for valuation",
            rationale: "Missing market data",
            confidence: 0.8,
            recordType: "bottle",
            recordId: "bottle_1",
            recordName: "Bottle A",
            proposedChanges: { retail_price: 59.99 },
            followUpPrompt: "Why this price?",
          },
        ],
      }),
    });

    const result = await curatorActionExecutor({
      actionType: "update_bottle_data",
      context: { pipes: [], blends: [], bottles: [{ id: "bottle_1" }] },
      requestId: "req_2",
    });

    expect(base44.functions.invoke).toHaveBeenCalled();
    expect(result.items[0].recordType).toBe("bottle");
  });

  it("throws when no response is returned", async () => {
    base44.functions.invoke.mockResolvedValueOnce("");

    await expect(
      curatorActionExecutor({
        actionType: "recommend_specializations",
        context: { pipes: [], blends: [], bottles: [] },
        requestId: "req_3",
      })
    ).rejects.toThrow("Curator returned no response.");
    expect(base44.integrations.Core.InvokeLLM).not.toHaveBeenCalled();
  });
});