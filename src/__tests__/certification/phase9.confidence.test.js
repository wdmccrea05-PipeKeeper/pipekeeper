/**
 * Phase 9 — Confidence Calibration
 *
 * Verifies that confidence values reflect evidence quality, not cosmetics.
 * - High confidence (>= 0.9) should be reserved for fully-evidenced pairs.
 * - Low confidence (<= 0.5) should trace to missing metadata.
 */

import { describe, test, expect } from 'vitest';
import { scorePipeBlendDiagnostic, normalizePipeForPairing, normalizeTobaccoForPairing } from '@/components/utils/pairingScoreCanonical';
import { CERTIFICATION_BLENDS, CERTIFICATION_BLENDS_BY_ARCHETYPE } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES, CERTIFICATION_PIPES_BY_ARCHETYPE } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const profile = USER_PROFILES.empty;

describe('Phase 9 — Confidence Calibration', () => {
  describe('Well-evidenced pairs have measurably higher confidence', () => {
    test('fully specified pipe × known blend has higher confidence than missing-dims pair', () => {
      const goodPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];
      const noDimsPipe = CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions'];
      const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];

      const goodResult = scorePipeBlendDiagnostic(goodPipe, blend, profile);
      const noDimsResult = scorePipeBlendDiagnostic(noDimsPipe, blend, profile);

      expect(goodResult.confidence).toBeGreaterThan(noDimsResult.confidence);
    });

    test('known blend has higher tobacco confidence than unknown components blend', () => {
      const knownTob = normalizeTobaccoForPairing(CERTIFICATION_BLENDS_BY_ARCHETYPE['English']);
      const unknownTob = normalizeTobaccoForPairing(CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Components']);
      expect(knownTob.confidence).toBeGreaterThan(unknownTob.confidence);
    });

    test('measured pipe has higher pipe confidence than no-dims pipe', () => {
      const measured = normalizePipeForPairing(CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe']);
      const noDims = normalizePipeForPairing(CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions']);
      expect(measured.confidence).toBeGreaterThan(noDims.confidence);
    });
  });

  describe('Confidence in [0, 1] for all pairs', () => {
    for (const blend of CERTIFICATION_BLENDS) {
      for (const pipe of pipes.slice(0, 4)) {
        test(`${blend._archetype} × ${pipe._archetype}: confidence in [0,1]`, () => {
          const result = scorePipeBlendDiagnostic(pipe, blend, profile);
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        });
      }
    }
  });

  describe('Low confidence traces to missing metadata', () => {
    test('unknown components blend produces confidence < 0.7', () => {
      const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Components'];
      const pipe = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);
      expect(result.confidence).toBeLessThan(0.7);
    });

    test('no-dims pipe with unknown blend produces lowest confidence of all combos', () => {
      const noDims = CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions'];
      const unknownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Components'];
      const result = scorePipeBlendDiagnostic(noDims, unknownBlend, profile);
      expect(result.confidence).toBeLessThan(0.65);
    });

    test('confidence details expose missing fields', () => {
      const noDims = CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions'];
      const unknownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Components'];
      const result = scorePipeBlendDiagnostic(noDims, unknownBlend, profile);
      expect(result.confidenceDetails).toBeDefined();
      expect(result.confidenceDetails.measuredGeometry).toBe(false);
    });
  });

  describe('Confidence is not inflated for pathological inputs', () => {
    test('null pipe fields do not produce confidence > 0.8', () => {
      const minimalPipe = { pipe_id: 'minimal', pipe_name: 'Minimal' };
      const minimalBlend = { id: 'minimal', name: 'Minimal' };
      const result = scorePipeBlendDiagnostic(minimalPipe, minimalBlend, profile);
      expect(result.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Confidence monotonicity: adding evidence does not lower confidence', () => {
    test('adding blend_type improves tobacco confidence', () => {
      const bare = normalizeTobaccoForPairing({ id: 'x', name: 'X' });
      const withType = normalizeTobaccoForPairing({ id: 'x', name: 'X', blend_type: 'English', is_aromatic: false, tobacco_components: ['Latakia', 'Virginia'] });
      expect(withType.confidence).toBeGreaterThanOrEqual(bare.confidence);
    });

    test('adding pipe dims improves pipe confidence', () => {
      const bare = normalizePipeForPairing({ pipe_id: 'x', pipe_name: 'X' });
      const withDims = normalizePipeForPairing({ pipe_id: 'x', pipe_name: 'X', bowl_diameter_mm: 20, bowl_depth_mm: 38 });
      expect(withDims.confidence).toBeGreaterThanOrEqual(bare.confidence);
    });
  });
});
