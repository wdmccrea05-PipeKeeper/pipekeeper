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

  test('supports legacy alias headers across import types', async () => {
    const whiskeyDefinition = importDefinitions.whiskeykeeper_bottles;
    const whiskeyParsed = parseCsvText(
      'brand,name,bottle size,purchase date,purchase price,vendor,qty\nLagavulin,16 Year,750ml,2025-03-01,99.99,Retail store,1\n'
    );
    const whiskeyAnalysis = await analyzeImportRows({
      definition: whiskeyDefinition,
      headers: whiskeyParsed.headers,
      rawHeaders: whiskeyParsed.rawHeaders,
      rows: whiskeyParsed.rows,
      duplicateHeaders: whiskeyParsed.duplicateHeaders,
      parseErrors: whiskeyParsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(whiskeyAnalysis.rows[0].status).not.toBe('error');
    expect(whiskeyAnalysis.rows[0].payload.name).toBe('16 Year');
    expect(whiskeyAnalysis.rows[0].payload.purchase_date).toBe('2025-03-01');
    expect(whiskeyAnalysis.rows[0].payload.purchase_location).toBe('Retail store');

    const blendDefinition = importDefinitions.pipekeeper_blends;
    const blendParsed = parseCsvText(
      'blender,name,blend type,package type,qty,purchase date,purchase price\nCornell & Diehl,Autumn Evening,Aromatic,tin,4,2025-02-10,14.99\n'
    );
    const blendAnalysis = await analyzeImportRows({
      definition: blendDefinition,
      headers: blendParsed.headers,
      rawHeaders: blendParsed.rawHeaders,
      rows: blendParsed.rows,
      duplicateHeaders: blendParsed.duplicateHeaders,
      parseErrors: blendParsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(blendAnalysis.rows[0].status).not.toBe('error');
    expect(blendAnalysis.rows[0].payload.name).toBe('Autumn Evening');

    const cigarDefinition = importDefinitions.cigarkeeper_cigars;
    const cigarParsed = parseCsvText(
      'brand,line,unit type,quantity,cigars per package,purchase date,purchase price,body,strength,production status\nOliva,Serie V,box,1,20,2025-02-20,145,medium-full,medium-full,regular production\n'
    );
    const cigarAnalysis = await analyzeImportRows({
      definition: cigarDefinition,
      headers: cigarParsed.headers,
      rawHeaders: cigarParsed.rawHeaders,
      rows: cigarParsed.rows,
      duplicateHeaders: cigarParsed.duplicateHeaders,
      parseErrors: cigarParsed.parseErrors,
      userEmail: 'user@example.com',
    });

    expect(cigarAnalysis.rows[0].status).not.toBe('error');
    expect(cigarAnalysis.rows[0].payload.unit_type).toBe('box');
    expect(cigarAnalysis.rows[0].payload.quantity).toBe(1);
  });

  test('allows cigar rows with brand + vitola when line is missing', async () => {
    const definition = importDefinitions.cigarkeeper_cigars;
    const parsed = parseCsvText(
      'brand,vitola,package_type,cigars_per_package,current_quantity,purchase_date,purchase_price,body,strength,production_status\nOliva,Robusto,box,20,1,2025-02-20,145,medium_full,medium_full,regular_production\n'
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

    expect(analysis.rows[0].errors).toHaveLength(0);
    expect(analysis.rows[0].payload.vitola).toBe('Robusto');
  });

  test('blocks cigar rows that omit both line and vitola', async () => {
    const definition = importDefinitions.cigarkeeper_cigars;
    const parsed = parseCsvText(
      'brand,package_type,cigars_per_package,current_quantity,purchase_date,purchase_price,body,strength,production_status\nOliva,box,20,1,2025-02-20,145,medium_full,medium_full,regular_production\n'
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

    expect(analysis.rows[0].status).toBe('error');
    expect(analysis.rows[0].errors).toContain('line or vitola is required');
  });

  test('imports happy-path rows for all four supported live import types', async () => {
    const fixtures = [
      {
        def: importDefinitions.pipekeeper_pipes,
        csv: 'maker,shape,purchase_date,purchase_price\nPeterson,Billiard,2025-01-15,120\n',
        createSpy: mockScoped.Pipe.create,
      },
      {
        def: importDefinitions.pipekeeper_blends,
        csv: 'manufacturer,blend_name,package_type,quantity,purchase_date,purchase_price\nCornell & Diehl,Autumn Evening,tin,2,2025-02-10,14.99\n',
        createSpy: mockScoped.TobaccoBlend.create,
      },
      {
        def: importDefinitions.whiskeykeeper_bottles,
        csv: 'brand,expression,distillery,bottle_size,acquisition_date,purchase_price\nLagavulin,16 Year,Lagavulin,750ml,2025-03-01,99\n',
        createSpy: mockBase44.entities.Bottle.create,
      },
      {
        def: importDefinitions.cigarkeeper_cigars,
        csv: 'brand,line,vitola,package_type,cigars_per_package,current_quantity,purchase_date,purchase_price,body,strength,production_status\nOliva,Serie V,Robusto,box,20,1,2025-02-20,145,medium_full,medium_full,regular_production\n',
        createSpy: mockBase44.entities.Cigar.create,
      },
    ];

    for (const { def, csv, createSpy } of fixtures) {
      const parsed = parseCsvText(csv);
      const analysis = await analyzeImportRows({
        definition: def,
        headers: parsed.headers,
        rawHeaders: parsed.rawHeaders,
        rows: parsed.rows,
        duplicateHeaders: parsed.duplicateHeaders,
        parseErrors: parsed.parseErrors,
        userEmail: 'user@example.com',
      });
      const result = await executeImportRows({
        definition: def,
        analyzedRows: analysis.rows,
        duplicateMode: 'create_only',
      });

      expect(result.failed).toBe(0);
      expect(result.imported).toBe(1);
      expect(createSpy).toHaveBeenCalled();
    }
  });

  test('mixed import analysis separates valid, warning, and blocked rows', async () => {
    const definition = importDefinitions.pipekeeper_pipes;
    mockBase44.entities.Pipe.filter.mockResolvedValueOnce([
      {
        maker: 'Peterson',
        name: 'Peterson Billiard',
        shape: 'Billiard',
        finish: 'Smooth',
        purchase_date: '2025-01-15',
      },
    ]);

    const parsed = parseCsvText(
      'maker,shape,purchase_date,purchase_price,favorite\nPeterson,Billiard,2025-01-15,120,yes\nSavinelli,Author,2025-01-16,95,\n,Billiard,2025-01-17,not-a-number,yes\n'
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

    expect(analysis.totalRows).toBe(3);
    expect(analysis.counts.warning).toBeGreaterThan(0);
    expect(analysis.counts.error).toBe(1);
    expect(analysis.rows.some((r) => r.status === 'valid' || r.status === 'warning')).toBe(true);
    expect(analysis.rows.some((r) => r.status === 'error')).toBe(true);
  });
});
