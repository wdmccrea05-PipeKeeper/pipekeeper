# CigarKeeper Preservation System & Feature Entitlements — Implementation Report

Date: 2026-11-27
Scope: CigarKeeper records, humidor and storage management, dashboard, Curator cigar reasoning, feature entitlement matrix and server-side authorization verification.

---

## 1. Audit — what already existed and was reused

| Capability | Existing owner | Decision |
|---|---|---|
| Cigar identity, dimensions, wrapper/binder/filler, box date, batch, quantity, photos, documents, lifecycle | `Cigar` entity, `CigarForm`, `CigarDetail`, CI 2.0 record framework | Reused. **No schema change to `Cigar`.** |
| Humidors, capacity, targets, humidity aid, maintenance cadence, alerts | `HumidorLocation`, `HumidorManager`, `humidorMaintenanceUtils`, `getDetailedHumidorHealth` | Enhanced in place — dimensions, tolerance band and module added; existing form extended, not replaced. |
| Maintenance and inspection records | `HumidorMaintenanceLog`, `HumidorMaintenanceLog` component | Reused. Surfaced in the new humidor detail view. |
| Inventory maths, depletion, readiness | `cigarInventory.js`, `agingReadiness.js`, `cigarSelectors.js` | Reused. The dashboard reads the canonical valuation selectors; no second quantity model. |
| Aging readiness and humidor health | `AgingTabContent` in `CigarDetail` | Reused; storage panel added beside it. |
| Cigar insights | `CigarInsights` (two existing screens) | Untouched. |
| Curator context pipeline | `buildCuratorContextWithLogging`, `curatorOperationsEngine`, `CuratorWorkspace` | Extended — humidors and readings added to the existing single context build. |
| Entitlements | `resolveModuleAccess`, `premiumAccessResolver`, `requireEntitlement`, `EntitlementAudit`, `AdminSubscriptionTools` | Reused. No second resolver was created. |

## 2. What was built

### Data
- `HumidorReading` (new): dated humidity/temperature readings per humidor — the series behind the environment chart and threshold alerts.
- `CigarRating` (new): dated, structured ratings. Each category (construction, draw, burn, aroma, flavor, overall) is optional, and ratings accumulate rather than overwrite, so historical ratings are preserved.
- `HumidorLocation` (extended): interior width/depth/height, shelf count, layout notes, explicit tolerance band (min/max RH and °F), `module`.
- `CollectionActivity` (extended): `humidor_id` and `humidor_name`, so storage movements can be read per humidor.

Every new field is optional. No stored record was migrated and no existing field was renamed or retyped.

### Shared logic (`src/lib/cigars/`)
- `cigarRatings.js` — normalisation, per-category averages, completeness, collection summary, latest-per-cigar.
- `humidorEnvironment.js` — the collector's band (explicit → around target → default), per-reading evaluation, chart series, summary, alerts.
- `humidorInventory.js` — documented sticks, storage distribution, reconciliation, movement history, aging buckets.
- `cigarDocumentation.js` — completeness, missing-field ranking, and the drill-down presets the list understands.
- `cigarDashboard.js` — the metric registry: eleven metrics across seven groups, each carrying the drill-down it belongs to.
- `cigarCollectionBrief.js` — a deterministic, descriptive brief (also used as Curator guidance context).
- `logStorageChange.js` — the single write path for a movement entry.

### Interfaces
- **CigarKeeper dashboard** (`CigarKeeperDashboard`): composition, storage distribution, documentation completeness, aging and condition, environmental records, historical ratings, recorded cost and estimated value. Every figure and every breakdown row opens the underlying filtered records (`/Cigars?preset=…`, `?humidor=…`, `?condition=…`, `?q=…`), and the list shows what is being filtered with a clear action.
- **Humidor detail** (`HumidorDetailDialog`): environment chart with the collector's band, reading entry, reading history, reconciliation against assigned records, assigned-record list, storage movements, maintenance history. Opened from each humidor card and directly from a dashboard drill-down.
- **Cigar detail**: a Ratings tab (structured, dated, deletable observations) and a storage panel in the Aging tab (assignment, position, documented aging, condition, movement history).
- **Curator**: humidors and readings now reach the context it already builds, and a dedicated guidance section teaches it to explain humidor assignment, environment status, condition and aging — descriptive only.

### Boundaries
No consumption encouragement, no smoking schedule, no restocking or purchasing suggestion, no retailer or availability reference. The dashboard metric registry contains no commercial metric (asserted by test), and the Curator section restates the boundary for cigars.

## 3. Entitlements

### Matrix
`src/lib/entitlements/featureMatrix.js` is the single matrix: 17 rows across collection, storage, environment, intelligence, reports and value.

- **Free (preserved, enforced):** inventory, acquisition documentation, records and photographs, basic storage management, tray/shelf/drawer positions, structured ratings, humidor maintenance records, manual readings.
- **Pro (live, enforced):** Curator collection analysis, valuation, insights screens, report generation.
- **Proposed (`enforcement: 'proposed'`, never blocked):** environmental history and threshold alerts, humidor reconciliation, configurable dashboard metrics and advanced reporting, insurance/estate exports, Curator advanced explanations.

A proposed row reports what it *would* require and returns `allowed: true, enforced: false`. Nothing a collector can open today is closed by this release. The indicator component (`FeatureAvailabilityBadge`) renders exactly that distinction.

### Server-side authorization — verified, not assumed
A guard test (`serverAuthorizationGuard.test.js`) reads the deployed functions from disk. Findings:

- **18 premium surfaces** (report generators, Curator actions, enrichment, image lookups) all authenticate the caller and scope collection reads to that collector.
- **Only two functions import the entitlement guard** (`generateAgingReportExcel`, `generateAgingReportPDF`), and both call it as `requireEntitlement(base44, user, 'EXPORT_REPORTS')` while the helper expects `(req, requiredTier)`. **The result is never checked, so the guard is a no-op today.** This is a real defect, recorded as a known-misused call site in the test so it cannot drift silently.
- Fixing those two call sites would enforce a Pro requirement on report generation — an entitlement change. Per the request, it is **listed for approval below and not enforced**.

### Scenario coverage
Existing regression suites already cover the subscription scenarios; they were run, not duplicated:
`entitlementSplitBrainRegression`, `proTrialEntitlement` / `proTrialWiring`, `lifecycleMatrix`, `contractReconciler`, `billingLifecycleReconciler`, `appleSyncFailureRegression`, `threeModuleBundleRegression`, `duplicateSubscriptionGuard`, `finalEntitlementReconciliation`, `historicalPlanReconstruction`, `productScopeResolver`, `canonicalBillingDataset`, `reconcileEntitlementForUser`, `adminEntitlementAccess`, `moduleVisibilityEntitlementGuard`, `subscriptionCheckoutSafetyGate`, `subscriptionCallbackErrors`.

The new matrix test adds: no duplicate ids, free rights preserved, live Pro enforcement, proposed rows never blocking, unknown features failing open (never silently locking a collector out), tier ordering, and matrix summary consistency.

## 4. Verification

| Check | Result |
|---|---|
| New suites — `cigarPreservation` (27), `featureEntitlementMatrix` (10), `serverAuthorizationGuard` (5) | 42 passed |
| Full regression suite | 3,453 passed across 206 files |
| Production build | Clean |
| Live writes — humidor with dimensions and band | Persisted exactly (100 cap / 14×10×8 / 2 shelves, 62–72% RH, 65–75 °F) |
| Live writes — cigar assignment with position | Persisted (`humidor_id`, shelf 2, tray A) |
| Live writes — environmental reading | Persisted (78% RH / 68 °F), correctly outside the 62–72 band |
| Live writes — structured rating with an empty category | Persisted (`burn: null`), average 4.33 over the three recorded categories |
| Live writes — storage movement | Persisted with `humidor_id` and `storage_change` |
| Reconciliation maths | 40 documented sticks vs 30 documented count → difference 10 → `records_exceed_documented` |
| Cleanup | Verification humidor, cigar, reading, rating and movement all removed — 0 leftovers |

Mobile: dashboard cards stack to one column, drill-down rows keep 28px+ targets, actions are 36–44px, and long labels truncate with the full value in the title.

## 5. Decisions requiring approval

1. **Enforce the entitlement guard on report generation.** Fix the two misused call sites to `requireEntitlement(req, 'pro')` and check the result. This takes reports away from free collectors today.
2. **Promote environmental history and reconciliation to Pro** (`cigars.environment_history`, `cigars.reconciliation`). Both ship visible to everyone in this release; promotion is a change of rights.
3. **Promote configurable dashboard metrics to Pro** and insurance/estate exports to Premium.
4. **Add module-level entitlement checks to the Curator actions** (`invokeCuratorLLM`, `startCuratorSession`, `persistCuratorMessage`, `extractCuratorSignals`, `logCuratorEvent`). They authenticate today but do not check module entitlement server-side.

## 6. Deferred (named, not built)

- Administrative diagnostics expansion: subscription inconsistency, failed entitlement checks, failed report generation, Curator errors, persistence failures, performance, feature configuration, complimentary periods and gift redemption already have surfaces (`ReconciliationDashboard`, `AdminSubscriptionTools`, `EntitlementAudit`, `ProviderVerificationPanel`, `CuratorAnalyticsDashboard`, `AppreciationCampaignAdmin`); a single consolidated diagnostics screen with per-category drill-down was **not** built in this pass.
- An admin UI for the matrix (it is a code module plus the badge component today).
- Temperature/humidity sensor import (readings are manual).
- Localisation of the new strings (English fallbacks are live).
