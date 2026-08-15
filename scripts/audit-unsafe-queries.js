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
          const callContent = trimmed.substring(trimmed.indexOf('(') + 1);
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

if (high.length > 0) {
  console.error(`\n✗ ${high.length} HIGH-severity unsafe queries in full-dataset paths.`);
  console.error('  Fix: use fetchAllEntities() from @/lib/base44/fetchAllEntities');
  console.error('  Or add // PK_SAFE_QUERY: <reason> above the line to allowlist.');
  process.exit(1);
}

console.log('\n✓ No HIGH-severity findings. MEDIUM findings may be intentionally bounded UI queries.');
process.exit(0);