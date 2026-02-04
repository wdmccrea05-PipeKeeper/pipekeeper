# Phase 4: Runtime Stability & Translation Completeness
## Comprehensive Regression Checklist

**Status:** IN PROGRESS  
**Execution Date:** 2026-02-04  
**Exit Criteria:** 0 crashes, 0 visible key strings, 0 console errors across full route sweep + language stress test

---

## SECTION A: Core Flow Regression Tests

### ✅ Authentication Flow
- [ ] Login page loads without errors
- [ ] Login button submits and redirects to Home
- [ ] Logout clears session and redirects
- [ ] Protected routes redirect to login when not authenticated
- [ ] No translation keys visible in auth screens

**Languages tested:** English, Spanish, Japanese  
**Console status:** _pending_

---

### ✅ Home Page Load
- [ ] Home page loads without white screen
- [ ] Pipes count displays correctly
- [ ] Tobacco count displays correctly
- [ ] Overview cards render without null errors
- [ ] Quick start checklist appears for new users
- [ ] Onboarding flow doesn't block interaction
- [ ] All visible text is translated (no key strings)

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Pipes Management
#### List View
- [ ] Pipes page loads with grid/list toggle
- [ ] Search filters work without crashes
- [ ] Shape filter dropdown populated correctly
- [ ] Material filter dropdown populated correctly
- [ ] Sort options all work (date, favorites, name, maker)
- [ ] View mode toggle (grid/list) preserves preference
- [ ] All filter labels translated

#### Detail View
- [ ] Pipe detail page loads from list click
- [ ] All pipe fields display correctly (no nulls breaking UI)
- [ ] Edit form opens and submits changes
- [ ] Delete functionality works
- [ ] Favorite toggle works optimistically
- [ ] Photos display without CORS errors
- [ ] Break-in schedule shows correctly
- [ ] Maintenance log renders without crashes

#### Create/Edit
- [ ] Add pipe form opens without errors
- [ ] Required field validation works
- [ ] Photo upload triggers without breaking
- [ ] Submit creates pipe without error
- [ ] Edit form populates existing data correctly
- [ ] Cancel closes form without data loss warnings

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Tobacco Management
#### List View
- [ ] Tobacco page loads with grid/list toggle
- [ ] Search filters work without crashes
- [ ] Blend type filter populated and working
- [ ] Strength filter populated and working
- [ ] Quick edit mode toggles on/off
- [ ] Select all checkbox works in quick edit
- [ ] Bulk update sheet opens correctly
- [ ] All filter labels translated
- [ ] Inventory badges display correctly (tins/bulk/pouches)

#### Detail View
- [ ] Blend detail page loads from list click
- [ ] All blend fields display correctly
- [ ] Inventory breakdown shows tins/bulk/pouches
- [ ] Aging recommendations display
- [ ] Cellar status shows correctly
- [ ] Edit form opens and submits changes
- [ ] Favorite toggle works

#### Create/Edit
- [ ] Add blend form opens without errors
- [ ] Logo/photo upload works
- [ ] Inventory fields populate correctly
- [ ] Cellaring dates show date picker
- [ ] Submit creates blend without error
- [ ] Bulk edit panel updates multiple blends

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Profile Management
- [ ] Profile page loads without errors
- [ ] User info displays correctly
- [ ] Edit profile form opens
- [ ] Bio field accepts long text without breaking layout
- [ ] Location fields work
- [ ] Social media links display
- [ ] Preferences (clenching, size, strength) work
- [ ] Measurement preference toggle works (metric/imperial)
- [ ] All labels translated

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Subscription & Upgrade
- [ ] Subscription page loads without errors
- [ ] Pricing table displays for all tiers
- [ ] Current subscription status shows correctly
- [ ] Upgrade button triggers Stripe checkout
- [ ] Trial countdown displays accurately
- [ ] Paywall modals render without crashes
- [ ] All copy is translated (no key strings)

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Help Center & Support
- [ ] FAQ page loads with all questions visible
- [ ] Search within FAQ works
- [ ] Category filters work
- [ ] Support page contact form works
- [ ] All FAQ content is translated
- [ ] No hardcoded English strings in help text

**Languages tested:** _pending_  
**Console status:** _pending_

---

### ✅ Reports & AI Screens
- [ ] Collection Report Exporter opens without errors
- [ ] Export buttons trigger downloads
- [ ] Smoking Log panel loads correctly
- [ ] Cellar Aging Dashboard renders
- [ ] Pairing Grid displays without crashes
- [ ] Expert Tobacconist chat initializes
- [ ] Quick search pipes/tobacco works
- [ ] Value estimator runs without errors

**Languages tested:** _pending_  
**Console status:** _pending_

---

## SECTION B: Language Stress Test (All 10 Languages)

### Test Matrix: Core Pages × All Languages

| Page | EN | ES | FR | DE | IT | PT-BR | NL | PL | JA | ZH-Hans |
|------|----|----|----|----|----|----|----|----|----|----|
| Home | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Pipes List | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Pipe Detail | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Tobacco List | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Tobacco Detail | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Profile | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Subscription | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |
| Help Center | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ |

Legend: ⚪ = Pending | ✅ = Pass (no crashes, no key strings) | ❌ = Fail (document issue)

### Language-Specific Tests
- **German/French/Polish:** No text clipping in filter labels, form inputs
- **Japanese/Chinese:** Character wrapping correct, no layout breaks
- **All languages:** Switching mid-session doesn't crash app
- **All languages:** No console errors on language switch

---

## SECTION C: Console & Network Hygiene

### Console Errors & Warnings Audit
```
Target: 0 uncaught errors, 0 unhandled rejections, 0 risky warnings
```

**Monitored on each page load:**
- ❌ Syntax errors
- ❌ ReferenceError (undefined variables)
- ❌ TypeError (null/undefined method calls)
- ❌ Uncaught Promise rejection
- ⚠️ Missing dependency warnings (React hooks)
- ⚠️ Missing translations (key strings logged)
- ⚠️ Slow queries (>5s load time)

**Status by page:** _pending_

---

## SECTION D: Translation Completeness Validation

### Static Key Audit
```
Target: 0 missing translation keys across all 10 languages
```

**Check performed:** Component imports audit + translation file scan  
**Result:** _pending_

**Missing keys by language:**
- English (en): _pending_
- Spanish (es): _pending_
- French (fr): _pending_
- German (de): _pending_
- Italian (it): _pending_
- Portuguese/Brazil (pt-BR): _pending_
- Dutch (nl): _pending_
- Polish (pl): _pending_
- Japanese (ja): _pending_
- Chinese/Simplified (zh-Hans): _pending_

### Runtime Key String Scan
```
Target: 0 visible key strings (e.g., "pipes.allShapes") in rendered UI
```

**Pages scanned:** _pending_  
**Visible key strings found:** _pending_

---

## SECTION E: Release Readiness Artifacts

### Sign-off Checklist
- [ ] All core flows tested (A-flows)
- [ ] All 10 languages stress-tested on critical pages (B-tests)
- [ ] 0 console errors documented (C-audit)
- [ ] Translation completeness verified (D-scan)
- [ ] No known crashes blocking release
- [ ] Admin tools (Stripe, reports) confirmed working
- [ ] Subscription flows verified
- [ ] Mobile usability spot-check passed (Phase 5 prep)

### Issues Log
Track any failures found:
| Page | Language | Issue | Severity | Status |
|------|----------|-------|----------|--------|
| (to be filled) | | | | |

---

## Notes & Sign-Off

**Tester:** _pending_  
**Date completed:** _pending_  
**Build version:** _pending_  
**Sign-off:** ☐ APPROVED | ☐ BLOCKED (document issues)

**Known limitations:** _none expected_ (Phase 3 completed all static fixes)

---

## Next: Phase 5 (Responsive Design + Layout Hardening)
Once Phase 4 complete and all items ✅, move to breakpoint audits (360-1440+) and long-string resilience tests.