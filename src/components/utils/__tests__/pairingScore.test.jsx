/**
 * Unit tests for canonical pairing scorer
 */

import { scorePipeBlend, isAromaticBlend, getAromaticIntensity, buildPairingsForPipes } from '../pairingScoreCanonical';

// Test fixtures
const testBlends = [
  {
    id: 'b1',
    name: 'Peterson Irish Flake',
    blend_type: 'Virginia',
    strength: 'Medium',
    category: 'non_aromatic'
  },
  {
    id: 'b2',
    name: 'Lane 1Q',
    blend_type: 'Aromatic',
    strength: 'Mild',
    category: 'aromatic',
    aromatic_intensity: 'light'
  },
  {
    id: 'b3',
    name: 'Captain Black',
    blend_type: 'Aromatic',
    strength: 'Medium',
    category: 'aromatic',
    aromatic_intensity: 'medium'
  },
  {
    id: 'b4',
    name: 'Nightcap',
    blend_type: 'English',
    strength: 'Full',
    category: 'non_aromatic'
  },
  {
    id: 'b5',
    name: 'Early Morning Pipe',
    blend_type: 'English/Balkan',
    strength: 'Medium',
    category: 'non_aromatic'
  }
];

const testPipes = [
  {
    pipe_id: 'p1',
    pipe_name: 'Savinelli Aromatic Pipe',
    bowl_variant_id: null,
    focus: ['Aromatic'],
    shape: 'Billiard'
  },
  {
    pipe_id: 'p2',
    pipe_name: 'Peterson English Pipe',
    bowl_variant_id: null,
    focus: ['English', 'Balkan'],
    shape: 'Bent'
  },
  {
    pipe_id: 'p3',
    pipe_name: 'Utility Pipe',
    bowl_variant_id: null,
    focus: ['Versatile'],
    shape: 'Dublin'
  }
];

describe('Blend Category Inference', () => {
  test('classifies aromatic blends correctly', () => {
    expect(isAromaticBlend(testBlends[1])).toBe(true);
    expect(isAromaticBlend(testBlends[2])).toBe(true);
  });

  test('classifies non-aromatic blends correctly', () => {
    expect(isAromaticBlend(testBlends[0])).toBe(false);
    expect(isAromaticBlend(testBlends[3])).toBe(false);
  });
});

describe('Aromatic Intensity', () => {
  test('uses explicit field when available', () => {
    expect(getAromaticIntensity(testBlends[1])).toBe('light');
    expect(getAromaticIntensity(testBlends[2])).toBe('medium');
  });

  test('falls back to strength when no explicit field', () => {
    const blend = { blend_type: 'Aromatic', strength: 'Full' };
    expect(getAromaticIntensity(blend)).toBe('heavy');
  });
});

describe('Aromatic vs Non-Aromatic Filtering', () => {
  test('aromatic-only pipe filters out non-aromatics', () => {
    const pipe = { focus: ['Aromatic'] };
    const result = scorePipeBlend(pipe, testBlends[0], null); // Virginia
    expect(result.score).toBe(0);
    expect(result.why).toContain('dedicated to aromatics');
  });

  test('non-aromatic pipe filters out aromatics', () => {
    const pipe = { focus: ['English'] };
    const result = scorePipeBlend(pipe, testBlends[1], null); // Lane 1Q
    expect(result.score).toBe(0);
    expect(result.why).toContain('dedicated to non-aromatics');
  });

  test('versatile pipe accepts both', () => {
    const pipe = { focus: ['Versatile'] };
    const aroResult = scorePipeBlend(pipe, testBlends[1], null);
    const nonAroResult = scorePipeBlend(pipe, testBlends[0], null);
    expect(aroResult.score).toBeGreaterThan(0);
    expect(nonAroResult.score).toBeGreaterThan(0);
  });
});

describe('Keyword Matching', () => {
  test('exact name match returns 10', () => {
    const pipe = { focus: ['Peterson Irish Flake'] };
    const result = scorePipeBlend(pipe, testBlends[0], null);
    expect(result.score).toBe(10);
  });

  test('blend type keyword match boosts score', () => {
    const pipe = { focus: ['English', 'Balkan'] };
    const result = scorePipeBlend(pipe, testBlends[4], null); // Early Morning Pipe
    expect(result.score).toBeGreaterThan(6);
  });
});

describe('Deterministic Sorting', () => {
  test('top recommendations are consistently ordered', () => {
    const pairings = buildPairingsForPipes(testPipes, testBlends, null);
    
    // Run twice - should be identical
    const pairings2 = buildPairingsForPipes(testPipes, testBlends, null);
    
    expect(pairings).toEqual(pairings2);
    
    // Top recs should be sorted descending
    pairings.forEach(p => {
      const scores = p.recommendations.map(r => r.score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    });
  });
});

// Export test fixtures for use in other tests
export const TEST_FIXTURES = {
  blends: testBlends,
  pipes: testPipes
};