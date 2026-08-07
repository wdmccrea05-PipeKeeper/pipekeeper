# Apple Deferred Subscription Upgrade — Entitlement Flow Audit

**Date:** 2026-08-07
**Trigger:** Customer report — active Apple subscription with scheduled upgrade (3 Modules → All Modules, effective Aug 16) but no premium feature access.
**Scope:** Trace the complete entitlement flow for Apple IAP subscribers, with focus on deferred upgrade handling.

---

## Executive Summary

**This is a SYSTEMIC issue, not an isolated account problem.** 5 of 8 active Apple subscribers (62%) have a subscription tier but **zero resolved modules** — meaning they're paying for Pro but locked out of every module feature. Zero Apple ActiveContracts are active. The root cause is a shared code path that fails to resolve Apple bundle product IDs to their module sets.

The deferred-upgrade scenario the customer described is a **symptom of this broader bug**, not a separate issue. When the iOS wrapper sends a bundle product ID (e.g., "CollectionKeeper 3 Modules Monthly"), the product resolver doesn't recognize it and silently defaults to a single module (pipekeeper) — or, if the productId is empty, writes nothing at all.

---

## Investigation Findings

### 1. Receipt Processing — FAILING

**`syncAppleSubscriptionForMe`** (`base44/functions/syncAppleSubscriptionForMe/entry.ts`) is the primary Apple receipt ingestion path. It receives a single `productId` from the iOS wrapper and calls `resolveAppleProductAccess(productId)`:

```js
function resolveAppleProductAccess(productId) {
  if (product.includes('founders')) return { modules: ['pipekeeper', 'whiskeykeeper'], ... };
  if (product.includes('whiskey'))  return { modules: ['whiskeykeeper'], ... };
  if (product.includes('cigar'))    return { modules: ['cigarkeeper'], ... };
  if (product.includes('wine'))     return { modules: ['winekeeper'], ... };
  // DEFAULT — catches everything else
  return { modules: ['pipekeeper'], ... };
}
```

**Bug:** The function recognizes only single-module keywords and "founders." It does NOT recognize:
- `3_module` / `three_module` / `3_modules` products
- `all_module` / `all_modules` products
- `bundle` products (other than founders)

Any bundle product ID falls through to the default and resolves to `['pipekeeper']` only. A user who purchased "CollectionKeeper 3 Modules Monthly" gets only 1 module instead of 3.

**No deferred upgrade awareness:** The function accepts a single `productId` with no concept of:
- Current active product vs pending upgrade product
- Apple's `autoRenewalPreference` (StoreKit 2's `renewalInfo.autoRenewalPreference` field, which indicates the pending product)
- Effective date for the upgrade

The iOS bridge (`nativeIAPBridge.jsx`) sends `{ productId, expiresAt, originalTransactionId, active }` — no `pendingProductId`, no `autoRenewalPreference`, no `effectiveDate`.

**No server-side receipt verification:** `verifyAppleEntitlement` is admin-only and explicitly a "TEMPORARY admin-assisted verification stopgap" (per its own comments). It does NOT call Apple's App Store Server API. It also does NOT write `plan_key`, `modules_csv`, `module_count`, or any module flags — so even admin-verified Apple users have no module resolution.

### 2. ActiveContract — FAILING

| Metric | Count |
|--------|-------|
| Total Apple ActiveContracts | 55 |
| Active (`is_active: true`) | **0** |
| With resolved modules (`modules.length > 0`) | 7 |
| With known product (`product !== 'unknown'`) | 7 |
| Active AND with modules | **0** |

Every Apple ActiveContract is either `expired` or has `product: "unknown"` and `modules: []`. The ActiveContract normalizer cannot resolve Apple products to modules — the same product-ID recognition gap as `resolveAppleProductAccess`.

**No ActiveContract is created by `syncAppleSubscriptionForMe`.** The function creates only `Subscription` and `UserEntitlement` records. ActiveContract rows for Apple users come from a separate normalization pass that also fails to resolve modules.

### 3. Subscription Table — PARTIALLY FAILING

| Metric | Count |
|--------|-------|
| Total Apple Subscriptions | 62 |
| Active | 10 |
| Active with non-empty `modules_csv` | **3** (all Stripe-synced users) |
| Active with empty/null `modules_csv` | **5** |
| Users with duplicate active rows | 2 (`ollinsuarez`, `wmccrea`) |

The 5 mismatched active Apple subscribers all have:
- `plan_key`: null/empty
- `modules_csv`: null/empty
- `module_count`: null/empty
- `product_kind`: null/empty
- `primary_module`: null/empty

These records were created either by early sync calls with empty `productId` (creating `apple_unverified_${userId}` IDs) or by manual/admin processes that didn't populate module fields.

### 4. User Record — FAILING (systemic)

Cross-reference of 8 active Apple subscribers against their User records:

| Email | entitlement_tier | paid_modules_csv | has_paid_access |
|-------|-----------------|------------------|-----------------|
| dallas.hinton | pro | pipekeeper | true (Stripe-synced) |
| wmccrea | pro | pipekeeper | true (Stripe-synced) |
| jo.petter.iversen | pro | pipekeeper | true (Stripe-synced) |
| scbrown78 | premium | **(empty)** | — |
| ollinsuarez | premium | **(empty)** | — |
| boag2k5 | pro | **(empty)** | — |
| garbatz | premium | **(empty)** | — |
| rowgig | premium | **(empty)** | — |

**5 of 8 active Apple subscribers have a tier but zero resolved modules.** `buildCanonicalEntitlements` returns `paidModules: []` for these users, so `hasModuleAccess()` returns false for every module — they're locked out despite paying.

The 3 that work all have `subscription_provider: "stripe"` — their modules were resolved by Stripe sync, not Apple sync.

### 5. Restore Purchases — NO DEDICATED FLOW

There is no standalone "Restore Purchases" button or flow. The app relies on `syncAppleSubscriptionForMe` being triggered on app launch (via the `useCurrentUser` effect added in the prior fix) or on the Subscription page. There is no flow that:
- Downloads the latest Apple receipt
- Validates it server-side
- Rebuilds ActiveContract from verified data
- Rebuilds Subscription with correct modules
- Rebuilds entitlement flags
- Refreshes module visibility and cached access summary

### 6. Upgrade Handling — NO DEFERRED UPGRADE SUPPORT

The code does NOT handle Apple's deferred upgrade behavior at all:

- **No `autoRenewalPreference` parsing:** Apple's StoreKit 2 exposes `renewalInfo.autoRenewalPreference` — the product ID the subscription will renew into. Our iOS bridge does not send this field.
- **No effective date tracking:** There is no `pending_upgrade_product_id`, `pending_upgrade_effective_date`, or similar field on Subscription or ActiveContract.
- **No "honor current until renewal" logic:** The sync function grants whatever single `productId` is passed, immediately. If the iOS wrapper sends the upgrade product (All Modules) before the effective date, the user gets too much access too early. If it sends the current product (3 Modules), the resolver doesn't recognize it and defaults to pipekeeper — the user loses access.

**The specific customer scenario:** "CollectionKeeper 3 Modules Monthly" with a scheduled upgrade to "All Modules Monthly" effective Aug 16. Our code:
1. Receives `productId` for 3 Modules from the iOS wrapper
2. `resolveAppleProductAccess` doesn't match "3_module" → defaults to `['pipekeeper']`
3. User gets 1 module instead of 3 — locked out of whiskeykeeper and cigarkeeper
4. On Aug 16, Apple renews to All Modules — but the same bug occurs: "all_modules" isn't recognized → defaults to pipekeeper

### 7. Login Reconciliation — RISK CONFIRMED

`reconcileEntitlementsOnLogin` has safe rules that preserve existing paid flags when no active subscription is found locally. However:

- If the Apple sync has **never successfully run** (no Subscription row created), `reconcileEntitlementsOnLogin` finds no active subscription and no existing paid flags → sets user to `free`.
- If the Apple sync ran but wrote empty `modules_csv` (the bug above), `reconcileEntitlementsOnLogin` finds the active Subscription but `resolveModulesFromRecord` returns empty → preserves existing flags (which are also empty) → user keeps `has_paid_access: true` but with zero modules.

**The function does NOT clear paid flags when an active subscription exists** (safe rule at line 215). But it also can't GRANT modules it can't resolve. The user is stuck in a no-man's-land: tier says "pro" but no modules are accessible.

### 8. Logging — INSUFFICIENT

`syncAppleSubscriptionForMe` logs basic fields (`tier`, `status`, `active`, `verified`, `allModules`) but does NOT log:
- The raw `productId` received from the iOS wrapper
- Whether `resolveAppleProductAccess` matched a known product or fell through to default
- Any pending upgrade information (because it's not captured)
- The `originalTransactionId` used for deduplication
- The final module set granted vs. what the product should have resolved to

There is no structured logging that would surface the "product ID not recognized → defaulted to pipekeeper" pattern.

---

## Systemic Impact Assessment

**Is this user-specific or systemic?** SYSTEMIC.

- **5 of 8** active Apple subscribers have zero resolved modules (62% failure rate)
- **0 of 55** Apple ActiveContracts are active
- **0 of 55** Apple ActiveContracts have both active status and resolved modules
- The shared code path is `resolveAppleProductAccess` in `syncAppleSubscriptionForMe` (and the equivalent in the ActiveContract normalizer), which does not recognize bundle/multi-module product IDs

Every Apple user who purchased a bundle (3-module, all-modules, or any non-founders multi-module product) is affected. Single-module Apple users (pipekeeper-only, whiskeykeeper-only, etc.) may also be affected if their product ID doesn't contain the expected keyword.

---

## Required Fixes (Prioritized)

### P0 — Product ID Resolution (blocks all Apple bundle users)
1. **Expand `resolveAppleProductAccess`** to recognize all Apple product IDs, including:
   - 3-module bundle → `['pipekeeper', 'whiskeykeeper', 'cigarkeeper']`
   - 4-module / all-modules bundle → `['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']`
   - Any product ID containing "3_module", "three_module", "all_module", "4_module", "four_module", "bundle"
2. **Add the same recognition to the ActiveContract normalizer** (`_shared/subscriptionNormalizer`) so Apple contracts get correct `product` and `modules` fields.
3. **Backfill existing Apple subscriptions** — re-resolve modules for all 62 Apple Subscription records and 55 ActiveContract records using the expanded mapping.

### P0 — Deferred Upgrade Handling
4. **Extend the iOS bridge** to send `autoRenewalPreference` (pending product) and `renewalDate` (effective date) from StoreKit 2's `renewalInfo`.
5. **Add fields to Subscription/ActiveContract**: `pending_upgrade_product_id`, `pending_upgrade_effective_date`.
6. **Grant the CURRENT product's modules** until the effective date, then switch to the pending product after renewal. Never grant the upgrade product early. Never revoke the current product before the effective date.
7. **Add logging** (per audit section 8) for every Apple sync that includes the current product, pending upgrade, effective date, and final modules granted.

### P1 — ActiveContract for Apple
8. **Create ActiveContract records in `syncAppleSubscriptionForMe`** — currently only Subscription and UserEntitlement are created. ActiveContract is the canonical source of truth for billing state and should be populated for Apple users.

### P1 — Restore Purchases Flow
9. **Add a dedicated Restore Purchases flow** that downloads the latest Apple receipt, validates it, and rebuilds Subscription → ActiveContract → User flags → module visibility → cached access summary.

### P1 — Server-Side Receipt Verification
10. **Implement Apple App Store Server API verification** (StoreKit 2) in `verifyAppleEntitlement` — currently it's a manual admin stopgap with no server-side validation. This is required to trust `productId` and `expiresAt` values.

### P2 — Login Reconciliation Hardening
11. **Add Apple-provider awareness to `reconcileEntitlementsOnLogin`** — when an Apple Subscription exists but modules can't be resolved, attempt to re-resolve using the expanded product mapping before falling back to preservation.
12. **Never set `entitlement_tier: 'free'` for a user with an active Apple subscription** — even if modules are unresolved, preserve the tier and mark `needs_review`.

### P2 — Data Repair
13. **Repair the 5 affected active Apple subscribers** — re-run the expanded product resolver against their Subscription `productId` / `provider_subscription_id` and write correct `modules_csv`, `module_count`, and per-module paid flags.

---

## Customer-Specific Note

The customer described a deferred upgrade from "3 Modules Monthly" to "All Modules Monthly" effective Aug 16. Based on this audit:

- Their current entitlement should be 3 modules (pipekeeper, whiskeykeeper, cigarkeeper) until Aug 16
- After Aug 16, it should automatically switch to all 4 modules
- No premium access should be lost during the transition
- **Currently, our code would grant only `pipekeeper` (1 module) for both the current and upgraded product** because `resolveAppleProductAccess` doesn't recognize either product ID

The fix requires expanding the product resolver (P0 #1) and adding deferred upgrade awareness (P0 #4-6) before this customer's upgrade takes effect on Aug 16.