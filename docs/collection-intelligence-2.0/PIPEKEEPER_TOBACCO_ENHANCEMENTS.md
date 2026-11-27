# PipeKeeper & Tobacco Cellar Enhancements — Implementation Report

Date: 2026-11-27
Scope: PipeKeeper collection records, tobacco cellar documentation, Curator specialization review, PipeKeeper/cellar reporting.

---

## 1. What already existed (audited, reused, not duplicated)

| Capability | Existing owner | Decision |
|---|---|---|
| Pipe identity, dimensions, materials, finish | `Pipe` entity, `PipeForm` | Reused. No new fields, no new form. |
| Condition tracking | `PipeConditionTracker`, `condition_tracking` | Reused unchanged. |
| Cleaning / restoration records | `PipeMaintenanceLog`, `MaintenanceLog` tab | Reused. Reports now read it; no second log type created. |
| Specialization values & recommender | `focus`, `PipeSpecialization`, `SpecializationRecommender`, `specializationEngine` | Reused. Added history + a descriptive review, not a second recommender. |
| Pairing scores | `pairingScoreCanonical`, `pairingEngine` | Untouched. The review path explicitly does not consume them. |
| Cellar quantities | `tobaccoQuantityHelpers`, `CellarLog`, `TobaccoInventoryManager` | Reused. Reconciliation reads the canonical helpers. |
| Attachments | `AttachmentManager`, `attachments.js` (CI 2.0) | Reused for blends; now wrapped in the telemetry layer. |
| Curator specialization routing | `isPipeSpecializationQuery`, `resolveSpecializationPipe` | Extended, not replaced. |
| Reports | `CollectionReports`, exporters | New tab added beside existing pairing reports. |

## 2. What was added

### Data model
- `TobaccoBlend`: storage location and position, packaging type and condition, cellaring start, production date, batch/lot, acquisition and provenance fields, condition notes, tags, attachments, lifecycle state, custom-blend flag, recipe and recipe history.
- `StorageLocation`: `tobacco` and `pipes` module values, `tobacco_cellar` and `pipe_rack` location types.
- `CollectionActivity`: `specialization_changed` and `recipe_revised` event types.

All new fields are optional. No existing field was renamed, retyped or removed, and no stored record was migrated.

### Shared logic
- `src/lib/collection/specialization.js` — current specializations, diff, change description, activity payload, and the single write path (`applySpecializationChange`) that updates the pipe and appends history.
- `src/lib/collection/cellar.js` — cellaring duration, packaging summary, open vs cellared quantities, inventory reconciliation, recipe validation, recipe activity.
- `src/lib/curator/specializationReview.js` — deterministic review: recorded characteristics, session evidence per blend family, candidate classifications with rationale and confidence, and a proposal only when session evidence supports it.
- `src/lib/reports/pipeCollectionReports.js` — five report builders sharing one shape, each row carrying the records behind it.
- `src/lib/reports/pipeCollectionReportPdf.js` — printable PDF rendered from the same report objects.

### Interfaces
- Pipe detail → Specialization tab: existing editor, plus **Curator specialization review** and **specialization history**.
- Tobacco detail → **Cellar documentation**: storage, packaging, production/batch, cellaring duration, quantity discrepancy warning, recipe editor with revision history, attachments (stored privately).
- Reports → **Pipes & Cellar** tab: specialization report, cellar composition (family, packaging, storage), pipe condition report, maker summary, collection completeness, cellar-age buckets, and a two-pipe characteristic comparison. Every row drills into the records; one button prints all five reports.
- Curator chat: specialization answers are grounded in the structured review; a proposed classification can be applied in-chat after an explicit confirmation, and the change is written to history.

## 3. Behaviour guarantees

- **Specialization ≠ pairing.** `classifyIntent` now resolves reassignment/specialization phrasing before generic follow-ups, and the review path never reads pairing scores. A pairing question still routes to the existing pairing branches.
- **No silent change.** Curator's proposal is a suggestion; nothing is written until the collector confirms, and every applied change produces a dated `specialization_changed` row.
- **No invented quantities.** Reconciliation only reports a discrepancy the record can prove; a missing quantity stays missing.
- **Boundaries.** No consumption encouragement, no session scheduling, no restock or purchasing guidance, no retailer links. Reports are descriptive.

## 4. Verification

| Check | Result |
|---|---|
| New logic tests (`pipeTobaccoIntelligence.test.js`) | 26 passed |
| Full regression suite | 3,410 passed, 1 pre-existing telemetry guard failure — fixed in this pass |
| Production build | Clean |
| Schema acceptance (blend create with all new fields) | Accepted; every field read back identically |
| Storage assignment | Blend assigned to a tobacco cellar location; position note persisted |
| Inventory maths | 8 oz total / 4 oz cellared / 4 oz open, matching the canonical helpers |
| History write | `storage_change` row written with record id and timestamp |
| Live collection | 500 pipes (84 with a specialization), 500 blends (126 with a cellaring date) |
| Cleanup | Verification blend, its history row and the test location removed |

Mobile: the new sections are single-column below `sm`, use wrapping text, 44px+ tap targets for actions, and native selects for long option lists.

## 5. Known gaps (recorded in the tracker)

- Specialization history for changes made before this release does not exist; history starts at the first change made in the app.
- Storage movement history is captured as a `storage_change` activity per blend, not as a per-move ledger.
- Curator's review uses logged sessions and recorded characteristics; it does not analyse free-text tasting notes.
- New UI strings are English only; other locales fall back to English until translated.
