# CollectionKeeper — Collection Intelligence 2.0 Tracker

**Persistent development tracker.** Update this file as work lands; it is the
single record of what is done, what is next and what is blocked.

- **Version:** 2.0.0
- **Opened:** 2026-11-27
- **Companion:** `AUDIT.md` (findings and evidence)

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
| CI2-01 | **P0** RLS rollout for collection entities | blocked | 66 of 75 entities have no `rls`. Needs staged, per-module application with verification. Start with `Pipe`, then `TobaccoBlend`, `Bottle`, `Wine`, `Cigar`. Pattern: read/update/delete owner-or-admin via `created_by`; create for logged-in users. Must be verified against each collection page before the next entity. |
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

---

## Test baseline

| Run | Result | Date |
|---|---|---|
| New guard-rail suites (2 files, 41 tests) | 41 passed | 2026-11-27 |
| Collection regression subset (10 files, 160 tests) | 160 passed | 2026-11-27 |
| Production build | Clean | 2026-11-27 |

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
