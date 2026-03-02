# PipeKeeper QA & Regression Testing Checklist
**Version:** 2026-02-03  
**Status:** Production-Ready  
**Last Updated:** 2026-02-03

---

## 🎯 Critical Paths Overview

| Path | Tests | Priority | Est. Time |
|------|-------|----------|-----------|
| Data Consistency | 3 | **CRITICAL** | 15 min |
| Subscription & Entitlements | 3 | **CRITICAL** | 20 min |
| Apple Compliance | 2 | **CRITICAL** | 10 min |
| UX & Empty States | 3 | HIGH | 10 min |
| AI Features | 3 | HIGH | 15 min |
| Subscription Flows | 3 | **CRITICAL** | 15 min |
| Internationalization | 2 | MEDIUM | 10 min |
| Exports & Reports | 2 | HIGH | 10 min |
| Performance & Errors | 2 | MEDIUM | 10 min |

**Total Manual Testing Time:** ~1.5-2 hours

---

## ✅ CRITICAL PATH 1: Data Consistency

### TEST 1.1: Tobacco Quantity Totals Match Everywhere
**Expected:** Home stats, TobaccoCollectionStats, CSV exports all show IDENTICAL totals

**Steps:**
1. Add tobacco with: 2 tins (1.75oz each), 5oz bulk, 1 pouch (1.5oz)
2. Add CellarLog: +3.5oz tin (added), -1oz tin (removed)
3. Check Home "Cellar Breakdown" card → Should show net cellared from CellarLog
4. Navigate to Tobacco page → Open Stats → Check "Total Inventory"
5. Export CSV from Tobacco page → Compare totals

**Expected Outcome:**
- Total = 3.5oz + 5oz + 1.5oz = 10oz (from TobaccoBlend fields)
- Cellared (from logs) = 3.5oz - 1oz = 2.5oz
- All three views MUST MATCH

**Canonical Functions:**
- `calculateTotalOzFromBlend(blend)` → total inventory
- `calculateCellaredOzFromLogs(logs, blendId)` → cellared from ledger

---

### TEST 1.2: Pairing Scores Consistent
**Expected:** Same pipe+blend yields same score in PairingMatrix, MatchingEngine, TopBlendMatches

**Steps:**
1. Create aromatic-focused pipe
2. Create 2 blends: "1792 Flake" (non-aromatic), "Lane 1-Q" (aromatic)
3. Generate Pairing Matrix
4. Check score for aromatic pipe + 1792 Flake → Should be 0 (filtered)
5. Navigate to pipe detail → MatchingEngine → Verify same score
6. Open PairingMatrix grid → Verify top 3 sorted descending

**Expected Outcome:**
- Aromatic pipe + non-aromatic blend = 0 (always filtered)
- Same blend = same score across all views
- Top 3 always sorted highest to lowest

**Canonical Function:**
- `scorePipeBlend()` from `pairingScoreCanonical.js`

---

### TEST 1.3: Cellar Drift Detection
**Expected:** Drift alert appears when TobaccoBlend rollup doesn't match CellarLog ledger

**Steps:**
1. Create blend with 5 tins cellared (manual entry)
2. Add CellarLog: +2 tins added (3.5oz), +1 tin added (1.75oz)
3. Navigate to Tobacco page
4. Should see drift alert banner: "2 blend(s) have cellared amounts that don't match"
5. Click "View Details" → Should show difference
6. Click "Reconcile All" → Should update to match logs (5.25oz)
7. Drift alert should disappear
8. Run reconcile again → Should be idempotent (no changes)

**Expected Outcome:**
- Drift detected when logs ≠ entity fields (tolerance 0.1oz)
- Reconcile updates ONLY `tin_tins_cellared`, `bulk_cellared`, `pouch_pouches_cellared`
- Notes, names, metadata NEVER touched
- Idempotent: running twice = same result

---

## ✅ CRITICAL PATH 2: Subscription & Entitlements

### TEST 2.1: Free Tier Limits Enforced

**Steps:**
1. Create new user (auto free tier, 7-day trial)
2. Add 4 pipes (free limit = 3 non-grandfathered)
3. Should see error: "Free tier limited to 3 pipes. Upgrade to add more."
4. Add 6 tobacco blends (free limit = 5)
5. Should see error: "Free tier limited to 5 tobacco blends."
6. Create 11 usage logs (free limit = 10)
7. Should see error: "Free tier limited to 10 usage logs."

**Expected Outcome:**
- Limits enforced BEFORE creation
- Toast shows upgrade CTA
- No partial data created

**Functions:**
- `canCreatePipe()`, `canCreateTobacco()` from `limitChecks.js`
- `useEntitlements()` hook

---

### TEST 2.2: Pro vs Premium Feature Gates

**Premium Features (blue badge):**
- Usage Log tracking
- Manual tobacco valuation (cost_basis, manual_market_value)
- Community features
- Export reports (CSV/PDF)

**Pro Features (amber badge):**
- AI tobacco valuation (AI estimation + projections)
- Collection Optimization
- What-If scenarios
- AI Updates (regen pairings, optimization)

**Steps:**
1. Login as free user (trial expired)
2. Navigate to Home → AI Tools → Collection Optimization
3. Should see "Upgrade to Pro" prompt (amber badge)
4. Navigate to Tobacco detail → AI Valuation
5. Should see locked "Run AI Valuation" button (amber badge)
6. Subscribe to Premium (not Pro)
7. AI features should still be locked
8. Upgrade to Pro
9. AI features should unlock

**Expected Outcome:**
- Premium unlocks basic features (blue badges)
- Pro unlocks AI features (amber badges)
- Legacy Premium (before Feb 1 2026) gets Pro features
- Subscription page shows correct tier badges

**Functions:**
- `useEntitlements().canUse(feature)`
- `isLegacyPremium()` from `premiumAccess.js`

---

### TEST 2.3: Trial Period Behavior

**Steps:**
1. New user registers → Should have 7-day trial to Premium tier
2. Day 1-6: Paywall should say "Starts after your 7-day Premium access ends"
3. Day 7+: Paywall should say "Renews automatically. Cancel anytime."
4. After trial expires:
   - Premium features locked
   - Pro features locked
   - Free features still work (3 pipes, 5 blends, 10 logs)
5. Subscribe → Features unlock immediately

**Expected Outcome:**
- Trial messaging accurate
- Features gate correctly post-trial
- Subscription activates without page refresh

**Functions:**
- `getCurrentTrialDay()` from `paywallTriggers.js`
- `hasPremiumAccess()` from `premiumAccess.js`

---

## ✅ CRITICAL PATH 3: Apple Compliance

### TEST 3.1: Terminology Replacement

**Steps:**
1. Search all UI text for "smoking", "smoke", "smoker"
2. Verify replaced with "usage", "use", "collector"
3. Check SmokingLog entity → Should have `bowls_used` field
4. Check Pipe entity → Should have `usage_characteristics` field
5. Check exports → Filenames should be "usage-log-*.pdf"

**Expected Outcome:**
- NO instances of "smoking" in user-facing UI
- Entity schemas have new fields + legacy fallbacks
- All code handles both new and legacy fields gracefully

**Files to Check:**
- SmokingLogPanel → "Usage Log"
- SmokingLogEditor → "Log Usage Session"
- RotationPlanner → "Recently Used"
- PipeForm → "Usage Characteristics"
- Export filenames → "usage-log-*.pdf"

---

### TEST 3.2: Schema Backward Compatibility

**Steps:**
1. Create old-format log: `{ bowls_smoked: 2 }` (no bowls_used)
2. View log in SmokingLogPanel → Should display "2 bowls"
3. Edit log → Should preserve count
4. Save → Should write BOTH `bowls_used` AND `bowls_smoked`
5. Create new-format log: `{ bowls_used: 3 }`
6. View → Should work identically

**Expected Outcome:**
- `getBowlsUsed(log)` reads new OR legacy field
- `prepareLogData()` writes BOTH fields for compatibility
- No data loss during migration

**Functions:**
- `getBowlsUsed()`, `prepareLogData()` from `schemaCompatibility.js`

---

## ✅ CRITICAL PATH 4: UX & Empty States

### TEST 4.1: Empty State Action Buttons Work

**Steps:**
1. New user with no data
2. Home → Collection Insights → Pairing tab
3. Should see: "Pairing recommendations require pipes and tobacco"
4. Click "Add First Pipe" → Should navigate to Pipes page
5. Click "Add First Blend" → Should navigate to Tobacco page
6. Repeat for: Usage Log, Rotation, Aging, AI Tools tabs

**Expected Outcome:**
- All empty states have action buttons
- Buttons navigate to correct pages
- Text explains what feature does
- Icons are relevant and visible

---

### TEST 4.2: Tooltips Display Correctly

**Steps:**
1. Hover over (i) icon next to "Collection Insights"
2. Should see: "This section summarizes patterns..."
3. Navigate to AI Tools → Hover over "Collection Optimization" tooltip
4. Should see: "AI analyzes your collection and recommends..."
5. Navigate to Pairing Grid → Hover over title tooltip
6. Should see: "AI-generated compatibility scores for each pipe-tobacco pairing..."

**Expected Outcome:**
- Tooltips appear on hover
- Text is helpful and concise
- No hardcoded English in non-English locales

---

### TEST 4.3: Badge Color Contrast

**Steps:**
1. Navigate to Subscription page
2. Check Pro badge → Should be `bg-amber-100 text-amber-800`
3. Check Premium badge → Should be `bg-blue-100 text-blue-800`
4. Navigate to any Pro feature gate
5. Badge should be clearly readable (high contrast)

**Expected Outcome:**
- Pro badges: amber background, dark amber text
- Premium badges: blue background, dark blue text
- Clear visual distinction between tiers

---

## ✅ CRITICAL PATH 5: AI Features

### TEST 5.1: Pairing Matrix Regeneration

**Steps:**
1. User with 5 pipes, 8 blends
2. Generate Pairing Matrix (AI Tools → Pairings → Regenerate)
3. Wait for completion
4. Check "Out of date" → "Up to date" status change
5. Add new pipe
6. Status should change to "Out of date - regeneration recommended"
7. Click Regenerate again
8. Should create new matrix, mark previous as inactive
9. Click Undo → Should revert to previous version

**Expected Outcome:**
- Fingerprint tracking detects staleness
- Regeneration creates new artifact
- Undo restores previous version
- `is_active` flag toggles correctly

---

### TEST 5.2: Collection Optimization

**Steps:**
1. User with mixed collection (no specializations set)
2. Navigate to AI Tools → Optimize tab
3. Click Regenerate
4. Should suggest pipe focus assignments
5. Apply 3 recommendations
6. Check pipe focus arrays updated
7. Navigate to PairingMatrix
8. Scores should reflect new focus assignments

**Expected Outcome:**
- Optimization suggests valid blend_types from enum
- Apply batch updates multiple pipes atomically
- Pairing scores recalculate based on focus

---

### TEST 5.3: Aromatic Filtering Logic

**Steps:**
1. Create aromatic-focused pipe (`focus: ["Aromatic"]`)
2. Create blends:
   - "Lane 1-Q" (`blend_type: Aromatic`, `flavor_notes: ["Vanilla"]`)
   - "Nightcap" (`blend_type: English`, no aromatic notes)
3. Generate pairings
4. Check aromatic pipe + Nightcap score → MUST be 0
5. Check aromatic pipe + Lane 1-Q score → Should be > 0

**Expected Outcome:**
- `isAromaticBlend()` correctly identifies aromatics
- Aromatic pipes ALWAYS score 0 with non-aromatics
- Non-aromatic pipes CAN pair with aromatics (not bidirectional)

**Function:**
- `isAromaticBlend()` from `pairingScoreCanonical.js`

---

## ✅ CRITICAL PATH 6: Subscription Flows

### TEST 6.1: Stripe Subscription Creation

**Steps:**
1. Free user navigates to Subscription page
2. Click "Continue with Premium"
3. Should redirect to Stripe Checkout
4. Complete payment (test mode)
5. Redirect back to app
6. Subscription status should update within 30 seconds
7. Premium features should unlock

**Expected Outcome:**
- Webhook processes `subscription.created`
- Subscription entity created with correct tier
- User entitlements update
- No page refresh required

**Backend Functions:**
- `stripeWebhook.js` processes events
- `syncStripeSubscriptions.js` reconciles

---

### TEST 6.2: Apple IAP Subscription (iOS Build)

**Steps:**
1. iOS app user taps "Upgrade (App Store)"
2. Native paywall opens
3. Complete purchase in StoreKit
4. Receipt posted to `syncAppleSubscriptionForMe`
5. Subscription entity created with `provider: "apple"`
6. Features unlock without app restart

**Expected Outcome:**
- Apple subscription links to `user_id` (not email)
- Prevents double-linking to different accounts
- Entitlements sync via native bridge
- "Manage Subscription" opens Apple Subscriptions

**Backend Function:**
- `syncAppleSubscriptionForMe.js`

---

### TEST 6.3: Founding Member Badge

**Steps:**
1. User subscribed before Feb 1, 2026
2. Login → Should see Founding Member popup (once)
3. Acknowledge → `foundingMemberAcknowledged` flag set
4. Profile should show Founding Member badge
5. Should get Pro features even on Premium tier

**Expected Outcome:**
- Popup shown once per user
- Legacy Premium treated as Pro
- Badge persists across sessions

**Function:**
- `ensureFoundingMemberStatus()` from `foundingMemberBackfill.js`

---

## ✅ CRITICAL PATH 7: Internationalization

### TEST 7.1: Language Switching

**Steps:**
1. Click language switcher → Select "Español"
2. Navigation should translate: "Home" → "Inicio", "Pipes" → "Pipas"
3. Subscription page: "Subscribe" → "Suscribirse"
4. Switch to Japanese → All UI translates
5. Refresh page → Language persists (localStorage: `pk_lang`)

**Expected Outcome:**
- 10 languages supported: en, es, fr, de, it, pt-BR, nl, pl, ja, zh-Hans
- All nav, buttons, labels translate
- Missing keys fall back to English (logged in dev mode)

**File:**
- `components/i18n/index.js`

---

### TEST 7.2: New Microcopy Translated

**Check these keys exist in all 10 languages:**
- `subscription.premiumActive`
- `subscription.premiumActiveSubtextTrial`
- `subscription.premiumActiveSubtextPaid`
- `subscription.annualSavings`
- `empty.usageLogNoPipes`
- `empty.usageLogAction`
- All other `empty.*` keys

**Expected Outcome:**
- No "undefined" or "[missing key]" in non-English locales
- Professional translations (not machine-translated gibberish)

---

## ✅ CRITICAL PATH 8: Exports & Reports

### TEST 8.1: CSV Export Accuracy

**Steps:**
1. Create collection: 3 pipes, 5 blends, 2 cellar logs
2. Export Tobacco Collection Report (CSV)
3. Open in Excel/Sheets
4. Verify totals match TobaccoCollectionStats
5. Verify cellared amounts match CellarLog ledger

**Expected Outcome:**
- CSV totals = UI totals (exact match)
- Uses canonical helpers (`calculateTotalOzFromBlend`)
- No rounding errors or off-by-one bugs

---

### TEST 8.2: PDF Preview & Print

**Steps:**
1. Export Insurance Report → Preview PDF
2. Modal should show formatted HTML preview
3. Click "Print/Download PDF" → Browser print dialog opens
4. Print to PDF or paper
5. Check formatting: headers, tables, totals

**Expected Outcome:**
- PDF renders correctly
- No overflow or clipping
- Totals and names accurate

---

## ✅ CRITICAL PATH 9: Performance & Errors

### TEST 9.1: Large Collection Performance

**Steps:**
1. Import CSV with 100 pipes, 50 blends
2. Navigate to Home → Should load < 3 seconds
3. Generate Pairing Matrix → Should complete < 30 seconds
4. Switch to Tobacco page → Grid should render < 2 seconds
5. Search for blend → Results instant (< 500ms)

**Expected Outcome:**
- No UI freezes or white screens
- React Query caching works
- Pagination/virtualization if needed

---

### TEST 9.2: Error Handling & Recovery

**Steps:**
1. Disconnect internet
2. Try to create pipe → Should show error toast
3. Reconnect internet
4. Retry → Should succeed
5. Navigate to Subscription page offline → Should show cached status

**Expected Outcome:**
- Graceful degradation when offline
- Error messages helpful (not stack traces)
- React Query retry logic works

---

## 🧪 Automated Test Suite

### Run Unit Tests:
```bash
npm test components/utils/__tests__/pairingScore.test.js
```

**Expected:** All 5 test suites pass
- Blend category inference
- Aromatic intensity calculation
- Aromatic filtering logic
- Keyword matching
- Deterministic sorting

---

### Build Validation:
```bash
npm run build
```

**Expected:** No TypeScript errors, no import failures

---

## 📋 Pre-Release Checklist

**Before deploying to production:**

- [ ] All automated tests pass
- [ ] Manual QA for Critical Paths 1-9 complete
- [ ] Stripe webhook tested with test events
- [ ] Apple IAP tested with TestFlight build
- [ ] No console errors in production build
- [ ] All 10 languages reviewed by native speakers
- [ ] `STRIPE_SECRET_KEY` and webhook secret set in production
- [ ] Database backups enabled
- [ ] Monitoring/error tracking configured (Sentry, LogRocket, etc.)
- [ ] Rate limiting enabled on backend functions
- [ ] CORS headers configured correctly

---

## 🚀 Post-Deployment Validation

**Within 24 hours of release:**

1. **Test subscription creation in production**
   - Complete 1 test Premium subscription
   - Complete 1 test Pro subscription
   - Verify webhook delivery (Stripe dashboard → Webhooks → Events)

2. **Monitor error rates**
   - Check error tracking dashboard
   - Investigate any 500 errors
   - Review client-side console errors

3. **Verify entitlement sync for first 10 users**
   - Confirm Stripe webhooks processed
   - Check Subscription entity records created
   - Verify feature gates unlock correctly

4. **Test Apple IAP (iOS build)**
   - Submit TestFlight build
   - Complete 1 test subscription via App Store Sandbox
   - Verify receipt validation
   - Check entitlements sync

---

## 🛠️ Known Limitations & Future Work

**Phase 8 (Future):**
- Add unit tests for `tobaccoQuantityHelpers.js`
- Add integration tests for `cellarReconciliation.js`
- Implement optimistic UI updates for favorite toggling
- Add keyboard shortcuts for power users
- Implement undo/redo for bulk operations
- Add data export scheduling (weekly email reports)
- Implement collaborative collections (share with friends)
- Add mobile app deep linking
- Implement offline mode with sync queue
- Add GraphQL API for third-party integrations

---

## 📊 Test Coverage Summary

| Category | Manual Tests | Automated Tests | Coverage |
|----------|--------------|-----------------|----------|
| Data Consistency | 3 | 5 | ✅ High |
| Subscriptions | 6 | 0 | ⚠️ Manual Only |
| UI/UX | 6 | 0 | ⚠️ Manual Only |
| AI Features | 3 | 0 | ⚠️ Manual Only |
| Performance | 2 | 0 | ⚠️ Manual Only |
| **TOTAL** | **21** | **5** | — |

**Recommendation:** Add integration tests for subscription flows in Phase 8.

---

## 📝 Release Notes Template

**Version X.X.X - YYYY-MM-DD**

**New Features:**
- Auto-suggest for pipe maker, country, materials
- Auto-suggest for tobacco manufacturer
- Premium active indicator for trial/paid users
- Quick Access navigation panel
- Enhanced tooltips for AI features

**Improvements:**
- Apple-compliant terminology (usage vs smoking)
- Cellar drift detection with reconciliation preview
- Schema compatibility for legacy data
- Annual plan savings messaging
- i18n coverage expanded to 18 new keys

**Bug Fixes:**
- Fixed pairing score consistency across views
- Fixed cellar totals reconciliation idempotency
- Fixed badge color contrast for accessibility

**Technical:**
- Added `schemaCompatibility.js` helper module
- Added QA regression documentation
- Improved error handling in subscription flows

---

**END OF CHECKLIST**