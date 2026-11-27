# CollectionKeeper — Collection Intelligence 2.0 Audit

**Version:** 2.0.0
**Audit date:** 2026-11-27
**Scope:** CollectionKeeper, PipeKeeper, CigarKeeper, WhiskeyKeeper, WineKeeper, Curator, Pipe Club, reporting, subscription management, onboarding, administration, shared services.

---

## 1. Method

The audit was performed against the actual repository, not against prior reports:

- Entity schemas read directly from `base44/entities/` (75 schemas).
- Backend functions enumerated from `base44/functions/` (195 `entry.ts` handlers).
- Frontend pages, components and libraries enumerated from `src/`.
- Valuation, inventory, storage, condition and sharing implementations traced by call site.
- Automated test baseline executed with `npx vitest run`.
- Production build verified with `npx vite build`.

Nothing was deleted or rewritten. Every change in this pass is additive, or a delegation that preserves the existing public function signatures.

---

## 2. Inventory

| Surface | Count | Notes |
|---|---|---|
| Entity schemas | 75 | 66 have no `rls` block (see §8) |
| Backend functions | 195 | Includes ~35 one-off audit/diagnostic functions |
| Pages | 78 | 4 modules + hub + admin + support |
| Shared server modules (`base44/shared`) | 39 | Entitlement, billing, campaign, email |
| Shared client libraries (`src/lib`) | 191 files | `lib/collection` is the canonical selector layer |
| Test files | 85 | 83 pre-existing + 2 added in this pass |
| Workflows | 7 | 5 active, 2 auto-paused |

---

## 3. Feature matrix

Status legend: **Complete** = implemented, wired, covered by tests. **Partial** = works but incomplete or not consistently applied. **Defective** = implemented but produces wrong or inconsistent results. **Missing** = not present.

### 3.1 Collection modules

| Capability | Status | Evidence / notes |
|---|---|---|
| Pipe collection CRUD | Complete | `pages/Pipes`, `PipeKeeper`, `PipeDetail`, `PipeForm`; `Pipe`, `TobaccoBlend`, `TobaccoContainer`; `pipekeeperIOSRegression.test.js` |
| Tobacco cellar inventory | Complete | `CellarLog`, `TobaccoContainer`, `tobaccoQuantityHelpers`, `CellarAgingDashboard` |
| Cigar collection + humidors | Complete | `Cigar`, `HumidorLocation`, `HumidorMaintenanceLog`, `CigarSession`; `cigarKeeperAccessFlow.test.js` |
| Whiskey collection + inventory units | Complete | `Bottle`, `WhiskeyInventoryUnit`, `BottleValueSnapshot`; `whiskeyInventoryLifecycle.test.js` |
| Wine collection + tastings | Complete | `Wine`, `WineTasting`; `winekeeperLaunchReadiness.test.js` |
| Module release gating | Complete | `LockedModuleGuard`, `moduleReleaseState`, 6 winekeeper gating tests |
| Module value aggregation | **Defective → fixed** | Two competing valuation paths disagreed (§5.1) |
| Wine value in hub aggregation | **Missing → fixed** | No wine path in `keeper-core/value/valueAggregation` (§5.2) |

### 3.2 Curator

| Capability | Status | Evidence / notes |
|---|---|---|
| Deterministic + LLM chat routing | Complete | `engineRouter`, `curatorDeterministicChat`, `curatorIntentClassifier` |
| Pairing engine + certification | Complete | `pairingEngine`, `__tests__/certification/*` |
| Recommendation schema and grouping | Complete | `recommendationSchema`, `recommendationGrouping` |
| Session planning | Complete | `sessionPlanner`, `CuratorPlanSession` |
| Product-boundary compliance | **Missing → fixed in prompt** | Clause added (§5.3); report and marketing surfaces still unguarded (backlog) |
| Acquisition-oriented surfaces | **Boundary conflict** | `CuratorPurchaseQueue`, `purchaseRestockEngine` (§7) |
| Chat hang / state loop | Defective (open) | Long-standing known issue, not reproduced in this pass |

### 3.3 Pipe Club, reporting, administration

| Capability | Status | Notes |
|---|---|---|
| Pipe Club sessions | Complete | `PipeClubSession`, wizard, history, multi-blend scoring |
| Collection reports (CSV/PDF) | Partial | `lib/reports/collectionReportCsv`, `collectionReportPdf`; no shared report registry |
| Insurance / estate exports | Partial | Per-module exporters, no shared contract |
| Subscription + entitlements | Complete | `UserEntitlement`, `ActiveContract`, `requireEntitlement`, `premiumAccessResolver`; 12 entitlement tests |
| Complimentary Pro (welcome trial) | Complete | `proTrial.ts` + client resolver; `proTrialEntitlement.test.js` |
| Complimentary Pro (appreciation grant) | Complete | `AppreciationGrant`, `activateAppreciationCampaign`, deadline enforced server-side |
| Onboarding | Complete | `OnboardingRouter`, module selection, per-module onboarding |
| Admin dashboards | Partial | 6 separate admin pages, no unified index |
| Email campaign delivery | **Defective** | Sender workflow drains one 60-recipient batch per campaign then stalls (§6.1) |

### 3.4 Shared services

| Service | Before | Now |
|---|---|---|
| Valuation | Two divergent implementations | Single canonical engine; keeper-core delegates |
| Inventory lifecycle | `lib/collection/inventoryLifecycle` | Unchanged (canonical) |
| Storage | `StorageLocation`, `HumidorLocation` per module | Unchanged |
| Condition history | Per-module logs only, no shared reader | `lib/collection/conditionHistory` added |
| Provenance | Implicit fields only, no service | `lib/collection/provenance` added |
| Analytics | `lib/collection/*Selectors` + `keeper-core/aggregation` | Unchanged (canonical) |
| Reporting | Per-surface exporters | Unchanged (backlog) |
| Sharing | `SharedRecord`, `shareUtils`, `PublicSharedRecord` | Unchanged (canonical) |
| Product boundaries | Absent | `lib/collection/boundaries` added |

---

## 4. Shared architecture established

`src/lib/collection/` is the single shared layer for cross-module collection logic.

```
src/lib/collection/
  index.js              barrel — import shared collection logic from here
  boundaries.js         NEW  product-boundary policy + Curator clause
  provenance.js         NEW  acquisition history, provenance completeness
  conditionHistory.js   NEW  unified condition / care timeline
  inventoryLifecycle.js      inventory transitions (existing)
  *Selectors.js              per-module metrics (existing)
  summarySelectors.js        cross-module totals (existing)
```

Rule going forward: a capability used by more than one module is implemented in
`src/lib/collection/` and imported from the barrel. Module folders may compose it,
never re-implement it.

Server-side equivalents live in `base44/shared/` and follow the same rule.

---

## 5. Foundational defects corrected in this pass

### 5.1 Divergent valuation implementations (fixed)

**Defect.** `src/components/keeper-core/value/valueAggregation.jsx` computed values with
its own field-precedence chains while `src/components/valuation/valueEngine.js` computed the
same values differently. The Collection Hub and the module dashboards could therefore show
different totals for the same collection. Tobacco was the worst case: the hub returned the
unit estimate while the engine priced quantity × per-ounce rate.

**Fix.** `valueAggregation` now delegates pipe, tobacco and bottle values to
`computeCurrentValue` from the canonical engine. Public signatures unchanged
(`getPipeValue`, `getTobaccoValue`, `getBottleValue`, `getCigarValue`,
`getValueByModuleType`, `formatCurrencyValue`, `calculateEcosystemValueMetrics`).
Tobacco keeps its stored unit estimate when a blend has no recorded inventory quantity, so
no blend is reported as zero.

**Consumers verified:** `src/components/keeper-core/index.jsx`, `src/pages/CollectionHub.jsx`.

### 5.2 Missing wine value path (fixed)

**Defect.** `getValueByModuleType` handled pipes, tobacco, whiskey, cigars and coffee but not
wine, so any caller resolving a wine through the hub got `0`.

**Fix.** Added `getWineValue` and the `wine` / `wines` cases.

### 5.3 No enforceable product boundary (fixed for Curator)

**Defect.** Product boundaries existed only as intent. Nothing in the codebase prevented
Curator, reports or copy from producing purchasing guidance.

**Fix.** `src/lib/collection/boundaries.js` defines the permitted lanes, the seven excluded
lanes with detection patterns, `classifyText`, `assertWithinBoundaries`, and the canonical
`CURATOR_BOUNDARY_CLAUSE`. `src/lib/curator/curatorSystemPrompt.js` composes that clause and
rule 16 (restock) was reframed from acquisition advice to documentation and planning.

### 5.4 No provenance or condition-history service (fixed)

Both are cross-module problems that had no shared home. They now exist as read-only services
with normalisers matched to the real entity schemas (`AcquisitionItem`, `PipeMaintenanceLog`,
`HumidorMaintenanceLog`, `CellarLog`).

---

## 6. Defects found and deliberately not changed

These are recorded rather than patched because each needs a product decision or a data
migration, and changing them silently would violate the preserve-functionality requirement.

### 6.1 Email campaign sender stalls after one batch (P1)

`base44/workflows/Appreciation Email Campaign Sender.jsonc` calls `run_due`, which selects
campaigns with `status === "scheduled"`. `processQueue` then sets status to `"sending"`, which
`run_due` no longer matches. A campaign therefore sends one batch of 60 and never resumes.
Observed live during the appreciation campaign delivery on 2026-11-27; the remaining queue was
delivered by explicit batched invocations.

### 6.2 `calculateEcosystemValueMetrics` omits wine (P2)

Returns `{pipes, tobacco, whiskey, cigars}`. Adding a wine bucket changes every displayed
percentage, so it needs a UI decision first.

### 6.3 Cigar valuation remains on a separate path (P2)

`getCigarValue` still calls `calculateCigarValue` rather than the canonical engine. Numbers are
correct today; consolidation is deferred so cigar values do not shift mid-season.

### 6.4 Duplicate entity definitions (P2)

`src/entities/` holds 15 JSON schemas that duplicate `base44/entities/` (`Pipe`-adjacent,
`Cigar`, `Wine`, `AcquisitionItem`, …), plus `ProductImageLibrary` and `RecordImageLink` which
have no `base44/entities` counterpart. This is a live drift risk.

### 6.5 One-off diagnostic functions (P3)

Roughly 35 of the 195 backend functions are one-shot audits (`i18nAudit*`, `publishGate*`,
`AUDIT_SUMMARY_REPORT`, …). They are reachable endpoints and add surface area.

---

## 7. Product-boundary compliance register

Existing surfaces that conflict with the mandatory boundaries. **None were removed** — they
hold user data and the brief requires preserving existing functionality. Each needs a product
decision recorded in the tracker.

| Surface | Conflict | Recommended direction |
|---|---|---|
| `src/lib/curator/purchaseRestockEngine.js` | Purchase/restock recommendations | Reframe as depletion and preservation planning |
| `src/components/curator/CuratorPurchaseQueue.jsx` | Purchase queue UI | Reframe as acquisition-documentation queue |
| `src/pages/ShoppingList.jsx`, `ShoppingListItem` | Shopping list | Merge into Want List as documentation of interest |
| `src/pages/WantList.jsx`, `AcquisitionItem` | `source_url` retailer links, `target_price` | Keep as historical record; suppress live links |
| `src/components/identify/upcLookup.js` | Retail product lookup | Restrict to identification, never availability |
| `src/lib/images/productImage*`, `trustedImageSources` | Retailer product imagery pipeline | Restrict to documentation imagery, no retailer attribution |
| `src/components/cigars/CigarValuationModal.jsx` | Market pricing emphasis | Keep valuation, remove market framing |

---

## 8. Security and ownership review

### 8.1 Row-level security (P0)

**66 of 75 entities have no `rls` block.** This includes every collection entity (`Pipe`,
`TobaccoBlend`, `Bottle`, `Wine`, `Cigar`), every log entity, and `AcquisitionItem`.

Current isolation is enforced in application code by filtering on `created_by` email. That is
a correctness convention, not an access control: any authenticated user who queries the entity
directly receives other collectors' records.

**Not changed in this pass**, deliberately. Applying rules to 66 entities at once would lock
users out of their own data if any rule disagrees with how a screen actually writes records.
Recommended rollout is in the tracker (CI2-01), one module at a time, with the owner-or-admin
pattern, verified against the collection pages before moving on.

### 8.2 Entitlement review

| Mechanism | Status |
|---|---|
| `UserEntitlement` + `ActiveContract` canonical reconciler | Complete, 12 tests |
| `requireEntitlement` server gate | Complete |
| `premiumAccessResolver` | Complete |
| Welcome trial (`proTrial`) | Complete, account-bound timestamps |
| Appreciation grant | Complete, server-enforced redemption deadline |
| Client feature gating | Complete, single resolver (`complimentaryPro`) |

No split-brain found between server and client gating in this pass.

### 8.3 Data persistence

Valuation snapshots (`ItemValueSnapshot`, `BottleValueSnapshot`) and `PriceObservation` persist
history correctly. Provenance has no dedicated store; it is derived from item fields and
`AcquisitionItem`. That is acceptable for 2.0 but a `ProvenanceEvent` entity is the natural
next step if ownership history needs to be append-only.

---

## 9. Test baseline and results

**Baseline established before changes:** 83 existing test files.

**Added in this pass:**

- `src/__tests__/collectionIntelligenceBoundaries.test.js` — 21 tests
- `src/__tests__/collectionIntelligenceSharedServices.test.js` — 20 tests

**Results:**

| Run | Result |
|---|---|
| New suites | 41 / 41 passed |
| Collection regression subset (10 files: collection page parity, detail parity, shared primitives, analytics parity, wine aggregation, module homepage, insights standardization, report engine, export completeness, share parity) | 160 / 160 passed |
| Production build (`vite build`) | Exit 0, clean |

The new guard-rails assert that valuation stays consolidated, that the wine path exists, and
that the boundary clause remains composed into the Curator prompt — so these fixes cannot
silently regress.

---

## 10. Documented for enhancement rather than rebuild

These already work and should be extended in place:

- `lib/collection/*Selectors` — add wine/cigar parity rather than new selectors.
- `keeper-core/aggregation` — reuse for any new cross-module rollup.
- `shareUtils` + `SharedRecord` — extend field selectors for new modules.
- `export/*Exporter` — introduce one shared export contract instead of new exporters.
- `reportingMetrics.ts` — the server-side reporting source of truth.
- `remoteConfig` — the right home for campaign and feature switches.

---

## 11. Open blockers

1. **RLS coverage (P0)** — 66 entities unprotected; needs staged rollout (§8.1).
2. **Boundary conflicts (P1)** — seven existing surfaces need product decisions (§7).
3. **Campaign sender stall (P1)** — workflow does not resume (§6.1).
4. **Curator chat hang (P2)** — not reproduced; needs a deterministic repro.
5. **Duplicate entity definitions (P2)** — drift risk (§6.4).

See `TRACKER.md` for ownership, batches and dependencies.
