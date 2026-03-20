# QA CHECKLIST: CollectionKeeper-First Refactor

## PRE-DEPLOYMENT TESTING

### Access System Core

#### BuildAccessSummary Tests
- [ ] Free user → tier: "free", activeModules: []
- [ ] Pro user, single module → tier: "pro", activeModules: ["pipekeeper"]
- [ ] Pro user, 3-module bundle → tier: "pro", activeModules: ["pipekeeper", "whiskeykeeper", "cigarkeeper"]
- [ ] Pro user, 4-module bundle → tier: "pro", activeModules: all
- [ ] Founding member → all modules unlocked
- [ ] Admin user → always pro tier
- [ ] Provider correctly resolved (stripe/apple/null)
- [ ] Billing period correctly resolved (monthly/annual/null)
- [ ] planKey matches Stripe product (e.g., "pipekeeper_pro_monthly")
- [ ] Status correctly resolved (active/trialing/canceled/inactive)

#### Selector Function Tests
- [ ] `hasPaidAccess()` returns true only for pro users
- [ ] `isFree()` returns true only for free users
- [ ] `hasModuleAccess(access, 'pipekeeper')` works correctly for each module
- [ ] `getModuleCount()` returns correct count
- [ ] `getActiveModules()` returns copy (not reference)
- [ ] `canUseFeature()` blocks free users from pro features
- [ ] `getVisibleModules()` respects hiddenModules array
- [ ] `getLockedModules()` returns complement of activeModules
- [ ] All selector functions handle null access gracefully

#### Hook Integration
- [ ] `useAccessSummary()` returns null during loading
- [ ] `useAccessSummary()` returns AccessSummary after loading
- [ ] Hook refetches when user/subscription changes
- [ ] Hook doesn't cause infinite re-renders

### Onboarding Flow

#### Module Selection
- [ ] CollectionKeeper shown first (not PipeKeeper branding)
- [ ] Users can select no modules (error: "at least 1 required")
- [ ] Users can select only PipeKeeper
- [ ] Users can select only WhiskeyKeeper
- [ ] Users can select both modules
- [ ] CigarKeeper shown as "coming soon" (disabled)
- [ ] WineKeeper shown as "coming soon" (disabled)
- [ ] Selected modules persist across page refresh
- [ ] Selected modules shown in step summary

#### Paywall Integration
- [ ] Free user, 1 module selected → offer free OR single pro
- [ ] Free user, 2 modules selected → suggest 3-module bundle
- [ ] Free user, 3 modules selected → offer free OR 3-bundle
- [ ] Free user, 4 modules selected → offer free OR 4-bundle
- [ ] User can complete purchase and return to onboarding
- [ ] User can skip paywall and continue with free tier
- [ ] Selected modules preserved after paywall

#### Onboarding Completion
- [ ] "All Set" button navigates to appropriate page
- [ ] Profile setup links work
- [ ] Pipes/Tobacco add links work
- [ ] Onboarding marked as completed in localStorage
- [ ] Onboarding not shown again for completed users

### Subscription System

#### Stripe Product Mapping
- [ ] `founders_bundle_annual` → all 4 modules
- [ ] `pipekeeper_pro_monthly` → pipekeeper only
- [ ] `pipekeeper_pro_annual` → pipekeeper only
- [ ] `whiskeykeeper_pro_monthly` → whiskeykeeper only
- [ ] `whiskeykeeper_pro_annual` → whiskeykeeper only
- [ ] `3_module_bundle_monthly` → correct 3 from metadata
- [ ] `3_module_bundle_annual` → correct 3 from metadata
- [ ] `4_module_bundle_monthly` → all 4 modules
- [ ] `4_module_bundle_annual` → all 4 modules

#### Subscription Status
- [ ] Active subscription → status: "active"
- [ ] Trialing subscription → status: "trialing"
- [ ] Canceled subscription → status: "canceled"
- [ ] Past due subscription → status: "past_due"
- [ ] Billing period detected correctly
- [ ] Provider detected correctly

### Module Access Enforcement

#### PipeKeeper
- [ ] Free user cannot access
- [ ] Pro user with pipekeeper can access
- [ ] Pro user without pipekeeper cannot access
- [ ] Can add/edit pipes when access granted
- [ ] Cannot add/edit pipes when access denied
- [ ] List shows/hides based on access

#### WhiskeyKeeper
- [ ] Free user cannot access
- [ ] Pro user with whiskeykeeper can access
- [ ] Pro user without whiskeykeeper cannot access
- [ ] Can add/edit bottles when access granted
- [ ] Cannot add/edit bottles when access denied
- [ ] List shows/hides based on access

#### CigarKeeper (Coming Soon)
- [ ] Disabled in module selection
- [ ] Not shown in nav (coming soon placeholder only)
- [ ] No access even for pro users

#### WineKeeper (Coming Soon)
- [ ] Disabled in module selection
- [ ] Not shown in nav (coming soon placeholder only)
- [ ] No access even for pro users

### Navigation & UI

#### Main Navigation
- [ ] Home/Hub visible to all
- [ ] PipeKeeper shows only for users with access
- [ ] WhiskeyKeeper shows only for users with access
- [ ] Curator visible to users with any module
- [ ] Help/Profile visible to all
- [ ] Coming Soon modules shown (disabled)

#### Module Cards
- [ ] Accessible modules show "Open"
- [ ] Locked modules show "Unlock" with upgrade button
- [ ] Hidden modules don't show in visible list

#### Upgrade Prompts
- [ ] Free users see upgrade prompts
- [ ] Pro, single module sees "add modules" prompt
- [ ] Pro, 3 modules sees "add 4th module" prompt
- [ ] Pro, all modules sees no upsell

### Feature Gating

#### Free Tier Features
- [ ] Can view pipes (read-only)
- [ ] Can view bottles (read-only)
- [ ] Can log smoking (basic)
- [ ] Can log tasting (basic)
- [ ] Cannot use specializations
- [ ] Cannot use advanced pairing
- [ ] Cannot use curator

#### Pro Tier Features
- [ ] All features unlocked for accessible modules
- [ ] Specializations work for module with access
- [ ] Advanced pairing works
- [ ] Curator works
- [ ] All edit features work

### Special Cases

#### Whiskey-Only User
- [ ] Can select WhiskeyKeeper in onboarding
- [ ] PipeKeeper access denied
- [ ] WhiskeyKeeper fully functional
- [ ] Curator works (for whiskey data)
- [ ] No broken links/dead buttons

#### Pipe-Only User
- [ ] Can select PipeKeeper in onboarding
- [ ] WhiskeyKeeper access denied
- [ ] PipeKeeper fully functional
- [ ] Curator works (for pipe data)
- [ ] No broken links/dead buttons

#### Founder Member
- [ ] All modules unlocked automatically
- [ ] Accessing coming-soon modules works
- [ ] isFoundingMember flag set correctly
- [ ] No upsell shown

#### Admin User
- [ ] Always tier: "pro"
- [ ] All modules accessible
- [ ] Can access admin pages
- [ ] Can test subscription flows

### Database & Persistence

#### User Profile
- [ ] selectedModules persisted
- [ ] hiddenModules respected
- [ ] Preference changes reflected in UI
- [ ] Survives logout/login

#### Subscription Entity
- [ ] planKey stored correctly
- [ ] activeModules stored correctly (for 3-bundles)
- [ ] Status updates reflected in access system
- [ ] Webhook updates reflected in access system

#### Onboarding State
- [ ] Completion flag persisted
- [ ] Current step persisted
- [ ] Selected modules persisted
- [ ] Cleared on logout

### Error Handling

#### Null/Undefined Inputs
- [ ] buildAccessSummary(null, null) returns safe default
- [ ] Selectors handle null access gracefully
- [ ] Hook returns null during loading
- [ ] Components don't crash on null

#### Missing Data
- [ ] No subscription → free tier
- [ ] No user → error redirect
- [ ] No planKey → modules derived from status

#### Edge Cases
- [ ] New user (no subscription) → free tier, no modules
- [ ] Subscription just canceled → correct status
- [ ] User deleted subscription → free tier
- [ ] Multiple subscriptions for user → best one picked

### Performance

#### Rendering
- [ ] No infinite render loops
- [ ] No unnecessary re-renders on access change
- [ ] useAccessSummary useMemo works correctly
- [ ] Module nav updates instantly on access change

#### Data Fetching
- [ ] User + subscription fetched once at startup
- [ ] Not fetched again on every render
- [ ] Webhook updates trigger refresh
- [ ] Manual subscription sync works

### Browser Compatibility

#### Browsers Tested
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

#### localStorage
- [ ] Works on all browsers
- [ ] Fails gracefully if unavailable
- [ ] Private/incognito mode handled

### Backwards Compatibility

#### Existing Users
- [ ] Can still login
- [ ] Subscription data migrated correctly
- [ ] Profile data preserved
- [ ] Hidden modules setting preserved

#### Old Session Data
- [ ] Old localStorage keys don't break app
- [ ] Can migrate data to new format
- [ ] No console warnings

### Integration Tests

#### Complete Onboarding Flow
1. [ ] New user → onboarding shown
2. [ ] Select 1 module → continue
3. [ ] Select 2 modules → paywall
4. [ ] Pay for upgrade → return to onboarding
5. [ ] Complete onboarding → home page
6. [ ] Access correct modules
7. [ ] Logout → login again
8. [ ] Access preserved

#### Upgrade Flow
1. [ ] Free user on home
2. [ ] Click module → locked module guard
3. [ ] Click upgrade → paywall with smart suggestion
4. [ ] Upgrade to bundle → refresh
5. [ ] Access correct modules now
6. [ ] Old module still accessible

#### Module Hiding
1. [ ] Pro user with 2 modules → both visible
2. [ ] Hide PipeKeeper in preferences
3. [ ] PipeKeeper hidden from nav
4. [ ] PipeKeeper still accessible if direct link
5. [ ] Unhide → visible again

---

## POST-DEPLOYMENT MONITORING

### Metrics to Track
- [ ] Onboarding completion rate (baseline vs. new)
- [ ] Module selection distribution
- [ ] Paywall conversion rate
- [ ] Error rates in access system
- [ ] Migration success (users able to access modules)

### Alerts to Set Up
- [ ] buildAccessSummary errors
- [ ] High null access rates
- [ ] Module access grant failures
- [ ] Subscription sync failures

### User Support
- [ ] FAQ updated with new module system
- [ ] Help section covers new paywall
- [ ] Support can quickly verify user access
- [ ] Clear escalation path for access issues

---

## SIGN-OFF

- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] No broken links/dead buttons
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Ready for production deployment

**Tested By**: _________________
**Date**: _________________
**Issues Found**: _________________