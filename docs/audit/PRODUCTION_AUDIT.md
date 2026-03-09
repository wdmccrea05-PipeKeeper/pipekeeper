# PipeKeeper Production Readiness Audit
**Date:** 2026-03-03  
**Focus Areas:** Translations (i18n), Subscription & Feature Unlocking, AI Functionality, Calculation Logic

---

## EXECUTIVE SUMMARY
- **Translation Status:** 85% complete (40+ keys still missing in Help/Troubleshooting)
- **Subscription Gating:** Inconsistent (Photo ID, Geometry missing gates)
- **AI Functionality:** Working but error messages leak untranslated keys
- **Calculations:** No validation (inventory constraints, value null checks)

---

## 1. TRANSLATION (i18n) AUDIT

### Critical Issues ✅ FIXED
- FAQFull.js: Removed undefined `sections` variable
- GlobalSearchCommand: Added search.hintTitle, hintSubtitle, kbd* keys
- CollectionInsightsPanel: Added faqExtended namespace keys
- Tobacconist: Added outOfDate, outOfDateMessage, notNow, undoLastChange

### Remaining Gaps 🔴 BLOCKING
**HowTo.js (40+ missing keys):**
- Section titles not localized (hardcoded)
- Q&A pairs use hardcoded strings
- Needs complete refactor to use i18n keys

**TroubleshootingFull.jsx (200+ missing keys):**
- Static troubleshootingTopics array entirely hardcoded
- Bypasses i18n system completely
- Requires architecture change to data-driven approach

**Missing Keys (Consolidated):**
```
Search: hintTitle, hintSubtitle, kbdNavigate, kbdSelect, kbdClose
Tobacconist: outOfDate, outOfDateMessage, notNow, undoLastChange
HowTo: addPipePhotosQ, trackInventoryQ, cellarTobaccoQ, breakInTrackingQ, 
       collectionsImport, exportCollectionQ, updateProfileQ, changeLanguageQ
Troubleshooting: 200+ in static array (contactQ, sessionExpiredQ, dataNotSavingQ, etc.)
```

---

## 2. SUBSCRIPTION & FEATURE UNLOCKING

### Feature Gate Status
| Feature | Status | Location | Issue |
|---------|--------|----------|-------|
| Collection Optimization | ✅ Gated | ExpertTobacconist.jsx | Correct Premium+ |
| What-If Analysis | ✅ Gated | ExpertTobacconist.jsx L130 | Correct Premium+ |
| Trends Report | ✅ Gated | CollectionInsightsPanel.jsx L245 | Correct Pro only |
| AI Valuation | ❌ UNKNOWN | TobaccoDetail.jsx | Needs verification |
| Photo Identification | ❌ MISSING | QuickPipeIdentifier.jsx | Should be Premium+ |
| Pipe Geometry Analysis | ❌ MISSING | PipeGeometryAnalyzer.jsx | Should be Premium+ |
| Community Features | ✅ Gated | Community.jsx | Correct Premium+ |
| Messaging | ❌ UNCLEAR | MessagingPanel.jsx | Gate logic needs audit |

### Subscription Sync
**Current Implementation:** Layout.jsx lines 118-149
- Auto-syncs from Stripe on app load
- Tries multiple function names (resilience pattern)
- **Problem:** Real function name inconsistency

**Apple IAP Flow:**
- Native bridge registers listener (Layout.jsx L260)
- Calls syncAppleSubscriptionForMe on payload
- Timing: Only on focus/visibility change
- **Risk:** IAP syncs may lag behind purchase

### Entitlements Resolution
**Flow:**
1. useCurrentUser() hook → fetches user + subscription
2. Derives: hasPaid, hasPro, hasPremium, isTrialing
3. Returns normalized subscription object
4. Used by: FeatureGate, ProFeatureLock, useEntitlements()

**Issues:**
- ❌ No cache invalidation on subscription change
- ❌ Downgrade mid-session not handled
- ❌ Trial expiration not actively monitored

---

## 3. AI FUNCTIONALITY AUDIT

### Tools Status
✅ **Implemented:**
- Pipe identification (photos)
- Tobacco search & auto-fill
- Pairing matrix generation
- Collection optimization
- Pipe geometry analysis
- Smoking log insights
- Break-in schedule generation

❌ **Missing Feature Gates:**
- Photo Identification (should be Premium+)
- Geometry Analysis (should be Premium+)

### AI Updates Panel Issues
**Location:** AIUpdatesPanel.jsx
- Shows out-of-date status for: pairings, optimization, blend classification
- Regenerate & undo buttons present
- **Issue:** Input fingerprint may miss invalidation

### Expert Tobacconist
**Issue:** Error messages showing raw keys:
- tobacconist.outOfDate (should be localized)
- tobacconist.outOfDateMessage (added but need to wire up)

---

## 4. CALCULATION LOGIC AUDIT

### Tobacco Inventory
**Formula Issues:**
- ❌ No constraint: open_tins + cellared_tins should = total_tins
- ❌ No validation: negative quantities not caught
- ⚠️ Floating-point: oz calculations may lose precision

**Locations:**
- TobaccoCollectionStats.jsx (aggregation)
- TobaccoForm.jsx (entry)
- CellarLog.jsx (tracking)

### Collection Values
**Pipe Value:** Σ(estimated_value)
- ❌ Null values not handled
- ⚠️ Source (user vs AI) not documented

**Tobacco Cellar Value:** Σ(cellared_oz × value_per_oz)
- ❌ ai_estimated_value vs manual_market_value precedence unclear
- ❌ Null values crash calculation
- ⚠️ No rounding rules

### Aging Thresholds
```
Excellent: 24 months → peak optimal
Good: 12 months → peak optimal
Fair: 3 months → peak optimal
```
- ❌ Hard-coded, not configurable
- ❌ No over-aged warnings
- ⚠️ Assumes ideal storage conditions

### Break-In Calculations
**Inputs:** Pipe, tobacco, user preferences
**Issues:**
- ❌ No feasibility validation
- ❌ Logic not documented
- ⚠️ No conflict detection (e.g., Lakeland for non-Lakeland pipe)

---

## 5. CRITICAL PATH TO PRODUCTION

### Blocking (Fix Before Deploy)
1. ✅ FAQFull undefined variables
2. ✅ Search i18n keys
3. ✅ Tobacconist error keys
4. ❌ HowTo.js full i18n migration (40+ keys)
5. ❌ TroubleshootingFull data-driven refactor (200+ keys)
6. ❌ Add feature gates: Photo ID, Geometry, Valuation

### High Risk (Week 1 Post-Deploy)
1. Inventory constraint validation (tins, oz)
2. Collection value null-safety
3. Feature gate E2E tests (free → premium → pro)
4. Subscription sync function naming fix

### Quality (Ongoing)
1. Calculation logic unit tests
2. Aging threshold configurability
3. Pairing score weights documentation
4. Mobile (iOS/Android) full tier testing

---

## 6. IMPLEMENTATION CHECKLIST

**Before Staging:**
- [ ] HowTo.js migrated to i18n
- [ ] TroubleshootingFull refactored to data-driven
- [ ] Photo ID & Geometry feature gates added
- [ ] AI Valuation gate verified
- [ ] Inventory constraints added (min/max validation)
- [ ] Collection value null-safety reviewed

**Before Production:**
- [ ] Trial → paid transition tested (Stripe + Apple)
- [ ] Downgrade → limited features tested
- [ ] AI error messages fully translated
- [ ] Aging alerts calculation verified
- [ ] Mobile builds tested all tiers
- [ ] Subscription sync latency measured

---

## 7. FILE REFERENCES

**Files Requiring Changes:**
- pages/HowTo.js → Migrate to i18n keys (40+ additions to en.json)
- pages/TroubleshootingFull.jsx → Refactor static array to i18n
- components/ai/QuickPipeIdentifier.jsx → Add feature gate
- components/ai/PipeGeometryAnalyzer.jsx → Add feature gate
- components/tobacco/TobaccoCollectionStats.jsx → Add inventory validation
- components/utils/tobaccoQuantityHelpers.js → Add constraint checks
- functions/stripeWebhook.js → Verify sync function naming