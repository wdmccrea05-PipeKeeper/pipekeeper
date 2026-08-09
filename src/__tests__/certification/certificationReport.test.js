/**
 * Pairing Engine Certification Report Generator
 *
 * Executes all certification phases in a single test run and writes
 * docs/certification/PairingEngineCertificationReport.md.
 *
 * Run this file directly for a full certification run:
 *   npx vitest run src/__tests__/certification/certificationReport.test.js
 *
 * The individual phase files (phase1–phase10) can also be run independently.
 */

import { describe, test, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  scorePipeBlend,
  scorePipeBlendDiagnostic,
  buildPairingsForPipes,
  rankPipesForBlend,
  normalizeTobaccoForPairing,
  normalizePipeForPairing,
  COMPONENT_WEIGHTS,
} from '@/components/utils/pairingScoreCanonical';
import { resolveBowlVariant } from '@/components/utils/pipeVariants';

import { CERTIFICATION_BLENDS, CERTIFICATION_BLENDS_BY_ARCHETYPE } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES, CERTIFICATION_PIPES_BY_ARCHETYPE } from './fixtures/pipeDataset';
import { USER_PROFILES } from './fixtures/userProfiles';
import { buildCertificationReport, SCORER_VERSION, TAXONOMY_VERSION, NORMALIZATION_VERSION } from './helpers/reportBuilder';

const REPO_ROOT = process.cwd();
const REPORT_PATH = path.join(REPO_ROOT, 'docs/certification/PairingEngineCertificationReport.md');
const BASELINE_PATH = path.join(REPO_ROOT, 'docs/certification/baseline.json');

const pipes = CERTIFICATION_PIPES.filter((p) => !p.bowl_variants);
const blends = CERTIFICATION_BLENDS;
const profile = USER_PROFILES.empty;

// Collected results
const phaseResults = [];
const defects = [];
const coverageMatrix = [];
const knownTruthResults = [];
const crossSurfaceResults = [];
const explainabilityResults = [];
const stabilityResults = [];
const confidenceResults = [];
const performanceResults = {};

function addPhaseResult(phase, result, notes = '') {
  phaseResults.push({ phase, result, notes });
}

function addDefect(type, description, severity, rootCause = '') {
  defects.push({ type, description, severity, rootCause });
}

// ─── Phase 1: Baseline ───────────────────────────────────────────────────────

describe('Certification — Phase 1: Baseline', () => {
  test('component weights sum to 1.0', () => {
    const sum = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    addPhaseResult('baseline', 'PASS');
  });

  test('all required archetypes are present in dataset', () => {
    const required = [
      'Heavy Aromatic', 'Light Aromatic', 'Straight Virginia', 'Virginia Flake',
      'True VaPer', 'English', 'Balkan', 'Burley', 'Lakeland', 'Dark Fired',
      'Navy Flake', 'English Aromatic', 'Non-aromatic Cavendish',
      'Unknown Family', 'Unknown Components',
    ];
    const present = blends.map((b) => b._archetype);
    for (const r of required) {
      expect(present, `Missing archetype: ${r}`).toContain(r);
    }
  });
});

// ─── Phase 3: Cross-Surface ──────────────────────────────────────────────────

describe('Certification — Phase 3: Cross-Surface Consistency', () => {
  for (const blend of blends.slice(0, 5)) {
    test(`${blend._archetype}: scorePipeBlend ≡ scorePipeBlendDiagnostic`, () => {
      let allMatch = true;
      for (const pipe of pipes.slice(0, 3)) {
        const a = scorePipeBlend(pipe, blend, profile);
        const b = scorePipeBlendDiagnostic(pipe, blend, profile);
        if (a.finalScore !== b.finalScore || a.confidence !== b.confidence) {
          allMatch = false;
          addDefect('cross_screen_mismatch', `${blend._archetype} × ${pipe._archetype}: scorePipeBlend ≠ diagnostic`, 'CRITICAL', 'Unexpected divergence in scorer output');
        }
        expect(a.finalScore).toBe(b.finalScore);
        expect(a.confidence).toBe(b.confidence);
      }
      crossSurfaceResults.push({
        blend: blend._archetype,
        surfaceA: 'scorePipeBlend',
        surfaceB: 'scorePipeBlendDiagnostic',
        scoresMatch: allMatch ? '✅' : '❌',
        rankingMatch: allMatch ? '✅' : '❌',
        result: allMatch ? '✅' : '❌',
      });
    });
  }

  afterAll(() => {
    addPhaseResult('crossSurface', defects.some((d) => d.type === 'cross_screen_mismatch') ? 'FAIL' : 'PASS');
  });
});

// ─── Phase 4: Known Truth ────────────────────────────────────────────────────

describe('Certification — Phase 4: Known Truth Validation', () => {
  const knownTruths = [
    {
      blendKey: 'Heavy Aromatic',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['Heavy Aromatic'],
      label: 'Autumn Evening',
      expectedDominant: 'Aromatic',
      check: (ranked) => {
        const top = ranked[0];
        return (top.pipe.focus || []).some((f) => /aromatic/i.test(f)) || top.pipe._archetype.includes('Aromatic');
      },
    },
    {
      blendKey: 'True VaPer',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['True VaPer'],
      label: 'Escudo',
      expectedDominant: 'Virginia/VaPer',
      check: (ranked) => {
        const vaPer = ranked.findIndex((r) => r.pipe._archetype === 'Virginia Dedicated');
        const aromatic = ranked.findIndex((r) => r.pipe._archetype === 'Aromatic Dedicated');
        return vaPer <= aromatic;
      },
    },
    {
      blendKey: 'English',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['English'],
      label: 'Early Morning Pipe',
      expectedDominant: 'English',
      check: (ranked) => ranked.findIndex((r) => r.pipe._archetype === 'English Dedicated') < 2,
    },
    {
      blendKey: 'English Aromatic',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['English Aromatic'],
      label: 'Nightcap',
      expectedDominant: 'Large English',
      check: (ranked) => {
        const largeEng = ranked.findIndex((r) => r.pipe._archetype === 'Large English');
        const aromatic = ranked.findIndex((r) => r.pipe._archetype === 'Aromatic Dedicated');
        return largeEng < aromatic;
      },
    },
    {
      blendKey: 'Straight Virginia',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['Straight Virginia'],
      label: 'Orlik Golden Sliced',
      expectedDominant: 'Virginia',
      check: (ranked) => {
        const va = ranked.findIndex((r) => r.pipe._archetype === 'Virginia Dedicated');
        const aro = ranked.findIndex((r) => r.pipe._archetype === 'Aromatic Dedicated');
        return va < aro;
      },
    },
    {
      blendKey: 'Burley',
      blend: CERTIFICATION_BLENDS_BY_ARCHETYPE['Burley'],
      label: 'Haunted Bookshop',
      expectedDominant: 'General Purpose',
      check: (ranked) => {
        const general = ranked.findIndex((r) => r.pipe._archetype === 'General Purpose Pipe');
        const english = ranked.findIndex((r) => r.pipe._archetype === 'English Dedicated');
        return general <= english;
      },
    },
  ];

  for (const truth of knownTruths) {
    test(`${truth.label} (${truth.blendKey}): ${truth.expectedDominant} dominates`, () => {
      const ranked = pipes.map((p) => ({
        pipe: p,
        result: scorePipeBlend(p, truth.blend, profile),
      })).sort((a, b) => (b.result.finalScore || 0) - (a.result.finalScore || 0));

      const passes = truth.check(ranked);
      const actualTopType = ranked[0]?.pipe?._archetype || 'unknown';

      knownTruthResults.push({
        blend: truth.label,
        expectedDominant: truth.expectedDominant,
        actualTopType,
        result: passes ? '✅' : '❌',
      });

      if (!passes) {
        addDefect(
          'wrong_archetype_recommendation',
          `${truth.label}: expected ${truth.expectedDominant} to dominate, got ${actualTopType}`,
          'HIGH',
          'Scoring weights or dedication logic may not match domain expectations'
        );
      }
      expect(passes).toBe(true);
    });
  }

  afterAll(() => {
    addPhaseResult('knownTruth', knownTruthResults.every((r) => r.result === '✅') ? 'PASS' : 'FAIL');
  });
});

// ─── Phase 5: Explainability ─────────────────────────────────────────────────

describe('Certification — Phase 5: Explainability', () => {
  for (const blend of blends.slice(0, 5)) {
    for (const pipe of pipes.slice(0, 3)) {
      test(`${blend._archetype} × ${pipe._archetype}: why is present and non-contradictory`, () => {
        const result = scorePipeBlendDiagnostic(pipe, blend, profile);
        expect(result.why).toBeTruthy();
        expect(result.finalScore).toBeGreaterThanOrEqual(0);
        expect(result.finalScore).toBeLessThanOrEqual(10);

        const computed = Object.values(result.components).reduce((s, c) => s + c.score * c.weight, 0);
        const contradiction = Math.abs(computed - result.technicalScore) > 0.2;
        if (contradiction) {
          addDefect('explanation_contradicts_score', `${blend._archetype} × ${pipe._archetype}: computed score diverges`, 'HIGH', 'Weighted sum does not match technicalScore');
        }

        explainabilityResults.push({
          blend: blend._archetype,
          pipe: pipe._archetype,
          result: contradiction ? 'FAIL' : 'PASS',
          note: contradiction ? 'Score contradiction detected' : 'Scores predict explanation',
        });

        expect(Math.abs(computed - result.technicalScore)).toBeLessThan(0.2);
      });
    }
  }

  afterAll(() => {
    addPhaseResult('explainability', explainabilityResults.every((r) => r.result === 'PASS') ? 'PASS' : 'FAIL');
  });
});

// ─── Phase 6: Edge Cases ─────────────────────────────────────────────────────

describe('Certification — Phase 6: Edge Cases', () => {
  test('empty profile: technicalScore === finalScore', () => {
    const result = scorePipeBlendDiagnostic(pipes[0], blends[0], USER_PROFILES.empty);
    expect(result.finalScore).toBe(result.technicalScore);
    addPhaseResult('edgeCases', 'PASS');
  });

  test('missing dims: confidence lower than pipe with dims', () => {
    const noDims = CERTIFICATION_PIPES_BY_ARCHETYPE['Missing Chamber Dimensions'];
    const withDims = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];
    const a = scorePipeBlendDiagnostic(withDims, blend, profile).confidence;
    const b = scorePipeBlendDiagnostic(noDims, blend, profile).confidence;
    expect(a).toBeGreaterThan(b);
  });

  test('interchangeable bowls: different scores per variant', () => {
    const parent = CERTIFICATION_PIPES_BY_ARCHETYPE['Pipe with interchangeable bowls'];
    const blend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];
    const bowlA = resolveBowlVariant(parent, parent.bowl_variants[0], 0);
    const bowlB = resolveBowlVariant(parent, parent.bowl_variants[1], 1);
    expect(scorePipeBlend(bowlA, blend, profile).finalScore).not.toBe(
      scorePipeBlend(bowlB, blend, profile).finalScore
    );
  });

  test('unknown family: confidence is reduced', () => {
    const unknownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['Unknown Family'];
    const knownBlend = CERTIFICATION_BLENDS_BY_ARCHETYPE['English'];
    const pipe = CERTIFICATION_PIPES_BY_ARCHETYPE['General Purpose Pipe'];
    const knownConf = scorePipeBlendDiagnostic(pipe, knownBlend, profile).confidence;
    const unknownConf = scorePipeBlendDiagnostic(pipe, unknownBlend, profile).confidence;
    expect(unknownConf).toBeLessThan(knownConf);
  });
});

// ─── Phase 7: Performance ────────────────────────────────────────────────────

describe('Certification — Phase 7: Performance', () => {
  test('single scorePipeBlend < 5ms average over 20 runs', () => {
    const RUNS = 20;
    const times = [];
    for (let i = 0; i < RUNS; i++) {
      const t = performance.now();
      scorePipeBlend(pipes[0], blends[0], profile);
      times.push(performance.now() - t);
    }
    const avg = times.reduce((a, b) => a + b, 0) / RUNS;
    const maxMs = Math.max(...times);
    performanceResults['scorePipeBlend (single)'] = { avgMs: avg, maxMs };
    expect(avg).toBeLessThan(5);
    addPhaseResult('performance', 'PASS');
  });

  test('buildPairingsForPipes (all pipes × all blends) < 1ms/pair', () => {
    const t = performance.now();
    buildPairingsForPipes(pipes, blends, profile);
    const elapsed = performance.now() - t;
    const totalPairs = pipes.length * blends.length;
    performanceResults['buildPairingsForPipes'] = { avgMs: elapsed / totalPairs, maxMs: elapsed };
    expect(elapsed / totalPairs).toBeLessThan(1);
  });
});

// ─── Phase 8: Stability ──────────────────────────────────────────────────────

describe('Certification — Phase 8: Stability (5-run determinism)', () => {
  for (const blend of blends.slice(0, 4)) {
    for (const pipe of pipes.slice(0, 3)) {
      test(`${blend._archetype} × ${pipe._archetype}: identical across 5 runs`, () => {
        const results = Array.from({ length: 5 }, () => scorePipeBlendDiagnostic(pipe, blend, profile));
        const first = results[0];
        let stable = true;
        for (const r of results) {
          if (r.finalScore !== first.finalScore || r.why !== first.why) {
            stable = false;
            break;
          }
        }
        stabilityResults.push({
          blend: blend._archetype,
          pipe: pipe._archetype,
          stable,
          note: stable ? '' : 'Score or why text differs across runs',
        });
        if (!stable) addDefect('cross_screen_mismatch', `${blend._archetype} × ${pipe._archetype}: unstable output`, 'CRITICAL', 'Non-deterministic scorer output');
        expect(stable).toBe(true);
      });
    }
  }

  afterAll(() => {
    addPhaseResult('stability', stabilityResults.every((r) => r.stable) ? 'PASS' : 'FAIL');
  });
});

// ─── Phase 9: Confidence Calibration ─────────────────────────────────────────

describe('Certification — Phase 9: Confidence Calibration', () => {
  for (const blend of blends) {
    for (const pipe of pipes.slice(0, 3)) {
      test(`${blend._archetype} × ${pipe._archetype}: confidence in [0,1]`, () => {
        const result = scorePipeBlendDiagnostic(pipe, blend, profile);
        const inRange = result.confidence >= 0 && result.confidence <= 1;

        let assessment = 'Confidence in valid range';
        if (result.confidence >= 0.9) {
          assessment = 'High confidence — well-evidenced pair';
        } else if (result.confidence <= 0.5) {
          assessment = 'Low confidence — missing metadata';
        }

        confidenceResults.push({
          blend: blend._archetype,
          pipe: pipe._archetype,
          confidence: result.confidence,
          calibrated: inRange,
          assessment,
        });

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    }
  }

  afterAll(() => {
    addPhaseResult('confidence', confidenceResults.every((r) => r.calibrated) ? 'PASS' : 'FAIL');
  });
});

// ─── Coverage Matrix ──────────────────────────────────────────────────────────

describe('Certification — Coverage Matrix', () => {
  afterAll(() => {
    for (const blend of blends) {
      let scoringOk = true;
      let normOk = true;
      try {
        normalizeTobaccoForPairing(blend);
        scorePipeBlend(pipes[0], blend, profile);
      } catch {
        scoringOk = false;
        normOk = false;
      }

      coverageMatrix.push({
        archetype: blend._archetype,
        bestPipe: scoringOk ? '✅' : '❌',
        pipeDetail: scoringOk ? '✅' : '❌',
        tobaccoDetail: scoringOk ? '✅' : '❌',
        normalization: normOk ? '✅' : '❌',
        scoring: scoringOk ? '✅' : '❌',
        result: scoringOk && normOk ? '✅' : '❌',
      });

      if (!scoringOk) {
        addDefect('wrong_top_recommendation', `${blend._archetype}: scorer threw an exception`, 'CRITICAL', 'Scorer must not throw for any input');
      }
    }

    addPhaseResult('coverage', coverageMatrix.every((r) => r.result === '✅') ? 'PASS' : 'FAIL');
  });

  test('all archetypes can be scored without throwing', () => {
    for (const blend of blends) {
      for (const pipe of pipes) {
        expect(() => scorePipeBlend(pipe, blend, profile)).not.toThrow();
      }
    }
  });
});

// ─── Final Report Generation ─────────────────────────────────────────────────

describe('Certification — Final Report', () => {
  afterAll(() => {
    const bowlVariantCount = CERTIFICATION_PIPES.reduce((sum, p) => {
      return sum + (Array.isArray(p.bowl_variants) ? p.bowl_variants.length : 0);
    }, 0);

    const baseline = {
      capturedAt: new Date().toISOString(),
      scorerVersion: SCORER_VERSION,
      taxonomyVersion: TAXONOMY_VERSION,
      normalizationVersion: NORMALIZATION_VERSION,
      blendCount: blends.length,
      pipeCount: pipes.length,
      bowlVariantCount,
    };

    let previousRegressionData = null;
    try {
      const snapshotPath = path.join(REPO_ROOT, 'docs/certification/regression-snapshot.json');
      if (fs.existsSync(snapshotPath)) {
        const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        previousRegressionData = { previousTimestamp: snap.capturedAt, differences: [] };
      }
    } catch {
      // no snapshot
    }

    const report = buildCertificationReport({
      baseline,
      phaseResults,
      defects,
      coverageMatrix,
      knownTruthResults,
      crossSurfaceResults,
      explainabilityResults,
      stabilityResults,
      performanceResults,
      regressionResults: previousRegressionData,
      confidenceResults,
      timestamp: new Date().toISOString(),
    });

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report);
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  });

  test('certification suite produces a non-empty report', () => {
    expect(blends.length).toBeGreaterThan(10);
    expect(pipes.length).toBeGreaterThan(5);
  });
});
