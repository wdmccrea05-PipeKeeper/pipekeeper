#!/usr/bin/env node
/**
 * audit-silent-fallbacks.cjs
 *
 * Scans the codebase for `.catch(() => [])`, `.catch(() => {})`, and similar
 * silent-fallback patterns that swallow errors and return empty arrays/no-ops.
 * These are dangerous because they make data-fetching failures look like
 * "no data" — hiding API errors, auth failures, and pagination truncation.
 *
 * Classification:
 * - PRODUCTION_CRITICAL: File path contains export, report, valuation,
 *   analytics, hub, selector, aggregation, or insights — silent fallbacks
 *   here can cause incomplete exports, wrong valuations, or misleading
 *   dashboards.
 * - ACCEPTABLE: Non-critical UI paths where graceful degradation is intended.
 *
 * Annotation:
 *   A critical finding is "explained" (and excluded from the unexplained
 *   count) when the same line or the line immediately above contains:
 *     // PK_SAFE_FALLBACK: <reason>
 *   The reason must be non-vague (min 10 chars after the prefix).
 *
 * Usage:
 *   node scripts/audit-silent-fallbacks.cjs [--strict]
 *
 * Exit codes:
 *   0 = No UNEXPLAINED production-critical silent fallbacks
 *   1 = Unexplained production-critical silent fallbacks found (gate failure)
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

// Silent fallback patterns — .catch(() => []), .catch(() => ({})), .catch(() => {})
const SILENT_FALLBACK_RE = /\.catch\s*\(\s*\(\s*\)\s*=>\s*(\[\]|\{\})\s*\)/g;

// Annotation that explains a critical fallback
const SAFE_ANNOTATION_RE = /PK_SAFE_FALLBACK\s*:\s*(.{10,})/;

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
        SILENT_FALLBACK_RE.lastIndex = 0;
        if (SILENT_FALLBACK_RE.test(line)) {
          // Check for annotation on this line or the line above
          const prevLine = i > 0 ? lines[i - 1] : '';
          const annotated =
            SAFE_ANNOTATION_RE.test(line) || SAFE_ANNOTATION_RE.test(prevLine);

          results.push({
            file: relPath,
            line: i + 1,
            code: line.trim().substring(0, 120),
            critical: isCritical,
            annotated: !!annotated,
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
  const criticalExplained = critical.filter((f) => f.annotated);
  const criticalUnexplained = critical.filter((f) => !f.annotated);

  console.log('═'.repeat(80));
  console.log('SILENT FALLBACK AUDIT');
  console.log('═'.repeat(80));
  console.log(`Total silent fallback patterns: ${findings.length}`);
  console.log(`  PRODUCTION_CRITICAL: ${critical.length} (explained: ${criticalExplained.length}, unexplained: ${criticalUnexplained.length})`);
  console.log(`  ACCEPTABLE (non-critical paths): ${acceptable.length}`);
  console.log();

  if (criticalUnexplained.length > 0) {
    console.log('─'.repeat(80));
    console.log('UNEXPLAINED PRODUCTION-CRITICAL SILENT FALLBACKS (must fix or annotate):');
    console.log('─'.repeat(80));

    const byFile = {};
    criticalUnexplained.forEach((f) => {
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
    console.log('    1. Remove .catch() — let React Query / caller handle the error, OR');
    console.log('    2. Use Promise.allSettled for multi-module fetches, OR');
    console.log('    3. Add "// PK_SAFE_FALLBACK: <reason>" to annotate genuinely safe fallbacks.');
    console.log();

    if (strict) {
      process.exit(1);
    }
  } else {
    console.log('✓ No unexplained production-critical silent fallbacks found.');
  }

  process.exit(criticalUnexplained.length > 0 && strict ? 1 : 0);
}

main();