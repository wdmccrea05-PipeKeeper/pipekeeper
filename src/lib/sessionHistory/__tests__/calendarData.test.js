import { describe, expect, it } from "vitest";
import { buildSessionCalendarData } from "@/lib/sessionHistory/calendarData";

describe("buildSessionCalendarData", () => {
  const rows = [
    { id: "p1", moduleType: "pipe", date: "2026-04-20", itemLabel: "Pipe A" },
    { id: "w1", moduleType: "whiskey", date: "2026-04-20", itemLabel: "Bottle A" },
    { id: "c1", moduleType: "cigar", date: "2026-04-21", itemLabel: "Cigar A" },
  ];

  it("groups sessions by date and returns highlighted days", () => {
    const result = buildSessionCalendarData(rows, "all");
    expect(Object.keys(result.byDate)).toEqual(["2026-04-20", "2026-04-21"]);
    expect(result.byDate["2026-04-20"]).toHaveLength(2);
    expect(result.highlightedDates).toHaveLength(2);
  });

  it("filters by module", () => {
    const result = buildSessionCalendarData(rows, "pipe");
    expect(result.filtered).toHaveLength(1);
    expect(Object.keys(result.byDate)).toEqual(["2026-04-20"]);
  });
});

