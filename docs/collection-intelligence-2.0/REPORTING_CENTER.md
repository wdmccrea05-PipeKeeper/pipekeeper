# Collection Intelligence and Reporting Center

Status: implemented and verified on 2026-11-27. Page: `/ReportingCenter`.
Regression suite: `src/__tests__/reportingCenter.test.js` — 26 tests passing.
Build: `npx vite build` exits 0.

## 1. Audit of the existing framework

The app already had a working reporting layer, and it was extended rather than replaced:

| Existing | Kept | Extended by the center |
| --- | --- | --- |
| `src/pages/CollectionReports.jsx` (pairing chart, top matches, complementary, pipes & cellar tabs) | unchanged, still routed at `/CollectionReports`, now links to the center | pairing content is also report 05 of the center |
| `src/lib/reports/pairingInsightsEngine.js` (`buildCollectionReport`, scoring) | reused verbatim for report 05 | scores are exposed in a table with their criteria |
| `src/lib/reports/collectionReportCsv.js` / `collectionReportPdf.js` | CSV download helper reused | a generic result exporter added beside them |
| `ReportOptionsPanel`, `TopMatchesReport`, `PipePairingChartReport` | untouched | the center adds its own filter bar and result renderer |
| `SmokingLogReportExporter`, `AgingReportExporter`, `CollectionReportExporter` | untouched | server-authorized CSV/PDF for every new report |
| `InsightsPageShell` / `InsightsHeader` / `InsightPanel` | reused | — |

## 2. Architecture

```
src/lib/reports/reportModel.js        one normalized record model + filters (pure)
src/lib/reports/reportUsage.js        smoking/tasting/session logs -> one event list (pure)
src/lib/reports/reportCatalogCore.js  reports 01-10 (pure compute functions)
src/lib/reports/reportCatalogIntelligence.js reports 11-20 (pure compute functions)
src/lib/reports/reportCatalog.js      registry, context builder, runReport, access decision
src/lib/reports/reportExport.js       CSV + PDF for any result
src/lib/curator/curatorReporting.js   conversational report detection + grounded explanation
src/components/reports/useReportCenterData.jsx  module-gated data loading (React Query)
src/components/reports/*.jsx          filters, catalogue, charts, tables, drill-down, saved views
src/pages/ReportingCenter.jsx         the page
base44/entities/SavedReportConfig.jsonc
base44/functions/reportCenter/entry.ts  server-side export authorization
```

Every report is a pure function of the same context, so counts agree across reports. A report returns
`{ empty?, kpis[], charts[], tables[], insights[], disclosures[] }`; the page, the CSV and the PDF all read that one object, which is why an export always matches the screen.

### Normalized record model

One shape for pipes, tobacco, bottles, cigars and wines: name, maker, category, sub-category, region,
storage, acquisition date, quantity with unit, recorded cost, estimated value, rating, condition,
tags, flavor notes, provenance flag, document count, seven documentation flags and a completeness
percentage. Module-specific rules live in one place: tobacco quantity is summed across tins, bulk and
pouches; wine ratings come from its tasting log because a wine record has no rating field.

### Filters (shared by every report and export)

Modules (pipe+tobacco, whiskey, cigar, wine) · date range (all / 12 months / 3 years / 5 years /
custom) · storage location · maker, producer or distillery · category · minimum rating · year (annual
review) · Curator question (report 20). Filters are applied to the normalized population before any
report computes, so drill-downs and exports can never disagree with the chart above them.

## 3. The twenty reports

| # | Report | What it computes |
| --- | --- | --- |
| 01 | Collection Overview | records, units, documentation average, recorded value, additions in 12 months, module and lifecycle splits |
| 02 | Composition and Balance | category distribution, largest category share, maker concentration, module share |
| 03 | Characteristics Distribution | condition, flavor notes, tags, sub-types, coverage percentages |
| 04 | Pipe Specialization Analysis | pipes with and without a specialization, counts per specialization, cellar size |
| 05 | Pairing Insights Chart | the existing pairing engine's scores, banded, with the criteria column and the no-purchase-recommendation disclosure |
| 06 | Historical Preference Analysis | logs by month, most used records, average rating by module |
| 07 | Collection Discovery | characteristics held by exactly one record, maker+category relationships, classification gaps, acquisition timeline |
| 08 | Overlooked Collection Items | not logged in 12 months, never rated, under half documented — with the reason on every row |
| 09 | Documentation Completeness | coverage of seven fields, completeness per module, least documented records |
| 10 | Collection Health and Condition | condition distribution, lower-condition records, maintenance entries, inspection findings, low fills, environmental readings |
| 11 | Aging and Preservation | cellared age buckets, cigar rest, wine window status, readings inside the collector's own bands |
| 12 | Storage Distribution | records and units per location, capacity utilisation, unassigned records |
| 13 | Maker, Producer and Distillery Analysis | records, share, average rating, value, earliest record, top-five concentration |
| 14 | Historical Personal Ratings | distribution, averages by module and category, structured cigar rating categories, unrated count |
| 15 | Acquisition and Provenance History | records by year and month, recorded sources, provenance coverage, recorded cost |
| 16 | Insurance and Estate Documentation | recorded cost vs owner estimate vs documented appraisal per record, with the evidence behind each figure |
| 17 | Annual Collection Review | one year: added, sessions, ratings, valuation entries, retired, remaining gaps |
| 18 | Cross-Collection Characteristics | traits spanning modules, documentation/condition/rating parity per module |
| 19 | Historical Valuation Analysis | amount by kind, amount over time, confidence mix, unverified entries |
| 20 | Curator-Generated Report | a conversational request answered from the loaded records, with the supporting table |

Every report states its generation date, filters, record count, calculation basis and disclosures.
Reports never recommend a purchase or increased consumption; the pairing and overlooked reports carry
that statement explicitly.

## 4. Interactive behaviour

- **Charts** are Recharts bars, lines and pies. Bars and slices carry a `drillIds` map; selecting one opens a dialog listing exactly those records, each linking to its detail page.
- **Tables** link the first column to the record's detail page (`/PipeDetail?id=`, `/BottleDetail?id=`, `/CigarDetail?id=`, `/WineDetail?id=`, `/TobaccoDetail?id=`).
- **Empty and insufficient data** are first-class: each report returns an `empty` sentence explaining what is missing instead of a blank chart or a zero that reads like a real measurement.
- **Saved configurations** store the report plus every filter, are owner-scoped by RLS, and reload in one click.
- **Print** uses `reportPrint.css`: app chrome is hidden, text is forced to ink, charts and tables avoid page breaks.
- **PDF** includes title, description, generation date, filters, record count, summary measures, up to 200 rows per table, observations and disclosures, with a page footer.
- **CSV** writes one file with sections, guards formula-leading cells, and always includes the report title, filters and generation timestamp.

## 5. Authorization (frontend and backend)

- Viewing every report stays open to any signed-in collector — the same right the existing Collection Reports page has always granted, so nothing was taken away.
- Exporting (PDF/CSV) requires Pro. The client checks `useEntitlements().canUse("EXPORT_REPORTS")` **and** requires a positive answer from the backend before preparing a file.
- `reportCenter` re-checks with `requireEntitlement(req, "EXPORT_REPORTS")`, which already resolves complimentary Pro trials, promotional appreciation grants and paid subscriptions; an administrator is resolved explicitly.
- Saved views are protected by entity RLS: owner or administrator for read, update and delete; create is bound to the owner.

Live verification of the deployed function:

```
POST reportCenter { action: "authorize" } -> 200
{
  authenticated: true,
  canViewReports: true,
  canExport: true,
  tier: "pro",
  source: "administrator",
  reportIds: [ ...20 ids... ],
  generatedAt: "2026-11-27T20:36:35.595Z",
  disclosures: [ ...3... ]
}
```

## 6. Curator

`curatorReporting.js` maps a conversational request to a report id ("generate my documentation
report" → `documentation`, "summarise my storage" → `storage`, "how many records do I have" →
`overview`) and explains an already-computed report from its real numbers: record count, filters,
the measures relevant to the question, the first rows of the matching table and up to two
observations. For an empty report it says the report is empty and refuses to invent figures. The
Reporting Center renders this as **Ask Curator about this report**: the same box can switch the active
report by name.

## 7. Test coverage (26 tests)

- all twenty reports exist, in order, in named groups;
- every report runs on real-shaped records for all five modules and returns the full result shape;
- no report output contains purchase or consumption advice;
- quantity, wine-rating and documentation rules are correct;
- module, storage, maker, category, rating and date-range filters select the right records;
- empty data, missing valuations and missing logs produce honest explanations;
- CSV carries title, filters, date and tables, and escapes formula cells; PDF builds for full and empty results;
- access: viewing open, export gated, server call and entity RLS verified from source;
- Curator detection, grounded explanation, empty refusal and module listing.

## 8. Limitations (documented, not hidden)

- PDF and CSV are generated in the browser after the server confirms the export right. That is a licensing gate, not a data-protection boundary: the data is the collector's own and never leaves their session. The app's existing server-generated PDFs (aging, smoking log) are unchanged.
- Charts are not rasterised into the PDF; the PDF carries the same tables, measures and observations, and the print stylesheet prints the charts.
- Print output depends on the browser's print dialog; charts are vector SVG and print at page width.
- The report catalogue is intentionally fixed at twenty; custom reports are expressed through report 20 and its question box rather than a report builder.

## 9. Performance

- Data loading is split into 20 React Query queries, each gated by the module it belongs to, with a five-minute stale time and full pagination through `fetchAllEntities`.
- Report computation is pure and memoized on the filter and data identity, so switching reports re-runs only that report.
- Tables render at most 200 rows in the PDF, 50 in the overlooked list and 40 in tag lists, with the remainder counted in a note — keeping mobile rendering bounded.
