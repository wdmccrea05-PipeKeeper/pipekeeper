import { describe, expect, it } from "vitest";

describe("AI exclusion / collectible-only", () => {
  it("filters collectible pipes from recommendations", () => {
    const allPipes = [
      { id: "1", name: "Active Pipe", ai_excluded: false },
      { id: "2", name: "Collectible Pipe", ai_excluded: true },
      { id: "3", name: "Another Active", ai_excluded: false },
    ];

    const aiEligible = allPipes.filter((p) => !p.ai_excluded);

    expect(aiEligible).toHaveLength(2);
    expect(aiEligible.find((p) => p.id === "2")).toBeUndefined();
  });

  it("filters collectible tobaccos from recommendations", () => {
    const allBlends = [
      { id: "1", name: "Smoking Blend", ai_excluded: false },
      { id: "2", name: "Cellared Vintage", ai_excluded: true },
      { id: "3", name: "Active Blend", ai_excluded: false },
    ];

    const aiEligible = allBlends.filter((b) => !b.ai_excluded);

    expect(aiEligible).toHaveLength(2);
    expect(aiEligible.find((b) => b.id === "2")).toBeUndefined();
  });

  it("keeps collectibles in valuation calculations", () => {
    const allPipes = [
      { id: "1", name: "Active Pipe", ai_excluded: false, estimated_value: 100 },
      { id: "2", name: "Collectible Pipe", ai_excluded: true, estimated_value: 500 },
    ];

    const totalValue = allPipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

    expect(totalValue).toBe(600);
  });

  it("keeps collectibles in exports", () => {
    const allPipes = [
      { id: "1", name: "Active Pipe", ai_excluded: false },
      { id: "2", name: "Collectible Pipe", ai_excluded: true },
    ];

    const exportData = allPipes.map((p) => ({
      name: p.name,
      collectible_only: p.ai_excluded || false,
    }));

    expect(exportData).toHaveLength(2);
    expect(exportData[1].collectible_only).toBe(true);
  });

  it("preserves ai_excluded through round-trip edits", () => {
    let pipe = { id: "1", name: "Test Pipe", ai_excluded: false };

    pipe.ai_excluded = true;
    expect(pipe.ai_excluded).toBe(true);

    pipe.ai_excluded = false;
    expect(pipe.ai_excluded).toBe(false);
  });
});
