# Entitlement Split-Brain Closure Report

**Date:** 2026-09-22
**Status:** CLOSED — Reconciliation finalized, regression tests passing, release gate updated
**Severity:** P0

---

## Problem

The Pro indicator badge and the collection access gate could disagree ("split-brain"):
- A user's badge showed **Pro** while the gate blocked access (or vice versa)
- Stale legacy `pipekeeper_paid` flags independently granted access without subscription provenance
- Synthetic/manual-grant subscriptions were treated as real provider subscriptions in the legacy fallback
- Apple "provisional" subscriptions granted indefinite access without expiry enforcement

## Root Cause

Three independent defects in `resolveModuleAccess.jsx`:

1. **Legacy fallback was too broad** — any subscription with `modules_csv=null` triggered legacy flag-based access, including synthetic `manual_grant_` and `test_` subscriptions that should never grant real access.

2. **No provisional Apple expiry** — Apple subscriptions in `provisional` verification status granted access indefinitely, even when the provisional window had long expired.

3. **No provenance requirement** — legacy `pipekeeper_paid=true` flags granted access without requiring a backing subscription, contract, entitlement record, or founding-member status. This allowed orphaned flags from deleted/canceled subscriptions to persist as permanent grants.

## Resolution

### 1. Canonical Resolver Hardening (`resolveModuleAccess.jsx`)

- **Synthetic subscription exclusion:** Legacy fallback now rejects subscriptions whose `provider_subscription_id` starts with `manual_grant_` or `test_`.
- **Provisional Apple expiry:** Added `PROVISIONAL_EXPIRY_DAYS = 30` constant and `hasProvisionalAppleExpired()` check. Provisional Apple subscriptions older than 30 days are blocked.
- **Legacy fallback provenance:** Legacy flag-based access now requires a real subscription record (active, trialing, past_due, or canceled-with-future-period-end). Orphaned flags without any subscription are ignored.

### 2. Data Repairs (Production)

| Repair | Count | Action |
|--------|-------|--------|
| Unsupported stale flags cleared | 6 | `pipekeeper_paid=false` — no subscription/contract/entitlement/founding provenance |
| Todd's entitlement corrected | 1 | `source_type` → `provisional_apple`, `verification_status` → `provisional` |
| Founding member flags synced | 20 | Legacy flags aligned with canonical access state |
| Legitimate legacy subscribers synced | 8 | Premium/pro flags restored for real Stripe subscribers with `modules_csv=null` |
| Stale test-subscription flags cleared | 1 | `mattsjeepjk` — test subscription, not a real grant |

### 3. Blast-Radius Audit

- **Before:** 36 projection mismatches across 42 users
- **After:** 1 explained mismatch (sergioolivares3 — Apple provisional correctly expired by new 30-day policy)
- **Result:** 97% reduction in mismatches; remaining 1 is by-design correct behavior

### 4. Regression Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `lifecycleMatrix.test.js` | 33 (8 new) | ✅ All pass |
| `entitlementSplitBrainRegression.test.js` | 22 (5 new) | ✅ All pass |

New test cases cover:
- Legacy fallback for real Stripe subscriptions with `modules_csv=null`
- Synthetic `manual_grant_` exclusion from legacy fallback
- Provisional Apple 30-day expiry (both expired and active)
- Module-specific badge/gate invariant (fixed over-broad `proIndicatorShows` check)
- Stale flag without subscription provenance

### 5. Release Gate

Added three new release gate checks:
- **Check 22:** Lifecycle regression matrix
- **Check 23:** Entitlement split-brain regression
- **Check 24:** Static check — resolver contains synthetic exclusion, provisional expiry check, and expiry constant

### 6. Admin Reporting

Added two columns to the User Report audit table:
- **Access Source** (`entitlement_source_type`) — shows `paid_contract`, `provisional_apple`, `grandfathered`, `manual_admin`, `referral`, etc.
- **Verification** (`entitlement_verification_status`) — shows `verified_active`, `provisional`, `verification_unavailable`, etc.

This gives admins visibility into *why* each user has access, not just *whether* they have access.

## Architecture Decision

`resolveModuleAccess.jsx` remains the single canonical access resolver. All access decisions flow through it:
- `moduleEntitlements.jsx` delegates to it
- `shouldEnforceFreeLimit` delegates to it
- The Pro indicator and collection gate both derive from `hasModuleProAccess()` (same function)

This eliminates the split-brain by construction: both the badge and the gate call the same function with the same inputs.

## Remaining Items

| Item | Status | Owner |
|------|--------|-------|
| Apple App Store Server API configuration | Open | Native team |
| 8 unresolved Apple subscription scopes | Open | Blocked on App Store Server API |
| iOS WKWebView safe-area ownership verification | Open | Native team |

These are pre-existing infrastructure items outside the entitlement system and do not affect the split-brain closure.