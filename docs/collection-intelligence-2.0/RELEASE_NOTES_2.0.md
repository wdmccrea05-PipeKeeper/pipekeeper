# CollectionKeeper — Collection Intelligence 2.0 Release Notes

## New in this release

**Valuation Center**
A dated, append-only valuation ledger for every collection record. Record an acquisition cost (and corrections to it), your own estimate, a documented appraisal, a replacement value, or a reference figure from a named independent source. Each entry keeps its date, source, methodology, confidence and optional uncertainty range, with private receipts, certificates and photographs attached (stored privately). Currency conversion keeps the rate used on the date; an amount that cannot be converted is shown as unknown, never as zero. Acquisition cost is private by default and is excluded from shared views.

**Reporting Center**
Twenty reports across all modules in one place, with filters, charts, tables, drill-down from any figure to the records behind it, saved views, print, and CSV/PDF export. Reports describe your own records only: no retailer price comparison and no data copied from another company's database.

**Collection Tools**
Bulk editing of documentation, classification, storage and tags across selected records; duplicate detection with side-by-side comparison and a controlled merge that archives the losing record instead of deleting it; lifecycle filtering, sorting and CSV export.

**Sharing and privacy**
Read-only shares of a single record, a selected category or an organised showcase, with a preview of exactly what a recipient sees, per-field opt-in, an optional expiry date and revoke at any time. Acquisition cost, purchase details, private notes, email addresses and private attachments are never shared. The shared view is built on the server, so restrictions are enforced there.

**Documentation and preservation**
Shared acquisition, provenance, condition and attachment fields across pipes, tobacco, cigars, whiskey and wine; an append-only activity history per record; dated condition tracking; humidor readings with threshold alerts; cigar ratings by category; wine inspections; whiskey fill records; tobacco cellar packaging, cellaring duration and recipe history.

**Curator**
Persistent conversation history across devices, collection-grounded answers that cite the records behind them, documentation-gap analysis, conversational reports, and record-change proposals that require your approval before anything is written. Curator can update classification, storage, tags and documentation fields, with a preview, confirm and undo trail.

**Help**
Four new help articles (Collection Tools, Valuation Center, Reporting Center, Sharing and Privacy) with topic shortcuts, available from Help and the AI help search.

## Fixes in this release

- Rotation analytics no longer counts archived, merged or retired pipes as "never smoked".
- "Last smoked" now reads "Last smoked 181 days ago" instead of "181 ago" (English, German and French corrected).
- Pairing explanations now lead with each blend's own type and strength, so a pipe with unmeasured chamber geometry no longer produces an identical paragraph for every blend.
- Two guard tests that had drifted from the implementation were re-pointed at the real code and pass again.

## Known limitations

- Row-level security is still missing on 61 of 84 entities; the core collection entities are affected. This is the release blocker.
- Non-English locales fall back to English for the newest strings.
- Apple deferred subscription upgrades are not supported.
- The appreciation campaign sender processes one batch then stalls (tracked).

## Not changed

- No subscription price, plan or entitlement value was altered.
- No production collection record was migrated, rewritten or deleted.
