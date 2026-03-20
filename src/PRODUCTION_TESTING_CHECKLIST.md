# Production Subscription Testing Checklist
**Date:** 2026-03-20  
**Environment:** Production (after 13 Stripe env vars populated)  
**Tester:** [Your Name]  
**Test Session Date:** ________  

---

## Pre-Test Setup

### Environment Validation
- [ ] All 13 `VITE_STRIPE_*` env vars are populated in production
- [ ] `STRIPE_SECRET_KEY` is set in backend
- [ ] `STRIPE_WEBHOOK_SECRET` is configured
- [ ] Test with two separate user accounts (fresh signup + existing free user)
- [ ] Have Stripe Dashboard open in separate tab for live verification
- [ ] Clear browser cache before starting each test
- [ ] Record timestamps and transaction IDs for audit trail

### Prerequisites
- [ ] Fresh test user account created and logged in
- [ ] Another test user account for expansion paywall testing (with 1 module already purchased)
- [ ] Test credit card ready: Use Stripe test card `4242 4242 4242 4242`, any future date, any CVC
- [ ] Production app URL loaded and functional

---

## Test Cases

### TEST 1: PipeKeeper Monthly Single Module Unlock

**Preconditions:**
- Logged in as fresh user (no modules purchased)
- User has NOT seen onboarding
- User navigates to `/PipeKeeper` page

**User Actions:**
1. Click "Unlock" button (should trigger LockedModulePaywall)
2. PaywallModal appears with type="module"
3. Select "PipeKeeper Pro" card with monthly plan highlighted
4. Click "Unlock PipeKeeper" button
5. Directed to Stripe checkout
6. Enter test card details
7. Click "Subscribe" to complete purchase
8. Redirected to `/SubscriptionSuccessFlow?next=/PipeKeeper`

**Expected Checkout Plan Selected:**
- Plan Key: `pipekeeper_pro_monthly`
- Price: $2.99/month
- Metadata: `{planType: 'single_module', module: 'pipekeeper'}`

**Expected Success Route:**
- `/SubscriptionSuccessFlow` → shows PipeKeeper in module list → navigates to `/PipeKeeper`

**Expected Access Result After Sync:**
- Subscription record created with:
  - `status: 'active'`
  - `tier: 'pro'`
  - `billing_interval: 'month'`
  - `provider_subscription_id: sub_*`
- User Profile updated with `pipekeeper_enabled: true`
- User can now freely access PipeKeeper

**Pass/Fail Criteria:**
- ✅ PASS: User successfully subscribed, redirected to PipeKeeper, module accessible
- ❌ FAIL: Checkout fails, wrong pricing shown, wrong module unlocked, or redirect broken

**Notes:**
- Observe toast notifications
- Check browser console for errors
- Note exact error messages if checkout fails
- Verify Stripe Dashboard shows this transaction

---

### TEST 2: PipeKeeper Annual Single Module Unlock

**Preconditions:**
- Logged in as new user
- Same as TEST 1 but different user account

**User Actions:**
1. Navigate to `/PipeKeeper`
2. Trigger LockedModulePaywall
3. Select "PipeKeeper Pro" card
4. **Toggle annual billing** (should show "$29.99/year" option)
5. Select annual option
6. Click "Unlock PipeKeeper"
7. Complete Stripe checkout with test card
8. Verify redirect to success flow

**Expected Checkout Plan Selected:**
- Plan Key: `pipekeeper_pro_annual`
- Price: $29.99/year
- Billing period preserved from UI to checkout

**Expected Success Route:**
- Same as TEST 1 but verify `current_period_end` is ~365 days from today

**Pass/Fail Criteria:**
- ✅ PASS: Annual plan selected, correct pricing shown, annual subscription created
- ❌ FAIL: Billing period not preserved, wrong price charged, or monthly plan created instead

**Notes:**
- Verify in Stripe Dashboard: `billing_cycle_anchor` is set correctly
- Note any delays between subscription creation and sync completion

---

### TEST 3: WhiskeyKeeper Monthly Single Module Unlock

**Preconditions:**
- Logged in as new user (different from TEST 1-2)
- Navigate to `/WhiskeyKeeper`

**User Actions:**
1. Click unlock button on WhiskeyKeeper
2. PaywallModal appears (type="module", lockedModule="whiskeykeeper")
3. "What You'll Get" section describes WhiskeyKeeper features
4. Select "WhiskeyKeeper Pro" monthly plan
5. Click "Unlock WhiskeyKeeper"
6. Complete Stripe checkout
7. Verify success page shows WhiskeyKeeper as unlocked module

**Expected Checkout Plan Selected:**
- Plan Key: `whiskeykeeper_pro_monthly`
- Price: $2.99/month

**Expected Success Route:**
- Redirected to `/SubscriptionSuccessFlow?next=/WhiskeyKeeper`
- Success page displays "WhiskeyKeeper Keeper" in module list
- User can access `/WhiskeyKeeper` after dismissing success modal

**Pass/Fail Criteria:**
- ✅ PASS: WhiskeyKeeper unlocked and accessible
- ❌ FAIL: Routed to wrong module (e.g., PipeKeeper due to route bug), pricing wrong, or module not accessible

**Notes:**
- **CRITICAL:** This test catches the WineKeeper route mapping bug if it affects WhiskeyKeeper routing
- Verify Stripe subscription shows correct priceId

---

### TEST 4: WhiskeyKeeper Annual Single Module Unlock

**Preconditions:**
- Logged in as new user
- Same as TEST 3 but with annual selection

**User Actions:**
1. Navigate to `/WhiskeyKeeper`
2. Trigger paywall, select "WhiskeyKeeper Pro" annual plan ($29.99/year)
3. Complete Stripe checkout
4. Verify annual subscription and success page

**Expected Checkout Plan Selected:**
- Plan Key: `whiskeykeeper_pro_annual`
- Price: $29.99/year

**Expected Success Route:**
- `/SubscriptionSuccessFlow?next=/WhiskeyKeeper`

**Pass/Fail Criteria:**
- ✅ PASS: Annual plan shown, correct price, annual subscription created
- ❌ FAIL: Billing period not preserved, wrong routing, or wrong tier

**Notes:**
- Confirm billing cycle is 12 months
- Check Stripe Dashboard subscription details

---

### TEST 5: Locked Module Unlock Flow (CigarKeeper)

**Preconditions:**
- Logged in as new user
- Navigate to `/CigarKeeper` (if accessible) or trigger via menu

**User Actions:**
1. Try to access CigarKeeper module
2. PaywallModal appears (type="module", lockedModule="cigarkeeper")
3. Select 3-module bundle at $7.99/month to unlock CigarKeeper + others
4. Complete Stripe checkout
5. Verify success page and module access

**Expected Checkout Plan Selected:**
- Plan Key: `three_module_bundle_monthly`
- Metadata: `{planType: 'three_module_bundle', activeModules: '["cigarkeeper", ...]'}`

**Expected Success Route:**
- Redirected to `/SubscriptionSuccessFlow` then routed based on `next` param
- Success page shows all 3 modules

**Pass/Fail Criteria:**
- ✅ PASS: 3-module bundle purchased, CigarKeeper unlocked
- ❌ FAIL: Wrong bundle selected, metadata not serialized, or module inaccessible

**Notes:**
- This test validates 3-module metadata serialization
- Observe which 3 modules are selected (should include cigarkeeper)

---

### TEST 6: Onboarding → Paywall → Purchase → Return Flow

**Preconditions:**
- Logged in as new user
- User has NOT completed onboarding
- No modules currently enabled

**User Actions:**
1. Navigate to `/CollectionHub` or any protected page
2. OnboardingFlow modal appears (step 0: welcome)
3. Click "Next" through steps 0-1 (welcome, module selection)
4. On module selection step, toggle ON both PipeKeeper AND WhiskeyKeeper
5. Click "Next" → PaywallModal appears (type="multi")
6. PaywallModal shows selected modules as chips
7. Select "Unlock 3 Keepers" at $7.99/month annual plan
8. Click "Expand Your Collection"
9. Complete Stripe checkout with test card
10. Redirected to `/SubscriptionSuccessFlow?next=/CollectionHub`
11. Success page shows 2-3 modules (depending on 3-module default)
12. Click "Explore Collections" → redirected to `/CollectionHub`

**Expected Checkout Plan Selected:**
- Plan Key: `three_module_bundle_annual`
- Modules: ['pipekeeper', 'whiskeykeeper'] (or extended to 3)
- Metadata: `{planType: 'three_module_bundle', activeModules: '["pipekeeper","whiskeykeeper"]'}`

**Expected Success Route:**
- `/SubscriptionSuccessFlow?next=/CollectionHub`
- After sync: `/CollectionHub`

**Expected Access Result After Sync:**
- Subscription created with 3-module metadata
- Both PipeKeeper and WhiskeyKeeper enabled
- User can access CollectionHub and both modules

**Pass/Fail Criteria:**
- ✅ PASS: Onboarding pauses at paywall, purchase succeeds, returns to collection with correct modules unlocked
- ❌ FAIL: Paywall doesn't appear, modules not preserved, wrong URL encoded, or post-purchase route broken

**Notes:**
- **CRITICAL TEST:** Validates end-to-end onboarding + paywall integration
- Check localStorage for onboarding state if flow interrupted
- Verify user can complete onboarding after purchase (navigate back to ProfilePage)

---

### TEST 7: 3-Module Bundle Selection and Sync Validation

**Preconditions:**
- Logged in as new user
- From TEST 5 or 6, verify subscription was created

**Validation Actions (no new purchase, verify existing):**
1. In browser console, run:
   ```js
   const response = await fetch('/api/... or check subscription in profile')
   ```
2. Or navigate to Profile → Subscription section
3. Manually verify Stripe Dashboard:
   - Find subscription record
   - Check `metadata.activeModules` field
   - Should show JSON array like `["pipekeeper", "whiskeykeeper", ...]`

**Expected Data State:**
- Subscription entity in database:
  - `metadata.activeModules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"]` OR user's selected modules
  - `status: "active"`
  - `tier: "pro"`
  - `planKey: "three_module_bundle_annual"` or `"three_module_bundle_monthly"`
- Stripe Dashboard:
  - Subscription shows correct price (matches plan)
  - Metadata persisted and readable

**Pass/Fail Criteria:**
- ✅ PASS: Metadata serialized, persisted, and parseable. Sync correctly extracted module list.
- ❌ FAIL: Metadata missing, corrupted, or not parsed. Wrong modules enabled.

**Notes:**
- This is a data integrity test, not a user-facing test
- Check for JSON parse errors in server logs
- Verify metadata format matches both createCheckout and syncSubscription expectations

---

### TEST 8: 4-Module Bundle Selection and Sync Validation

**Preconditions:**
- Logged in as new user
- Have existing 1-module subscriber for expansion paywall

**User Actions:**
1. User currently has PipeKeeper only
2. Navigate to any protected page
3. Click "Upgrade Plan" or "Expand Collections" button
4. PaywallModal appears (type="expansion")
5. Shows current: [PipeKeeper]
6. Select "Unlock All Keepers" at $8.99/month
7. Complete Stripe checkout
8. Verify success page shows all 4 modules

**Expected Checkout Plan Selected:**
- Plan Key: `four_module_bundle_monthly` (or annual)
- Modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'] (hardcoded)
- Metadata: `{planType: 'four_module_bundle'}` (NO activeModules, uses default)

**Expected Success Route:**
- `/SubscriptionSuccessFlow?next=/CollectionHub`

**Expected Access Result After Sync:**
- All 4 modules enabled
- Existing PipeKeeper subscription replaced with 4-module subscription
- All Keepers accessible

**Pass/Fail Criteria:**
- ✅ PASS: 4-module plan selected, all modules unlocked, expansion flow works
- ❌ FAIL: Metadata not created, modules not enabled, or old subscription not replaced

**Notes:**
- Verify Stripe shows upgrade (not new subscription) or proper handling of multiple subs
- Check that getModulesFromPlanKey returns all 4 for 'four_module_bundle'
- **Note:** CigarKeeper and WineKeeper may show as "Coming Soon" in UI, but subscription should still grant access

---

### TEST 9: Billing Period Accuracy Validation

**Preconditions:**
- Completed at least 3 purchases (1 monthly, 1 annual, 1 bundle)
- Access to Stripe Dashboard

**Validation Actions:**
1. For each subscription:
   - Check subscription.billing_cycle_anchor
   - Check subscription.current_period_start and current_period_end
   - Calculate days between start and end:
     - Monthly: should be ~30 days
     - Annual: should be ~365 days
2. In database Subscription entity:
   - Check `billing_interval` field
   - Should be "month" or "year" depending on plan
   - Check `current_period_end` ISO timestamp

**Expected Data State:**
- Monthly subscriptions:
  - `billing_interval: "month"`
  - Period duration ~30 days
  - Next billing date ~30 days from start
- Annual subscriptions:
  - `billing_interval: "year"`
  - Period duration ~365 days
  - Next billing date ~365 days from start

**Pass/Fail Criteria:**
- ✅ PASS: All billing intervals correct, period durations accurate
- ❌ FAIL: Billing period mixed up (monthly billed as annual, etc.), duration wrong, or interval not preserved

**Notes:**
- This validates billing period preservation from UI → Stripe → Database
- Check for off-by-one errors in date calculations
- Verify no subscriptions were created with wrong interval

---

### TEST 10: Checkout Failure Messaging Validation

**Preconditions:**
- Use invalid test card or simulate Stripe error

**Test Actions:**
1. **Scenario A - Invalid Card:**
   - Navigate to paywall
   - Select plan and click "Unlock"
   - In Stripe checkout, use card: `4000 0000 0000 0002` (declined)
   - Click "Subscribe"
   - Observe error messaging

2. **Scenario B - Network Failure (simulate):**
   - Open Network tab in DevTools
   - Navigate to paywall, select plan
   - Block `createCheckoutSession` function call
   - Click "Unlock"
   - Observe error handling

3. **Scenario C - Missing Price ID (simulated in dev):**
   - If possible in staging, temporarily remove one env var
   - Navigate to that module's paywall
   - Observe error message

**Expected Error Messaging:**
- Toast notification appears with clear message
- Error includes actionable guidance (e.g., "try again" vs "contact support")
- Modal remains open (not dismissed), user can retry
- No console errors or exceptions

**Pass/Fail Criteria:**
- ✅ PASS: All error scenarios show clear user-facing messaging, retry is possible
- ❌ FAIL: Generic errors, unclear messaging, or app crashes

**Notes:**
- Document exact error messages for QA review
- Verify no sensitive information (API keys, internal error codes) in user-facing messages
- Check that retry button is functional (not just toast)

---

### TEST 11: Sync Failure / Retry Validation

**Preconditions:**
- Ability to simulate sync delay or failure

**Test Actions:**
1. **Scenario A - Slow Sync (>5 sec delay):**
   - Complete purchase as normal
   - Stripe webhook processes subscription
   - Observe SubscriptionSuccessFlow loading phase
   - Confirm spinner shows and waits for sync
   - Eventually success page displays

2. **Scenario B - Sync Timeout:**
   - If possible, add 30+ sec delay to Stripe webhook processing
   - Complete purchase
   - SubscriptionSuccessFlow hits error state after timeout
   - Click "Retry" button
   - Observe page reload and retry attempt
   - Confirm eventual success

3. **Scenario C - No Subscription Found (immediate):**
   - (Hard to simulate in production)
   - If sync detects no subscription, error state shows
   - User can click "Retry" or "Continue Anyway"

**Expected Behavior:**
- Loading phase: Spinner with message "Activating your subscription..."
- Sync success: Within 5-10 seconds, success page displays
- Sync failure: Error page with "Retry" button and option to continue anyway
- Retry: Page reload, re-invokes syncSubscriptionForMe

**Pass/Fail Criteria:**
- ✅ PASS: Loading phase works, sync completes, retry functional, user can proceed
- ❌ FAIL: Spinner never resolves, retry doesn't work, or user stuck on error page

**Notes:**
- Time how long sync takes end-to-end
- Document any delays > 5 seconds
- Verify Stripe webhook was successfully processed if sync fails

---

### TEST 12: Success Page / Post-Purchase Routing Validation

**Preconditions:**
- Complete a successful purchase (from any prior test)
- Observe the entire post-purchase flow

**Validation Actions:**
1. After Stripe checkout completes:
   - Observe redirect to `/SubscriptionSuccessFlow?next=...`
   - Verify URL includes correct `next` parameter
   - For module unlock: `?next=/[ModuleName]`
   - For onboarding: `?next=/CollectionHub`
   - For general upgrade: `?next=/CollectionHub` or custom URL

2. On SuccriptionSuccessFlow page:
   - Spinner visible during sync
   - Success phase after 1-10 seconds
   - Module list displayed correctly
   - "Explore Collections" or "Continue" button shown

3. Click success button:
   - User routed to `next` parameter URL
   - Page loads correctly
   - Module/collection accessible
   - No 404 or routing errors

**Expected Routing Outcomes:**
| Scenario | Success URL | Next Param | Expected Route |
|----------|---|---|---|
| PipeKeeper unlock | ✓ | `/PipeKeeper` | `/PipeKeeper` |
| WhiskeyKeeper unlock | ✓ | `/WhiskeyKeeper` | `/WhiskeyKeeper` |
| Onboarding purchase | ✓ | `/CollectionHub` | `/CollectionHub` |
| 3-module bundle | ✓ | Custom or default | Correct module |

**Pass/Fail Criteria:**
- ✅ PASS: All redirect URLs correct, modules accessible post-redirect
- ❌ FAIL: Wrong route, 404 on destination, or module not accessible

**Notes:**
- Verify no redirect loops or back-button issues
- Confirm browser history is clean (can go back without hitting checkout page again)
- Check for any intermediate blank/loading pages

---

## Final Production Signoff Checklist

### Data Integrity
- [ ] All 12 test cases completed and passed
- [ ] No corrupted subscription records in database
- [ ] All 13 Stripe price IDs correctly mapped
- [ ] Metadata serialization/parsing working for 3-module bundles
- [ ] Billing intervals (month/year) preserved correctly
- [ ] User tier correctly set to "pro" for all paid subscriptions

### User Experience
- [ ] No console errors during any checkout flow
- [ ] Error messages are clear and actionable
- [ ] Paywall appears correctly (module/multi/expansion types)
- [ ] Success pages display correct module names
- [ ] Post-purchase routing works for all scenarios
- [ ] Toast notifications appear for success and errors

### Stripe Integration
- [ ] Stripe Dashboard shows all test subscriptions
- [ ] Subscription objects have correct priceIds
- [ ] Metadata preserved in Stripe (check 3-module activeModules)
- [ ] Webhook receipts logged (check processing)
- [ ] No failed or pending subscriptions

### Edge Cases
- [ ] Users can retry failed checkout
- [ ] Retry button works on SubscriptionSuccessFlow error state
- [ ] Onboarding paywall closes correctly and resumes flow
- [ ] Annual billing period preserved and verified
- [ ] Module routes map correctly (especially WineKeeper)

### Final Code Checks
- [ ] ✅ WineKeeper route fixed to `/WineKeeper`
- [ ] ✅ No console warnings about missing env vars
- [ ] ✅ No stale payment state in localStorage
- [ ] ✅ All error paths have user-facing messaging

---

## Known Issues That Would Block Launch

### BLOCKING
- [ ] **WineKeeper Route Bug:** `moduleRoutes.js` line 10 maps to `/Whiskey` instead of `/WineKeeper`
  - **Fix Required:** Change `winekeeper: '/Whiskey'` to `winekeeper: '/WineKeeper'`
  - **Impact:** Users unlocking WineKeeper routed to WhiskeyKeeper
  - **Fix Time:** < 1 min
  - **Status:** Must fix before go-live

- [ ] **Missing Env Vars at Startup:** No validation warning if any VITE_STRIPE_* vars missing
  - **Impact:** Silent checkout failures with cryptic errors
  - **Recommended Fix:** Add startup console.warn in main app entry
  - **Fix Time:** < 5 min
  - **Status:** Strongly recommended before go-live

### NON-BLOCKING (Can Deploy, Monitor)
- [ ] **Paywall Error UX:** Toast-only errors don't stay visible if modal closed
  - **Workaround:** Add error banner inside PaywallModal
  - **Impact:** Low, most users will see toast before clicking away
  - **Status:** Can deploy, improve in v2

- [ ] **Sync Timeout:** SubscriptionSuccessFlow has no explicit timeout, could hang indefinitely
  - **Workaround:** Browser auto-refresh after 5 min, or user clicks Retry
  - **Impact:** Low, edge case (Stripe webhook delay > 5 min)
  - **Status:** Can deploy, monitor webhook delays

---

## Test Results Summary

| Test Case | Status | Date | Tester Notes |
|-----------|--------|------|---|
| 1. PipeKeeper Monthly | [ ] | __ | __ |
| 2. PipeKeeper Annual | [ ] | __ | __ |
| 3. WhiskeyKeeper Monthly | [ ] | __ | __ |
| 4. WhiskeyKeeper Annual | [ ] | __ | __ |
| 5. CigarKeeper Unlock | [ ] | __ | __ |
| 6. Onboarding → Paywall | [ ] | __ | __ |
| 7. 3-Module Metadata | [ ] | __ | __ |
| 8. 4-Module Bundle | [ ] | __ | __ |
| 9. Billing Period Accuracy | [ ] | __ | __ |
| 10. Checkout Errors | [ ] | __ | __ |
| 11. Sync Retry | [ ] | __ | __ |
| 12. Success Routing | [ ] | __ | __ |

**Overall Result:** [ ] ALL PASS ✅ | [ ] SOME FAIL ❌ | [ ] BLOCKING ISSUES 🔴

---

## Sign-Off

**QA Tester Name:** _______________________  
**Test Completion Date:** _______________________  
**Issues Found:** _______________________  
**Recommended for Production Launch:** YES [ ] / NO [ ]  

**Approver Name:** _______________________  
**Approval Date:** _______________________  

---

## Appendix: Useful Debug Commands

### Check Current Subscription
```js
// In browser console after login
const user = await base44.auth.me();
console.log(user.email);
// Then check Stripe Dashboard for subscriptions matching this email
```

### Verify Stripe Config
```js
// In browser console
import { getStripeConfig, validateStripeConfig } from '@/components/subscription/stripeConfig';
const config = getStripeConfig();
const validation = validateStripeConfig();
console.log('Validation:', validation);
```

### Check Module Routes
```js
// In browser console
import { getModuleSuccessRoute } from '@/components/subscription/moduleRoutes';
console.log(getModuleSuccessRoute('whiskeykeeper')); // Should output '/WhiskeyKeeper'
console.log(getModuleSuccessRoute('winekeeper'));     // Should output '/WineKeeper' (after fix)
```

### Monitor Stripe Webhooks
```
Stripe Dashboard → Webhooks → View Details
Look for events:
  - customer.subscription.created
  - customer.subscription.updated
Check timestamps and payloads for test subscriptions
```

---

**End of Testing Checklist**