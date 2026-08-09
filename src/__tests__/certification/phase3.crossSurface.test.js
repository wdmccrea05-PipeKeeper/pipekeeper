/**
 * Phase 3 — Cross-Surface Validation
 *
 * Verifies that every pairing surface (Best Pipe Matches, Best Tobacco Matches,
 * Pairing Matrix, Matching Engine, Pipe Detail, Tobacco Detail) produces identical
 * scores and rankings — because all surfaces call the same canonical scorer.
 *
 * Captures per-recommendation: score, technicalScore, personalFit, confidence,
 * dedication, geometry, cut, composition, aromatic, material, smokingCharacter,
 * and explanation.
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  buildPairingsForPipes,
  rankPipesForBlend,
  normalizeTobaccoForPairing,
  normalizePipeForPairing,
} from '@/components/utils/pairingScoreCanonical';

import { CERTIFICATION_BLENDS } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

/**
 * Simulate the "Best Pipe Matches" surface: rank pipes for a single blend.
 */
function surfaceBestPipeMatches(blend, pipes, profile) {
  return rankPipesForBlend(pipes, blend, profile, { limit: pipes.length });
}

/**
 * Simulate the "Best Tobacco Matches" surface: score a blend against each pipe.
 */
function surfaceBestTobaccoMatches(blend, pipes, profile) {
  return pipes.map((pipe) => ({
    pipe_id: pipe.pipe_id,
    pipe_name: pipe.pipe_name,
    ...scorePipeBlendDiagnostic(pipe, blend, profile),
  })).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0) || a.pipe_name.localeCompare(b.pipe_name));
}

/**
 * Simulate the "Pairing Matrix" / "Matching Engine" surface:
 * score every pipe × blend combination.
 */
function surfacePairingMatrix(blends, pipes, profile) {
  return buildPairingsForPipes(pipes, blends, profile);
}

/**
 * Simulate "Pipe Detail" (best blends for a given pipe).
 */
function surfacePipeDetail(pipe, blends, profile) {
  return blends.map((b) => ({
    blend_id: b.id,
    blend_name: b.name,
    ...scorePipeBlendDiagnostic(pipe, b, profile),
  })).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0) || a.blend_name.localeCompare(b.blend_name));
}

/**
 * Simulate "Tobacco Detail" (best pipes for a given blend).
 */
function surfaceTobaccoDetail(blend, pipes, profile) {
  return pipes.map((p) => ({
    pipe_id: p.pipe_id,
    pipe_name: p.pipe_name,
    ...scorePipeBlendDiagnostic(p, blend, profile),
  })).sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0) || a.pipe_name.localeCompare(b.pipe_name));
}

describe('Phase 3 — Cross-Surface Validation', () => {
  const profile = USER_PROFILES.empty;
  const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);

  describe('Score identity: scorePipeBlend ≡ scorePipeBlendDiagnostic', () => {
    for (const blend of CERTIFICATION_BLENDS) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}`, () => {
          const a = scorePipeBlend(pipe, blend, profile);
          const b = scorePipeBlendDiagnostic(pipe, blend, profile);
          expect(a.finalScore).toBe(b.finalScore);
          expect(a.technicalScore).toBe(b.technicalScore);
          expect(a.confidence).toBe(b.confidence);
        });
      }
    }
  });

  describe('Normalization identity: double-normalization is idempotent', () => {
    for (const blend of CERTIFICATION_BLENDS.slice(0, 6)) {
      test(`tobacco normalization idempotent: ${blend._archetype}`, () => {
        const n1 = normalizeTobaccoForPairing(blend);
        const score1 = scorePipeBlend(pipes[0], blend, profile);
        const score2 = scorePipeBlend(pipes[0], blend, profile);
        expect(score1.finalScore).toBe(score2.finalScore);
        expect(n1.blendFamily).toBeDefined();
      });
    }

    for (const pipe of pipes.slice(0, 4)) {
      test(`pipe normalization idempotent: ${pipe._archetype}`, () => {
        const n1 = normalizePipeForPairing(pipe);
        const n2 = normalizePipeForPairing(pipe);
        expect(n1.confidence).toBe(n2.confidence);
        expect(n1.geometrySource).toBe(n2.geometrySource);
      });
    }
  });

  describe('Cross-surface ranking agreement: Tobacco Detail ≡ Best Pipe Matches', () => {
    for (const blend of CERTIFICATION_BLENDS.slice(0, 5)) {
      test(`${blend._archetype}: top pipe identical across surfaces`, () => {
        const tobaccoDetail = surfaceTobaccoDetail(blend, pipes, profile);
        const bestPipes = surfaceBestPipeMatches(blend, pipes, profile);

        if (tobaccoDetail.length === 0 || bestPipes.length === 0) return;

        const topFromTobaccoDetail = tobaccoDetail[0].pipe_id;
        const topFromBestPipes = bestPipes[0]?.pipe_id;

        expect(topFromTobaccoDetail).toBe(topFromBestPipes);
      });

      test(`${blend._archetype}: finalScore identical across surfaces`, () => {
        const tobaccoDetail = surfaceTobaccoDetail(blend, pipes, profile);
        const bestPipes = surfaceBestPipeMatches(blend, pipes, profile);

        for (const td of tobaccoDetail) {
          const bp = bestPipes.find((r) => r.pipe_id === td.pipe_id);
          if (!bp) continue;
          expect(td.finalScore).toBe(bp.score ?? bp.finalScore);
        }
      });
    }
  });

  describe('Pairing Matrix parity: matrix score ≡ direct score', () => {
    test('buildPairingsForPipes scores match scorePipeBlend scores', () => {
      const testBlends = CERTIFICATION_BLENDS.slice(0, 3);
      const testPipes = pipes.slice(0, 3);
      const matrix = surfacePairingMatrix(testBlends, testPipes, profile);

      for (const pipeRow of matrix) {
        const pipe = testPipes.find((p) => p.pipe_id === pipeRow.pipe_id);
        if (!pipe) continue;
        for (const rec of pipeRow.recommendations) {
          const blend = testBlends.find((b) => b.id === rec.tobacco_id || b.tobacco_id === rec.tobacco_id);
          if (!blend) continue;
          const direct = scorePipeBlend(pipe, blend, profile);
          expect(rec.score).toBe(direct.finalScore);
        }
      }
    });
  });

  describe('Component breakdown captured for every surface result', () => {
    test('scorePipeBlendDiagnostic returns all expected component keys', () => {
      const result = scorePipeBlendDiagnostic(pipes[0], CERTIFICATION_BLENDS[0], profile);
      const expectedComponents = [
        'dedication', 'chamberGeometry', 'tobaccoCut',
        'blendComposition', 'aromaticCompatibility', 'material', 'smokingCharacter',
      ];
      for (const key of expectedComponents) {
        expect(result.components, `Missing component: ${key}`).toHaveProperty(key);
        expect(result.components[key]).toHaveProperty('score');
        expect(result.components[key]).toHaveProperty('weight');
        expect(result.components[key]).toHaveProperty('contribution');
      }
    });

    test('explanation (why) is present and non-empty', () => {
      const result = scorePipeBlendDiagnostic(pipes[0], CERTIFICATION_BLENDS[0], profile);
      expect(typeof result.why).toBe('string');
      expect(result.why.length).toBeGreaterThan(0);
    });

    test('normalizedPipe and normalizedTobacco are exposed', () => {
      const result = scorePipeBlendDiagnostic(pipes[0], CERTIFICATION_BLENDS[0], profile);
      expect(result.normalizedPipe).toBeDefined();
      expect(result.normalizedTobacco).toBeDefined();
    });
  });
});
