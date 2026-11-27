/* eslint-disable */
/**
 * Shared module homepage consistency — permanent regression requirement.
 *
 * PipeKeeper, CigarKeeper, WhiskeyKeeper and WineKeeper must stay one cohesive
 * application: same page hierarchy, same shared components, analytics behind
 * progressive disclosure, metrics that drill into records, and no restocking or
 * consumption-encouraging messaging on a module homepage.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

const MODULES = [
  { name: "PipeKeeper", page: "src/components/modules/PipeKeeperModule.jsx" },
  { name: "CigarKeeper", page: "src/pages/CigarKeeper.jsx" },
  { name: "WhiskeyKeeper", page: "src/pages/WhiskeyKeeper.jsx" },
  { name: "WineKeeper", page: "src/pages/WineKeeper.jsx" },
];

describe("shared module homepage architecture", () => {
  it("every module homepage renders through the shared shell components", () => {
    MODULES.forEach(({ page }) => {
      const source = read(page);
      expect(source).toContain("ModulePageShell");
      expect(source).toContain("ModuleQuickLaunch");
      expect(source).toContain("ModuleHighlightsSection");
    });
  });

  it("every module homepage supplies collection highlights as a shell slot", () => {
    MODULES.forEach(({ page }) => {
      expect(read(page)).toContain("highlights={<ModuleHighlightsSection");
    });
  });

  it("the shell renders the hierarchy in one fixed order", () => {
    const shell = read("src/components/modules/ModulePageShell.jsx");
    const order = [
      "{/* 1 —",
      "{/* 2 —",
      "{/* 3 —",
      "{/* 4 —",
      "{/* 5 —",
      "{/* 6 —",
      "{/* 7 —",
      "{/* 8 —",
    ];
    const positions = order.map((token) => shell.indexOf(token));
    positions.forEach((position, index) => {
      expect(position, `missing ${order[index]}`).toBeGreaterThan(-1);
      if (index > 0) expect(position).toBeGreaterThan(positions[index - 1]);
    });
  });

  it("analytics are collapsed behind progressive disclosure", () => {
    const disclosure = read("src/components/modules/ModuleAnalyticsSection.jsx");
    expect(disclosure).toContain("defaultOpen = false");
    expect(read("src/pages/CigarKeeper.jsx")).toContain("ModuleAnalyticsSection");
  });

  it("cigar summary metrics drill into their own records", () => {
    const source = read("src/pages/CigarKeeper.jsx");
    expect(source).toContain("buildDrilldownQuery");
    expect(source).toContain("tab: 'collection'");
    expect(source).toContain("tab: 'humidors'");
    expect(source).not.toContain("/ReportingCenter");
  });

  it("no module homepage carries restocking or consumption-encouraging messaging", () => {
    MODULES.forEach(({ page }) => {
      const source = read(page).toLowerCase();
      expect(source).not.toContain("runninglow");
      expect(source).not.toContain("restock");
      expect(source).not.toContain("reorder");
    });
  });

  it("administrator surfaces sit in a permission-controlled Administration menu", () => {
    const nav = read("src/components/modules/ModuleNav.jsx");
    expect(nav).toContain("AdministrationMenu");
    expect(nav).toContain("isAdmin");
    expect(nav).toContain("DropdownMenu");
    expect(nav).toContain("AdminDiagnostics");
  });

  it("module homepages no longer duplicate the Hub navigation", () => {
    MODULES.forEach(({ page }) => {
      expect(read(page)).not.toContain("onBackToHub");
    });
  });

  it("module accent colours stay module-specific", () => {
    expect(read("src/components/modules/PipeKeeperModule.jsx")).toContain('accentColor="#C89752"');
    expect(read("src/pages/CigarKeeper.jsx")).toContain('accentColor="#8C6B3F"');
    expect(read("src/pages/WhiskeyKeeper.jsx")).toContain('accentColor="#B66565"');
    expect(read("src/pages/WineKeeper.jsx")).toContain('accentColor="#8B3A3A"');
  });
});