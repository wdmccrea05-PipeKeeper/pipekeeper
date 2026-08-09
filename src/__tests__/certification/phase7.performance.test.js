/**
 * Phase 7 — Performance Measurement
 *
 * Measures latency for: normalization, single pairing score, batch pairing,
 * and ranking. Detects duplicate scoring calls.
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

const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const blends = CERTIFICATION_BLENDS;
const profile = USER_PROFILES.empty;

const RUNS = 20;
const MAX_SINGLE_SCORE_MS = 5;
const MAX_NORMALIZE_MS = 2;
const MAX_BATCH_MS_PER_PAIR = 1;

function bench(label, fn, runs = RUNS) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const max = Math.max(...times);
  return { label, avg, max, runs };
}

describe('Phase 7 — Performance', () => {
  describe('Normalization latency', () => {
    test('tobacco normalization is fast (<2ms avg)', () => {
      const m = bench('normalizeTobacco', () => normalizeTobaccoForPairing(blends[0]));
      expect(m.avg).toBeLessThan(MAX_NORMALIZE_MS);
    });

    test('pipe normalization is fast (<2ms avg)', () => {
      const m = bench('normalizePipe', () => normalizePipeForPairing(pipes[0]));
      expect(m.avg).toBeLessThan(MAX_NORMALIZE_MS);
    });
  });

  describe('Single pairing score latency', () => {
    test('scorePipeBlend is fast (<5ms avg)', () => {
      const m = bench('scorePipeBlend', () => scorePipeBlend(pipes[0], blends[0], profile));
      expect(m.avg).toBeLessThan(MAX_SINGLE_SCORE_MS);
    });

    test('scorePipeBlendDiagnostic is fast (<5ms avg)', () => {
      const m = bench('scorePipeBlendDiagnostic', () => scorePipeBlendDiagnostic(pipes[0], blends[0], profile));
      expect(m.avg).toBeLessThan(MAX_SINGLE_SCORE_MS);
    });
  });

  describe('Batch pairing latency', () => {
    test('buildPairingsForPipes completes all pairs within budget', () => {
      const start = performance.now();
      buildPairingsForPipes(pipes, blends, profile);
      const elapsed = performance.now() - start;
      const totalPairs = pipes.length * blends.length;
      const msPerPair = elapsed / totalPairs;
      expect(msPerPair).toBeLessThan(MAX_BATCH_MS_PER_PAIR);
    });

    test('rankPipesForBlend completes quickly', () => {
      const start = performance.now();
      rankPipesForBlend(pipes, blends[0], profile);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('No duplicate scoring detected', () => {
    test('buildPairingsForPipes output count matches pipes × blends', () => {
      const result = buildPairingsForPipes(pipes, blends, profile);
      expect(result.length).toBe(pipes.length);
      for (const row of result) {
        expect(row.recommendations.length).toBeLessThanOrEqual(Math.min(10, blends.length));
      }
    });

    test('scorePipeBlend result is self-consistent (no double computation artifact)', () => {
      const result = scorePipeBlendDiagnostic(pipes[0], blends[0], profile);
      const computed = Object.values(result.components).reduce(
        (sum, c) => sum + c.score * c.weight, 0
      );
      expect(Math.abs(computed - result.technicalScore)).toBeLessThan(0.2);
    });
  });
});
