/**
 * Matrix regression tests: tobacco families × pipe geometries/dedications.
 *
 * These assert RANKING ORDER, not absolute scores, so the weighting model can
 * be tuned without rewriting the suite — while guaranteeing that the physical
 * and ghosting relationships stay sane.
 */

import { describe, test, expect } from 'vitest';
import { scorePipeBlend } from '../pairingScoreCanonical';

// ── Tobacco fixtures ────────────────────────────────────────────────────────

const TOBACCOS = {
  heavyAromaticRibbon: {
    id: 't-aro',
    name: 'Heavy Aromatic Ribbon',
    blend_type: 'Virginia/Burley',
    is_aromatic: true,
    aromatic_intensity: 'heavy',
    cut: 'Ribbon',
    tobacco_components: ['Virginia', 'Black Cavendish'],
    flavor_notes: ['Vanilla'],
    strength: 'Mild',
  },
  virginiaFlake: {
    id: 't-va',
    name: 'Virginia Flake',
    blend_type: 'Virginia',
    is_aromatic: false,
    cut: 'Flake',
    tobacco_components: ['Red Virginia', 'Bright Virginia'],
    strength: 'Medium',
  },
  englishLatakia: {
    id: 't-en',
    name: 'English Latakia Mixture',
    blend_type: 'English',
    is_aromatic: false,
    cut: 'Ribbon',
    tobacco_components: ['Latakia', 'Virginia', 'Oriental', 'Burley'],
    strength: 'Full',
  },
  vaperFlake: {
    id: 't-vaper',
    name: 'VaPer Flake',
    blend_type: 'Virginia/Perique',
    is_aromatic: false,
    cut: 'Flake',
    tobacco_components: ['Virginia', 'Perique'],
    strength: 'Medium-Full',
  },
};

// ── Pipe fixtures ───────────────────────────────────────────────────────────

const GEOMETRY = {
  narrowDeep: { bowl_diameter_mm: 16, bowl_depth_mm: 46 },
  narrowMedium: { bowl_diameter_mm: 16, bowl_depth_mm: 38 },
  medium: { bowl_diameter_mm: 20, bowl_depth_mm: 38 },
  wide: { bowl_diameter_mm: 23, bowl_depth_mm: 38 },
  wideShallow: { bowl_diameter_mm: 24, bowl_depth_mm: 28 },
};

const pipe = (name, focus, geometry, material = 'Briar') => ({
  pipe_id: name,
  pipe_name: name,
  focus,
  bowl_material: material,
  ...geometry,
});

const score = (p, blend) => scorePipeBlend(p, blend, null).score;

/** Assert that the given [label, score] pairs are in strictly descending order. */
function expectDescending(entries) {
  for (let i = 1; i < entries.length; i++) {
    const [prevLabel, prevScore] = entries[i - 1];
    const [label, value] = entries[i];
    expect(
      prevScore,
      `${prevLabel} (${prevScore}) should outrank ${label} (${value})`
    ).toBeGreaterThan(value);
  }
}

// ── Dedication rankings per tobacco family ──────────────────────────────────

describe('Dedication ranking by tobacco family', () => {
  test('heavy aromatic: aromatic-dedicated > meerschaum general > virginia-dedicated > english-dedicated', () => {
    const blend = TOBACCOS.heavyAromaticRibbon;
    expectDescending([
      ['aromatic-dedicated', score(pipe('aro', ['Aromatic'], GEOMETRY.medium), blend)],
      ['meerschaum general', score(pipe('gen', ['Versatile'], GEOMETRY.medium, 'Meerschaum'), blend)],
      ['virginia-dedicated', score(pipe('va', ['Virginia'], GEOMETRY.medium), blend)],
      ['english-dedicated', score(pipe('en', ['English'], GEOMETRY.medium), blend)],
    ]);
  });

  test('Virginia flake: virginia-dedicated > general > aromatic-dedicated', () => {
    const blend = TOBACCOS.virginiaFlake;
    expectDescending([
      ['virginia-dedicated', score(pipe('va', ['Virginia'], GEOMETRY.narrowDeep), blend)],
      ['general', score(pipe('gen', ['Versatile'], GEOMETRY.narrowDeep), blend)],
      ['aromatic-dedicated', score(pipe('aro', ['Aromatic'], GEOMETRY.narrowDeep), blend)],
    ]);
  });

  test('English/Latakia: english-dedicated > general > aromatic-dedicated', () => {
    const blend = TOBACCOS.englishLatakia;
    expectDescending([
      ['english-dedicated', score(pipe('en', ['English'], GEOMETRY.wide), blend)],
      ['general', score(pipe('gen', ['Versatile'], GEOMETRY.wide), blend)],
      ['aromatic-dedicated', score(pipe('aro', ['Aromatic'], GEOMETRY.wide), blend)],
    ]);
  });

  test('VaPer flake: vaper-dedicated > virginia-dedicated > general > aromatic-dedicated', () => {
    const blend = TOBACCOS.vaperFlake;
    expectDescending([
      ['vaper-dedicated', score(pipe('vaper', ['Virginia/Perique'], GEOMETRY.narrowMedium), blend)],
      ['virginia-dedicated', score(pipe('va', ['Virginia'], GEOMETRY.narrowMedium), blend)],
      ['general', score(pipe('gen', ['Versatile'], GEOMETRY.narrowMedium), blend)],
      ['aromatic-dedicated', score(pipe('aro', ['Aromatic'], GEOMETRY.narrowMedium), blend)],
    ]);
  });
});

// ── Geometry rankings per tobacco family (dedication held constant) ─────────

describe('Geometry ranking by tobacco family', () => {
  test('Virginia flake: narrow-deep > medium > wide-shallow', () => {
    const blend = TOBACCOS.virginiaFlake;
    expectDescending([
      ['narrow-deep', score(pipe('nd', [], GEOMETRY.narrowDeep), blend)],
      ['medium', score(pipe('m', [], GEOMETRY.medium), blend)],
      ['wide-shallow', score(pipe('ws', [], GEOMETRY.wideShallow), blend)],
    ]);
  });

  test('English/Latakia: wide > medium > narrow', () => {
    const blend = TOBACCOS.englishLatakia;
    expectDescending([
      ['wide', score(pipe('w', [], GEOMETRY.wide), blend)],
      ['medium', score(pipe('m', [], GEOMETRY.medium), blend)],
      ['narrow', score(pipe('n', [], GEOMETRY.narrowMedium), blend)],
    ]);
  });

  test('VaPer flake: narrow-medium > wide', () => {
    const blend = TOBACCOS.vaperFlake;
    expectDescending([
      ['narrow-medium', score(pipe('nm', [], GEOMETRY.narrowMedium), blend)],
      ['wide', score(pipe('w', [], GEOMETRY.wide), blend)],
    ]);
  });

  test('heavy aromatic: medium > wide-shallow > very narrow', () => {
    const blend = TOBACCOS.heavyAromaticRibbon;
    expectDescending([
      ['medium', score(pipe('m', [], GEOMETRY.medium), blend)],
      ['wide-shallow', score(pipe('ws', [], GEOMETRY.wideShallow), blend)],
      ['narrow', score(pipe('n', [], { bowl_diameter_mm: 14, bowl_depth_mm: 25 }), blend)],
    ]);
  });
});

// ── Full matrix sanity ──────────────────────────────────────────────────────

describe('Full matrix sanity', () => {
  const pipes = [
    pipe('aromatic-medium', ['Aromatic'], GEOMETRY.medium),
    pipe('english-wide', ['English'], GEOMETRY.wide),
    pipe('virginia-narrowDeep', ['Virginia'], GEOMETRY.narrowDeep),
    pipe('vaper-narrowMedium', ['Virginia/Perique'], GEOMETRY.narrowMedium),
    pipe('general-meerschaum', ['Versatile'], GEOMETRY.medium, 'Meerschaum'),
  ];

  test('each tobacco family ranks its matching dedicated pipe first', () => {
    const expectations = [
      [TOBACCOS.heavyAromaticRibbon, 'aromatic-medium'],
      [TOBACCOS.englishLatakia, 'english-wide'],
      [TOBACCOS.virginiaFlake, 'virginia-narrowDeep'],
      [TOBACCOS.vaperFlake, 'vaper-narrowMedium'],
    ];

    for (const [blend, expectedWinner] of expectations) {
      const ranked = pipes
        .map((p) => ({ name: p.pipe_name, score: score(p, blend) }))
        .sort((a, b) => b.score - a.score);
      expect(ranked[0].name, `${blend.name} ranking: ${JSON.stringify(ranked)}`).toBe(expectedWinner);
    }
  });

  test('every score stays inside the 0-10 range', () => {
    for (const blend of Object.values(TOBACCOS)) {
      for (const p of pipes) {
        const s = score(p, blend);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(10);
      }
    }
  });

  test('ghosting conflicts always rank below the matching dedication', () => {
    const conflicts = [
      [TOBACCOS.heavyAromaticRibbon, 'english-wide', 'aromatic-medium'],
      [TOBACCOS.englishLatakia, 'aromatic-medium', 'english-wide'],
      [TOBACCOS.virginiaFlake, 'aromatic-medium', 'virginia-narrowDeep'],
    ];

    for (const [blend, conflicted, matched] of conflicts) {
      const conflictScore = score(pipes.find((p) => p.pipe_name === conflicted), blend);
      const matchScore = score(pipes.find((p) => p.pipe_name === matched), blend);
      expect(matchScore - conflictScore).toBeGreaterThan(1);
    }
  });
});
