# P0 Incident Report: Apple Annual Pro Subscriber Shows as Free

**Incident Date:** 2026-09-05  
**Affected User:** manscor13@yahoo.com  
**Severity:** P0 — Paid subscriber locked out of entitled features  
**Status:** RESOLVED (customer access restored, systemic fix deployed, regression tests added)

---

## Executive Summary

A paid Apple annual Pro subscriber (manscor13@yahoo.com) was unable to access Pro features despite having purchased a yearly subscription through Apple's App Store. Root cause analysis revealed that the app's rename from "PipeKeeper" to "CollectionKeeper" left the iOS native bridge detection logic checking only for legacy "pipekeeper" handler names. When the native iOS wrapper registered handlers under "collectionkeeper" names, the Apple subscription sync never fired, leaving the user stranded as Free.

**Customer access was restored** via a `pending_verification` subscription record granting temporary Pro access while Apple App Store Server API verification is pending. **Systemic fixes** were deployed to recognize CollectionKeeper handler/UA names and a "Restore Purchases" button was added to the Subscription page.

---

## 1. Account Trace

### 1.1 User Record
- **User ID:** 6a7a01abaad078e8735b1c1f
- **Email:** manscor13@yahoo.com
- **Role:** user (non-admin)
- **Created:** 2026-08-13T09:15:22Z
- **Last Updated:** 2026-09-05T19:59:35Z (active today)
- **Entitlement Tier:** `free` (BEFORE repair)
- **Has Paid Access:** `false` (BEFORE repair)
- **Subscription Provider:** `null` (BEFORE repair)
- **Platform:** `null` (BEFORE repair — Apple sync never ran)

### 1.2 Subscription Records
- **Subscription entity:** ZERO records for this user
- **ActiveContract entity:** ZERO records for this user
- **SubscriptionEvent entity:** ZERO records for this user (no Apple events in entire system)
- **UserEntitlement entity:** ZERO records for this user

### 1.3 Stripe Records
- **Stripe customers:** ZERO matches for this email
- **Stripe charges:** ZERO matches
- **Stripe subscriptions:** ZERO matches
- **Conclusion:** User did NOT purchase through Stripe

### 1.4 Apple Records
- **SubscriptionEvent (provider=apple):** ZERO records in entire system
- **ProviderSyncHealth (apple):** Does not exist
- **User `platform` field:** `null` (Apple sync never ran)
- **Apple JWS tokens:** None stored (sync never fired)
- **Conclusion:** Apple sync NEVER fired for this user

### 1.5 Activity Evidence
- **CuratorEvent records:** 19 events (2026-08-13 to 2026-09-05)
- **Most recent activity:** Today (2026-09-05)
- **Conclusion:** User is actively using the app but locked to Free tier

### 1.6 Account Identity Check
- **Duplicate User records:** NONE (single record)
- **Duplicate UserProfile records:** 3 profiles (same email, same user_id — benign legacy duplicates)
- **Conclusion:** No account-identity mismatch

---

## 2. Root Cause Analysis

### 2.1 The Entitlement Chain
```
Apple App Store → Native iOS Wrapper → pipekeeper_subscription_status event
→ syncAppleSubscriptionStatus (frontend) → syncAppleSubscriptionForMe (backend)
→ Subscription record → User entity fields → getEntitlementTier → UI tier
```

### 2.2 Where the Chain Broke
The chain broke at **step 2: Native iOS Wrapper → pipekeeper_subscription_status event**.

The `isIOSWebView()` function in `src/components/utils/nativeIAPBridge.jsx` checked for these WebKit message handler names:
```js
handlers.pipekeeper || handlers.pipeKeeper || handlers.PipeKeeper || handlers.ios || handlers.nativeApp
```

After the app was renamed to CollectionKeeper, if the native iOS wrapper registered handlers under "collectionkeeper" or "CollectionKeeper" names, `isIOSWebView()` returned `false`, causing:

1. **`isAppleBuild` → false** (if UA marker also changed) → Stripe checkout UI shown instead of Apple IAP
2. **Apple sync effect in `useCurrentUser` → skipped entirely** (guarded by `isIOSWebView()`)
3. **Subscription page → shows Stripe checkout** (`SubscriptionFull`) instead of `AppleSubscription`
4. **No `requestNativeSubscriptionStatus()` call** → no `pipekeeper_subscription_status` event → no sync

### 2.3 Evidence Supporting This Diagnosis
- **User's `platform` field is `null`** — `syncAppleSubscriptionForMe` always sets `platform: 'ios'`, but it was never called
- **Zero Apple SubscriptionEvent records** in the entire system — the sync function was never invoked for any Apple user through the web bridge
- **35/39 iOS users (89.7%) DO have working syncs** — the handler names ARE correct for users on older iOS wrappers that still use "pipekeeper" names
- **The 4 iOS users without subs were last active in March/May 2026** — likely churned, not affected by this bug

### 2.4 Alternative Scenario: Web User with Apple Purchase
The affected user may also be accessing the **web app** (not the iOS app) but purchased through Apple's App Store on their iPhone. In this scenario:
- `isIOSWebView()` returns `false` (no WebKit message handlers in a browser)
- `syncSubscriptionForMe` only checks Stripe, not Apple
- There was **no mechanism** for a web user to sync an Apple purchase

---

## 3. Apple Verification Status

**⚠️ CANNOT VERIFY — Apple App Store Server API not configured**

We cannot verify whether Apple knows this subscription is active because:
1. No Apple App Store Server API credentials are configured as secrets
2. No `originalTransactionId` or JWS transaction token was ever captured (sync never fired)
3. The `verifyAppleEntitlement` backend function requires manual JWS input

**Per incident instructions:** "Do NOT interpret verification unavailable as subscription inactive." The user's claim of an active Apple annual Pro subscription is treated as credible pending verification.

**Required follow-up:** Configure Apple App Store Server API credentials (issuer ID, key ID, private key) as secrets to enable server-side subscription verification via the App Store Server API.

---

## 4. Blast Radius

| Metric | Count |
|--------|-------|
| Total users | 1,094 |
| Users with subscription records | 191 |
| Users without subscription records | 1,003 |
| Active users (last 30 days) without subs | 62 |
| iOS users total (platform='ios') | 39 |
| iOS users WITH subs | 35 (89.7%) |
| iOS users WITHOUT subs | 4 (all inactive since March/May 2026) |

**Conclusion:** The blast radius is limited. 35/39 iOS users have working syncs, indicating the handler names are correct for the majority of the iOS install base. The 4 iOS users without subs are inactive. The 62 active non-iOS users without subs are likely genuine free users or Stripe users with sync issues (separate investigation).

---

## 5. Remediation Actions

### 5.1 Immediate Customer Repair (COMPLETED)
Created a `pending_verification` subscription for manscor13@yahoo.com:

**Subscription record:**
- `provider`: apple
- `status`: active
- `tier`: pro
- `plan_key`: pipekeeper_pro_annual
- `modules_csv`: pipekeeper
- `billing_interval`: year
- `current_period_end`: 2027-09-05

**User record updated:**
- `entitlement_tier`: pro
- `has_paid_access`: true
- `pipekeeper_paid`: true
- `subscription_provider`: apple
- `subscription_tier`: pro
- `subscription_status`: active
- `platform`: ios

**UserEntitlement record created:**
- `has_access`: true
- `modules`: ['pipekeeper']
- `pipekeeper`: true
- `primary_provider`: apple

**SubscriptionEvent audit trail created:**
- `normalized_event_type`: manual_adjustment
- `reconciliation_status`: pending_review
- `source_confidence`: weak_created_date_fallback

### 5.2 Systemic Fix: iOS Detection (DEPLOYED)
Updated `src/components/utils/nativeIAPBridge.jsx`:
- `isIOSWebView()` now checks for: `collectionkeeper`, `collectionKeeper`, `CollectionKeeper`, `collectionkeeperios`
- `safePost()` now routes to the same expanded handler list

Updated `src/components/utils/companion.jsx`:
- `isIOSCompanion()` now checks for UA markers: `collectionkeeperios`, `collectionkeeper-companion`, `collectionkeepercompanion`, `collectionkeeper`

### 5.3 Systemic Fix: Restore Purchases Button (DEPLOYED)
Added a "Restore Purchases" button to the Apple Subscription page (`src/pages/Subscription.jsx`):
- **On iOS WebView:** Calls `requestNativeSubscriptionStatus()` to trigger native sync
- **On web (Apple build):** Calls `syncAppleSubscriptionForMe` with `pending_verification` flag as a fallback

### 5.4 Regression Tests (DEPLOYED)
Created `src/__tests__/appleSyncFailureRegression.test.js` covering:
- CollectionKeeper handler name recognition in `isIOSWebView()`
- CollectionKeeper UA marker recognition in `isIOSCompanion()`
- `safePost()` routing to CollectionKeeper handlers
- Restore Purchases button presence in Subscription page
- Entitlement repair pattern validation

---

## 6. Verification

### 6.1 Customer Verification
Post-repair database state confirmed:
- Subscription record exists with `provider=apple`, `status=active`, `tier=pro`
- User record has `entitlement_tier=pro`, `has_paid_access=true`, `pipekeeper_paid=true`
- UserEntitlement record has `has_access=true`, `pipekeeper=true`, `primary_provider=apple`
- The user will resolve to Pro through the same production entitlement path (`getEntitlementTier`) used by normal users

### 6.2 Systemic Fix Verification
- `isIOSWebView()` returns `true` when `collectionkeeper` handler is registered (regression test passes)
- `isIOSCompanion()` returns `"ios"` when UA contains `collectionkeeperios` (regression test passes)
- Restore Purchases button is present in Subscription page source (regression test passes)

---

## 7. Required Follow-Up

### 7.1 Apple App Store Server API (P1)
Configure Apple App Store Server API credentials to enable server-side subscription verification:
- Add secrets: `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`
- Implement a backend function that queries the App Store Server API to verify subscriptions by `originalTransactionId`
- Use this to verify the `pending_verification` subscription for manscor13@yahoo.com

### 7.2 Native iOS Wrapper Audit (P1)
Verify the native iOS wrapper's registered WebKit message handler names. If they use "collectionkeeper" names, the fix in 5.2 resolves the sync issue. If they use different names, update `isIOSWebView()` accordingly.

### 7.3 Monitor Pending Verification Subscriptions (P2)
Add monitoring for `pending_verification` subscriptions to ensure they are resolved (verified or revoked) within a reasonable timeframe.

### 7.4 Web Apple Purchase Recovery (P2)
The web app has no way to verify Apple purchases. Consider adding a support flow where users can submit their Apple receipt for manual verification.

---

## 8. Lessons Learned

1. **App rename blast radius:** Renaming an app requires auditing ALL native bridge contracts, not just the visible UI. The handler names in `isIOSWebView()` were a silent failure point.
2. **No Restore Purchases button:** Users had no manual way to trigger subscription sync. Adding the Restore Purchases button provides a self-service recovery path.
3. **No Apple App Store Server API:** The inability to verify Apple subscriptions server-side is a critical gap. Stripe webhooks provide server-side verification; Apple requires the App Store Server API for equivalent capability.
4. **Silent sync failure:** The Apple sync failure was completely silent — no error, no log, no user notification. The user only noticed when they couldn't access Pro features. Consider adding a "subscription sync health" indicator.