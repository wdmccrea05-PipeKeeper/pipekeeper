import { describe, expect, it } from "vitest";
import normalizeCuratorActionResult from "../normalizeCuratorActionResult";

describe("normalizeCuratorActionResult", () => {
  it("filters incomplete items", () => {
    const result = normalizeCuratorActionResult(
      {
        items: [
          { title: "ok", type: "specialization", recordId: "p1" },
          { title: "bad" },
        ],
      },
      "optimize_collection"
    );

    expect(result.items).toHaveLength(1);
  });
});
