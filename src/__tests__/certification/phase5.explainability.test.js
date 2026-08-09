/**
 * Phase 5 — Explainability Validation
 *
 * Verifies that component scores predict the explanation and vice-versa.
 * Flags any contradiction between scores and the 'why' explanation.
 */

import { describe, test, expect } from 'vitest';
import { scorePipeBlendDiagnostic } from '@/components/utils/pairingScoreCanonical';
import { CERTIFICATION_BLENDS } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

const NEUTRAL_SCORE = 6.0;
const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const profile = USER_PROFILES.empty;

function getDominantComponent(components) {
  return Object.entries(components)
    .map(([key, c]) => ({ key, delta: (c.score - NEUTRAL_SCORE) * c.weight, score: c.score }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
}

describe('Phase 5 — Explainability Validation', () => {
  describe('Component scores predict explanation direction', () => {
    for (const blend of CERTIFICATION_BLENDS.slice(0, 6)) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}: explanation consistent with scores`, () => {
          const result = scorePipeBlendDiagnostic(pipe, blend, profile);

          // Every result must have a why
          expect(result.why).toBeTruthy();
          expect(result.whyList.length).toBeGreaterThan(0);

          // High-scoring pairs should have positive explanation
          if (result.finalScore >= 7.5) {
            const dominantDelta = getDominantComponent(result.components).delta;
            expect(dominantDelta).toBeGreaterThan(0);
          }

          // Low-scoring pairs should have negative or neutral dominant component
          if (result.finalScore <= 4.0) {
            const dominantDelta = getDominantComponent(result.components).delta;
            expect(dominantDelta).toBeLessThanOrEqual(0.5);
          }
        });
      }
    }
  });

  describe('Dedication component explains ghosting behavior', () => {
    test('aromatic-dedicated pipe × english blend: dedication penalizes', () => {
      const blend = CERTIFICATION_BLENDS.find((b) => b._archetype === 'English');
      const pipe = pipes.find((p) => p._archetype === 'Aromatic Dedicated');
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);
      expect(result.components.dedication.score).toBeLessThan(NEUTRAL_SCORE);
    });

    test('english-dedicated pipe × aromatic blend: dedication penalizes', () => {
      const blend = CERTIFICATION_BLENDS.find((b) => b._archetype === 'Heavy Aromatic');
      const pipe = pipes.find((p) => p._archetype === 'English Dedicated');
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);
      expect(result.components.dedication.score).toBeLessThan(NEUTRAL_SCORE);
    });

    test('general purpose pipe × any blend: dedication is neutral-to-positive', () => {
      const blend = CERTIFICATION_BLENDS.find((b) => b._archetype === 'Burley');
      const pipe = pipes.find((p) => p._archetype === 'General Purpose Pipe');
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);
      expect(result.components.dedication.score).toBeGreaterThanOrEqual(5.5);
    });
  });

  describe('Technical score predicts final score direction', () => {
    for (const blend of CERTIFICATION_BLENDS.slice(0, 4)) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}: finalScore in [0,10]`, () => {
          const result = scorePipeBlendDiagnostic(pipe, blend, profile);
          expect(result.finalScore).toBeGreaterThanOrEqual(0);
          expect(result.finalScore).toBeLessThanOrEqual(10);
          expect(result.technicalScore).toBeGreaterThanOrEqual(0);
          expect(result.technicalScore).toBeLessThanOrEqual(10);
        });

        test(`${blend._archetype} × ${pipe._archetype}: technicalScore ≈ weighted sum of components`, () => {
          const result = scorePipeBlendDiagnostic(pipe, blend, profile);
          const computed = Object.values(result.components).reduce(
            (sum, c) => sum + c.score * c.weight, 0
          );
          expect(Math.abs(computed - result.technicalScore)).toBeLessThan(0.2);
        });
      }
    }
  });

  describe('Explanation predicts readable component scores', () => {
    test('highest-delta component reason appears in whyList', () => {
      const blend = CERTIFICATION_BLENDS.find((b) => b._archetype === 'Heavy Aromatic');
      const pipe = pipes.find((p) => p._archetype === 'English Dedicated');
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);

      const dominant = getDominantComponent(result.components);
      if (dominant && result.components[dominant.key].reason) {
        expect(result.whyList).toContain(result.components[dominant.key].reason);
      }
    });

    test('no contradiction: high confidence does not accompany null why', () => {
      for (const blend of CERTIFICATION_BLENDS.slice(0, 3)) {
        for (const pipe of pipes.slice(0, 3)) {
          const result = scorePipeBlendDiagnostic(pipe, blend, profile);
          if (result.confidence > 0.7) {
            expect(result.why).toBeTruthy();
          }
        }
      }
    });
  });

  describe('Confidence reflects evidence quality', () => {
    test('pipe with measurements has higher confidence than pipe without', () => {
      const blend = CERTIFICATION_BLENDS[0];
      const withDims = pipes.find((p) => p.bowl_diameter_mm);
      const withoutDims = pipes.find((p) => p._archetype === 'Missing Chamber Dimensions');

      if (!withDims || !withoutDims) return;

      const scoreWith = scorePipeBlendDiagnostic(withDims, blend, profile);
      const scoreWithout = scorePipeBlendDiagnostic(withoutDims, blend, profile);
      expect(scoreWith.confidence).toBeGreaterThan(scoreWithout.confidence);
    });
  });
});
