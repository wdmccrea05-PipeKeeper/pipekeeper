/**
 * Regression tests for pipe specialization as a primary scoring factor.
 *
 * These tests prove that:
 * 1. An Aromatic-focused pipe ranks Aromatic blends above English/Balkan/Virginia.
 * 2. A Heavy Aromatics pipe receives the same canonical Aromatic family compatibility.
 * 3. An exact named tobacco in focus receives an additional exact-match bonus.
 * 4. A multi-focus pipe parses every focus correctly.
 * 5. An unrelated family cannot beat a preferred-family blend through minor generic
 *    scoring advantages.
 * 6. Strong recorded user experience can eventually overcome the specialization prior.
 * 7. Existing non-aromatic pipe specialization continues working correctly.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  normalizePipeForPairing,
  normalizeTobaccoForPairing,
  computeCompatibilityTier,
  inferBlendFamily,
  inferAromaticFromFields,
} from '../pairingScoreCanonical';

// ── Fixtures ──────────────────────────────────────────────────────────

const aromaticBlend = {
  id: 'aro-1',
  name: 'Lane 1Q',
  blend_type: 'Aromatic',
  blend_family: 'aromatic',
  is_aromatic: true,
  aromatic_intensity: 'light',
  cut: 'Ribbon',
  strength: 'Mild',
  tobacco_components: ['Black Cavendish', 'Virginia', 'Burley'],
};

const heavyAromaticBlend = {
  id: 'aro-2',
  name: 'Cult Blood Red Moon',
  blend_type: 'Aromatic',
  blend_family: 'aromatic',
  is_aromatic: true,
  aromatic_intensity: 'heavy',
  cut: 'Coarse Cut',
  strength: 'Mild',
  tobacco_components: ['Black Cavendish', 'Virginia', 'Burley'],
  topping: 'Cherry',
};

const englishBlend = {
  id: 'eng-1',
  name: "Shepherd's Pie",
  blend_type: 'English',
  blend_family: 'english',
  is_aromatic: false,
  cut: 'Ribbon',
  strength: 'Medium',
  tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
};

// English blend with incorrectly-set is_aromatic: true (data error from correction_pass_6)
const englishBlendAromaticFlagged = {
  id: 'eng-2',
  name: "Shepherd's Pie (miscategorized)",
  blend_type: 'English',
  blend_family: 'english',
  is_aromatic: true, // incorrectly set
  cut: 'Ribbon',
  strength: 'Medium',
  tobacco_components: ['Latakia', 'Virginia', 'Oriental'],
};

const balkanBlend = {
  id: 'blk-1',
  name: 'Arango Balkan Supreme',
  blend_type: 'English',
  blend_family: 'english',
  is_aromatic: false,
  cut: 'Ribbon',
  strength: 'Medium',
  tobacco_components: ['Virginia', 'Latakia', 'Oriental'],
};

const virginiaBlend = {
  id: 'vir-1',
  name: 'Peterson Irish Flake',
  blend_type: 'Virginia',
  blend_family: 'virginia',
  is_aromatic: false,
  cut: 'Flake',
  strength: 'Medium',
  tobacco_components: ['Virginia'],
};

const vaperBlend = {
  id: 'vpr-1',
  name: 'Escudo Navy Deluxe',
  blend_type: 'Virginia/Perique',
  blend_family: 'vaper',
  is_aromatic: false,
  cut: 'Coin',
  strength: 'Medium',
  tobacco_components: ['Virginia', 'Perique'],
};

const burleyBlend = {
  id: 'bur-1',
  name: 'Prince Albert',
  blend_type: 'Burley',
  blend_family: 'burley',
  is_aromatic: false,
  cut: 'Ribbon',
  strength: 'Medium',
  tobacco_components: ['Burley'],
};

// Pipes with measured geometry (so geometry doesn't dominate)
const aromaticPipe = {
  pipe_id: 'p-aro',
  pipe_name: 'Aromatic Dedicated Pipe',
  focus: ['Aromatic'],
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
  shape: 'Billiard',
};

const heavyAromaticPipe = {
  pipe_id: 'p-haro',
  pipe_name: 'Heavy Aromatic Pipe',
  focus: ['Heavy Aromatics', 'Cult Blood Red Moon', 'Aromatic'],
  bowl_diameter_mm: 23,
  bowl_depth_mm: 34,
  bowl_material: 'Briar',
  shape: 'Author',
};

const englishPipe = {
  pipe_id: 'p-eng',
  pipe_name: 'English Dedicated Pipe',
  focus: ['English', 'Balkan'],
  bowl_diameter_mm: 22,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
  shape: 'Billiard',
};

const virginiaPipe = {
  pipe_id: 'p-vir',
  pipe_name: 'Virginia Dedicated Pipe',
  focus: ['Virginia'],
  bowl_diameter_mm: 18,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
  shape: 'Billiard',
};

const vaperPipe = {
  pipe_id: 'p-vpr',
  pipe_name: 'VaPer Dedicated Pipe',
  focus: ['VaPer'],
  bowl_diameter_mm: 18,
  bowl_depth_mm: 42,
  bowl_material: 'Briar',
  shape: 'Billiard',
};

const utilityPipe = {
  pipe_id: 'p-uti',
  pipe_name: 'Utility Pipe',
  focus: ['Versatile'],
  bowl_diameter_mm: 20,
  bowl_depth_mm: 38,
  bowl_material: 'Briar',
  shape: 'Billiard',
};

// ── 1. Aromatic-focused pipe ranks Aromatic above English/Balkan/Virginia ──

describe('1. Aromatic-focused pipe ranks Aromatic blends above non-Aromatic', () => {
  test('aromatic blend scores higher than English, Balkan, and Virginia on aromatic pipe', () => {
    const aroScore = scorePipeBlend(aromaticPipe, aromaticBlend, null);
    const engScore = scorePipeBlend(aromaticPipe, englishBlend, null);
    const blkScore = scorePipeBlend(aromaticPipe, balkanBlend, null);
    const virScore = scorePipeBlend(aromaticPipe, virginiaBlend, null);

    expect(aroScore.score).toBeGreaterThan(engScore.score);
    expect(aroScore.score).toBeGreaterThan(blkScore.score);
    expect(aroScore.score).toBeGreaterThan(virScore.score);
  });

  test('English/Balkan blends are capped by STRONGLY_CONFLICTING tier on aromatic pipe', () => {
    const engResult = scorePipeBlendDiagnostic(aromaticPipe, englishBlend, null);
    const blkResult = scorePipeBlendDiagnostic(aromaticPipe, balkanBlend, null);

    expect(engResult.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(blkResult.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(engResult.score).toBeLessThanOrEqual(3.5);
    expect(blkResult.score).toBeLessThanOrEqual(3.5);
  });

  test('aromatic blend receives EXACT_SPECIALIZATION tier on aromatic pipe', () => {
    const aroResult = scorePipeBlendDiagnostic(aromaticPipe, aromaticBlend, null);
    expect(aroResult.tier.name).toBe('EXACT_SPECIALIZATION');
    expect(aroResult.score).toBeGreaterThan(7);
  });

  test('English blend with incorrectly-set is_aromatic:true is still classified as English family', () => {
    // This is the key fix: Latakia structural evidence takes precedence over is_aromatic flag
    const family = inferBlendFamily(englishBlendAromaticFlagged, inferAromaticFromFields(englishBlendAromaticFlagged), ['Latakia', 'Virginia', 'Oriental']);
    expect(family).toBe('english');

    // And it should be capped at STRONGLY_CONFLICTING on an aromatic pipe
    const result = scorePipeBlendDiagnostic(aromaticPipe, englishBlendAromaticFlagged, null);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(result.score).toBeLessThanOrEqual(3.5);
  });
});

// ── 2. Heavy Aromatics pipe receives same canonical Aromatic compatibility ──

describe('2. Heavy Aromatics focus → canonical Aromatic family compatibility', () => {
  test("Heavy Aromatics focus maps to aromatic dedicationType", () => {
    const np = normalizePipeForPairing(heavyAromaticPipe);
    expect(np.dedicationType).toBe('aromatic');
    expect(np.isHeavyAromaticFocus).toBe(true);
  });

  test('heavy aromatic pipe scores aromatic blends in EXACT_SPECIALIZATION tier', () => {
    const result = scorePipeBlendDiagnostic(heavyAromaticPipe, aromaticBlend, null);
    expect(result.tier.name).toBe('EXACT_SPECIALIZATION');
  });

  test('heavy aromatic pipe caps English/Balkan at STRONGLY_CONFLICTING', () => {
    const engResult = scorePipeBlendDiagnostic(heavyAromaticPipe, englishBlend, null);
    expect(engResult.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(engResult.score).toBeLessThanOrEqual(3.5);
  });

  test('heavy aromatic pipe gives perfect dedication score for heavy aromatic blend', () => {
    const result = scorePipeBlendDiagnostic(heavyAromaticPipe, heavyAromaticBlend, null);
    expect(result.components.dedication.score).toBe(10);
  });
});

// ── 3. Exact named tobacco in focus receives additional bonus ──

describe('3. Exact named tobacco in focus receives exact-match bonus', () => {
  test('Cult Blood Red Moon in focus matches Cult Blood Red Moon blend as EXACT_USER_BLEND', () => {
    const result = scorePipeBlendDiagnostic(heavyAromaticPipe, heavyAromaticBlend, null);
    expect(result.tier.name).toBe('EXACT_USER_BLEND');
    expect(result.score).toBeGreaterThanOrEqual(9.5);
  });

  test('exact blend focus match scores higher than a non-named aromatic blend', () => {
    const namedResult = scorePipeBlend(heavyAromaticPipe, heavyAromaticBlend, null);
    const unnamedResult = scorePipeBlend(heavyAromaticPipe, aromaticBlend, null);
    expect(namedResult.score).toBeGreaterThan(unnamedResult.score);
  });
});

// ── 4. Multi-focus pipe parses every focus correctly ──

describe('4. Multi-focus pipe parses every focus correctly', () => {
  test("Heavy Aromatics, Cult Blood Red Moon, Aromatic → all three parsed", () => {
    const np = normalizePipeForPairing(heavyAromaticPipe);
    // Heavy Aromatics and Aromatic both map to aromatic category
    expect(np.focusCategories).toContain('aromatic');
    // Cult Blood Red Moon is recognized as an exact blend focus
    expect(np.exactBlendFocus).toEqual(
      expect.arrayContaining([expect.stringMatching(/cult blood red moon/i)])
    );
    // Heavy aromatic flag is set
    expect(np.isHeavyAromaticFocus).toBe(true);
  });

  test('a focus with English + Aromatic parses both categories', () => {
    const pipe = {
      ...aromaticPipe,
      pipe_id: 'p-mix',
      focus: ['English', 'Aromatic'],
    };
    const np = normalizePipeForPairing(pipe);
    expect(np.focusCategories).toContain('aromatic');
    expect(np.focusCategories).toContain('english');
  });
});

// ── 5. Unrelated family cannot beat preferred-family through minor generic advantages ──

describe('5. Unrelated family cannot beat preferred-family blend', () => {
  test('aromatic blend beats English blend even when English has better geometry', () => {
    // Give the English blend a wider chamber (which English prefers) and the
    // aromatic blend a narrower chamber (which is less ideal). The aromatic
    // should still win on an aromatic-dedicated pipe.
    const wideEnglishPipe = {
      ...aromaticPipe,
      bowl_diameter_mm: 24, // wide — favors English geometry
      bowl_depth_mm: 38,
    };
    const engScore = scorePipeBlend(wideEnglishPipe, englishBlend, null);
    const aroScore = scorePipeBlend(wideEnglishPipe, aromaticBlend, null);

    expect(aroScore.score).toBeGreaterThan(engScore.score);
  });

  test('Virginia blend cannot outrank Aromatic on aromatic pipe through generic factors', () => {
    const aroScore = scorePipeBlend(aromaticPipe, aromaticBlend, null);
    const virScore = scorePipeBlend(aromaticPipe, virginiaBlend, null);
    expect(aroScore.score).toBeGreaterThan(virScore.score);
    expect(virScore.score).toBeLessThanOrEqual(4.9); // CONFLICTING ceiling
  });
});

// ── 6. Strong recorded user experience can overcome specialization prior ──

describe('6. Strong user experience overrides specialization prior', () => {
  test('English blend normally capped at 3.5 on aromatic pipe, but experience overrides', () => {
    // Without experience: English is capped
    const withoutExp = scorePipeBlendDiagnostic(aromaticPipe, englishBlend, null);
    expect(withoutExp.score).toBeLessThanOrEqual(3.5);

    // With strong experience (3+ sessions, avg 4.5/5): ceiling relaxed to 9.5
    const profileWithExperience = {
      experienceEvidence: {
        [`${aromaticPipe.pipe_id}__${englishBlend.id}`]: {
          avgRating: 4.5,
          sessionCount: 5,
        },
      },
    };
    const withExp = scorePipeBlendDiagnostic(aromaticPipe, englishBlend, profileWithExperience);
    expect(withExp.experienceOverride).toBe(true);
    expect(withExp.tier.name).toBe('EXPERIENCE_OVERRIDE');
    expect(withExp.score).toBeGreaterThan(3.5);
  });

  test('weak experience (1 session) does NOT override', () => {
    const profile = {
      experienceEvidence: {
        [`${aromaticPipe.pipe_id}__${englishBlend.id}`]: {
          avgRating: 5,
          sessionCount: 1,
        },
      },
    };
    const result = scorePipeBlendDiagnostic(aromaticPipe, englishBlend, profile);
    expect(result.experienceOverride).toBe(false);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(result.score).toBeLessThanOrEqual(3.5);
  });

  test('low-rated experience does NOT override', () => {
    const profile = {
      experienceEvidence: {
        [`${aromaticPipe.pipe_id}__${englishBlend.id}`]: {
          avgRating: 2.0,
          sessionCount: 10,
        },
      },
    };
    const result = scorePipeBlendDiagnostic(aromaticPipe, englishBlend, profile);
    expect(result.experienceOverride).toBe(false);
  });
});

// ── 7. Existing non-aromatic specialization continues working ──

describe('7. Non-aromatic pipe specialization continues working', () => {
  test('English-dedicated pipe scores English blends above Aromatic', () => {
    const engScore = scorePipeBlend(englishPipe, englishBlend, null);
    const aroScore = scorePipeBlend(englishPipe, aromaticBlend, null);
    expect(engScore.score).toBeGreaterThan(aroScore.score);
  });

  test('Virginia-dedicated pipe scores Virginia blends above English', () => {
    const virScore = scorePipeBlend(virginiaPipe, virginiaBlend, null);
    const engScore = scorePipeBlend(virginiaPipe, englishBlend, null);
    expect(virScore.score).toBeGreaterThan(engScore.score);
  });

  test('VaPer-dedicated pipe scores VaPer blends above English', () => {
    const vprScore = scorePipeBlend(vaperPipe, vaperBlend, null);
    const engScore = scorePipeBlend(vaperPipe, englishBlend, null);
    expect(vprScore.score).toBeGreaterThan(engScore.score);
  });

  test('utility pipe has no specialization advantage', () => {
    const np = normalizePipeForPairing(utilityPipe);
    expect(np.dedicationType).toBe('generalPurpose');
  });

  test('English-dedicated pipe caps Aromatic at STRONGLY_CONFLICTING', () => {
    const result = scorePipeBlendDiagnostic(englishPipe, aromaticBlend, null);
    expect(result.tier.name).toBe('STRONGLY_CONFLICTING');
    expect(result.score).toBeLessThanOrEqual(3.5);
  });
});

// ── Dedication strength: single-family focus is explicit ──

describe('Dedication strength: single-family focus is explicit', () => {
  test("focus=['Aromatic'] → dedicationStrength='explicit'", () => {
    const np = normalizePipeForPairing(aromaticPipe);
    expect(np.dedicationStrength).toBe('explicit');
  });

  test("focus=['English'] → dedicationStrength='explicit'", () => {
    const np = normalizePipeForPairing(englishPipe);
    expect(np.dedicationStrength).toBe('explicit');
  });

  test("focus=['Virginia'] → dedicationStrength='explicit'", () => {
    const np = normalizePipeForPairing(virginiaPipe);
    expect(np.dedicationStrength).toBe('explicit');
  });

  test("focus=['Heavy Aromatics', 'Cult Blood Red Moon', 'Aromatic'] → dedicationStrength='explicit'", () => {
    const np = normalizePipeForPairing(heavyAromaticPipe);
    expect(np.dedicationStrength).toBe('explicit');
  });
});