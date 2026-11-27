/* eslint-disable */
/**
 * PipeKeeper + tobacco cellar intelligence: guard-rails for the specialization
 * review, cellar maths and the new reports.
 *
 * These are logic-level tests (no JSX): they protect the behaviours the screens
 * rely on — that a specialization review explains alternatives with confidence
 * instead of quoting pairing scores, that cellar quantities never invent a
 * value, that every report row can be drilled into, and that specialization
 * questions and pairing questions stay separate.
 */
import { describe, it, expect } from 'vitest';

import {
  currentSpecializations,
  diffSpecializations,
  describeSpecializationChange,
  buildSpecializationActivity,
  specializationLabel,
} from '@/lib/collection/specialization';

import {
  cellaringMonths,
  formatCellaringDuration,
  packagingSummary,
  quantitySummary,
  reconcileBlendQuantities,
  recipeSummary,
  buildRecipeActivity,
} from '@/lib/collection/cellar';

import {
  buildSpecializationReview,
  pipeSessionEvidence,
  familyOf,
  reviewToPromptBlock,
} from '@/lib/curator/specializationReview';

import {
  buildSpecializationReport,
  buildCellarCompositionReport,
  buildPipeConditionReport,
  buildMakerSummaryReport,
  buildCompletenessReport,
  buildPipeCollectionReports,
  cellarAgeBuckets,
} from '@/lib/reports/pipeCollectionReports';

import { isPipeSpecializationQuery } from '@/lib/curator/curatorDeterministicChat.js';
import { classifyIntent } from '@/lib/curator/curatorChatIntent.js';

const pipe = (overrides = {}) => ({
  id: 'pipe-1',
  name: 'Savinelli 320',
  maker: 'Savinelli',
  shape: 'Author',
  bend: '1/2 Bent',
  bowl_material: 'Briar',
  finish: 'Smooth',
  chamber_volume: 'Medium',
  bowl_depth_mm: 40,
  bowl_diameter_mm: 20,
  weight_grams: 55,
  condition: 'Very Good',
  focus: ['English'],
  ...overrides,
});

const blend = (overrides = {}) => ({
  id: 'blend-1',
  name: 'Nightcap',
  blend_type: 'English',
  blend_family: 'English',
  ...overrides,
});

describe('specialization records', () => {
  it('reads current specializations from focus without duplicating', () => {
    expect(currentSpecializations({ focus: ['Virginia', 'virginia', 'Burley'] })).toEqual(['Virginia', 'Burley']);
    expect(currentSpecializations({ specialization: 'English' })).toEqual(['English']);
    expect(currentSpecializations({})).toEqual([]);
  });

  it('diffs additions and removals', () => {
    const diff = diffSpecializations(['English'], ['English', 'Virginia']);
    expect(diff.added).toEqual(['Virginia']);
    expect(diff.removed).toEqual([]);
  });

  it('writes a history entry only when something changed', () => {
    const unchanged = buildSpecializationActivity({ pipe: pipe(), previous: ['English'], next: ['English'] });
    expect(unchanged).toBeNull();

    const changed = buildSpecializationActivity({ pipe: pipe(), previous: ['English'], next: ['Virginia'] });
    expect(changed.record_entity).toBe('Pipe');
    expect(changed.event_type).toBe('specialization_changed');
    expect(changed.summary).toContain('Virginia');
    expect(changed.detail).toContain('English');
  });

  it('humanises stored values', () => {
    expect(specializationLabel('virginia_perique')).toBe('virginia perique');
    expect(describeSpecializationChange({ added: [], removed: [] })).toBe('Specialization unchanged');
  });
});

describe('cellar maths', () => {
  const now = new Date('2026-11-27T12:00:00Z');

  it('derives cellaring duration from the earliest recorded date', () => {
    const months = cellaringMonths({ cellar_start_date: '2025-05-27' }, now);
    expect(months).toBe(18);
    expect(formatCellaringDuration(months)).toBe('1 year 6 months');
    expect(formatCellaringDuration(0)).toBe('Less than a month');
    expect(cellaringMonths({}, now)).toBeNull();
  });

  it('summarises packaging without inventing a value', () => {
    expect(packagingSummary({}).label).toBeNull();
    const summary = packagingSummary({ packaging_type: 'jar', packaging_condition: 'opened' });
    expect(summary.label).toBe('Jar · Opened');
  });

  it('keeps open and cellared quantities separate', () => {
    const quantities = quantitySummary({ tin_total_quantity_oz: 12, tin_tins_cellared: 1, tin_size_oz: 2 });
    expect(quantities.totalOz).toBe(12);
    expect(quantities.cellaredOz).toBe(2);
    expect(quantities.openOz).toBe(10);
  });

  it('reports real quantity discrepancies and stays quiet otherwise', () => {
    expect(reconcileBlendQuantities({ tin_total_tins: 2, tin_size_oz: 2, tin_total_quantity_oz: 4 }).ok).toBe(true);

    const mismatch = reconcileBlendQuantities({ tin_total_tins: 2, tin_size_oz: 2, tin_total_quantity_oz: 9 });
    expect(mismatch.ok).toBe(false);
    expect(mismatch.discrepancies[0].field).toBe('tin_total_quantity_oz');

    const overCellared = reconcileBlendQuantities({ bulk_total_quantity_oz: 2, bulk_cellared: 5 });
    expect(overCellared.ok).toBe(false);
  });

  it('validates recipe proportions', () => {
    const complete = recipeSummary([{ component: 'Virginia', proportion: 60 }, { component: 'Perique', proportion: 40 }]);
    expect(complete.isComplete).toBe(true);
    expect(complete.components).toEqual(['Virginia', 'Perique']);

    const partial = recipeSummary([{ component: 'Virginia', proportion: 60 }]);
    expect(partial.isComplete).toBe(false);
    expect(partial.gap).toBe(40);
  });

  it('records a recipe revision only when the recipe changed', () => {
    const record = { id: 'blend-1', name: 'House Mix', created_by: 'a@b.com' };
    const recipe = [{ component: 'Virginia', proportion: 100 }];
    expect(buildRecipeActivity({ blend: record, previousRecipe: recipe, nextRecipe: recipe })).toBeNull();
    const activity = buildRecipeActivity({
      blend: record,
      previousRecipe: recipe,
      nextRecipe: [{ component: 'Virginia', proportion: 70 }, { component: 'Perique', proportion: 30 }],
    });
    expect(activity.event_type).toBe('recipe_revised');
  });
});

describe('specialization review (Curator)', () => {
  const logs = [
    { id: 'l1', pipe_id: 'pipe-1', blend_id: 'blend-1' },
    { id: 'l2', pipe_id: 'pipe-1', blend_id: 'blend-1' },
    { id: 'l3', pipe_id: 'pipe-1', blend_id: 'blend-2' },
  ];
  const blends = [blend(), blend({ id: 'blend-2', name: '965', blend_type: 'English', blend_family: 'English' }), blend({ id: 'blend-3', name: 'Capstan', blend_type: 'Virginia', blend_family: 'Virginia' })];

  it('maps blends to canonical families', () => {
    expect(familyOf({ blend_type: 'English Balkan' })).toBe('English/Balkan');
    expect(familyOf({ blend_type: 'Virginia/Perique' })).toBe('Virginia/Perique');
  });

  it('counts only sessions logged with that pipe', () => {
    const evidence = pipeSessionEvidence(pipe(), [...logs, { id: 'x', pipe_id: 'other', blend_id: 'blend-1' }], blends);
    expect(evidence.sessionCount).toBe(3);
    expect(evidence.dominantFamily).toBe('English');
  });

  it('explains alternatives with rationale and confidence, never pairing scores', () => {
    const review = buildSpecializationReview({ pipe: pipe({ focus: [] }), smokingLogs: logs, blends });
    expect(review.alternatives.length).toBeGreaterThan(1);
    expect(review.alternatives[0].classification).toBe('English');
    expect(review.alternatives[0].confidence).toBe('medium');
    expect(review.alternatives[0].rationale).toMatch(/sessions/i);
    expect(review.pairingScoresUsed).toBe(false);
    expect(JSON.stringify(review)).not.toMatch(/score["':\s]+\d/i);
  });

  it('only proposes a change when session evidence supports it', () => {
    const supported = buildSpecializationReview({ pipe: pipe({ focus: ['Virginia'] }), smokingLogs: logs, blends });
    expect(supported.proposed).toEqual({ focus: ['English'], confidence: 'medium' });

    const noEvidence = buildSpecializationReview({ pipe: pipe({ focus: [] }), smokingLogs: [], blends });
    expect(noEvidence.proposed).toBeNull();
    expect(noEvidence.alternatives.every((alt) => alt.confidence === 'low')).toBe(true);
  });

  it('does not propose the specialization the pipe already has', () => {
    const review = buildSpecializationReview({ pipe: pipe({ focus: ['English'] }), smokingLogs: logs, blends });
    expect(review.proposed).toBeNull();
  });

  it('grounds the prompt and forbids score talk', () => {
    const review = buildSpecializationReview({ pipe: pipe(), smokingLogs: logs, blends });
    const block = reviewToPromptBlock(review);
    expect(block).toContain('SPECIALIZATION REVIEW');
    expect(block).toContain('confidence');
    expect(block).toContain('Do not describe these as pairing scores');
  });
});

describe('specialization vs pairing intent', () => {
  it('recognises specialization questions', () => {
    expect(isPipeSpecializationQuery('Review the specialization on my Savinelli')).toBe(true);
    expect(isPipeSpecializationQuery('Should I reassign this pipe?')).toBe(true);
  });

  it('does not treat a pairing question as a specialization question', () => {
    expect(isPipeSpecializationQuery('Which blend pairs best with this pipe?')).toBe(false);
    expect(isPipeSpecializationQuery('Show my pairing scores')).toBe(false);
  });

  it('classifies the two questions differently', () => {
    expect(classifyIntent('Which blend pairs best with this pipe?')).not.toBe('PIPE_REASSIGNMENT_ANALYSIS');
    expect(classifyIntent('Should I reassign this pipe to Virginia?')).toBe('PIPE_REASSIGNMENT_ANALYSIS');
  });
});

describe('PipeKeeper and cellar reports', () => {
  const pipes = [
    pipe(),
    pipe({ id: 'pipe-2', name: 'Dunhill Shell', maker: 'Dunhill', focus: ['Virginia'], condition: '' }),
    pipe({ id: 'pipe-3', name: 'Unmarked Billiard', maker: '', focus: [], condition: 'Good' }),
  ];
  const blends = [
    blend(),
    blend({ id: 'blend-3', name: 'Capstan', blend_family: 'Virginia', packaging_type: 'sealed_tin', storage_location_id: 'loc-1' }),
  ];
  const locations = [{ id: 'loc-1', name: 'Cellar Cabinet' }];

  it('groups the specialization report and lists unclassified pipes', () => {
    const report = buildSpecializationReport(pipes);
    expect(report.summary.find((row) => row.label === 'Unclassified').value).toBe(1);
    expect(report.gaps[0].records[0].name).toBe('Unmarked Billiard');
    expect(report.table.rows[0].records[0].href).toContain('/PipeDetail?id=');
  });

  it('builds cellar composition with storage and packaging breakdowns', () => {
    const report = buildCellarCompositionReport(blends, locations);
    const storage = report.tables.find((table) => table.title === 'By storage location');
    expect(storage.rows.some((row) => row.label === 'Cellar Cabinet')).toBe(true);
    expect(report.gaps[0].label).toMatch(/cellaring date/i);
  });

  it('reports condition and maintenance', () => {
    const report = buildPipeConditionReport(pipes, [{ pipe_id: 'pipe-1', date: '2026-01-01' }]);
    expect(report.summary.find((row) => row.label === 'With maintenance history').value).toBe(1);
    expect(report.gaps[0].records.length).toBe(1);
  });

  it('summarises makers and documentation completeness', () => {
    const makers = buildMakerSummaryReport(pipes);
    expect(makers.summary.find((row) => row.label === 'Makers').value).toBeGreaterThan(1);

    const completeness = buildCompletenessReport({ pipes, blends });
    expect(completeness.summary.find((row) => row.label === 'Records').value).toBe(pipes.length + blends.length);
    expect(completeness.tables[0].rows.length).toBeGreaterThan(0);
  });

  it('returns every report from the shared builder', () => {
    const reports = buildPipeCollectionReports({ pipes, blends, locations });
    expect(reports.map((report) => report.key)).toEqual(['specialization', 'cellar', 'condition', 'makers', 'completeness']);
  });

  it('buckets cellar age and keeps records for drill-down', () => {
    const buckets = cellarAgeBuckets([{ id: 'b1', name: 'Old Tin', cellar_start_date: '2021-01-01' }], new Date('2026-11-27'));
    const oldest = buckets.find((bucket) => bucket.label === '5 years or more');
    expect(oldest.value).toBe(1);
    expect(oldest.records[0].href).toContain('/TobaccoDetail?id=');
  });

  it('keeps reports descriptive — no consumption or purchasing guidance', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync('src/lib/reports/pipeCollectionReports.js', 'utf8'));
    expect(source).not.toMatch(/\b(restock|buy|purchase now|discount|retailer|recommend buying)\b/i);
  });
});