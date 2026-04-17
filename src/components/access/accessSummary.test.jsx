import { describe, expect, it } from "vitest";
import { buildAccessSummary } from "@/components/access/accessSummary";

describe("accessSummary internal module filtering", () => {
  it("includes CigarKeeper for explicitly granted non-admin testers", () => {
    const user = {
      role: "user",
      entitlement_tier: "pro",
      paid_modules_csv: "cigarkeeper",
      cigarkeeper_paid: true,
    };

    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(["cigarkeeper"]);
  });

  it("does not include CigarKeeper for ungranted regular users", () => {
    const user = {
      role: "user",
      entitlement_tier: "pro",
      paid_modules_csv: "pipekeeper",
      pipekeeper_paid: true,
    };

    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(["pipekeeper"]);
  });

  it("keeps WineKeeper filtered out for public users even if listed in paid_modules_csv", () => {
    const user = {
      role: "user",
      entitlement_tier: "pro",
      paid_modules_csv: "pipekeeper,winekeeper",
      pipekeeper_paid: true,
      winekeeper_paid: true,
    };

    const summary = buildAccessSummary(user, null);
    expect(summary.activeModules).toEqual(["pipekeeper"]);
  });
});
