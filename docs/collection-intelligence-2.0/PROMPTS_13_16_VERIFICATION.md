# Independent verification — Prompts 13 to 16 (simplicity, progressive disclosure, usability)

Date: 2026-11-27 · Verified against the code as it runs, not against earlier completion reports

## 1. Method and its limits

**Explicit limitation:** no browser-automation, screenshot or visual-regression tooling is available in this
environment. No pixel comparison, no device pass and no screenshot evidence was produced. Every verdict below
comes from one of two sources, and each is labelled:

- **Behavioural** — an executable check that calls the real function with real inputs
  (`src/__tests__/simplicityDisclosureAudit.test.js`, 10 tests; plus the existing `curatorSimpleUi`,
  `usabilityMobileAcceptance` suites).
- **Wiring** — a check that the producer of a link or value and its consumer agree (source-level, because the
  consumer needs a signed-in session and live data that cannot be stood up headlessly).

Anything that requires a rendered screen is listed in section 6 as unverified rather than assumed.

## 2. Requirement verdicts

| Requirement | Verdict | Evidence |
|---|---|---|
| Advanced functionality preserved but behind progressive disclosure | **Met** | Curator defaults to the conversation; the six analytical surfaces render only after `AdvancedDetails` "moreTools". Forms keep essential fields visible and collapse the rest (`FormSection`, at most two sections open by default). Behavioural + wiring. |
| Curator gives a concise answer with optional detail | **Met** | `splitMessageBlocks` keeps the first block visible and hides the rest until "Show details (n more)" with `aria-expanded`. Behavioural (existing suite) + component read. |
| Curator stays conversational and uncluttered | **Met** | One input, starter prompts capped at `slice(0, 3)`, history in a sheet, no always-visible methodology panels. Wiring. |
| Dashboards use a limited number of meaningful default metrics | **Met** | Hub headline strip renders 2 metrics; CigarKeeper module strip renders 4. Behavioural guard added so a future metric cannot silently push past 4. |
| Dashboard customization persists across sessions and devices | **NOT MET** | No customization implementation exists anywhere: no dashboard config entity, no persisted section state, no storage read/write. Sections are curated by default. This requirement is unimplemented, not broken. |
| Each module follows a consistent navigation structure | **Met (after fix)** | All four module navs now follow Collection → Activity → Insights → Reports, and all four Reports entries point at the same Reporting Center. Cigar nav previously pointed elsewhere (see defect 2). |
| All dashboard drill-downs apply the correct filters | **Met (after fix)** | Cigar drill-downs verified end to end: every emitted param key is read by the collection page and every emitted preset is handled by a real filter branch (behavioural). Session History ignored its `?module=` link (defect 1, fixed). Hub links verified to land on handlers that read them. |
| Unused modules and unnecessary widgets hidden by default | **Met** | Module navigation and hub rows are built from enabled-module state; locked modules do not render. Wiring. |
| Advanced record fields do not overwhelm basic inventory workflows | **Met** | All five record forms use collapsible sections; the identity/name fields render outside any section. Behavioural guard on section-open counts. |
| Reports are consolidated and discoverable | **Met (after fix)** | Module navs bypassed the Reporting Center and opened the older Collection Reports page (defect 2, fixed). One reporting surface in navigation now. |
| Mobile: no horizontal overflow, clipped text, inaccessible controls | **Partially verified** | Static + contract checks pass (no fixed panel wider than 320px, no bare 4+ column grid, scrollable tab rows, dynamic viewport units). Rendering was not observed — see section 6. |
| Essential tasks need no unnecessary navigation | **Met** | Longest essential journey is three taps (edit a record, assign storage); Curator and Reporting each dropped a step. |
| Existing functionality, security and entitlements intact | **Met** | Full suite green after the fixes; no entitlement, RLS or pricing code touched. |

## 3. Defects found and corrected

1. **Session History dropped its module link.** `/SessionHistory?module=wine` (used by WineKeeper's
   "Tasting History") was ignored, so the page always opened on "All" — a drill-down that looked filtered and
   was not. The resolver is now a tested pure function and unavailable modules fall back to "All" instead of an
   empty calendar.
2. **Two reporting surfaces.** Pipe, Whiskey, Cigar and Wine navigation all pointed at `CollectionReports`,
   while the global navigation pointed at `ReportingCenter` — the same word, two destinations. All four module
   links now open the consolidated center scoped to that module, verified by the same module-scope function the
   center uses.

Neither defect was visible from a component inventory; both only appear when a link is followed.

## 4. Guards added

`src/__tests__/simplicityDisclosureAudit.test.js` — 10 behavioural checks covering report scoping, single
reporting surface, session-history module resolution, cigar drill-down param and preset coverage, preset
filtering, hub deep-link handlers, headline metric caps, and form disclosure defaults.

`PRODUCTION_READINESS_REVIEW.md` now carries three additional acceptance gates (U11 drill-downs apply their
filter, U12 one reporting surface, U13 dashboard customization) on top of U1–U10.

## 5. Release judgement

Navigation is not harder than before: every essential journey completes in three taps or fewer, Curator opens
on the conversation, and reporting has one entry point. The one requirement that fails is dashboard
customization, which was never built — a missing feature rather than a regression.

**Recommendation:** treat the release as complete for usability and disclosure, with dashboard customization
declared out of scope for this release (or scheduled as its own increment), and state that in the release notes
rather than leaving the requirement silently unmet.

## 6. Requires a browser or device before sign-off

- Visual confirmation at 320/375/390/430/768/1024/1440 px: no clipping, no overlap, no sideways scroll.
- Visual regression comparison of the hub, a module landing page, a record form and a Curator answer.
- iOS Safari keyboard behaviour on the Curator input and on record forms.
- WKWebView native shell: `100dvh`, safe-area insets, community drawer.
- Screen-reader pass on the Curator history sheet, the report catalogue and a collapsed form section.

Until those are run, the mobile and visual rows above remain "partially verified", not "met".
