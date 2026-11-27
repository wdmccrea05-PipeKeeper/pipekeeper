/* eslint-disable */
/**
 * Collection Intelligence 2.0 — shared collection services.
 *
 * Covers the provenance and condition-history services plus the guard-rail that
 * keeps valuation consolidated in one engine.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  normalizeAcquisition,
  buildProvenanceTimeline,
  computeProvenanceCompleteness,
  buildProvenanceSummary,
} from '../lib/collection/provenance.js';
import {
  buildConditionTimeline,
  computeConditionTrajectory,
  buildConditionHistory,
  CONDITION_EVENT_KINDS,
} from '../lib/collection/conditionHistory.js';

// Source guard-rails read files relative to the app root (vitest cwd).
const read = (relative) => fs.readFileSync(relative, 'utf8');

describe('provenance — acquisition normalisation', () => {
  it('ignores records that were never acquired', () => {
    expect(normalizeAcquisition(null)).toBeNull();
    expect(normalizeAcquisition({ name: 'Wanted tin', status: 'wanted' })).toBeNull();
  });

  it('treats an acquired record with a date as provenance', () => {
    const entry = normalizeAcquisition({
      id: 'a1',
      name: 'Escudo Navy De Luxe',
      item_type: 'tobacco',
      brand: 'STG',
      status: 'acquired',
      acquired_date: '2019-03-04',
      source: 'Estate sale',
      estimated_price: 18,
    });
    expect(entry.kind).toBe('acquisition');
    expect(entry.acquiredDate).toMatch(/^2019-03-04/);
    expect(entry.source).toBe('Estate sale');
    expect(entry.pricePaid).toBe(18);
  });

  it('keeps an acquired record without a date rather than dropping it', () => {
    const entry = normalizeAcquisition({ name: 'Unknown tin', status: 'acquired' });
    expect(entry).not.toBeNull();
    expect(entry.acquiredDate).toBeNull();
  });
});

describe('provenance — timeline', () => {
  it('orders dated entries ascending and places undated entries last', () => {
    const timeline = buildProvenanceTimeline([
      { name: 'Later', acquired_date: '2021-01-01' },
      { name: 'Undated', status: 'acquired' },
      { name: 'Earlier', acquired_date: '2015-06-01' },
    ]);
    expect(timeline.map((e) => e.name)).toEqual(['Earlier', 'Later', 'Undated']);
  });

  it('returns an empty timeline for missing input', () => {
    expect(buildProvenanceTimeline()).toEqual([]);
    expect(buildProvenanceTimeline(null)).toEqual([]);
  });
});

describe('provenance — completeness', () => {
  it('scores documented fields and reports what is missing', () => {
    const result = computeProvenanceCompleteness(
      { maker: 'Dunhill', year_made: '1968', stamping: 'DR' },
      'pipekeeper'
    );
    expect(result.score).toBe(50);
    expect(result.present).toEqual(['Maker', 'Year made or era', 'Stamping or markings']);
    expect(result.missing).toContain('Acquisition cost');
  });

  it('scores zero for a missing item', () => {
    const result = computeProvenanceCompleteness(null, 'pipekeeper');
    expect(result.score).toBe(0);
    expect(result.missing.length).toBe(6);
  });

  it('falls back to generic fields for an unknown module', () => {
    const result = computeProvenanceCompleteness({ name: 'Item', notes: 'note' }, 'futurekeeper');
    expect(result.present).toEqual(['Name', 'Notes']);
    expect(result.score).toBe(67);
  });
});

describe('provenance — summary', () => {
  it('reports whether any provenance exists', () => {
    const summary = buildProvenanceSummary({
      item: { maker: 'Castello', provenance_notes: 'Bought from the original owner' },
      moduleKey: 'pipekeeper',
      acquisitions: [{ name: 'Castello', acquired_date: '2018-02-02' }],
    });
    expect(summary.hasProvenance).toBe(true);
    expect(summary.timeline.length).toBe(1);
    expect(summary.completeness.score).toBeGreaterThan(0);
  });

  it('reports no provenance for an undocumented item', () => {
    const summary = buildProvenanceSummary({ item: {}, moduleKey: 'winekeeper' });
    expect(summary.hasProvenance).toBe(false);
  });
});

describe('condition history — timeline', () => {
  it('merges maintenance, humidor and cellar logs into one descending timeline', () => {
    const timeline = buildConditionTimeline({
      maintenanceLogs: [
        { id: 'm1', maintenance_type: 'Ream and polish', date: '2022-05-01', description: 'Cleaned chamber' },
      ],
      humidorLogs: [
        {
          id: 'h1',
          event_type: 'Recharge',
          date: '2023-01-10',
          humidity_reading: 69,
          temperature_reading: 70,
        },
      ],
      cellarLogs: [{ id: 'c1', transaction_type: 'added', date: '2021-09-09', amount_oz: 8 }],
    });

    expect(timeline.map((e) => e.id)).toEqual(['h1', 'm1', 'c1']);
    expect(timeline[0].kind).toBe(CONDITION_EVENT_KINDS.ENVIRONMENT);
    expect(timeline[0].detail).toMatch(/69% RH/);
    expect(timeline[2].kind).toBe(CONDITION_EVENT_KINDS.INVENTORY);
  });

  it('drops events with no usable date', () => {
    const timeline = buildConditionTimeline({
      maintenanceLogs: [{ id: 'x', maintenance_type: 'Clean' }],
    });
    expect(timeline).toEqual([]);
  });
});

describe('condition history — trajectory', () => {
  const event = (label, detail, iso) => ({
    label,
    detail,
    date: new Date(iso),
    kind: CONDITION_EVENT_KINDS.MAINTENANCE,
  });

  it('is unknown without enough evidence', () => {
    expect(computeConditionTrajectory([]).direction).toBe('unknown');
    expect(computeConditionTrajectory([event('Cleaned', '', '2024-01-01')]).direction).toBe('unknown');
  });

  it('reports improvement when repairs outweigh damage', () => {
    const trajectory = computeConditionTrajectory([
      event('Restored', 'Stem polished and reamed', '2024-04-01'),
      event('Cleaned', 'Chamber reconditioned', '2024-02-01'),
      event('Inspected', 'Minor chip noted', '2024-01-01'),
    ]);
    expect(trajectory.direction).toBe('improving');
    expect(trajectory.eventCount).toBe(3);
  });

  it('reports decline when damage outweighs repairs', () => {
    const trajectory = computeConditionTrajectory([
      event('Inspected', 'Crack developing at the shank', '2024-04-01'),
      event('Inspected', 'Humidor dried out', '2024-03-01'),
    ]);
    expect(trajectory.direction).toBe('declining');
  });

  it('reports stable when care events carry no condition signal', () => {
    const trajectory = computeConditionTrajectory([
      event('Recharge', '', '2024-04-01'),
      event('Recharge', '', '2024-02-01'),
    ]);
    expect(trajectory.direction).toBe('stable');
  });

  it('buildConditionHistory returns timeline and trajectory together', () => {
    const result = buildConditionHistory({
      maintenanceLogs: [
        { maintenance_type: 'Cleaned', date: '2024-01-01', description: 'Routine' },
        { maintenance_type: 'Restored', date: '2024-06-01', description: 'Stem repair' },
      ],
    });
    expect(result.timeline.length).toBe(2);
    expect(result.trajectory.direction).toBe('improving');
  });
});

describe('valuation consolidation guard-rail', () => {
  it('routes keeper-core value aggregation through the canonical engine', () => {
    const source = read('src/components/keeper-core/value/valueAggregation.jsx');
    expect(source).toMatch(/computeCurrentValue/);
    expect(source).toMatch(/from '@\/components\/valuation\/valueEngine'/);
    expect(source).not.toMatch(/pipe\.estimated_value \|\| pipe\.purchase_price/);
    expect(source).not.toMatch(/blend\.manual_market_value \|\| blend\.ai_estimated_value \|\| 0;\s*\n\}/);
  });

  it('exposes a wine value path that the module registry can call', () => {
    const source = read('src/components/keeper-core/value/valueAggregation.jsx');
    expect(source).toMatch(/export function getWineValue/);
    expect(source).toMatch(/case 'wines':/);
  });

  it('composes the boundary clause into the Curator prompt', () => {
    const source = read('src/lib/curator/curatorSystemPrompt.js');
    expect(source).toMatch(/CURATOR_BOUNDARY_CLAUSE/);
    expect(source).toMatch(/src\/lib\/collection\/boundaries\.js|@\/lib\/collection\/boundaries\.js/);
  });
});