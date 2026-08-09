/**
 * Regression tests for aromatic classification and the Autumn Evening case.
 *
 * Autumn Evening is the canonical example of the bug this model replaces:
 * its blend_type is "Virginia/Burley" (a non-aromatic-looking structure) while
 * it is in fact a heavily topped maple aromatic. Keyword matching on blend_type
 * ranked it into English/Virginia pipes; the multi-dimensional model must not.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  buildPairingsForPipes,
  inferBlendCategory,
  isAromaticBlend,
  getAromaticIntensity,
  normalizeTobaccoForPairing,
  inferAromaticFromFields,
  isKnownNonAromaticBlend,
} from '../pairingScoreCanonical';
import { scorePipeBlend as scorePipeBlendShim } from '../pairingScore';
import { scoreBlendForPipe } from '../pairingScorer';

// ── Fixtures ────────────────────────────────────────────────────────────────

const autumnEvening = {
  manufacturer: "Cornell & Diehl",
  name: "Autumn Evening",
  blend_type: "Virginia/Burley",  // NOT "Aromatic" — that's the whole point
  tobacco_components: ["Red Virginia", "Black Cavendish"],
  is_aromatic: true,
  aromatic_intensity: "heavy",
  cut: "Ribbon",
  flavor_notes: ["Maple"],
  strength: "Medium",
};

// Pipe A: Aromatic-dedicated, well-suited geometry
const aromaticDedicatedPipe = {
  pipe_id: "pa", pipe_name: "Aromatic Dedicated Billiard",
  focus: ["Aromatic"],
  bowl_diameter_mm: 20, bowl_depth_mm: 38, bowl_material: "Briar",
};

// Pipe B: Aromatic-dedicated but clearly worse geometry (tiny bowl)
const aromaticDedicatedSmall = {
  pipe_id: "pb", pipe_name: "Aromatic Dedicated Small",
  focus: ["Aromatic"],
  bowl_diameter_mm: 14, bowl_depth_mm: 25, bowl_material: "Briar",
};

// Pipe C: General-purpose, good geometry
const generalPurposePipe = {
  pipe_id: "pc", pipe_name: "General Purpose",
  focus: ["Versatile"],
  bowl_diameter_mm: 20, bowl_depth_mm: 38, bowl_material: "Meerschaum",
};

// Pipe D: Virginia/VaPer dedicated
const virginiaDedicatedPipe = {
  pipe_id: "pd", pipe_name: "Virginia Dedicated",
  focus: ["Virginia"],
  bowl_diameter_mm: 18, bowl_depth_mm: 42, bowl_material: "Briar",
};

// Pipe E: English/Latakia dedicated
const englishDedicatedPipe = {
  pipe_id: "pe", pipe_name: "English Dedicated",
  focus: ["English"],
  bowl_diameter_mm: 22, bowl_depth_mm: 35, bowl_material: "Briar",
};

const scoreOf = (pipe, blend = autumnEvening) => scorePipeBlend(pipe, blend, null).score;

// ── Autumn Evening ranking ──────────────────────────────────────────────────

describe('Autumn Evening ranking', () => {
  test('Autumn Evening: aromatic-dedicated pipe leads', () => {
    const a = scoreOf(aromaticDedicatedPipe);
    expect(a).toBeGreaterThan(scoreOf(generalPurposePipe));
    expect(a).toBeGreaterThan(scoreOf(virginiaDedicatedPipe));
    expect(a).toBeGreaterThan(scoreOf(englishDedicatedPipe));
    expect(a).toBeGreaterThan(scoreOf(aromaticDedicatedSmall));
  });

  test('Autumn Evening: expected overall order A > C > D > E', () => {
    const order = [
      aromaticDedicatedPipe,
      generalPurposePipe,
      virginiaDedicatedPipe,
      englishDedicatedPipe,
    ].map((p) => scoreOf(p));

    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]).toBeGreaterThan(order[i]);
    }
  });

  test('Autumn Evening: English-dedicated pipe is materially penalized', () => {
    const english = scorePipeBlendDiagnostic(englishDedicatedPipe, autumnEvening, null);
    const general = scorePipeBlendDiagnostic(generalPurposePipe, autumnEvening, null);

    expect(english.components.dedication.score).toBeLessThanOrEqual(2);
    expect(general.score - english.score).toBeGreaterThanOrEqual(0.8);
    expect(english.why).toMatch(/carryover|ghost/i);
  });

  test('Autumn Evening: physically unsuitable pipe does not beat better geometry', () => {
    const small = scorePipeBlendDiagnostic(aromaticDedicatedSmall, autumnEvening, null);
    const general = scorePipeBlendDiagnostic(generalPurposePipe, autumnEvening, null);

    // Same dedication advantage, but the tiny chamber loses on physics
    expect(small.components.dedication.score)
      .toBeGreaterThan(general.components.dedication.score);
    expect(small.score).toBeLessThan(general.score);
    expect(small.components.aromaticCompatibility.score)
      .toBeLessThan(general.components.aromaticCompatibility.score);
  });

  test('Autumn Evening is classified as a heavy aromatic despite its blend_type', () => {
    expect(inferBlendCategory(autumnEvening)).toBe('aromatic');
    expect(getAromaticIntensity(autumnEvening)).toBe('heavy');
    expect(normalizeTobaccoForPairing(autumnEvening).blendFamily).toBe('aromatic');
  });
});

// ── Cavendish handling ──────────────────────────────────────────────────────

describe('Cavendish is a processing style, not an aromatic marker', () => {
  const base = { name: 'Cavendish Test', blend_type: 'Cavendish', cut: 'Ribbon' };

  test('is_aromatic: true → aromatic', () => {
    expect(inferBlendCategory({ ...base, is_aromatic: true })).toBe('aromatic');
  });

  test('is_aromatic: false → non_aromatic', () => {
    expect(inferBlendCategory({ ...base, is_aromatic: false })).toBe('non_aromatic');
    expect(isAromaticBlend({ ...base, is_aromatic: false })).toBe(false);
  });

  test('no is_aromatic → unknown (never assumed non-aromatic)', () => {
    expect(inferBlendCategory(base)).toBe('unknown');
    expect(normalizeTobaccoForPairing(base).isAromatic).toBe(null);
    expect(isKnownNonAromaticBlend(base)).toBe(false);
  });

  test('black cavendish in components does not force a category', () => {
    const blend = { name: 'x', tobacco_components: ['Black Cavendish', 'Virginia'] };
    expect(inferBlendCategory(blend)).toBe('unknown');
    expect(normalizeTobaccoForPairing(blend).hasBlackCavendish).toBe(true);
  });
});

// ── Aromatic intensity must never come from nicotine strength ───────────────

describe('Strength is not aromatic intensity', () => {
  test('nicotine strength "Full" does not make a tobacco a heavy aromatic', () => {
    const blend = { name: 'Strong Stuff', blend_type: 'Aromatic', strength: 'Full' };
    expect(getAromaticIntensity(blend)).toBe(null);
    expect(normalizeTobaccoForPairing(blend).aromaticIntensity).toBe(null);
  });

  test('nicotine strength "Mild" does not make a tobacco a light aromatic', () => {
    const blend = { name: 'Gentle', blend_type: 'Aromatic', strength: 'Mild' };
    expect(getAromaticIntensity(blend)).toBe(null);
  });

  test('strength does not change any score component', () => {
    const mild = { name: 'A', blend_type: 'Aromatic', cut: 'Ribbon', strength: 'Mild' };
    const full = { name: 'A', blend_type: 'Aromatic', cut: 'Ribbon', strength: 'Full' };
    const a = scorePipeBlendDiagnostic(aromaticDedicatedPipe, mild, null);
    const b = scorePipeBlendDiagnostic(aromaticDedicatedPipe, full, null);
    expect(a.technicalScore).toBe(b.technicalScore);
    expect(a.components).toEqual(b.components);
  });
});

// ── Legacy / unknown records ────────────────────────────────────────────────

describe('Legacy and unknown records', () => {
  test('legacy tobacco with blend_type "Aromatic" remains aromatic', () => {
    const legacy = { name: 'Lane 1Q', blend_type: 'Aromatic', cut: 'Ribbon' };
    expect(inferBlendCategory(legacy)).toBe('aromatic');
    expect(inferAromaticFromFields(legacy).source).toBe('blend_type');
  });

  test('unknown tobacco → unknown category, not non_aromatic', () => {
    const unknown = { name: 'Unmarked Jar' };
    expect(inferBlendCategory(unknown)).toBe('unknown');
    const t = normalizeTobaccoForPairing(unknown);
    expect(t.isAromatic).toBe(null);
    expect(t.blendFamily).toBe('unknown');
  });

  test('unknown blend family gets a mild uncertainty penalty, not a zero', () => {
    const r = scorePipeBlendDiagnostic(aromaticDedicatedPipe, { name: 'Unmarked Jar' }, null);
    expect(r.components.dedication.score).toBe(5);
    expect(r.components.aromaticCompatibility.score).toBe(6.5);
    expect(r.score).toBeGreaterThan(3);
    expect(r.confidence).toBeLessThan(0.6);
    expect(r.whyList.join(' ')).toMatch(/provisional/i);
  });

  test('structurally non-aromatic legacy records are recognized without explicit fields', () => {
    expect(isKnownNonAromaticBlend({ blend_type: 'English' })).toBe(true);
    expect(isKnownNonAromaticBlend({ blend_type: 'Virginia/Perique' })).toBe(true);
    expect(isKnownNonAromaticBlend({ blend_type: 'Aromatic' })).toBe(false);
    expect(isKnownNonAromaticBlend({ blend_type: 'Navy Flake' })).toBe(false);
  });

  test('explicit is_aromatic: false overrides an aromatic-looking flavor note', () => {
    const blend = { name: 'Dry VaBur', blend_type: 'Virginia/Burley', flavor_notes: ['Cherry'], is_aromatic: false };
    expect(inferBlendCategory(blend)).toBe('non_aromatic');
    expect(normalizeTobaccoForPairing(blend).aromaticIntensity).toBe(null);
  });
});

// ── Geometry regressions ────────────────────────────────────────────────────

describe('Geometry regressions', () => {
  const vaFlake = { name: 'VA Flake', blend_type: 'Virginia', cut: 'Flake', tobacco_components: ['Virginia'] };
  const latakiaMix = { name: 'Latakia Mix', blend_type: 'English', cut: 'Ribbon', tobacco_components: ['Latakia', 'Virginia', 'Oriental'] };

  const narrowDeep = { focus: [], bowl_diameter_mm: 16, bowl_depth_mm: 46, bowl_material: 'Briar' };
  const wideShallow = { focus: [], bowl_diameter_mm: 24, bowl_depth_mm: 28, bowl_material: 'Briar' };
  const narrow = { focus: [], bowl_diameter_mm: 15, bowl_depth_mm: 38, bowl_material: 'Briar' };
  const wide = { focus: [], bowl_diameter_mm: 23, bowl_depth_mm: 38, bowl_material: 'Briar' };

  test('Virginia flake in a narrow deep chamber beats a wide shallow one', () => {
    expect(scorePipeBlend(narrowDeep, vaFlake, null).score)
      .toBeGreaterThan(scorePipeBlend(wideShallow, vaFlake, null).score);
  });

  test('English/Latakia in a wider chamber beats a narrow one', () => {
    expect(scorePipeBlend(wide, latakiaMix, null).score)
      .toBeGreaterThan(scorePipeBlend(narrow, latakiaMix, null).score);
  });
});

// ── Cross-path consistency ──────────────────────────────────────────────────

describe('All PipeKeeper matching paths agree', () => {
  const pipes = [
    aromaticDedicatedPipe,
    aromaticDedicatedSmall,
    generalPurposePipe,
    virginiaDedicatedPipe,
    englishDedicatedPipe,
  ];
  const blends = [
    { ...autumnEvening, id: 'ae' },
    { id: 'va', name: 'VA Flake', blend_type: 'Virginia', cut: 'Flake', tobacco_components: ['Virginia'] },
    { id: 'en', name: 'Latakia Mix', blend_type: 'English', cut: 'Ribbon', tobacco_components: ['Latakia', 'Virginia', 'Oriental'] },
  ];

  test('canonical, shim, legacy alias and matrix builder produce identical scores', () => {
    const matrix = buildPairingsForPipes(pipes, blends, null);

    for (const pipe of pipes) {
      for (const blend of blends) {
        const canonical = scorePipeBlend(pipe, blend, null).score;
        expect(scorePipeBlendDiagnostic(pipe, blend, null).score).toBe(canonical);
        expect(scorePipeBlendShim(pipe, blend, null).score).toBe(canonical);
        expect(scoreBlendForPipe(pipe, blend, null).score).toBe(canonical);

        const row = matrix.find((m) => m.pipe_id === String(pipe.pipe_id));
        const rec = row.recommendations.find((r) => r.tobacco_name === blend.name);
        expect(rec.score).toBe(canonical);
      }
    }
  });

  test('scoring is pure and repeatable', () => {
    const first = scorePipeBlendDiagnostic(aromaticDedicatedPipe, autumnEvening, null);
    const second = scorePipeBlendDiagnostic(aromaticDedicatedPipe, autumnEvening, null);
    expect(first).toEqual(second);
  });
});
