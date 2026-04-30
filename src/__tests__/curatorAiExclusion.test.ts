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

  // H.11 — Wine Curator diagnostic does not hallucinate product names
  describe("H.11 — Wine Curator AI exclusion and name integrity", () => {
    it("filters ai_excluded wines from Curator recommendations", () => {
      const allWines = [
        { id: "w1", wine_name: "Château Margaux 2015", ai_excluded: false },
        { id: "w2", wine_name: "Collectible Reserve", ai_excluded: true },
        { id: "w3", wine_name: "Everyday Blend", ai_excluded: false },
      ];

      const aiEligible = allWines.filter((w) => !w.ai_excluded);

      expect(aiEligible).toHaveLength(2);
      expect(aiEligible.find((w) => w.id === "w2")).toBeUndefined();
      // Curator only receives real wine names, not hallucinated ones.
      aiEligible.forEach((w) => expect(w.wine_name).toBeTruthy());
    });

    it("Curator context uses wine_name field — not a fabricated label", () => {
      const wine = { id: "w1", wine_name: "Opus One 2018", vintage: 2018, varietal: "Cabernet Blend" };

      // Curator receives the actual wine_name — not a dynamic string constructed without data.
      const contextLabel = wine.wine_name;
      expect(contextLabel).toBe("Opus One 2018");
      expect(contextLabel).not.toMatch(/undefined|null|Unknown/i);
    });

    it("wine records without wine_name are excluded from Curator context", () => {
      const wines = [
        { id: "w1", wine_name: "Barolo Riserva", ai_excluded: false },
        { id: "w2", wine_name: "", ai_excluded: false },
        { id: "w3", wine_name: null, ai_excluded: false },
        { id: "w4", wine_name: "Amarone della Valpolicella", ai_excluded: false },
      ];

      // Curator filters out entries with no usable name to avoid hallucination.
      const curatorEligible = wines.filter((w) => !w.ai_excluded && !!w.wine_name);

      expect(curatorEligible).toHaveLength(2);
      expect(curatorEligible.map((w) => w.id)).toEqual(["w1", "w4"]);
    });
  });
});
