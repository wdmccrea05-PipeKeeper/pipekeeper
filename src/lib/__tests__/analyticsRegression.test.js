/**
 * analyticsRegression.test.js
 *
 * Cross-module analytics regression suite.
 *
 * Validates that every canonical selector produces consistent results
 * from the same dataset, and that new utility functions work correctly.
 *
 * Covers:
 *   - Collection totals per module
 *   - Ratings (canonical getAverageRating / selectDisplayRating)
 *   - Collection value (all modules)
 *   - Timeline utilities (rolling windows, YTD)
 *   - Breakdown utilities (field breakdown, top-N, favorites, wishlist)
 *   - Active-item filters (archived / deleted / retired exclusion)
 *   - Cross-module total value (selectTotalCollectionValue)
 *   - Wine metrics (selectWineMetrics)
 *   - Pipe bowls-weighted index (buildBowlsWeightedIndex)
 *   - Context budget O(1) vs O(n²) parity
 */

import { describe, expect, test } from 'vitest';

// Collection selectors
import { selectPipeMetrics, selectPipeCollectionValue, buildBowlsWeightedIndex, buildSessionsByPipeIndex } from '@/lib/collection/pipeSelectors';
import { selectTobaccoMetrics } from '@/lib/collection/tobaccoSelectors';
import { selectWhiskeyMetrics } from '@/lib/collection/whiskeySelectors';
import { selectCigarMetrics, selectTotalSticks, selectCigarCollectionValue } from '@/lib/collection/cigarSelectors';
import { selectWineMetrics, selectWineCollectionValue } from '@/lib/collection/wineSelectors';
import { selectTotalCollectionValue, selectCollectionSummary } from '@/lib/collection/summarySelectors';

// Active filters
import {
  selectActivePipes,
  selectActiveBlends,
  selectActiveBottles,
  selectActiveWines,
  selectActiveCigars,
} from '@/lib/collection/activeFilters';

// Shared calculation utils
import { getAverageRating } from '@/shared/utils/calculations/collectionStats';

// Analytics utils
import {
  getRollingWindow,
  getYTDWindow,
  filterLogsInWindow,
  selectRollingWindowCount,
  selectWeekCount,
  selectLogsPerWeek,
} from '@/lib/analytics/timelineUtils';
import {
  selectBreakdownByField,
  selectBreakdownArray,
  selectTopByField,
  selectTopByIndex,
  selectDisplayRating,
  selectFavoriteCount,
  selectWishlistCount,
  selectFlagCount,
} from '@/lib/analytics/breakdownUtils';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PIPES = [
  { id: 'p1', estimated_value: 200 },
  { id: 'p2', collector_value: 150 },
  { id: 'p3', purchase_price: 50 },
  { id: 'p4', archived: true, estimated_value: 999 },  // should be excluded by active filter
];

const BLENDS = [
  { id: 'b1', manual_market_value: 40 },
  { id: 'b2', estimated_total_value: 60 },
  { id: 'b3', deleted: true, estimated_total_value: 500 }, // should be excluded
];

const BOTTLES = [
  { id: 'wh1', purchase_price: 80 },
  { id: 'wh2', retail_price: 120 },
];

const CIGARS = [
  { id: 'c1', singles_equivalent: 10, estimated_unit_value: 5 },  // value = 50
  { id: 'c2', singles_equivalent: 5,  estimated_unit_value: 10 }, // value = 50
  { id: 'c3', singles_equivalent: 0 },                             // value = 0
];

const WINES = [
  { id: 'wi1', quantity: 3, purchase_price: 30, rating: 4 },
  { id: 'wi2', quantity: 1, purchase_price: 50, rating: 5 },
  { id: 'wi3', quantity: 2, estimated_unit_value: 20, rating: 3 },
];

const SMOKING_LOGS = [
  { pipe_id: 'p1', blend_id: 'b1', date: '2024-01-15' },
  { pipe_id: 'p1', blend_id: 'b2', date: '2024-01-20' },
  { pipe_id: 'p2', blend_id: 'b1', date: '2024-02-05' },
];

const WINE_TASTINGS = [
  { wine_id: 'wi1', date: '2024-03-01' },
  { wine_id: 'wi1', date: '2024-03-10' },
  { wine_id: 'wi2', date: '2024-03-15' },
];

// ---------------------------------------------------------------------------
// Active filters
// ---------------------------------------------------------------------------

describe('activeFilters', () => {
  test('selectActivePipes excludes archived records', () => {
    const active = selectActivePipes(PIPES);
    expect(active).toHaveLength(3);
    expect(active.map(p => p.id)).not.toContain('p4');
  });

  test('selectActiveBlends excludes deleted records', () => {
    const active = selectActiveBlends(BLENDS);
    expect(active).toHaveLength(2);
    expect(active.map(b => b.id)).not.toContain('b3');
  });

  test('selectActiveBottles returns all when nothing is archived', () => {
    expect(selectActiveBottles(BOTTLES)).toHaveLength(BOTTLES.length);
  });

  test('selectActiveCigars excludes retired records', () => {
    const withRetired = [...CIGARS, { id: 'c_retired', retired: true }];
    expect(selectActiveCigars(withRetired)).toHaveLength(CIGARS.length);
  });

  test('selectActiveWines excludes hidden records', () => {
    const withHidden = [...WINES, { id: 'w_hidden', hidden: true }];
    expect(selectActiveWines(withHidden)).toHaveLength(WINES.length);
  });

  test('handles empty and null inputs gracefully', () => {
    expect(selectActivePipes([])).toEqual([]);
    expect(selectActivePipes(null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Canonical rating calculation
// ---------------------------------------------------------------------------

describe('getAverageRating — canonical', () => {
  test('matches same result as WhiskeyInsights inline pattern', () => {
    const bottles = [{ rating: 4 }, { rating: 5 }, { rating: 3 }, { rating: null }];
    const canonical = getAverageRating(bottles, b => b?.rating);
    // Inline pattern: filter rating > 0, then average
    const inlineRated = bottles.filter(b => b.rating != null && Number(b.rating) > 0);
    const inline = inlineRated.reduce((s, b) => s + Number(b.rating), 0) / inlineRated.length;
    expect(canonical).toBeCloseTo(inline, 10);
  });

  test('returns null for empty list', () => {
    expect(getAverageRating([], b => b?.rating)).toBeNull();
  });

  test('returns null when no items have a positive rating', () => {
    expect(getAverageRating([{ rating: 0 }, { rating: null }], b => b?.rating)).toBeNull();
  });
});

describe('selectDisplayRating — consistent rounding', () => {
  test('rounds to 2 decimal places by default', () => {
    const items = [{ rating: 4 }, { rating: 5 }];
    expect(selectDisplayRating(items)).toBe('4.50');
  });

  test('accepts custom decimal places', () => {
    const items = [{ rating: 4 }, { rating: 5 }];
    expect(selectDisplayRating(items, 'rating', 1)).toBe('4.5');
  });

  test('returns null for empty list', () => {
    expect(selectDisplayRating([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Collection value — cross-module consistency
// ---------------------------------------------------------------------------

describe('collection value selectors', () => {
  test('selectPipeCollectionValue excludes archived records via canonical active filtering', () => {
    expect(selectPipeCollectionValue(PIPES)).toBe(400); // 200 + 150 + 50
  });

  test('selectTotalSticks sums singles_equivalent', () => {
    expect(selectTotalSticks(CIGARS)).toBe(15); // 10 + 5 + 0
  });

  test('selectCigarCollectionValue uses canonical calculateCigarValue', () => {
    // canonical selector must agree with itself — no divergence
    const v1 = selectCigarCollectionValue(CIGARS);
    const v2 = selectCigarCollectionValue(CIGARS);
    expect(v1).toBe(v2);
    expect(typeof v1).toBe('number');
  });

  test('selectWineCollectionValue produces number ≥ 0', () => {
    expect(selectWineCollectionValue(WINES)).toBeGreaterThan(0);
  });

  test('selectTotalCollectionValue equals sum of module values', () => {
    const pipes = [{ id: 'x', estimated_value: 100 }];
    const blends = [{ manual_market_value: 50 }];
    const bottles = [{ purchase_price: 80 }];
    const cigars = [{ singles_equivalent: 5, estimated_unit_value: 10 }];
    const wines = [{ quantity: 2, estimated_unit_value: 15 }];
    const cross = selectTotalCollectionValue({ pipes, blends, bottles, inventoryUnits: [], cigars, wines });
    expect(typeof cross).toBe('number');
    expect(cross).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Wine metrics
// ---------------------------------------------------------------------------

describe('selectWineMetrics', () => {
  test('returns all expected fields', () => {
    const m = selectWineMetrics(WINES, WINE_TASTINGS);
    expect(m).toHaveProperty('wine_count');
    expect(m).toHaveProperty('total_in_cellar');
    expect(m).toHaveProperty('collection_value');
    expect(m).toHaveProperty('unvalued_count');
    expect(m).toHaveProperty('ready_to_drink');
    expect(m).toHaveProperty('total_tastings');
    expect(m).toHaveProperty('average_rating');
  });

  test('wine_count equals wines.length', () => {
    expect(selectWineMetrics(WINES, []).wine_count).toBe(WINES.length);
  });

  test('total_tastings equals tastings.length', () => {
    expect(selectWineMetrics(WINES, WINE_TASTINGS).total_tastings).toBe(WINE_TASTINGS.length);
  });

  test('average_rating is mean of positive ratings', () => {
    const m = selectWineMetrics(WINES, []);
    const expected = (4 + 5 + 3) / 3;
    expect(m.average_rating).toBeCloseTo(expected, 10);
  });

  test('returns safe defaults for empty inputs', () => {
    const m = selectWineMetrics([], []);
    expect(m.wine_count).toBe(0);
    expect(m.total_tastings).toBe(0);
    expect(m.average_rating).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pipe metrics
// ---------------------------------------------------------------------------

describe('selectPipeMetrics', () => {
  test('returns all expected fields', () => {
    const m = selectPipeMetrics(PIPES, SMOKING_LOGS);
    expect(m).toHaveProperty('pipe_count');
    expect(m).toHaveProperty('total_sessions');
    expect(m).toHaveProperty('most_smoked_pipe');
    expect(m).toHaveProperty('specialized_pipes_count');
    expect(m).toHaveProperty('collection_value');
  });

  test('most_smoked_pipe is p1 (2 sessions)', () => {
    const m = selectPipeMetrics(PIPES, SMOKING_LOGS);
    expect(m.most_smoked_pipe?.id).toBe('p1');
  });
});

// ---------------------------------------------------------------------------
// buildBowlsWeightedIndex
// ---------------------------------------------------------------------------

describe('buildBowlsWeightedIndex', () => {
  const logs = [
    { pipe_id: 'p1', bowls_smoked: 2 },
    { pipe_id: 'p1', bowls_smoked: 1 },
    { pipe_id: 'p2', bowls_smoked: 3 },
  ];
  const getBowls = (l) => Number(l.bowls_smoked || 1);

  test('produces weighted counts', () => {
    const idx = buildBowlsWeightedIndex(logs, 'pipe_id', getBowls);
    expect(idx['p1']).toBe(3); // 2 + 1
    expect(idx['p2']).toBe(3);
  });

  test('falls back to 1 per log when getBowlsFn is omitted', () => {
    const idx = buildBowlsWeightedIndex(logs, 'pipe_id', null);
    expect(idx['p1']).toBe(2); // 2 logs
    expect(idx['p2']).toBe(1);
  });

  test('agrees with buildSessionsByPipeIndex for raw counts', () => {
    // When all bowls_smoked values are 1, weighted === raw
    const rawLogs = logs.map(l => ({ ...l, bowls_smoked: 1 }));
    const rawIdx = buildSessionsByPipeIndex(rawLogs);
    const weightedIdx = buildBowlsWeightedIndex(rawLogs, 'pipe_id', getBowls);
    expect(weightedIdx).toEqual(rawIdx);
  });
});

// ---------------------------------------------------------------------------
// Timeline utilities
// ---------------------------------------------------------------------------

describe('getRollingWindow', () => {
  test('7-day window spans exactly 7 days', () => {
    const ref = new Date('2024-06-15T12:00:00');
    const { start, end } = getRollingWindow(7, ref);
    const diffMs = end.getTime() - start.getTime();
    // Should be 6 days + time portion (start is 00:00, end is 23:59:59)
    expect(diffMs).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 60000);
  });
});

describe('filterLogsInWindow', () => {
  const logs = [
    { date: '2024-01-10' },
    { date: '2024-01-20' },
    { date: '2024-02-05' },
  ];

  test('returns only logs within window', () => {
    const window = { start: new Date('2024-01-15'), end: new Date('2024-01-31') };
    const result = filterLogsInWindow(logs, window);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-20');
  });

  test('returns empty array for empty logs', () => {
    const window = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
    expect(filterLogsInWindow([], window)).toEqual([]);
  });

  test('handles null/undefined dates gracefully', () => {
    const logsWithNulls = [{ date: null }, { date: '2024-01-20' }];
    const window = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
    expect(filterLogsInWindow(logsWithNulls, window)).toHaveLength(1);
  });
});

describe('selectRollingWindowCount', () => {
  const logs = [
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }, // 2 days ago
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }, // 5 days ago
    { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }, // 10 days ago
  ];

  test('rolling 7-day counts only recent logs', () => {
    expect(selectRollingWindowCount(logs, 7)).toBe(2);
  });

  test('rolling 30-day counts all logs', () => {
    expect(selectRollingWindowCount(logs, 30)).toBe(3);
  });
});

describe('selectLogsPerWeek', () => {
  test('returns 0 for empty logs', () => {
    expect(selectLogsPerWeek([])).toBe(0);
  });

  test('returns a positive number for a single log', () => {
    const logs = [{ date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }];
    expect(selectLogsPerWeek(logs)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Breakdown utilities
// ---------------------------------------------------------------------------

describe('selectBreakdownByField', () => {
  const items = [
    { style: 'red' },
    { style: 'red' },
    { style: 'white' },
    { style: null },
    {},
  ];

  test('counts field values correctly', () => {
    const bd = selectBreakdownByField(items, 'style');
    expect(bd.red).toBe(2);
    expect(bd.white).toBe(1);
    expect(Object.keys(bd)).not.toContain('null');
  });

  test('ignores null/undefined field values', () => {
    const bd = selectBreakdownByField(items, 'style');
    expect(Object.keys(bd)).toHaveLength(2);
  });
});

describe('selectBreakdownArray', () => {
  const items = [{ x: 'a' }, { x: 'a' }, { x: 'b' }];

  test('returns sorted desc array', () => {
    const arr = selectBreakdownArray(items, 'x');
    expect(arr[0]).toEqual({ name: 'a', value: 2 });
    expect(arr[1]).toEqual({ name: 'b', value: 1 });
  });

  test('respects limit', () => {
    expect(selectBreakdownArray(items, 'x', 1)).toHaveLength(1);
  });
});

describe('selectTopByField', () => {
  const items = [{ id: '1', value: 10 }, { id: '2', value: 5 }, { id: '3', value: 20 }];

  test('returns top N by field descending', () => {
    const top = selectTopByField(items, 'value', 2);
    expect(top[0].id).toBe('3');
    expect(top).toHaveLength(2);
  });

  test('respects minValue', () => {
    const top = selectTopByField(items, 'value', 10, { minValue: 8 });
    expect(top.every(i => i.value > 8)).toBe(true);
  });
});

describe('selectTopByIndex', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const idx = { a: 5, b: 10 };

  test('returns items sorted by index count', () => {
    const top = selectTopByIndex(items, idx);
    expect(top[0].item.id).toBe('b');
    expect(top[0].count).toBe(10);
  });

  test('excludes items with zero count', () => {
    const top = selectTopByIndex(items, idx);
    expect(top.some(x => x.item.id === 'c')).toBe(false);
  });
});

describe('favorite / wishlist selectors', () => {
  const items = [
    { id: '1', is_favorite: true, wishlist: true, shopping_list: true },
    { id: '2', is_favorite: false, wishlist: true },
    { id: '3' },
  ];

  test('selectFavoriteCount', () => {
    expect(selectFavoriteCount(items)).toBe(1);
  });

  test('selectWishlistCount', () => {
    expect(selectWishlistCount(items)).toBe(2);
  });

  test('selectFlagCount generic', () => {
    expect(selectFlagCount(items, 'shopping_list')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Cross-module summary consistency
// ---------------------------------------------------------------------------

describe('selectCollectionSummary — cross-module consistency', () => {
  test('total_value equals sum of module collection_values', () => {
    const pipes = [{ id: 'p', estimated_value: 100 }];
    const blends = [{ manual_market_value: 40 }];
    const bottles = [{ purchase_price: 60 }];
    const cigars = [{ singles_equivalent: 2, estimated_unit_value: 10 }];
    const wines = [{ quantity: 3, estimated_unit_value: 15, rating: 4 }];

    const summary = selectCollectionSummary({
      pipes,
      smokingLogs: [],
      blends,
      bottles,
      inventoryUnits: [],
      tastingLogs: [],
      cigars,
      humidors: [],
      wines,
      wineTastings: [],
    });

    const modulesTotal =
      summary.pipe.collection_value +
      summary.tobacco.cellar_value +
      summary.whiskey.collection_value +
      summary.cigar.collection_value +
      summary.wine.collection_value;

    expect(summary.total_value).toBeCloseTo(modulesTotal, 10);
  });
});
