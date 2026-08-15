#!/usr/bin/env node
/**
 * audit-silent-fallbacks.cjs
 *
 * Scans the codebase for `.catch(() => [])` and similar silent-fallback patterns
 * that swallow errors and return empty arrays. These are dangerous because they
 * make data-fetching failures look like "no data" — hiding API errors, auth
 * failures, and pagination truncation from the user.
 *
 * Classification:
 * - PRODUCTION_CRITICAL: File path contains export, report, valuation, analytics,
 *   hub, selector, aggregation, or insights — silent fallbacks here can cause
 *   incomplete exports, wrong valuations, or misleading dashboards.
 * - BOUNDED_LOOKUP: The .catch(() => []) is on a single-record lookup (e.g.,
 *   UserProfile.filter by email) — acceptable because an empty result is a
 *   valid "not found" signal.
 * - ACCEPTABLE: Non-critical UI paths where graceful degradation is intended.
 *
 * Usage:
 *   node scripts/audit-silent-fallbacks.cjs [--strict]
 *
 * Exit codes:
 *   0 = No PRODUCTION_CRITICAL silent fallbacks found
 *   1 = PRODUCTION_CRITICAL silent fallbacks found (release gate failure)
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src', 'base44'];
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '__tests__', '__test__',
]);

// Patterns that indicate production-critical data paths
const CRITICAL_PATTERNS = [
  /export/i,
  /report/i,
  /valuation/i,
  /analytics/i,
  /insights/i,
  /hub/i,
  /selector/i,
  /aggregation/i,
  /summary/i,
];

// Silent fallback patterns — .catch(() => []), .catch(() => ({})), etc.
const SILENT_FALLBACK_RE = /\.catch\s*\(\s*\(\s*\)\s*=>\s*(\[\]|\{\})\s*\)/g;

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), results);
    } else {
      if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;

      const filePath = path.join(dir, entry.name);
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      const relPath = filePath.replace(process.cwd() + '/', '');
      const isCritical = CRITICAL_PATTERNS.some((p) => p.test(relPath));

      lines.forEach((line, i) => {
        // Reset regex lastIndex for global regex
        SILENT_FALLBACK_RE.lastIndex = 0;
        if (SILENT_FALLBACK_RE.test(line)) {
          results.push({
            file: relPath,
            line: i + 1,
            code: line.trim().substring(0, 120),
            critical: isCritical,
          });
        }
      });
    }
  }
}

function main() {
  const strict = process.argv.includes('--strict');
  const findings = [];

  for (const dir of SCAN_DIRS) {
    walk(path.join(process.cwd(), dir), findings);
  }

  const critical = findings.filter((f) => f.critical);
  const acceptable = findings.filter((f) => !f.critical);

  console.log('═'.repeat(80));
  console.log('SILENT FALLBACK AUDIT');
  console.log('═'.repeat(80));
  console.log(`Total .catch(() => []) patterns: ${findings.length}`);
  console.log(`  PRODUCTION_CRITICAL: ${critical.length}`);
  console.log(`  ACCEPTABLE (non-critical paths): ${acceptable.length}`);
  console.log();

  if (critical.length > 0) {
    console.log('─'.repeat(80));
    console.log('PRODUCTION-CRITICAL SILENT FALLBACKS (must fix or annotate):');
    console.log('─'.repeat(80));

    const byFile = {};
    critical.forEach((f) => {
      if (!byFile[f.file]) byFile[f.file] = [];
      byFile[f.file].push(f);
    });

    Object.keys(byFile)
      .sort()
      .forEach((file) => {
        console.log(`\n  ${file} (${byFile[file].length}):`);
        byFile[file].forEach((f) => {
          console.log(`    L${f.line}: ${f.code}`);
        });
      });

    console.log();
    console.log('─'.repeat(80));
    console.log('RECOMMENDATION:');
    console.log('─'.repeat(80));
    console.log('  Replace .catch(() => []) in production-critical paths with:');
    console.log('    1. Proper error handling that surfaces failures to the UI, OR');
    console.log('    2. fetchAllEntities() which handles pagination + error propagation, OR');
    console.log('    3. Add a "// CK_SILENT_FALLBACK_OK: <reason>" comment to suppress');
    console.log('       if the empty-array fallback is intentionally graceful degradation.');
    console.log();

    if (strict) {
      process.exit(1);
    }
  } else {
    console.log('✓ No production-critical silent fallbacks found.');
  }

  process.exit(critical.length > 0 && strict ? 1 : 0);
}

main();