import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = {
  Pipe: [
    { id: 'pipe-1', estimated_value: 100, rating: 4, is_favorite: true, purchase_date: '2024-01-01' },
    { id: 'pipe-2', collector_value: 150, rating: 4.5, purchase_date: '2024-02-01' },
    { id: 'pipe-archived', archived: true, estimated_value: 999, rating: 5, purchase_date: '2023-01-01' },
  ],
  TobaccoBlend: [
    {
      id: 'blend-1',
      estimated_total_value: 80,
      rating: 4,
      is_favorite: true,
      tin_tins_open: 1,
      tin_tins_cellared: 2,
      tin_size_oz: 2,
      bulk_cellared: 3,
    },
    { id: 'blend-deleted', deleted: true, estimated_total_value: 500, rating: 5 },
  ],
  Bottle: [
    { id: 'bottle-1', manual_value_override: 500, rating: 5, favorite: true, purchase_date: '2024-03-01', name: 'Override Bottle' },
    { id: 'bottle-archived', archived: true, collector_value: 900, rating: 1, purchase_date: '2023-02-01', name: 'Archived Bottle' },
  ],
  WhiskeyInventoryUnit: [
    { id: 'unit-1', bottle_id: 'bottle-1', status: 'open' },
    { id: 'unit-2', bottle_id: 'bottle-1', status: 'reserve' },
    { id: 'unit-archived', bottle_id: 'bottle-1', status: 'reserve', archived: true },
  ],
  TastingLog: [
    { id: 'taste-1', bottle_id: 'bottle-1', rating: 5, tasting_date: '2024-04-10' },
  ],
  Cigar: [
    { id: 'cigar-1', singles_equivalent: 4, estimated_unit_value: 5, rating: 3, is_favorite: true },
    { id: 'cigar-retired', retired: true, singles_equivalent: 10, estimated_unit_value: 50, rating: 5 },
  ],
  CigarSession: [
    { id: 'session-1', cigar_id: 'cigar-1', date: '2024-05-01' },
  ],
  HumidorLocation: [
    { id: 'hum-1', name: 'Main Humidor' },
  ],
  Wine: [
    { id: 'wine-1', quantity: 2, estimated_unit_value: 30, rating: 4, is_favorite: true, name: 'Estate Red', vintage: 2020 },
    { id: 'wine-hidden', hidden: true, quantity: 3, estimated_unit_value: 100, rating: 5, name: 'Hidden Wine', vintage: 2018 },
  ],
  WineTasting: [
    { id: 'wine-taste-1', wine_id: 'wine-1', rating: 4, date: '2024-06-01' },
  ],
};

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      User: { filter: vi.fn().mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]) },
      UserProfile: { filter: vi.fn().mockResolvedValue([]) },
      Pipe: { __entityName: 'Pipe' },
      TobaccoBlend: { __entityName: 'TobaccoBlend' },
      Bottle: { __entityName: 'Bottle' },
      SmokingLog: { __entityName: 'SmokingLog' },
      TastingLog: { __entityName: 'TastingLog' },
      WhiskeyInventoryUnit: { __entityName: 'WhiskeyInventoryUnit' },
      Cigar: { __entityName: 'Cigar' },
      CigarSession: { __entityName: 'CigarSession' },
      HumidorLocation: { __entityName: 'HumidorLocation' },
      Wine: { __entityName: 'Wine' },
      WineTasting: { __entityName: 'WineTasting' },
    },
  },
}));

vi.mock('@/components/utils/moduleReleaseState', () => ({
  shouldFetchModuleData: vi.fn(() => true),
}));

vi.mock('@/lib/base44/fetchAllEntities', () => ({
  fetchAllEntities: vi.fn(async (entity) => fixtures[entity.__entityName] || []),
}));

import { aggregateCollection } from '../collectionAggregation';

describe('aggregateCollection parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes inactive lifecycle states and keeps unrounded canonical ratings', async () => {
    const agg = await aggregateCollection('user@example.com');

    expect(agg.pipes.count).toBe(2);
    expect(agg.pipes.value).toBe(250);
    expect(agg.pipes.avgRating).toBeCloseTo(4.25, 10);

    expect(agg.tobacco.count).toBe(1);
    expect(agg.tobacco.value).toBe(80);
    expect(agg.tobacco.cellared).toBe(7);

    expect(agg.whiskey.count).toBe(1);
    expect(agg.whiskey.totalBottles).toBe(2);
    expect(agg.whiskey.open).toBe(1);
    expect(agg.whiskey.sealed).toBe(1);
    expect(agg.whiskey.value).toBe(1000);
    expect(agg.whiskey.avgRating).toBe(5);

    expect(agg.cigar.count).toBe(1);
    expect(agg.cigar.value).toBe(20);

    expect(agg.wine.count).toBe(1);
    expect(agg.wine.value).toBe(60);
    expect(agg.wine.avgRating).toBe(4);

    expect(agg.total.items).toBe(6);
    expect(agg.total.value).toBe(1410);
    expect(agg.highlights.mostValuedBottle?.name).toBe('Override Bottle');
    expect(agg.highlights.mostValuableItem?.recordType).toBe('bottle');
  });
});
