# P0: Duplicate Subscription Billing Incident Report

**Date:** 2026-09-05  
**Severity:** P0 — Critical  
**Status:** Resolved for index case; systemic remediation in progress  
**Reporter:** Production audit  
**Affected User (index case):** Dallas Hinton (dallas.hinton@gmail.com, user_id: 6982538ecea148522ec4b4d3)

---

## 1. Executive Summary

A production audit triggered by the P0 Apple Sync Failure incident (2026-09-05) uncovered widespread duplicate subscription billing across the platform. The index case — Dallas Hinton — was simultaneously billed under **three** active Pro subscriptions: one Stripe annual ($29.99/yr), one Stripe monthly ($1.99/mo), and one Apple manual monthly. The Stripe monthly and Apple manual monthly were both active while the annual was also active, resulting in triplicate billing for the same PipeKeeper Pro entitlement.

A production-wide audit revealed **30 out of 96** subscribed users (31.25%) have duplicate or conflicting active subscription records. The root cause is the absence of a duplicate-subscription guard in the checkout flow, allowing users to create new subscriptions without canceling existing ones.

---

## 2. Root Cause Analysis

### Primary Root Cause
The checkout flow (`createCheckoutSessionV2` and `createModuleCheckoutSession`) did not check for existing active subscriptions before creating a new Stripe Checkout Session. This allowed users to:

1. Purchase a monthly subscription, then later purchase an annual without the monthly being canceled
2. Purchase multiple annual subscriptions for the same module through repeated checkout attempts
3. Accumulate Stripe and Apple subscriptions simultaneously without reconciliation

### Contributing Factors
- **No pre-checkout guard**: The checkout functions created Stripe sessions unconditionally without querying the local `Subscription` entity for existing active records
- **No webhook reconciliation**: The Stripe webhook handler created new `Subscription` records on `checkout.session.completed` without checking for and deactivating prior subscriptions
- **Manual Apple entries**: Admin-created manual Apple subscription records (e.g., `pro_manual_<user_id>`) were not deactivated when a Stripe subscription was later created
- **Missing `primary_module` field**: Most subscription records have `primary_module: null`, making it difficult to determine whether two subscriptions cover the same module
- **No automated duplicate detection**: No scheduled job or webhook hook existed to detect and flag duplicate billing

### Why It Wasn't Caught Sooner
- The entitlement resolver grants access if **any** active subscription exists, so users never experienced access issues — they were simply overcharged
- No billing reconciliation dashboard was in place to surface duplicate active contracts
- The `ActiveContract` entity was introduced to normalize billing state, but duplicate `Subscription` records were never cleaned up

---

## 3. Resolution Actions (Index Case — Dallas Hinton)

### Actions Taken
1. **Created `repairDuplicateSubscriptions` backend function** — admin-only function that:
   - Fetches all subscription, active contract, and subscription event records for a user
   - Detects duplicate conflicts using the shared `detectDuplicateConflicts` logic
   - Identifies the annual subscription to preserve and monthly subscriptions to terminate
   - Cancels duplicate Stripe monthly subscriptions at the provider level via `stripe.subscriptions.cancel()`
   - Marks Apple manual monthly subscriptions as canceled locally
   - Reconciles `ActiveContract`, `UserEntitlement`, and `User` records to reflect the single preserved annual subscription
   - Builds a billing timeline and refund exposure analysis from `SubscriptionEvent` records

2. **Executed repair for Dallas Hinton** (2026-09-05 20:22 UTC):
   - Stripe monthly `sub_1SwrI9DycvQWC88Pvt6pVuty` → **canceled** at Stripe ✅
   - Apple manual monthly `pro_manual_6982538ecea148522ec4b4d3` → **canceled** locally ✅
   - Stripe annual `sub_1SxyRMDycvQWC88PbbwSiDFG` → **preserved** as sole active subscription ✅
   - `UserEntitlement` updated: `has_access=true`, `pipekeeper=true`, `primary_provider=stripe`, `primary_billing_interval=annual`, `contract_count=1`, `mrr_cents=250`
   - `ActiveContract` for monthly → `is_active=false`, `status=canceled`
   - `ActiveContract` for annual → `is_active=true`, `status=active`, `quality=trusted`

3. **Duplicate exposure for Dallas**:
   - Stripe monthly charges while annual was active: ~$1.99/mo × 6 months (Mar–Sep 2026) = ~$11.94
   - Refund mechanism: Stripe refund via dashboard or API — requires admin authorization

---

## 4. Production-Wide Audit Findings

### Audit Scope
- Total subscription records scanned: 192
- Total users with subscriptions: 96
- Users with duplicate conflicts: **30 (31.25%)**

### Breakdown by Conflict Type
| Conflict Type | Users | Description |
|---|---|---|
| `multiple_annual` | 22 | Multiple active annual subscriptions for the same module |
| `multiple_monthly` | 6 | Multiple active monthly subscriptions for the same module |
| `monthly_plus_annual` | 2 | Both monthly and annual active simultaneously (Dallas was one) |

### High-Impact Users (by duplicate billing volume)
| Email | Active Subs | Annual Amount | Monthly Amount |
|---|---|---|---|
| mclemorekentr@gmail.com | 8 | $159.92 | $0 |
| matthewrbailey@gmail.com | 7 | $139.93 | $0 |
| wmccrea@indario.com | 7 | $29.99 | $23.95 |
| pipekeeper@la6ija.com | 4 | $109.96 | $0 |
| jo.petter.iversen@gmail.com | 5 | $79.96 | $0 |
| mvfd104@yahoo.com | 4 | $59.97 | $0 |

### Estimated Total Duplicate Billing Exposure
- **30 users** with an aggregate of **~$1,200+/year** in duplicate subscription charges
- Many duplicate records have `amount: null` (legacy/manual entries), so actual exposure may be higher

---

## 5. Preventive Measures Implemented

### 5.1 Duplicate Subscription Guard (Shared Module)
Created `base44/shared/duplicateSubscriptionGuard.ts` with:
- `detectDuplicateConflicts(subscriptions)` — identifies monthly+annual, multiple-monthly, multiple-annual, and cross-provider conflicts; returns recommended keep/terminate actions
- `shouldBlockNewSubscription(existingSubs, newInterval, newModule)` — blocks checkout if an active subscription already exists for the same module; allows monthly→annual upgrades but blocks annual→monthly downgrades and duplicate same-interval purchases

### 5.2 Checkout Flow Protection
Added duplicate-subscription guard to both checkout entry points:
- `createCheckoutSessionV2` — checks existing subscriptions before creating Stripe Checkout Session; returns HTTP 409 with `duplicate_block: true` if blocked
- `createModuleCheckoutSession` — checks each requested module against existing subscriptions; blocks with HTTP 409 if any module already has an active subscription

### 5.3 Repair Function
Created `repairDuplicateSubscriptions` backend function for admin use:
- Dry-run mode (default) for safe analysis
- Live mode cancels duplicate Stripe subscriptions and reconciles all local records
- Returns full billing timeline and refund exposure analysis

---

## 6. Remaining Action Items

### Immediate (P0)
- [ ] **Batch-repair remaining 29 users** with duplicate subscriptions using `repairDuplicateSubscriptions`
- [ ] **Process refunds** for duplicate charges via Stripe dashboard (requires admin authorization per user)
- [ ] **Add webhook reconciliation** — on `checkout.session.completed`, check for and deactivate prior subscriptions for the same module before creating the new record
- [ ] **Backfill `primary_module`** on existing subscription records to enable accurate module-level duplicate detection

### Short-Term (P1)
- [ ] **Scheduled duplicate detection** — create a scheduled automation that runs `detectDuplicateConflicts` across all users weekly and flags new duplicates
- [ ] **Admin dashboard** — surface duplicate conflicts in the Reconciliation Dashboard for proactive monitoring
- [ ] **User-facing notification** — email users when a duplicate is detected and repaired, with refund information

### Long-Term (P2)
- [ ] **Stripe customer portal** — encourage users to manage their own subscriptions via the self-service portal to reduce duplicate creation
- [ ] **Checkout session pre-flight** — add a client-side check that warns users before redirecting to Stripe if they already have an active subscription
- [ ] **Subscription consolidation** — for users with multiple annuals, offer a prorated consolidation path instead of canceling duplicates

---

## 7. Regression Test Coverage

Created `src/__tests__/duplicateSubscriptionGuard.test.js` covering:
- `detectDuplicateConflicts`: monthly+annual, multiple-monthly, multiple-annual, cross-provider, single-subscription (no conflict), empty list
- `shouldBlockNewSubscription`: blocks duplicate monthly, blocks duplicate annual, blocks annual→monthly downgrade, allows monthly→annual upgrade, allows new subscription when none exists

---

## 8. Related Documents

- [P0 Apple Sync Failure Incident Report](./P0_APPLE_SYNC_FAILURE_INCIDENT_REPORT_2026-09-05.md) — the incident that triggered this audit
- [Silent Fallback Hardening Final Report](./SILENT_FALLBACK_HARDENING_FINAL_REPORT.md) — preceding hardening pass
- `base44/shared/duplicateSubscriptionGuard.ts` — duplicate detection and prevention logic
- `base44/functions/repairDuplicateSubscriptions/entry.ts` — admin repair function

---

**Report Author:** Base44 Production Hardening Pass  
**Last Updated:** 2026-09-05 20:23 UTC