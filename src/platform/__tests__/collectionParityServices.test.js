import { describe, expect, it, vi } from 'vitest';

const aggregateFixture = {
  pipes: { count: 2, value: 250, favorite: 1, avgRating: 4.25 },
  tobacco: { count: 1, value: 80, favorite: 1, avgRating: 4 },
  whiskey: { count: 1, value: 1000, favorite: 1, avgRating: 5 },
  cigar: { count: 1, value: 20, favorite: 1, avgRating: 3 },
  wine: { count: 1, value: 60, favorite: 1, avgRating: 4 },
  total: { items: 6, value: 1410 },
};

vi.mock('@/components/keeper-core/aggregation/collectionAggregation', () => ({
  aggregateCollection: vi.fn(async () => aggregateFixture),
}));

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      Pipe: { filter: vi.fn().mockResolvedValue([{ name: 'Pipe A', estimated_value: 999 }]) },
      TobaccoBlend: { filter: vi.fn().mockResolvedValue([{ name: 'Blend A', estimated_value: 999 }]) },
      Bottle: { filter: vi.fn().mockResolvedValue([{ name: 'Bottle A', estimated_value: 999, rating: 5 }]) },
      Cigar: { filter: vi.fn().mockResolvedValue([{ name: 'Cigar A', estimated_value: 999 }]) },
      Wine: { filter: vi.fn().mockResolvedValue([{ name: 'Wine A', estimated_value: 999 }]) },
    },
  },
}));

import { getCollectionStats } from '../aiDataLayer';
import { generateCollectionReport } from '../exportEngine';
import { calculateCollectionValue } from '../collectionEngine';

describe('collection parity service delegation', () => {
  it('aiDataLayer.getCollectionStats reuses aggregateCollection totals', async () => {
    const stats = await getCollectionStats('user@example.com', 'pipekeeper');

    expect(stats).toEqual({
      moduleId: 'pipekeeper',
      itemCount: 2,
      totalValue: 250,
      averageValue: 125,
      favoriteCount: 1,
      averageRating: 4.25,
    });
  });

  it('exportEngine.generateCollectionReport uses canonical summary totals', async () => {
    const report = await generateCollectionReport('user@example.com');

    expect(report.summary.totalItems).toBe(5);
    expect(report.summary.totalValue).toBe(1330);
    expect(report.modules.pipekeeper.totalValue).toBe(250);
    expect(report.modules.whiskeykeeper.totalValue).toBe(1000);
  });

  it('collectionEngine.calculateCollectionValue delegates to aggregateCollection', async () => {
    const totals = await calculateCollectionValue('user@example.com', 'whiskeykeeper');

    expect(totals.total).toBe(1000);
    expect(totals.breakdown.whiskeykeeper).toEqual({
      count: 1,
      value: 1000,
    });
  });
});
