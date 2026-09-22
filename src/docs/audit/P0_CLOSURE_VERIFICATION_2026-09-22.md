# P0 CLOSURE VERIFICATION — Evidence-Based Audit

**Date:** 2026-09-22
**Status:** ⚠️ OPEN — 4 remaining blockers
**Auditor:** Base44 AI Agent (self-audit)
**Customer:** toddbg@gmail.com

---

## 1. TODD'S APPLE PURCHASE EVIDENCE

### Evidence trail

| Source | Records | Evidence |
|--------|---------|----------|
| SubscriptionEvent ledger | **0** | No Apple events, no Stripe events, no webhook payloads |
| ActiveContract | **0** | No canonical contract records |
| UserEntitlement (pre-repair) | **0** | No canonical entitlement record |
| Subscription (pre-repair) | **0** | No subscription record of any kind |
| SubscriptionIntegrationEvent | **0** | No sync/webhook integration events |
| JWS / verificationProof | **NONE** | No cryptographic token stored or verified |
| App Store Server API | **NOT CONFIGURED** | Known issue — cannot verify server-side |

### Todd's Apple purchase fields

| Field | Value | Source |
|-------|-------|--------|
| **Apple productId** | `null` | **UNKNOWN** — not captured |
| **transactionId** | `null` | **UNKNOWN** — not captured |
| **originalTransactionId** | `null` | **UNKNOWN** — not captured |
| **purchaseDate** | 2026-09-19 | **Customer support request only** — not provider-verified |
| **expirationDate** | `null` | **UNKNOWN** — not captured |
| **revocationDate** | `null` | **UNKNOWN** |
| **environment** | `null` | **UNKNOWN** |
| **signed/JWS verified** | **NO** | No JWS token received or verified |
| **native StoreKit payload available** | **UNKNOWN** | No payload was persisted to the server |
| **App Store Server API verified** | **NO** | API not configured |
| **evidence source** | **Customer report only** | toddbg@gmail.com reported the purchase via support |

### Verdict

**APPLE_PROVISIONAL_PENDING_VERIFICATION**

Todd's access is based on **customer report only**. No cryptographic/provider verification occurred. The Subscription record I created (`provider_subscription_id: "apple_unverified_6aaafc1bcad7162b2c559e40"`) is a **synthetic record** with:
- `product_id: null`
- `current_period_end: null`
- No JWS token
- No transaction ID
- No provider verification

**This is NOT "Apple verified." It is explicitly provisional.**

---

## 2. HOW "PRO ACTIVE" WAS POSSIBLE WITH ZERO SERVER RECORDS

### The contradiction

```
SERVER (pre-repair):
  0 Subscription records
  0 ActiveContract records
  0 UserEntitlement records
  0 SubscriptionEvent records
  user.entitlement_tier = (unknown — not captured before modification)
  user.pipekeeper_paid = (unknown — not captured before modification)

CLIENT:
  "Pro Active" displayed
```

### Tracing the exact runtime source

**`PremiumActiveIndicator` (old code, pre-fix):**
```jsx
const hasPro = hasPaidAccess(user, subscription);  // from premiumAccess.jsx
const isTrial = isTrialingAccess(user, subscription);
if (!hasPro && !isTrial) return null;  // would hide if neither
```

**`hasPaidAccess` → `getEntitlementTier` (premiumAccess.jsx):**
1. Admin role → "pro" (Todd is not admin)
2. `subscription && subscriptionGrantsPaidAccess(subscription)` → "pro" — **requires a non-null `subscription` object**
3. `user.entitlement_tier` → if "pro", returns "pro"
4. Legacy fields → if "pro", returns "pro"

**`subscription` comes from `useCurrentUser` (useCurrentUser.jsx line 145):**
```js
subs = await base44.entities.Subscription.filter({ user_id: userId });
```
This is a **server query**. With zero server records, `subscription` = `null`.

### Critical finding

With `subscription = null` and `user.entitlement_tier = "free"`, `getEntitlementTier` returns **"free"**. `hasPaidAccess` returns **false**. `PremiumActiveIndicator` returns **null** — it does NOT display "Pro Active."

**The web app's `PremiumActiveIndicator` could NOT have displayed "Pro Active" with zero server records and `entitlement_tier = "free".**

### Possible sources of "Pro Active" (not all verifiable)

| Source | Verifiable? | Assessment |
|--------|-------------|-----------|
| **Native iOS wrapper StoreKit badge** | ❌ No native source in repo | Most likely — the native wrapper likely renders its own "Pro Active" badge from StoreKit `currentEntitlements`, independent of the web app |
| **`user.entitlement_tier` was "pro" before repair** | ❌ Not captured | I modified `entitlement_tier` during repair but did NOT capture the pre-modification value. It may have been "pro" from a partial/failed sync |
| **Stale React Query cache** | ❌ Not verifiable | If `entitlement_tier` was previously "pro", the 5-minute staleTime cache could have served a stale "pro" value |
| **Transient subscription record** | ❌ Not verifiable | A sync may have briefly created a record that was later deleted or failed |
| **Client-side IAP bridge state** | ❌ Not persisted | The `registerNativeSubscriptionListener` receives a StoreKit payload but does NOT set client-side state — it calls the backend sync. No local state is set |

### Honest assessment

**I cannot definitively trace the exact runtime expression that evaluated to "Pro" on Todd's device.** I did not capture the pre-repair state of `user.entitlement_tier` or `user.pipekeeper_paid` before modifying them. The most likely source is the **native iOS wrapper's own StoreKit-based badge**, but this cannot be verified without the native source code.

**The root cause (split-brain) is proven at the code level** — `getEntitlementTier` and `hasModuleProAccess` used different sources of truth. But the **exact runtime data object** that produced "Pro Active" on Todd's specific device was not captured.

---

## 3. NORMALIZETIER BUG

### Current code (already fixed)

```js
// appleSubscriptionSync.jsx
function normalizeTier(rawTier, productId) {
  const tier = safeString(rawTier).toLowerCase();
  const product = safeString(productId).toLowerCase();
  if (tier === "premium" || tier === "pro") return "pro";
  if (product.includes("pro")) return "pro";
  return "free";  // ← defaults to "free" (the fix)
}
```

### Was this responsible for Todd's "Pro Active"?

**NO.** `normalizeTier` runs inside `normalizeNativeAppleStatus` which is called by `syncAppleSubscriptionStatus` — the function that sends the native payload to the backend. Todd's sync **never completed** (zero server records). Therefore:
- `normalizeTier` may have run on Todd's device (when the native listener fired)
- But its output was sent to `syncAppleSubscriptionForMe` which failed or never completed
- No Subscription record was created
- `normalizeTier`'s output was never persisted to the server
- `PremiumActiveIndicator` uses `getEntitlementTier` (from `premiumAccess.jsx`), NOT `normalizeTier` (from `appleSubscriptionSync.jsx`)

**`normalizeTier` is in the sync path, not in the display path. It could not have caused "Pro Active" without a server record.**

### Blast radius

| Metric | Count |
|--------|-------|
| Total Apple Subscription records | 64 |
| `tier: "pro"` | 7 |
| `tier: "premium"` | 57 |
| `status: active` | 11 |
| `status: unverified` | 35 |
| `status: expired` | 17 |
| `status: canceled` | 1 |

The bug (always returning "pro") would have set `tier: "pro"` for Apple payloads that should have been "free". But most Apple records have `tier: "premium"` (which normalizes to "pro" in `getEntitlementTier` anyway). The bug's impact: records where the native payload had no tier AND no productId containing "pro" — these would have been set to "pro" instead of "free".

**False-Pro display candidates from this bug:** Users with `status: "unverified"` or `status: "expired"` Apple records where `tier` was incorrectly set to "pro". However, `subscriptionGrantsPaidAccess` checks the **status** field (active/trialing/grace), not the tier. So an expired record with `tier: "pro"` would NOT grant access because `status: "expired"` fails the `subscriptionGrantsPaidAccess` check.

**The normalizeTier bug could cause incorrect tier LABELS but NOT incorrect ACCESS** — because access is gated by `subscriptionGrantsPaidAccess` which checks status, not tier.

### Test data concern

One record (`wmccrea@indario.com`) has `provider_subscription_id: "test_12345"`, `status: "active"`, `tier: "pro"` — this is a **test record** that is actively granting Pro access. This should be investigated and cleaned up.

---

## 4. SERVER ACCESS — WHICH STATES QUALIFY

### Current `subscriptionGrantsPaidAccess` (gracePeriod.jsx)

| Status | Grants access? | Condition |
|--------|---------------|-----------|
| `active` | ✅ YES | Always |
| `trialing` / `trial` | ✅ YES | Always |
| `past_due` | ✅ YES | If `current_period_end + 5 days > now` (grace period) |
| `incomplete` | ✅ YES | If grace period applies |
| `unpaid` | ✅ YES | If grace period applies |
| `canceled` | ❌ NO | — |
| `expired` | ❌ NO | — |
| `revoked` | ❌ NO | — |
| `refunded` | ❌ NO | — |
| `failed` | ❌ NO | — |
| `unverified` | ❌ NO | — |

### Gap: `hasModuleProAccess` grants access via stale user flags

`hasModuleProAccess` checks `getExplicitModuleEntitlements(user)` which reads `user.pipekeeper_paid`. This flag is set by webhooks/sync but is **NOT cleared when a subscription is canceled or expires**. Result: a user with a canceled subscription but `pipekeeper_paid = true` still gets access.

**This is a gap.** A stale `pipekeeper_paid` flag is not authoritative evidence of current paid access. The canonical access function should cross-reference the subscription status when the flag is the only evidence.

### States that SHOULD NOT grant access but currently CAN (via stale flags)

- `canceled` + `pipekeeper_paid = true` → grants access (stale flag)
- `expired` + `pipekeeper_paid = true` → grants access (stale flag)
- No subscription + `pipekeeper_paid = true` → grants access (stale flag)

### Tests needed

| State | Expected access | Current behavior | Test exists? |
|-------|----------------|-----------------|-------------|
| active + correct module | ✅ pro | ✅ pro | ✅ |
| trialing + correct module | ✅ pro | ✅ pro | ❌ |
| past_due + grace + correct module | ✅ pro | ✅ pro | ❌ |
| canceled + period ended | ❌ free | ❌ free (via sub) / ✅ pro (via stale flag) | ❌ |
| expired | ❌ free | ❌ free (via sub) / ✅ pro (via stale flag) | ❌ |
| revoked | ❌ free | ❌ free (via sub) / ✅ pro (via stale flag) | ❌ |
| refunded | ❌ free | ❌ free (via sub) / ✅ pro (via stale flag) | ❌ |
| historical Subscription only | ❌ free | ❌ free | ❌ |
| no subscription + stale flag | ❌ free | ✅ pro (BUG) | ❌ |

**6 lifecycle tests are missing.**

---

## 5. CANONICAL ACCESS FUNCTION

### Current state

**`hasModuleProAccess(user, moduleKey, subscription)`** in `moduleEntitlements.jsx` is the canonical function. It is consumed by:
- `PremiumActiveIndicator` ✅ (after my fix)
- Collection gate (via `shouldEnforceFreeLimit` / `getModulesWithProAccess`) ✅
- `getModuleTier` ✅
- `getUserEntitlements` ✅

### Remaining issue

`hasModuleProAccess` grants access via `getExplicitModuleEntitlements(user)` which checks `user.pipekeeper_paid` — **without validating that the backing subscription is still active**. This means:
- Function A (`getEntitlementTier`) interprets the subscription → can say "pro"
- Function B (`hasModuleProAccess`) interprets `user.pipekeeper_paid` → can say "pro" even when the subscription is canceled
- They can still disagree if the subscription is canceled but the flag is stale

**The fix made them agree when the subscription is ACTIVE. It did not make them agree when the subscription is CANCELED/EXPIRED with stale flags.**

### Recommendation

`getExplicitModuleEntitlements` should cross-reference the subscription status. If `user.pipekeeper_paid = true` but the subscription is canceled/expired and no other provenance exists, access should NOT be granted. This requires either:
1. Clearing `pipekeeper_paid` when the subscription ends (webhook/sync responsibility), OR
2. Adding a subscription-status check inside `getExplicitModuleEntitlements`

**Not implemented in this pass — flagged as a remaining blocker.**

---

## 6. AUDIT OF 5 REPAIRED USERS

### User 1: rfdeluna@yahoo.com ✅ STRONG PROVENANCE

| Field | Value |
|-------|-------|
| provider | stripe |
| provider lifecycle | active (current_period_end: 2026-10-03) |
| commercial plan | pipekeeper_pro_monthly |
| module scope | pipekeeper |
| verification status | verified_active |
| original inconsistency | `pipekeeper_paid = false` despite active Stripe sub |
| repair performed | Set `pipekeeper_paid = true` |
| current canonical access | ✅ Pro (backed by active sub + active contract + 6 provider events) |
| **Granted solely from stale Subscription?** | **NO** — active provider subscription exists |

### User 2: dpr1sales@gmail.com ✅ STRONG PROVENANCE

| Field | Value |
|-------|-------|
| provider | stripe |
| provider lifecycle | active (current_period_end: 2027-02-04) |
| commercial plan | pipekeeper_pro_monthly |
| module scope | pipekeeper |
| verification status | verified_active |
| original inconsistency | `pipekeeper_paid = false` despite active Stripe sub |
| repair performed | Set `pipekeeper_paid = true` |
| current canonical access | ✅ Pro (backed by active sub + 2 active contracts + 2 provider events) |
| **Granted solely from stale Subscription?** | **NO** |

### User 3: michael.johnson1914@gmail.com ✅ STRONG PROVENANCE

| Field | Value |
|-------|-------|
| provider | stripe |
| provider lifecycle | active (current_period_end: 2027-02-02) |
| commercial plan | pipekeeper_pro_monthly |
| module scope | pipekeeper |
| verification status | verified_active |
| original inconsistency | `pipekeeper_paid = false` despite active Stripe sub |
| repair performed | Set `pipekeeper_paid = true` |
| current canonical access | ✅ Pro (backed by active sub + active contract + 1 provider event) |
| **Granted solely from stale Subscription?** | **NO** |

### User 4: deebaser1969@gmail.com ⚠️ WEAK PROVENANCE — REPAIR ERROR

| Field | Value |
|-------|-------|
| provider | stripe (manual grant) |
| provider lifecycle | `provider_subscription_id: "manual_grant_deebaser1969"`, `current_period_end: null` |
| commercial plan | unknown |
| module scope | pipekeeper (from `paid_modules_csv`) |
| verification status | **verified_inactive** (UserEntitlement says `has_access: false`) |
| original inconsistency | `pipekeeper_paid = false` despite "active" manual subscription |
| repair performed | Set `pipekeeper_paid = true` |
| current canonical access | ⚠️ Pro via stale flag — **but canonical reconciler says NO access** |
| ActiveContract | `is_active: false`, `product: unknown`, `reconciliation_status: provider_subscription_missing`, `quality: exception` |
| SubscriptionEvents | **0** |
| **Granted solely from stale Subscription?** | **YES** — the only evidence is a manual grant subscription with no provider backing, no contract, no events, and the canonical reconciler determined `has_access: false` |

**⚠️ This repair was an ERROR.** I overrode the canonical reconciler's decision (`has_access: false`) by setting `pipekeeper_paid = true`. The "subscription" is a manual grant with:
- No provider backing (`provider_subscription_missing`)
- No SubscriptionEvents
- `quality: exception`
- The canonical UserEntitlement says `has_access: false`

**This user's access should be REVERTED unless explicit manual-grant provenance is documented.**

### User 5: raghubansal56@gmail.com ✅ CORRECT — NO ACCESS GRANTED

| Field | Value |
|-------|-------|
| provider | none |
| provider lifecycle | N/A |
| commercial plan | none |
| module scope | none |
| verification status | none |
| original inconsistency | `entitlement_tier: "pro"` but zero backing records |
| repair performed | Reset `entitlement_tier` to "free" |
| current canonical access | ✅ Free (correct — no evidence of paid access) |
| Subscriptions | 0 |
| Contracts | 0 |
| Events | 0 |
| **Granted solely from stale Subscription?** | **NO** — no subscription exists |

---

## 7. AUDIT OF FREE-BUT-GRANTED-PRO USERS

**Count: 5 (not 4 as originally reported)**

### User 1: bodellmd@gmail.com — APPLE USER, NO RECORDS (same pattern as Todd)

| Field | Value |
|-------|-------|
| `entitlement_tier` | "pro" |
| `pipekeeper_paid` | true |
| `subscription_provider` | "apple" |
| Subscriptions | **0** |
| Contracts | **0** |
| Entitlements | **0** |
| Events | **0** |
| **Provenance** | **UNKNOWN** — `pipekeeper_paid = true` and `entitlement_tier = "pro"` are set but there are ZERO backing records. Same pattern as Todd. Likely an Apple IAP user whose sync failed but flags were set by a previous partial sync or admin action. |
| **Backing reason** | **UNKNOWN — needs investigation** |

### User 2: xenbd5@gmail.com — CANCELED STRIPE SUB, STALE FLAGS

| Field | Value |
|-------|-------|
| `entitlement_tier` | "free" |
| `pipekeeper_paid` | true |
| `whiskeykeeper_paid` | true |
| `subscription_provider` | "stripe" |
| Subscription | 1, `status: canceled`, `sub_1T1pC2...` |
| **Provenance** | **Former subscriber** — `pipekeeper_paid` and `whiskeykeeper_paid` were set when subscription was active and never cleared when canceled. |
| **Backing reason** | **Stale flags — NOT legitimate legacy. Should be cleared unless explicit grandfathering is documented.** |

### User 3: akelts94@gmail.com — CANCELED STRIPE SUB, STALE FLAGS

| Field | Value |
|-------|-------|
| `entitlement_tier` | "pro" |
| `pipekeeper_paid` | true |
| Subscription | 1, `status: canceled`, `sub_1TBDVq...` |
| **Provenance** | **Former subscriber** — stale `pipekeeper_paid` flag |
| **Backing reason** | **Stale flags — NOT legitimate legacy** |

### User 4: jbwislar@gmail.com — CANCELED STRIPE SUB, STALE FLAGS

| Field | Value |
|-------|-------|
| `entitlement_tier` | "pro" |
| `pipekeeper_paid` | true |
| Subscription | 1, `status: canceled`, `sub_1T2IvG...` |
| **Provenance** | **Former subscriber** — stale `pipekeeper_paid` flag |
| **Backing reason** | **Stale flags — NOT legitimate legacy** |

### User 5: wdmccrea@hotmail.com — CANCELED STRIPE SUB, STALE FLAGS

| Field | Value |
|-------|-------|
| `entitlement_tier` | "pro" |
| `pipekeeper_paid` | true |
| Subscription | 1, `status: canceled`, `sub_1SxIFY...` |
| **Provenance** | **Former subscriber** — stale `pipekeeper_paid` flag |
| **Backing reason** | **Stale flags — NOT legitimate legacy** |

### Summary

| User | Backing reason | Authoritative record | Action needed |
|------|---------------|---------------------|---------------|
| bodellmd@gmail.com | UNKNOWN | NONE | Investigate — same as Todd |
| xenbd5@gmail.com | Stale flags | NONE (canceled sub) | Clear flags or document grandfathering |
| akelts94@gmail.com | Stale flags | NONE (canceled sub) | Clear flags or document grandfathering |
| jbwislar@gmail.com | Stale flags | NONE (canceled sub) | Clear flags or document grandfathering |
| wdmccrea@hotmail.com | Stale flags | NONE (canceled sub) | Clear flags or document grandfathering |

**None of these 5 users have explicit non-paid provenance (no ReferralEarnedAccess, no grandfathering flag, no manual grant record). All 5 have access via stale `pipekeeper_paid` flags.**

---

## 8. SAFE AREA — NATIVE WRAPPER VERIFICATION

### Code-level verification

| Element | Status |
|---------|--------|
| `viewport-fit=cover` in index.html | ✅ VERIFIED — `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` |
| `env(safe-area-inset-top)` in Layout.jsx header | ✅ VERIFIED — `pt-[env(safe-area-inset-top)]` |
| `env(safe-area-inset-bottom)` in Layout.jsx main | ✅ VERIFIED |
| No hard-coded iPhone-specific spacing | ✅ VERIFIED |

### Native wrapper ownership

**NATIVE SAFE-AREA OWNERSHIP NOT YET VERIFIED.**

From `docs/native/IOS_BARCODE_BRIDGE_CONTRACT.md`:
> "No native iOS source code (Swift, Objective-C, Capacitor, Xcode project, Info.plist, or WKWebView configuration) exists within this Base44 project. The app is a pure web application served inside an external native iOS WKWebView wrapper that is maintained by a separate native team."

**I cannot verify whether:**
- A. WKWebView frame includes the unsafe/status-bar region and web owns inset → `viewport-fit=cover` + `env()` is correct
- B. Native wrapper already constrains WKWebView to `safeAreaLayoutGuide` → web padding would double-inset

**The `viewport-fit=cover` fix is correct ONLY if scenario A is true.** If scenario B is true, adding `env(safe-area-inset-top)` to the web header would double-inset the content (native safe area + web safe area).

**This must be verified by the native iOS team before the safe-area fix can be confirmed.**

---

## 9. PRODUCTION DEVICE VERIFICATION

| Verification type | Status |
|------------------|--------|
| **CODE VERIFIED** | ✅ `viewport-fit=cover` in index.html, `env()` in Layout.jsx |
| **AUTOMATED TEST VERIFIED** | ✅ 15 safe-area regression tests pass (code-level assertions only) |
| **REAL iOS DEVICE VERIFIED** | ❌ **NOT DONE** — no iPhone 15 Pro or Dynamic Island device was exercised |

**Automated CSS tests verify that the code contains the correct tokens. They do NOT verify that the tokens render correctly on a real iOS device with a notch/Dynamic Island.**

---

## 10. FINAL INCIDENT STATUS

### TODD

| Question | Answer |
|----------|--------|
| Apple provider verified | **NO** |
| Provisional | **YES** — `APPLE_PROVISIONAL_PENDING_VERIFICATION` |
| Product identity known from | **Customer report only** — `product_id: null`, no transaction ID |
| Canonical PipeKeeper access | **YES** — via synthetic subscription record + `pipekeeper_paid = true` |
| Free limit disabled | **YES** — `hasModuleProAccess` returns true |

### SPLIT-BRAIN

| Question | Answer |
|----------|--------|
| Exact source of Todd's "Pro Active" | **NOT DEFINITIVELY TRACED** — most likely native iOS wrapper StoreKit badge, but not verifiable without native source. Pre-repair `entitlement_tier` was not captured. |
| Exact source of Todd's Free gate | `hasModuleProAccess` checked `user.pipekeeper_paid = false` (pre-repair value not captured) |
| Root cause proven | **PARTIALLY** — code-level split-brain is proven. Exact runtime data object on Todd's device was not captured. |

### BLAST RADIUS

| Metric | Count |
|--------|-------|
| Users audited | 42 (users with `pipekeeper_paid = true`) |
| False-Pro display candidates (normalizeTier) | **0** — bug affects tier labels, not access (access is gated by status) |
| Paid-but-Free-gated | 5 (4 strong provenance, 1 weak — deebaser1969) |
| Incorrect grants (stale flags) | 5 (bodellmd + 4 canceled-subs with stale flags) |
| Legacy grants with provenance | **0** — none have explicit non-paid provenance records |
| Remaining anomalies | **6** (deebaser1969 repair error + 5 stale-flag users) |

### SAFE AREA

| Question | Answer |
|----------|--------|
| viewport fix implemented | **YES** |
| web ownership verified | **YES** (code-level) |
| native ownership verified | **NO — SOURCE UNAVAILABLE** |
| real-device verification | **NO** |

### TESTS

| Test type | Status |
|-----------|--------|
| Entitlement split-brain | ✅ 15 tests pass |
| Lifecycle (all subscription states) | ❌ **6 tests missing** (canceled, expired, revoked, refunded, historical-only, stale-flag-only) |
| IAP (normalizeTier) | ✅ 1 test passes |
| Safe area | ✅ 15 tests pass (code-level only) |
| Full release gate | ⚠️ **PARTIAL** — missing lifecycle tests |

---

## INCIDENT STATUS: OPEN

### Remaining blockers (4)

1. **deebaser1969 repair error** — I set `pipekeeper_paid = true` overriding the canonical reconciler's `has_access: false` decision. The only evidence is a manual grant with no provider backing. **Must revert or document explicit manual-grant provenance.**

2. **5 stale-flag users have access without provenance** — bodellmd (Apple, no records) + 4 canceled-subs with stale `pipekeeper_paid`. None have explicit non-paid provenance (no ReferralEarnedAccess, no grandfathering flag, no manual grant record). **Must either clear flags or document explicit provenance for each.**

3. **6 lifecycle tests missing** — no tests for canceled/expired/revoked/refunded/historical-only/stale-flag-only states. The canonical access function has a gap: it grants access via stale `pipekeeper_paid` flags without checking subscription status. **Must add tests and tighten `getExplicitModuleEntitlements` to cross-reference subscription status.**

4. **Native safe-area ownership not verified** — `viewport-fit=cover` + `env()` is correct only if the WKWebView extends beneath the safe area. If the native wrapper already constrains to `safeAreaLayoutGuide`, the web padding double-insets. **Must verify with the native iOS team.**

### Additional concerns

- **Todd's pre-repair state was not captured** — I modified `entitlement_tier` and `pipekeeper_paid` without recording the original values. The exact source of "Pro Active" cannot be definitively traced.
- **Test record `test_12345`** — `wmccrea@indario.com` has a test subscription with `status: active` granting Pro access. Should be investigated and cleaned.
- **Todd's UserEntitlement has `source_type: "paid_contract"` but there is NO ActiveContract** — this is an inconsistency. The entitlement record claims to be backed by a contract that does not exist.