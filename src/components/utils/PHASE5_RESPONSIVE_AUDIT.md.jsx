# Phase 5: Responsive Design + Layout Hardening
## Breakpoint & Long-String Resilience Audit

**Status:** READY FOR EXECUTION  
**Target Exit:** All core pages pass breakpoint tests (360-1440+) with stress languages

---

## SECTION A: Breakpoint Coverage Matrix

### Test Breakpoints
- **360px** - Small phone (iPhone SE)
- **390px** - Standard phone (iPhone 12)
- **768px** - Tablet (iPad)
- **1024px** - Large tablet (iPad Pro)
- **1280px** - Laptop
- **1440px+** - Large desktop

### Core Pages to Test

| Page | 360 | 390 | 768 | 1024 | 1280 | 1440+ | Notes |
|------|-----|-----|-----|------|------|-------|-------|
| Home | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | 6+ overview cards, quick checklist |
| Pipes List | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Grid/list toggle, 4-column layout |
| Pipe Detail | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Form inputs, photos, maintenance log |
| Tobacco List | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Inventory badges (tins/bulk/pouches) |
| Tobacco Detail | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Tabs, collapse sections |
| Profile | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Bio field, social links, prefs |
| Subscription | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Pricing cards, feature table |
| Help Center | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | FAQ search, category filters |
| Smoking Log | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Log entry cards, collapsible list |
| Reports | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Charts, export buttons |

Legend: ⚪ = Pending | ✅ = Pass | ❌ = Fail (document defect)

---

## SECTION B: Stress Languages (Long-String Resilience)

### German (DE) - Longest average word length
**Test:** Filter labels, form inputs, button text should not clip

**Pages:** Pipes List (shape filter), Tobacco List (blend type), Profile (labels)

**Specific checks:**
- [ ] "Schüsselmaterial" (Bowl Material) fits in filter dropdown
- [ ] "Herkunftsland" (Country) doesn't overflow in detail view
- [ ] Form labels don't clip in mobile view
- [ ] Table headers wrap or truncate gracefully

### French (FR) - Frequent compound words
**Test:** Longer translations should not overlap UI elements

**Pages:** Buttons ("Toutes les Finitions"), labels, tabs

**Specific checks:**
- [ ] "Filtres Avancés" fits in filter button
- [ ] "Quantité Totale" label doesn't overlap value
- [ ] Modal titles wrap correctly
- [ ] Tab text truncates with ellipsis if needed

### Polish (PL) - Complex character sets
**Test:** Character rendering + line breaks

**Pages:** Navigation, cards, modals

**Specific checks:**
- [ ] Polish diacritics render correctly (ł, ż, ą, ę)
- [ ] Card titles don't break awkwardly mid-word
- [ ] Form validation messages display fully
- [ ] No missing font issues

### Japanese (JA) - CJK character wrapping
**Test:** Character-by-character wrapping (no word breaks)

**Pages:** All pages (global test)

**Specific checks:**
- [ ] Japanese text wraps character-by-character (not word-based)
- [ ] No unintended line breaks in middle of words
- [ ] Modal titles and buttons render at correct width
- [ ] Input placeholders display fully

### Chinese/Simplified (ZH-Hans) - CJK character wrapping
**Test:** Similar to Japanese

**Pages:** All pages (global test)

**Specific checks:**
- [ ] Chinese text wraps correctly
- [ ] No horizontal scroll needed for normal content
- [ ] Button labels fit without truncation
- [ ] Cards maintain aspect ratios

---

## SECTION C: Touch Target Compliance (Mobile)

### Button/Toggle Sizing
**Target:** Minimum 44×44px (iOS) / 48×48px (Android) for touch targets

**Pages to audit:**
- [ ] Home: All action buttons (Add Pipe, Add Blend, etc.) tappable
- [ ] Pipes List: View mode toggle, filter buttons
- [ ] Tobacco List: Edit mode toggle, quick edit checkbox
- [ ] Forms: Submit buttons, cancel buttons spacious
- [ ] Modals: Close button, action buttons spaced

### Spacing & Hit Areas
- [ ] Buttons have minimum 8px padding on mobile
- [ ] Form inputs have 12px+ height (not counting label)
- [ ] Icon buttons have clear visual hit area
- [ ] Checkboxes/radio buttons tappable at 20×20px minimum

### Finger-Friendly Navigation
- [ ] Menu items spaced 8px+ apart
- [ ] Filter buttons don't crowd on small screens
- [ ] Selectable items (cards, list rows) at least 44px tall
- [ ] No hover-only controls (mobile has no hover)

---

## SECTION D: Overflow & Truncation Strategy

### Text Clipping Rules (Apply Consistently)

#### Long Titles/Names
```
CSS: line-clamp: 2; text-overflow: ellipsis;
```
- Pipe name (card): max 2 lines, ellipsis at 30 chars
- Blend name (card): max 2 lines, ellipsis at 30 chars
- Maker/Brand: max 1 line, ellipsis at 20 chars

#### Long Descriptions/Notes
```
CSS: max-height: Xpx; overflow-y: auto; (or hidden + read-more)
```
- Bio field: max-height 100px, scrollable
- Notes field: max-height 60px on cards, full on detail
- Descriptions: Show first 100 chars + "...", link to full

#### Filter/Form Labels (Don't Truncate)
```
CSS: word-break: break-word; or flex-wrap: wrap;
```
- Labels should wrap, not clip
- Dropdowns should expand on small screens
- Long option text should wrap in Select component

### Horizontal Scroll (When Needed)
- **Filter bar on mobile:** Allow horizontal scroll if 3+ filters
- **Data tables:** If necessary, enable horizontal scroll with visual indicator
- **Cards with badges:** Wrap badges if needed, don't scroll card

---

## SECTION E: Modal & Drawer Behavior

### Mobile Safe Heights
- [ ] Modal max-height: 90vh (leave room for keyboard on iOS)
- [ ] Drawer height: 85vh (avoid floating keyboard)
- [ ] Modals center vertically on desktop, full-height on mobile
- [ ] Scrollable content inside modal, not entire modal

### Keyboard Safety (iOS Safari)
- [ ] Input fields scroll into view when focused
- [ ] Modals reposition when keyboard appears
- [ ] Submit buttons accessible above keyboard
- [ ] Tab order logical (no keyboard traps)

### Scroll Locking
- [ ] Background doesn't scroll when modal open
- [ ] Drawer doesn't allow body scroll simultaneously
- [ ] Scroll position restored when modal closes

---

## SECTION F: Navigation Responsiveness

### Menu Collapse (Mobile)
- [ ] Header navigation collapses to hamburger on 768px and below
- [ ] Mobile menu slides in from side without pushing content
- [ ] Menu closes on item selection
- [ ] Language switcher accessible in mobile menu

### Language Toggle
- [ ] Desktop: Visible in nav bar
- [ ] Mobile: In menu or persistent icon (no language picker overflow)
- [ ] Works mid-session without page reload
- [ ] Selection saved to localStorage

### Search Field
- [ ] Desktop: Full-width search in nav
- [ ] Mobile (768px): Collapse to icon, expand on tap
- [ ] Tablet+: Visible input
- [ ] Dropdown results fit mobile screen

---

## SECTION G: Component-Specific Fixes (As Needed)

### Cards & List Items
**Issue:** Multi-line text with badges causing overflow
```
Fix: grid layout with flex-wrap: wrap on badge container
```

### Filter Dropdowns
**Issue:** Long labels causing Select overflow
```
Fix: SelectValue component with max-width, truncation, or wrapping
```

### Form Inputs
**Issue:** Labels stacking poorly on 360px
```
Fix: Stack labels above inputs on <480px, inline on larger
```

### Modals/Sheets
**Issue:** Form content extending beyond viewport
```
Fix: overflow-y-auto on SheetContent, max-height: 85vh
```

---

## Validation Checklist

- [ ] All 6 breakpoints tested on 8+ core pages
- [ ] German/French/Polish text doesn't clip
- [ ] Japanese/Chinese wrap correctly
- [ ] Touch targets >= 44×44px on mobile
- [ ] Overflow consistent (truncation or scroll rules applied)
- [ ] Modals/drawers safe for iOS keyboard
- [ ] Navigation collapses gracefully
- [ ] Zero layout shift on language switch
- [ ] Horizontal scroll only where intentional

---

## Known Component Layout Status (Pre-Test)

✅ **Already responsive:**
- Header/nav (hamburger on mobile)
- Home overview cards (grid responsive)
- Pipe/Tobacco cards (responsive grid)
- Forms (stack on mobile)
- Tabs (wrap on mobile)

⚪ **To verify during testing:**
- Filter bars (may need horizontal scroll on mobile)
- Filter/form labels (German/French/Polish long-string handling)
- Advanced filter modals (modal height + scroll on small screens)
- Smoking log list (card overflow handling)
- Collection stats tables (horizontal scroll or responsive)

---

## Next: Execute Tests
1. Test each breakpoint on Chrome DevTools (6 breakpoints × 8 pages = 48 tests)
2. Test stress languages on key pages (5 languages × 3 pages = 15 tests)
3. Verify touch targets on actual mobile device (spot check)
4. Document any defects, apply fixes
5. Re-test fixed components
6. Sign-off when all ✅