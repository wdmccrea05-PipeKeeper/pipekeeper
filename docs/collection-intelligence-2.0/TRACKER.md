# CollectionKeeper — Collection Intelligence 2.0 Tracker

**Persistent development tracker.** Update this file as work lands; it is the
single record of what is done, what is next and what is blocked.

- **Version:** 2.0.0
- **Opened:** 2026-11-27
- **Companion:** `AUDIT.md` (findings and evidence)
- **Readiness review:** `PRODUCTION_READINESS_REVIEW.md` · **Release notes:** `RELEASE_NOTES_2.0.md` · **Rollback:** `ROLLBACK_PLAN.md`

Status values: `done` · `in-progress` · `blocked` · `planned`

---

## Batches and dependencies

Work is grouped so that batches can run without waiting on each other. Arrows mean "depends on".

```
Batch A (foundations)      →  Batch B (module adoption)  →  Batch D (reporting/sharing)
Batch C (access control)   →  Batch B
Batch E (boundary remediation) — independent of A–D
```

| Batch | Theme | Depends on |
|---|---|---|
| A | Shared collection services | — |
| B | Module adoption of shared services | A, C |
| C | Row-level security rollout | — |
| D | Reporting and sharing consolidation | A |
| E | Product-boundary remediation | product decisions |

---

## Batch A — Shared collection services

| ID | Item | Status | Files |
|---|---|---|---|
| CI2-001 | Establish canonical valuation path; keeper-core delegates to engine | done | `src/components/keeper-core/value/valueAggregation.jsx` |
| CI2-002 | Add wine value path to module value aggregation | done | same |
| CI2-003 | Product-boundary policy module | done | `src/lib/collection/boundaries.js` |
| CI2-004 | Compose boundary clause into Curator prompt; reframe restock rule | done | `src/lib/curator/curatorSystemPrompt.js` |
| CI2-005 | Shared provenance service | done | `src/lib/collection/provenance.js` |
| CI2-006 | Shared condition-history service | done | `src/lib/collection/conditionHistory.js` |
| CI2-007 | Export new services from the collection barrel | done | `src/lib/collection/index.js` |
| CI2-008 | Baseline guard-rail tests (41) | done | `src/__tests__/collectionIntelligence*.test.js` |
| CI2-009 | Wire provenance service into pipe, cigar, whiskey, wine detail pages | planned | detail pages |
| CI2-010 | Wire condition-history service into detail pages and insurance exports | planned | `PipeDetail`, `CigarDetail`, `BottleDetail`, `WineDetail` |

## Batch B — Module adoption

| ID | Item | Status | Notes |
|---|---|---|---|
| CI2-020 | Move cigar valuation onto the canonical engine | planned | verify value parity first |
| CI2-021 | Add wine/cigar parity to `calculateEcosystemValueMetrics` | planned | changes displayed percentages — needs UI sign-off |
| CI2-022 | Migrate `lib/collection/*Selectors` to consume the engine directly | planned | selector outputs must stay identical |
| CI2-023 | Single report contract shared by all exporters | planned | depends on CI2-022 |

## Batch C — Access control

| ID | Item | Status | Notes |
|---|---|---|---|
| CI2-01 | **P0** RLS rollout for collection entities | blocked | 61 of 84 entities still have no `rls`; 23 covered, `StorageLocation` added 2026-11-27. Needs staged, per-module application with verification. Start with `Pipe`, then `TobaccoBlend`, `Bottle`, `Wine`, `Cigar`. Pattern: read/update/delete owner-or-admin via `created_by`; create for logged-in users. Must be verified against each collection page before the next entity. |
| CI2-02 | RLS for log entities (`PipeMaintenanceLog`, `HumidorMaintenanceLog`, `CellarLog`, `TastingLog`) | blocked | depends on CI2-01 |
| CI2-03 | RLS for `AcquisitionItem` | blocked | depends on CI2-01 |

## Batch D — Reporting and sharing

| ID | Item | Status |
|---|---|---|
| CI2-030 | Shared report registry (one list, one contract, all modules) | planned |
| CI2-031 | Shared insurance/estate export contract | planned |
| CI2-032 | Extend `shareFieldSelectors` for provenance and condition history | planned |

## Batch E — Product-boundary remediation

Each item needs a product decision before code changes. Nothing is deleted while the decision
is open.

| ID | Surface | Conflict | Status |
|---|---|---|---|
| CI2-040 | `lib/curator/purchaseRestockEngine.js` | Purchase recommendations | blocked (decision) |
| CI2-041 | `components/curator/CuratorPurchaseQueue.jsx` | Purchase queue UI | blocked (decision) |
| CI2-042 | `pages/ShoppingList.jsx`, `ShoppingListItem` | Shopping list | blocked (decision) |
| CI2-043 | `pages/WantList.jsx`, `AcquisitionItem.source_url` | Retailer links, target price | blocked (decision) |
| CI2-044 | `components/identify/upcLookup.js` | Retail product lookup | blocked (decision) |
| CI2-045 | `lib/images/productImage*`, `trustedImageSources` | Retailer imagery pipeline | blocked (decision) |
| CI2-046 | `components/cigars/CigarValuationModal.jsx` | Market pricing framing | blocked (decision) |
| CI2-047 | Apply `classifyGeneratedCopy` at report generation and email composition | Enforcement beyond Curator | planned |

## Batch F — Shared documentation framework (landed 2026-11-27)

| ID | Item | Status | Files |
|---|---|---|---|
| CI2-070 | Shared documentation fields added to Pipe, Cigar, Bottle and Wine (all optional) | done | `base44/entities/{Pipe,Cigar,Bottle,Wine}.jsonc` |
| CI2-071 | Append-only record activity history entity with owner-or-admin RLS | done | `base44/entities/CollectionActivity.jsonc` |
| CI2-072 | Attachment service (private upload, signed-URL open, 20-file cap) | done | `src/lib/collection/attachments.js` |
| CI2-073 | Shared record shape, acquisition resolution, change-only patches | done | `src/lib/collection/itemRecord.js` |
| CI-074 | Shared detail section mounted in all four detail pages | done | `src/components/collection/CollectionRecordDetails.jsx` + 4 detail pages |
| CI-075 | Bulk documentation editing (allowlisted fields, ownership checked) | done | `base44/functions/collectionItemBulkUpdate` |
| CI-076 | Duplicate detection | done | `base44/functions/collectionItemDuplicates` |
| CI-077 | Controlled merge (survivor keeps values, arrays unioned, duplicates archived) | done | `base44/functions/collectionItemMerge` |
| CI-078 | Collection Tools page: bulk edit, duplicates, search, lifecycle filter, sort, CSV export | done | `src/pages/CollectionTools.jsx` |
| CI-079 | Curator authorized for descriptive record analysis; updates require approval | done | `src/lib/curator/curatorSystemPrompt.js` |
| CI-080 | Guard-rail tests (27) | done | `src/__tests__/collectionRecordFramework.test.js` |
| CI-081 | Inventory movement history beyond the activity log | planned | needs per-module movement sources |
| CI-082 | Ownership history as a first-class chain | planned | needs a privacy decision |
| CI-083 | Merge reassignment of child logs (tastings, sessions, maintenance) | planned | needs per-module foreign-key verification |
| CI-084 | Translations for the new UI strings in every locale | in-progress | English fallbacks live; four CI 2.0 help articles added 2026-11-27 (English) |

---

## Batch G — PipeKeeper & tobacco cellar (landed 2026-11-27)

| ID | Item | Status | Files |
|---|---|---|---|
| CI2-090 | Cellar fields on TobaccoBlend: storage, packaging, cellaring, production, recipe, documents, lifecycle | done | `base44/entities/TobaccoBlend.jsonc` |
| CI2-091 | StorageLocation accepts tobacco and pipe storage | done | `base44/entities/StorageLocation.jsonc` |
| CI2-092 | Specialization and recipe events in the activity log | done | `base44/entities/CollectionActivity.jsonc` |
| CI2-093 | Specialization change path with dated history | done | `src/lib/collection/specialization.js` |
| CI2-094 | Cellar maths: duration, packaging, reconciliation, recipes | done | `src/lib/collection/cellar.js` |
| CI2-095 | Curator specialization review with alternatives, rationale and confidence (no pairing scores) | done | `src/lib/curator/specializationReview.js` |
| CI2-096 | Specialization history and review in the pipe detail | done | `src/components/pipes/SpecializationHistory.jsx`, `src/components/collection/SpecializationReviewPanel.jsx` |
| CI2-097 | Cellar documentation editor on the blend detail | done | `src/components/tobacco/TobaccoCellarDocumentation.jsx` |
| CI2-098 | Five PipeKeeper/cellar reports with drill-down and print | done | `src/lib/reports/pipeCollectionReports.js`, `pipeCollectionReportPdf.js`, `src/components/reports/PipeCollectionReportPanel.jsx` |
| CI2-099 | Two-pipe characteristic comparison | done | `src/components/pipes/PipeCharacteristicsCompare.jsx` |
| CI2-100 | Curator applies a confirmed specialization change in-chat | done | `src/components/curator/CuratorSpecializationAction.jsx`, `ExpertTobacconistChat.jsx` |
| CI2-101 | Specialization intent resolved before generic follow-ups | done | `src/lib/curator/curatorChatIntent.js` |
| CI2-102 | Telemetry wrappers for private upload and signed URLs | done | `src/lib/integrationTelemetry.js` |
| CI2-103 | Storage movement as a per-move ledger rather than one activity row | planned | needs a decision on move granularity |
| CI2-104 | Specialization review reading free-text tasting notes | planned | needs a prompt/context budget decision |
| CI2-105 | Translations for the new PipeKeeper strings | planned | English fallbacks live now |

---

## Batch H — CigarKeeper preservation & entitlements (landed 2026-11-27)

| ID | Item | Status | Files |
|---|---|---|---|
| CI2-110 | Dated structured ratings with optional categories | done | `base44/entities/CigarRating.jsonc`, `src/lib/cigars/cigarRatings.js`, `src/components/cigars/CigarRatingCategories.jsx` |
| CI2-111 | Humidor readings with history and threshold alerts | done | `base44/entities/HumidorReading.jsonc`, `src/lib/cigars/humidorEnvironment.js` |
| CI2-112 | Humidor dimensions, shelves and tolerance band | done | `base44/entities/HumidorLocation.jsonc`, `src/components/cigars/HumidorManager.jsx` |
| CI2-113 | Humidor inventory, reconciliation and movement history | done | `src/lib/cigars/humidorInventory.js`, `src/components/cigars/HumidorDetailDialog.jsx` |
| CI2-114 | Storage movement logged on every assignment change | done | `src/lib/cigars/logStorageChange.js`, `base44/entities/CollectionActivity.jsonc` |
| CI2-115 | Redesigned dashboard with metric drill-downs | done | `src/lib/cigars/cigarDashboard.js`, `src/components/cigars/CigarKeeperDashboard.jsx`, `src/pages/CigarKeeper.jsx` |
| CI2-116 | List drill-down presets (`preset`, `humidor`, `condition`, `q`) | done | `src/lib/cigars/cigarDocumentation.js`, `src/pages/Cigars.jsx` |
| CI2-117 | Storage and aging panel on the cigar detail | done | `src/components/cigars/CigarStoragePanel.jsx`, `src/pages/CigarDetail.jsx` |
| CI2-118 | Curator humidor/environment context and cigar guidance | done | `src/lib/curator/cigarPreservationGuidance.js`, `CuratorWorkspace.jsx`, `curatorOperationsEngine.js` |
| CI2-119 | Feature entitlement matrix and availability indicator | done | `src/lib/entitlements/featureMatrix.js`, `src/components/entitlements/FeatureAvailabilityBadge.jsx` |
| CI2-120 | Server-side authorization guard test | done | `src/__tests__/serverAuthorizationGuard.test.js` |
| CI2-121 | Enforce the entitlement guard on report generation | approval pending | two misused call sites documented in the guard test |
| CI2-122 | Consolidated administrative diagnostics screen | done | `src/pages/AdminDiagnostics.jsx` + route verified 2026-11-27 |
| CI2-123 | Admin matrix view | planned | matrix is code + badge today |

---

## Batch I — Valuation & Documentation Center (landed 2026-11-27)

| ID | Item | Status | Files |
|---|---|---|---|
| CI2-130 | Append-only valuation ledger entity with currency, confidence and documents | done | `base44/entities/ValuationRecord.jsonc` |
| CI2-131 | Shared valuation model: evidence classes, precedence, unknown ≠ zero | done | `src/lib/valuation/valuationCenter.js` |
| CI2-132 | Currency conversion with documented rate; unconvertible entries excluded | done | `src/lib/valuation/valuationCenter.js` |
| CI2-133 | Financial privacy: private by default, opt-in for shares | done | `src/lib/valuation/valuationPrivacy.js` |
| CI2-134 | Cross-module item mapping for dashboards and reports | done | `src/lib/valuation/collectionItems.js` |
| CI2-135 | Valuation dashboard with drill-downs and value-over-time | done | `src/components/valuation/ValuationDashboard.jsx` |
| CI2-136 | Ledger and entry form with private document upload | done | `ValuationLedger.jsx`, `ValuationRecordForm.jsx` |
| CI2-137 | Eight report models with attribution and disclosures | done | `src/lib/valuation/valuationReports.js` |
| CI2-138 | Printable PDF and CSV rendering | done | `src/lib/valuation/valuationReportPdf.js`, `ValuationReportPanel.jsx` |
| CI2-139 | Valuation Center page, route and quick-access entry | done | `src/pages/ValuationCenter.jsx`, `src/App.jsx`, `FeatureQuickAccess.jsx` |
| CI2-140 | Test suite (46 assertions incl. PDF render and boundaries) | done | `src/__tests__/valuationCenter.test.js` |
| CI2-141 | Apply `EXPORT_REPORTS` to the new reports | approval pending | would remove free access to insurance/estate reports |
| CI2-142 | Per-record inline valuation editor on module detail pages | planned | center is the single entry point |
| CI2-143 | Per-date exchange-rate history table | planned | rate at recording time is stored today |

---

## Defect log

| ID | Defect | Severity | Status |
|---|---|---|---|
| CI2-050 | Two divergent valuation implementations produced different totals per surface | High | done (CI2-001) |
| CI2-051 | Wine missing from hub value aggregation | Medium | done (CI2-002) |
| CI2-052 | No enforceable product boundary | High | done (CI2-003/004); enforcement partial (CI2-047) |
| CI2-053 | Campaign sender workflow drains one batch then stalls (`run_due` filters `scheduled`, queue sets `sending`) | High | planned |
| CI2-054 | 66 of 75 entities have no row-level security | Critical | blocked (CI2-01) |
| CI2-055 | `src/entities/*.json` duplicates 13 `base44/entities` schemas; 2 have no counterpart | Medium | planned |
| CI2-056 | ~35 one-off diagnostic backend functions remain reachable | Low | planned |
| CI2-057 | Curator chat hang / potential unbounded state loop | Medium | planned (needs repro) |
| CI2-058 | `calculateEcosystemValueMetrics` omits wine | Low | planned (CI2-021) |
| CI2-059 | Backend SDK has no bulk writer: `bulkUpdate` / `bulkCreate` are not functions on `asServiceRole.entities` | High | done — per-record writes |
| CI2-060 | `resolveAcquisition` reported an unrecorded acquisition cost as `0` (`Number(null)`) | Medium | done |
| CI2-061 | Two guard tests asserted superseded source shapes (`invoke(` vs `invoke?.(`, cigar branches in a now module-agnostic public share route) and failed the suite | Medium | done 2026-11-27 |
| CI2-062 | Orphan-reference count was measured on lists capped at 3,000 records, overstating broken session links as 518 | Medium | done — full pagination gives 63 real orphans, left intact as history |
| CI2-063 | 17 cigar records carry no `quantity` | Low | open — needs a defaulting decision, no silent backfill |
| CI2-064 | `StorageLocation` holds no records and no collection record references it (modules use `humidor_id`/`storage_note`) | Low | open — product decision |
| CI2-065 | Help knowledge base had no article for Collection Tools, Valuation Center, Reporting Center or sharing/privacy | Medium | done 2026-11-27 — four articles + 13 shortcuts |
| CI2-066 | Retailer domains are hardcoded in image lookup and the AI valuation prompt (`searchQueries.js`, `ValueLookup.jsx`) | Medium | open — Batch E decision, documented in readiness review §10 |

---

## Test baseline

| Run | Result | Date |
|---|---|---|
| New guard-rail suites (2 files, 41 tests) | 41 passed | 2026-11-27 |
| Collection regression subset (10 files, 160 tests) | 160 passed | 2026-11-27 |
| Production build | Clean | 2026-11-27 |
| **Full suite (211 files)** | **3,630 passed, 0 failed** | 2026-11-27 |
| Production build after readiness review | Clean (exit 0) | 2026-11-27 |

Rule: every Batch A/B change must leave these green. Add a guard-rail test when a defect is
fixed so it cannot silently return.

---

## Conventions for new work

1. Cross-module capability → implement in `src/lib/collection/` (client) or
   `base44/shared/` (server). Never copy between modules.
2. Import shared collection logic from `@/lib/collection`, not from individual files.
3. Any new copy that could reach a user goes through `classifyGeneratedCopy` before release.
4. No new entity without an `rls` block.
5. Preserve public function signatures when consolidating; delegate, do not rename.
