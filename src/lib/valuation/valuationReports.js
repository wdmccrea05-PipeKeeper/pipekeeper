/**
 * src/lib/valuation/valuationReports.js
 *
 * The eight printable report models of the Valuation and Documentation Center.
 *
 * A model is data, not markup: title, attribution, columns, rows, totals and
 * disclosures. The PDF and CSV writers consume it, so every report carries the
 * same source attribution, generation date and uncertainty disclosure.
 *
 * Pure functions only.
 */

import {
  VALUATION_DISCLOSURE,
  AI_DISCLOSURE,
  resolveHeadlineValuation,
  groupByRecord,
  normaliseValuations,
  buildRecordValuationHistory,
  buildCollectionValuationSummary,
} from './valuationCenter.js';

export const REPORT_CATALOG = Object.freeze([
  { id: 'valuation_summary', title: 'Collection Valuation Summary', purpose: 'What the collection is recorded at, and on what evidence.' },
  { id: 'insurance_inventory', title: 'Detailed Insurance Inventory', purpose: 'Item-level schedule with appraisal and document status.' },
  { id: 'photographic_inventory', title: 'Photographic Collection Inventory', purpose: 'Which records carry photographs and supporting documents.' },
  { id: 'estate_inventory', title: 'Estate and Inheritance Inventory', purpose: 'Records, provenance and documented value for estate planning.' },
  { id: 'provenance_history', title: 'Provenance and Ownership History', purpose: 'Where each record came from and how ownership is documented.' },
  { id: 'acquisition_cost', title: 'Historical Acquisition Cost Report', purpose: 'Recorded cost, corrections and acquisition sources.' },
  { id: 'valuation_history', title: 'Historical Valuation Report', purpose: 'Every valuation entry with its date, source and confidence.' },
  { id: 'documentation_completeness', title: 'Documentation Completeness Report', purpose: 'Which records are missing documentation, and what.' },
]);

const MODULE_LABELS = {
  pipekeeper: 'PipeKeeper',
  tobacco: 'Tobacco cellar',
  cigarkeeper: 'CigarKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  winekeeper: 'WineKeeper',
};

function money(value) {
  if (value === null || value === undefined) return 'Unknown';
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function envelope(id, input = {}) {
  const meta = REPORT_CATALOG.find((report) => report.id === id);
  return {
    id,
    title: meta?.title || id,
    purpose: model_purpose(id),
    generatedAt: (input.generatedAt instanceof Date ? input.generatedAt : new Date()).toISOString(),
    owner: input.ownerLabel || 'Collection owner',
    attribution: input.attribution
      || 'Source: the collector\'s own records in CollectionKeeper. No third-party price database is reproduced.',
    disclosures: [VALUATION_DISCLOSURE, AI_DISCLOSURE],
  };
}

function model_purpose(id) {
  const found = REPORT_CATALOG.find((report) => report.id === id);
  return found ? found.purpose : '';
}

function itemIndex(items = []) {
  return new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]));
}

function label(item) {
  return item?.name || 'Unnamed record';
}

function moduleLabel(item) {
  return MODULE_LABELS[item?.moduleKey] || item?.moduleKey || '—';
}

function dateOnly(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function rowsForItems(items, valuations, rates, build) {
  const byRecord = groupByRecord(valuations, rates);
  return (Array.isArray(items) ? items : []).map((item) => {
    const entries = normaliseValuations(byRecord[item.id] || [], rates);
    return build(item, entries, resolveHeadlineValuation(entries, { rates }));
  });
}

export function buildValuationReport(reportId, input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  const valuations = Array.isArray(input.valuations) ? input.valuations : [];
  const rates = input.rates || {};
  const summary = input.summary || buildCollectionValuationSummary({ items, valuations, rates });
  const base = envelope(reportId, input);

  switch (reportId) {
    case 'valuation_summary': {
      const rows = rowsForItems(items, valuations, rates, (item, entries, headline) => ({
        item: label(item),
        module: moduleLabel(item),
        maker: item.maker || '—',
        basis: headline.known ? headline.kindLabel : 'No valuation recorded',
        date: dateOnly(headline.valuationDate),
        confidence: headline.known ? headline.confidenceLabel : 'Unknown',
        verified: headline.verified ? 'Documented' : headline.known ? 'Owner / reference' : '—',
        value: headline.known ? headline.amountBase : null,
      }));
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 3 },
          { key: 'module', label: 'Module', width: 2 },
          { key: 'maker', label: 'Maker / producer', width: 2.4 },
          { key: 'basis', label: 'Basis', width: 2.6 },
          { key: 'date', label: 'Valuation date', width: 1.7 },
          { key: 'confidence', label: 'Confidence', width: 1.8 },
          { key: 'verified', label: 'Evidence', width: 1.9 },
          { key: 'value', label: 'Amount', width: 1.8, align: 'right', format: 'currency' },
        ],
        rows,
        totals: [
          { label: 'Total recorded acquisition cost', value: summary.recordedCost, format: 'currency' },
          { label: 'Total documented or estimated value', value: summary.estimatedValue, format: 'currency' },
          { label: 'Records with a valuation', value: `${summary.valuedRecords} of ${summary.items} (${summary.percentValued}%)` },
          { label: 'Records valued from cost only', value: summary.costOnlyRecords },
          { label: 'Records with no valuation', value: summary.unknownRecords },
          { label: 'Low or unknown confidence', value: summary.lowConfidenceRecords },
        ],
        emptyMessage: 'No collection records to value yet.',
      };
    }

    case 'insurance_inventory': {
      const rows = rowsForItems(items, valuations, rates, (item, entries, headline) => {
        const appraisal = entries.find((entry) => entry.kind === 'appraisal');
        const replacement = entries.find((entry) => entry.kind === 'replacement_value');
        return {
          item: label(item),
          module: moduleLabel(item),
          identifier: [item.serialNumber, item.batchNumber].filter(Boolean).join(' / ') || '—',
          storage: item.storageLocationName || 'Not recorded',
          appraisal: appraisal ? appraisal.amountBase : null,
          appraisalDate: appraisal ? dateOnly(appraisal.valuationDate) : '—',
          appraiser: appraisal?.appraiser || '—',
          replacement: replacement ? replacement.amountBase : null,
          documents: entries.reduce((sum, entry) => sum + entry.documentCount, 0),
          status: appraisal && appraisal.documentCount > 0 ? 'Appraisal on file' : appraisal ? 'Appraisal, no document' : 'No appraisal',
        };
      });
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 2.8 },
          { key: 'module', label: 'Module', width: 1.9 },
          { key: 'identifier', label: 'Serial / batch', width: 2.1 },
          { key: 'storage', label: 'Location', width: 2.1 },
          { key: 'appraisal', label: 'Appraised value', width: 1.8, align: 'right', format: 'currency' },
          { key: 'appraisalDate', label: 'Appraisal date', width: 1.7 },
          { key: 'status', label: 'Status', width: 2.2 },
        ],
        rows,
        totals: [
          { label: 'Records with a documented appraisal', value: `${summary.appraisedRecords} of ${summary.items}` },
          { label: 'Records with a replacement value recorded', value: summary.replacementRecords },
          { label: 'Records with an appraisal and a supporting document', value: summary.insuranceReady },
          { label: 'Total documented or estimated value', value: summary.estimatedValue, format: 'currency' },
        ],
        emptyMessage: 'No records to schedule yet.',
      };
    }

    case 'photographic_inventory': {
      const rows = items.map((item) => ({
        item: label(item),
        module: moduleLabel(item),
        photos: Array.isArray(item.photos) ? item.photos.length : 0,
        documents: Array.isArray(item.documents) ? item.documents.length : 0,
        condition: item.condition || 'Not recorded',
        storage: item.storageLocationName || 'Not recorded',
      }));
      const withPhotos = rows.filter((row) => row.photos > 0).length;
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 3.4 },
          { key: 'module', label: 'Module', width: 2 },
          { key: 'photos', label: 'Photographs', width: 1.6, align: 'right' },
          { key: 'documents', label: 'Documents', width: 1.6, align: 'right' },
          { key: 'condition', label: 'Condition', width: 2.4 },
          { key: 'storage', label: 'Location', width: 2.2 },
        ],
        rows,
        totals: [
          { label: 'Records with at least one photograph', value: `${withPhotos} of ${rows.length}` },
          { label: 'Total photographs referenced', value: rows.reduce((sum, row) => sum + row.photos, 0) },
          { label: 'Total documents referenced', value: rows.reduce((sum, row) => sum + row.documents, 0) },
        ],
        note: 'Photographs and documents are stored privately. This inventory lists what is held for each record; the files open from the record itself.',
        emptyMessage: 'No records yet.',
      };
    }

    case 'estate_inventory': {
      const rows = rowsForItems(items, valuations, rates, (item, entries, headline) => ({
        item: label(item),
        module: moduleLabel(item),
        acquired: dateOnly(item.purchaseDate),
        ownerHistory: item.originalOwner || 'Acquired new / not recorded',
        value: headline.known ? headline.amountBase : null,
        basis: headline.known ? headline.kindLabel : 'No valuation recorded',
        lifecycle: item.lifecycleStatus || 'active',
        storage: item.storageLocationName || 'Not recorded',
      }));
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 3 },
          { key: 'module', label: 'Module', width: 1.9 },
          { key: 'acquired', label: 'Acquired', width: 1.7 },
          { key: 'ownerHistory', label: 'Provenance', width: 2.6 },
          { key: 'value', label: 'Documented value', width: 1.9, align: 'right', format: 'currency' },
          { key: 'basis', label: 'Basis', width: 2.2 },
          { key: 'lifecycle', label: 'Status', width: 1.5 },
        ],
        rows,
        totals: [
          { label: 'Records in the inventory', value: items.length },
          { label: 'Total documented or estimated value', value: summary.estimatedValue, format: 'currency' },
          { label: 'Total recorded acquisition cost', value: summary.recordedCost, format: 'currency' },
        ],
        note: 'Prepared for estate and inheritance documentation. It records what the collection contains and what the owner documented; it is not a probate valuation.',
        emptyMessage: 'No records yet.',
      };
    }

    case 'provenance_history': {
      const rows = items.map((item) => ({
        item: label(item),
        module: moduleLabel(item),
        acquired: dateOnly(item.purchaseDate),
        source: item.purchaseSource || 'Not recorded',
        originalOwner: item.originalOwner || 'Not recorded',
        notes: item.provenanceNotes || item.conditionNotes || '—',
        documents: Array.isArray(item.documents) ? item.documents.length : 0,
      }));
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 2.8 },
          { key: 'module', label: 'Module', width: 1.8 },
          { key: 'acquired', label: 'Acquired', width: 1.6 },
          { key: 'source', label: 'Acquisition source', width: 2.6 },
          { key: 'originalOwner', label: 'Original owner', width: 2.2 },
          { key: 'notes', label: 'Provenance notes', width: 3.4 },
          { key: 'documents', label: 'Docs', width: 1, align: 'right' },
        ],
        rows,
        totals: [
          { label: 'Records with a documented source', value: rows.filter((row) => row.source !== 'Not recorded').length },
          { label: 'Records with a documented prior owner', value: rows.filter((row) => row.originalOwner !== 'Not recorded').length },
        ],
        emptyMessage: 'No records yet.',
      };
    }

    case 'acquisition_cost': {
      const rows = [];
      const byRecord = groupByRecord(valuations, rates);
      items.forEach((item) => {
        const entries = normaliseValuations(byRecord[item.id] || [], rates).filter(
          (entry) => entry.kind === 'acquisition_cost' || entry.kind === 'acquisition_correction'
        );
        if (!entries.length) {
          rows.push({
            item: label(item),
            module: moduleLabel(item),
            date: dateOnly(item.purchaseDate),
            kind: 'No cost recorded',
            original: null,
            currency: null,
            fx: null,
            base: null,
            source: item.purchaseSource || 'Not recorded',
          });
          return;
        }
        entries.forEach((entry) => {
          rows.push({
            item: label(item),
            module: moduleLabel(item),
            date: dateOnly(entry.valuationDate),
            kind: entry.kindLabel,
            original: entry.amount,
            currency: entry.currency,
            fx: entry.kind === 'acquisition_cost' ? null : entry.id ? 'correction' : null,
            base: entry.amountBase,
            source: entry.source || item.purchaseSource || 'Not recorded',
          });
        });
      });
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 2.8 },
          { key: 'module', label: 'Module', width: 1.7 },
          { key: 'date', label: 'Date', width: 1.6 },
          { key: 'kind', label: 'Entry', width: 2.3 },
          { key: 'original', label: 'Recorded', width: 1.6, align: 'right', format: 'amount' },
          { key: 'currency', label: 'Currency', width: 1.2 },
          { key: 'base', label: 'Base amount', width: 1.8, align: 'right', format: 'currency' },
          { key: 'source', label: 'Source', width: 2.4 },
        ],
        rows,
        totals: [
          { label: 'Total recorded acquisition cost (latest per record)', value: summary.recordedCost, format: 'currency' },
          { label: 'Corrections recorded', value: valuations.filter((entry) => entry.kind === 'acquisition_correction').length },
          { label: 'Records with no cost recorded', value: items.length - new Set(
            normaliseValuations(valuations, rates)
              .filter((entry) => entry.kind === 'acquisition_cost' || entry.kind === 'acquisition_correction')
              .map((entry) => entry.recordId)
          ).size },
        ],
        note: 'Corrections are kept beside the original entry; nothing is overwritten, so the history of the recorded cost is preserved.',
        emptyMessage: 'No acquisition costs recorded yet.',
      };
    }

    case 'valuation_history': {
      const rows = normaliseValuations(valuations, rates).map((entry) => ({
        date: dateOnly(entry.valuationDate),
        item: entry.recordName || label(itemIndex(items).get(entry.recordId)),
        kind: entry.kindLabel,
        evidence: entry.evidenceLabel,
        confidence: entry.confidenceLabel,
        original: entry.amount,
        currency: entry.currency,
        base: entry.amountBase,
        source: entry.source || 'Not recorded',
        documents: entry.documentCount,
      }));
      return {
        ...base,
        columns: [
          { key: 'date', label: 'Date', width: 1.6 },
          { key: 'item', label: 'Record', width: 2.6 },
          { key: 'kind', label: 'Kind', width: 2.2 },
          { key: 'evidence', label: 'Evidence', width: 1.8 },
          { key: 'confidence', label: 'Confidence', width: 1.9 },
          { key: 'original', label: 'Recorded', width: 1.5, align: 'right', format: 'amount' },
          { key: 'currency', label: 'Cur.', width: 1 },
          { key: 'base', label: 'Base', width: 1.6, align: 'right', format: 'currency' },
          { key: 'documents', label: 'Docs', width: 0.9, align: 'right' },
        ],
        rows,
        totals: [
          { label: 'Valuation entries recorded', value: rows.length },
          { label: 'Documented appraisals', value: normaliseValuations(valuations, rates).filter((entry) => entry.kind === 'appraisal').length },
          { label: 'Entries that could not be converted to the base currency', value: summary.unconvertibleEntries },
        ],
        note: 'Every entry is shown with the date it applies to. An entry that could not be converted has no base amount rather than an assumed one.',
        emptyMessage: 'No valuation entries yet.',
      };
    }

    case 'documentation_completeness': {
      const rows = items.map((item) => ({
        item: label(item),
        module: moduleLabel(item),
        percent: item.documentationPercent ?? null,
        missing: Array.isArray(item.missingDocumentation) && item.missingDocumentation.length
          ? item.missingDocumentation.join(', ')
          : 'None recorded',
        photos: Array.isArray(item.photos) ? item.photos.length : 0,
        documents: Array.isArray(item.documents) ? item.documents.length : 0,
        valuated: item.hasValuation ? 'Yes' : 'No',
      }));
      const withGaps = rows.filter((row) => row.missing !== 'None recorded').length;
      return {
        ...base,
        columns: [
          { key: 'item', label: 'Record', width: 3 },
          { key: 'module', label: 'Module', width: 1.8 },
          { key: 'percent', label: 'Complete', width: 1.4, align: 'right', format: 'percent' },
          { key: 'missing', label: 'Missing documentation', width: 5.4 },
          { key: 'photos', label: 'Photos', width: 1.2, align: 'right' },
          { key: 'documents', label: 'Docs', width: 1.1, align: 'right' },
          { key: 'valuated', label: 'Valued', width: 1.2 },
        ],
        rows,
        totals: [
          { label: 'Records with documentation gaps', value: `${withGaps} of ${rows.length}` },
          { label: 'Records with a valuation', value: `${summary.valuedRecords} of ${summary.items}` },
          { label: 'Records missing supporting documents', value: summary.missingDocumentation.length },
        ],
        emptyMessage: 'No records yet.',
      };
    }

    default:
      throw new Error(`Unknown valuation report: ${reportId}`);
  }
}

/** Build every report, used by tests and by the "all reports" export. */
export function buildAllValuationReports(input = {}) {
  return REPORT_CATALOG.map((report) => buildValuationReport(report.id, input));
}

/** Flat CSV for one report model. */
export function buildReportCsv(model = {}) {
  const columns = model.columns || [];
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [];
  lines.push(escape(model.title));
  lines.push(escape(`Generated ${dateOnly(model.generatedAt)} · ${model.owner}`));
  lines.push(escape(model.attribution || ''));
  lines.push('');
  lines.push(columns.map((column) => escape(column.label)).join(','));
  (model.rows || []).forEach((row) => {
    lines.push(columns.map((column) => escape(row[column.key])).join(','));
  });
  lines.push('');
  (model.totals || []).forEach((total) => {
    lines.push([escape(total.label), escape(total.value)].join(','));
  });
  lines.push('');
  (model.disclosures || []).forEach((disclosure) => lines.push(escape(disclosure)));

  return lines.join('\n');
}

export { dateOnly, money, MODULE_LABELS, buildRecordValuationHistory };