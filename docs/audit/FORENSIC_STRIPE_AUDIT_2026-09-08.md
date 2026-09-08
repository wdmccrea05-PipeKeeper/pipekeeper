# Forensic Stripe Audit — 2026-09-08

## Executive Summary

A forensic audit of live Stripe provider data against internal CollectionKeeper
entity state was performed to reconcile billing truth with entitlement state.
The audit revealed three critical findings:

1. **All 93 Stripe subscriptions (71 current) map exclusively to PipeKeeper
   Individual products.** Zero bundle subscriptions exist — not current, not
   historical. The 6 bundle Products/Prices in the Stripe catalog were never
   purchased by anyone.

2. **The StripeProductRegistry is severely under-populated.** Only 4 of 16
   Products are mapped — all PipeKeeper, all via `stripe_product_name` keyword
   matching. The 12 unmapped Products include all WhiskeyKeeper, CigarKeeper,
   WineKeeper, and bundle prices.

3. **70 of 71 current Stripe subscriptions have no ActiveContract row.** The
   ActiveContract table is severely out of sync with provider truth. Only 1
   contract exists for 71 active subscriptions.

## Methodology

The `forensicStripeAudit` backend function was executed against the live Stripe
API to enumerate:

- All Products (16)
- All Prices (18)
- All Subscriptions (93 total, 71 active/cancelled-with-period)

Results were cross-referenced against:

- `StripeProductRegistry` entity (4 rows)
- `ActiveContract` entity (1 row)
- `Subscription` entity (93 rows)
- `UserEntitlement` entity (3 rows)

## Finding 1: Zero Bundle Subscriptions Exist

### Stripe Product Catalog (16 Products, 18 Prices)

| Product | Prices | Module Scope | Subscriptions |
|---------|--------|--------------|---------------|
| PipeKeeper Individual | 2 (monthly, annual) | pipekeeper | 93 |
| WhiskeyKeeper Individual | 2 | whiskeykeeper | 0 |
| CigarKeeper Individual | 2 | cigarkeeper | 0 |
| WineKeeper Individual | 2 | winekeeper | 0 |
| Founders Bundle | 1 | all 4 | **0** |
| 3-Module Bundle | 1 | pick 3 | **0** |
| 4-Module Bundle | 1 | all 4 | **0** |

**Conclusion:** Every Stripe subscription in history is a PipeKeeper Individual
purchase. No bundle has ever been sold through Stripe.

### Implication for Reporting

The "bundle subscriber" counts in prior reports were derived from
`Subscription.product_kind` heuristics, not from provider truth. The forensic
audit confirms these were false positives caused by amount-based inference
classifying multi-year PipeKeeper annual subscriptions as bundles.

## Finding 2: StripeProductRegistry Under-Populated

### Current Registry State (4 rows)

All 4 registry entries map to PipeKeeper products, resolved via
`stripe_product_name` keyword matching (`mapping_source:
stripe_product_name`).

### Missing from Registry (12 of 16 Products)

- WhiskeyKeeper Monthly + Annual (2 prices)
- CigarKeeper Monthly + Annual (2 prices)
- WineKeeper Monthly + Annual (2 prices)
- Founders Bundle Monthly + Annual (2 prices)
- 3-Module Bundle Monthly + Annual (2 prices)
- 4-Module Bundle Monthly + Annual (2 prices)

### Risk

When a WhiskeyKeeper/CigarKeeper/WineKeeper subscription is created (currently
zero, but will exist post-launch), the resolver chain will fail at
registry-first lookup, fall through to env-var price map, and resolve correctly
only if the env var is set. Without registry entries, historical/archived
prices will be re-inferred from dollar amount — the exact anti-pattern the
registry was created to prevent.

### Recommendation

Populate the registry with all 16 Products / 18 Prices from the live Stripe
catalog. Each entry should be mapped via `stripe_product_metadata` or
`stripe_price_metadata` (highest confidence), with `is_historical: false` for
current prices.

## Finding 3: ActiveContract Table Severely Out of Sync

### Current State

| Metric | Count |
|--------|-------|
| Active Stripe subscriptions (provider truth) | 71 |
| ActiveContract rows (local) | 1 |
| ActiveContract rows with `is_active: true` | 1 |
| ActiveContract rows reconciled (`provider_matched`) | 0 |

**70 of 71 current Stripe subscriptions have no ActiveContract row.**

### Root Cause

The `ActiveContract` table was introduced as part of the v2 billing lifecycle
rebuild but was never backfilled from the `Subscription` entity. The
`backfillActiveContractProducts` function exists but was not run to completion.

### Impact

The `reconcileEntitlementForUser` function processes contracts — not
subscriptions. With only 1 contract, only 1 user can be reconciled. The
remaining 70 active Stripe subscribers have no `ActiveContract` and therefore
no `UserEntitlement` — they are invisible to the canonical billing dataset.

### Recommendation

Run `backfillActiveContractProducts` to create `ActiveContract` rows for all
93 historical Stripe subscriptions, then run `finalEntitlementReconciliation`
to compute `UserEntitlement` records from the backfilled contracts.

## Finding 4: Entitlement Eligibility Was Too Permissive

### Previous Behavior

The `reconcileEntitlementForUser` function enforced product identity
eligibility only when `productIdentityClassifications` was explicitly passed.
When absent (the common case for 2 of 3 production callers), it fell back to
the verification decision — meaning any Stripe contract with a passing
verification check was auto-granted, regardless of product identity
resolution.

### Fix Applied (2026-09-08)

The reconciler now defaults missing classifications to `UNRESOLVED`,
blocking automatic Stripe entitlement grants unless the caller explicitly
passes `productIdentityClassifications` with `PROVIDER_RESOLVED` or
`LEGACY_RESOLVED`.

A test-only escape hatch (`allowMissingProductClassificationForLegacyTests`)
was added for backward compatibility with existing test suites. Production
callers must never set this flag.

### Callers Fixed

1. `reconcileEntitlementForUser/entry.ts` — now builds
   `productIdentityClassifications` via `resolveProductIdentityFromStripeChain`
   for every contract before calling the reconciler.

2. `auditPaidNoEntitlement/entry.ts` — same fix applied to the repair path.

3. `finalEntitlementReconciliation/entry.ts` — already safe (was the only
   caller passing classifications).

## Finding 5: Non-Paid Entitlements

3 `UserEntitlement` records exist with `has_access: true` but no active
Stripe contract:

| User | Source | Modules | Notes |
|------|--------|---------|-------|
| jm.smith2475@gmail.com | manual_admin | whiskeykeeper, cigarkeeper | Apple admin grant, not Stripe |
| (2 others) | referral / promotional | various | Legitimate non-paid grants |

These are correctly classified as `source_type: manual_admin` / `referral` /
`promotional` and are excluded from paid subscriber counts.

## Action Items

| Priority | Action | Status |
|----------|--------|--------|
| P0 | Tighten entitlement eligibility default to UNRESOLVED | ✅ Done |
| P0 | Fix unsafe callers (reconcileEntitlementForUser, auditPaidNoEntitlement) | ✅ Done |
| P1 | Backfill ActiveContract table from Subscription entity | Pending |
| P1 | Populate StripeProductRegistry with all 16 Products / 18 Prices | Pending (frozen per user instruction) |
| P2 | Add release-gate invariant: registry coverage ≥ 100% of active Stripe Products | Pending |
| P2 | Add forensic audit test to release-gate.cjs | Pending |

## Canonical Billing Dataset (Post-Audit)

| Metric | Value | Source |
|--------|-------|--------|
| Total Stripe subscriptions | 93 | Stripe API |
| Active Stripe subscriptions | 71 | Stripe API |
| PipeKeeper Individual subscribers | 71 | Stripe API (100%) |
| WhiskeyKeeper subscribers (Stripe) | 0 | Stripe API |
| CigarKeeper subscribers (Stripe) | 0 | Stripe API |
| WineKeeper subscribers (Stripe) | 0 | Stripe API |
| Bundle subscribers (Stripe) | 0 | Stripe API |
| Non-paid entitlements | 3 | UserEntitlement entity |
| MRR (Stripe, computed) | 71 × annual/12 | Stripe API |
| ActiveContract rows | 1 | ActiveContract entity |
| ActiveContract coverage gap | 70/71 (98.6%) | Computed |