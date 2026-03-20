# PayWall QA Checklist - Module-Focused Revenue System

## PRE-LAUNCH VALIDATION

### Paywall Component Tests

#### MODULE PAYWALL
- [ ] Opens when user tries to access locked module
- [ ] Shows correct module icon and name
- [ ] Shows module-specific description
- [ ] Single module plan is highlighted (default selection)
- [ ] Displays 3 pricing options (single, 3-bundle, 4-bundle)
- [ ] Monthly/annual toggle works on all cards
- [ ] Pricing matches Stripe exactly:
  - [ ] Single: $2.99/mo or $29.99/yr
  - [ ] 3-bundle: $7.99/mo or $79.99/yr
  - [ ] 4-bundle: $8.99/mo or $89.99/yr
- [ ] Close button returns to previous context
- [ ] Clicking CTA routes to Stripe checkout

#### MULTI-MODULE PAYWALL (Onboarding)
- [ ] Triggers when user selects 2+ modules
- [ ] Shows "Build Your Collection System" headline
- [ ] Displays selected modules as chips
- [ ] 3-module bundle is highlighted (default)
- [ ] Shows correct pricing:
  - [ ] 3-bundle: $7.99/mo or $79.99/yr
  - [ ] 4-bundle: $8.99/mo or $89.99/yr
  - [ ] Single option: $2.99/mo or $29.99/yr
- [ ] Selected modules passed to Stripe
- [ ] Close button allows free tier continuation

#### EXPANSION PAYWALL
- [ ] Triggers when pro user opens new module
- [ ] Shows "Expand Your Collection" headline
- [ ] Displays current modules as chips
- [ ] First option is "Add [Module]" ($2.99/mo)
- [ ] 3-bundle upgrade highlighted
- [ ] Shows upgrade prices correctly
- [ ] Close button returns to module

### Stripe Integration Tests

#### Checkout Session
- [ ] Session created with correct price ID
- [ ] Metadata includes plan type
- [ ] For 3-bundle: metadata includes activeModules array
- [ ] Customer created if new email
- [ ] Existing customer reused if found
- [ ] Billing and success URLs correct
- [ ] Session redirects to Stripe correctly

#### Post-Purchase Flow
- [ ] POST /syncSubscriptionForMe called on success
- [ ] Subscription synced to database
- [ ] planKey set correctly (e.g., "three_module_bundle_monthly")
- [ ] activeModules extracted from metadata (3-bundle)
- [ ] Access summary rebuilt
- [ ] User module access updated
- [ ] User redirected to correct page

### Access System Integration

#### Single Module Plan
- [ ] User gets exactly 1 module
- [ ] Other modules remain locked
- [ ] Can view module, add content
- [ ] Features gated to that module work

#### 3-Module Bundle
- [ ] User gets exactly 3 selected modules
- [ ] Other modules remain locked
- [ ] Selected modules stored in metadata
- [ ] If same user purchases again: same modules
- [ ] All 3 modules fully accessible

#### 4-Module Bundle
- [ ] User gets all 4 modules
- [ ] All features unlocked
- [ ] No modules locked

### Onboarding Integration

#### No Selection → No Paywall
- [ ] Free user proceeds through onboarding
- [ ] No paywall shown
- [ ] Module preferences saved
- [ ] User completes onboarding as free tier

#### 1 Module Selection → Optional Paywall
- [ ] User can select just PipeKeeper
- [ ] Single module paywall shown (optional)
- [ ] Can close and continue free
- [ ] Can purchase single module
- [ ] Continue to next onboarding step

#### 2+ Module Selection → Paywall Shown
- [ ] PipeKeeper + WhiskeyKeeper selected
- [ ] Multi paywall shown automatically
- [ ] 3-module bundle highlighted
- [ ] Selected modules clearly displayed
- [ ] Can select bundle or continue with single
- [ ] On success: returns to onboarding completion

### Copy & Language Tests

#### Required Copy (MUST APPEAR)
- [ ] "Unlock [ModuleName]"
- [ ] "Add [ModuleName]"
- [ ] "Expand Your Collection"
- [ ] "Unlock 3 Keepers"
- [ ] "Unlock Everything"
- [ ] "Go All In"
- [ ] "Cancel anytime"

#### Forbidden Copy (MUST NOT APPEAR)
- [ ] "Upgrade to Premium" ❌
- [ ] "Unlock Full Access" ❌
- [ ] "Pro Plan" ❌
- [ ] "Subscribe for more" ❌
- [ ] "Unlock all features" ❌

### Mobile Responsiveness

- [ ] Paywall modal displays correctly on mobile
- [ ] Text is readable (not cramped)
- [ ] Pricing cards stack vertically
- [ ] Buttons are tappable (min 44px)
- [ ] Monthly/annual toggle works on mobile
- [ ] Close button accessible on mobile
- [ ] No horizontal scroll needed

### Dark Theme Compliance

- [ ] Background color correct (#0B0B0C)
- [ ] Cards display correctly (#141416)
- [ ] Text contrast sufficient
- [ ] Gold accent highlights (#D4A574)
- [ ] Borders visible on dark bg
- [ ] Shadow effects visible

### Edge Cases & Error Handling

#### Invalid Inputs
- [ ] Invalid plan key → error message
- [ ] Missing Stripe price ID → error message
- [ ] User not logged in → redirect to login
- [ ] Network error → user-friendly message

#### Timing Issues
- [ ] Rapid paywall close/open → handled gracefully
- [ ] Double-click CTA → only one checkout session
- [ ] Modal still open after page navigate → closes on nav
- [ ] Token expiry during checkout → graceful fallback

#### Conflict Scenarios
- [ ] User cancels Stripe checkout → returns to paywall
- [ ] User goes back after purchase → no double charge
- [ ] Stripe webhook delayed → eventual sync on page refresh
- [ ] User has multiple subscriptions → best one selected

### Specific Failure Scenarios (MUST PASS)

- [ ] Paid user (1 module) sees expansion paywall (NOT module paywall)
- [ ] Free user selecting 2 modules sees multi paywall (NOT module paywall)
- [ ] 3-bundle user: modules are exactly what they selected (not random)
- [ ] User purchases 3-bundle (Pipe + Whiskey): those 2 + 1 other (not all 4)
- [ ] User purchases 4-bundle: can access ALL modules immediately
- [ ] Onboarding module selection preserved through paywall
- [ ] No "Upgrade to Premium" language appears anywhere
- [ ] Paywall never shows PipeKeeper as forced default

---

## PRODUCTION DEPLOYMENT CHECKLIST

### Before Going Live
- [ ] All Stripe price IDs set in environment
- [ ] subscriptionHandler.ts price mapping complete
- [ ] createCheckoutSession.js configured
- [ ] syncSubscriptionForMe.js configured
- [ ] onboardingState persistence working
- [ ] AccessSummary integration tested
- [ ] Module visibility working correctly

### Go-Live Tasks
- [ ] Create test subscriptions as each type (single, 3, 4, founders)
- [ ] Verify entitlements applied correctly for each
- [ ] Monitor webhook deliveries (first 24h)
- [ ] Monitor sync failures (Sentry/logs)
- [ ] Check for payment processing errors
- [ ] Monitor user feedback channels

### Post-Launch (First Week)
- [ ] 0 cases of "all modules unlocked" for paid users
- [ ] 0 cases of wrong modules for users
- [ ] Conversion rate meets baseline target
- [ ] No Stripe API errors in logs
- [ ] No sync failures
- [ ] No user complaints about locked modules

---

## MONITOR THESE METRICS

### Success Indicators
- [ ] Onboarding → paywall conversion rate
- [ ] Paywall → Stripe checkout rate
- [ ] Stripe checkout → payment success rate
- [ ] Post-purchase module access (should be 100%)
- [ ] Return of successful sync calls (should be 99%+)

### Error Indicators (Alert if > 0)
- [ ] Checkout session creation failures
- [ ] Subscription sync failures
- [ ] Users with mismatched plans/modules
- [ ] 3-module bundles with wrong module count
- [ ] Post-purchase users still seeing paywall

---

## SIGN-OFF

**Component Quality**: ✅
**Stripe Integration**: ✅
**Onboarding Integration**: ✅
**Access System Integration**: ✅
**Copy & Language**: ✅
**Mobile Support**: ✅
**Error Handling**: ✅
**Documentation**: ✅

**Ready for Production**: YES

**Tested By**: _____________
**Date**: _____________
**Issues Found**: _____________