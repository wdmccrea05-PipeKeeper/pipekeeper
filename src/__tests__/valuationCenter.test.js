import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  VALUATION_KINDS,
  AI_DISCLOSURE,
  VALUATION_DISCLOSURE,
  convertToBase,
  normaliseValuation,
  normaliseValuations,
  resolveHeadlineValuation,
  buildRecordValuationHistory,
  buildValueOverTime,
  buildCollectionValuationSummary,
  listUnverifiedRecords,
  summariseBuckets,
} from '../lib/valuation/valuationCenter.js';
import {
  canExposeFinancials,
  stripFinancialFields,
  buildPublicValuationView,
  shareDisclosesFinancials,
} from '../lib/valuation/valuationPrivacy.js';
import { buildValuationItems, filterItems } from '../lib/valuation/collectionItems.js';
import {
  REPORT_CATALOG,
  buildValuationReport,
  buildAllValuationReports,
  buildReportCsv,
} from '../lib/valuation/valuationReports.js';

const REPO_ROOT = globalThis.process?.cwd?.() || '';
const read = (relative) => fs.readFileSync(path.resolve(REPO_ROOT, relative), 'utf8');

const item = (over = {}) => ({
  id: 'p1',
  entity: 'Pipe',
  moduleKey: 'pipekeeper',
  moduleLabel: 'PipeKeeper',
  name: 'Pipe A',
  maker: 'Dunhill',
  category: 'Billiard',
  storageLocationName: 'Rack 1',
  photos: [],
  documents: [],
  documentationPercent: 80,
  missingDocumentation: ['Condition notes'],
  hasValuation: true,
  ...over,
});

const entry = (over = {}) => ({
  id: 'v1',
  record_entity: 'Pipe',
  record_id: 'p1',
  record_name: 'Pipe A',
  module_key: 'pipekeeper',
  kind: 'acquisition_cost',
  amount: 100,
  currency: 'USD',
  valuation_date: '2024-01-01',
  source_type: 'manual',
  confidence: 'high',
  ...over,
});

describe('valuation kinds keep evidence classes apart', () => {
  it('labels each kind with its evidence class and whether it is a value', () => {
    expect(VALUATION_KINDS.acquisition_cost.evidence).toBe('documented');
    expect(VALUATION_KINDS.acquisition_cost.countsAsValue).toBe(false);
    expect(VALUATION_KINDS.appraisal.evidence).toBe('documented');
    expect(VALUATION_KINDS.appraisal.verified).toBe(true);
    expect(VALUATION_KINDS.user_estimate.evidence).toBe('user_entered');
    expect(VALUATION_KINDS.user_estimate.verified).toBe(false);
    expect(VALUATION_KINDS.reference_valuation.evidence).toBe('reference');
    expect(VALUATION_KINDS.reference_valuation.countsAsValue).toBe(true);
  });

  it('never treats an AI figure as verified or high confidence', () => {
    const ai = normaliseValuation(entry({ kind: 'user_estimate', source_type: 'ai_estimate', confidence: 'high', amount: 900 }));
    expect(ai.verified).toBe(false);
    expect(ai.confidence).toBe('low');
    expect(ai.aiDerived).toBe(true);
    expect(ai.disclosure).toBe(AI_DISCLOSURE);
    expect(ai.disclosure).toContain('not a verified market price');
  });

  it('treats an unauthorized reference figure as unknown', () => {
    const reference = normaliseValuation(entry({ kind: 'reference_valuation', amount: 500, confidence: 'high' }));
    expect(reference.confidence).toBe('unknown');
    expect(reference.verified).toBe(false);
    expect(reference.authorizedReference).toBe(false);
    expect(reference.disclosure).toMatch(/authorized/i);
  });

  it('accepts a reference figure only when an independent source is named', () => {
    const reference = normaliseValuation(
      entry({ kind: 'reference_valuation', amount: 500, independent_source: true, reference_source_name: 'Named index' })
    );
    expect(reference.authorizedReference).toBe(true);
    expect(reference.confidence).not.toBe('unknown');
  });
});

describe('currency handling', () => {
  it('passes base-currency amounts through', () => {
    expect(convertToBase(250, 'USD', { EUR: 0.9 })).toBe(250);
  });

  it('converts with the documented rate', () => {
    expect(convertToBase(90, 'EUR', { EUR: 0.9 })).toBe(100);
  });

  it('returns null rather than zero when no rate is available', () => {
    expect(convertToBase(90, 'EUR', {})).toBeNull();
    expect(convertToBase(null, 'USD', {})).toBeNull();
  });

  it('keeps the original amount and flags an unconvertible entry', () => {
    const record = normaliseValuation(entry({ amount: 90, currency: 'EUR' }));
    expect(record.amount).toBe(90);
    expect(record.amountBase).toBeNull();
    expect(record.convertible).toBe(false);
  });

  it('uses a stored base amount when one was recorded', () => {
    const record = normaliseValuation(entry({ amount: 90, currency: 'EUR', amount_base: 101.5 }));
    expect(record.amountBase).toBe(101.5);
  });
});

describe('headline valuation precedence', () => {
  const rates = {};

  it('prefers a documented appraisal over everything else', () => {
    const headline = resolveHeadlineValuation(
      normaliseValuations(
        [
          entry({ id: 'a', kind: 'acquisition_cost', amount: 100 }),
          entry({ id: 'b', kind: 'user_estimate', amount: 400, valuation_date: '2025-05-01' }),
          entry({ id: 'c', kind: 'appraisal', amount: 650, valuation_date: '2025-06-01' }),
        ],
        rates
      ),
      { rates }
    );
    expect(headline.kind).toBe('appraisal');
    expect(headline.amountBase).toBe(650);
    expect(headline.verified).toBe(true);
    expect(headline.isCost).toBe(false);
  });

  it('falls back to the owner estimate, then replacement, then reference', () => {
    const estimate = resolveHeadlineValuation(
      normaliseValuations([entry({ kind: 'user_estimate', amount: 300 }), entry({ id: 'r', kind: 'reference_valuation', amount: 200 })])
    );
    expect(estimate.kind).toBe('user_estimate');

    const replacement = resolveHeadlineValuation(
      normaliseValuations([entry({ kind: 'replacement_value', amount: 250 }), entry({ id: 'r', kind: 'reference_valuation', amount: 200 })])
    );
    expect(replacement.kind).toBe('replacement_value');
  });

  it('uses acquisition cost only as a labelled fallback', () => {
    const headline = resolveHeadlineValuation(normaliseValuations([entry({ amount: 100 })]));
    expect(headline.kind).toBe('acquisition_cost');
    expect(headline.isCost).toBe(true);
    expect(headline.disclosure).toMatch(/historical cost, not a current value/i);
  });

  it('reports unknown rather than zero when nothing is recorded', () => {
    const headline = resolveHeadlineValuation([]);
    expect(headline.known).toBe(false);
    expect(headline.amountBase).toBeNull();
    expect(headline.confidence).toBe('unknown');
  });

  it('keeps an ordered history for one record', () => {
    const history = buildRecordValuationHistory(
      normaliseValuations([
        entry({ id: 'b', kind: 'user_estimate', amount: 200, valuation_date: '2025-02-01' }),
        entry({ id: 'a', amount: 100, valuation_date: '2024-02-01' }),
      ])
    );
    expect(history.map((row) => row.id)).toEqual(['a', 'b']);
  });
});

describe('collection summary', () => {
  const items = [item(), item({ id: 'p2', name: 'Pipe B', maker: 'Savinelli', hasValuation: false })];
  const valuations = [
    entry({ id: 'c1', kind: 'acquisition_cost', amount: 100, valuation_date: '2024-01-01' }),
    entry({ id: 'e1', kind: 'user_estimate', amount: 150, valuation_date: '2026-10-01', confidence: 'low' }),
  ];
  const now = new Date('2026-11-27');

  it('totals recorded cost and documented/estimated value separately', () => {
    const summary = buildCollectionValuationSummary({ items, valuations, now });
    expect(summary.recordedCost).toBe(100);
    expect(summary.estimatedValue).toBe(150);
    expect(summary.valuedRecords).toBe(1);
    expect(summary.unknownRecords).toBe(1);
    expect(summary.percentValued).toBe(50);
    expect(summary.lowConfidenceRecords).toBe(1);
  });

  it('applies an acquisition correction instead of the original cost', () => {
    const summary = buildCollectionValuationSummary({
      items: [item()],
      valuations: [
        entry({ id: 'c1', kind: 'acquisition_cost', amount: 100, valuation_date: '2024-01-01' }),
        entry({ id: 'c2', kind: 'acquisition_correction', amount: 125, valuation_date: '2024-06-01', supersedes_id: 'c1' }),
      ],
      now,
    });
    expect(summary.recordedCost).toBe(125);
  });

  it('counts a cost-only record as having no value', () => {
    const summary = buildCollectionValuationSummary({ items: [item()], valuations: [entry()], now });
    expect(summary.estimatedValue).toBe(0);
    expect(summary.costOnlyRecords).toBe(1);
    expect(summary.unknownRecords).toBe(1);
  });

  it('buckets value by module, maker, category and storage', () => {
    const summary = buildCollectionValuationSummary({ items, valuations, now });
    expect(summary.byModule[0]).toMatchObject({ label: 'pipekeeper', amount: 150, records: 1 });
    expect(summary.byMaker[0]).toMatchObject({ label: 'Dunhill', amount: 150 });
    expect(summary.byCategory[0].label).toBe('Billiard');
    expect(summary.byStorage[0].label).toBe('Rack 1');
  });

  it('lists records needing updated documentation', () => {
    const summary = buildCollectionValuationSummary({ items, valuations, now });
    const ids = summary.needingUpdate.map((row) => row.id);
    expect(ids).toContain('p2');
    expect(ids).not.toContain('p1');
  });

  it('counts insurance readiness as appraisal plus a supporting document', () => {
    const appraised = entry({ id: 'ap', kind: 'appraisal', amount: 700, documents: [{ id: 'd1', name: 'appraisal.pdf' }] });
    const summary = buildCollectionValuationSummary({ items: [item()], valuations: [appraised], now });
    expect(summary.appraisedRecords).toBe(1);
    expect(summary.insuranceReady).toBe(1);
    expect(summary.appraisalCoverage).toBe(100);
  });

  it('counts unconvertible entries without inflating the total', () => {
    const summary = buildCollectionValuationSummary({
      items: [item()],
      valuations: [entry({ kind: 'user_estimate', amount: 90, currency: 'EUR' })],
      now,
    });
    expect(summary.unconvertibleEntries).toBe(1);
    expect(summary.estimatedValue).toBe(0);
  });

  it('builds a value-over-time series that ignores cost-only points', () => {
    const series = buildValueOverTime([
      entry({ id: 'c1', kind: 'acquisition_cost', amount: 100, valuation_date: '2024-01-01' }),
      entry({ id: 'e1', kind: 'user_estimate', amount: 150, valuation_date: '2025-06-01' }),
    ]);
    expect(series.map((point) => point.date)).toEqual(['2024-01-01', '2025-06-01']);
    expect(series[0].total).toBe(0);
    expect(series[1].total).toBe(150);
  });

  it('carries the uncertainty disclosure', () => {
    const summary = buildCollectionValuationSummary({ items, valuations, now });
    expect(summary.disclosure).toBe(VALUATION_DISCLOSURE);
  });

  it('lists records whose headline is not documented', () => {
    const rows = listUnverifiedRecords(items, valuations);
    expect(rows.map((row) => row.id)).toContain('p1');
  });

  it('computes bucket shares', () => {
    const buckets = summariseBuckets([{ label: 'a', amount: 75 }, { label: 'b', amount: 25 }]);
    expect(buckets[0].sharePercent).toBe(75);
    expect(buckets[1].sharePercent).toBe(25);
  });
});

describe('module item mapping', () => {
  const input = {
    pipes: [{ id: 'pipe-1', name: 'Bill', maker: 'Dunhill', shape: 'Billiard', purchase_price: 250, purchase_date: '2020-05-01', storage_location_id: 'loc-1', photos: ['a.jpg'] }],
    blends: [{ id: 'blend-1', name: 'Nightcap', manufacturer: 'Dunhill', blend_type: 'English' }],
    cigars: [{ id: 'cigar-1', name: 'Serie V', brand: 'Oliva', vitola: 'Toro', humidor_id: 'hum-1' }],
    bottles: [{ id: 'bottle-1', name: 'Lagavulin 16', distillery: 'Lagavulin', type: 'Single Malt', storage_location_id: 'loc-2' }],
    wines: [{ id: 'wine-1', name: 'Barolo', producer: 'Gaja', style: 'red', quantity: 2 }],
    locations: [{ id: 'loc-1', name: 'Rack 1' }, { id: 'loc-2', name: 'Cabinet' }, { id: 'hum-1', name: 'Humidor A' }],
    valuations: [{ record_id: 'pipe-1' }],
  };

  it('maps every module onto one item shape', () => {
    const items = buildValuationItems(input);
    expect(items).toHaveLength(5);
    const pipe = items.find((row) => row.id === 'pipe-1');
    expect(pipe).toMatchObject({ moduleKey: 'pipekeeper', maker: 'Dunhill', category: 'Billiard', storageLocationName: 'Rack 1' });
    expect(pipe.purchaseDate).toBe('2020-05-01');
    expect(pipe.purchaseCost).toBe(250);
    expect(pipe.hasValuation).toBe(true);
    expect(pipe.documentationPercent).toBeGreaterThan(0);
    expect(pipe.missingDocumentation.length).toBeGreaterThan(0);

    expect(items.find((row) => row.id === 'cigar-1').storageLocationName).toBe('Humidor A');
    expect(items.find((row) => row.id === 'bottle-1').maker).toBe('Lagavulin');
    expect(items.find((row) => row.id === 'wine-1').category).toBe('red');
    expect(items.find((row) => row.id === 'blend-1').moduleKey).toBe('tobacco');
  });

  it('filters items for a drill-down', () => {
    const items = buildValuationItems(input);
    expect(filterItems(items, { moduleKey: 'winekeeper' })).toHaveLength(1);
    expect(filterItems(items, { maker: 'Gaja' })).toHaveLength(1);
    expect(filterItems(items, { storageLocationName: 'Rack 1' })).toHaveLength(1);
    expect(filterItems(items, { valuedOnly: true })).toHaveLength(1);
    expect(filterItems(items, {})).toHaveLength(5);
  });
});

describe('financial privacy', () => {
  it('denies financial disclosure by default', () => {
    expect(canExposeFinancials({})).toBe(false);
    expect(canExposeFinancials({ include_photos: true })).toBe(false);
    expect(shareDisclosesFinancials({ include_notes: true })).toBe(false);
  });

  it('allows it only on explicit authorization', () => {
    expect(canExposeFinancials({ include_financials: true })).toBe(true);
  });

  it('strips financial fields recursively', () => {
    const view = stripFinancialFields({
      name: 'Pipe A',
      purchase_price: 250,
      nested: { estimated_value: 400, condition: 'Good' },
      list: [{ amount: 10, label: 'x' }],
    });
    expect(view).toEqual({ name: 'Pipe A', nested: { condition: 'Good' }, list: [{ label: 'x' }] });
  });

  it('publishes documentation facts but not money', () => {
    const publicView = buildPublicValuationView(
      normaliseValuation(entry({ kind: 'appraisal', amount: 650, appraiser: 'J. Smith', documents: [{ id: 'd' }] }))
    );
    expect(publicView.verified).toBe(true);
    expect(publicView.appraiser_named).toBe(true);
    expect(publicView.amount).toBeUndefined();
    expect(publicView.amount_base).toBeUndefined();

    const authorized = buildPublicValuationView(normaliseValuation(entry({ amount: 650 })), { include_financials: true });
    expect(authorized.amount).toBe(650);
  });

  it('keeps the share selectors opt-in for values', () => {
    const selectors = read('src/components/share/shareFieldSelectors.jsx');
    expect(selectors).toContain('include_value');
    expect(selectors).not.toMatch(/estimated_value:\s*pipe\.estimated_value,/);
  });
});

describe('reports', () => {
  const items = [
    item({ photos: ['a.jpg'], documents: [{ id: 'd1' }], purchaseDate: '2020-05-01', purchaseSource: 'Estate sale' }),
    item({ id: 'p2', name: 'Pipe B', maker: 'Savinelli', photos: [], documents: [], hasValuation: false }),
  ];
  const valuations = [
    entry({ id: 'c1', kind: 'acquisition_cost', amount: 100 }),
    entry({ id: 'ap', kind: 'appraisal', amount: 700, documents: [{ id: 'd1' }] }),
  ];

  it('offers all eight reports', () => {
    expect(REPORT_CATALOG).toHaveLength(8);
    expect(REPORT_CATALOG.map((report) => report.id)).toEqual([
      'valuation_summary',
      'insurance_inventory',
      'photographic_inventory',
      'estate_inventory',
      'provenance_history',
      'acquisition_cost',
      'valuation_history',
      'documentation_completeness',
    ]);
  });

  it('builds every report with attribution, date and disclosures', () => {
    const models = buildAllValuationReports({ items, valuations });
    expect(models).toHaveLength(8);
    models.forEach((model) => {
      expect(model.title).toBeTruthy();
      expect(model.generatedAt).toBeTruthy();
      expect(model.attribution).toMatch(/own records/i);
      expect(model.columns.length).toBeGreaterThan(0);
      expect(model.totals.length).toBeGreaterThan(0);
      expect(model.disclosures.length).toBeGreaterThanOrEqual(2);
      expect(model.disclosures.join(' ')).toMatch(/not a verified market price/i);
      expect(model.disclosures.join(' ')).toMatch(/not market prices/i);
    });
  });

  it('rejects an unknown report id', () => {
    expect(() => buildValuationReport('nope')).toThrow(/Unknown valuation report/);
  });

  it('writes a CSV with the header row, totals and disclosures', () => {
    const csv = buildReportCsv(buildValuationReport('valuation_summary', { items, valuations }));
    expect(csv).toContain('Collection Valuation Summary');
    expect(csv).toContain('Record,Module');
    expect(csv).toContain('Total recorded acquisition cost');
    expect(csv).toContain('not a verified market price');
  });

  it('keeps the insurance report tied to appraisal evidence', () => {
    const model = buildValuationReport('insurance_inventory', { items, valuations });
    const row = model.rows.find((entry) => entry.item === 'Pipe A');
    expect(row.appraisal).toBe(700);
    expect(row.status).toBe('Appraisal on file');
    expect(model.rows.find((entry) => entry.item === 'Pipe B').status).toBe('No appraisal');
  });
});

describe('printable exports', () => {
  it('renders a report to a PDF document with pages', async () => {
    const { buildValuationReportPdf } = await import('../lib/valuation/valuationReportPdf.js');
    const model = buildValuationReport('valuation_summary', {
      items: [item(), item({ id: 'p2', name: 'Pipe B' })],
      valuations: [entry()],
    });
    const doc = buildValuationReportPdf(model);
    const output = doc.output();
    expect(output.startsWith('%PDF')).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(output.length).toBeGreaterThan(1000);
  });

  it('renders an empty report without throwing', async () => {
    const { buildValuationReportPdf } = await import('../lib/valuation/valuationReportPdf.js');
    const model = buildValuationReport('photographic_inventory', { items: [], valuations: [] });
    expect(() => buildValuationReportPdf(model)).not.toThrow();
  });
});

describe('product boundaries', () => {
  const sources = [
    read('src/lib/valuation/valuationCenter.js'),
    read('src/lib/valuation/valuationReports.js'),
    read('src/lib/valuation/valuationPrivacy.js'),
  ].join('\n');

  it('contains no purchasing, resale or investment machinery', () => {
    ['buy now', 'purchase recommendation', 'retailer', 'discount', 'resale value', 'investment projection', 'affiliate']
      .forEach((phrase) => expect(sources.toLowerCase()).not.toContain(phrase));
  });

  it('states the documentation-only purpose', () => {
    expect(sources).toMatch(/not market prices/i);
  });
});

describe('authorization', () => {
  it('protects valuation entries with row-level security', () => {
    const schema = JSON.parse(read('base44/entities/ValuationRecord.jsonc'));
    expect(schema.rls.read.$or).toBeTruthy();
    expect(schema.rls.create.created_by).toBe('{{user.email}}');
    expect(schema.rls.update.$or).toBeTruthy();
    expect(schema.rls.delete.$or).toBeTruthy();
  });

  it('scopes every valuation read to the signed-in collector', () => {
    const page = read('src/pages/ValuationCenter.jsx');
    const occurrences = (page.match(/created_by: email/g) || []).length;
    expect(occurrences).toBe(8);
  });
});

describe('mobile and layout safety', () => {
  it('uses touch-sized targets in the new surfaces', () => {
    const form = read('src/components/valuation/ValuationRecordForm.jsx');
    const ledger = read('src/components/valuation/ValuationLedger.jsx');
    expect(form).toContain('minHeight: 44');
    expect(form).toContain('maxHeight: \'92dvh\'');
    expect(ledger).toContain('minHeight: 40');
  });

  it('stacks dashboard grids on small screens', () => {
    const dashboard = read('src/components/valuation/ValuationDashboard.jsx');
    expect(dashboard).toContain('grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3');
  });

  it('wraps long record names instead of clipping them', () => {
    const ledger = read('src/components/valuation/ValuationLedger.jsx');
    expect(ledger).toContain('break-words');
  });
});