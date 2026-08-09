/**
 * Phase 8 — Stability / Determinism
 *
 * Runs every recommendation five consecutive times and verifies:
 * - ranking identical
 * - technical score identical
 * - confidence identical
 * - component breakdown identical
 * - PairingMatrix identical
 */

import { describe, test, expect } from 'vitest';
import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  buildPairingsForPipes,
  rankPipesForBlend,
} from '@/components/utils/pairingScoreCanonical';
import { CERTIFICATION_BLENDS } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';

const STABILITY_RUNS = 5;
const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const blends = CERTIFICATION_BLENDS;
const profile = USER_PROFILES.empty;

function runN(fn, n = STABILITY_RUNS) {
  return Array.from({ length: n }, () => fn());
}

describe('Phase 8 — Stability (5-Run Determinism)', () => {
  describe('Single scoring is deterministic', () => {
    for (const blend of blends.slice(0, 5)) {
      for (const pipe of pipes.slice(0, 4)) {
        test(`${blend._archetype} × ${pipe._archetype}: identical across 5 runs`, () => {
          const results = runN(() => scorePipeBlendDiagnostic(pipe, blend, profile));
          const firstScore = results[0].finalScore;
          const firstTechnical = results[0].technicalScore;
          const firstConfidence = results[0].confidence;
          for (const r of results) {
            expect(r.finalScore).toBe(firstScore);
            expect(r.technicalScore).toBe(firstTechnical);
            expect(r.confidence).toBe(firstConfidence);
          }
        });
      }
    }
  });

  describe('Component breakdown is deterministic', () => {
    for (const blend of blends.slice(0, 3)) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}: components identical across 5 runs`, () => {
          const results = runN(() => scorePipeBlendDiagnostic(pipe, blend, profile));
          const first = results[0].components;
          for (const r of results) {
            for (const key of Object.keys(first)) {
              expect(r.components[key].score).toBe(first[key].score);
              expect(r.components[key].contribution).toBe(first[key].contribution);
            }
          }
        });
      }
    }
  });

  describe('Ranking is deterministic', () => {
    for (const blend of blends.slice(0, 4)) {
      test(`${blend._archetype}: rankPipesForBlend returns same order across 5 runs`, () => {
        const rankings = runN(() =>
          rankPipesForBlend(pipes, blend, profile, { limit: pipes.length })
        );
        const firstOrder = rankings[0].map((r) => r.pipe_id);
        for (const ranking of rankings) {
          expect(ranking.map((r) => r.pipe_id)).toEqual(firstOrder);
        }
      });
    }
  });

  describe('Pairing Matrix is deterministic', () => {
    test('buildPairingsForPipes returns identical matrix across 5 runs', () => {
      const testBlends = blends.slice(0, 3);
      const testPipes = pipes.slice(0, 3);
      const matrices = runN(() => buildPairingsForPipes(testPipes, testBlends, profile));
      const first = JSON.stringify(matrices[0]);
      for (const m of matrices) {
        expect(JSON.stringify(m)).toBe(first);
      }
    });
  });

  describe('Explanation text is deterministic', () => {
    for (const blend of blends.slice(0, 3)) {
      for (const pipe of pipes.slice(0, 3)) {
        test(`${blend._archetype} × ${pipe._archetype}: why string identical across 5 runs`, () => {
          const results = runN(() => scorePipeBlendDiagnostic(pipe, blend, profile));
          const firstWhy = results[0].why;
          for (const r of results) {
            expect(r.why).toBe(firstWhy);
          }
        });
      }
    }
  });
});
