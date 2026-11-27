/**
 * reportCatalog.js
 *
 * The Reporting Center registry. One list of reports, one context builder, one
 * access decision — so the page, the exports and Curator all agree.
 */

import { buildReportItems, filterItems, describeFilters, DEFAULT_FILTERS, buildFilterOptions } from "./reportModel";
import { buildUsageEvents } from "./reportUsage";
import { CORE_REPORTS } from "./reportCatalogCore";
import { INTELLIGENCE_REPORTS } from "./reportCatalogIntelligence";

export const REPORTS = Object.freeze(
  [...CORE_REPORTS, ...INTELLIGENCE_REPORTS].sort((a, b) => a.order - b.order)
);

export const REPORT_GROUPS = Object.freeze([
  "Overview",
  "Composition",
  "Collection practice",
  "Intelligence",
  "History",
  "Documentation",
  "Preservation",
  "Value",
]);

export function getReport(reportId) {
  return REPORTS.find((report) => report.id === reportId) || REPORTS[0];
}

export function reportsForGroup(group) {
  return REPORTS.filter((report) => report.group === group);
}

/**
 * Build the single context every report reads.
 * `sources` carries the raw supporting records (logs, valuations, inspections).
 */
export function buildReportContext({
  data = {},
  filters = DEFAULT_FILTERS,
  pairing = null,
  currency = "USD",
  curatorQuestion = "",
  generatedAt = new Date(),
} = {}) {
  const locations = data.locations || [];
  const humidors = data.humidors || [];
  const allItems = buildReportItems({
    pipes: data.pipes,
    blends: data.blends,
    bottles: data.bottles,
    cigars: data.cigars,
    wines: data.wines,
    wineTastings: data.wineTastings,
    locations,
    humidors,
  });
  const items = filterItems(allItems, filters);
  const usage = buildUsageEvents({
    smokingLogs: data.smokingLogs,
    tastingLogs: data.tastingLogs,
    cigarSessions: data.cigarSessions,
    wineTastings: data.wineTastings,
  });
  const itemIds = new Set(items.map((item) => item.id));

  return {
    items,
    allItems,
    usage: usage.filter((entry) => itemIds.has(entry.itemId)),
    filters,
    currency,
    curatorQuestion,
    generatedAt,
    pairing,
    options: buildFilterOptions(allItems, [...locations, ...humidors]),
    sources: {
      locations,
      humidors,
      humidorReadings: data.humidorReadings || [],
      valuations: data.valuations || [],
      cigarRatings: data.cigarRatings || [],
      bottleFills: data.bottleFills || [],
      wineInspections: data.wineInspections || [],
      pipeMaintenance: data.pipeMaintenance || [],
      humidorMaintenance: data.humidorMaintenance || [],
      cellarLogs: data.cellarLogs || [],
      collectionActivity: data.collectionActivity || [],
      smokingLogs: data.smokingLogs || [],
      tastingLogs: data.tastingLogs || [],
      cigarSessions: data.cigarSessions || [],
      wineTastings: data.wineTastings || [],
    },
  };
}

/** Run one report and attach the metadata every export and view needs. */
export function runReport(reportId, context) {
  const definition = getReport(reportId);
  const generatedAt = context?.generatedAt || new Date();
  let body;
  try {
    body = definition.compute(context) || {};
  } catch (error) {
    body = { empty: "This report could not be built from the records loaded. Reload and try again." };
    if (typeof console !== "undefined") console.error(`[reporting] ${reportId} failed`, error);
  }

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    group: definition.group,
    generatedAt,
    currency: context?.currency || "USD",
    filters: context?.filters || DEFAULT_FILTERS,
    filtersLabel: describeFilters(context?.filters || DEFAULT_FILTERS, context?.options || {}),
    recordCount: context?.items?.length || 0,
    empty: body.empty || null,
    kpis: body.kpis || [],
    charts: body.charts || [],
    tables: body.tables || [],
    insights: body.insights || [],
    disclosures: body.disclosures || [],
    question: body.question || "",
  };
}

/**
 * Access decision.
 *
 * Viewing every report stays available to every signed-in collector, exactly as
 * the existing Collection Reports page works today. Exporting and the
 * Curator-generated narrative are Pro capabilities, and the backend gate
 * (reportCenter) re-checks the export right with the same entitlement helper the
 * rest of the app uses.
 */
export function resolveReportAccess({ hasPro = false, reportId = "" } = {}) {
  const isCuratorReport = reportId === "custom-curator";
  return {
    canView: true,
    canExport: Boolean(hasPro),
    canSave: true,
    canUseCuratorNarrative: Boolean(hasPro) && isCuratorReport ? true : Boolean(hasPro),
    requiresProForExport: !hasPro,
  };
}