/* eslint-disable */
import { describe, it, expect, vi } from 'vitest';

/**
 * Pagination / Full-Fetch Regression Tests
 *
 * Validates that fetchAllEntities retrieves complete datasets beyond
 * the previous default caps (50, 100, 200, 300, 500).
 *
 * Tests with mock entity objects that simulate the Base44 SDK .filter()
 * pagination behavior: returns `pageSize` records per call until the
 * dataset is exhausted.
 */

// Import the canonical helper
import { fetchAllEntities } from '@/lib/base44/fetchAllEntities';

// Mock entity that paginates
function createMockEntity(totalRecords, pageSize = 50) {
  const allRecords = Array.from({ length: totalRecords }, (_, i) => ({
    id: `rec_${i}`,
    name: `Record ${i}`,
    created_date: new Date(Date.now() - i * 1000).toISOString(),
  }));

  return {
    filter: vi.fn(async (filterObj, sortOrder, limit = pageSize, skip = 0) => {
      const page = allRecords.slice(skip, skip + limit);
      return page;
    }),
  };
}

describe('fetchAllEntities pagination', () => {
  it('retrieves all 51 records (beyond default cap of 50)', async () => {
    const entity = createMockEntity(51);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(51);
    expect(entity.filter).toHaveBeenCalledTimes(2);
  });

  it('retrieves all 201 records (beyond previous cap of 200)', async () => {
    const entity = createMockEntity(201);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(201);
  });

  it('retrieves all 501 records (beyond previous cap of 500)', async () => {
    const entity = createMockEntity(501);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(501);
  });

  it('retrieves all 1001 records (for historical logs)', async () => {
    const entity = createMockEntity(1001);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(1001);
  });

  it('uses large page size (5000) for efficiency', async () => {
    const entity = createMockEntity(12000, 5000);
    const results = await fetchAllEntities(entity, {}, '-created_date', 5000, 200);
    expect(results.length).toBe(12000);
    // 12000 / 5000 = 2.4 → 3 pages
    expect(entity.filter).toHaveBeenCalledTimes(3);
  });

  it('deduplicates by id when pages overlap', async () => {
    // Simulate unstable ordering that returns overlapping pages
    const allRecords = Array.from({ length: 100 }, (_, i) => ({
      id: `rec_${i}`,
      name: `Record ${i}`,
    }));

    const entity = {
      filter: vi.fn(async (filterObj, sortOrder, limit, skip) => {
        // Page 1: records 0-49, Page 2: records 25-74 (overlap), Page 3: records 50-99
        if (skip === 0) return allRecords.slice(0, 50);
        if (skip === 50) return allRecords.slice(25, 75); // overlap
        if (skip === 100) return allRecords.slice(50, 100);
        return [];
      }),
    };

    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    // Should deduplicate overlapping records
    const uniqueIds = new Set(results.map(r => r.id));
    expect(uniqueIds.size).toBe(results.length);
    expect(results.length).toBe(100); // All unique records, no duplicates
  });

  it('stops on empty page', async () => {
    const entity = createMockEntity(0);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(0);
    expect(entity.filter).toHaveBeenCalledTimes(1);
  });

  it('stops on partial page (end of dataset)', async () => {
    const entity = createMockEntity(75, 50);
    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    expect(results.length).toBe(75);
    // Page 1: 50 records, Page 2: 25 records (partial → stop)
    expect(entity.filter).toHaveBeenCalledTimes(2);
  });

  it('handles mid-stream error gracefully (returns partial data)', async () => {
    const allRecords = Array.from({ length: 100 }, (_, i) => ({
      id: `rec_${i}`,
      name: `Record ${i}`,
    }));

    const entity = {
      filter: vi.fn(async (filterObj, sortOrder, limit, skip) => {
        if (skip === 50) throw new Error('Transient API error');
        return allRecords.slice(skip, skip + limit);
      }),
    };

    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 200);
    // Should return the first page (50 records) before the error
    expect(results.length).toBe(50);
  });

  it('respects maxPages safety cap', async () => {
    // Create an entity that always returns a full page (infinite loop scenario)
    const entity = {
      filter: vi.fn(async () => {
        return Array.from({ length: 50 }, (_, i) => ({
          id: `rec_${Math.random()}_${i}`,
          name: `Record ${i}`,
        }));
      }),
    };

    const results = await fetchAllEntities(entity, {}, '-created_date', 50, 5); // maxPages=5
    // Should stop after 5 pages (250 records max)
    expect(entity.filter).toHaveBeenCalledTimes(5);
    expect(results.length).toBe(250);
  });
});