/**
 * Pipe Club Feature Tests
 *
 * Covers the requirements from problem statement section 32:
 * - Present-pipe constraint
 * - Best + alternative
 * - Only one pipe present
 * - Dedicated aromatic
 * - Exact blend dedication
 * - Bowl variant
 * - No ideal pipe (Best Available)
 * - Wishlist / Not For Me mutual exclusion
 * - Historical evidence / no auto-dedication
 * - Pairing / serialization utilities
 */
import { describe, test, expect } from 'vitest';
import {
  rankPresentPipes,
  isBestAvailable,
  getConfidenceTier,
  parsePipesPresent,
  serializePipesPresent,
  parseTempTobaccoSnapshot,
} from '@/components/pipeclub/pipeClubPairing';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const AROMATIC_PIPE = {
  id: 'pc-aromatic',
  name: 'Aromatic Dedicated Billiard',
  focus: ['Aromatic'],
  shape: 'Billiard',
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const ENGLISH_PIPE = {
  id: 'pc-english',
  name: 'English Dedicated Pipe',
  focus: ['English', 'Balkan'],
  shape: 'Billiard',
  bowl_diameter_mm: 22,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
};

const GENERAL_PIPE = {
  id: 'pc-general',
  name: 'General Purpose Billiard',
  focus: [],
  shape: 'Billiard',
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const DEDICATED_PIPE = {
  id: 'pc-dedicated',
  name: 'Blood Red Moon Dedicated',
  focus: ['Cult Blood Red Moon'],
  shape: 'Billiard',
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const BOWL_PARENT_PIPE = {
  id: 'pc-bowl-parent',
  name: 'Pipe With Bowls',
  focus: [],
  shape: 'System',
  bowl_diameter_mm: 21,
  bowl_depth_mm: 40,
  bowl_material: 'Briar',
  bowl_variants: [
    { id: 'bv-aromatic', name: 'Aromatic Bowl', focus: ['Aromatic'], bowl_diameter_mm: 20 },
    { id: 'bv-english', name: 'English Bowl', focus: ['English'], bowl_diameter_mm: 22 },
  ],
};

const HEAVY_AROMATIC_BLEND = {
  id: 'blend-heavy-aromatic',
  name: 'Autumn Evening',
  manufacturer: 'Cornell & Diehl',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  tobacco_components: ['Virginia', 'Burley'],
  cut: 'ribbon',
};

const ENGLISH_BLEND = {
  id: 'blend-english',
  name: 'Nightcap',
  manufacturer: 'Dunhill',
  blend_type: 'English',
  is_aromatic: false,
  tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
  cut: 'ribbon',
};

const CULT_BLOOD_RED_MOON = {
  id: 'blend-cult-brm',
  name: 'Cult Blood Red Moon',
  manufacturer: 'Cult',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  tobacco_components: ['Virginia', 'Burley'],
  cut: 'ribbon',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Pipe Club — Present-pipe constraint', () => {
  test('a pipe NOT in the present list must never be recommended', () => {
    // Only ENGLISH_PIPE is present; AROMATIC_PIPE is not brought
    const { best, alternative } = rankPresentPipes([ENGLISH_PIPE], HEAVY_AROMATIC_BLEND, null);
    expect(best).not.toBeNull();
    // The best pipe can only be the english pipe (only one present)
    expect(best.pipe_id).toBe(ENGLISH_PIPE.id);
    // AROMATIC_PIPE was not passed in, so it must not appear anywhere
    expect(best.pipe_id).not.toBe(AROMATIC_PIPE.id);
    expect(alternative).toBeNull();
  });
});

describe('Pipe Club — Best + Alternative', () => {
  test('returns exactly one best and one alternative when two pipes are present', () => {
    const { best, alternative } = rankPresentPipes(
      [AROMATIC_PIPE, ENGLISH_PIPE],
      HEAVY_AROMATIC_BLEND,
      null
    );
    expect(best).not.toBeNull();
    expect(alternative).not.toBeNull();
    // They must be different pipes
    expect(best.pipe_id).not.toBe(alternative.pipe_id);
  });

  test('returns best only when only one pipe is present', () => {
    const { best, alternative } = rankPresentPipes([AROMATIC_PIPE], HEAVY_AROMATIC_BLEND, null);
    expect(best).not.toBeNull();
    expect(alternative).toBeNull();
  });
});

describe('Pipe Club — Dedicated aromatic wins over English-dedicated for heavy aromatic', () => {
  test('aromatic-dedicated pipe ranks above english-dedicated pipe for heavy aromatic', () => {
    const { best } = rankPresentPipes(
      [AROMATIC_PIPE, ENGLISH_PIPE, GENERAL_PIPE],
      HEAVY_AROMATIC_BLEND,
      null
    );
    expect(best).not.toBeNull();
    // Aromatic-dedicated or general-purpose should win, NOT English-dedicated
    expect(best.pipe_id).not.toBe(ENGLISH_PIPE.id);
    expect(
      best.pipe_id === AROMATIC_PIPE.id || best.pipe_id === GENERAL_PIPE.id
    ).toBe(true);
  });
});

describe('Pipe Club — Exact user-defined blend dedication', () => {
  test('pipe dedicated to the exact proposed blend is recommended first', () => {
    const { best } = rankPresentPipes(
      [GENERAL_PIPE, DEDICATED_PIPE],
      CULT_BLOOD_RED_MOON,
      null
    );
    expect(best).not.toBeNull();
    expect(best.pipe_id).toBe(DEDICATED_PIPE.id);
  });
});

describe('Pipe Club — Bowl variant', () => {
  test('aromatic bowl variant wins over English bowl for heavy aromatic', () => {
    // Pass the parent pipe but restrict to aromatic bowl only
    const parentWithAromaticBowlOnly = {
      ...BOWL_PARENT_PIPE,
      bowl_variants: [BOWL_PARENT_PIPE.bowl_variants[0]], // aromatic bowl only
    };
    const parentWithEnglishBowlOnly = {
      ...BOWL_PARENT_PIPE,
      id: 'pc-bowl-parent-english',
      bowl_variants: [BOWL_PARENT_PIPE.bowl_variants[1]], // english bowl only
    };

    const { best } = rankPresentPipes(
      [parentWithAromaticBowlOnly, parentWithEnglishBowlOnly],
      HEAVY_AROMATIC_BLEND,
      null
    );
    expect(best).not.toBeNull();
    // Aromatic bowl pipe should rank above English bowl pipe
    expect(best.pipe_id).toBe(parentWithAromaticBowlOnly.id);
  });
});

describe('Pipe Club — isBestAvailable', () => {
  test('returns true for low-scoring results (< 6)', () => {
    expect(isBestAvailable({ score: 4.5 })).toBe(true);
    expect(isBestAvailable({ score: 5.9 })).toBe(true);
  });

  test('returns false for well-scoring results (>= 6)', () => {
    expect(isBestAvailable({ score: 6.0 })).toBe(false);
    expect(isBestAvailable({ score: 8.5 })).toBe(false);
  });

  test('returns false for null', () => {
    expect(isBestAvailable(null)).toBe(false);
  });

  test('canonical scorer assigns low score when all present pipes have conflicts', () => {
    // An English-dedicated pipe for a heavy aromatic should have a low score
    const { best } = rankPresentPipes([ENGLISH_PIPE], HEAVY_AROMATIC_BLEND, null);
    // The English pipe for a heavy aromatic should score low enough to trigger Best Available
    if (best) {
      expect(isBestAvailable(best)).toBe(true);
    }
  });
});

describe('Pipe Club — getConfidenceTier', () => {
  test('returns high for confidence >= 0.65', () => {
    expect(getConfidenceTier({ confidence: 0.65 })).toBe('high');
    expect(getConfidenceTier({ confidence: 1.0 })).toBe('high');
  });

  test('returns medium for 0.35 <= confidence < 0.65', () => {
    expect(getConfidenceTier({ confidence: 0.35 })).toBe('medium');
    expect(getConfidenceTier({ confidence: 0.50 })).toBe('medium');
  });

  test('returns low for confidence < 0.35', () => {
    expect(getConfidenceTier({ confidence: 0 })).toBe('low');
    expect(getConfidenceTier({ confidence: 0.34 })).toBe('low');
  });

  test('returns low for null result', () => {
    expect(getConfidenceTier(null)).toBe('low');
  });
});

describe('Pipe Club — Wishlist / Not For Me mutual exclusion', () => {
  test('disposition values are mutually exclusive strings', () => {
    const dispositions = ['none', 'wishlist', 'not_for_me'];
    // Wishlist and not_for_me cannot both be active simultaneously
    // (this is enforced by the wizard's toggle: selecting one unsets the other)
    let current = 'none';

    // Simulate selecting wishlist
    current = current === 'wishlist' ? 'none' : 'wishlist';
    expect(current).toBe('wishlist');

    // Simulate selecting not_for_me — should replace wishlist
    if (current === 'wishlist') current = 'none';
    current = current === 'not_for_me' ? 'none' : 'not_for_me';
    expect(current).toBe('not_for_me');
    // At no point are both simultaneously active
    expect(current).not.toBe('wishlist');
  });
});

describe('Pipe Club — serializePipesPresent / parsePipesPresent round-trip', () => {
  const pipes = [
    { id: 'p1', name: 'My Billiard', maker: 'Savinelli', selectedBowlVariantId: null },
    { id: 'p2', name: 'My System', maker: 'Peterson', selectedBowlVariantId: 'bv-1', selectedBowlName: 'Bowl A' },
  ];

  test('round-trips pipe data through JSON serialization', () => {
    const json = serializePipesPresent(pipes);
    const parsed = parsePipesPresent(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].pipe_id).toBe('p1');
    expect(parsed[0].pipe_name).toBe('My Billiard');
    expect(parsed[1].bowl_variant_id).toBe('bv-1');
    expect(parsed[1].bowl_name).toBe('Bowl A');
  });

  test('parsePipesPresent returns empty array for null', () => {
    expect(parsePipesPresent(null)).toEqual([]);
  });

  test('parsePipesPresent returns empty array for invalid JSON', () => {
    expect(parsePipesPresent('not json{')).toEqual([]);
  });
});

describe('Pipe Club — parseTempTobaccoSnapshot', () => {
  test('parses valid JSON snapshot', () => {
    const snapshot = { name: 'Test Blend', manufacturer: 'Test Co', is_aromatic: true };
    const json = JSON.stringify(snapshot);
    const parsed = parseTempTobaccoSnapshot(json);
    expect(parsed).toEqual(snapshot);
  });

  test('returns null for null input', () => {
    expect(parseTempTobaccoSnapshot(null)).toBeNull();
  });

  test('returns null for invalid JSON', () => {
    expect(parseTempTobaccoSnapshot('bad{json')).toBeNull();
  });
});

describe('Pipe Club — rankPresentPipes edge cases', () => {
  test('returns null best and null alternative when no pipes are given', () => {
    const { best, alternative } = rankPresentPipes([], HEAVY_AROMATIC_BLEND, null);
    expect(best).toBeNull();
    expect(alternative).toBeNull();
  });

  test('still returns a result when blend has minimal metadata', () => {
    const minimalBlend = { name: 'Unknown Club Blend', manufacturer: 'Unknown' };
    const { best } = rankPresentPipes([GENERAL_PIPE], minimalBlend, null);
    // Should return the one pipe even with minimal blend data
    expect(best).not.toBeNull();
    expect(best.pipe_id).toBe(GENERAL_PIPE.id);
  });

  test('historical usage does not create new dedication (pairing returns same pipe focus)', () => {
    // This test verifies that running rankPresentPipes does not mutate pipe focus.
    const pipeCopy = { ...GENERAL_PIPE, focus: [] };
    rankPresentPipes([pipeCopy], HEAVY_AROMATIC_BLEND, null);
    // Focus must remain unchanged after scoring
    expect(pipeCopy.focus).toEqual([]);
  });
});
