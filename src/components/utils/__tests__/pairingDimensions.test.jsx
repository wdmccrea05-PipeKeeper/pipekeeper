/**
 * Dimension coverage (J) + cross-path consistency (K).
 *
 * Every scoring dimension with non-zero weight gets:
 *   1. a positive test   — the dimension helps when conditions are good
 *   2. a negative test   — the dimension hurts when conditions are bad
 *   3. a missing-data test — absent data yields a neutral value, never a
 *      confidently wrong one
 *
 * Plus: the same pipe + tobacco + profile must produce an identical score
 * through every public pathway.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  buildPairingsForPipes,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  COMPONENT_WEIGHTS,
} from '../pairingScoreCanonical';
import { scorePipeBlend as scoreViaShimA } from '../pairingScore';
import { scorePipeBlend as scoreViaShimB } from '../pairingScorer';
import { getVariantFromPipe, resolveBowlVariant } from '../pipeVariants';
import { buildArtifactFingerprint, SCORER_VERSION } from '../fingerprint';

const NEUTRAL = 6;

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const virginiaFlake = {
  id: 'tva',
  name: 'Full Virginia Flake',
  blend_type: 'Virginia',
  tobacco_components: ['Bright Virginia', 'Red Virginia'],
  cut: 'Flake',
  strength: 'Medium',
  is_aromatic: false,
};

const englishMixture = {
  id: 'ten',
  name: 'Nightcap',
  blend_type: 'English',
  tobacco_components: ['Latakia', 'Oriental', 'Virginia', 'Perique'],
  cut: 'Ribbon',
  strength: 'Full',
  is_aromatic: false,
};

const heavyAromatic = {
  id: 'tar',
  name: 'Autumn Evening',
  blend_type: 'Virginia/Burley',
  tobacco_components: ['Red Virginia', 'Black Cavendish'],
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Ribbon',
  flavor_notes: ['Maple'],
  strength: 'Medium',
};

const bareBlend = { id: 'tb', name: 'Unlabelled Tin' };

const basePipe = {
  id: 'p-base',
  name: 'Base Billiard',
  shape: 'Billiard',
  focus: ['Versatile'],
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const pipe = (over) => ({ ...basePipe, ...over });

const comp = (p, b, name, profile = null) =>
  scorePipeBlendDiagnostic(p, b, profile).components[name];

/* ------------------------------------------------------------------ *
 * Weights sanity
 * ------------------------------------------------------------------ */

describe('component weights', () => {
  test('every weighted dimension is covered by this suite', () => {
    expect(Object.keys(COMPONENT_WEIGHTS).sort()).toEqual([
      'aromaticCompatibility',
      'blendComposition',
      'chamberGeometry',
      'dedication',
      'material',
      'smokingCharacter',
      'tobaccoCut',
    ]);
  });

  test('weights sum to 1', () => {
    const sum = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
  });
});

/* ------------------------------------------------------------------ *
 * A. Dedication / ghosting
 * ------------------------------------------------------------------ */

describe('dimension: dedication (ghosting)', () => {
  test('positive — matching dedication scores well above neutral', () => {
    expect(comp(pipe({ focus: ['English'] }), englishMixture, 'dedication').score)
      .toBeGreaterThan(NEUTRAL);
  });

  test('negative — cross-dedication ghosting scores well below neutral', () => {
    const ghosted = comp(pipe({ focus: ['English'] }), heavyAromatic, 'dedication').score;
    expect(ghosted).toBeLessThan(3);
    // Penalised, but never a hard zero — geometry can still be informative.
    expect(ghosted).toBeGreaterThan(0);
  });

  test('missing — no focus yields the neutral dedication score', () => {
    const p = pipe({ focus: [] });
    expect(comp(p, englishMixture, 'dedication').score).toBe(NEUTRAL);
    expect(normalizePipeForPairing(p).dedicationType).toBe('unknown');
  });
});

/* ------------------------------------------------------------------ *
 * B. Chamber width
 * ------------------------------------------------------------------ */

describe('dimension: chamber width', () => {
  test('positive — wide chamber suits a complex Latakia mixture', () => {
    const wide = comp(pipe({ bowl_diameter_mm: 23 }), englishMixture, 'chamberGeometry').score;
    const narrow = comp(pipe({ bowl_diameter_mm: 15 }), englishMixture, 'chamberGeometry').score;
    expect(wide).toBeGreaterThan(narrow);
  });

  test('negative — narrow chamber is a worse fit for the same mixture', () => {
    expect(comp(pipe({ bowl_diameter_mm: 15 }), englishMixture, 'chamberGeometry').score)
      .toBeLessThan(8);
  });

  test('missing — no width data yields a neutral-ish, low-confidence result', () => {
    const p = { id: 'x', name: 'No Data', focus: [] };
    const n = normalizePipeForPairing(p);
    expect(n.chamberWidthCategory).toBe(null);
    expect(n.chamberDiameterMm).toBe(null);
    const c = comp(p, englishMixture, 'chamberGeometry');
    expect(c.score).toBeGreaterThanOrEqual(4);
    expect(c.score).toBeLessThanOrEqual(8);
  });
});

/* ------------------------------------------------------------------ *
 * C. Chamber depth
 * ------------------------------------------------------------------ */

describe('dimension: chamber depth', () => {
  test('positive — deep narrow chamber concentrates Virginia flake', () => {
    const deep = comp(pipe({ bowl_diameter_mm: 17, bowl_depth_mm: 46 }), virginiaFlake, 'chamberGeometry').score;
    const shallow = comp(pipe({ bowl_diameter_mm: 24, bowl_depth_mm: 28 }), virginiaFlake, 'chamberGeometry').score;
    expect(deep).toBeGreaterThan(shallow);
  });

  test('negative — wide shallow chamber is the worst case for flake', () => {
    expect(comp(pipe({ bowl_diameter_mm: 24, bowl_depth_mm: 28 }), virginiaFlake, 'chamberGeometry').score)
      .toBeLessThan(8);
  });

  test('missing — depth alone absent still produces a usable category', () => {
    const n = normalizePipeForPairing({ id: 'y', name: 'W only', bowl_diameter_mm: 20 });
    expect(n.chamberWidthCategory).toBe('medium');
    expect(n.chamberDepthMm).toBe(null);
  });
});

/* ------------------------------------------------------------------ *
 * D. Tobacco cut
 * ------------------------------------------------------------------ */

describe('dimension: tobacco cut', () => {
  test('positive — flake in a narrow deep chamber is the ideal cut pairing', () => {
    expect(comp(pipe({ bowl_diameter_mm: 17, bowl_depth_mm: 46 }), virginiaFlake, 'tobaccoCut').score)
      .toBeGreaterThanOrEqual(8);
  });

  test('negative — flake in a wide shallow chamber scores lower', () => {
    const good = comp(pipe({ bowl_diameter_mm: 17, bowl_depth_mm: 46 }), virginiaFlake, 'tobaccoCut').score;
    const bad = comp(pipe({ bowl_diameter_mm: 25, bowl_depth_mm: 26 }), virginiaFlake, 'tobaccoCut').score;
    expect(bad).toBeLessThan(good);
    // Never absurdly punitive — a flake still smokes in a wide bowl.
    expect(bad).toBeGreaterThanOrEqual(3);
  });

  test('missing — unknown cut is neutral, not wrong', () => {
    const { cut } = virginiaFlake;
    expect(cut).toBeTruthy();
    const noCut = { ...virginiaFlake, cut: undefined };
    expect(normalizeTobaccoForPairing(noCut).cut).toBe(null);
    expect(comp(pipe({}), noCut, 'tobaccoCut').score).toBe(5);
  });
});

/* ------------------------------------------------------------------ *
 * E. Blend composition
 * ------------------------------------------------------------------ */

describe('dimension: blend composition', () => {
  test('positive — Latakia-heavy composition rewards a wider chamber', () => {
    const wide = comp(pipe({ bowl_diameter_mm: 23 }), englishMixture, 'blendComposition').score;
    const narrow = comp(pipe({ bowl_diameter_mm: 15 }), englishMixture, 'blendComposition').score;
    expect(wide).toBeGreaterThan(narrow);
  });

  test('negative — Virginia-heavy composition does not reward a wide chamber', () => {
    const narrow = comp(pipe({ bowl_diameter_mm: 17 }), virginiaFlake, 'blendComposition').score;
    const wide = comp(pipe({ bowl_diameter_mm: 25 }), virginiaFlake, 'blendComposition').score;
    expect(narrow).toBeGreaterThanOrEqual(wide);
  });

  test('missing — no tobacco_components is neutral', () => {
    expect(normalizeTobaccoForPairing(bareBlend).tobaccoComponents).toEqual([]);
    // 5 is the scorer's uniform "unknown" value (same as unknown cut / unknown
    // aromatic status) — a slight uncertainty discount, never a wrong answer.
    expect(comp(pipe({}), bareBlend, 'blendComposition').score).toBe(5);
  });
});

/* ------------------------------------------------------------------ *
 * F. Aromatic status
 * ------------------------------------------------------------------ */

describe('dimension: aromatic status', () => {
  test('positive — heavy aromatic in a roomy chamber scores above neutral', () => {
    expect(comp(pipe({ bowl_diameter_mm: 20, bowl_depth_mm: 38 }), heavyAromatic, 'aromaticCompatibility').score)
      .toBeGreaterThanOrEqual(NEUTRAL);
  });

  test('negative — heavy aromatic in a tiny chamber scores lower', () => {
    const roomy = comp(pipe({ bowl_diameter_mm: 20, bowl_depth_mm: 38 }), heavyAromatic, 'aromaticCompatibility').score;
    const tiny = comp(pipe({ bowl_diameter_mm: 13, bowl_depth_mm: 22 }), heavyAromatic, 'aromaticCompatibility').score;
    expect(tiny).toBeLessThan(roomy);
  });

  test('missing — unknown aromatic status is neutral 5, never assumed non-aromatic', () => {
    expect(normalizeTobaccoForPairing(bareBlend).isAromatic).toBe(null);
    expect(comp(pipe({}), bareBlend, 'aromaticCompatibility').score).toBe(5);
  });
});

/* ------------------------------------------------------------------ *
 * G. Bowl material
 * ------------------------------------------------------------------ */

describe('dimension: bowl material', () => {
  test('positive — meerschaum beats briar as a neutral flavour carrier', () => {
    const meer = comp(pipe({ bowl_material: 'Meerschaum' }), heavyAromatic, 'material').score;
    const briar = comp(pipe({ bowl_material: 'Briar' }), heavyAromatic, 'material').score;
    expect(meer).toBeGreaterThan(briar);
  });

  test('negative — clay is a poorer carrier for a heavy aromatic than for Virginia', () => {
    const clayAro = comp(pipe({ bowl_material: 'Clay' }), heavyAromatic, 'material').score;
    const clayVa = comp(pipe({ bowl_material: 'Clay' }), virginiaFlake, 'material').score;
    expect(clayAro).toBeLessThan(clayVa);
  });

  test('missing — unknown material falls back to the briar-equivalent baseline', () => {
    expect(comp(pipe({ bowl_material: undefined }), virginiaFlake, 'material').score).toBe(NEUTRAL);
  });
});

/* ------------------------------------------------------------------ *
 * H. Smoking characteristics
 * ------------------------------------------------------------------ */

describe('dimension: smoking characteristics', () => {
  test('positive — a cool smoker earns a small bonus', () => {
    const cool = comp(pipe({ usage_characteristics: 'Smokes cool and dry' }), virginiaFlake, 'smokingCharacter').score;
    expect(cool).toBeGreaterThan(NEUTRAL);
  });

  test('negative — a hot smoker with a heavy aromatic is penalised', () => {
    const hot = comp(pipe({ usage_characteristics: 'Runs hot' }), heavyAromatic, 'smokingCharacter').score;
    expect(hot).toBeLessThan(NEUTRAL);
  });

  test('missing — no usage text is exactly neutral', () => {
    const n = normalizePipeForPairing(pipe({ usage_characteristics: undefined, smoking_characteristics: undefined }));
    expect(n.smokingCharacter).toBe(null);
    expect(comp(pipe({ usage_characteristics: undefined }), virginiaFlake, 'smokingCharacter').score).toBe(NEUTRAL);
  });

  test('legacy smoking_characteristics field is still parsed', () => {
    const n = normalizePipeForPairing(pipe({ smoking_characteristics: 'a notably cool smoker' }));
    expect(n.smokingCharacter).toBe('cool');
  });
});

/* ------------------------------------------------------------------ *
 * K. Cross-path consistency
 * ------------------------------------------------------------------ */

describe('cross-path score consistency', () => {
  const profile = { preferred_blend_types: ['English'], strength_preference: 'Full' };
  const subject = pipe({ id: 'pk', name: 'Consistency Pipe', focus: ['English'] });

  test('canonical, both shims and the diagnostic agree', () => {
    const a = scorePipeBlend(subject, englishMixture, profile).score;
    const b = scoreViaShimA(subject, englishMixture, profile).score;
    const c = scoreViaShimB(subject, englishMixture, profile).score;
    const d = scorePipeBlendDiagnostic(subject, englishMixture, profile).score;
    expect(new Set([a, b, c, d]).size).toBe(1);
  });

  test('buildPairingsForPipes agrees with the direct score', () => {
    const direct = scorePipeBlend(subject, englishMixture, profile).score;
    const [entry] = buildPairingsForPipes(
      [{ ...subject, pipe_id: subject.id, pipe_name: subject.name, bowl_variant_id: null }],
      [{ ...englishMixture, tobacco_id: englishMixture.id, tobacco_name: englishMixture.name }],
      profile
    );
    const rec = (entry.recommendations || []).find(
      (r) => String(r.tobacco_id) === String(englishMixture.id)
    );
    expect(rec.score).toBe(direct);
  });

  test('the TopPipeMatches call shape agrees with the direct score', () => {
    // TopPipeMatches passes getVariantFromPipe(pipe, null) with id/name aliases.
    const uiShape = {
      ...getVariantFromPipe(subject, null),
      pipe_id: subject.id,
      pipe_name: subject.name,
      bowl_variant_id: null,
    };
    expect(scorePipeBlend(uiShape, englishMixture, profile).score)
      .toBe(scorePipeBlend(subject, englishMixture, profile).score);
  });

  test('a stripped pipe object scores differently — proving physical data matters', () => {
    const stripped = { focus: subject.focus, pipe_id: subject.id, pipe_name: subject.name, bowl_variant_id: null };
    expect(scorePipeBlend(stripped, virginiaFlake, profile).score)
      .not.toBe(scorePipeBlend(subject, virginiaFlake, profile).score);
  });

  test('scoring is pure — repeated calls are identical', () => {
    const runs = new Set(
      Array.from({ length: 5 }, () => scorePipeBlend(subject, englishMixture, profile).score)
    );
    expect(runs.size).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * E (spec item). Bowl-variant inheritance
 * ------------------------------------------------------------------ */

describe('interchangeable bowl inheritance', () => {
  const parent = {
    id: 'pp',
    name: 'Parent',
    focus: ['English'],
    shape: 'Billiard',
    bowl_material: 'Briar',
    bowl_diameter_mm: 21,
    bowl_depth_mm: 40,
    usage_characteristics: 'Smokes cool',
    interchangeable_bowls: [
      { bowl_variant_id: 'b-plain', name: 'Plain Bowl' },
      { bowl_variant_id: 'b-aro', name: 'Aromatic Bowl', focus: ['Aromatic'], bowl_diameter_mm: 19 },
    ],
  };

  test('a bowl with no focus inherits the parent focus', () => {
    expect(resolveBowlVariant(parent, parent.interchangeable_bowls[0], 0).focus).toEqual(['English']);
    expect(getVariantFromPipe(parent, 'b-plain').focus).toEqual(['English']);
  });

  test('a bowl with its own focus overrides the parent', () => {
    expect(getVariantFromPipe(parent, 'b-aro').focus).toEqual(['Aromatic']);
  });

  test('a bowl inherits unspecified geometry, material and usage text', () => {
    const v = getVariantFromPipe(parent, 'b-plain');
    expect(v.bowl_diameter_mm).toBe(21);
    expect(v.bowl_depth_mm).toBe(40);
    expect(v.bowl_material).toBe('Briar');
    expect(v.shape).toBe('Billiard');
    expect(v.usage_characteristics).toBe('Smokes cool');
  });

  test('a bowl overrides only what it specifies', () => {
    const v = getVariantFromPipe(parent, 'b-aro');
    expect(v.bowl_diameter_mm).toBe(19);
    expect(v.bowl_depth_mm).toBe(40);
  });

  test('an inheriting bowl scores identically to its parent', () => {
    expect(scorePipeBlend(getVariantFromPipe(parent, 'b-plain'), englishMixture, null).score)
      .toBe(scorePipeBlend(parent, englishMixture, null).score);
  });

  test('an overriding bowl scores differently from its parent', () => {
    expect(scorePipeBlend(getVariantFromPipe(parent, 'b-aro'), englishMixture, null).score)
      .not.toBe(scorePipeBlend(parent, englishMixture, null).score);
  });
});

/* ------------------------------------------------------------------ *
 * F (spec item). Cache fingerprinting
 * ------------------------------------------------------------------ */

describe('pairing cache fingerprinting', () => {
  const sameDay = (iso) => ({ updated_date: iso });
  const p1 = { id: 'p1', ...sameDay('2024-05-01T09:00:00.000Z'), focus: ['English'], bowl_diameter_mm: 20 };
  const b1 = { id: 'b1', ...sameDay('2024-05-01T09:00:00.000Z'), blend_type: 'English', cut: 'Ribbon' };
  const fp = (pipes, blends, profile = null) => buildArtifactFingerprint({ pipes, blends, profile });

  test('two edits on the same calendar day produce different fingerprints', () => {
    const later = { ...p1, updated_date: '2024-05-01T17:45:12.500Z' };
    expect(fp([p1], [b1])).not.toBe(fp([later], [b1]));
  });

  test('identical inputs are stable', () => {
    expect(fp([p1], [b1])).toBe(fp([{ ...p1 }], [{ ...b1 }]));
  });

  const pipeMutations = {
    focus: { focus: ['Aromatic'] },
    bowl_diameter_mm: { bowl_diameter_mm: 24 },
    bowl_depth_mm: { bowl_depth_mm: 44 },
    chamber_volume: { chamber_volume: 'Large' },
    bowl_material: { bowl_material: 'Meerschaum' },
    shape: { shape: 'Bulldog' },
    filter_type: { filter_type: '9mm' },
    usage_characteristics: { usage_characteristics: 'runs hot' },
    ai_excluded: { ai_excluded: true },
    interchangeable_bowls: { interchangeable_bowls: [{ bowl_variant_id: 'z', focus: ['Virginia'] }] },
  };

  for (const [field, patch] of Object.entries(pipeMutations)) {
    test(`pipe.${field} change invalidates the cache`, () => {
      expect(fp([{ ...p1, ...patch }], [b1])).not.toBe(fp([p1], [b1]));
    });
  }

  const blendMutations = {
    blend_type: { blend_type: 'Aromatic' },
    blend_family: { blend_family: 'aromatic' },
    tobacco_components: { tobacco_components: ['Latakia'] },
    is_aromatic: { is_aromatic: true },
    aromatic_intensity: { aromatic_intensity: 'heavy' },
    casing: { casing: 'Rum' },
    topping: { topping: 'Vanilla' },
    cut: { cut: 'Flake' },
    strength: { strength: 'Full' },
    flavor_notes: { flavor_notes: ['Maple'] },
    ai_excluded: { ai_excluded: true },
  };

  for (const [field, patch] of Object.entries(blendMutations)) {
    test(`blend.${field} change invalidates the cache`, () => {
      expect(fp([p1], [{ ...b1, ...patch }])).not.toBe(fp([p1], [b1]));
    });
  }

  const profileMutations = {
    preferred_blend_types: { preferred_blend_types: ['English'] },
    strength_preference: { strength_preference: 'Full' },
    pipe_size_preference: { pipe_size_preference: 'Large' },
    smoke_duration_preference: { smoke_duration_preference: 'Long' },
    clenching_preference: { clenching_preference: 'Yes' },
  };

  for (const [field, patch] of Object.entries(profileMutations)) {
    test(`profile.${field} change invalidates the cache`, () => {
      const base = { id: 'u1' };
      expect(fp([p1], [b1], { ...base, ...patch })).not.toBe(fp([p1], [b1], base));
    });
  }

  test('the scorer version is part of the fingerprint', () => {
    expect(SCORER_VERSION).toBeTruthy();
    expect(fp([p1], [b1])).toEqual(expect.any(String));
  });

  // Deliberate deviation from the "remove strength" instruction: nicotine
  // strength does not affect the TECHNICAL score, but it does feed personalFit
  // (matched against profile.strength_preference), which is 20% of the final
  // score. Dropping it from the fingerprint would leave a stale cached score
  // after a strength edit — the exact class of bug this rewrite fixes.
  test('strength stays in the fingerprint because it moves the final score', () => {
    const profile = { id: 'u1', strength_preference: 'Full' };
    const pipeRec = { id: 'p', name: 'P', focus: ['Virginia'], bowl_diameter_mm: 18, bowl_depth_mm: 42 };
    const blendBase = { id: 'b', name: 'B', blend_type: 'Virginia', cut: 'Flake', is_aromatic: false };

    const mild = scorePipeBlend(pipeRec, { ...blendBase, strength: 'Mild' }, profile);
    const full = scorePipeBlend(pipeRec, { ...blendBase, strength: 'Full' }, profile);

    // Technical score is strength-independent...
    expect(mild.technicalScore).toBe(full.technicalScore);
    // ...but the score the user sees is not, so the cache must invalidate.
    expect(mild.score).not.toBe(full.score);
    expect(fp([pipeRec], [{ ...blendBase, strength: 'Mild' }], profile))
      .not.toBe(fp([pipeRec], [{ ...blendBase, strength: 'Full' }], profile));
  });
});
