import { describe, expect, it } from 'vitest';
import normalizeCuratorActionResult from '../curatorActionResultNormalizer.jsx';

describe('normalizeCuratorActionResult', () => {
  it('filters incomplete items and preserves flat compatibility items', () => {
    const result = normalizeCuratorActionResult(
      {
        items: [
          { title: 'ok', type: 'specialization', recordId: 'p1' },
          { title: 'bad' },
        ],
      },
      { actionId: 'optimize_collection' }
    );

    expect(result.groups).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('ok');
    expect(result.actionId).toBe('optimize_collection');
  });

  it('returns empty result with groups and items arrays when raw is missing', () => {
    const result = normalizeCuratorActionResult(null, { actionId: 'x' });
    expect(result.actionId).toBe('x');
    expect(result.groups).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it('supports string fallback meta for legacy callers', () => {
    const result = normalizeCuratorActionResult(
      { items: [{ title: 'pipe focus', recordId: 'p2' }] },
      'optimize_collection'
    );

    expect(result.actionId).toBe('optimize_collection');
    expect(result.items).toHaveLength(1);
  });
});
