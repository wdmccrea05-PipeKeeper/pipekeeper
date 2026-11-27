# CollectionKeeper — Collection Intelligence 2.0 Production Readiness Review

- **Review date:** 2026-11-27
- **Scope:** Collection Intelligence 2.0 (batches A–I) against the actual repository, production data and automated tests
- **Method:** direct inspection of source, entity schemas, production records, backend function inventory, test execution and production build. Claims in earlier batch reports were re-verified rather than accepted.
- **Verdict:** **Not production-ready.** One critical security blocker remains (row-level security coverage). Everything else verified below is green.

---

## 1. Complete feature inventory

Verified present in the repository and routed in `src/App.jsx`:

| Area | Surface | State |
|---|---|---|
| Hub | `CollectionHub`, module cards, quick launch, recent activity | present |
| PipeKeeper | collection, detail, specialization, break-in, rotation, maintenance, condition tracker | present |
| Tobacco cellar | blend detail, cellar documentation, packaging/cellaring maths, recipes, aging dashboard | present |
| CigarKeeper | collection, detail, humidors, readings, structured ratings, storage panel, dashboard | present |
| WhiskeyKeeper | collection, bottle detail, fill records, infinity bottles, tastings, value intelligence | present |
| WineKeeper | collection, detail, inspections, drinking windows, insights | present |
| Curator | workspace, persistent threads, grounding, record-change proposals, specialization review, reports | present |
| Sharing | `ShareCenter`, `ShareRecordModal`, server-side `publicShare`, public route, gifting | present |
| Valuation | `ValuationCenter`, append-only ledger, privacy layer, 8 report models, PDF/CSV | present |
| Reporting | `ReportingCenter`, catalog (20 reports), filters, charts, drill-down, saved views, export | present |
| Collection tools | bulk edit, duplicate detection, merge, lifecycle filter, CSV export | present |
| Administration | `AdminDiagnostics`, reconciliation dashboards, campaign admin, referral admin | present |
| Entitlements | feature matrix, availability badge, server-side guard | present |

## 2. Implemented functionality (verified this review)

- 84 entity schemas on disk; 23 carry row-level security (61 do not — see §10).
- 205 backend functions deployed; the CI 2.0 additions are present (`publicShare`, `giftCodes`, `collectionItemBulkUpdate`, `collectionItemMerge`, `collectionItemDuplicates`, `curatorRecordChange`, `persistCuratorMessage`, `curatorConversationHistory`, `adminDiagnostics`, `reportCenter`).
- Product-boundary clause is imported by `src/lib/curator/curatorSystemPrompt.js` and injected into the Curator system prompt (`CURATOR_BOUNDARY_CLAUSE`, line 124).
- Help knowledge base covers 55 articles after this review, including the four new CI 2.0 surfaces.

## 3. Files and entities changed in this review

| File | Change |
|---|---|
| `base44/entities/StorageLocation.jsonc` | Added owner-or-admin `rls` (read/create/update/delete) |
| `src/__tests__/curatorIntelligenceUpgrade.test.js` | Guard test matched optional-chaining call shape (was failing) |
| `src/__tests__/shareAndSimilarParity.test.js` | Guard test now asserts the module-agnostic share route and the projection's cigar support (was failing) |
| `src/components/help/collectionIntelligenceArticles.jsx` | New: four CI 2.0 help articles |
| `src/components/help/documentationRegistry.jsx` | Imports and spreads the new articles; 13 new topic shortcuts; net −71 lines |
| `docs/collection-intelligence-2.0/PRODUCTION_READINESS_REVIEW.md` | New: this document |
| `docs/collection-intelligence-2.0/RELEASE_NOTES_2.0.md` | New: release notes |
| `docs/collection-intelligence-2.0/ROLLBACK_PLAN.md` | New: rollback procedure |
| `docs/collection-intelligence-2.0/TRACKER.md` | Updated baseline, defect log and statuses |

No production collection record was created, modified or deleted during this review.

## 4. Migration status

- **Schema migrations:** none required. Every field added in batches F–I is optional, so existing records remain valid.
- **Data backfills:** none performed. Verified legacy gaps are listed in §6 and §10; none block reading or writing a record.
- **`src/entities/*.json` duplicates:** 13 legacy copies still exist alongside `base44/entities` (CI2-055). They are not read at runtime; removal is a cleanup task, not a migration.
- **Deployment dependency:** the new `rls` block on `StorageLocation` is read by the platform at deploy time. No secret, price ID or environment variable changed.

## 5. Automated test results

| Run | Result |
|---|---|
| Full suite (`npx vitest run`) | **211 files, 3,630 tests, 3,630 passed** (133s) |
| Two guard suites failing at review start | Fixed: `curatorIntelligenceUpgrade`, `shareAndSimilarParity` |
| Production build (`npx vite build`) | Clean, exit 0 |

Both initial failures were stale source assertions, not product defects: one expected `invoke('persistCuratorMessage'` while the code uses `invoke?.(`, the other expected cigar branches in `PublicSharedRecord` after the page became module-agnostic. Each test was re-pointed at the real, verified implementation rather than deleted.

## 6. Manual verification results

**Data integrity (production, full pagination — not truncated):**

| Entity | Records |
|---|---|
| Pipe | 3,775 |
| TobaccoBlend | 6,077 |
| Bottle | 237 |
| Cigar | 96 |
| Wine | 13 |
| HumidorLocation | 5 |
| SmokingLog | 3,712 |
| StorageLocation | 0 |
| ValuationRecord | 0 |

- **Orphaned storage references:** 0 across all modules; orphaned humidor references: 0.
- **Orphaned valuation entries:** 0.
- **Orphaned session references:** 63 smoking logs reference a deleted pipe or blend and carry no external-item name. These are historical records, left untouched; they render with their own date and notes.
- **Duplicate name groups:** 68 pipe groups, 81 blend groups share a name within the same owner. This is expected for multiple tins of one blend and repeated model names; the Duplicates tool exists to review and merge real duplicates. No automatic merge performed.
- **Inventory gaps:** 17 cigar records have no `quantity`. Left as-is (inventing a count would corrupt inventory); they surface in the Duplicates/Collection Tools views.
- **Unused surface:** `StorageLocation` holds no records and no collection record references it — the modules store free-text `storage_note`/`humidor_id` instead. Recorded as a product decision, not a defect.
- **Valuation ledger:** no valuation entries exist in production yet, so valuation totals are empty by data, not by failure.

**An earlier measurement in this review reported 518 orphaned sessions.** That figure was wrong: it came from lists capped at 3,000 records while the collections hold 3,775 pipes and 6,077 blends. Re-run with full cursor pagination, the true count is 63. Sampling the "missing" ids by direct fetch confirmed they exist.

## 7. Performance findings

- The dashboard and collection pages fetch with cursor pagination (`fetchAllEntities`), so the 3,775-pipe and 6,077-blend collections load without truncation.
- `PairingInsights` scoring runs per pipe × blend; on this data volume the report is the heaviest surface. Recommendation: keep the existing active-record filter (implemented) and avoid adding cross-module scans to the same render.
- Reporting Center aggregates on the server; no new client-side full-collection aggregation was introduced.
- No regression in build size or build time (clean build).

## 8. Security findings

1. **Critical — RLS coverage.** 61 of 84 entities have no `rls` block, which leaves those records readable by any authenticated user. This includes the core collection entities (`Pipe`, `TobaccoBlend`, `Cigar`, `Bottle`, `Wine`), the log entities and `Subscription`. Verified ownership data supports a safe owner-or-admin rule: 100% of pipes, blends, cigars, bottles and wines carry both `created_by` and `created_by_id`.
2. **Fixed — `StorageLocation`.** Added owner-or-admin RLS in this review (0 existing records, so no behaviour change on read).
3. **Verified — sharing is server-enforced.** The public share view is produced by `publicShare`/`shareProjection`, never by reading `SharedRecord` anonymously; financial fields are excluded by the projection.
4. **Verified — entitlements are server-checked.** `base44/shared/requireEntitlement.ts` and `resolveCuratorAccess` guard the premium functions; `serverAuthorizationGuard.test.js` asserts authentication and collector-scoped access on the premium function set.
5. **Limitation:** end-user visibility under RLS cannot be exercised from this environment (the data tooling bypasses RLS). Any RLS change must be verified against each collection page as a signed-in user before release.

## 9. Subscription verification

- **Verified by test:** entitlement resolution, plan/product mapping, duplicate-subscription guarding, lifecycle reconciliation, Apple JWS verification, referral access and free/Pro gating are covered by the passing suites (`entitlement*`, `duplicateSubscriptionGuard`, `billingLifecycleReconciler`, `appleJwsVerifierSecurity`, `proTrialEntitlement`, and others).
- **Not verifiable here:** live Stripe checkout, Stripe webhook delivery, Apple In-App Purchase and purchase restoration require the provider consoles and a signed-in test purchase. No payment flow was executed during this review, and no subscription record was modified.
- **Known open items unchanged:** Apple deferred upgrade is unsupported by the platform (CI2 open), and `Subscription` itself has no RLS (§8).

## 10. Remaining blockers

| # | Blocker | Severity | Why it is not closed |
|---|---|---|---|
| 1 | RLS missing on 61 entities, including the five core collection entities and `Subscription` | Critical | Requires rewriting each schema in full and verifying each module as a signed-in user; entity files cannot be patched in place, and RLS visibility cannot be exercised from this environment |
| 2 | Product-boundary decisions on existing surfaces (`ShoppingList`, `WantList`, `purchaseRestockEngine`, `upcLookup`, retailer-scoped image queries) | High (decision) | Removing them deletes user-visible functionality and user data; needs an explicit product decision (Batch E) |
| 3 | AI valuation prompt cites dealer sites and eBay sold listings (`ValueLookup.jsx`) | Medium | Same Batch E decision; the output is labelled an unverified estimate but the research sources need sign-off |
| 4 | Translations for CI 2.0 strings in non-English locales | Medium | English fallbacks are live; 7 locales incomplete (CI2-084, CI2-105) |
| 5 | Campaign sender workflow stalls after one batch (CI2-053) | High | Not addressed in this review |
| 6 | 17 cigar records without inventory quantity | Low | Needs a product decision on defaulting, not a silent backfill |

## 11. Deployment readiness

- Code, schemas and tests are consistent: build clean, 3,630/3,630 tests passing.
- No destructive migration, no secret change, no price change, no data rewrite.
- **Publish is blocked on blocker 1.** Publishing with 61 unprotected entities would ship a known privacy defect.

## 12a. Usability and complexity acceptance (added after the CI 2.0 simplification pass)

Release is blocked unless every line below passes. Automated checks live in
`src/__tests__/usabilityMobileAcceptance.test.js` and `src/__tests__/curatorSimpleUi.test.js`;
the review record is `USABILITY_AUDIT_2026-11-27.md`.

| Check | Requirement | Status |
|---|---|---|
| U1 | No audited screen sizes itself with `100vh`; dynamic viewport units only | Passing |
| U2 | No non-responsive grid of four or more columns on an audited screen | Passing |
| U3 | No fixed-width panel wider than 320px on an audited screen | Passing |
| U4 | Every audited screen that renders records has an empty state | Passing |
| U5 | Hub reaches any module in one tap and a record in two | Passing |
| U6 | Reporting is reachable in two taps through the one Reporting Center | Passing |
| U7 | Curator opens on the conversation; analytical surfaces stay collapsed | Passing |
| U8 | Dialogs and sheets stay inside the viewport | Passing |
| U9 | Curator keeps one input, at most three suggestions, and Stop / Retry | Passing |
| U10 | Every journey in the usability audit completes in three taps or fewer | Passing |

## 12. Recommended release sequence

1. **Stage 1 (security):** apply owner-or-admin RLS to `Pipe`, `TobaccoBlend`, `Cigar`, `Bottle`, `Wine` one at a time; after each, sign in as a non-owner account and confirm the collection page shows only that account's records, then confirm the owner still sees everything.
2. **Stage 2 (security):** apply RLS to the log entities (`SmokingLog`, `TastingLog`, `CellarLog`, `PipeMaintenanceLog`, `HumidorMaintenanceLog`, `CigarSession`, `WineTasting`), then `Subscription` using `user_email` **and** `user_id` (Apple rows may lack an email).
3. **Stage 3 (security):** apply admin-only write / logged-in read to reference data (`PairingMatrix`, `TobacconistKnowledge`, `TobaccoLogoLibrary`, `RemoteConfig`), verifying the pages that read them.
4. **Stage 4 (product):** resolve Batch E decisions; then either remove or explicitly retain each purchase-adjacent surface, and update the Curator/valuation copy accordingly.
5. **Stage 5 (polish):** complete non-English translations, fix the campaign sender loop, decide the cigar quantity default.
6. **Stage 6:** run the full suite and build, then publish with owner approval.

Rollback for every stage is in `ROLLBACK_PLAN.md`.
