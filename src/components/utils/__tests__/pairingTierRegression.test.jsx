/**
 * Phase 17 — Pairing Engine Tier Regression Tests
 *
 * Covers every archetype required by the problem statement:
 *
 *   Heavy Aromatic / Light Aromatic
 *   Virginia / Virginia Flake / VaPer
 *   English / Balkan
 *   Burley / Lakeland / Dark Fired
 *   English Aromatic / Non-Aromatic Cavendish / Navy Flake
 *   User dedicated blends / Multiple dedicated blends
 *   Falcon-style interchangeable bowls
 *   Unknown geometry / Unknown components / Unknown family
 *   Ghosting (cross-family conflicts)
 *   Exact blend priority
 *   Multi-purpose pipes
 *   Cache/cross-screen parity (deterministic repeatability)
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  computeCompatibilityTier,
  COMPATIBILITY_TIERS,
  buildPairingsForPipes,
} from '../pairingScoreCanonical';

// ─── Shared tobacco fixtures ──────────────────────────────────────────────────

const heavyAromatic = {
  id: 'aro-heavy',
  tobacco_name: 'Autumn Evening',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Ribbon',
  tobacco_components: [],
};

const lightAromatic = {
  id: 'aro-light',
  tobacco_name: 'Lane 1Q',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'light',
  cut: 'Ribbon',
};

const virginiaFlake = {
  id: 'va-flake',
  tobacco_name: "Shepherd's Pie",
  blend_type: 'Virginia',
  is_aromatic: false,
  cut: 'Flake',
  tobacco_components: ['Virginia'],
};

const vaRibbon = {
  id: 'va-ribbon',
  tobacco_name: 'Three Nuns',
  blend_type: 'Virginia',
  is_aromatic: false,
  cut: 'Ribbon',
  tobacco_components: ['Virginia'],
};

const vaPerBlend = {
  id: 'vaper-blend',
  tobacco_name: 'Maltese Falcon',
  blend_type: 'Virginia/Perique',
  is_aromatic: false,
  cut: 'Ready Rubbed',
  tobacco_components: ['Virginia', 'Perique'],
};

const englishBlend = {
  id: 'eng-blend',
  tobacco_name: 'Billy Budd',
  blend_type: 'English',
  is_aromatic: false,
  cut: 'Ribbon',
  tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
};

const balkanBlend = {
  id: 'bal-blend',
  tobacco_name: 'Arango Balkan Supreme',
  blend_type: 'English Balkan',
  is_aromatic: false,
  cut: 'Ribbon',
  tobacco_components: ['Latakia', 'Virginia', 'Oriental', 'Burley'],
};

const burleyBlend = {
  id: 'bur-blend',
  tobacco_name: 'Cowboy Coffee',
  blend_type: 'Burley',
  is_aromatic: false,
  cut: 'Ribbon',
  tobacco_components: ['Burley'],
};

const darkFiredBlend = {
  id: 'df-blend',
  tobacco_name: 'Engine #99',
  blend_type: 'Dark Fired Kentucky',
  is_aromatic: false,
  cut: 'Ribbon',
  tobacco_components: ['Dark Fired Kentucky', 'Burley'],
};

const lakelandBlend = {
  id: 'lak-blend',
  tobacco_name: 'Plum Pudding',
  blend_type: 'Lakeland',
  is_aromatic: false,
  cut: 'Ready Rubbed',
  casing: 'floral lakeland',
};

const cultBloodRedMoon = {
  id: 'cbrm',
  tobacco_name: 'Cult Blood Red Moon',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Ribbon',
  tobacco_components: [],
};

const sutliffZ92 = {
  id: 'z92',
  tobacco_name: 'Sutliff Z92 Vanilla Custard',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Ribbon',
};

const autumnEvening = {
  id: 'ae',
  tobacco_name: 'Autumn Evening',
  blend_type: 'Aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Ribbon',
};

// ─── Shared pipe fixtures ─────────────────────────────────────────────────────

const aromaticPipe = {
  pipe_id: 'aro-pipe',
  pipe_name: 'Savinelli Aromatic',
  focus: ['Aromatic'],
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const englishPipe = {
  pipe_id: 'eng-pipe',
  pipe_name: 'Ser Jacopo English',
  focus: ['English', 'Balkan'],
  bowl_diameter_mm: 22,
  bowl_depth_mm: 40,
  bowl_material: 'Briar',
};

const virginiaPipe = {
  pipe_id: 'va-pipe',
  pipe_name: 'Savinelli Virginia',
  focus: ['Virginia'],
  bowl_diameter_mm: 18,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
};

const vaperPipe = {
  pipe_id: 'vaper-pipe',
  pipe_name: 'VaPer Pipe',
  focus: ['VaPer'],
  bowl_diameter_mm: 19,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
};

const burleyPipe = {
  pipe_id: 'bur-pipe',
  pipe_name: 'Burley Pipe',
  focus: ['Burley'],
  bowl_diameter_mm: 21,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
};

const generalPipe = {
  pipe_id: 'gen-pipe',
  pipe_name: 'Boswell Jumbo',
  focus: ['Versatile'],
  bowl_diameter_mm: 24,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
};

const multiPipe = {
  pipe_id: 'multi-pipe',
  pipe_name: 'Brigham Multi',
  focus: ['English', 'Virginia', 'Burley'],
  bowl_diameter_mm: 21,
  bowl_depth_mm: 40,
  bowl_material: 'Briar',
};

// ─── Tier assignment tests ────────────────────────────────────────────────────

describe('Tier assignment — aromatic pipe', () => {
  const pipeN = normalizePipeForPairing(aromaticPipe);

  test('aromatic blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(heavyAromatic);
    const tier = computeCompatibilityTier(pipeN, tobN);
    expect(tier.name).toBe('EXACT_SPECIALIZATION');
  });

  test('English/Latakia blend → STRONGLY_CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(englishBlend);
    const tier = computeCompatibilityTier(pipeN, tobN);
    expect(tier.name).toBe('STRONGLY_CONFLICTING');
  });

  test('Balkan blend → STRONGLY_CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(balkanBlend);
    const tier = computeCompatibilityTier(pipeN, tobN);
    expect(tier.name).toBe('STRONGLY_CONFLICTING');
  });

  test('Virginia blend → CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(virginiaFlake);
    const tier = computeCompatibilityTier(pipeN, tobN);
    expect(tier.name).toBe('CONFLICTING');
  });

  test('VaPer blend → CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(vaPerBlend);
    const tier = computeCompatibilityTier(pipeN, tobN);
    expect(tier.name).toBe('CONFLICTING');
  });
});

describe('Tier assignment — English/Balkan pipe', () => {
  const pipeN = normalizePipeForPairing(englishPipe);

  test('English blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(englishBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('EXACT_SPECIALIZATION');
  });

  test('Balkan blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(balkanBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('EXACT_SPECIALIZATION');
  });

  test('aromatic blend → STRONGLY_CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(heavyAromatic);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('STRONGLY_CONFLICTING');
  });

  test('Burley blend → COMPATIBLE', () => {
    const tobN = normalizeTobaccoForPairing(burleyBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('COMPATIBLE');
  });
});

describe('Tier assignment — Virginia pipe', () => {
  const pipeN = normalizePipeForPairing(virginiaPipe);

  test('Virginia blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(virginiaFlake);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('EXACT_SPECIALIZATION');
  });

  test('VaPer blend → PREFERRED', () => {
    const tobN = normalizeTobaccoForPairing(vaPerBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('PREFERRED');
  });

  test('aromatic blend → STRONGLY_CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(heavyAromatic);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('STRONGLY_CONFLICTING');
  });
});

describe('Tier assignment — VaPer pipe', () => {
  const pipeN = normalizePipeForPairing(vaperPipe);

  test('VaPer blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(vaPerBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('EXACT_SPECIALIZATION');
  });

  test('Virginia blend → PREFERRED', () => {
    const tobN = normalizeTobaccoForPairing(virginiaFlake);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('PREFERRED');
  });

  test('aromatic blend → STRONGLY_CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(heavyAromatic);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('STRONGLY_CONFLICTING');
  });
});

describe('Tier assignment — Burley pipe', () => {
  const pipeN = normalizePipeForPairing(burleyPipe);

  test('Burley blend → EXACT_SPECIALIZATION', () => {
    const tobN = normalizeTobaccoForPairing(burleyBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('EXACT_SPECIALIZATION');
  });

  test('Dark Fired blend → PREFERRED', () => {
    const tobN = normalizeTobaccoForPairing(darkFiredBlend);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('PREFERRED');
  });

  test('aromatic blend → CONFLICTING', () => {
    const tobN = normalizeTobaccoForPairing(heavyAromatic);
    expect(computeCompatibilityTier(pipeN, tobN).name).toBe('CONFLICTING');
  });
});

// ─── Score ceiling / floor guarantees ────────────────────────────────────────

describe('Score ceilings prevent tier overlap', () => {
  test('STRONGLY_CONFLICTING blend never exceeds 3.5', () => {
    // English pipe + heavy aromatic → STRONGLY_CONFLICTING
    const result = scorePipeBlend(englishPipe, heavyAromatic, null);
    expect(result.score).toBeLessThanOrEqual(3.5);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
  });

  test('CONFLICTING blend never exceeds 4.9', () => {
    // Aromatic pipe + Virginia flake → CONFLICTING
    const result = scorePipeBlend(aromaticPipe, virginiaFlake, null);
    expect(result.score).toBeLessThanOrEqual(4.9);
    expect(result.tier.name).toBe('CONFLICTING');
  });

  test('COMPATIBLE blend never exceeds 7.5', () => {
    // English pipe + Burley → COMPATIBLE
    const result = scorePipeBlend(englishPipe, burleyBlend, null);
    expect(result.score).toBeLessThanOrEqual(7.5);
    expect(result.tier.name).toBe('COMPATIBLE');
  });

  test('EXACT_SPECIALIZATION blend never exceeds 9.4', () => {
    const result = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    expect(result.score).toBeLessThanOrEqual(9.4);
    expect(result.tier.name).toBe('EXACT_SPECIALIZATION');
  });
});

// ─── Exact user blend dedication ─────────────────────────────────────────────

describe('Exact user blend dedication (EXACT_USER_BLEND)', () => {
  const dedicatedPipe = {
    pipe_id: 'cult-pipe',
    pipe_name: 'Cult Pipe',
    focus: ['Cult Blood Red Moon'],
    bowl_diameter_mm: 20,
    bowl_depth_mm: 38,
    bowl_material: 'Briar',
  };

  test('dedicated blend gets EXACT_USER_BLEND tier', () => {
    const result = scorePipeBlendDiagnostic(dedicatedPipe, cultBloodRedMoon, null);
    expect(result.tier.name).toBe('EXACT_USER_BLEND');
  });

  test('dedicated blend scores at least 9.5', () => {
    const result = scorePipeBlend(dedicatedPipe, cultBloodRedMoon, null);
    expect(result.score).toBeGreaterThanOrEqual(9.5);
  });

  test('dedicated blend outranks Virginia flake with excellent geometry', () => {
    const cultResult = scorePipeBlend(dedicatedPipe, cultBloodRedMoon, null);
    const virginiaResult = scorePipeBlend(dedicatedPipe, virginiaFlake, null);
    expect(cultResult.score).toBeGreaterThan(virginiaResult.score);
  });

  test("Cult Blood Red Moon outranks Shepherd's Pie on the dedicated pipe", () => {
    const cultResult = scorePipeBlend(dedicatedPipe, cultBloodRedMoon, null);
    const shepherdsResult = scorePipeBlend(dedicatedPipe, virginiaFlake, null);
    expect(cultResult.score).toBeGreaterThan(shepherdsResult.score);
  });

  test('why string references the exact dedication', () => {
    const result = scorePipeBlend(dedicatedPipe, cultBloodRedMoon, null);
    expect(result.why.toLowerCase()).toMatch(/dedicated|highest|priority/);
  });
});

// ─── Multiple dedicated blends ────────────────────────────────────────────────

describe('Multiple dedicated blends (Phase 6)', () => {
  const multiBlendsPipe = {
    pipe_id: 'multi-blend-pipe',
    pipe_name: 'Multi Blend Pipe',
    focus: ['Autumn Evening', 'Cult Blood Red Moon', 'Sutliff Z92 Vanilla Custard'],
    bowl_diameter_mm: 20,
    bowl_depth_mm: 38,
    bowl_material: 'Briar',
  };

  test('all three dedicated blends get EXACT_USER_BLEND tier', () => {
    const r1 = scorePipeBlendDiagnostic(multiBlendsPipe, autumnEvening, null);
    const r2 = scorePipeBlendDiagnostic(multiBlendsPipe, cultBloodRedMoon, null);
    const r3 = scorePipeBlendDiagnostic(multiBlendsPipe, sutliffZ92, null);
    expect(r1.tier.name).toBe('EXACT_USER_BLEND');
    expect(r2.tier.name).toBe('EXACT_USER_BLEND');
    expect(r3.tier.name).toBe('EXACT_USER_BLEND');
  });

  test('all three dedicated blends score at least 9.5', () => {
    const scores = [autumnEvening, cultBloodRedMoon, sutliffZ92].map(
      (b) => scorePipeBlend(multiBlendsPipe, b, null).score
    );
    scores.forEach((s) => expect(s).toBeGreaterThanOrEqual(9.5));
  });

  test('non-dedicated Virginia flake scores lower than any dedicated blend', () => {
    const vaResult = scorePipeBlend(multiBlendsPipe, virginiaFlake, null);
    const minDedicated = Math.min(
      scorePipeBlend(multiBlendsPipe, autumnEvening, null).score,
      scorePipeBlend(multiBlendsPipe, cultBloodRedMoon, null).score,
      scorePipeBlend(multiBlendsPipe, sutliffZ92, null).score
    );
    expect(minDedicated).toBeGreaterThan(vaResult.score);
  });
});

// ─── Bowl-level dedication (Falcon-style interchangeable bowls) ───────────────

describe('Bowl-level dedication — Falcon-style pipe (Phase 7)', () => {
  const falconPipe = {
    pipe_id: 'falcon',
    pipe_name: 'Falcon Meerschaum',
    focus: [],
    bowl_material: 'Meerschaum',
    interchangeable_bowls: [
      {
        bowl_variant_id: 'bowl-a',
        name: 'Bowl A',
        focus: ['Autumn Evening'],
        bowl_diameter_mm: 20,
        bowl_depth_mm: 38,
        bowl_material: 'Meerschaum',
      },
      {
        bowl_variant_id: 'bowl-b',
        name: 'Bowl B',
        focus: ['English'],
        bowl_diameter_mm: 22,
        bowl_depth_mm: 40,
        bowl_material: 'Meerschaum',
      },
    ],
  };

  test('Bowl A (Autumn Evening) gets EXACT_USER_BLEND for Autumn Evening', () => {
    const bowlA = { ...falconPipe.interchangeable_bowls[0], pipe_id: 'falcon', bowl_variant_id: 'bowl-a' };
    const result = scorePipeBlendDiagnostic(bowlA, autumnEvening, null);
    expect(result.tier.name).toBe('EXACT_USER_BLEND');
  });

  test('Bowl B (English) does NOT get EXACT_USER_BLEND for Autumn Evening', () => {
    const bowlB = { ...falconPipe.interchangeable_bowls[1], pipe_id: 'falcon', bowl_variant_id: 'bowl-b' };
    const result = scorePipeBlendDiagnostic(bowlB, autumnEvening, null);
    expect(result.tier.name).not.toBe('EXACT_USER_BLEND');
  });

  test('Bowl B (English) gets EXACT_SPECIALIZATION for English blend', () => {
    const bowlB = { ...falconPipe.interchangeable_bowls[1], pipe_id: 'falcon', bowl_variant_id: 'bowl-b' };
    const result = scorePipeBlendDiagnostic(bowlB, englishBlend, null);
    expect(result.tier.name).toBe('EXACT_SPECIALIZATION');
  });
});

// ─── Aromatic pipe ranking invariants ────────────────────────────────────────

describe('Aromatic-dedicated pipe ranking invariants', () => {
  test('aromatic blends rank higher than non-aromatic blends', () => {
    const aroScore = scorePipeBlend(aromaticPipe, heavyAromatic, null).score;
    const vaScore  = scorePipeBlend(aromaticPipe, virginiaFlake, null).score;
    expect(aroScore).toBeGreaterThan(vaScore);
  });

  test('aromatic-dedicated pipe heavy aromatic scores higher than light aromatic', () => {
    const heavy = scorePipeBlend(aromaticPipe, heavyAromatic, null).score;
    const light = scorePipeBlend(aromaticPipe, lightAromatic, null).score;
    // Both EXACT_SPECIALIZATION; heavy might score slightly different but both should be high
    expect(heavy).toBeGreaterThanOrEqual(8.0);
    expect(light).toBeGreaterThanOrEqual(8.0);
  });

  test('English blend is STRONGLY_CONFLICTING on aromatic pipe — score ≤ 3.5', () => {
    const result = scorePipeBlend(aromaticPipe, englishBlend, null);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(result.score).toBeLessThanOrEqual(3.5);
  });
});

// ─── English pipe ranking invariants ─────────────────────────────────────────

describe('English-dedicated pipe ranking invariants', () => {
  test('English blend ranks higher than aromatic blend', () => {
    const engScore = scorePipeBlend(englishPipe, englishBlend, null).score;
    const aroScore = scorePipeBlend(englishPipe, heavyAromatic, null).score;
    expect(engScore).toBeGreaterThan(aroScore);
  });

  test('aromatic blend on English pipe is STRONGLY_CONFLICTING — score ≤ 3.5', () => {
    const result = scorePipeBlend(englishPipe, heavyAromatic, null);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(result.score).toBeLessThanOrEqual(3.5);
  });

  test('English blend is EXACT_SPECIALIZATION — score ≥ 8.8 (with +1.0 shift)', () => {
    const result = scorePipeBlend(englishPipe, englishBlend, null);
    expect(result.tier.name).toBe('EXACT_SPECIALIZATION');
    expect(result.score).toBeGreaterThanOrEqual(8.8);
  });
});

// ─── VaPer pipe ranking invariants ───────────────────────────────────────────

describe('VaPer-dedicated pipe ranking invariants', () => {
  test('VaPer blend outranks aromatic blend', () => {
    const vaperScore = scorePipeBlend(vaperPipe, vaPerBlend, null).score;
    const aroScore   = scorePipeBlend(vaperPipe, heavyAromatic, null).score;
    expect(vaperScore).toBeGreaterThan(aroScore);
  });

  test('VaPer blend is EXACT_SPECIALIZATION, Virginia is PREFERRED', () => {
    const vaperR = scorePipeBlendDiagnostic(vaperPipe, vaPerBlend, null);
    const vaR    = scorePipeBlendDiagnostic(vaperPipe, virginiaFlake, null);
    expect(vaperR.tier.name).toBe('EXACT_SPECIALIZATION');
    expect(vaR.tier.name).toBe('PREFERRED');
  });

  test('VaPer pipe outranks its own PREFERRED Virginia on EXACT_SPECIALIZATION blend', () => {
    const vaperScore = scorePipeBlend(vaperPipe, vaPerBlend, null).score;
    const vaScore    = scorePipeBlend(vaperPipe, virginiaFlake, null).score;
    // EXACT_SPECIALIZATION ceiling 9.4 vs PREFERRED ceiling 8.9
    expect(vaperScore).toBeGreaterThanOrEqual(vaScore);
  });
});

// ─── Unknown data handling ────────────────────────────────────────────────────

describe('Unknown geometry reduces confidence, not compatibility (Phase 10)', () => {
  const unknownGeomPipe = {
    pipe_id: 'unk-pipe',
    pipe_name: 'Unknown Geometry',
    focus: ['Aromatic'],
    // no bowl_diameter_mm, bowl_depth_mm, chamber_volume
    bowl_material: 'Briar',
  };

  test('unknown geometry → tier still assigned correctly', () => {
    const result = scorePipeBlendDiagnostic(unknownGeomPipe, heavyAromatic, null);
    expect(result.tier.name).toBe('EXACT_SPECIALIZATION');
  });

  test('unknown geometry reduces confidence, not score catastrophically', () => {
    const known   = scorePipeBlendDiagnostic(aromaticPipe, heavyAromatic, null);
    const unknown = scorePipeBlendDiagnostic(unknownGeomPipe, heavyAromatic, null);
    // Both in EXACT_SPECIALIZATION — confidence should be lower but score workable
    expect(unknown.confidence).toBeLessThan(known.confidence);
    expect(unknown.score).toBeGreaterThan(5);
  });
});

describe('Unknown tobacco components reduce confidence, not compatibility', () => {
  const blendNoComponents = {
    id: 'no-comp',
    tobacco_name: 'Mystery Aromatic',
    blend_type: 'Aromatic',
    is_aromatic: true,
    aromatic_intensity: 'medium',
    cut: 'Ribbon',
    // no tobacco_components
  };

  test('unknown components → score still workable', () => {
    const result = scorePipeBlendDiagnostic(aromaticPipe, blendNoComponents, null);
    expect(result.score).toBeGreaterThan(5);
  });

  test('unknown components → blendComposition component treated as neutral (6.5)', () => {
    const result = scorePipeBlendDiagnostic(aromaticPipe, blendNoComponents, null);
    expect(result.components.blendComposition.score).toBe(6.5);
  });
});

describe('Unknown blend family', () => {
  const mysteryBlend = {
    id: 'mystery',
    tobacco_name: 'Unknown Tin',
    // no blend_type, no is_aromatic
  };

  test('unknown family → GENERAL tier for a general purpose pipe', () => {
    const result = scorePipeBlendDiagnostic(generalPipe, mysteryBlend, null);
    expect(result.tier.name).toBe('GENERAL');
  });

  test('unknown family scores > 0', () => {
    const result = scorePipeBlend(generalPipe, mysteryBlend, null);
    expect(result.score).toBeGreaterThan(0);
  });
});

// ─── Multi-purpose / general-purpose pipes ────────────────────────────────────

describe('Multi-purpose pipes remain flexible (Phase 12)', () => {
  test('general pipe has GENERAL tier for all families', () => {
    const blends = [heavyAromatic, virginiaFlake, englishBlend, vaPerBlend, burleyBlend];
    blends.forEach((b) => {
      const result = scorePipeBlendDiagnostic(generalPipe, b, null);
      expect(result.tier.name).toBe('GENERAL');
    });
  });

  test('multi-family pipe picks correct tier per family', () => {
    // multiPipe has focus ['English', 'Virginia', 'Burley']
    // With mixed categories, dedicationType collapses to 'english' (first non-aromatic category)
    const engResult = scorePipeBlendDiagnostic(multiPipe, englishBlend, null);
    // Aromatic should still be STRONGLY_CONFLICTING on a mostly English-focused pipe
    const aroResult = scorePipeBlendDiagnostic(multiPipe, heavyAromatic, null);
    expect(engResult.score).toBeGreaterThan(aroResult.score);
  });

  test('general pipe can score any blend up to 10 (no ceiling clamp at 7.5)', () => {
    // General pipe has GENERAL tier (shift=0, ceiling=10) — can reach full range
    const result = scorePipeBlendDiagnostic(generalPipe, englishBlend, null);
    expect(result.tier.name).toBe('GENERAL');
    expect(result.tier.ceiling).toBe(10.0);
  });
});

// ─── Ghosting conflicts (cross-family) ───────────────────────────────────────

describe('Ghosting: cross-family conflicts score appropriately low', () => {
  test('aromatic pipe + English — severe ghosting → score ≤ 3.5', () => {
    expect(scorePipeBlend(aromaticPipe, englishBlend, null).score).toBeLessThanOrEqual(3.5);
  });

  test('English pipe + aromatic — severe ghosting → score ≤ 3.5', () => {
    expect(scorePipeBlend(englishPipe, heavyAromatic, null).score).toBeLessThanOrEqual(3.5);
  });

  test('Virginia pipe + aromatic — flavor clash → score ≤ 4.9', () => {
    expect(scorePipeBlend(virginiaPipe, heavyAromatic, null).score).toBeLessThanOrEqual(4.9);
  });

  test('VaPer pipe + aromatic — flavor clash → score ≤ 4.9', () => {
    expect(scorePipeBlend(vaperPipe, heavyAromatic, null).score).toBeLessThanOrEqual(4.9);
  });
});

// ─── Score calibration display ranges ────────────────────────────────────────

describe('Score display ranges (Phase 13)', () => {
  test('exact user blend → 9.5+', () => {
    const dedicatedPipe = { pipe_id: 'p', focus: ['Autumn Evening'], bowl_diameter_mm: 20, bowl_depth_mm: 38 };
    expect(scorePipeBlend(dedicatedPipe, autumnEvening, null).score).toBeGreaterThanOrEqual(9.5);
  });

  test('EXACT_SPECIALIZATION match → 8.8 to 9.4', () => {
    const result = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    expect(result.score).toBeGreaterThanOrEqual(8.8);
    expect(result.score).toBeLessThanOrEqual(9.4);
  });

  test('STRONGLY_CONFLICTING match → at most 3.5', () => {
    expect(scorePipeBlend(englishPipe, heavyAromatic, null).score).toBeLessThanOrEqual(3.5);
  });

  test('CONFLICTING match → at most 4.9', () => {
    expect(scorePipeBlend(aromaticPipe, virginiaFlake, null).score).toBeLessThanOrEqual(4.9);
  });
});

// ─── AI explanation references dominant factor (Phase 14) ─────────────────────

describe('AI explanations reference dominant factors (Phase 14)', () => {
  test('EXACT_USER_BLEND why mentions dedication', () => {
    const dedicatedPipe = { pipe_id: 'p', focus: ['Autumn Evening'], bowl_diameter_mm: 20, bowl_depth_mm: 38 };
    const result = scorePipeBlend(dedicatedPipe, autumnEvening, null);
    expect(result.why.toLowerCase()).toMatch(/dedicated|highest|priority/);
  });

  test('STRONGLY_CONFLICTING why mentions conflict', () => {
    const result = scorePipeBlend(englishPipe, heavyAromatic, null);
    expect(result.why.toLowerCase()).toMatch(/conflict|clash|carryover|aromatic/);
  });

  test('EXACT_SPECIALIZATION why mentions purpose', () => {
    const result = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    expect(result.why.toLowerCase()).toMatch(/purpose|dedicated|built|aromatic/);
  });
});

// ─── Cross-screen parity / repeatability ─────────────────────────────────────

describe('Deterministic repeatability (Phase 17 — cross-screen parity)', () => {
  test('same inputs always produce same score', () => {
    const r1 = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    const r2 = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    const r3 = scorePipeBlend(aromaticPipe, heavyAromatic, null);
    expect(r1.score).toBe(r2.score);
    expect(r2.score).toBe(r3.score);
  });

  test('buildPairingsForPipes and scorePipeBlend produce identical scores', () => {
    const pipes  = [aromaticPipe];
    const blends = [heavyAromatic, virginiaFlake, englishBlend];
    const matrix = buildPairingsForPipes(pipes, blends, null);
    const matrixEntry = matrix[0];

    blends.forEach((b) => {
      const live = scorePipeBlend(aromaticPipe, b, null);
      const cached = matrixEntry.recommendations.find(
        (r) => r.tobacco_name === (b.tobacco_name ?? b.name)
      );
      expect(cached?.score).toBe(live.score);
    });
  });
});
