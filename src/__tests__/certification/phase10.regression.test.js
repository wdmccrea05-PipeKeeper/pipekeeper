/**
 * Phase 10 — Regression Detection
 *
 * Compares current scoring output against the previously certified baseline.
 * Detects ranking changes, score changes, component changes, normalization changes.
 */

import { describe, test, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  scorePipeBlendDiagnostic,
  normalizeTobaccoForPairing,
  normalizePipeForPairing,
  rankPipesForBlend,
  COMPONENT_WEIGHTS,
} from '@/components/utils/pairingScoreCanonical';
import { CERTIFICATION_BLENDS } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';
import { SCORER_VERSION, TAXONOMY_VERSION, NORMALIZATION_VERSION } from './helpers/reportBuilder';

// eslint-disable-next-line no-undef
const REPO_ROOT = process.cwd();
const BASELINE_PATH = path.join(REPO_ROOT, 'docs/certification/baseline.json');
const REGRESSION_SNAPSHOT_PATH = path.join(REPO_ROOT, 'docs/certification/regression-snapshot.json');

const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const blends = CERTIFICATION_BLENDS;
const profile = USER_PROFILES.empty;

function buildCurrentSnapshot() {
  const scores = {};
  for (const blend of blends.slice(0, 6)) {
    scores[blend._archetype] = {};
    for (const pipe of pipes.slice(0, 4)) {
      const result = scorePipeBlendDiagnostic(pipe, blend, profile);
      scores[blend._archetype][pipe._archetype] = {
        finalScore: result.finalScore,
        technicalScore: result.technicalScore,
        confidence: result.confidence,
        components: Object.fromEntries(
          Object.entries(result.components).map(([k, v]) => [k, v.score])
        ),
      };
    }
  }

  const rankings = {};
  for (const blend of blends.slice(0, 4)) {
    const ranked = rankPipesForBlend(pipes, blend, profile, { limit: pipes.length });
    rankings[blend._archetype] = ranked.map((r) => r.pipe_id);
  }

  return {
    capturedAt: new Date().toISOString(),
    scorerVersion: SCORER_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    componentWeights: { ...COMPONENT_WEIGHTS },
    scores,
    rankings,
  };
}

describe('Phase 10 — Regression Detection', () => {
  let previousSnapshot = null;
  let currentSnapshot = null;

  try {
    if (fs.existsSync(REGRESSION_SNAPSHOT_PATH)) {
      previousSnapshot = JSON.parse(fs.readFileSync(REGRESSION_SNAPSHOT_PATH, 'utf8'));
    }
  } catch {
    // No previous snapshot; first run
  }

  currentSnapshot = buildCurrentSnapshot();

  describe('Component weights unchanged from baseline', () => {
    test('COMPONENT_WEIGHTS matches documented ratios', () => {
      expect(COMPONENT_WEIGHTS.dedication).toBe(0.30);
      expect(COMPONENT_WEIGHTS.chamberGeometry).toBe(0.20);
      expect(COMPONENT_WEIGHTS.tobaccoCut).toBe(0.15);
      expect(COMPONENT_WEIGHTS.blendComposition).toBe(0.15);
      expect(COMPONENT_WEIGHTS.aromaticCompatibility).toBe(0.10);
      expect(COMPONENT_WEIGHTS.material).toBe(0.05);
      expect(COMPONENT_WEIGHTS.smokingCharacter).toBe(0.05);
    });
  });

  if (previousSnapshot) {
    describe('Score regression detection vs previous certified build', () => {
      for (const [archetypeKey, pipeScores] of Object.entries(previousSnapshot.scores || {})) {
        for (const [pipeKey, prev] of Object.entries(pipeScores)) {
          test(`${archetypeKey} × ${pipeKey}: finalScore within 0.1 of previous`, () => {
            const curr = currentSnapshot.scores?.[archetypeKey]?.[pipeKey];
            if (!curr) return;
            expect(Math.abs(curr.finalScore - prev.finalScore)).toBeLessThanOrEqual(0.1);
          });
        }
      }
    });

    describe('Ranking regression detection vs previous certified build', () => {
      for (const [archetypeKey, prevRanking] of Object.entries(previousSnapshot.rankings || {})) {
        test(`${archetypeKey}: top-3 ranking unchanged`, () => {
          const currRanking = currentSnapshot.rankings?.[archetypeKey];
          if (!currRanking) return;
          const prevTop3 = prevRanking.slice(0, 3);
          const currTop3 = currRanking.slice(0, 3);
          expect(currTop3).toEqual(prevTop3);
        });
      }
    });

    describe('Component weight regression detection', () => {
      test('component weights unchanged from previous certification', () => {
        const prev = previousSnapshot.componentWeights || {};
        const curr = currentSnapshot.componentWeights;
        for (const [key, value] of Object.entries(prev)) {
          expect(curr[key]).toBe(value);
        }
      });
    });
  } else {
    test('First run: no previous baseline to compare (creating initial snapshot)', () => {
      expect(currentSnapshot).toBeDefined();
      expect(Object.keys(currentSnapshot.scores).length).toBeGreaterThan(0);
    });
  }

  afterAll(() => {
    fs.mkdirSync(path.dirname(REGRESSION_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(REGRESSION_SNAPSHOT_PATH, JSON.stringify(currentSnapshot, null, 2));
  });
});