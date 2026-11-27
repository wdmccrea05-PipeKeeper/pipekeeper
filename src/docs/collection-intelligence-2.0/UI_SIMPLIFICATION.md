# CollectionKeeper 2.0 — Usability & Simplification

**Principle:** the power lives in the architecture, not on the screen. Everything essential is visible; everything else is one tap away.

## The shared component system

| Component | Purpose | Rule |
|---|---|---|
| `PageHeader` | One screen title, one short subtitle, at most a primary + one secondary action | Replaces ad-hoc hero panels; never stack a second heading beneath it |
| `StatStrip` | 2–4 key numbers in one bordered strip, each tappable to its records | Replaces grids of individual stat cards; a number that cannot be tapped does not belong here |
| `AdvancedDetails` | Collapsed disclosure row for secondary content (methods, highlights, breakdowns) | Collapsed by default; the label says what is inside |
| `FormSection` | Collapsed editor section with an optional one-line summary | Essential fields stay outside; everything optional lives inside |
| `ModuleRow` | One compact, fully clickable module row | Replaces module cards: no separate "Open" button, no per-module stat grid |

## Collection hub — what changed

| Before | After |
|---|---|
| 8 stat cards (value, pipes, blends, sessions, whiskey, tastings, cigars, wine) | 1 two-cell stat strip (collection value, sessions this week) |
| 5 competing quick-action buttons (log, identify, optimise, ask, want list) | 1 primary action ("Record session") + 1 secondary ("Reports") in the header |
| 4 module cards, each with a description, 3 stats and an "Open module" button | 4 compact rows: icon, name, one summary line, chevron |
| Large Curator card with image block and paragraph | Compact Curator row |
| Highlights grid permanently on screen | Inside one "Highlights" disclosure |
| Separate collection-story section | Inside the same disclosure |
| Two "coming soon" cards | One muted line |
| Page width 7xl with doubled page gutters | 5xl content column, single gutter from the layout shell |

Net effect on the hub: **14 prominent blocks reduced to 6**, and the number of always-visible buttons reduced from 12 to 5.

## Navigation consolidation

- The permanent "Quick Access" button is gone from the header; Quick Access is now one item inside the navigation, on desktop and in the mobile drawer.
- "Reports" now opens the consolidated Reporting Center. The older pairing/insight report page remains reachable from inside it, so nothing is lost.
- The header keeps only: brand, back, currency, notifications, language, menu.

## Record editors

All five editors now share one pattern: essential fields first, everything optional behind `FormSection`.

- `PipeForm`, `CigarForm`, `TobaccoForm`, `BottleForm` already collapsed advanced sections (identity open; geometry, construction, value, provenance, photos closed).
- `WineForm` was a single 16-field wall; it is now name, producer, vintage, style, quantity and rating, with three closed sections: Details, Value, and Drinking Window / Photos / Notes.

## Where the primitives are used now

- `CollectionHub` — `PageHeader`, `StatStrip`, `ModuleRow`, `AdvancedDetails`
- `WineForm` — `FormSection`
- `Layout` / `ModuleNav` — single navigation surface with Quick Access folded in

## Verification

- Production build: clean (exit 0)
- Full suite: **211 files, 3,630 tests, all passing**
- Interface-specific suites re-run: `activeScreenI18nCoverage` (no inline English fallbacks introduced), `proTrialWiring`, `sharedPrimitivesRegression`

## Screenshots

Screenshots cannot be captured from this environment (no browser capture tool available). The live preview at the desktop viewport (1148px) and a phone-width preview are the evidence; the layouts above are single-column below `sm`, two-column at `sm`, and use the layout's `ck-page-shell` gutter at every size.

## Next screens to convert (same primitives, no new patterns)

1. Module landing dashboards (PipeKeeper, CigarKeeper, WhiskeyKeeper, WineKeeper): apply `PageHeader` + `StatStrip`, move insight cards into one `AdvancedDetails`.
2. Curator initial screen: one input, suggested prompts behind a disclosure.
3. Subscription and onboarding: one primary plan action per screen.
4. Admin screens: group tools into two disclosures (diagnostics, maintenance) instead of a card per tool.
