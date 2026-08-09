/**
 * Phase 1 — Baseline Capture
 *
 * Captures pairing engine version metadata and writes to docs/certification/baseline.json.
 * Runs as part of the certification suite.
 */

import { describe, test, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  COMPONENT_WEIGHTS,
  SCORER_VARIABLE_INVENTORY,
  CONFIDENCE_FACTORS,
  AROMATIC_CLASSIFICATION_PRECEDENCE,
  BLEND_FAMILY_NORMALIZATION_RULES,
  GEOMETRY_INFERENCE_HIERARCHY,
} from '@/components/utils/pairingScoreCanonical';

import { CERTIFICATION_BLENDS } from './fixtures/tobaccoDataset';
import { CERTIFICATION_PIPES } from './fixtures/pipeDataset';
import { SCORER_VERSION, TAXONOMY_VERSION, NORMALIZATION_VERSION } from './helpers/reportBuilder';

// eslint-disable-next-line no-undef
const REPO_ROOT = process.cwd();
const BASELINE_PATH = path.join(REPO_ROOT, 'docs/certification/baseline.json');

let capturedBaseline = null;

describe('Phase 1 — Baseline Capture', () => {
  test('scorer exports canonical component weights', () => {
    expect(COMPONENT_WEIGHTS).toBeDefined();
    const weightSum = Object.values(COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(weightSum - 1.0)).toBeLessThan(0.001);
  });

  test('scorer variable inventory is non-empty', () => {
    expect(Array.isArray(SCORER_VARIABLE_INVENTORY)).toBe(true);
    expect(SCORER_VARIABLE_INVENTORY.length).toBeGreaterThan(10);
  });

  test('confidence factors sum to 1.0 for each dimension', () => {
    const pipeSum = Object.values(CONFIDENCE_FACTORS.pipe).reduce((a, b) => a + b, 0);
    const tobaccoSum = Object.values(CONFIDENCE_FACTORS.tobacco).reduce((a, b) => a + b, 0);
    expect(Math.abs(pipeSum - 1.0)).toBeLessThan(0.001);
    expect(Math.abs(tobaccoSum - 1.0)).toBeLessThan(0.001);
  });

  test('aromatic classification precedence is ordered', () => {
    expect(Array.isArray(AROMATIC_CLASSIFICATION_PRECEDENCE)).toBe(true);
    expect(AROMATIC_CLASSIFICATION_PRECEDENCE[0]).toContain('explicit is_aromatic');
  });

  test('blend family normalization rules are defined', () => {
    expect(Array.isArray(BLEND_FAMILY_NORMALIZATION_RULES)).toBe(true);
    expect(BLEND_FAMILY_NORMALIZATION_RULES.length).toBeGreaterThan(5);
  });

  test('geometry inference hierarchy is defined', () => {
    expect(Array.isArray(GEOMETRY_INFERENCE_HIERARCHY)).toBe(true);
    expect(GEOMETRY_INFERENCE_HIERARCHY[0]).toContain('measured');
  });

  test('representative dataset covers all required archetypes', () => {
    const archetypes = CERTIFICATION_BLENDS.map((b) => b._archetype);
    const required = [
      'Heavy Aromatic', 'Light Aromatic', 'Straight Virginia', 'Virginia Flake',
      'True VaPer', 'English', 'Balkan', 'Burley', 'Lakeland', 'Dark Fired',
      'Navy Flake', 'English Aromatic', 'Non-aromatic Cavendish',
      'Unknown Family', 'Unknown Components',
    ];
    for (const req of required) {
      expect(archetypes, `Missing archetype: ${req}`).toContain(req);
    }
  });

  test('pipe dataset covers all required archetypes', () => {
    const archetypes = CERTIFICATION_PIPES.map((p) => p._archetype);
    expect(archetypes).toContain('Ghosted Pipe');
    expect(archetypes).toContain('General Purpose Pipe');
    expect(archetypes).toContain('Pipe with interchangeable bowls');
  });

  test('bowl variants are counted', () => {
    const bowlVariantCount = CERTIFICATION_PIPES.reduce((sum, p) => {
      return sum + (Array.isArray(p.bowl_variants) ? p.bowl_variants.length : 0);
    }, 0);
    expect(bowlVariantCount).toBeGreaterThan(0);
  });

  afterAll(() => {
    const bowlVariantCount = CERTIFICATION_PIPES.reduce((sum, p) => {
      return sum + (Array.isArray(p.bowl_variants) ? p.bowl_variants.length : 0);
    }, 0);

    capturedBaseline = {
      capturedAt: new Date().toISOString(),
      pairingEngineVersion: SCORER_VERSION,
      scorerVersion: SCORER_VERSION,
      taxonomyVersion: TAXONOMY_VERSION,
      normalizationVersion: NORMALIZATION_VERSION,
      componentWeights: { ...COMPONENT_WEIGHTS },
      blendCount: CERTIFICATION_BLENDS.length,
      pipeCount: CERTIFICATION_PIPES.length,
      bowlVariantCount,
      archetypes: CERTIFICATION_BLENDS.map((b) => b._archetype),
      pipeArchetypes: CERTIFICATION_PIPES.map((p) => p._archetype),
      scorerVariableCount: SCORER_VARIABLE_INVENTORY.length,
    };

    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(capturedBaseline, null, 2));
  });
});

export { capturedBaseline };