/**
 * Collection Intelligence 2.0 help articles.
 *
 * Kept in its own module so the main help registry stays within a workable
 * size. Shape matches HELP_ARTICLES: id, title, module, category, summary,
 * body, keywords, questions, synonyms, relatedArticles.
 */
export const COLLECTION_INTELLIGENCE_ARTICLES = [
  {
    id: 'collection-tools',
    title: 'Collection Tools: Bulk Edit and Duplicates',
    module: 'hub',
    category: 'features',
    summary: 'Edit many records at once and review possible duplicates.',
    body: 'Collection Tools works across every module. Choose a module, then select the records you want to change and apply one edit to all of them: documentation fields, classification, storage location and tags. Only those fields can be changed in bulk, so photographs, valuation history and activity history are never overwritten. The Duplicates tab lists records that share a name within your own collection and lets you compare them side by side. If two records really are the same item, merge them: you choose which record survives, the surviving record keeps its own values, the other record is archived rather than deleted, and its tags and documents are carried across. The same page offers search, a lifecycle filter (active, archived, transferred, gifted, sold, lost, disposed), sorting and a CSV export of what you are looking at.',
    keywords: ['collection tools', 'bulk edit', 'bulk update', 'duplicate', 'duplicates', 'merge', 'archive', 'lifecycle', 'csv', 'export'],
    questions: [
      'how do i edit many records at once',
      'how do i find duplicate records',
      'how do i merge two pipes',
      'what happens to the record i merge away',
      'how do i export my collection to a spreadsheet',
    ],
    synonyms: ['bulk operations', 'duplicate detection', 'merge records'],
    relatedArticles: ['hub-overview', 'reports-exports', 'valuation-center'],
  },
  {
    id: 'valuation-center',
    title: 'Valuation Center',
    module: 'hub',
    category: 'features',
    summary: 'Record what you paid, what you estimate and what was appraised, with evidence.',
    body: 'The Valuation Center keeps a dated ledger for every record instead of a single value field. Each entry is one of: recorded acquisition cost, a correction to that cost, your own estimate, a documented appraisal, an estimated replacement value, or a reference valuation from a named independent source. Every entry records its date, source, methodology, confidence (high, medium, low or unknown) and an optional uncertainty range, and you can attach private receipts, certificates and photographs (stored privately). Amounts in another currency keep the rate that was used on that date; an amount that cannot be converted is shown as unknown rather than as zero. Entries are append-only, so what you believed in the past is never overwritten. An AI-generated figure is always labelled as an unverified estimate and never presented as a market price. Acquisition cost is private by default and is not part of a shared collection view.',
    keywords: ['valuation', 'value', 'worth', 'appraisal', 'replacement value', 'insurance', 'estate', 'currency', 'confidence', 'receipt'],
    questions: [
      'how do i record what i paid',
      'how do i add an appraisal',
      'why does my value show as unknown',
      'how is my collection value calculated',
      'can i record a value in another currency',
      'is my purchase price shown when i share',
    ],
    synonyms: ['valuation ledger', 'insurance documentation', 'estate documentation'],
    relatedArticles: ['reports-exports', 'collection-tools', 'sharing-and-privacy'],
  },
  {
    id: 'reporting-center',
    title: 'Reporting Center',
    module: 'hub',
    category: 'features',
    summary: 'Run collection reports with filters, charts, drill-down, saved views and export.',
    body: 'The Reporting Center collects every report in one place. Pick a report, set the filters you want (module, date range, storage location, maker or producer, category, minimum rating, year), and the report is calculated from your records. Reports show charts and tables, and any figure can be opened to see the records behind it, so a total always leads back to the items that make it up. You can save a report together with its filters as a saved view and reopen it later, print the report, or export it as CSV or PDF. Reports describe your own records: they never compare prices against retailers and never include data copied from another company\'s database. Reports are generated on the server, and the same entitlement checks that apply to the page apply to the export.',
    keywords: ['report', 'reports', 'reporting center', 'filters', 'chart', 'drill down', 'saved view', 'print', 'csv', 'pdf', 'export'],
    questions: [
      'where are my reports',
      'how do i filter a report',
      'can i save a report',
      'how do i see the records behind a total',
      'how do i print a report',
      'how do i export a report',
    ],
    synonyms: ['analytics', 'reporting', 'statistics'],
    relatedArticles: ['reports-exports', 'valuation-center', 'collection-tools'],
  },
  {
    id: 'sharing-and-privacy',
    title: 'Sharing a Collection and Privacy',
    module: 'hub',
    category: 'features',
    summary: 'Share a read-only view of chosen records, with an expiry date and revoke.',
    body: 'Sharing is off until you create a share, and a share only ever shows the records you pick: one record, a selected category or an organised showcase with a title and notes. Before you send a link you can preview exactly what the recipient will see. You choose the fields to include, and photographs, notes, your personal rating and an estimated value are each opt-in. Acquisition cost, purchase details, private notes, email addresses and personal information are never included, and private attachments are never exposed. A link can carry an expiry date and can be revoked at any time; an expired or revoked link shows a short notice instead of the collection. The shared view is built on the server, so the restrictions are enforced there and not only hidden in the page. Sharing is documentation and presentation only: it is not a marketplace, and nothing in a share can be bought, sold or traded.',
    keywords: ['share', 'sharing', 'link', 'public', 'private', 'privacy', 'revoke', 'expire', 'showcase', 'preview'],
    questions: [
      'how do i share my collection',
      'can someone see what i paid',
      'how do i stop sharing a link',
      'does a share link expire',
      'what can a recipient see',
    ],
    synonyms: ['public link', 'share link', 'privacy controls'],
    relatedArticles: ['valuation-center', 'hub-overview', 'reports-exports'],
  },
];

export default COLLECTION_INTELLIGENCE_ARTICLES;