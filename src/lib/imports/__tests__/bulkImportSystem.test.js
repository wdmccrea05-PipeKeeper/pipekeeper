import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

const mockBase44 = {
  entities: {
    Pipe: { filter: vi.fn(), create: vi.fn() },
    TobaccoBlend: { filter: vi.fn(), create: vi.fn() },
    Bottle: { filter: vi.fn(), create: vi.fn() },
    Cigar: { filter: vi.fn(), create: vi.fn() },
    HumidorLocation: { filter: vi.fn() },
  },
};

const mockScoped = {
  Pipe: { create: vi.fn() },
  TobaccoBlend: { create: vi.fn() },
};

vi.mock('@/api/base44Client', () => ({ base44: mockBase44 }));
vi.mock('@/components/api/scopedEntities', () => ({ scopedEntities: mockScoped }));

let parseCsvText;
let analyzeImportRows;
let executeImportRows;
let importDefinitions;

beforeAll(async () => {
  ({ parseCsvText } = await import('../csvImportUtils'));
  ({ analyzeImportRows, executeImportRows, importDefinitions } = await import('../importDefinitions'));
});

describe('bulk import system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBase44.entities.Pipe.filter.mockResolvedValue([]);
    mockBase44.entities.TobaccoBlend.filter.mockResolvedValue([]);
    mockBase44.entities.Bottle.filter.mockResolvedValue([]);
    mockBase44.entities.Cigar.filter.mockResolvedValue([]);
    mockBase44.entities.HumidorLocation.filter.mockResolvedValue([]);
    mockScoped.Pipe.create.mockResolvedValue({ id: 'p1' });
    mockScoped.TobaccoBlend.create.mockResolvedValue({ id: 'b1' });
    mockBase44.entities.Bottle.create.mockResolvedValue({ id: 'w1' });
    mockBase44.entities.Cigar.create.mockResolvedValue({ id: 'c1' });
  });

  test('parses quoted CSV and detects duplicate headers', () => {
    const parsed = parseCsvText('maker,maker,shape\n"Peterson, Ltd",Peterson,Billiard\n');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].values[0]).toBe('Peterson, Ltd');
    expect(parsed.duplicateHeaders).toEqual(['maker']);
  });

  test('analyzes rows for pipes with warnings and errors', async () => {
    const definition = importDefinitions.pipekeeper_pipes;
    const parsed = parseCsvText('maker,shape,purchase_price,favorite\nPeterson,Billiard,120,yes\n,Billiard,abc,maybe\n');
    const analysis = await analyzeImportRows({
      definition,
      headers: parsed.headers,
      rawHeaders: parsed.rawHeaders,
      rows: parsed.rows,
      duplicateHeaders: parsed.duplicateHeaders,
      parseErrors: parsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(analysis.totalRows).toBe(2);
    expect(analysis.counts.valid + analysis.counts.warning).toBe(1);
    expect(analysis.counts.error).toBe(1);
  });

  test('supports duplicate detection and skip mode', async () => {
    const definition = importDefinitions.whiskeykeeper_bottles;
    mockBase44.entities.Bottle.filter.mockResolvedValueOnce([
      { distillery: 'Lagavulin', name: '16 Year', bottle_size: '750ml', purchase_date: '2025-03-01' },
    ]);

    const parsed = parseCsvText(
      'brand,expression,distillery,bottle_size,acquisition_date,purchase_price\nLagavulin,16 Year,Lagavulin,750ml,2025-03-01,99\n'
    );
    const analysis = await analyzeImportRows({
      definition,
      headers: parsed.headers,
      rawHeaders: parsed.rawHeaders,
      rows: parsed.rows,
      duplicateHeaders: parsed.duplicateHeaders,
      parseErrors: parsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(analysis.rows[0].duplicateState).toBe('existing');

    const result = await executeImportRows({
      definition,
      analyzedRows: analysis.rows,
      duplicateMode: 'skip_duplicates',
    });

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
  });

  test('resolves humidor by exact name for cigar imports', async () => {
    const definition = importDefinitions.cigarkeeper_cigars;
    mockBase44.entities.HumidorLocation.filter.mockResolvedValueOnce([
      { id: 'hum-1', name: 'Main Humidor' },
    ]);

    const parsed = parseCsvText(
      'brand,line,vitola,package_type,cigars_per_package,current_quantity,purchase_date,humidor_name\nOliva,Serie V,Robusto,box,20,1,2025-02-20,Main Humidor\n'
    );
    const analysis = await analyzeImportRows({
      definition,
      headers: parsed.headers,
      rawHeaders: parsed.rawHeaders,
      rows: parsed.rows,
      duplicateHeaders: parsed.duplicateHeaders,
      parseErrors: parsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(analysis.rows[0].payload.humidor_id).toBe('hum-1');
  });
});
