import { describe, it, expect } from 'vitest';
import {
  RATING_CATEGORIES,
  normalizeRating,
  averageCategoryRating,
  ratingCompleteness,
  hasAnyRating,
  summarizeRatings,
} from '../lib/cigars/cigarRatings.js';
import {
  resolveThresholds,
  evaluateReading,
  buildEnvironmentSeries,
  summarizeEnvironment,
  buildEnvironmentAlerts,
  DEFAULT_THRESHOLDS,
} from '../lib/cigars/humidorEnvironment.js';
import {
  getCigarSticks,
  buildStorageDistribution,
  reconcileHumidor,
  buildReconciliationReport,
  buildHumidorMovements,
  buildAgingBuckets,
  monthsAged,
  describePosition,
} from '../lib/cigars/humidorInventory.js';
import {
  getCigarDocumentation,
  summarizeDocumentation,
  matchesPreset,
} from '../lib/cigars/cigarDocumentation.js';
import {
  buildDashboardMetrics,
  groupDashboardMetrics,
  buildDrilldownQuery,
} from '../lib/cigars/cigarDashboard.js';
import { buildCigarCollectionBrief, briefToText } from '../lib/cigars/cigarCollectionBrief.js';

const NOW = new Date('2026-11-27T12:00:00Z');

function cigar(overrides = {}) {
  return {
    id: 'c1',
    name: 'Serie V',
    brand: 'Oliva',
    line: 'Serie V',
    vitola: 'Robusto',
    wrapper: 'Maduro',
    binder: 'Nicaragua',
    filler: 'Nicaragua',
    country_of_origin: 'Nicaragua',
    length_inches: 5,
    ring_gauge: 50,
    box_date: '2025-01-15',
    batch_number: 'LOT-1',
    purchase_date: '2025-02-01',
    purchase_price: 12,
    condition: 'Excellent',
    photos: ['https://example.com/a.jpg'],
    quantity: 2,
    cigars_per_package: 20,
    singles_equivalent: 40,
    humidor_id: 'h1',
    ...overrides,
  };
}

describe('cigar ratings', () => {
  it('keeps only the categories that were recorded', () => {
    const rating = normalizeRating({ id: 'r1', cigar_id: 'c1', rated_at: '2026-01-01', draw: 4, flavor: 5 });
    expect(rating.categories.draw).toBe(4);
    expect(rating.categories.flavor).toBe(5);
    expect(rating.categories.burn).toBeNull();
    expect(ratingCompleteness({ draw: 4, flavor: 5 })).toBeCloseTo(2 / RATING_CATEGORIES.length);
    expect(ratingCompleteness({})).toBe(0);
  });

  it('clamps out-of-range values and ignores blanks', () => {
    const rating = normalizeRating({ draw: 9, burn: -3, aroma: '' });
    expect(rating.categories.draw).toBe(5);
    expect(rating.categories.burn).toBe(0);
    expect(rating.categories.aroma).toBeNull();
  });

  it('averages only recorded categories', () => {
    expect(averageCategoryRating({ draw: 4, flavor: 2 })).toBe(3);
    expect(averageCategoryRating({})).toBeNull();
  });

  it('summarises collection ratings per category and per cigar', () => {
    const summary = summarizeRatings([
      { id: 'r1', cigar_id: 'c1', rated_at: '2026-01-01', draw: 4, overall: 4 },
      { id: 'r2', cigar_id: 'c1', rated_at: '2026-03-01', draw: 2, overall: 3 },
      { id: 'r3', cigar_id: 'c2', rated_at: '2026-02-01', burn: 5 },
    ]);
    expect(summary.count).toBe(3);
    expect(summary.ratedCigars).toBe(2);
    expect(summary.categories.draw.average).toBe(3);
    expect(summary.categories.burn.average).toBe(5);
    expect(summary.perCigar.c1.count).toBe(2);
    expect(summary.perCigar.c1.latest.id).toBe('r2');
  });

  it('ignores ratings with no category at all', () => {
    expect(hasAnyRating({ observations: 'nothing scored' })).toBe(false);
    expect(summarizeRatings([{ cigar_id: 'c1', rated_at: '2026-01-01' }]).count).toBe(0);
  });
});

describe('humidor environment', () => {
  it('uses the collector band, then a band around the target, then the default', () => {
    expect(resolveThresholds({ min_humidity_rh: 60, max_humidity_rh: 66 }).source.humidity).toBe('explicit');
    const fromTarget = resolveThresholds({ target_humidity_rh: 65, target_temp_f: 68 });
    expect(fromTarget.min_humidity_rh).toBe(60);
    expect(fromTarget.max_humidity_rh).toBe(70);
    expect(fromTarget.min_temp_f).toBe(65);
    expect(fromTarget.max_temp_f).toBe(71);
    const fallback = resolveThresholds({});
    expect(fallback.min_humidity_rh).toBe(DEFAULT_THRESHOLDS.min_humidity_rh);
  });

  it('evaluates a reading against the band', () => {
    const humidor = { min_humidity_rh: 62, max_humidity_rh: 72, min_temp_f: 65, max_temp_f: 75 };
    expect(evaluateReading({ humidity_rh: 65, temperature_f: 68 }, humidor).status).toBe('ok');
    expect(evaluateReading({ humidity_rh: 55, temperature_f: 68 }, humidor).status).toBe('low');
    expect(evaluateReading({ humidity_rh: 80, temperature_f: 68 }, humidor).status).toBe('high');
    const mixed = evaluateReading({ humidity_rh: 55, temperature_f: 80 }, humidor);
    expect(mixed.status).toBe('mixed');
    expect(mixed.outOfRange).toContain('humidity_low');
    expect(mixed.outOfRange).toContain('temperature_high');
    expect(evaluateReading({}, humidor).status).toBe('unknown');
  });

  it('orders the series oldest first and summarises it', () => {
    const readings = [
      { id: 'b', recorded_at: '2026-02-01T10:00:00Z', humidity_rh: 66, temperature_f: 68 },
      { id: 'a', recorded_at: '2026-01-01T10:00:00Z', humidity_rh: 55, temperature_f: 69 },
    ];
    const series = buildEnvironmentSeries(readings, { target_humidity_rh: 65 });
    expect(series.map((p) => p.id)).toEqual(['a', 'b']);

    const summary = summarizeEnvironment(readings, { target_humidity_rh: 65 });
    expect(summary.readingCount).toBe(2);
    expect(summary.humidity.average).toBe(60.5);
    expect(summary.outOfRangeCount).toBe(1);
    expect(summary.latest.id).toBe('b');
  });

  it('raises alerts only for monitored humidors outside the band', () => {
    const humidors = [{ id: 'h1', name: 'Cabinet' }, { id: 'h2', name: 'Desktop' }, { id: 'h3', name: 'Travel' }];
    const readingsByHumidor = {
      h1: [{ recorded_at: '2026-01-01T10:00:00Z', humidity_rh: 90, temperature_f: 68 }],
      h2: [{ recorded_at: '2026-01-01T10:00:00Z', humidity_rh: 65, temperature_f: 68 }],
      h3: [],
    };
    const alerts = buildEnvironmentAlerts(humidors, readingsByHumidor);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].humidorId).toBe('h1');
    expect(alerts[0].status).toBe('high');
  });
});

describe('humidor inventory and storage', () => {
  it('derives sticks from the documented quantity without inventing any', () => {
    expect(getCigarSticks({ singles_equivalent: 40 })).toBe(40);
    expect(getCigarSticks({ quantity: 2, cigars_per_package: 20 })).toBe(40);
    expect(getCigarSticks({ quantity: 3 })).toBe(3);
    expect(getCigarSticks({})).toBe(0);
  });

  it('splits the collection by storage location', () => {
    const cigars = [
      cigar({ id: 'c1', humidor_id: 'h1', singles_equivalent: 40 }),
      cigar({ id: 'c2', humidor_id: null, singles_equivalent: 10, humidor_tray: null }),
      cigar({ id: 'c3', humidor_id: 'h1', singles_equivalent: 5, humidor_shelf: '2' }),
    ];
    const distribution = buildStorageDistribution(cigars, [{ id: 'h1', name: 'Cabinet', capacity_count: 100 }]);
    expect(distribution.totalSticks).toBe(55);
    expect(distribution.assignedRecords).toBe(2);
    expect(distribution.unassigned.records).toBe(1);
    expect(distribution.positionedRecords).toBe(1);
    expect(distribution.byHumidor[0].sticks).toBe(45);
    expect(distribution.byHumidor[0].utilization).toBeCloseTo(0.45);
  });

  it('reconciles a documented count against the assigned records', () => {
    const cigars = [cigar({ id: 'c1', humidor_id: 'h1', singles_equivalent: 40 })];
    expect(reconcileHumidor({ id: 'h1', current_count: 40 }, cigars).status).toBe('match');
    expect(reconcileHumidor({ id: 'h1', current_count: 30 }, cigars).status).toBe('records_exceed_documented');
    expect(reconcileHumidor({ id: 'h1', current_count: 50 }, cigars).status).toBe('documented_exceeds_records');
    const undocumented = reconcileHumidor({ id: 'h1' }, cigars);
    expect(undocumented.status).toBe('undocumented');
    expect(undocumented.difference).toBeNull();
  });

  it('reports capacity overflow without blocking anything', () => {
    const report = buildReconciliationReport(
      [{ id: 'h1', current_count: 40, capacity_count: 30 }],
      [cigar({ humidor_id: 'h1', singles_equivalent: 40 })]
    );
    expect(report.overCapacity[0].capacityOverflow).toBe(10);
  });

  it('builds movement history from storage change events only', () => {
    const activities = [
      { id: 'a1', record_entity: 'Cigar', record_id: 'c1', event_type: 'storage_change', occurred_at: '2026-02-01T00:00:00Z', summary: 'Storage set to Cabinet', humidor_id: 'h1' },
      { id: 'a2', record_entity: 'Cigar', record_id: 'c1', event_type: 'condition_change', occurred_at: '2026-03-01T00:00:00Z', summary: 'Condition recorded' },
      { id: 'a3', record_entity: 'Pipe', record_id: 'p1', event_type: 'storage_change', occurred_at: '2026-01-01T00:00:00Z' },
    ];
    const moves = buildHumidorMovements(activities, { humidorId: 'h1', cigarIds: ['c1'] });
    expect(moves).toHaveLength(1);
    expect(moves[0].cigarId).toBe('c1');
  });

  it('buckets aging from the documented start date', () => {
    const cigars = [
      cigar({ id: 'c1', aging_start_date: '2026-09-01', singles_equivalent: 10 }),
      cigar({ id: 'c2', aging_start_date: '2025-01-01', singles_equivalent: 5 }),
      cigar({ id: 'c3', aging_start_date: null, box_date: null, purchase_date: null, created_date: null }),
    ];
    const aging = buildAgingBuckets(cigars, NOW);
    expect(aging.buckets.find((b) => b.key === 'aging_0_6').records).toBe(1);
    expect(aging.buckets.find((b) => b.key === 'aging_12_24').records).toBe(1);
    expect(aging.undocumented.records).toBe(1);
    expect(monthsAged('2025-11-01', NOW)).toBe(12);
    expect(monthsAged(null, NOW)).toBeNull();
  });

  it('describes a documented position', () => {
    expect(describePosition({ humidor_tray: 'A', humidor_shelf: '2' })).toBe('Shelf 2 · Tray A');
    expect(describePosition({})).toBe('');
  });
});

describe('cigar documentation', () => {
  it('counts documented fields and lists the gaps', () => {
    const complete = getCigarDocumentation(cigar());
    expect(complete.missing).toEqual([]);
    expect(complete.percent).toBe(100);

    const partial = getCigarDocumentation(cigar({ wrapper: '', photos: [] }));
    expect(partial.missing).toContain('wrapper');
    expect(partial.missing).toContain('photos');
    expect(partial.percent).toBeLessThan(100);
  });

  it('summarises gaps across the collection', () => {
    const summary = summarizeDocumentation([cigar(), cigar({ id: 'c2', wrapper: '', condition: '' })]);
    expect(summary.records).toBe(2);
    expect(summary.complete).toBe(1);
    expect(summary.incomplete).toBe(1);
    expect(summary.missingByField.map((f) => f.key)).toContain('wrapper');
  });

  it('matches every drill-down preset', () => {
    expect(matchesPreset(cigar(), 'docs_missing')).toBe(false);
    expect(matchesPreset(cigar({ wrapper: '' }), 'docs_missing')).toBe(true);
    expect(matchesPreset(cigar({ humidor_id: null }), 'unassigned')).toBe(true);
    expect(matchesPreset(cigar({ condition: '', condition_notes: '' }), 'condition_unrecorded')).toBe(true);
    expect(matchesPreset(cigar({ purchase_price: null, estimated_value: null }), 'value_missing')).toBe(true);
    expect(matchesPreset(cigar({ rating: 0 }), 'rated_none', { ratingsByCigarId: { c1: true } })).toBe(false);
    expect(matchesPreset(cigar({ aging_start_date: '2026-10-01' }), 'aging_0_6', { now: NOW })).toBe(true);
    expect(matchesPreset(cigar({ aging_start_date: '2024-01-01' }), 'aging_24_plus', { now: NOW })).toBe(true);
    expect(matchesPreset(cigar(), 'unknown_preset')).toBe(true);
  });
});

describe('dashboard metrics', () => {
  const cigars = [
    cigar({ id: 'c1' }),
    cigar({ id: 'c2', brand: 'Padron', wrapper: '', humidor_id: null, condition: '', purchase_price: null, estimated_value: null }),
  ];
  const humidors = [{ id: 'h1', name: 'Cabinet', capacity_count: 100, current_count: 40 }];
  const readingsByHumidor = { h1: [{ recorded_at: '2026-01-01T10:00:00Z', humidity_rh: 90, temperature_f: 68 }] };

  const metrics = buildDashboardMetrics({ cigars, humidors, readingsByHumidor, ratings: [], now: NOW });

  it('covers every dashboard group the request names', () => {
    const groups = new Set(metrics.map((m) => m.group));
    ['composition', 'storage', 'documentation', 'aging', 'environment', 'ratings', 'value'].forEach((group) => {
      expect(groups.has(group)).toBe(true);
    });
  });

  it('gives every metric a drill-down target', () => {
    metrics.forEach((metric) => {
      expect(metric.params).toBeTypeOf('object');
      expect(buildDrilldownQuery(metric.params)).toBeTypeOf('string');
      (metric.breakdown || []).forEach((row) => {
        expect(row.params).toBeTypeOf('object');
      });
    });
  });

  it('counts composition and storage honestly', () => {
    const records = metrics.find((m) => m.id === 'composition_records');
    expect(records.value).toBe(2);
    const storage = metrics.find((m) => m.id === 'storage_assigned');
    expect(storage.value).toBe(1);
    expect(storage.caption).toContain('1 not assigned');
    const environment = metrics.find((m) => m.id === 'environment');
    expect(environment.value).toBe(1);
    expect(environment.caption).toContain('outside your band');
  });

  it('builds a query string that skips empty values', () => {
    expect(buildDrilldownQuery({ preset: 'docs_missing', humidor: '', condition: null })).toBe('preset=docs_missing');
  });

  it('groups metrics without empty groups', () => {
    const groups = groupDashboardMetrics(metrics);
    expect(groups.length).toBeGreaterThan(0);
    groups.forEach((group) => expect(group.metrics.length).toBeGreaterThan(0));
  });

  it('carries no commercial or consumption metric', () => {
    const text = JSON.stringify(metrics).toLowerCase();
    ['restock', 'buy', 'shop', 'retailer', 'discount', 'schedule'].forEach((word) => {
      expect(text).not.toContain(word);
    });
  });
});

describe('collection brief', () => {
  it('describes the collection without directing the collector', () => {
    const brief = buildCigarCollectionBrief({
      cigars: [cigar(), cigar({ id: 'c2', humidor_id: null, wrapper: '' })],
      humidors: [{ id: 'h1', name: 'Cabinet', capacity_count: 100 }],
      readingsByHumidor: { h1: [{ recorded_at: '2026-01-01T10:00:00Z', humidity_rh: 90, temperature_f: 68 }] },
      ratings: [{ cigar_id: 'c1', rated_at: '2026-01-01', draw: 4 }],
      now: NOW,
    });
    const text = briefToText(brief);
    expect(brief.sections.map((s) => s.title)).toEqual([
      'Composition',
      'Storage',
      'Environment',
      'Aging and condition',
      'Ratings',
      'Documentation',
    ]);
    expect(text).toContain('2 cigar records');
    ['restock', 'recommend', 'you should', 'buy', 'purchase'].forEach((word) => {
      expect(text.toLowerCase()).not.toContain(word);
    });
  });

  it('handles an empty collection without inventing data', () => {
    const brief = buildCigarCollectionBrief({ cigars: [] });
    expect(brief.sections).toHaveLength(0);
    expect(brief.headline).toContain('No cigars');
  });
});