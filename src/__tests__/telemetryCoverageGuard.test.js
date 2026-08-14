/* eslint-disable */
/**
 * telemetryCoverageGuard.test.js
 *
 * Static regression guard: fails if a new direct production InvokeLLM,
 * UploadFile, SendEmail, or other Base44 integration call is introduced
 * outside the approved canonical telemetry layer.
 *
 * This prevents telemetry coverage from degrading as CollectionKeeper evolves.
 *
 * Allowed direct-call files (the canonical telemetry layer itself + already
 * instrumented backend functions with inline telemetry):
 *   - src/lib/integrationTelemetry.js          (frontend wrapper — calls Core.InvokeLLM by design)
 *   - base44/shared/integrationTelemetry.ts     (backend wrapper — calls Core.InvokeLLM by design)
 *   - base44/functions/enrichTobaccoBlend/entry.ts       (inline telemetry via trackIntegrationEvent)
 *   - base44/functions/invokeCuratorLLM/entry.ts          (inline telemetry via trackUsage)
 *   - base44/functions/reclassifyTobaccoBlends/entry.ts   (inline telemetry via trackIntegrationEvent)
 *   - base44/functions/extractCuratorSignals/entry.ts     (inline telemetry via trackIntegrationEvent)
 *   - base44/functions/_hub/MODULE_EXPERIENCE_EXPANSION_SUMMARY/entry.ts (documentation file, not a real function)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const INTEGRATION_CALL_PATTERNS = [
  { regex: /\.InvokeLLM\(/, name: 'InvokeLLM' },
  { regex: /\.UploadFile\(/, name: 'UploadFile' },
  { regex: /\.SendEmail\(/, name: 'SendEmail' },
  { regex: /\.GenerateImage\(/, name: 'GenerateImage' },
  { regex: /\.GenerateSpeech\(/, name: 'GenerateSpeech' },
  { regex: /\.GenerateVideo\(/, name: 'GenerateVideo' },
  { regex: /\.TranscribeAudio\(/, name: 'TranscribeAudio' },
  { regex: /\.ExtractDataFromUploadedFile\(/, name: 'ExtractDataFromUploadedFile' },
  { regex: /\.UploadPrivateFile\(/, name: 'UploadPrivateFile' },
  { regex: /\.CreateFileSignedUrl\(/, name: 'CreateFileSignedUrl' },
  { regex: /\.SendPushNotification\(/, name: 'SendPushNotification' },
];

const ALLOWED_DIRECT_CALL_FILES = new Set([
  'src/lib/integrationTelemetry.js',
  'base44/shared/integrationTelemetry.ts',
  'base44/functions/enrichTobaccoBlend/entry.ts',
  'base44/functions/invokeCuratorLLM/entry.ts',
  'base44/functions/reclassifyTobaccoBlends/entry.ts',
  'base44/functions/extractCuratorSignals/entry.ts',
  'base44/functions/_hub/MODULE_EXPERIENCE_EXPANSION_SUMMARY/entry.ts',
]);

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build'];
const EXCLUDE_FILE_PATTERNS = ['__tests__', '.test.', '/test-setup', '/vitest.config'];

function walkDir(dir, relDir = '') {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, relPath));
    } else if (/\.(jsx|js|ts|tsx)$/.test(entry.name)) {
      results.push(relPath);
    }
  }
  return results;
}

function findViolations(projectRoot) {
  const allFiles = walkDir(projectRoot);
  const violations = [];

  for (const relPath of allFiles) {
    if (EXCLUDE_FILE_PATTERNS.some((p) => relPath.includes(p))) continue;
    if (ALLOWED_DIRECT_CALL_FILES.has(relPath)) continue;

    const fullPath = path.join(projectRoot, relPath);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    for (const { regex, name } of INTEGRATION_CALL_PATTERNS) {
      if (regex.test(content)) {
        violations.push({ file: relPath, integration: name });
      }
    }
  }

  return violations;
}

describe('Telemetry Coverage Guard', () => {
  it('no direct integration calls outside the canonical telemetry layer', () => {
    const projectRoot = process.cwd();
    const violations = findViolations(projectRoot);

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  ${v.file} — direct ${v.integration}() call`)
        .join('\n');
      const message = `\n\nDirect integration calls found outside the canonical telemetry layer.\n` +
        `These calls bypass trackedInvokeLLM / trackedUploadFile / trackedSendEmail wrappers.\n` +
        `Wrap them with the canonical telemetry wrappers from src/lib/integrationTelemetry.js\n` +
        `or base44/shared/integrationTelemetry.ts.\n\nViolations:\n${details}\n`;
      expect.fail(message);
    }

    expect(violations).toEqual([]);
  });

  it('allowlisted backend functions have inline telemetry', () => {
    const allowlistBackendFiles = [
      'base44/functions/enrichTobaccoBlend/entry.ts',
      'base44/functions/invokeCuratorLLM/entry.ts',
      'base44/functions/reclassifyTobaccoBlends/entry.ts',
      'base44/functions/extractCuratorSignals/entry.ts',
    ];

    for (const relPath of allowlistBackendFiles) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasTelemetry =
        content.includes('trackIntegrationEvent') ||
        content.includes('trackUsage') ||
        content.includes('trackedInvokeLLM');
      expect(hasTelemetry, `${relPath} is in the allowlist but has no telemetry`).toBe(true);
    }
  });

  it('frontend telemetry module exports all required wrappers', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/integrationTelemetry.js'),
      'utf8'
    );
    expect(content).toMatch(/export.*function.*trackedInvokeLLM/);
    expect(content).toMatch(/export.*function.*trackedUploadFile/);
    expect(content).toMatch(/export.*function.*trackedSendEmail/);
    expect(content).toMatch(/export.*function.*logIntegrationEvent/);
  });

  it('backend telemetry module exports all required wrappers', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'base44/shared/integrationTelemetry.ts'),
      'utf8'
    );
    expect(content).toMatch(/export.*function.*trackIntegrationEvent/);
    expect(content).toMatch(/export.*function.*classifyIntegrationError/);
    expect(content).toMatch(/export.*function.*trackedInvokeLLM/);
    expect(content).toMatch(/export.*function.*trackedUploadFile/);
  });
});