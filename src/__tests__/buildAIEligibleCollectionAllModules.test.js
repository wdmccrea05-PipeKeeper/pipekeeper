/**
 * buildAIEligibleCollection — all-module parity tests
 *
 * Verifies that the updated buildAIEligibleCollection includes
 * cigars/cigarSessions and wines/wineTastings when the relevant
 * modules are enabled.
 */

import { describe, it, expect } from 'vitest';
import { buildAIEligibleCollection } from '@/components/utils/moduleAccess';

const MOCK_WINES = [{ id: 'w1', name: 'Test Merlot' }];
const MOCK_WINE_TASTINGS = [{ id: 'wt1', wine_id: 'w1' }];
const MOCK_CIGARS = [{ id: 'c1', name: 'Test Cigar' }];
const MOCK_CIGAR_SESSIONS = [{ id: 'cs1', cigar_id: 'c1' }];
const MOCK_PIPES = [{ id: 'p1', name: 'Test Pipe' }];
const MOCK_BLENDS = [{ id: 'b1', name: 'Test Blend' }];
const MOCK_BOTTLES = [{ id: 'bt1', name: 'Test Bottle' }];

// Shared full collection fixture
const fullCollections = {
  pipes: MOCK_PIPES,
  blends: MOCK_BLENDS,
  bottles: MOCK_BOTTLES,
  cigars: MOCK_CIGARS,
  cigarSessions: MOCK_CIGAR_SESSIONS,
  wines: MOCK_WINES,
  wineTastings: MOCK_WINE_TASTINGS,
};

// ─── All modules enabled ──────────────────────────────────────────────────────

describe('buildAIEligibleCollection — all modules enabled', () => {
  // moduleStates where every launched module is enabled:
  // In the test env: pipekeeper, whiskeykeeper, cigarkeeper are launched; winekeeper is internal.
  const allEnabledStates = {
    pipekeeper: true,
    whiskeykeeper: true,
    cigarkeeper: true,
    // winekeeper is 'internal' in the test env → moduleExists returns false → never AI-eligible via states alone
  };

  it('returns pipes when pipekeeper is enabled', () => {
    const result = buildAIEligibleCollection(allEnabledStates, fullCollections);
    expect(result.pipes).toEqual(MOCK_PIPES);
    expect(result.blends).toEqual(MOCK_BLENDS);
  });

  it('returns bottles when whiskeykeeper is enabled', () => {
    const result = buildAIEligibleCollection(allEnabledStates, fullCollections);
    expect(result.bottles).toEqual(MOCK_BOTTLES);
  });

  it('returns cigars and cigarSessions when cigarkeeper is enabled', () => {
    const result = buildAIEligibleCollection(allEnabledStates, fullCollections);
    expect(result.cigars).toEqual(MOCK_CIGARS);
    expect(result.cigarSessions).toEqual(MOCK_CIGAR_SESSIONS);
  });
});

// ─── CigarKeeper disabled ─────────────────────────────────────────────────────

describe('buildAIEligibleCollection — cigarkeeper disabled', () => {
  const cigarDisabledStates = {
    pipekeeper: true,
    whiskeykeeper: true,
    cigarkeeper: false,
  };

  it('returns empty cigars when cigarkeeper is disabled', () => {
    const result = buildAIEligibleCollection(cigarDisabledStates, fullCollections);
    expect(result.cigars).toEqual([]);
  });

  it('returns empty cigarSessions when cigarkeeper is disabled', () => {
    const result = buildAIEligibleCollection(cigarDisabledStates, fullCollections);
    expect(result.cigarSessions).toEqual([]);
  });

  it('pipes and bottles are unaffected when cigarkeeper is disabled', () => {
    const result = buildAIEligibleCollection(cigarDisabledStates, fullCollections);
    expect(result.pipes).toEqual(MOCK_PIPES);
    expect(result.bottles).toEqual(MOCK_BOTTLES);
  });
});

// ─── WineKeeper internal in test env → not AI-eligible ───────────────────────

describe('buildAIEligibleCollection — winekeeper internal (test env)', () => {
  const states = { pipekeeper: true, whiskeykeeper: true, cigarkeeper: true, winekeeper: true };

  it('wines are empty when winekeeper is not launched (internal in test env)', () => {
    // moduleExists('winekeeper') returns false in the test env because it is 'internal'
    const result = buildAIEligibleCollection(states, fullCollections);
    expect(result.wines).toEqual([]);
  });

  it('wineTastings are empty when winekeeper is not launched', () => {
    const result = buildAIEligibleCollection(states, fullCollections);
    expect(result.wineTastings).toEqual([]);
  });
});

// ─── Result always includes all expected keys ─────────────────────────────────

describe('buildAIEligibleCollection — result shape', () => {
  it('always returns all seven keys regardless of module states', () => {
    const result = buildAIEligibleCollection({}, fullCollections);
    expect(result).toHaveProperty('pipes');
    expect(result).toHaveProperty('blends');
    expect(result).toHaveProperty('bottles');
    expect(result).toHaveProperty('cigars');
    expect(result).toHaveProperty('cigarSessions');
    expect(result).toHaveProperty('wines');
    expect(result).toHaveProperty('wineTastings');
  });

  it('all values are arrays', () => {
    const result = buildAIEligibleCollection({}, {});
    Object.values(result).forEach((v) => expect(Array.isArray(v)).toBe(true));
  });
});
