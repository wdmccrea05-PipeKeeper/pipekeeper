/* eslint-disable */
/**
 * Collection Intelligence 2.0 — product boundary policy.
 *
 * Guard-rail tests for src/lib/collection/boundaries.js. These lock the
 * mandatory product boundaries so Curator instructions, reports and copy cannot
 * drift into purchasing, retail or marketplace behaviour.
 */

import { describe, it, expect } from 'vitest';
import {
  PERMITTED_CAPABILITIES,
  EXCLUDED_CAPABILITIES,
  CURATOR_BOUNDARY_CLAUSE,
  classifyText,
  isWithinBoundaries,
  assertWithinBoundaries,
  classifyGeneratedCopy,
  isPermittedCapability,
  isExcludedCapability,
} from '../lib/collection/boundaries.js';

describe('permitted capabilities', () => {
  it('registers every permitted lane named by the product brief', () => {
    const required = [
      'historical_acquisition_record',
      'provenance',
      'collection_valuation',
      'condition_documentation',
      'inventory_analytics',
      'educational_information',
      'insurance_documentation',
      'estate_planning',
    ];
    for (const key of required) {
      expect(PERMITTED_CAPABILITIES).toContain(key);
      expect(isPermittedCapability(key)).toBe(true);
    }
  });

  it('rejects an unregistered capability key', () => {
    expect(isPermittedCapability('retailer_price_feed')).toBe(false);
  });
});

describe('excluded capabilities', () => {
  it('registers every excluded lane named by the product brief', () => {
    const keys = EXCLUDED_CAPABILITIES.map((lane) => lane.key);
    expect(keys).toEqual([
      'live_retailer_price_comparison',
      'retailer_availability_monitoring',
      'purchasing_recommendation',
      'shopping_links',
      'discount_alerts',
      'marketplace_or_trading',
      'purchasing_optimization',
    ]);
    expect(isExcludedCapability('purchasing_recommendation')).toBe(true);
    expect(isExcludedCapability('provenance')).toBe(false);
  });

  it.each([
    ['live retailer price comparison', 'Here is a live price comparison across three retailers.'],
    ['retailer availability monitoring', 'This blend is back in stock at your local shop.'],
    ['purchasing recommendation', 'You should buy the 2019 release before it disappears.'],
    ['shopping links', 'Tap the shop now link in the reply.'],
    ['discount alerts', 'I will set a price drop alert for this tin.'],
    ['marketplace or trading', 'List it for sale and take the best offer.'],
    ['purchasing optimization', 'The best time to buy is the first week of December.'],
  ])('flags %s', (_lane, copy) => {
    const result = classifyText(copy);
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

describe('permitted documentation copy', () => {
  it.each([
    ['acquisition history', 'This pipe was acquired in 1998 and has stayed in one collection since.'],
    ['valuation', 'Insurance replacement value is estimated at 1,850 USD based on two prior appraisals.'],
    ['condition', 'The chamber shows light carbon build-up; the stem is original and undamaged.'],
    ['provenance', 'The stamping reads 1968 and the estate paperwork names the original owner.'],
    ['estate planning', 'The estate plan allocates the whiskey collection across two beneficiaries.'],
    ['inventory analytics', 'You hold 14 tins across three blends, with two below your reorder threshold.'],
  ])('allows %s copy', (_lane, copy) => {
    expect(isWithinBoundaries(copy)).toBe(true);
  });

  it('allows empty and non-string input', () => {
    expect(isWithinBoundaries('')).toBe(true);
    expect(isWithinBoundaries(null)).toBe(true);
  });
});

describe('assertWithinBoundaries', () => {
  it('throws with the offending lane name', () => {
    expect(() => assertWithinBoundaries('Add to cart to reserve your bottle.', 'report body')).toThrow(
      /outside CollectionKeeper product boundaries/i
    );
  });

  it('returns the copy when it is inside the boundary', () => {
    expect(assertWithinBoundaries('Recorded acquisition date: 2011-04-02.')).toMatch(/2011-04-02/);
  });
});

describe('Curator boundary clause', () => {
  it('names the excluded lanes it must prevent', () => {
    expect(CURATOR_BOUNDARY_CLAUSE).toMatch(/retailer prices/i);
    expect(CURATOR_BOUNDARY_CLAUSE).toMatch(/shopping or affiliate links/i);
    expect(CURATOR_BOUNDARY_CLAUSE).toMatch(/marketplaces or trading platforms/i);
    expect(CURATOR_BOUNDARY_CLAUSE).toMatch(/does not promote or facilitate/i);
  });

  it('is exempt from its own scan so a composed prompt can be validated', () => {
    expect(classifyGeneratedCopy(CURATOR_BOUNDARY_CLAUSE).allowed).toBe(true);
    expect(classifyGeneratedCopy('Compare prices at three retailers today.').allowed).toBe(false);
  });
});