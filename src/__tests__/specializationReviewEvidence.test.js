import { describe, expect, it } from 'vitest';
import { buildSpecializationReview } from '@/lib/curator/specializationReview';

/**
 * Regression: a family the pipe has actually been smoked with must never be
 * presented as "no sessions recorded". The Boswell Jumbo case had 12 sessions
 * (5 Burley, 4 Virginia, 2 Aromatic, 1 blend no longer in the cellar) while the
 * review claimed Virginia and Aromatic had no session history.
 */
const pipe = {
  id: 'pipe-boswell',
  name: 'Boswell Jumbo',
  shape: 'Billiard',
  bend: '1/4 Bent',
  bowl_material: 'Briar',
  finish: 'Rusticated',
  stem_material: 'Acrylic',
  chamber_volume: 'Extra Large',
  bowl_depth_mm: 38.1,
  bowl_diameter_mm: 25.4,
  weight_grams: 167.83,
  length_mm: 177.8,
  filter_type: 'None',
  condition: 'Mint',
  focus: ['Aromatic'],
};

const blend = (id, name, blend_type, blend_family) => ({ id, name, blend_type, blend_family });

const blends = [
  blend('b-va', 'Riverboat Queen', 'Virginia', 'virginia'),
  blend('b-ar1', 'Milk & Honey', 'Aromatic', ''),
  blend('b-ar2', 'Autumn Evening', 'Aromatic', 'aromatic'),
  blend('b-bu1', 'Lane 1-Q', 'Codger Blend', 'burley'),
  blend('b-bu2', 'Cowboy Coffee', 'Burley-based', 'burley'),
  blend('b-bu3', "Shepherd's Pie", 'Burley-based', 'burley'),
  blend('b-en', 'Nightcap', 'English', 'English'),
  blend('b-vp', 'Escudo Navy De Luxe', 'Virginia/Perique', ''),
];

const log = (id, blend_id) => ({ id, pipe_id: pipe.id, blend_id });

const logs = [
  ...Array.from({ length: 4 }, (_, i) => log(`va-${i}`, 'b-va')),
  log('ar-1', 'b-ar1'),
  log('ar-2', 'b-ar2'),
  log('bu-1', 'b-bu1'),
  ...Array.from({ length: 3 }, (_, i) => log(`bu-${i}`, 'b-bu2')),
  log('bu-4', 'b-bu3'),
  log('gone', 'b-deleted-blend'),
];

describe('specialization review matches the session records', () => {
  const review = buildSpecializationReview({ pipe, smokingLogs: logs, blends });

  it('counts every logged session against this pipe', () => {
    expect(review.evidence.sessionCount).toBe(12);
    const families = Object.fromEntries(review.evidence.families.map((f) => [f.family, f.count]));
    expect(families).toEqual({ Burley: 5, Virginia: 4, Aromatic: 2 });
  });

  it('reports the session count for every family the pipe was smoked with', () => {
    const byFamily = Object.fromEntries(review.alternatives.map((alt) => [alt.classification, alt]));
    expect(byFamily.Burley.rationale).toContain('5 of 12 logged sessions');
    expect(byFamily.Virginia.rationale).toContain('4 of 12 logged sessions');
    expect(byFamily.Aromatic.rationale).toContain('2 of 12 logged sessions');
    expect(byFamily.Virginia.basis).toBe('session history');
    expect(byFamily.Aromatic.basis).toBe('session history');
  });

  it('never claims a smoked family has no sessions', () => {
    for (const family of ['Burley', 'Virginia', 'Aromatic']) {
      const alternative = review.alternatives.find((alt) => alt.classification === family);
      expect(alternative.rationale).not.toMatch(/No sessions/i);
    }
  });

  it('reserves the characteristic-only basis for families with no sessions', () => {
    const smoked = new Set(review.evidence.families.map((f) => f.family));
    for (const alt of review.alternatives.filter((a) => a.basis === 'pipe characteristics only')) {
      expect(smoked.has(alt.classification)).toBe(false);
      expect(alt.rationale).toMatch(/No sessions with .* blends are recorded/i);
    }
  });

  it('keeps the dominant family first and its own confidence', () => {
    expect(review.alternatives[0].classification).toBe('Burley');
    expect(review.evidence.dominantFamily).toBe('Burley');
    expect(review.pairingScoresUsed).toBe(false);
  });
});