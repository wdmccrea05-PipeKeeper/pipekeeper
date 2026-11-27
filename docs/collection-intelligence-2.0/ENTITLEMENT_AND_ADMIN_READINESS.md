# Subscription, entitlement and administration readiness — Collection Intelligence 2.0

Status: implemented and verified 2026-11-27.
Tests: `src/__tests__/entitlementReadiness.test.js` (18 assertions across 3 suites), plus the existing
`featureEntitlementMatrix`, `serverAuthorizationGuard`, `entitlementSplitBrainRegression`,
`reconcileEntitlementForUser` and `proTrialEntitlement` suites.
Build: `npx vite build` exits 0.

## 1. Audit of the existing architecture

Already present and deliberately **not** replaced:

| Layer | File | Role |
| --- | --- | --- |
| Frontend canonical module access | `src/components/utils/resolveModuleAccess.jsx` | One decision for module Pro access: admin → paid contract (incl. grace and canceled-paid-through) → grandfathered/legacy → complimentary Pro → none |
| Frontend entitlements object | `src/components/utils/premiumAccess.jsx` via `useEntitlements` | Tier, limits, `canUse`, `paidModules` |
| Grace / cancellation | `src/components/utils/gracePeriod.jsx` | 5-day grace, canceled-but-paid-through |
| Complimentary Pro | `src/components/utils/appreciationGrant.jsx`, `base44/shared/proTrial.ts`, `base44/shared/appreciationCampaign.ts` | 7-day welcome window + server-issued appreciation grant |
| Server guard | `base44/shared/requireEntitlement.ts` | Authenticates, resolves trial/grant/subscription/tier/legacy premium |
| Billing reconciliation | `base44/shared/reconcileEntitlementForUser.ts`, `subscriptionHelpers.ts`, `duplicateSubscriptionGuard.ts` | Provider truth, duplicate prevention |
| Reporting export gate | `base44/functions/reportCenter/entry.ts` | `requireEntitlement(req, "EXPORT_REPORTS")` |
| Admin surfaces | `ReconciliationDashboard`, `AdminSubscriptionTools`, `UserReport`, `EntitlementAudit` | Existing billing reconciliation views |

**Gap found:** `requireEntitlement` was used by only four functions (`reportCenter`,
`generateAgingReportPDF`, `generateAgingReportExcel`, plus its own entry). The AI-consuming Curator
endpoints authenticated the caller but did not check entitlement, so a free account could reach them
directly even though the UI gates Curator.

## 2. Implemented in this pass

### 2.1 Server-side Curator authorization

`base44/shared/curatorAccess.ts` resolves access with the same precedence the frontend uses:

1. administrator / owner / `is_admin`
2. active, trialing, grace-period, or canceled-but-paid-through subscription
3. explicit grandfathered provenance (`isFoundingMember`, `legacy_broad_module_access`)
4. complimentary Pro — 7-day welcome window, then the appreciation grant record
5. otherwise free → `403 CURATOR_REQUIRES_PRO`

Two deliberate properties:

- **No narrower than the frontend.** The server allows any granting subscription regardless of module
  scope, because Curator is cross-module. A collector who can open Curator today cannot lose it here.
- **Fails open on lookup failure only.** If the subscription lookup itself throws, access is allowed and
  the source is recorded as `unverified_lookup_error` (logged). Denying there would remove a paying
  collector's access because of an outage.

Applied to: `invokeCuratorLLM`, `curatorRecordChange`, `generateSessionRecommendation`.
`extractCuratorSignals` was already admin-only; the read-only conversation endpoints
(`curatorConversationHistory`, `persistCuratorMessage`, `logCuratorEvent`, `startCuratorSession`)
remain authentication-only, because they read and write the collector's own conversation and gating
them would break history for any account that lapses.

### 2.2 Collection-wide feature entitlement matrix

`src/lib/entitlements/collectionFeatureMatrix.js` — 21 rows across nine groups, every module:

- **Free, live (10):** inventory, records/photographs/notes, acquisition and provenance, basic storage
  and positions, ratings, search/filter/sort, lifecycle/archive, private documents, basic list CSV.
- **Pro, live (5):** Curator analysis, Curator record actions, Curator session recommendations,
  report export (PDF/CSV), plus report *viewing* kept free.
- **Proposed (6, blocking nothing):** configurable dashboards/advanced reporting, insurance and estate
  exports, Valuation Center, read-only share links, software gifting, advanced Curator depth.

### 2.3 Administrative diagnostics

`base44/functions/adminDiagnostics/entry.ts` (admin-only) + `/AdminDiagnostics` page.

| Requested area | How it is answered |
| --- | --- |
| Subscription inconsistencies | duplicate active owners, canceled-but-paid-through count, status and provider distributions |
| Failed entitlement checks | `EntitlementDriftCache` findings by severity and type |
| Curator errors | `CuratorActionRun` failures, last failure timestamp, median duration (30 days) |
| Gift membership redemption | `GiftCode` counts by status, redeemed, revoked |
| Complimentary access periods | active vs expired appreciation grants, welcome-window length |
| Feature configuration | grace period, provisional Apple expiry, welcome trial, legacy cutoff, module list |
| Failed report generation | **declared unavailable** — exports run client-side after the server gate |
| Data persistence failures | **declared unavailable** — no persistence-failure ledger exists |
| Application performance | **declared unavailable** server-side; Curator run duration is the only server-timed figure |

Privacy: aggregates only. No collector email, record contents, notes or payment identifiers are
returned; recipient identity on gifts is explicitly excluded. A signal without a source is reported as
unavailable, never as zero.

## 3. Decisions requiring approval before enforcement

None of these is enforced today. Each is visible in the admin matrix as “Awaiting approval”.

1. **Valuation Center → Pro.** Reachable by every collector today. Gating it would remove an existing right.
2. **Read-only share links → Pro.** Currently open to every collector and private by default.
3. **Bulk edit / merge / duplicate review → Pro.** Currently available to all through Collection Tools.
4. **Insurance and estate documentation → Pro.** Currently part of the free Valuation Center.
5. **Configurable dashboards and advanced reporting → Pro.** Built and visible to all in this release.
6. **Advanced Curator depth tier.** Would need a new gate, not merely a matrix row.
7. **Aging report functions** (`generateAgingReportPDF`, `generateAgingReportExcel`) still pass the SDK
   client rather than the request to the guard, so they cannot resolve a caller. Fixing them would
   enforce Pro on aging reports — an entitlement change. Left as-is and recorded in
   `serverAuthorizationGuard.test.js`.

Pricing was not touched. No entitlement was removed.

## 4. Test coverage

- Matrix: well-formed, unique ids, known modules, free rights preserved and never charged, report
  viewing free / export Pro, live Curator rows enforced, proposed rows never blocking, unknown feature
  unrestricted, summary arithmetic, grouping.
- Server: shared module exports the precedence helpers, grace period identical to the guard (5 days),
  canceled-but-paid-through logic present, all three AI-consuming functions resolve access from the
  request and return 403, and none accept a client-supplied `isPro`/`tier` claim.
- Diagnostics: admin-only, covers every requested area or declares it unavailable, payload contains no
  collector identity or record contents, unmeasured signals not reported as zero.

## 4b. Live result of the diagnostics function

`POST adminDiagnostics {}` → 200 in 643 ms (administrator account):

```
subscriptions: 197 records, 129 granting, 0 canceled-but-paid-through,
               31 owners holding more than one granting record
status: active 128 · canceled 15 · expired 17 · incomplete_expired 1 · unverified 35 · trialing 1
provider: stripe 133 · apple 64
entitlement drift: 16 open findings — high 11, medium 5 (free_with_stripe 11, stale_sync 5)
curator runs (30 days): 0 — no Curator action runs recorded in the window
complimentary grants: 0 · gift codes: 0
policy: grace 5 days · Apple provisional 30 days · welcome trial 7 days
```

The 31 owners holding more than one granting record and the 16 drift findings are reported, not
auto-repaired: resolving them is a billing decision that belongs with the existing reconciliation
tools (`ReconciliationDashboard`, `reconcileSubscriberPopulations`, `auditDuplicateBilling`).

## 5. Remaining issues

- Report-generation failure counts need a server-side export audit event before they can be reported.
- Persistence failures surface only to the calling screen; a dedicated ledger is required.
- Page-level performance is only measurable through platform analytics, not this function.
- Legacy projection fields (`pipekeeper_paid`, `paid_modules_csv`, `entitlement_tier`) remain
  display-only caches; the reconciliation jobs still need to run to clear drift.
- Row-level security rollout (CI2-01) is unchanged by this pass.
