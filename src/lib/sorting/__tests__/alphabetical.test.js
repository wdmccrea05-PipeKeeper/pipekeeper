import { describe, expect, it } from "vitest";
import { compareAlpha, sortByLabel, uniqueSortedStrings } from "@/lib/sorting/alphabetical";

describe("alphabetical helpers", () => {
  it("sorts labels case-insensitively with stable ordering", () => {
    const rows = [
      { id: 1, name: "beta" },
      { id: 2, name: "Alpha" },
      { id: 3, name: "alpha" },
    ];
    const sorted = sortByLabel(rows, (row) => row.name);
    expect(sorted.map((row) => row.id)).toEqual([2, 3, 1]);
  });

  it("deduplicates equivalent labels and sorts", () => {
    expect(uniqueSortedStrings(["USA", "united states", "usa", "Canada"])).toEqual([
      "Canada",
      "USA",
      "united states",
    ]);
  });

  it("compares strings safely for nullish values", () => {
    expect(compareAlpha(null, "a")).toBeLessThan(0);
  });
});

