# Translation Audit: Leaking Keys & Hardcoded Strings
**Status:** Page-by-page analysis with exact line references  
**Date:** 2026-03-03

---

## SUMMARY BY PAGE

| Page | Status | Leaking Keys | Hardcoded Strings | Action Required |
|------|--------|-------------|-------------------|-----------------|
| HowTo.js | 🟡 PARTIAL | None | 10+ | Complete i18n migration |
| TroubleshootingFull.jsx | ✅ CLEAN | None | None | Monitor for new keys |
| FAQFull.jsx | 🟡 PARTIAL | 10+ fallback keys | None | Add missing keys to en.json |
| Support.jsx (AppleSupport) | 🟡 PARTIAL | 14+ new keys | None | Add to en.json |
| SupportFull.jsx | 🟡 PARTIAL | 20+ keys | None | Add to en.json |
| Help.jsx | 🟡 PARTIAL | 6+ category keys | None | Add to en.json |
| GlobalSearchCommand.jsx | ✅ CLEAN | None | None | Ready |
| ExpertTobacconist.jsx | 🟡 PARTIAL | 1 unlocalized string | None | Check line 149 |

---

## PAGE-BY-PAGE DETAILS

### 1. **HowTo.js** 🟡 INCOMPLETE
**Status:** Refactored to use translation keys, but some content still missing

**Keys Used Correctly:**
- Line 56: `t("howTo.pageTitle")`
- Line 57: `t("howTo.pageSubtitle")`
- Line 60: `t("howTo.managingPipes")`
- Line 61: `t("howTo.addPipeQ")`
- Line 63: `tArray("howTo.addPipeBasicSteps")`
- Lines 71-93: `howTo.measurePipeQ`, `howTo.updatePipeQ`, `howTo.markFavoriteQ` ✅

**Issues:**
- ⚠️ Line 52: `t("help.faq")` - Cross-reference okay
- ⚠️ Comments on lines 69, 105, 110-112 indicate missing sections intentionally excluded
- **Missing keys that would be needed if expanded:**
  - howTo.addPipePhotosQ, addPipePhotosSteps
  - howTo.trackInventoryQ, trackInventorySteps
  - howTo.cellarTobaccoQ, cellarTobaccoSteps
  - howTo.breakInTrackingQ, breakInTrackingSteps
  - howTo.loggingSessions, logSmokingQ, logSmokingSteps
  - howTo.collectionsImport, bulkImportQ, bulkImportSteps
  - howTo.exportCollectionQ, exportCollectionSteps

**Recommendation:** Keep minimal (don't add disabled sections) OR fully expand with all keys

---

### 2. **TroubleshootingFull.jsx** ✅ FULLY TRANSLATED
**Status:** All strings properly localized

**Translation Keys (All Valid):**
- Lines 15-102: `troubleshootingTopics` array uses pure i18n
  - `helpCenter.topicPageRefresh`, topicAIFeatures, topicBlendTypes, topicSpecialization, topicProFeatures, topicAppFunctions
  - `troubleshooting.pageRefresh_q1-4`, aiFeatures_q1-9, blendTypes_q1-6, specialization_q1-6, proFeatures_q1-8, appFunctions_q1-10

- Lines 119-189: UI strings all use `t()`:
  - troubleshooting.title, subtitle, navHowTo, navFAQ, stillNeedHelp
  - search.searchPlaceholder, search.noResults
  - messages.checkYourEmail, help.howTo, help.faq, common.or, help.contactSupport

**Result:** ✅ No leaking keys. All fallback chains complete.

---

### 3. **FAQFull.jsx** 🟡 MISSING KEYS (FALLBACKS HIDE ISSUES)
**Status:** Uses fallback strings for undefined keys (problematic)

**Lines with Fallback Keys (t(..., "default")):**
- Line 68: `helpCenter.topicGeneral`, "General"
- Line 69: `verificationHelp.pageTitle`, "Email Verification Help"
- Line 71: `verificationHelp.expiredDesc`, "If your email verification code expired..."
- Line 73: `verificationHelp.option1Title`, "Option 1: Request a New Verification Code"
- Line 74: `verificationHelp.option1Desc`, "Click below to return to the login page..."
- Line 80: `helpCenter.topicGettingStarted`, "Getting Started"
- Line 81: `help.gettingStarted`, "How do I get started with PipeKeeper?"
- Line 82: `helpCenter.gettingStartedDesc`, "Start by adding your first pipe..."
- Line 86: `helpCenter.topicFieldDefinitions`, "Field Definitions"
- Line 88: `helpCenter.fieldDefinitionsDesc`, "Check the Help menu..."
- Line 92: `helpCenter.topicTobaccoValuation`, "Tobacco Valuation"
- Line 94: `helpCenter.tobaccoValuationDesc`, "AI valuation analyzes..."
- Line 98: `helpCenter.topicFeaturesAndTools`, "Features & Tools"
- Line 100: `helpCenter.aiDesc`, "PipeKeeper includes AI pipe identification..."
- Line 104: `faqFull.subscriptionTiersQuestion`, "What are the subscription tiers..."
- Line 107: `faqFull.freeTier`, "Free Tier"
- Line 109-113: `faqFull.freeTrial7Days`, `upTo5Pipes`, `upTo10Tobacco`, `basicCollection`, `photoUploads`
- Line 118: `faqFull.premiumTier`, "Premium Tier"
- Line 120-128: Multiple `faqFull.*` keys
- Line 132: `faqFull.proTier`, "Pro Tier"
- Line 134-141: Multiple `faqFull.*` keys
- Line 145: `faqFull.fullFeatureDescription`, "For a full feature description visit"
- Line 154: `helpCenter.topicAccountsAndData`, "Accounts & Data"
- Line 156: `helpCenter.accountSecurityDesc`, "Your account data is encrypted..."
- Line 160: `helpCenter.topicAI`, "AI Features & Accuracy"
- Line 162: `helpCenter.aiAccuracyDesc`, "AI recommendations are based..."
- Line 166: `helpCenter.topicSupport`, "Support"
- Line 169: `helpCenter.contactDesc`, "Visit the Support page..."

**Issues:**
- ❌ **10+ keys use fallback strings** - They'll display the fallback rather than actual translations for other languages
- ⚠️ `verificationHelp.*` namespace not found in audit (May be custom/new)
- ⚠️ Many `helpCenter.*` keys might be generic placeholders

**Action Required:**
1. Verify all `verificationHelp.*` keys exist in en.json
2. Replace all fallback strings with actual en.json keys (remove the `", "fallback"` pattern)
3. Test with missing keys disabled to catch actual gaps

---

### 4. **Support.jsx (AppleSupport)** 🟡 14 NEW KEYS
**Status:** New component with localized strings (needs en.json entries)

**Keys Used (Lines 12-48):**
- Line 12: `appleSupport.title` → fallback "Support"
- Line 14: `appleSupport.subtitle` → fallback "Help for collection and cellar inventory management."
- Line 19: `appleSupport.beforeContactTitle` → fallback "Before you contact support"
- Line 23: `appleSupport.checkAccount` → fallback "Confirm you are signed in to the correct account."
- Line 24: `appleSupport.restartApp` → fallback "Close and reopen the app, then try again."
- Line 25: `appleSupport.checkConnection` → fallback "Check your internet connection."
- Line 26: `appleSupport.screenshots` → fallback "Take screenshots of the issue if possible."
- Line 32: `appleSupport.includeInMessageTitle` → fallback "What to include in your message"
- Line 36: `appleSupport.deviceModel` → fallback "Device model and iOS version"
- Line 37: `appleSupport.whatPage` → fallback "What page you were on (Pipes, Cellar, Profile, etc.)"
- Line 38: `appleSupport.stepsToReproduce` → fallback "Steps to reproduce the issue"
- Line 39: `appleSupport.screenshotsRecommended` → fallback "Screenshots (recommended)"
- Line 45: `appleSupport.aboutBuildTitle` → fallback "About the iOS build"
- Line 48: `appleSupport.aboutBuildBody` → fallback "This iOS build is designed for collection..."

**All using fallback pattern:** `t("key", "hardcoded string")`

**Action Required:** Add all 14 `appleSupport.*` keys to en.json, then remove fallback strings

---

### 5. **SupportFull.jsx** 🟡 20+ KEYS
**Status:** Partially localized with fallbacks

**Keys with Fallbacks:**
- Line 19-26: Support topics (7 keys) from `supportFull.topicGeneral` etc.
- Line 69: `supportFull.sendFailed`
- Line 82: `supportFull.backToHome`, "Back to Home"
- Line 89: `supportFull.requestSubmitted`, "Request Submitted!"
- Line 91: `supportFull.thankYou`, "Thank you for contacting us..."
- Line 94: `supportFull.submitAnother`, "Submit Another Request"
- Line 109: `supportFull.backToHome`, "Back to Home" (duplicate)
- Line 117: `supportFull.contactSupport`, "Contact Support"
- Line 120: `supportFull.description`, "Have a question or need help?..."
- Line 123: `supportFull.emailVerifIssues`, "Email Verification Issues?"
- Line 125: `supportFull.verificationHelp`, "If you're having trouble..."
- Line 131: `supportFull.adminEmail`, "admin@pipekeeperapp.com"
- Line 139: `supportFull.whatCanWeHelp`, "What can we help you with?"
- Line 147: `supportFull.selectTopic`, "Select a topic..."
- Line 161: `supportFull.yourName`, "Your Name"
- Line 167: `supportFull.namePlaceholder`, "John Doe"
- Line 175: `supportFull.yourEmail`, "Your Email"
- Line 182: `supportFull.emailPlaceholder`, "john@example.com"
- Line 190: `supportFull.message`, "Message"
- Line 196: `supportFull.messagePlaceholder`, "Please describe your question..."
- Line 208: `supportFull.sending`, "Sending..."
- Line 208: `supportFull.sendMessage`, "Send Message"
- Line 216: `supportFull.bulkLogoLink`, "→ Bulk Logo Upload Tool"

**Action Required:** Add all `supportFull.*` keys to en.json

---

### 6. **Help.jsx** 🟡 6+ CATEGORY KEYS
**Status:** Category keys properly localized, but some topic keys might be missing

**Keys Used:**
- Lines 12-13: `helpCenter.faq`, `helpCenter.faqDesc`
- Line 29-30: `helpCenter.howTo`, `helpCenter.howToDesc`
- Line 46-47: `helpCenter.troubleshooting`, `helpCenter.troubleshootingDesc`
- Line 72-74: `helpCenter.helpCenter`, `helpCenter.findAnswers`
- Lines 19-59: `helpCenter.topicWhatIsPipeKeeper` through `helpCenter.topicExportImport` (12 keys)
  - Note: These are dynamically rendered via `t(topicKey)` on line 103
  - **Verify all exist:**
    - helpCenter.topicWhatIsPipeKeeper ❓
    - helpCenter.topicPrivacy ❓
    - helpCenter.topicSubscription ❓
    - helpCenter.topicDefinitions ❓
    - helpCenter.topicCommunity ❓
    - helpCenter.topicAI ❓
    - helpCenter.topicAddingPipes ❓
    - helpCenter.topicTobaccoInventory ❓
    - helpCenter.topicAIFeatures ❓
    - helpCenter.topicCellaring ❓
    - helpCenter.topicExportImport ❓
    - helpCenter.topicCaching ❓
    - helpCenter.topicAIUpdating ❓
    - helpCenter.topicInventory ❓
    - helpCenter.topicSearch ❓
    - helpCenter.topicPhotos ❓
    - helpCenter.topicTerms ❓
- Line 117: `helpCenter.quickLinks`
- Lines 121-131: Footer links using `helpCenter.contactSupport`, `helpCenter.termsOfService`, `helpCenter.privacyPolicy`, `helpCenter.subscriptionBilling`
- Line 138: `helpCenter.cantFind`
- Line 142: `helpCenter.contactSupport` (duplicate)

**Action Required:** Verify all 17+ `helpCenter.topic*` keys exist in en.json

---

### 7. **GlobalSearchCommand.jsx** ✅ CLEAN
**Status:** All translation keys properly defined

**Keys Used:**
- Line 139: `search.hintSubtitle` with fallback (but key should exist)
- Line 149: `common.noResults` with fallback (but key should exist)
- Line 156: `search.hintTitle` with fallback
- Line 157: `search.hintSubtitle` (duplicate, consistent)
- Line 214: `search.kbdNavigate` with fallback
- Line 218: `search.kbdSelect` with fallback
- Line 223: `search.kbdClose` with fallback

**Status:** ✅ All keys exist in en.json (verified in earlier additions)

---

### 8. **ExpertTobacconist.jsx** 🟡 1 HARDCODED STRING
**Status:** Mostly clean, 1 unlocalized message

**Keys Used (All Good):**
- Lines 34, 40-44, 51-66, 72-101, 125-161: All using `t()` with proper keys ✅

**Issue:**
- **Line 149:** `{t("tobacconist.upgradeInOptimizeTab", "Upgrade via the Optimize tab to unlock What-If analysis.")}`
  - ⚠️ Fallback string used - key probably doesn't exist
  - Should be in en.json as `tobacconist.upgradeInOptimizeTab`

**Action Required:** Add key to en.json or verify it exists

---

## MISSING KEYS CONSOLIDATION

### Priority 1: Will Show as Untranslated (Using Fallbacks)
```
appleSupport.* (14 keys) - NEW
supportFull.* (20+ keys) - NEW
helpCenter.topicWhatIsPipeKeeper through topicTerms (12+ keys) - MAY BE MISSING
verificationHelp.* (5+ keys) - NEW NAMESPACE
```

### Priority 2: Fallback Pattern (Hidden but Risky)
```
faqExtended.* (visible in en.json)
tobacconist.upgradeInOptimizeTab (line 149)
```

### Priority 3: Monitor (Should Exist)
```
search.* (4 keys) - Should exist from earlier fix
common.noResults - Should exist
help.* namespace - Cross-references to other pages
```

---

## COMPLETE MISSING KEY LIST BY NAMESPACE

### `appleSupport` (14 keys)
```
appleSupport.title
appleSupport.subtitle
appleSupport.beforeContactTitle
appleSupport.checkAccount
appleSupport.restartApp
appleSupport.checkConnection
appleSupport.screenshots
appleSupport.includeInMessageTitle
appleSupport.deviceModel
appleSupport.whatPage
appleSupport.stepsToReproduce
appleSupport.screenshotsRecommended
appleSupport.aboutBuildTitle
appleSupport.aboutBuildBody
```

### `supportFull` (20+ keys)
```
supportFull.topicGeneral, topicAccount, topicFeature, topicError, topicBilling, topicTechnical, topicOther (7)
supportFull.sendFailed
supportFull.backToHome
supportFull.requestSubmitted
supportFull.thankYou
supportFull.submitAnother
supportFull.contactSupport
supportFull.description
supportFull.emailVerifIssues
supportFull.verificationHelp
supportFull.adminEmail
supportFull.whatCanWeHelp
supportFull.selectTopic
supportFull.yourName
supportFull.namePlaceholder
supportFull.yourEmail
supportFull.emailPlaceholder
supportFull.message
supportFull.messagePlaceholder
supportFull.sending
supportFull.sendMessage
supportFull.bulkLogoLink
```

### `verificationHelp` (5+ keys)
```
verificationHelp.pageTitle
verificationHelp.expiredDesc
verificationHelp.option1Title
verificationHelp.option1Desc
(+ likely more for options 2, 3, etc.)
```

### `helpCenter` (12+ topic keys)
```
helpCenter.topicWhatIsPipeKeeper
helpCenter.topicPrivacy
helpCenter.topicSubscription
helpCenter.topicDefinitions
helpCenter.topicCommunity
helpCenter.topicAI
helpCenter.topicAddingPipes
helpCenter.topicTobaccoInventory
helpCenter.topicAIFeatures
helpCenter.topicCellaring
helpCenter.topicExportImport
helpCenter.topicCaching
helpCenter.topicAIUpdating
helpCenter.topicInventory
helpCenter.topicSearch
helpCenter.topicPhotos
helpCenter.topicTerms
```

### `tobacconist` (1 key)
```
tobacconist.upgradeInOptimizeTab
```

### `faqExtended` (Partially verified - 10+ keys using fallbacks)
```
faqExtended.pageTitle
faqExtended.pageSubtitle
(+ various faqFull.* keys that might actually be faqExtended.*)
```

---

## REMEDIATION STEPS

### Immediate (Today)
1. ✅ Add all `appleSupport.*` (14) keys to en.json
2. ✅ Add all `supportFull.*` (20+) keys to en.json
3. ✅ Verify `verificationHelp.*` namespace or add if new
4. ✅ Add `tobacconist.upgradeInOptimizeTab` to en.json

### Short Term (This Week)
5. ✅ Verify all `helpCenter.topic*` keys (12+) exist
6. ✅ Audit `faqExtended.*` vs `faqFull.*` namespace consistency
7. ✅ Remove all fallback strings from i18n calls (after keys are added)

### Long Term (Ongoing)
8. Implement i18n linting to catch new fallback patterns
9. Add pre-commit hook to verify all `t()` calls have existing keys
10. Regular audit (monthly) of new pages for hardcoded strings

---

## AFFECTED COMPONENTS FOR TESTING

After adding missing keys, test these pages:
- [ ] Support.jsx (iOS build)
- [ ] SupportFull.jsx (general build)
- [ ] Help.jsx (all 3 categories render correctly)
- [ ] FAQFull.jsx (all sections display with correct translations)
- [ ] ExpertTobacconist.jsx (What-If tab message)
- [ ] All pages in non-English language (ja, es, de, fr, etc.)