# Collection Valuation and Documentation Center — Implementation Report

Date: 2026-11-27
Scope: a shared valuation model across all five collection modules, a valuation and documentation dashboard, eight printable reports, and financial privacy in shares.

---

## 1. Purpose and boundaries

The center exists for personal collection records, insurance documentation, estate planning and the preservation of historical financial information. It is not a shopping, investment or price-comparison feature.

Deliberately absent: live price comparison, retailer listings, discount tracking, sales links, purchase or restock suggestions, resale recommendations, investment projections. A test asserts these phrases never appear in the valuation sources, and no valuation field is ever labelled a market price.

## 2. Audit — what existed and was reused

| Existing capability | Owner | Decision |
|---|---|---|
| Module-agnostic valuation engine and snapshot payloads | `src/components/valuation/valueEngine.js`, `valueRefreshService.js` | Reused. Not rewritten; the new center reads the same record fields. |
| Snapshot and price-observation history | `ItemValueSnapshot`, `BottleValueSnapshot`, `PriceObservation`, `ValuationSettings` | Left in place. `ValuationRecord` is the new documentation ledger and does not replace them. |
| Per-record valuation cards | `UnifiedValuationCard`, `ValuationBreakdown`, `ValuationCredibility` | Untouched. |
| Shared record framework (provenance, attachments, documentation completeness) | `src/lib/collection/itemRecord.js`, `attachments.js`, `provenance.js` | Reused directly for identity, acquisition, documentation score and attachment upload. |
| Share field selectors with opt-in value disclosure | `src/components/share/shareFieldSelectors.jsx` | Reused pattern; financial fields stay opt-in (`include_value`). |
| PDF generation | `src/lib/reports/collectionReportPdf.js` (jsPDF) | Same library and printable conventions; a new renderer for the eight reports. |
| Report/export entitlement gating | `useEntitlements`, `EXPORT_REPORTS` | Not applied to the new center (see decisions below). |

## 3. The valuation model

`ValuationRecord` (new entity, append-only, owner-scoped RLS) records one dated entry:

- **kind** — `acquisition_cost`, `acquisition_correction`, `user_estimate`, `appraisal`, `replacement_value`, `reference_valuation`.
- **evidence class** derived from kind — documented, owner entered, or reference source. The class, not the amount, decides whether a figure is shown as verified.
- **money** — amount, currency, base amount, the exchange rate used and its date, so a historical figure keeps the conversion that applied to it.
- **provenance of the figure** — source, source type, methodology, confidence, uncertainty range, appraiser, appraisal reference.
- **independent reference** — an authorization flag plus the named source. A reference figure without an authorized source is reported as **unknown confidence**, never as a price.
- **documents** — private file references for appraisals, receipts, certificates and photographs.
- **corrections** — `supersedes_id` links a correction to the entry it replaces, so the original stays in the history.

Rules enforced in code (`src/lib/valuation/valuationCenter.js`):

1. An AI-derived figure is always unverified, always low confidence, and always carries the disclosure "AI-generated estimate — not a verified market price."
2. Headline precedence is appraisal → owner estimate → replacement value → authorized reference → recorded cost. A cost fallback is labelled "a historical cost, not a current value".
3. An amount that cannot be converted has **no** base amount; it is never summed as zero.
4. With nothing recorded the answer is "unknown", not 0.

## 4. Dashboards

`ValuationDashboard` shows: total recorded acquisition cost; total documented or estimated value with the date it is documented to; the percentage of the collection with valuation records; documented appraisal coverage and insurance-ready count; records with no valuation; low/unknown confidence and unconvertible entries; value by module, maker, category and storage location; and documented value over time.

Every card and every bucket row opens the ledger filtered to the records behind it.

`ValuationLedger` lists entries newest first with their kind badge, evidence class, confidence, source, document count and any disclosure. `ValuationRecordForm` records a new entry, with private document upload and a visible warning when no exchange rate exists for the chosen currency.

## 5. The eight reports

Built as data models (`valuationReports.js`) and rendered to print (`valuationReportPdf.js`), with CSV for each:

1. Collection Valuation Summary
2. Detailed Insurance Inventory
3. Photographic Collection Inventory
4. Estate and Inheritance Inventory
5. Provenance and Ownership History
6. Historical Acquisition Cost Report
7. Historical Valuation Report
8. Documentation Completeness Report

Every model carries a generation date, the owner, source attribution ("the collector's own records… no third-party price database is reproduced"), the uncertainty disclosure and the AI-estimate disclosure. The PDF prints the attribution and disclosures on every page footer with page numbers, on white paper with dark ink.

## 6. Privacy

`valuationPrivacy.js` holds the rule: financial fields are excluded from any share unless `include_financials` (or `include_value` **and** `financial_authorized`) is explicitly true. Without authorization a public valuation view keeps only the documentation facts — that an appraisal exists, its date, its confidence band, whether an appraiser is named — and no money. `stripFinancialFields` removes every financial key recursively as a second line of defence.

## 7. Verification

| Check | Result |
|---|---|
| New suite `valuationCenter.test.js` | 46 passed |
| — evidence classes, AI never verified, unauthorized reference = unknown | pass |
| — currency: pass-through, rate conversion, missing rate → null (not 0), stored base amount honoured | pass |
| — headline precedence, cost-only fallback labelled, unknown ≠ zero, ordered history | pass |
| — totals, corrections superseding cost, cost-only counting, buckets, stale detection, insurance readiness, unconvertible counting, value-over-time | pass |
| — module item mapping for all five modules, drill-down filters | pass |
| — privacy default deny, recursive stripping, public view, share opt-in | pass |
| — all eight reports build with attribution, date, disclosures, totals; unknown id rejected; CSV content; insurance status | pass |
| — PDF renders to a valid multi-page document; empty report does not throw | pass |
| — boundaries: no purchasing/retailer/resale/projection language | pass |
| — authorization: RLS on `ValuationRecord`; all 8 reads scoped to `created_by` | pass |
| — mobile: 44px targets, `92dvh` sheet, stacked grids, wrapped names | pass |
| Full regression suite | 3,499 passed across 207 files |
| Production build | clean |
| Live writes — appraisal with EUR amount, rate 0.9, range, private document | persisted; 900 EUR → 1000 USD matches the documented rate; base amount inside the recorded range |
| Live writes — cleanup | 0 records left behind |

Three real defects were caught by these tests and fixed before delivery: a missing amount was being converted to `0` instead of `null`; a second normalisation pass silently dropped valuation dates (which had made every record look like it needed updated documentation); and the document upload called the storage integration directly, bypassing the canonical telemetry layer — it now goes through `trackedUploadPrivateFile`.

## 8. Decisions requiring approval

1. **Report entitlement.** The eight reports are available to every collector today. The existing `EXPORT_REPORTS` entitlement is not applied here, because applying it would take insurance and estate documentation away from free collectors. Recommended for review before any enforcement.
2. **Currency source.** Conversion uses the app's existing cached rate provider. A historical rate table (rate per date, rather than the rate at the moment of recording) is not built; entries store the rate they used, which is the auditable minimum.
3. **Independent reference sources.** The entity accepts a named, authorized source, but no external valuation feed is connected. Doing so needs a compliance review of the source, which this pass does not perform.

## 9. Deferred (named, not built)

- An inline valuation editor on each module's detail page (the center is the single entry point today).
- Embedding the actual photograph files into the photographic inventory PDF (the report lists what is held; files open from the record).
- A per-date exchange-rate history table.
- Localisation of the new strings (English copy is live with `t()` keys where the surrounding code already uses them).
