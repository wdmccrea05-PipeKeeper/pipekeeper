/* eslint-disable */
import { describe, it, expect, vi } from 'vitest';

/**
 * Export Completeness Regression Tests
 *
 * Validates that export functions using fetchAllEntities include ALL
 * records from the database — not just the first page. This prevents
 * silent data truncation in CSV/Excel/PDF exports.
 *
 * The previous bug: export functions used base44.entities.X.filter({created_by})
 * which returns only the first 50-200 records. Collections with more items
 * had their exports silently truncated.
 */

import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';

// Mock entity that paginates
function createMockEntity(totalRecords, pageSize = 50) {
  const allRecords = Array.from({ length: totalRecords }, (_, i) => ({
    id: `rec_${i}`,
    name: `Item ${i}`,
    created_by: 'user@test.com',
    created_date: new Date(Date.now() - i * 1000).toISOString(),
    updated_date: new Date(Date.now() - i * 500).toISOString(),
  }));

  return {
    filter: vi.fn(async (filterObj, sortOrder, limit = pageSize, skip = 0) => {
      return allRecords.slice(skip, skip + limit);
    }),
    list: vi.fn(async (sortOrder, limit = pageSize, skip = 0) => {
      return allRecords.slice(skip, skip + limit);
    }),
  };
}

describe('Export Completeness — fetchAllEntities', () => {
  it('retrieves all 500 pipes for export (beyond 50-record default)', async () => {
    const entity = createMockEntity(500);
    // Use pageSize=200 to force pagination (500 / 200 = 3 pages)
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:pipes');
    expect(results.length).toBe(500);
    expect(entity.filter).toHaveBeenCalledTimes(3);
  });

  it('retrieves all 1000 tobacco blends for export', async () => {
    const entity = createMockEntity(1000);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:tobacco');
    expect(results.length).toBe(1000);
  });

  it('retrieves all 250 bottles for export (mixed page boundaries)', async () => {
    const entity = createMockEntity(250);
    // 250 / 200 = 2 pages (200 + 50)
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:bottles');
    expect(results.length).toBe(250);
    expect(entity.filter).toHaveBeenCalledTimes(2);
  });

  it('includes the last record (no off-by-one truncation)', async () => {
    const entity = createMockEntity(201);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:edge');
    expect(results.length).toBe(201);
    expect(results[200].id).toBe('rec_200');
  });

  it('handles exactly 200 records (single full page)', async () => {
    const entity = createMockEntity(200);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:exact');
    expect(results.length).toBe(200);
  });

  it('handles 0 records gracefully', async () => {
    const entity = createMockEntity(0);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:empty');
    expect(results.length).toBe(0);
  });

  it('deduplicates records across page boundaries (no duplicates in export)', async () => {
    const entity = createMockEntity(450);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:dedup');
    const ids = results.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(ids.length).toBe(450);
  });

  it('preserves sort order across pages for consistent export', async () => {
    const entity = createMockEntity(300);
    const results = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:sort');
    for (let i = 1; i < results.length; i++) {
      const prevDate = Date.parse(results[i - 1].created_date);
      const currDate = Date.parse(results[i].created_date);
      expect(prevDate >= currDate).toBe(true);
    }
  });
});

describe('Export Completeness — Parity with old filter() approach', () => {
  it('fetchAllEntities returns >= records compared to single filter() call', async () => {
    const totalRecords = 350;
    const entity = createMockEntity(totalRecords);

    // Old approach: single filter() call (truncated at page size)
    const oldResult = await entity.filter({ created_by: 'user@test.com' }, '-updated_date', 200, 0);

    // New approach: fetchAllEntities (paginated)
    entity.filter.mockClear();
    const newResult = await fetchAllEntities(entity, { created_by: 'user@test.com' }, '-updated_date', 200, 200, 'export:parity');

    expect(newResult.length).toBeGreaterThanOrEqual(oldResult.length);
    expect(newResult.length).toBe(totalRecords);
    expect(oldResult.length).toBe(200); // old approach truncated at 200
  });
});