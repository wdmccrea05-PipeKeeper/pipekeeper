/**
 * Regression tests for duplicate/divergent aromatic classifiers.
 *
 * Screens used to re-implement aromatic detection locally. The worst offender
 * was PipeSpecialization's `blend.blend_type?.toLowerCase() === 'aromatic'`,
 * which missed "English Aromatic", "Aromatic/Burley", and every record that
 * only sets the explicit `is_aromatic` field.
 *
 * These tests pin the canonical classifier's behaviour on exactly the inputs
 * the old local checks got wrong.
 */

import { describe, test, expect } from 'vitest';
import {
  inferBlendCategory,
  isAromaticBlend,
  normalizeFocus,
  normalizeTobaccoForPairing,
} from '../pairingScoreCanonical';

/** The exact check PipeSpecialization used before this rebuild. */
const legacyExactMatch = (blend) => blend.blend_type?.toLowerCase() === 'aromatic';

describe('canonical classifier replaces the exact-string aromatic check', () => {
  const compoundAromatics = [
    { name: 'English Aromatic tin', blend_type: 'English Aromatic' },
    { name: 'Aromatic slash type', blend_type: 'Aromatic/Burley' },
    { name: 'Lower case', blend_type: 'aromatic' },
    { name: 'Padded', blend_type: '  Aromatic  ' },
  ];

  for (const blend of compoundAromatics) {
    test(`"${blend.blend_type}" is aromatic to the canonical classifier`, () => {
      expect(inferBlendCategory(blend)).toBe('aromatic');
      expect(isAromaticBlend(blend)).toBe(true);
    });
  }

  test('the old exact-match check missed compound aromatic types', () => {
    // Documents the bug: three of four above were false negatives.
    const missed = compoundAromatics.filter((b) => !legacyExactMatch(b));
    expect(missed.length).toBeGreaterThan(0);
    for (const b of missed) expect(isAromaticBlend(b)).toBe(true);
  });

  test('is_aromatic is honoured even when blend_type says nothing', () => {
    const blend = { name: 'Autumn Evening', blend_type: 'Virginia/Burley', is_aromatic: true };
    expect(legacyExactMatch(blend)).toBe(false);
    expect(inferBlendCategory(blend)).toBe('aromatic');
  });

  test('is_aromatic:false overrides a misleading blend_type', () => {
    const blend = { name: 'Not really', blend_type: 'Aromatic', is_aromatic: false };
    expect(inferBlendCategory(blend)).toBe('non_aromatic');
  });

  test('unknown records stay unknown and are excluded from both filters', () => {
    const blend = { name: 'Mystery Cavendish', blend_type: 'Cavendish' };
    expect(inferBlendCategory(blend)).toBe('unknown');
    expect(isAromaticBlend(blend)).toBe(false);
    expect(normalizeTobaccoForPairing(blend).isAromatic).toBe(null);
  });
});

describe('focus classification is centralised', () => {
  test('"Non-Aromatic" focus is never also treated as aromatic', () => {
    const n = normalizeFocus(['Non-Aromatic']);
    expect(n.nonAromaticOnly).toBe(true);
    expect(n.aromaticOnly).toBe(false);
  });

  test('"Heavy Aromatics" is aromatic-only with heavy intent', () => {
    const n = normalizeFocus(['Heavy Aromatics']);
    expect(n.aromaticOnly).toBe(true);
    expect(n.wantsHeavyAromatics).toBe(true);
  });

  test('mixed focus is neither aromatic-only nor non-aromatic-only', () => {
    const n = normalizeFocus(['Aromatic', 'English']);
    expect(n.aromaticOnly).toBe(false);
    expect(n.nonAromaticOnly).toBe(false);
  });

  test('unrecognised focus entries are treated as named blends', () => {
    expect(normalizeFocus(['Nightcap']).exactBlendFocus).toContain('Nightcap');
  });
});
