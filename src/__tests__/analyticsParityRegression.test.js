/* eslint-disable */
import { describe, it, expect, vi } from 'vitest';

/**
 * Analytics Parity Regression Tests
 *
 * Validates that analytics/insights computed from fetchAllEntities
 * produce the same results as the previous approach — but without
 * truncation. This ensures that switching from filter() to
 * fetchAllEntities doesn't change computed metrics for collections
 * that fit within a single page, while correctly extending to
 * multi-page collections.
 *
 * Key invariant: for collections <= page size, fetchAllEntities and
 * filter() return identical results. For collections > page size,
 * fetchAllEntities returns the complete dataset while filter()
 * truncates.
 */

import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';

function createMockEntity(records, pageSize = 50) {
  const allRecords = records.map((r, i) => ({
    id: `id_${i}`,
    ...r,
    created_date: r.created_date || new Date(Date.now() - i * 1000).toISOString(),
  }));

  return {
    filter: vi.fn(async (filterObj, sortOrder, limit = pageSize, skip = 0) => {
      return allRecords.slice(skip, skip + limit);
    }),
  };
}

describe('Analytics Parity — Small Collection (within single page)', () => {
  it('produces identical count for 10-item collection', async () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      name: `Pipe ${i}`,
      estimated_value: 100 + i * 10,
    }));
    const entity = createMockEntity(records);

    const oldResult = await entity.filter({ created_by: 'u@t.com' }, '-created_date', 50, 0);
    entity.filter.mockClear();
    const newResult = await fetchAllEntities(entity, { created_by: 'u@t.com' }, '-created_date', 5000, 200, 'analytics:small');

    expect(newResult.length).toBe(oldResult.length);
    expect(newResult.length).toBe(10);
  });

  it('produces identical sum for 25-item collection', async () => {
    const records = Array.from({ length: 25 }, (_, i) => ({
      name: `Bottle ${i}`,
      estimated_value: 50 + i * 5,
    }));
    const entity = createMockEntity(records);

    const oldResult = await entity.filter({ created_by: 'u@t.com' }, '-created_date', 50, 0);
    entity.filter.mockClear();
    const newResult = await fetchAllEntities(entity, { created_by: 'u@t.com' }, '-created_date', 5000, 200, 'analytics:sum25');

    const oldSum = oldResult.reduce((s, r) => s + r.estimated_value, 0);
    const newSum = newResult.reduce((s, r) => s + r.estimated_value, 0);

    expect(newSum).toBe(oldSum);
    expect(newSum).toBe(25 * 50 + (25 * 24 / 2) * 5); // 1250 + 1500 = 2750
  });
});

describe('Analytics Parity — Large Collection (multi-page)', () => {
  it('fetchAllEntities captures all 600 records while filter() truncates', async () => {
    const records = Array.from({ length: 600 }, (_, i) => ({
      name: `Item ${i}`,
      rating: (i % 5) + 1,
    }));
    const entity = createMockEntity(records);

    // Old approach: single filter() call — truncated at default page size
    const oldResult = await entity.filter({ created_by: 'u@t.com' }, '-created_date', 50, 0);
    entity.filter.mockClear();

    // New approach: fetchAllEntities — paginated
    const newResult = await fetchAllEntities(entity, { created_by: 'u@t.com' }, '-created_date', 5000, 200, 'analytics:large');

    // Old approach truncated
    expect(oldResult.length).toBe(50);

    // New approach complete
    expect(newResult.length).toBe(600);
  });

  it('average rating is computed correctly over full dataset', async () => {
    // 600 items with ratings 1-5 cycling
    const records = Array.from({ length: 600 }, (_, i) => ({
      name: `Item ${i}`,
      rating: (i % 5) + 1,
    }));
    const entity = createMockEntity(records);

    const fullResult = await fetchAllEntities(entity, { created_by: 'u@t.com' }, '-created_date', 5000, 200, 'analytics:avg');

    // Average of 1,2,3,4,5 cycling = 3.0
    const avg = fullResult.reduce((s, r) => s + r.rating, 0) / fullResult.length;
    expect(avg).toBeCloseTo(3.0, 1);

    // If we had used the truncated 50-record approach:
    // 50 items with ratings 1-5 cycling → avg also 3.0 in this case
    // But the count would be wrong (50 vs 600)
    expect(fullResult.length).toBe(600);
  });

  it('distribution counts are correct over full dataset', async () => {
    // 500 items: 100 each of ratings 1-5
    const records = [];
    for (let r = 1; r <= 5; r++) {
      for (let i = 0; i < 100; i++) {
        records.push({ name: `Item ${r}_${i}`, rating: r });
      }
    }
    const entity = createMockEntity(records);

    const fullResult = await fetchAllEntities(entity, { created_by: 'u@t.com' }, '-created_date', 5000, 200, 'analytics:dist');

    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    fullResult.forEach((r) => {
      dist[r.rating]++;
    });

    expect(dist[1]).toBe(100);
    expect(dist[2]).toBe(100);
    expect(dist[3]).toBe(100);
    expect(dist[4]).toBe(100);
    expect(dist[5]).toBe(100);
    expect(fullResult.length).toBe(500);
  });
});

describe('Analytics Parity — Edge Cases', () => {
  it('handles exactly 200 records (page boundary)', async () => {
    const records = Array.from({ length: 200 }, (_, i) => ({ name: `Item ${i}` }));
    const entity = createMockEntity(records);
    const result = await fetchAllEntities(entity, {}, '-created_date', 5000, 200, 'analytics:boundary');
    expect(result.length).toBe(200);
  });

  it('handles 201 records (just over page boundary)', async () => {
    const records = Array.from({ length: 201 }, (_, i) => ({ name: `Item ${i}` }));
    const entity = createMockEntity(records);
    const result = await fetchAllEntities(entity, {}, '-created_date', 5000, 200, 'analytics:over');
    expect(result.length).toBe(201);
  });

  it('no duplicate IDs in multi-page results', async () => {
    const records = Array.from({ length: 450 }, (_, i) => ({ name: `Item ${i}` }));
    const entity = createMockEntity(records);
    const result = await fetchAllEntities(entity, {}, '-created_date', 5000, 200, 'analytics:dedup');
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(450);
  });
});