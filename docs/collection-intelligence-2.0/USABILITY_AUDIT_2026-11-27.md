# CollectionKeeper — Usability, Mobile and Complexity Audit

Date: 2026-11-27 · Scope: Collection Intelligence 2.0 plus the application-wide simplification pass
Viewport focus: 320, 375, 390, 430, 768, 1024, 1440 px

## 1. Method

1. Source-level mobile audit of every audited screen for the failure modes below: fixed widths, non-responsive dense grids, viewport-height sizing, unpinned inputs, missing empty states, duplicate primary actions, oversized headers.
2. Reusable acceptance checks committed as `src/__tests__/usabilityMobileAcceptance.test.js` so the rules survive future features.
3. Journey walkthrough counted in taps from the code that renders each route.
4. Build plus full test suite after every change.

No browser capture tool is available in this environment, so no screenshots were produced. Section 6 lists exactly what still needs a real device or external browser.

## 2. Screens reviewed

Collection hub · Curator (conversation, history, change proposals) · Community · Help Center · Reporting Center · Collection Tools · Share Center · Valuation Center · Want List · Pipe detail · WineKeeper · CigarKeeper · module navigation and the shared layout · dialogs and sheets.

Collection data volumes reasoned about: empty, small (1–5 records), moderate (≈50), large (200+, the fetch ceiling used by Curator context).

## 3. Complexity issues identified and corrected

| # | Issue | Screen | Fix |
|---|---|---|---|
| 1 | `min-h-screen` sized screens against the tallest mobile viewport, so the last row sat under the browser chrome | Community (2 views), Want List, Help Center | `min-h-[100dvh]` everywhere on audited screens |
| 2 | Five equal tabs squeezed to ~57px each at 320px; "Not for me" clipped | Want List | `grid-cols-3 sm:grid-cols-5` |
| 3 | Five icon tabs forced into a fixed grid, no room for labels at 320px | Help Center | Tab row scrolls horizontally (`overflow-x-auto`), matching Community |
| 4 | Four-column photo grid at 320px left ~68px tiles | Pipe detail | `grid-cols-3 sm:grid-cols-4` |
| 5 | Oversized page title plus 40px top padding pushed content below the fold | Help Center, Community | `text-2xl sm:text-4xl` / `text-2xl sm:text-3xl`, `py-6 sm:py-10` |
| 6 | Empty collection rendered a dashboard of zeros, a ledger and a report panel | Valuation Center | Explicit "Nothing to value yet" state with the next step |
| 7 | Seven-tab Curator console opened on a configuration board | Curator | Opens on one conversation; tools behind "More from Curator" |
| 8 | Six category chips plus a console header above the first message | Curator | Toolbar reduced to one context line, History and New |
| 9 | Long answers printed in full, pushing actions off screen | Curator | First block visible, remainder behind "Show details" |
| 10 | Tables needed sideways scrolling on phones | Curator answers | Stacked label/value rows under 640px, compact fixed table above |
| 11 | No way to stop or retry a slow answer | Curator | Stop control while sending, "Try again" on failure |
| 12 | Chat input sat inside the scrolling page | Curator | Input pinned in the card with `env(safe-area-inset-bottom)` padding |
| 13 | A brand-new CigarKeeper with no cigars showed a dashboard of zeros | CigarKeeper | Empty state with one action: add your first cigar |

## 4. Navigation steps (before → after)

| Journey | Before | After |
|---|---|---|
| Open app → locate a collection | 1 tap (hub module card) | 1 tap (hub module row) |
| Find one record | 2 | 2 |
| Add an item | 2 | 2 (one primary action on the module page) |
| Edit a record | 3 | 3 |
| Assign a storage location | 3 | 3 |
| Ask Curator a question | 2 (Curator → Chat tab) + typing | 1 + typing |
| Ask for depth | n/a — always expanded | Same answer, 1 tap on "Show details" only when wanted |
| Approve a Curator change | same message | same message (Confirm / Cancel / Undo) |
| Generate a report | 3 (Reports → Reporting Center → report) | 2 (Reporting Center → report) |
| Drill down from a hub metric | 1 (stat → records) | 1 |
| Switch module | 1 | 1 |
| Account / subscription | 1 | 1 |
| Contextual help | 1 | 1 |

No journey requires more than three taps, and none requires analytical knowledge.

## 5. Responsive results

| Width | Result |
|---|---|
| 320 | No fixed panels wider than the viewport, no 4+ column grid, tab rows scroll, inputs full width. Verified by the acceptance scan. |
| 375 / 390 / 430 | Same rules apply; two-column stat strip and stacked tables stay inside the gutters. |
| 768 | Module rows and report catalogue move to two columns; dialog and sheet max-height keep actions visible. |
| 1024 / 1440 | Hub capped at 5xl, Curator at 900px, Reporting Center splits into catalogue + result at `xl`. |

Automated results: build clean; full suite **3,646 tests passing**, including the new `usabilityMobileAcceptance` (8 checks) and `curatorSimpleUi` (8 checks) suites.

## 6. Requires external browser or device verification

- iOS Safari keyboard behaviour on the Curator input (safe-area padding is in place; visual confirmation needed).
- WKWebView build of the native shell: `100dvh`, safe-area insets and the community drawer.
- Android Chrome at 320px with large system font scaling.
- Screen-reader pass on Curator history sheet and the report catalogue.

## 7. Remaining issues

- Module landing dashboards still carry their own insight cards above the record list; they follow the shared primitives but have not been converted to `StatStrip` + one disclosure yet.
- "Customize dashboard" is not implemented as a feature; sections are curated by default rather than user-configurable.
- Non-English locales for the two new Curator keys fall back to English.
- Curator's chat component is still above the file-size guideline; the message renderer and history list were extracted, the send pipeline was not.
- `min-h-screen` remains on admin/legal screens outside this audit's scope.
