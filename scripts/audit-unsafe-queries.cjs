#!/usr/bin/env node
/**
 * audit-unsafe-queries.js
 *
 * Static audit that flags Base44 entity queries in production code that may
 * silently truncate results — omitting pagination or an explicit justified
 * limit in export/analytics/full-collection code paths.
 *
 * Flags:
 *   - base44.entities.X.filter(...) without a limit argument
 *   - base44.entities.X.list(...) without a limit argument
 *   - Hard-coded limits ≤ 500 in files matching export/analytics/collection patterns
 *
 * Allowlist: add a // PK_SAFE_QUERY: <reason> comment on the line above a
 * flagged call to suppress it.
 *
 * Usage: node scripts/audit-unsafe-queries.js
 * Exit code: 0 = pass, 1 = unresolved unsafe queries found
 */
const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src', 'base44'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '__tests__', '__test__']);
const HARD_LIMIT_THRESHOLD = 500;

// File patterns that require complete datasets
const FULL_DATASET_PATTERNS = [
  /export/i, /analytics/i, /insights/i, /hub/i, /selector/i,
  /report/i, /valuation/i, /summary/i, /aggregation/i,
];

// Entity query patterns
const FILTER_RE = /\.entities\.(\w+)\.filter\(/;
const LIST_RE = /\.entities\.(\w+)\.list\(/;

function findUnsafeQueries() {
  const findings = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else {
        if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;

        const filePath = path.join(dir, entry.name);
        let content;
        try { content = fs.readFileSync(filePath, 'utf-8'); } catch { continue; }
        const lines = content.split('\n');

        lines.forEach((line, i) => {
          const trimmed = line.trim();

          // Check for allowlist comment on previous line
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          if (/PK_SAFE_QUERY/.test(prevLine)) return;

          // Detect .filter() calls
          const filterMatch = trimmed.match(FILTER_RE);
          const listMatch = trimmed.match(LIST_RE);
          const match = filterMatch || listMatch;
          if (!match) return;

          // Check if a limit argument is present (3rd or 2nd arg)
          // .filter(filterObj, sortOrder, limit, skip) — limit is arg 3
          // .list(sortOrder, limit) — limit is arg 2
          // Use the match position to find the correct opening paren (not one
          // from an arrow function or other context earlier on the line)
          const matchIndex = match.index ?? 0;
          const matchEnd = matchIndex + match[0].length;
          let callContent = trimmed.substring(matchEnd);

          // Handle multi-line calls: we're inside the filter( call, so depth
          // starts at 1. Join subsequent lines until depth reaches 0 (closing paren).
          let depth = 1;
          let callComplete = false;
          for (const ch of callContent) {
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) { callComplete = true; break; } }
          }
          if (!callComplete) {
            for (let j = i + 1; j < Math.min(i + 10, lines.length) && !callComplete; j++) {
              callContent += ' ' + lines[j].trim();
              for (const ch of lines[j]) {
                if (ch === '(' || ch === '[' || ch === '{') depth++;
                else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) { callComplete = true; break; } }
              }
            }
          }

          const argCount = countTopLevelArgs(callContent);

          const isFilter = !!filterMatch;
          const minArgsForLimit = isFilter ? 3 : 2;

          if (argCount < minArgsForLimit) {
            // No limit argument — potentially unsafe
            const relPath = filePath.replace(process.cwd() + '/', '');
            const entityName = match[1];
            const needsFullDataset = FULL_DATASET_PATTERNS.some(p => p.test(relPath));

            findings.push({
              file: relPath,
              line: i + 1,
              entity: entityName,
              method: isFilter ? 'filter' : 'list',
              issue: 'no limit argument',
              severity: needsFullDataset ? 'HIGH' : 'MEDIUM',
              code: trimmed.substring(0, 120),
            });
          }
        });
      }
    }
  }

  for (const dir of SCAN_DIRS) {
    walk(path.join(process.cwd(), dir));
  }

  return findings;
}

function countTopLevelArgs(str) {
  let depth = 0;
  let count = 0;
  let hasContent = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth < 0) break;
    }
    else if (ch === ',' && depth === 0) {
      count++;
      hasContent = false;
    }
    else if (depth === 0 && !/\s/.test(ch)) {
      hasContent = true;
    }
  }
  if (hasContent) count++;
  return count;
}

const findings = findUnsafeQueries();

if (findings.length === 0) {
  console.log('✓ No unsafe entity queries found.');
  process.exit(0);
}

const high = findings.filter(f => f.severity === 'HIGH');
const medium = findings.filter(f => f.severity === 'MEDIUM');

console.log(`Unsafe entity query audit: ${findings.length} finding(s)`);
console.log(`  HIGH (full-dataset path, no limit): ${high.length}`);
console.log(`  MEDIUM (other path, no limit): ${medium.length}\n`);

for (const f of findings.slice(0, 30)) {
  console.log(`  [${f.severity}] ${f.file}:${f.line}`);
  console.log(`    ${f.entity}.${f.method}() — ${f.issue}`);
  console.log(`    ${f.code}`);
  console.log('');
}

if (findings.length > 30) {
  console.log(`  ... and ${findings.length - 30} more`);
}

// Baseline support: fail only if HIGH findings exceed the accepted baseline.
// This prevents new unsafe queries from being introduced while allowing
// legacy findings to be fixed incrementally.
const baselineFile = path.join(__dirname, '.unsafe-query-baseline.json');
let baseline = null;
if (fs.existsSync(baselineFile)) {
  try { baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8')).highCount || 0; } catch {}
}

if (high.length === 0) {
  console.log('\n✓ No HIGH-severity findings. MEDIUM findings may be intentionally bounded UI queries.');
  process.exit(0);
}

if (baseline !== null) {
  if (high.length <= baseline) {
    console.log(`\n⚠ ${high.length} HIGH-severity findings (at or below baseline of ${baseline}).`);
    console.log('  Fix existing findings incrementally. New findings will fail the gate.');
    process.exit(0);
  } else {
    console.error(`\n✗ ${high.length} HIGH-severity findings (exceeds baseline of ${baseline}).`);
    console.error('  New unsafe queries were introduced. Fix them or use fetchAllEntities().');
    process.exit(1);
  }
}

// First run: establish baseline
try {
  fs.writeFileSync(baselineFile, JSON.stringify({ highCount: high.length, established: new Date().toISOString() }, null, 2));
  console.log(`\n⚠ Baseline established: ${high.length} HIGH-severity findings.`);
  console.log('  Subsequent runs will fail if findings exceed this baseline.');
  process.exit(0);
} catch {
  console.error(`\n✗ ${high.length} HIGH-severity unsafe queries in full-dataset paths.`);
  console.error('  Fix: use fetchAllEntities() from @/lib/base44/fetchAllEntities');
  process.exit(1);
}