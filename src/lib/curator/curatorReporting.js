/**
 * curatorReporting.js
 *
 * Curator's reporting voice: it decides which report a conversational request
 * is asking for, and explains or summarises a report that has already been
 * computed from the collector's records.
 *
 * Deterministic and grounded: every sentence is built from numbers in the
 * report result. When a figure is missing, Curator says so instead of guessing.
 */

import { getReport, REPORTS, runReport } from "@/lib/reports/reportCatalog";
import { MODULE_LABELS } from "@/lib/reports/reportModel";

const INTENTS = [
  { reportId: "overlooked", pattern: /overlook|forgotten|neglect|not (used|logged|opened)/i },
  { reportId: "documentation", pattern: /document|completeness|missing (field|information)|gaps?/i },
  { reportId: "valuation-history", pattern: /valuation|value history|worth over time|apprais/i },
  { reportId: "insurance", pattern: /insurance|estate|replacement value|schedule/i },
  { reportId: "aging", pattern: /\baging\b|\bage\b|\bcellared?\b|drinking window|preservation/i },
  { reportId: "storage", pattern: /storage|locations?|humidor|cellar space|where (is|are)/i },
  { reportId: "makers", pattern: /makers?|producers?|distiller(y|ies)|brands?/i },
  { reportId: "ratings", pattern: /ratings?|scored|favourites?|favorites?|best rated/i },
  { reportId: "preferences", pattern: /preferences?|what do i (use|reach)|usage|habit/i },
  { reportId: "discovery", pattern: /discover|insight|relationships?|rare|unique|patterns?/i },
  { reportId: "composition", pattern: /composition|balance|breakdown|mix|make ?up/i },
  { reportId: "characteristics", pattern: /characteristic|flavou?r notes|tags|condition distribution/i },
  { reportId: "specialization", pattern: /speciali[sz]ation/i },
  { reportId: "pairing", pattern: /pairing|match(es)?/i },
  { reportId: "acquisition", pattern: /acquisition|provenance|where i (bought|got)|purchase history/i },
  { reportId: "annual", pattern: /annual|this year|year in review|last year/i },
  { reportId: "cross-collection", pattern: /cross[- ]collection|across modules|shared characteristic/i },
  { reportId: "health", pattern: /health|condition|maintenance|inspection/i },
  { reportId: "overview", pattern: /overview|summary of my collection|how many (records|items)/i },
];

const ASK = /\b(report|summar(y|ise|ize)|breakdown|how many|show me|tell me|explain|overview|generate)\b/i;

/** Which report (if any) a conversational request is asking for. */
export function detectReportingRequest(text) {
  const value = String(text || "").trim();
  if (!value || !ASK.test(value)) return null;
  const matched = INTENTS.find((intent) => intent.pattern.test(value));
  if (!matched) return null;
  return {
    reportId: matched.reportId,
    title: getReport(matched.reportId).title,
    route: `/ReportingCenter?report=${matched.reportId}`,
    question: value,
  };
}

function pickRelevant(result, question) {
  const value = String(question || "").toLowerCase();
  const kpis = result.kpis.filter((kpi) => value.includes(String(kpi.label).toLowerCase().split(" ")[0]));
  const tables = result.tables.filter((table) => value.includes(String(table.title).toLowerCase().split(" ")[0]));
  return {
    kpis: kpis.length > 0 ? kpis : result.kpis.slice(0, 3),
    tables: tables.length > 0 ? tables : result.tables.slice(0, 1),
  };
}

function describeKpi(kpi) {
  return `${kpi.label}: ${kpi.value}${kpi.sub ? ` (${kpi.sub})` : ""}`;
}

/**
 * Explain or summarise an already-computed report.
 * @returns {{answer: string, reportId: string, route: string, groundedOn: string[]}}
 */
export function explainReport({ result, question = "" } = {}) {
  if (!result) {
    return {
      answer: "I have not built that report yet. Choose a report first and I will summarise the numbers it produced.",
      reportId: "",
      route: "/ReportingCenter",
      groundedOn: [],
    };
  }

  const route = `/ReportingCenter?report=${result.id}`;

  if (result.empty) {
    return {
      answer: `The ${result.title.toLowerCase()} report came back empty: ${result.empty} I will not invent figures for records I cannot see.`,
      reportId: result.id,
      route,
      groundedOn: [],
    };
  }

  const relevant = pickRelevant(result, question);
  const lines = [];
  lines.push(`${result.title} covers ${result.recordCount} records after your filters (${result.filtersLabel}).`);
  if (relevant.kpis.length > 0) {
    lines.push(relevant.kpis.map(describeKpi).join(". ") + ".");
  }
  if (relevant.tables.length > 0) {
    const table = relevant.tables[0];
    const top = table.rows.slice(0, 3).map((row) => {
      const first = table.columns[0]?.key;
      const second = table.columns[1]?.key;
      return second ? `${row[first]} (${row[second]})` : String(row[first]);
    });
    lines.push(`In "${table.title}" the first entries are ${top.join(", ")}.`);
  }
  const observations = result.insights.slice(0, 2).map((insight) => insight.text);
  if (observations.length > 0) lines.push(observations.join(" "));
  lines.push(
    `Every figure comes from your own records, counted after the filters shown. Where a value is not recorded, the report states that rather than estimating it.`
  );

  return {
    answer: lines.join(" "),
    reportId: result.id,
    route,
    groundedOn: [
      `${result.recordCount} records in scope`,
      ...relevant.tables.map((table) => table.title),
    ],
  };
}

/** Report ids grouped by module, used to answer "which reports do I have". */
export function listReportsForModule(moduleKey) {
  const module = MODULE_LABELS[moduleKey] ? moduleKey : null;
  return REPORTS.filter((report) => !report.modules || (module && report.modules.includes(module))).map((report) => ({
    id: report.id,
    title: report.title,
  }));
}

/** Build and explain in one call, for a conversational request. */
export function buildReportingAnswer({ request, context }) {
  if (!request?.reportId) return null;
  const result = runReport(request.reportId, context);
  return { ...explainReport({ result, question: request.question }), result };
}