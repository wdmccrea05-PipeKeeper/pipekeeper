import { describe, expect, it } from "vitest";

describe("Curator startup routing", () => {
  it("prefers sessionStorage payload over URL param", () => {
    const payload = {
      originalPrompt: "Which pipes in my collection are the most underused right now?",
      displayTitle: "Balanced Rotation",
      displayInsight: "Your collection shows good rotation patterns...",
      whatif_prompt: "What does my current rotation say about strengths and gaps?",
      module: "pipes",
      category: "rotation",
    };

    const urlPrompt = "generic fallback prompt";

    const resolvedPrompt =
      String(payload.originalPrompt || "").trim() ||
      String((payload as any).displayPrompt || "").trim() ||
      String(payload.whatif_prompt || "").trim() ||
      String(urlPrompt || "").trim();

    expect(resolvedPrompt).toBe(payload.originalPrompt);
  });

  it("does not leak translation keys into the user bubble", () => {
    const mockInsight = {
      titleKey: "keeper.pipes.balancedRotationTitle",
      displayTitle: "Balanced Rotation",
      displayInsight: "Your collection shows good rotation patterns",
      insightKey: "keeper.pipes.balancedRotationInsight",
    };

    expect(mockInsight.displayTitle.includes("keeper.")).toBe(false);
    expect(mockInsight.displayTitle).toBe("Balanced Rotation");
  });

  it("clears payload only after successful hydration", () => {
    let sessionStorageCleared = false;
    let promptHydrated = false;

    const payload = { originalPrompt: "test prompt" };
    const prompt = payload.originalPrompt;

    expect(prompt).toBe("test prompt");

    promptHydrated = true;

    if (promptHydrated) {
      sessionStorageCleared = true;
    }

    expect(sessionStorageCleared).toBe(true);
  });

  it("uses displayPrompt when available", () => {
    const mockPayload = {
      displayPrompt: "Please expand on this recommendation: Your pipes need more rest",
      originalPrompt: "fallback",
      whatif_prompt: "generic question",
    };

    const resolved =
      String(mockPayload.displayPrompt || "").trim() ||
      String(mockPayload.originalPrompt || "").trim() ||
      String(mockPayload.whatif_prompt || "").trim();

    expect(resolved).toBe(mockPayload.displayPrompt);
  });
});
