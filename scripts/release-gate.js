#!/usr/bin/env node
/**
 * release-gate.js
 *
 * Comprehensive release validation gate for CollectionKeeper.
 * Runs all checks required before a production release.
 *
 * Usage: node scripts/release-gate.js
 * Exit code: 0 = all checks pass, 1 = one or more checks failed
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = process.cwd();
let failed = false;
const results = [];

function runCheck(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = fn();
    results.push({ name, status: 'PASS', detail: result || '' });
    console.log('✓ PASS');
  } catch (e) {
    results.push({ name, status: 'FAIL', detail: e.message || String(e) });
    console.log('✗ FAIL');
    console.log(`    ${e.message || e}`);
    failed = true;
  }
}

function exec(cmd, timeout = 120000) {
  return execSync(cmd, { cwd: ROOT, timeout, encoding: 'utf-8', stdio: 'pipe' });
}

console.log('\n═══ CollectionKeeper Release Gate ═══\n');

// 1. Duplicate source collision check
runCheck('1.  Duplicate source collision check', () => {
  try {
    exec('node scripts/check-duplicate-sources.js', 30000);
    return 'No collisions';
  } catch (e) {
    throw new Error(e.stdout || e.message);
  }
});

// 2. Unsafe entity query audit
runCheck('2.  Unsafe entity query audit', () => {
  try {
    exec('node scripts/audit-unsafe-queries.js', 30000);
    return 'No HIGH-severity findings';
  } catch (e) {
    throw new Error(e.stdout || e.message);
  }
});

// 3. Production build
runCheck('3.  Production build (vite build)', () => {
  try {
    exec('npx vite build 2>&1', 120000);
    return 'Build succeeded';
  } catch (e) {
    const out = e.stdout || '';
    throw new Error(out.substring(out.length - 500));
  }
});

// 4. iOS regression tests
runCheck('4.  iOS regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/pipekeeperIOSRegression.test.js --reporter=default 2>&1', 120000);
    if (/failed.*[1-9]/.test(out) || /Test Files.*1 failed/.test(out)) {
      throw new Error('Test failures detected');
    }
    return 'All iOS regression tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 5. Pipe Club tests
runCheck('5.  Pipe Club tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/pipeclub/pipeclub.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'All Pipe Club tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 6. AddFlow parity tests
runCheck('6.  AddFlow parity tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/addFlowParity.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'AddFlow parity tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 7. Stock library regression tests
runCheck('7.  Stock library regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/stockLibraryRegression.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Stock library tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 8. Pagination / full-fetch tests
runCheck('8.  Pagination / full-fetch tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/paginationFullFetch.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Pagination tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

console.log('\n═══ Summary ═══');
for (const r of results) {
  console.log(`  ${r.status === 'PASS' ? '✓' : '✗'} ${r.name}`);
}

if (failed) {
  console.log('\n✗ RELEASE GATE FAILED — do not release.\n');
  process.exit(1);
}

console.log('\n✓ RELEASE GATE PASSED — ready for device QA.\n');
process.exit(0);