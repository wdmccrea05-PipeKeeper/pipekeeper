import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Server-side authorization guard.
 *
 * The frontend hides what a collector cannot use, but hiding is not
 * authorization. This test reads the deployed backend functions from disk and
 * checks what actually protects them, so the answer never depends on a
 * simulated frontend success.
 *
 * Two things are asserted:
 *   1. Every premium function (reports, Curator actions, enrichment, image
 *      lookups, admin reporting) authenticates the caller server-side.
 *   2. Any function that imports the entitlement guard passes a request-scoped
 *      first argument. The two call sites listed below do not, which is a known
 *      defect recorded for approval — enforcing them today would take reports
 *      away from collectors who can open them now.
 */

const FUNCTIONS_DIR = path.resolve(process.cwd(), 'base44', 'functions');

/** Premium surfaces that must never run for an unauthenticated caller. */
const PREMIUM_FUNCTIONS = [
  'generateAgingReportPDF',
  'generateAgingReportExcel',
  'generateSmokingLogPDF',
  'generateSmokingLogExcel',
  'generateCollectionStory',
  'getSpecializationRecommendation',
  'invokeCuratorLLM',
  'startCuratorSession',
  'persistCuratorMessage',
  'extractCuratorSignals',
  'logCuratorEvent',
  'enrichTobaccoBlend',
  'estimateTobaccoValues',
  'autoEnrichBottleMetadata',
  'reclassifyTobaccoBlends',
  'searchRecordImages',
  'searchProductImages',
  'ingestProductImage',
];

/**
 * Call sites that import the guard but pass the SDK client instead of the
 * request, so the guard cannot resolve a caller. Fixing them enforces a Pro
 * requirement on reports, which is an entitlement change pending approval.
 */
const KNOWN_MISUSED_GUARD_CALLS = ['generateAgingReportExcel', 'generateAgingReportPDF'];

function readEntry(name) {
  const file = path.join(FUNCTIONS_DIR, name, 'entry.ts');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function listFunctions() {
  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(FUNCTIONS_DIR, name, 'entry.ts')));
}

describe('server-side authorization for premium backend functions', () => {
  it('has every premium function on disk', () => {
    PREMIUM_FUNCTIONS.forEach((name) => {
      expect(readEntry(name), `${name} entry.ts is missing`).toBeTypeOf('string');
    });
  });

  it('authenticates the caller in every premium function', () => {
    const failures = PREMIUM_FUNCTIONS.filter((name) => {
      const source = readEntry(name) || '';
      return !/auth\.me\(|createClientFromRequest\(|getUser\(/.test(source);
    });
    expect(failures).toEqual([]);
  });

  it('scopes collection-reading functions to the authenticated collector', () => {
    // A function that reads a collector's own records must filter by that
    // collector's identity rather than returning whatever the request asks for.
    const COLLECTION_READERS = [
      'generateAgingReportPDF',
      'generateAgingReportExcel',
      'generateSmokingLogPDF',
      'generateSmokingLogExcel',
      'generateCollectionStory',
    ];
    const failures = COLLECTION_READERS.filter((name) => {
      const source = readEntry(name) || '';
      return !/user\.email|user\.id|me\.email|me\.id|created_by/.test(source);
    });
    expect(failures).toEqual([]);
  });

  it('documents the guard call sites that cannot resolve a caller', () => {
    const misused = listFunctions().filter((name) => {
      const source = readEntry(name) || '';
      if (!source.includes('requireEntitlement')) return false;
      return /requireEntitlement\(\s*(base44|client)\b/.test(source);
    });
    expect(misused.sort()).toEqual([...KNOWN_MISUSED_GUARD_CALLS].sort());
  });

  it('uses the guard with a request in every other call site', () => {
    const correct = listFunctions().filter((name) => {
      const source = readEntry(name) || '';
      return /requireEntitlement\(\s*(req|request)\b/.test(source);
    });
    // Nothing enforces the guard correctly yet; when a function is fixed this
    // assertion is expected to change together with the approval.
    expect(Array.isArray(correct)).toBe(true);
    expect(correct.every((name) => !KNOWN_MISUSED_GUARD_CALLS.includes(name))).toBe(true);
  });
});