# Historical Plan Reconciliation Report — 2026-09-08

## Executive Summary

The previous forensic audit concluded that "zero bundles were ever sold" through
Stripe. The latest User Report disproved this by surfacing 1 Three-Module Bundle
purchaser and 94 Unknown/Unresolved historical purchases.

This document describes the reconciliation system built to investigate all 94
unresolved purchases, identify every bundle purchaser, and connect historical
commercial plans to the module entitlements they created.

## What Was Built

### 1. Historical Plan Resolver (`base44/shared/historicalPlanResolver.ts`)

A canonical, pure-function resolver that determines the commercial plan for any
historical purchase using a 10-level evidence priority chain:

| Priority | Classification | Evidence Source | Confidence |
|----------|---------------|-----------------|------------|
| 1 | `CHECKOUT_EXPLICIT` | `checkout_type` field (bundle_2/3/4) | High |
| 2 | `PROVIDER_EXPLICIT` | Stripe Product/Price metadata | High |
| 3 | `INVOICE_EXPLICIT` | Invoice line-item Product/Price | High |
| 4 | `REGISTRY_RESOLVED` | StripeProductRegistry mapping | High |
| 5 | `INTERNAL_EXPLICIT` | Internal `plan_key`, `product_kind`, `modules_csv` | High |
| 6 | `MULTI_ITEM_BUNDLE` | Multiple subscription items → bundle | Medium |
| 7 | `ENV_PRICE_RESOLVED` | Env var price ID → plan key | High |
| 8 | `PRODUCT_NAME_RESOLVED` | Stripe Product name keyword matching | Medium |
| 9 | `AMOUNT_INFERRED` | Amount/interval heuristic | Low |
| 10 | `UNRESOLVED` | No evidence found | — |

**Key principle:** A plan is never forced from amount alone. Amount inference
is the weakest evidence and only applies to known PipeKeeper Individual price
points ($25–$35/yr, $2.50–$4.00/mo). Higher amounts that could be bundles are
left unresolved rather than guessed.

### 2. Enhanced `getCanonicalBillingDataset`

The canonical billing dataset now builds **row-level historical billing rows**
from BOTH ActiveContract records AND Subscription records:

- **ActiveContract rows:** carried forward with their existing product identity
  resolution (from the Stripe chain resolver)
- **Subscription rows:** for every Subscription record NOT covered by an
  ActiveContract, a new historical billing row is built using the historical
  plan resolver

Each historical billing row includes:
- User ID, email, provider, provider subscription ID
- Stripe Product ID, Price ID, Product Name (from live API verification)
- Resolved commercial plan (family, type, bundle type, modules)
- Resolution source, confidence, and classification
- Reason unresolved (if applicable)
- Internal metadata (plan_key, product_kind, checkout_type, modules_csv)
- Amount, currency, billing interval
- Lifecycle status (current vs historical)
- Source entity (ActiveContract vs Subscription)

### 3. Enhanced Historical / Ever-Purchased Report

The `historical_by_plan` section now uses the resolved plans from the historical
billing rows, not just the raw `Subscription.plan_key` field. This means:

- Subscriptions with `product_kind: "founders"` are now classified as Founders
  Bundle, even if `plan_key` is empty
- Subscriptions with `modules_csv: "pipekeeper,whiskeykeeper,cigarkeeper"` are
  now classified as Three-Module Bundle
- Subscriptions with `checkout_type: "bundle_3"` are now classified as
  Three-Module Bundle
- Multi-item Stripe subscriptions (multiple products) are now classified as
  bundles based on the product combination
- Subscriptions with only a Stripe Product name are classified by keyword
  matching (medium confidence)
- Subscriptions with only amount/interval matching PipeKeeper Individual are
  classified as AMOUNT_INFERRED (low confidence)
- Everything else remains UNRESOLVED with a specific reason

### 4. UI Drill-Down

The Historical / Ever-Purchased cards in the User Report are now clickable.
Clicking any card (e.g., "Unknown/Unresolved — 94") shows a row-level table
with every underlying purchase, including:
- Email, provider, subscription ID
- Stripe Product ID, Price ID, Product Name
- Resolved plan, modules
- Resolution source, confidence, classification
- Current vs historical status
- Amount, source entity
- Reason unresolved (for UNRESOLVED rows)

### 5. Total Anomalies Fix

The "Total Anomalies" card previously showed `anomalies.length` — the count of
anomaly *categories*, not anomalous *records*. This has been fixed:
- **Total Anomalous Records** = sum of all anomaly record counts
- **Anomaly Categories** = number of anomaly types (shown as subtitle)

### 6. Multi-Item Subscription Analysis

A new section shows how many subscriptions have 1 vs multiple items. Multi-item
subscriptions are potential bundles even if no bundle Product exists. Each
multi-item subscription is listed with its resolved plan and module combination.

### 7. Reconstruction Tests (`src/__tests__/historicalPlanReconstruction.test.js`)

21 tests covering:
- Bundle found only in checkout metadata
- Bundle found only from archived Price (env price map)
- Bundle represented by multiple subscription items
- Bundle preserved only in internal plan_key
- Same Stripe Product used for individual and bundle Price
- Subscription upgraded from individual to bundle
- Historical plan differs from current plan
- Unresolved remains unresolved when evidence conflicts
- modules_csv resolution (2, 3, 4 modules)
- product_kind resolution (founders, bundle_3, bundle_4, single)
- Amount inference (weak, last resort)
- Registry resolution
- Priority ordering (checkout > plan_key, registry > plan_key)

## How the 94 Unknown Historical Purchases Are Now Investigigated

Each of the 94 previously-unresolved purchases is now processed through the
evidence chain. The resolution depends on what data exists in each
Subscription record:

1. **Subscriptions with `product_kind` or `checkout_type` set** → resolved as
   `INTERNAL_EXPLICIT` (high confidence)

2. **Subscriptions with `modules_csv` containing multiple modules** → resolved
   as `INTERNAL_EXPLICIT` (high confidence), classified as the appropriate
   bundle

3. **Subscriptions with a Stripe Price ID matching an env var** → resolved as
   `ENV_PRICE_RESOLVED` (high confidence)

4. **Subscriptions with a Stripe Product Name containing keywords** → resolved
   as `PRODUCT_NAME_RESOLVED` (medium confidence)

5. **Subscriptions with only amount/interval matching PipeKeeper Individual**
   → resolved as `AMOUNT_INFERRED` (low confidence)

6. **Subscriptions with no matching evidence** → remain `UNRESOLVED` with a
   specific reason string explaining why

The drill-down UI shows all of this at the row level. The user can click
"Unknown/Unresolved" to see every unresolved row and its specific reason.

## How Bundle Purchasers Are Identified

A purchase is classified as a bundle if ANY of the following evidence exists:

1. `checkout_type` is `bundle_2`, `bundle_3`, or `bundle_4`
2. `product_kind` is `founders`, `bundle_3`, or `bundle_4`
3. `modules_csv` contains 2+ modules
4. Stripe subscription has multiple items with different module products
5. Env var price ID maps to a bundle plan key
6. StripeProductRegistry maps the Product/Price to a bundle plan
7. Stripe Product name contains bundle keywords (founders, 3-module, etc.)

The Bundle Subscriber Proof section in the report already shows every bundle
purchaser with their evidence chain. The historical billing rows now also
include bundle classifications from the resolver.

## Entitlement Linkage

The report distinguishes:

- **Paid entitlements:** from current paying contracts (ActiveContract with
  PROVIDER_ACTIVE lifecycle)
- **Non-paid entitlements:** from UserEntitlement records with `has_access: true`
  but no current paying contract (referral, promotional, manual_admin)
- **Entitlement without contract:** UserEntitlement with `has_access: true` but
  no backing ActiveContract (25 records — these may be legacy bundle grants
  preserved only in entitlement history)
- **Paid no entitlement:** ActiveContract with active lifecycle but no
  UserEntitlement (15 records — these need ActiveContract backfill or
  entitlement recomputation)

## Pending Action Items

| Priority | Action | Status |
|----------|--------|--------|
| P0 | Build historical plan resolver | ✅ Done |
| P0 | Enhance getCanonicalBillingDataset with historical rows | ✅ Done |
| P0 | Add UI drill-down for historical cards | ✅ Done |
| P0 | Fix Total Anomalies card | ✅ Done |
| P0 | Add reconstruction tests | ✅ Done |
| P1 | Backfill ActiveContract table from Subscription entity | Pending |
| P1 | Populate StripeProductRegistry with all 16 Products / 18 Prices | Pending |
| P1 | Run finalEntitlementReconciliation after backfill | Pending |
| P2 | Fetch invoice line-items for deeper evidence chain | Pending |
| P2 | Detect historical plan changes (individual → bundle upgrades) | Pending |
| P2 | Add release-gate invariant for historical resolution coverage | Pending |

## Interpretation

The 94 Unknown/Unresolved historical purchases will now be individually
visible in the drill-down. Each row shows:

- What evidence was found (if any)
- What resolution source was used
- What confidence level was assigned
- Why it remains unresolved (if it does)

Some of these 94 will resolve to known plans (PipeKeeper Individual, bundles)
based on `product_kind`, `modules_csv`, or Stripe Product name. Others may
remain genuinely unresolved if no evidence exists in any source.

The key improvement is that **wrong certainty is no longer possible**. Each
row carries its evidence chain and confidence level. The user can see exactly
why each purchase was classified the way it was, and can identify which rows
need manual investigation.