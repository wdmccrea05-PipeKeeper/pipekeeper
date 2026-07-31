/**
 * Unit tests for fetchAllEntities — Base44 skip-based pagination helper.
 *
 * Covers:
 *  - Single page (fewer results than pageSize)  → returns all rows, one API call
 *  - Exact multiple pages                        → returns all rows correctly
 *  - Partial final page                          → stops after the partial page
 *  - Empty first page                            → returns empty array, one API call
 *  - Empty pages mid-stream                      → stops at the first empty page
 *  - Duplicate rows (unstable ordering)          → deduplicated by id
 *  - Rows without an id field                    → included unconditionally
 *  - Repeated cursor / runaway loop              → stops at maxPages safety cap
 *  - API error on a page                         → returns rows collected so far
 *  - Custom pageSize                             → honoured in every filter call
 */

import { describe, it, expect, vi } from 'vitest';
import { fetchAllEntities } from '../base44/fetchAllEntities';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRows(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({ id: String(offset + i + 1), value: offset + i + 1 }));
}

/**
 * Builds a mock entity whose `.filter()` returns pages as if the total
 * dataset has `total` rows and each page has at most `pageSize` rows.
 */
function makeEntity(total, pageSize = 5000) {
  return {
    filter: vi.fn(async (_filterObj, _sortOrder, _limit, skip = 0) => {
      const start = skip;
      const end = Math.min(skip + pageSize, total);
      if (start >= total) return [];
      return makeRows(end - start, start);
    }),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('fetchAllEntities', () => {
  // ── Basic pagination ───────────────────────────────────────────────────────

  it('returns all rows when dataset fits in one page', async () => {
    const entity = makeEntity(10, 5000);
    const result = await fetchAllEntities(entity, { created_by: 'user@test.com' });
    expect(result).toHaveLength(10);
    expect(entity.filter).toHaveBeenCalledTimes(1);
  });

  it('returns all rows spread across multiple full pages', async () => {
    const pageSize = 3;
    const total = 9; // exactly 3 full pages
    const entity = makeEntity(total, pageSize);
    const result = await fetchAllEntities(entity, {}, '-id', pageSize);
    expect(result).toHaveLength(9);
    // 3 full pages + 1 empty probe to confirm end-of-data = 4 calls
    expect(entity.filter).toHaveBeenCalledTimes(4);
  });

  it('stops after a partial final page', async () => {
    const pageSize = 5;
    const total = 12; // 2 full pages (10) + 1 partial (2)
    const entity = makeEntity(total, pageSize);
    const result = await fetchAllEntities(entity, {}, '-id', pageSize);
    expect(result).toHaveLength(12);
    expect(entity.filter).toHaveBeenCalledTimes(3); // full, full, partial → stop
  });

  it('returns empty array when first page is empty', async () => {
    const entity = makeEntity(0, 5000);
    const result = await fetchAllEntities(entity, {});
    expect(result).toHaveLength(0);
    expect(entity.filter).toHaveBeenCalledTimes(1);
  });

  it('stops at the first empty page mid-stream', async () => {
    let callCount = 0;
    const entity = {
      filter: vi.fn(async () => {
        callCount += 1;
        if (callCount === 1) return makeRows(5); // full page
        return [];                               // empty → stop
      }),
    };
    const result = await fetchAllEntities(entity, {}, '-id', 5);
    expect(result).toHaveLength(5);
    expect(entity.filter).toHaveBeenCalledTimes(2);
  });

  // ── Deduplication ──────────────────────────────────────────────────────────

  it('deduplicates rows with the same id (unstable ordering overlap)', async () => {
    const dup = { id: '1', value: 'original' };
    const dup2 = { id: '1', value: 'duplicate' };
    const entity = {
      filter: vi.fn()
        .mockResolvedValueOnce([dup, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }])
        .mockResolvedValueOnce([dup2, { id: '6' }]), // id '1' repeated on page 2
    };
    const result = await fetchAllEntities(entity, {}, '-id', 5);
    const ids = result.map(r => r.id);
    expect(ids.filter(id => id === '1')).toHaveLength(1); // deduplicated
    expect(ids).toContain('6');
    expect(result.find(r => r.id === '1').value).toBe('original'); // first wins
  });

  it('includes rows without an id field unconditionally', async () => {
    const entity = {
      filter: vi.fn().mockResolvedValueOnce([{ label: 'no-id-a' }, { label: 'no-id-b' }]),
    };
    const result = await fetchAllEntities(entity, {});
    expect(result).toHaveLength(2);
  });

  // ── Safety cap ─────────────────────────────────────────────────────────────

  it('stops at maxPages to prevent runaway loops from repeated cursors', async () => {
    // Every page returns pageSize rows with the same IDs (simulating a stuck cursor)
    const pageSize = 2;
    const maxPages = 3;
    let callCount = 0;
    const entity = {
      filter: vi.fn(async () => {
        callCount += 1;
        // Always return a "full" page of the same two rows
        return [{ id: 'x' }, { id: 'y' }];
      }),
    };
    const result = await fetchAllEntities(entity, {}, '-id', pageSize, maxPages);
    // Stops after maxPages calls, deduplication collapses the result to 2 unique rows
    expect(entity.filter).toHaveBeenCalledTimes(maxPages);
    expect(result).toHaveLength(2);
  });

  // ── API error resilience ───────────────────────────────────────────────────

  it('returns rows collected so far when a later page throws', async () => {
    const entity = {
      filter: vi.fn()
        .mockResolvedValueOnce(makeRows(5))           // page 1 succeeds
        .mockRejectedValueOnce(new Error('network')), // page 2 fails
    };
    const result = await fetchAllEntities(entity, {}, '-id', 5);
    expect(result).toHaveLength(5);
  });

  // ── Custom pageSize ────────────────────────────────────────────────────────

  it('passes the custom pageSize to every filter call', async () => {
    const pageSize = 100;
    const entity = makeEntity(250, pageSize);
    await fetchAllEntities(entity, { created_by: 'u' }, '-id', pageSize);
    for (const call of entity.filter.mock.calls) {
      expect(call[2]).toBe(pageSize); // 3rd arg = limit
    }
  });

  // ── skip advancement ───────────────────────────────────────────────────────

  it('advances skip by pageSize on each call', async () => {
    const pageSize = 10;
    const total = 25; // 2 full pages + 1 partial (5)
    const entity = makeEntity(total, pageSize);
    await fetchAllEntities(entity, {}, '-id', pageSize);
    const skips = entity.filter.mock.calls.map(c => c[3] ?? 0);
    expect(skips).toEqual([0, 10, 20]); // full(10), full(10), partial(5) → stop
  });

  // ── label / diagnostic logging ─────────────────────────────────────────────

  it('emits console.info start and done logs when label is provided', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const entity = makeEntity(3, 5000);
    await fetchAllEntities(entity, { created_by: 'u@test.com' }, '-date', 5000, 200, 'TestComponent:SmokingLog');
    expect(spy).toHaveBeenCalledTimes(2);
    const [startCall, doneCall] = spy.mock.calls;
    expect(startCall[0]).toBe('[PK:fetch:start]');
    expect(startCall[1]).toMatchObject({ label: 'TestComponent:SmokingLog', helper: 'fetchAllEntities' });
    expect(doneCall[0]).toBe('[PK:fetch:done]');
    expect(doneCall[1]).toMatchObject({
      label: 'TestComponent:SmokingLog',
      helper: 'fetchAllEntities',
      recordsReturned: 3,
      pageCount: 1,
      finalSessionCount: 3,
    });
    spy.mockRestore();
  });

  it('does not emit any console.info when label is omitted', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const entity = makeEntity(3, 5000);
    await fetchAllEntities(entity, {});
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
