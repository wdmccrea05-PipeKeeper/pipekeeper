import { describe, it, expect } from 'vitest';
import { buildCollectionReport } from '@/lib/reports/pairingInsightsEngine';
import { buildCollectionReportCsv } from '@/lib/reports/collectionReportCsv';
import { createCollectionReportPdf } from '@/lib/reports/collectionReportPdf';

const pipes = [
  {
    id: 'p1', name: 'Billiard A', maker: 'Savinelli', shape: 'Billiard', bowl_material: 'Briar',
    focus: ['Aromatic'], bowl_diameter_mm: 19, bowl_depth_mm: 38, photos: [],
  },
  {
    id: 'p2', name: 'Dublin B', maker: 'Peterson', shape: 'Dublin', bowl_material: 'Briar',
    focus: ['English'], bowl_diameter_mm: 20, bowl_depth_mm: 40, photos: [],
  },
];

const blends = [
  { id: 'b1', name: 'Vanilla Cream', blend_type: 'Aromatic', is_aromatic: true, aromatic_intensity: 'medium', cut: 'Ribbon', strength: 'Mild', tobacco_components: ['Black Cavendish', 'Virginia'] },
  { id: 'b2', name: 'Nightcap', blend_type: 'English', is_aromatic: false, cut: 'Ribbon', strength: 'Full', tobacco_components: ['Latakia', 'Virginia', 'Perique'] },
  { id: 'b3', name: 'Orlik Golden', blend_type: 'Virginia', is_aromatic: false, cut: 'Flake', strength: 'Medium', tobacco_components: ['Virginia'] },
];

const bottles = [{ id: 'w1', name: 'Lagavulin 16', distillery: 'Lagavulin', type: 'Single Malt', region: 'Islay', abv: 43, rating: 4.5 }];
const wines = [{ id: 'v1', name: 'Barolo 2016', producer: 'Gaja', vintage: 2016, varietal: 'Nebbiolo', style: 'red', quantity: 2, drink_window_start: '2024-01-01', drink_window_end: '2030-01-01' }];
const cigars = [{ id: 'c1', name: 'Serie V', brand: 'Oliva', vitola: 'Toro', body: 'full', strength: 'full', rating: 4.2, quantity: 4 }];

const data = {
  pipes, blends, bottles, wines, cigars,
  smokingLogs: [{ id: 's1', pipe_id: 'p1', blend_id: 'b1', date: '2025-01-10', bowls_used: 2, rating: 4 }],
  tastingLogs: [{ id: 't1', bottle_id: 'w1', tasting_date: '2025-02-01', rating: 5 }],
  cigarSessions: [{ id: 'cs1', cigar_id: 'c1', date: '2025-03-01', rating: 4 }],
  wineTastings: [{ id: 'wt1', wine_id: 'v1', date: '2025-04-01', rating: 4.5 }],
  userProfile: null,
};

describe('collection report engine', () => {
  const report = buildCollectionReport({
    data,
    options: {
      modules: { pipe: true, whiskey: true, cigar: true, wine: true },
      blendsPerPipe: 5,
      includePhotos: true,
      includeExplanations: true,
    },
  });

  it('builds a pairing row per pipe with capped matches', () => {
    expect(report.pairingChart).toHaveLength(2);
    report.pairingChart.forEach((row) => {
      expect(row.matches.length).toBeLessThanOrEqual(5);
      expect(row.specialization).toBeTruthy();
      expect(typeof row.topScore).toBe('number');
    });
  });

  it('produces top match groups for every selected module', () => {
    const keys = report.topMatches.map((g) => g.key);
    expect(keys).toEqual(['combinations', 'pipe', 'blend', 'whiskey', 'wine', 'cigar']);
    report.topMatches.forEach((group) => expect(group.entries.length).toBeGreaterThan(0));
  });

  it('produces complementary suggestions including cross-module ideas', () => {
    expect(report.complementary.length).toBeGreaterThan(0);
    expect(report.complementary.some((g) => g.key === 'sessions')).toBe(true);
  });


  it('applies pipe and specialization filters to exported rows', () => {
    const filtered = buildCollectionReport({ data, options: { modules: { pipe: true }, pipeId: 'p1', specialization: 'Aromatic' } });
    expect(filtered.pairingChart.map((row) => row.pipeId)).toEqual(['p1']);
    expect(buildCollectionReportCsv(filtered)).not.toContain('Dublin B');
  });

  it('keeps cross-module suggestions unique and does not invent scores', () => {
    const group = report.topMatches.find((entry) => entry.key === 'combinations');
    expect(group.entries.length).toBeLessThanOrEqual(10);
    expect(new Set(group.entries.map((entry) => entry.name)).size).toBe(group.entries.length);
    expect(group.entries.every((entry) => entry.score === null)).toBe(true);
    expect(JSON.stringify(report.complementary)).not.toContain('Adding a matching blend');
  });

  it('escapes CSV names and protects spreadsheet formula cells', () => {
    const csv = buildCollectionReportCsv({ pairingChart: [{ name: '=SUM(1,2)', specialization: 'A "quoted" focus', matches: [] }] });
    expect(csv).toContain("'=SUM(1,2)");
    expect(csv).toContain('A ""quoted"" focus');
  });

  it('respects module filters', () => {
    const pipeOnly = buildCollectionReport({
      data,
      options: { modules: { pipe: true }, blendsPerPipe: 3 },
    });
    expect(pipeOnly.topMatches.map((g) => g.key)).toEqual(['pipe', 'blend']);
    expect(pipeOnly.summary.bottles).toBe(0);
    expect(pipeOnly.pairingChart[0].matches.length).toBeLessThanOrEqual(3);
  });

  it('serialises to csv with all sections', () => {
    const csv = buildCollectionReportCsv(report);
    expect(csv).toContain('Pipe Pairing Chart');
    expect(csv).toContain('Top Matches');
    expect(csv).toContain('Complementary');
    expect(csv.split('\r\n').length).toBeGreaterThan(10);
  });

  it('renders a multi-page pdf without photos', async () => {
    const doc = await createCollectionReportPdf({ ...report, includePhotos: false });
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(2000);
  });
});