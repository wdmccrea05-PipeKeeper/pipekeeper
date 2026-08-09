/**
 * Unit tests for the canonical multi-dimensional pairing scorer.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  isAromaticBlend,
  inferBlendCategory,
  getAromaticIntensity,
  buildPairingsForPipes,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  COMPONENT_WEIGHTS,
  rankPipesForBlend,
} from '../pairingScoreCanonical';

// Test fixtures
const testBlends = [
  {
    id: 'b1',
    name: 'Peterson Irish Flake',
    blend_type: 'Virginia',
    cut: 'Flake',
    tobacco_components: ['Virginia'],
    strength: 'Medium',
  },
  {
    id: 'b2',
    name: 'Lane 1Q',
    blend_type: 'Aromatic',
    cut: 'Ribbon',
    strength: 'Mild',
    aromatic_intensity: 'light',
  },
  {
    id: 'b3',
    name: 'Captain Black',
    blend_type: 'Aromatic',
    cut: 'Ribbon',
    strength: 'Medium',
    aromatic_intensity: 'medium',
  },
  {
    id: 'b4',
    name: 'Nightcap',
    blend_type: 'English',
    cut: 'Ribbon',
    tobacco_components: ['Latakia', 'Virginia', 'Oriental', 'Perique'],
    strength: 'Full',
  },
  {
    id: 'b5',
    name: 'Early Morning Pipe',
    blend_type: 'English Balkan',
    cut: 'Ribbon',
    tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
    strength: 'Medium',
  },
];

const testPipes = [
  {
    pipe_id: 'p1',
    pipe_name: 'Savinelli Aromatic Pipe',
    bowl_variant_id: null,
    focus: ['Aromatic'],
    shape: 'Billiard',
    bowl_diameter_mm: 20,
    bowl_depth_mm: 38,
    bowl_material: 'Briar',
  },
  {
    pipe_id: 'p2',
    pipe_name: 'Peterson English Pipe',
    bowl_variant_id: null,
    focus: ['English', 'Balkan'],
    shape: 'Billiard',
    bowl_diameter_mm: 22,
    bowl_depth_mm: 38,
    bowl_material: 'Briar',
  },
  {
    pipe_id: 'p3',
    pipe_name: 'Utility Pipe',
    bowl_variant_id: null,
    focus: ['Versatile'],
    shape: 'Dublin',
    bowl_diameter_mm: 19,
    bowl_depth_mm: 38,
    bowl_material: 'Briar',
  },
];

describe('Blend Category Inference', () => {
  test('classifies aromatic blends correctly', () => {
    expect(isAromaticBlend(testBlends[1])).toBe(true);
    expect(isAromaticBlend(testBlends[2])).toBe(true);
  });

  test('classifies structurally non-aromatic blends correctly', () => {
    expect(inferBlendCategory(testBlends[0])).toBe('non_aromatic');
    expect(inferBlendCategory(testBlends[3])).toBe('non_aromatic');
  });

  test('unknown records are unknown, not non-aromatic', () => {
    expect(inferBlendCategory({ name: 'Mystery Tin' })).toBe('unknown');
    expect(isAromaticBlend({ name: 'Mystery Tin' })).toBe(false);
  });
});

describe('Aromatic Intensity', () => {
  test('uses explicit field when available', () => {
    expect(getAromaticIntensity(testBlends[1])).toBe('light');
    expect(getAromaticIntensity(testBlends[2])).toBe('medium');
  });

  // Replaces the removed test that asserted `strength: 'Full'` -> 'heavy'.
  // That test defended the exact bug this rebuild removes.
  test('strength does not affect aromatic intensity', () => {
    expect(getAromaticIntensity({ strength: 'Full' })).toBe(null);
    expect(getAromaticIntensity({ strength: 'Mild' })).toBe(null);
    expect(getAromaticIntensity({ blend_type: 'Aromatic', strength: 'Full' })).toBe(null);
  });

  test('explicit aromatic_intensity field is used', () => {
    expect(getAromaticIntensity({ aromatic_intensity: 'heavy' })).toBe('heavy');
    expect(getAromaticIntensity({ aromatic_intensity: 'light' })).toBe('light');
    expect(getAromaticIntensity({ aromatic_intensity: 'medium' })).toBe('medium');
  });

  test('flavor notes can indicate aromatic intensity', () => {
    expect(getAromaticIntensity({ flavor_notes: ['Vanilla', 'Caramel'] })).toBe('heavy');
  });

  test('explicit field wins over flavor notes and strength', () => {
    expect(
      getAromaticIntensity({ aromatic_intensity: 'light', flavor_notes: ['Vanilla'], strength: 'Full' })
    ).toBe('light');
  });

  test('derives intensity from flavor notes only', () => {
    expect(getAromaticIntensity({ blend_type: 'Aromatic', flavor_notes: ['Vanilla'] })).toBe('heavy');
    expect(getAromaticIntensity({ blend_type: 'Aromatic', flavor_notes: ['hint of citrus'] })).toBe('light');
  });
});

describe('Dedication component', () => {
  test('aromatic-dedicated pipe materially penalizes non-aromatics', () => {
    const pipe = { focus: ['Aromatic'] };
    const result = scorePipeBlend(pipe, testBlends[0], null); // Virginia flake
    expect(result.components.dedication.score).toBeLessThanOrEqual(3);
    // Never a hard zero — geometry and cut still contribute
    expect(result.score).toBeGreaterThan(0);
  });

  test('English-dedicated pipe materially penalizes aromatics', () => {
    const pipe = { focus: ['English'] };
    const result = scorePipeBlend(pipe, testBlends[1], null); // Lane 1Q
    expect(result.components.dedication.score).toBeLessThanOrEqual(2);
    expect(result.why).toMatch(/carryover|aromatic/i);
  });

  test('versatile pipe is neutral for both', () => {
    const pipe = { focus: ['Versatile'] };
    const aroResult = scorePipeBlend(pipe, testBlends[1], null);
    const nonAroResult = scorePipeBlend(pipe, testBlends[0], null);
    expect(aroResult.components.dedication.score).toBe(6);
    expect(nonAroResult.components.dedication.score).toBe(6);
    expect(aroResult.score).toBeGreaterThan(0);
    expect(nonAroResult.score).toBeGreaterThan(0);
  });

  test('exact name match wins the dedication component', () => {
    const pipe = { focus: ['Peterson Irish Flake'] };
    const result = scorePipeBlend(pipe, testBlends[0], null);
    expect(result.components.dedication.score).toBe(10);
    expect(result.why).toContain('Exact blend match');
  });

  test('matching category dedication beats general purpose', () => {
    const dedicated = scorePipeBlend(testPipes[1], testBlends[4], null); // English pipe + EMP
    const general = scorePipeBlend(testPipes[2], testBlends[4], null);
    expect(dedicated.components.dedication.score).toBeGreaterThan(
      general.components.dedication.score
    );
    expect(dedicated.score).toBeGreaterThan(general.score);
  });
});

describe('Component structure', () => {
  test('exposes every weighted component with contribution and reason', () => {
    const result = scorePipeBlendDiagnostic(testPipes[0], testBlends[2], null);
    for (const [key, weight] of Object.entries(COMPONENT_WEIGHTS)) {
      const c = result.components[key];
      expect(c).toBeTruthy();
      expect(c.weight).toBe(weight);
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(10);
      expect(c.contribution).toBeCloseTo(Math.round(c.score * weight * 10) / 10, 5);
      expect(typeof c.reason).toBe('string');
    }
    const weightSum = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(weightSum).toBeCloseTo(1, 5);
  });

  test('technical score is the weighted component sum and excludes personal fit', () => {
    const profile = { preferred_blend_types: ['Aromatic'], strength_preference: 'Medium' };
    const withProfile = scorePipeBlendDiagnostic(testPipes[0], testBlends[2], profile);
    const withoutProfile = scorePipeBlendDiagnostic(testPipes[0], testBlends[2], null);

    expect(withProfile.technicalScore).toBe(withoutProfile.technicalScore);
    expect(withoutProfile.personalFit).toBe(null);
    expect(withoutProfile.hasPersonalizationEvidence).toBe(false);
    expect(withProfile.personalFit).toBeGreaterThan(5);
    expect(withProfile.hasPersonalizationEvidence).toBe(true);
    expect(withProfile.score).toBeGreaterThan(withoutProfile.score);

    const expected = Object.entries(withProfile.components)
      .reduce((sum, [, c]) => sum + c.score * c.weight, 0);
    expect(withProfile.technicalScore).toBeCloseTo(Math.round(expected * 10) / 10, 5);
  });

  test('backward-compatible { score, why } shape is preserved', () => {
    const { score, why } = scorePipeBlend(testPipes[0], testBlends[2], null);
    expect(typeof score).toBe('number');
    expect(typeof why).toBe('string');
    expect(why.length).toBeGreaterThan(0);
  });

  test('confidence drops when records are incomplete', () => {
    const rich = scorePipeBlendDiagnostic(testPipes[0], testBlends[4], null);
    const sparse = scorePipeBlendDiagnostic({ focus: [] }, { name: 'Mystery' }, null);
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
    expect(sparse.confidence).toBeLessThan(0.5);
  });
});

describe('Chamber geometry', () => {
  const vaFlake = { name: 'VA Flake', blend_type: 'Virginia', cut: 'Flake', tobacco_components: ['Virginia'] };
  const latakia = { name: 'Latakia Mix', blend_type: 'English', cut: 'Ribbon', tobacco_components: ['Latakia', 'Virginia', 'Oriental'] };

  test('Virginia flake prefers a narrow deep chamber over a wide shallow one', () => {
    const narrowDeep = scorePipeBlend({ focus: [], bowl_diameter_mm: 16, bowl_depth_mm: 45 }, vaFlake, null);
    const wideShallow = scorePipeBlend({ focus: [], bowl_diameter_mm: 24, bowl_depth_mm: 28 }, vaFlake, null);
    expect(narrowDeep.components.chamberGeometry.score)
      .toBeGreaterThan(wideShallow.components.chamberGeometry.score);
    expect(narrowDeep.score).toBeGreaterThan(wideShallow.score);
  });

  test('Latakia mixture prefers a wider chamber', () => {
    const wide = scorePipeBlend({ focus: [], bowl_diameter_mm: 23, bowl_depth_mm: 38 }, latakia, null);
    const narrow = scorePipeBlend({ focus: [], bowl_diameter_mm: 15, bowl_depth_mm: 38 }, latakia, null);
    expect(wide.components.chamberGeometry.score)
      .toBeGreaterThan(narrow.components.chamberGeometry.score);
  });

  test('falls back to chamber_volume enum with a damped signal', () => {
    const measured = scorePipeBlendDiagnostic({ focus: [], bowl_diameter_mm: 15, bowl_depth_mm: 45 }, vaFlake, null);
    const enumOnly = scorePipeBlendDiagnostic({ focus: [], chamber_volume: 'Small' }, vaFlake, null);
    expect(enumOnly.normalizedPipe.chamberWidthCategory).toBe('narrow');
    expect(enumOnly.normalizedPipe.geometrySource).toBe('volumeEnum');
    expect(enumOnly.components.chamberGeometry.score)
      .toBeLessThan(measured.components.chamberGeometry.score);
  });

  test('weak shapes stay unknown and only reliable fallback shapes infer geometry', () => {
    const churchwarden = normalizePipeForPairing({ focus: [], shape: 'Churchwarden' });
    expect(churchwarden.chamberWidthCategory).toBe(null);
    expect(churchwarden.chamberDepthCategory).toBe(null);
    expect(churchwarden.geometrySource).toBe('unknown');

    const pot = normalizePipeForPairing({ focus: [], shape: 'Pot' });
    expect(pot.chamberWidthCategory).toBe('wide');
    expect(pot.chamberDepthCategory).toBe('shallow');
    expect(pot.geometrySource).toBe('weakShape');
  });

  test('unknown geometry is neutral rather than punitive', () => {
    const result = scorePipeBlend({ focus: [] }, vaFlake, null);
    expect(result.components.chamberGeometry.score).toBe(6);
  });
});

describe('Tobacco cut', () => {
  const narrowDeep = { focus: [], bowl_diameter_mm: 16, bowl_depth_mm: 46 };
  const wideShallow = { focus: [], bowl_diameter_mm: 24, bowl_depth_mm: 28 };
  const medium = { focus: [], bowl_diameter_mm: 20, bowl_depth_mm: 38 };

  test('flake is ideal in a narrow/medium deep chamber', () => {
    const blend = { name: 'Flake', blend_type: 'Virginia', cut: 'Flake' };
    expect(scorePipeBlend(narrowDeep, blend, null).components.tobaccoCut.score).toBe(9);
    expect(scorePipeBlend(wideShallow, blend, null).components.tobaccoCut.score).toBe(6);
  });

  test('ribbon is happiest in a medium chamber', () => {
    const blend = { name: 'Ribbon', blend_type: 'Virginia', cut: 'Ribbon' };
    expect(scorePipeBlend(medium, blend, null).components.tobaccoCut.score).toBe(8);
    expect(scorePipeBlend(narrowDeep, blend, null).components.tobaccoCut.score).toBe(7);
  });

  test('unknown cut is neutral at 5', () => {
    const blend = { name: 'No Cut', blend_type: 'Virginia' };
    expect(scorePipeBlend(medium, blend, null).components.tobaccoCut.score).toBe(5);
  });

  test('no cut/geometry combination drops below 3', () => {
    const cuts = ['Flake', 'Coin', 'Plug', 'Ribbon', 'Shag', 'Cube Cut', 'Ready Rubbed', 'Rope', 'Twist', 'Crumble Cake', 'Other'];
    const geometries = [narrowDeep, wideShallow, medium, { focus: [] }];
    for (const cut of cuts) {
      for (const geometry of geometries) {
        const r = scorePipeBlend(geometry, { name: 'x', blend_type: 'Virginia', cut }, null);
        expect(r.components.tobaccoCut.score).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('Bowl material', () => {
  const aromatic = { name: 'Aro', blend_type: 'Aromatic', cut: 'Ribbon', aromatic_intensity: 'medium' };
  const virginia = { name: 'VA', blend_type: 'Virginia', cut: 'Flake' };

  test('meerschaum is a neutral carrier and beats briar', () => {
    const meer = scorePipeBlend({ focus: [], bowl_material: 'Meerschaum' }, aromatic, null);
    const briar = scorePipeBlend({ focus: [], bowl_material: 'Briar' }, aromatic, null);
    expect(meer.components.material.score).toBe(8);
    expect(briar.components.material.score).toBe(6);
  });

  test('clay favours Virginias over heavy aromatics', () => {
    const clayVa = scorePipeBlend({ focus: [], bowl_material: 'Clay' }, virginia, null);
    const clayAro = scorePipeBlend({ focus: [], bowl_material: 'Clay' }, aromatic, null);
    expect(clayVa.components.material.score).toBeGreaterThan(clayAro.components.material.score);
  });

  test('cob is forgiving for aromatics', () => {
    const cob = scorePipeBlend({ focus: [], bowl_material: 'Corn Cob' }, aromatic, null);
    expect(cob.components.material.score).toBe(8);
  });
});

describe('Personalization neutrality and variant ranking', () => {
  test('empty profile is mathematically neutral', () => {
    const result = scorePipeBlendDiagnostic(testPipes[0], testBlends[2], {});
    expect(result.hasPersonalizationEvidence).toBe(false);
    expect(result.personalFit).toBe(null);
    expect(result.finalScore).toBe(result.technicalScore);
  });

  test('meaningful profile can alter final score', () => {
    const profile = { preferred_blend_types: ['Aromatic'] };
    const result = scorePipeBlendDiagnostic(testPipes[0], testBlends[2], profile);
    expect(result.hasPersonalizationEvidence).toBe(true);
    expect(result.finalScore).not.toBe(result.technicalScore);
  });

  test('variant ranking collapses duplicate parent pipes while keeping the winning bowl', () => {
    const blend = { name: 'Big Maple', blend_type: 'Aromatic', is_aromatic: true, aromatic_intensity: 'heavy', cut: 'Ribbon' };
    const pipes = [{
      id: 'parent-1',
      name: 'System Pipe',
      focus: ['Versatile'],
      bowl_diameter_mm: 18,
      bowl_depth_mm: 36,
      interchangeable_bowls: [
        { bowl_variant_id: 'aro', name: 'Aromatic Bowl', focus: ['Aromatic'], bowl_diameter_mm: 20, bowl_depth_mm: 38 },
        { bowl_variant_id: 'eng', name: 'English Bowl', focus: ['English'], bowl_diameter_mm: 20, bowl_depth_mm: 38 },
      ],
    }];

    const [winner] = rankPipesForBlend(pipes, blend, null, { includeMainWhenBowls: true, collapseToParent: true, limit: 3 });
    expect(winner.pipe_id).toBe('parent-1');
    expect(winner.bowl_variant_id).toBe('aro');
    expect(winner.bowl_name).toBe('Aromatic Bowl');
  });
});

describe('Smoking character', () => {
  const heavyAro = { name: 'Goopy', blend_type: 'Aromatic', cut: 'Ribbon', aromatic_intensity: 'heavy' };

  test('cool smoker earns a small bonus', () => {
    const cool = scorePipeBlend({ focus: [], usage_characteristics: 'Smokes cool and dry' }, heavyAro, null);
    const unknown = scorePipeBlend({ focus: [] }, heavyAro, null);
    expect(cool.components.smokingCharacter.score).toBeGreaterThan(unknown.components.smokingCharacter.score);
  });

  test('hot smoker is penalized for heavy aromatics', () => {
    const hot = scorePipeBlend({ focus: [], usage_characteristics: 'Runs hot' }, heavyAro, null);
    expect(hot.components.smokingCharacter.score).toBeLessThan(6);
  });

  test('legacy smoking_characteristics field is still parsed', () => {
    const p = normalizePipeForPairing({ focus: [], smoking_characteristics: 'cool smoker with open draw' });
    expect(p.smokingCharacter).toBe('cool');
    expect(p.drawCharacter).toBe('open');
  });
});

describe('Normalized models', () => {
  test('tobacco normalization exposes the documented fields', () => {
    const t = normalizeTobaccoForPairing(testBlends[3]);
    expect(t.blendFamily).toBe('english');
    expect(t.isAromatic).toBe(false);
    expect(t.aromaticIntensity).toBe(null);
    expect(t.hasLatakia).toBe(true);
    expect(t.hasPerique).toBe(true);
    expect(t.cut).toBe('ribbon');
    expect(t.strength).toBe('full');
    expect(t.confidence).toBeGreaterThan(0.5);
  });

  test('pipe normalization exposes the documented fields', () => {
    const p = normalizePipeForPairing(testPipes[1]);
    expect(p.dedicationType).toBe('english');
    expect(p.chamberDiameterMm).toBe(22);
    expect(p.chamberWidthCategory).toBe('medium');
    expect(p.chamberVolume).toBeTruthy();
    expect(p.bowlMaterial).toBe('briar');
    expect(p.confidence).toBeGreaterThan(0.4);
  });
});

describe('Deterministic sorting', () => {
  test('top recommendations are consistently ordered', () => {
    const pairings = buildPairingsForPipes(testPipes, testBlends, null);
    const pairings2 = buildPairingsForPipes(testPipes, testBlends, null);

    expect(pairings).toEqual(pairings2);

    pairings.forEach(p => {
      const scores = p.recommendations.map(r => r.score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    });
  });

  test('recommendations carry technical and personal breakdown', () => {
    const [first] = buildPairingsForPipes([testPipes[0]], testBlends, null);
    const rec = first.recommendations[0];
    expect(rec.technical_score).toBeGreaterThan(0);
    expect(rec.personal_fit).toBe(5);
    expect(typeof rec.reasoning).toBe('string');
  });
});

// Export test fixtures for use in other tests
export const TEST_FIXTURES = {
  blends: testBlends,
  pipes: testPipes
};
