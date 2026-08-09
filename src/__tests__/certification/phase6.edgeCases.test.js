/**
 * Phase 6 — Edge Case Validation
 *
 * Tests: empty user profile, missing chamber dimensions, missing tobacco components,
 * unknown family, interchangeable bowls, and ghosting behavior.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  normalizeTobaccoForPairing,
  normalizePipeForPairing,
} from '@/components/utils/pairingScoreCanonical';
import { resolveBowlVariant } from '@/components/utils/pipeVariants';
import { CERTIFICATION_BLENDS, CERTIFICATION_BLENDS_BY_ARCHETYPE } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES, CERTIFICATION_PIPES_BY_ARCHETYPE } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

const blends = CERTIFICATION_BLENDS;
const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);

describe('Phase 6 — Edge Cases', () => {
  describe('Empty user profile: technicalScore === finalScore', () => {
    for (const blend of blends.slice(0, 4)) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}`, () => {
          const result = scorePipeBlendDiagnostic(pipe, blend, USER_PROFILES.empty);
          expect(result.hasPersonalizationEvidence).toBe(false);
          expect(result.finalScore).toBe(result.technicalScore);
        });
      }
    }
  });

  describe('Missing chamber dimensions: confidence decreases, recommendation stable', () => {
    const noDims = CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions'];
    const withDims = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];

    test('pipe without dimensions has lower confidence', () => {
      const withConf = scorePipeBlendDiagnostic(withDims, blend, USER_PROFILES.empty).confidence;
      const noConf = scorePipeBlendDiagnostic(noDims, blend, USER_PROFILES.empty).confidence;
      expect(noConf).toBeLessThan(withConf);
    });

    test('recommendation does not throw with missing dims', () => {
      expect(() => scorePipeBlend(noDims, blend, USER_PROFILES.empty)).not.toThrow();
    });

    test('pipe without dims still produces a valid score in [0,10]', () => {
      const result = scorePipeBlendDiagnostic(noDims, blend, USER_PROFILES.empty);
      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(10);
    });

    test('geometry source is not "measured" when dims are missing', () => {
      const n = normalizePipeForPairing(noDims);
      expect(n.geometrySource).not.toBe('measured');
    });
  });

  describe('Missing tobacco components: confidence decreases, family stable', () => {
    const unknownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Components'];
    const knownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];
    const pipe = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];

    test('blend with no components has lower confidence', () => {
      const knownConf = scorePipeBlendDiagnostic(pipe, knownBlend, USER_PROFILES.empty).confidence;
      const unknownConf = scorePipeBlendDiagnostic(pipe, unknownBlend, USER_PROFILES.empty).confidence;
      expect(unknownConf).toBeLessThan(knownConf);
    });

    test('blend with missing components still produces a valid score', () => {
      const result = scorePipeBlendDiagnostic(pipe, unknownBlend, USER_PROFILES.empty);
      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(10);
    });

    test('normalization handles empty components gracefully', () => {
      const n = normalizeTobaccoForPairing(unknownBlend);
      expect(n).toBeDefined();
      expect(n.blendFamily).toBeDefined();
    });
  });

  describe('Unknown family: never behaves as Virginia, never as Aromatic', () => {
    const unknownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Family'];
    const virginiaBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Straight Virginia'];
    const aromaticBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Heavy Aromatic'];
    const virginiaPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Virginia Dedicated'];
    const aromaticPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Aromatic Dedicated'];

    test('unknown family does not score identically to Virginia on Virginia pipe', () => {
      const unknownScore = scorePipeBlendDiagnostic(virginiaPipe, unknownBlend, USER_PROFILES.empty).finalScore;
      const virginiaScore = scorePipeBlendDiagnostic(virginiaPipe, virginiaBlend, USER_PROFILES.empty).finalScore;
      expect(unknownScore).not.toBe(virginiaScore);
    });

    test('unknown family does not score identically to Aromatic on Aromatic pipe', () => {
      const unknownScore = scorePipeBlendDiagnostic(aromaticPipe, unknownBlend, USER_PROFILES.empty).finalScore;
      const aromaticScore = scorePipeBlendDiagnostic(aromaticPipe, aromaticBlend, USER_PROFILES.empty).finalScore;
      expect(unknownScore).not.toBe(aromaticScore);
    });

    test('unknown family has reduced confidence', () => {
      const unknownConf = scorePipeBlendDiagnostic(virginiaPipe, unknownBlend, USER_PROFILES.empty).confidence;
      const virginiaConf = scorePipeBlendDiagnostic(virginiaPipe, virginiaBlend, USER_PROFILES.empty).confidence;
      expect(unknownConf).toBeLessThan(virginiaConf);
    });

    test('unknown family normalization returns family "unknown" or "other"', () => {
      const n = normalizeTobaccoForPairing(unknownBlend);
      expect(['unknown', 'other']).toContain(n.blendFamily);
    });
  });

  describe('Interchangeable bowls: geometry changes, score changes, pipe identity preserved', () => {
    const parentPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Pipe with interchangeable bowls'];
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];

    test('bowl variants resolve correctly via resolveBowlVariant', () => {
      const bowlA = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[0], 0);
      const bowlB = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[1], 1);
      expect(bowlA.bowl_variant_id).toBe('cert-bowl-a');
      expect(bowlB.bowl_variant_id).toBe('cert-bowl-b');
      expect(bowlA.pipe_id).toBe(parentPipe.pipe_id);
    });

    test('different bowls produce different scores for the same blend', () => {
      const bowlA = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[0], 0);
      const bowlB = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[1], 1);
      const scoreA = scorePipeBlend(bowlA, blend, USER_PROFILES.empty).finalScore;
      const scoreB = scorePipeBlend(bowlB, blend, USER_PROFILES.empty).finalScore;
      expect(scoreA).not.toBe(scoreB);
    });

    test('geometry changes across bowl variants', () => {
      const bowlA = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[0], 0);
      const bowlB = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[1], 1);
      expect(bowlA.bowl_diameter_mm).not.toBe(bowlB.bowl_diameter_mm);
    });

    test('pipe identity (pipe_id) is preserved across bowl variants', () => {
      const bowlA = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[0], 0);
      const bowlB = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[1], 1);
      expect(bowlA.pipe_id).toBe(parentPipe.pipe_id);
      expect(bowlB.pipe_id).toBe(parentPipe.pipe_id);
    });

    test('bowl focus overrides parent focus in scoring', () => {
      const bowlA = resolveBowlVariant(parentPipe, parentPipe.bowl_variants[0], 0);
      expect(bowlA.focus).toEqual(['English']);
    });
  });

  describe('Ghosting: heavy aromatics penalize English pipes; English penalizes aromatic pipes', () => {
    const heavyAromatic = CERTIFICATION_BLENDS_BY_ARCHETYPE['Heavy Aromatic'];
    const englishBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];
    const ghostedAromaticPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Ghosted Pipe'];
    const englishPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['English Dedicated'];
    const aromaticPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Aromatic Dedicated'];
    const generalPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];

    test('heavy aromatic scores lower on english-dedicated than general-purpose', () => {
      const englishScore = scorePipeBlend(englishPipe, heavyAromatic, USER_PROFILES.empty).finalScore;
      const generalScore = scorePipeBlend(generalPipe, heavyAromatic, USER_PROFILES.empty).finalScore;
      expect(generalScore).toBeGreaterThanOrEqual(englishScore);
    });

    test('english blend scores lower on aromatic-dedicated than english-dedicated', () => {
      const aromaticScore = scorePipeBlend(aromaticPipe, englishBlend, USER_PROFILES.empty).finalScore;
      const englishScore = scorePipeBlend(englishPipe, englishBlend, USER_PROFILES.empty).finalScore;
      expect(englishScore).toBeGreaterThan(aromaticScore);
    });

    test('general purpose pipe remains viable for both aromatic and english blends', () => {
      const aroScore = scorePipeBlend(generalPipe, heavyAromatic, USER_PROFILES.empty).finalScore;
      const engScore = scorePipeBlend(generalPipe, englishBlend, USER_PROFILES.empty).finalScore;
      expect(aroScore).toBeGreaterThan(4.5);
      expect(engScore).toBeGreaterThan(4.5);
    });

    test('ghosted aromatic pipe does not top english blend ranking', () => {
      const ghostedScore = scorePipeBlend(ghostedAromaticPipe, englishBlend, USER_PROFILES.empty).finalScore;
      const englishScore = scorePipeBlend(englishPipe, englishBlend, USER_PROFILES.empty).finalScore;
      expect(englishScore).toBeGreaterThanOrEqual(ghostedScore);
    });
  });
});
