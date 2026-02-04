# PHASE D: RESPONSIVE & LONG-STRING SAFETY AUDIT

## Overview
This document tracks CSS safeguards for responsive design at critical breakpoints with stress-language testing.

---

## Target Screens (Priority Order)
1. **Home** - Dashboard with cards, stats
2. **Pipes** - List with filters, search
3. **Tobacco** - Cellar management with inventory
4. **Profile** - Form fields, settings
5. **Community** - User cards, search results

---

## Breakpoints to Validate
- **360px** (iPhone SE, older Android)
- **390px** (iPhone 12, modern small phone)
- **768px** (Tablet portrait)
- **1280px** (Desktop)
- **1440px+** (Large desktop, wide screens)

---

## Stress Languages
### Long-String Languages
- **German (DE)**: Compound nouns, longer average word length
- **French (FR)**: Accented characters, slightly longer than EN
- **Polish (PL)**: Longer words, complex inflection

### CJK (Character-Based) Languages
- **Japanese (JA)**: Hiragana, katakana, kanji - tight spacing, wrapping challenges
- **Chinese Simplified (ZH-CN)**: No spaces between words, character-by-character wrapping needed

---

## CSS Safeguards Applied

### 1. SafeText Component (CREATED)
**File**: `components/ui/SafeText.jsx`

Provides reusable text components with:
- `min-width: 0` for flex children
- `overflow-wrap: anywhere` for long strings & CJK
- Proper truncation with tooltips
- Line-clamping support

**Usage**:
```jsx
<SafeText truncate={false}>Long text content</SafeText>
<SafeHeading level="h2">Pipe Collection</SafeHeading>
<SafeLabel required>Email Address</SafeLabel>
<SafeCell truncate lines={2}>Multi-line cell content</SafeCell>
```

### 2. Global CSS Utilities (TO ADD)
Will add Tailwind config overrides:
- `overflow-wrap: anywhere` as default
- `break-word` utility
- Line-clamp utilities (1-5 lines)

### 3. Component-Level Fixes (IN PROGRESS)

#### Home Page
- **Issue**: Card titles, stats labels with long strings
- **Fix**: Apply `min-w-0` to flex children, `overflow-wrap: anywhere` on text
- **Status**: PENDING

#### Pipes Page
- **Issue**: Pipe name truncation on mobile, filter labels overflow
- **Fix**: SafeText for names, flex safeguards on filter controls
- **Status**: PENDING

#### Tobacco Page
- **Issue**: Blend name + manufacturer labels, inventory inputs
- **Fix**: SafeCell for table cells, flex layout safety
- **Status**: PENDING

#### Profile Page
- **Issue**: Label wrapping, form field names in stress languages
- **Fix**: SafeLabel component, input group overflow protection
- **Status**: PENDING

#### Community Page
- **Issue**: User display names, bio text truncation
- **Fix**: SafeText for profile names, location strings
- **Status**: PENDING

---

## Testing Checklist

### Mobile (360px)
- [ ] No horizontal scroll on any page
- [ ] Buttons fully clickable (min 44px height)
- [ ] Text readable without truncation where possible
- [ ] German long words wrap properly
- [ ] Japanese/Chinese text doesn't overflow

### Tablet (768px)
- [ ] Layout shifts smooth
- [ ] Forms have adequate spacing
- [ ] Cards stack naturally
- [ ] All text visible without overflow

### Desktop (1280px+)
- [ ] Text flows naturally
- [ ] Long strings don't create awkward gaps
- [ ] CJK text renders clearly
- [ ] No unnecessary wrapping

---

## Language Switch Test Plan

**Sequence**: EN → DE → FR → PL → JA → ZH → EN

For each language transition:
1. Check page loads without white screen
2. Verify text renders fully visible
3. Confirm no layout shifts/overflow
4. Validate button/input alignment

---

## Known Issues & Solutions

| Issue | Root Cause | Solution | Status |
|-------|-----------|----------|--------|
| Truncated pipe names on mobile | Missing `min-w-0` on flex-child | SafeText wrapper | PENDING |
| German labels overflow in forms | No `overflow-wrap` on labels | SafeLabel component | PENDING |
| CJK text breaks incorrectly | Missing `word-break: break-word` | Global CSS + SafeText | PENDING |
| Buttons overflow in community | Flex layout missing safeguards | Add flex-shrink-0 + min-w-0 | PENDING |
| Badge content clipping | Fixed widths on text containers | SafeCell with line-clamp | PENDING |

---

## Verification Gates

Before Phase E sign-off:
- [ ] All 5 major pages tested at all 5 breakpoints
- [ ] German/French/Polish long strings wrap correctly
- [ ] Japanese/Chinese text renders without overflow
- [ ] No horizontal scrolling on mobile
- [ ] Language switching doesn't break layout
- [ ] All buttons remain clickable (44px+ minimum)
- [ ] No truncation without tooltip fallback

---

## Progress Log

**2026-02-04 - Started Phase D**
- Created SafeText component with flex/overflow safeguards
- Identified critical components needing CSS updates
- Planned component-by-component fixes