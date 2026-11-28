/* eslint-disable */
import { describe, it, expect } from "vitest";
import {
  REPORTS,
  REPORT_GROUPS,
  buildReportContext,
  runReport,
  getReport,
  resolveReportAccess,
} from "@/lib/reports/reportCatalog";
import { buildReportItems, filterItems, DEFAULT_FILTERS, buildFilterOptions } from "@/lib/reports/reportModel";
import { buildReportCsv, createReportPdf } from "@/lib/reports/reportExport";
import { detectReportingRequest, explainReport, listReportsForModule } from "@/lib/curator/curatorReporting";
import fs from "fs";
import path from "path";

const fixtures = {
  pipes: [
    { id: "pipe1", name: "Billiard One", maker: "Savinelli", shape: "Billiard", bend: "Straight", purchase_date: "2026-03-01", purchase_price: 120, estimated_value: 150, condition: "Excellent", focus: ["Virginia"], tags: ["briar"], photos: ["p"], documents: [{ name: "receipt" }], notes: "Good draw", storage_location_id: "loc1", created_date: "2026-03-01T10:00:00Z" },
    { id: "pipe2", name: "Dublin Two", maker: "Peterson", shape: "Dublin", purchase_date: "2025-02-01", purchase_price: 90, condition: "Good", focus: [], tags: [], created_date: "2025-02-01T10:00:00Z" },
  ],
  blends: [
    { id: "blend1", name: "Full Virginia Flake", manufacturer: "Samuel Gawith", blend_type: "Virginia", tin_size_oz: 2, tin_total_tins: 5, rating: 4, flavor_notes: ["Virginia", "Citrus"], cellar_start_date: "2024-01-15", cost_basis: 60, manual_market_value: 90, aging_potential: "Excellent", production_status: "Current Production", tags: ["flake"], photos: ["p"], documents: [{ name: "label" }], notes: "Cellar staple", storage_location_id: "loc1", purchase_date: "2024-01-15", purchase_source: "Shop", provenance_notes: "Bought new", created_date: "2024-01-15T10:00:00Z" },
    { id: "blend2", name: "Nightcap", manufacturer: "Dunhill", blend_type: "English", bulk_total_quantity_oz: 4, rating: 5, flavor_notes: ["Latakia"], cellar_start_date: "2023-06-01", cost_basis: 40, tags: [], created_date: "2023-06-01T10:00:00Z" },
  ],
  bottles: [
    { id: "bottle1", name: "Lagavulin 16", distillery: "Lagavulin", type: "Single Malt", region: "Islay", bottle_count: 2, purchase_price: 80, collector_value: 120, rating: 4.5, purchase_date: "2025-06-01", storage_location_id: "loc2", condition: "Excellent", flavor_notes: "smoke,peat", tags: ["peated"], photos: ["p"], documents: [{ name: "receipt" }], notes: "Peat", purchase_source: "Distillery", provenance_notes: "Direct", created_date: "2025-06-01T10:00:00Z" },
    { id: "bottle2", name: "Old Bottle", distillery: "Unknown", type: "Blended Whiskey", bottle_count: 1, purchase_price: 30, purchase_date: "2019-01-01", condition: "Fair", created_date: "2019-01-01T10:00:00Z" },
  ],
  cigars: [
    { id: "cigar1", name: "Serie V", brand: "Oliva", vitola: "Robusto", singles_equivalent: 20, purchase_price: 200, estimated_value: 240, rating: 4, humidor_id: "hum1", aging_start_date: "2025-01-01", condition: "Excellent", tags: ["maduro"], flavor_notes: ["cocoa"], photos: ["p"], documents: [{ name: "receipt" }], notes: "Box", purchase_date: "2025-01-01", purchase_source: "Shop", provenance_notes: "Sealed box", created_date: "2025-01-01T10:00:00Z" },
    { id: "cigar2", name: "Connecticut", brand: "Macanudo", vitola: "Toro", singles_equivalent: 5, purchase_price: 40, rating: 3, humidor_id: "hum1", condition: "Good", created_date: "2025-09-01T10:00:00Z" },
  ],
  wines: [
    { id: "wine1", name: "Barolo Riserva", producer: "Gaja", style: "red", varietal: "Nebbiolo", region: "Piedmont", vintage: 2018, quantity: 3, purchase_price: 40, estimated_value: 60, drink_window_end: "2027-01-01", condition: "intact", storage_location_id: "loc2", tags: ["italian"], photos: ["p"], documents: [{ name: "receipt" }], notes: "Cellar", purchase_date: "2021-05-01", purchase_source: "Importer", provenance_notes: "Original case", created_date: "2021-05-01T10:00:00Z" },
    { id: "wine2", name: "Chablis", producer: "Dauvissat", style: "white", quantity: 1, purchase_price: 25, vintage: 2020, drink_window_end: "2024-01-01", created_date: "2022-01-01T10:00:00Z" },
  ],
  wineTastings: [{ id: "wt1", wine_id: "wine1", wine_name: "Barolo Riserva", date: "2026-04-01", rating: 5 }],
  smokingLogs: [{ id: "sl1", pipe_id: "pipe1", pipe_name: "Billiard One", blend_id: "blend1", blend_name: "Full Virginia Flake", date: "2026-05-01" }],
  tastingLogs: [{ id: "tl1", bottle_id: "bottle1", bottle_name: "Lagavulin 16", tasting_date: "2026-04-01", rating: 4 }],
  cigarSessions: [{ id: "cs1", cigar_id: "cigar1", cigar_name: "Serie V", date: "2026-02-01", rating: 4 }],
  locations: [
    { id: "loc1", name: "Pipe cabinet", capacity_count: 20 },
    { id: "loc2", name: "Cellar", capacity_count: 50 },
  ],
  humidors: [{ id: "hum1", name: "Desktop humidor", capacity_count: 100, min_humidity_rh: 62, max_humidity_rh: 72, min_temp_f: 60, max_temp_f: 75 }],
  humidorReadings: [{ id: "hr1", humidor_id: "hum1", humidity_rh: 68, temperature_f: 68, recorded_at: "2026-10-01" }],
  valuations: [
    { id: "v1", record_entity: "Pipe", record_id: "pipe1", record_name: "Billiard One", kind: "user_estimate", amount: 200, amount_base: 200, currency: "USD", valuation_date: "2026-06-01", confidence: "medium", source_type: "manual" },
    { id: "v2", record_entity: "Pipe", record_id: "pipe1", record_name: "Billiard One", kind: "appraisal", amount: 250, amount_base: 250, currency: "USD", valuation_date: "2026-07-01", confidence: "high", source_type: "appraiser", methodology: "Comparable sales" },
  ],
  cigarRatings: [{ id: "cr1", cigar_id: "cigar1", rated_at: "2026-02-02", construction: 4, draw: 5, burn: 4, aroma: 4, flavor: 5, overall: 4 }],
  bottleFills: [{ id: "bf1", bottle_id: "bottle1", fill_percent: 20, recorded_at: "2026-09-01" }],
  wineInspections: [{ id: "wi1", wine_id: "wine1", inspected_at: "2026-08-01", seal_condition: "intact", label_condition: "intact" }],
  pipeMaintenance: [{ id: "pm1", pipe_id: "pipe1", maintenance_type: "cleaning", date: "2026-07-01" }],
  humidorMaintenance: [{ id: "hm1", humidor_id: "hum1", event_type: "recharge", date: "2026-07-01" }],
  cellarLogs: [{ id: "cl1", blend_id: "blend1", transaction_type: "add", date: "2024-01-15", amount_oz: 10 }],
  collectionActivity: [{ id: "ca1", record_entity: "Pipe", record_id: "pipe1", event_type: "created", occurred_at: "2026-03-01" }],
};

function contextFor(overrides = {}) {
  return buildReportContext({
    data: fixtures,
    filters: { ...DEFAULT_FILTERS, year: "2026", curatorQuestion: "How well documented is my collection and where is it stored?" },
    currency: "USD",
    ...overrides,
  });
}

describe("report catalogue", () => {
  it("defines all twenty reports in a stable order", () => {
    expect(REPORTS).toHaveLength(20);
    expect(REPORTS.map((report) => report.order)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(new Set(REPORTS.map((report) => report.id)).size).toBe(20);
  });

  it("covers every requested report", () => {
    const expected = [
      "overview", "composition", "characteristics", "specialization", "pairing",
      "preferences", "discovery", "overlooked", "documentation", "health",
      "aging", "storage", "makers", "ratings", "acquisition", "insurance",
      "annual", "cross-collection", "valuation-history", "custom-curator",
    ];
    expected.forEach((id) => expect(getReport(id).id).toBe(id));
  });

  it("groups reports into named sections", () => {
    REPORTS.forEach((report) => expect(REPORT_GROUPS).toContain(report.group));
  });

  it("runs every report on real-shaped records without throwing", () => {
    const context = contextFor();
    REPORTS.forEach((report) => {
      const result = runReport(report.id, context);
      expect(result.id).toBe(report.id);
      expect(Array.isArray(result.kpis)).toBe(true);
      expect(Array.isArray(result.charts)).toBe(true);
      expect(Array.isArray(result.tables)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.disclosures)).toBe(true);
      expect(result.generatedAt instanceof Date).toBe(true);
      if (!result.empty) expect(result.kpis.length).toBeGreaterThan(0);
      if (report.id !== "pairing") {
        expect(result.empty, `${report.id} should build from the fixture records`).toBeFalsy();
      }
    });
  });

  it("describes rather than recommends a purchase", () => {
    const context = contextFor();
    REPORTS.forEach((report) => {
      const result = runReport(report.id, context);
      const text = [
        ...result.insights.map((insight) => insight.text),
        ...result.tables.map((table) => table.note || ""),
      ].join(" ");
      expect(text).not.toMatch(/\byou should (buy|purchase|consume|smoke more)\b/i);
      expect(text).not.toMatch(/\bbuy (more|now)\b/i);
      expect(text).not.toMatch(/\brestock\b/i);
    });
  });

  it("states the calculation basis and generation date in every result", () => {
    const result = runReport("overview", contextFor());
    expect(result.filtersLabel).toContain("Pipes");
    expect(result.recordCount).toBeGreaterThan(0);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("reports the largest module by count rather than the first module in display order", () => {
    const context = buildReportContext({
      data: { pipes: [fixtures.pipes[0]], cigars: fixtures.cigars },
      filters: DEFAULT_FILTERS,
    });
    const result = runReport("overview", context);
    expect(result.insights.find((entry) => entry.title === "Largest module").text).toContain("Cigars holds 2 of 3");
  });
});

describe("report model and filters", () => {
  const items = buildReportItems(fixtures);

  it("normalizes every module into one shape", () => {
    expect(items).toHaveLength(10);
    items.forEach((item) => {
      expect(item).toHaveProperty("module");
      expect(item).toHaveProperty("completeness");
      expect(item).toHaveProperty("detailPath");
      expect(item.docFlags).toHaveProperty("documents");
    });
  });

  it("counts tobacco quantity from tins and bulk", () => {
    const blend = items.find((item) => item.id === "blend1");
    expect(blend.quantity).toBe(10);
    expect(blend.unit).toBe("oz");
  });

  it("takes wine ratings from its tasting log", () => {
    const wine = items.find((item) => item.id === "wine1");
    expect(wine.rating).toBe(5);
  });

  it("filters by module scope, storage, maker, category and rating", () => {
    const whiskeyOnly = filterItems(items, { ...DEFAULT_FILTERS, modules: { pipe: false, whiskey: true, cigar: false, wine: false } });
    expect(whiskeyOnly.every((item) => item.module === "whiskey")).toBe(true);

    const cabinet = filterItems(items, { ...DEFAULT_FILTERS, storageIds: ["loc1"] });
    expect(cabinet.every((item) => item.storageId === "loc1")).toBe(true);

    const maker = filterItems(items, { ...DEFAULT_FILTERS, makers: ["Samuel Gawith"] });
    expect(maker).toHaveLength(1);
    expect(maker[0].id).toBe("blend1");

    const category = filterItems(items, { ...DEFAULT_FILTERS, categories: ["Robusto"] });
    expect(category.every((item) => item.category === "Robusto")).toBe(true);

    const rated = filterItems(items, { ...DEFAULT_FILTERS, minRating: "4" });
    expect(rated.every((item) => item.rating != null && item.rating >= 4)).toBe(true);
  });

  it("applies the date range to acquisition or creation dates", () => {
    const recent = filterItems(items, { ...DEFAULT_FILTERS, range: "12m" });
    expect(recent.some((item) => item.id === "bottle2")).toBe(false);
    expect(recent.some((item) => item.id === "pipe1")).toBe(true);
  });

  it("builds filter options from the records themselves", () => {
    const options = buildFilterOptions(items, fixtures.locations);
    expect(options.makers).toContain("Savinelli");
    expect(options.categories).toContain("Billiard");
    expect(options.storages.map((storage) => storage.name)).toContain("Cellar");
  });
});

describe("insufficient data is handled honestly", () => {
  it("returns an empty explanation instead of fabricated figures", () => {
    const empty = buildReportContext({ data: {}, filters: DEFAULT_FILTERS });
    const result = runReport("overview", empty);
    expect(result.empty).toBeTruthy();
    expect(result.kpis).toHaveLength(0);
  });

  it("says when no valuations exist", () => {
    const noValuations = buildReportContext({ data: { ...fixtures, valuations: [] }, filters: DEFAULT_FILTERS });
    const result = runReport("valuation-history", noValuations);
    expect(result.empty).toMatch(/valuation/i);
  });

  it("says when no usage logs exist", () => {
    const noLogs = buildReportContext({
      data: { ...fixtures, smokingLogs: [], tastingLogs: [], cigarSessions: [], wineTastings: [] },
      filters: DEFAULT_FILTERS,
    });
    expect(runReport("preferences", noLogs).empty).toBeTruthy();
  });
});

describe("exports carry the same metadata as the screen", () => {
  const result = runReport("documentation", contextFor());

  it("writes the report title, filters, generation date and tables to CSV", () => {
    const csv = buildReportCsv(result);
    expect(csv).toContain("Report");
    expect(csv).toContain(result.title);
    expect(csv).toContain("Filters");
    expect(csv).toContain("Generated");
    expect(csv).toContain("Least documented records");
  });

  it("escapes CSV cells that could be read as formulas", () => {
    const tricky = { ...result, tables: [{ id: "t", title: "T", columns: [{ key: "a", label: "A" }], rows: [{ a: "=cmd()" }] }] };
    expect(buildReportCsv(tricky)).toContain("'=cmd()");
  });

  it("builds a PDF document", () => {
    const doc = createReportPdf(result);
    expect(typeof doc.save).toBe("function");
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });

  it("builds a PDF even when the report is empty", () => {
    const emptyResult = runReport("valuation-history", buildReportContext({ data: {}, filters: DEFAULT_FILTERS }));
    const doc = createReportPdf(emptyResult);
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });

  it("exports the same filtered supporting records shown in the report result", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      modules: { pipe: true, whiskey: false, cigar: false, wine: false },
      makers: ["Savinelli"],
    };
    const filteredResult = runReport("documentation", contextFor({ filters }));
    const supportingRows = filteredResult.tables.find((table) => table.id === "weakest").rows;
    const csv = buildReportCsv(filteredResult);

    expect(filteredResult.recordCount).toBe(1);
    expect(supportingRows.map((row) => row.name)).toEqual(["Billiard One"]);
    expect(supportingRows[0].detailPath).toContain("pipe1");
    expect(csv).toContain("Billiard One");
    expect(csv).not.toContain("Lagavulin 16");
  });
});

describe("authorization", () => {
  it("keeps viewing open and gates export behind Pro", () => {
    expect(resolveReportAccess({ hasPro: false }).canView).toBe(true);
    expect(resolveReportAccess({ hasPro: false }).canExport).toBe(false);
    expect(resolveReportAccess({ hasPro: true }).canExport).toBe(true);
  });

  it("enforces the same rule on the server", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "base44/functions/reportCenter/entry.ts"), "utf8");
    expect(source).toContain("requireEntitlement(req, \"EXPORT_REPORTS\")");
    expect(source).toContain("UNAUTHENTICATED");
    expect(source).toContain("administrator");
  });

  it("keeps saved configurations owner-scoped", () => {
    const entity = fs.readFileSync(path.join(process.cwd(), "base44/entities/SavedReportConfig.jsonc"), "utf8");
    expect(entity).toContain('"created_by": "{{user.email}}"');
    expect(entity).toContain('"role": "admin"');
    expect(entity).not.toMatch(/"read"\s*:\s*true/);
  });
});

describe("Curator reporting", () => {
  const context = contextFor();

  it("maps conversational requests to reports", () => {
    expect(detectReportingRequest("generate my documentation report").reportId).toBe("documentation");
    expect(detectReportingRequest("summarise my storage").reportId).toBe("storage");
    expect(detectReportingRequest("how many records do I have").reportId).toBe("overview");
    expect(detectReportingRequest("what should I buy next")).toBeNull();
  });

  it("explains a report from its real numbers", () => {
    const result = runReport("overview", context);
    const answer = explainReport({ result, question: "summarise this" });
    expect(answer.answer).toContain(String(result.recordCount));
    expect(answer.route).toContain("report=overview");
    expect(answer.groundedOn.length).toBeGreaterThan(0);
  });

  it("refuses to invent numbers for an empty report", () => {
    const empty = runReport("valuation-history", buildReportContext({ data: {}, filters: DEFAULT_FILTERS }));
    const answer = explainReport({ result: empty });
    expect(answer.answer.toLowerCase()).toContain("empty");
    expect(answer.groundedOn).toHaveLength(0);
  });

  it("lists reports available for a module", () => {
    const pipeReports = listReportsForModule("pipe").map((report) => report.id);
    expect(pipeReports).toContain("specialization");
    expect(pipeReports).toContain("overview");
    expect(pipeReports.length).toBeLessThanOrEqual(REPORTS.length);
  });
});