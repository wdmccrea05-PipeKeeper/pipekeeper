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
    exec('node scripts/check-duplicate-sources.cjs', 30000);
    return 'No collisions';
  } catch (e) {
    throw new Error(e.stdout || e.message);
  }
});

// 2. Unsafe entity query audit (enforce 0 unexplained HIGH findings)
runCheck('2.  Unsafe entity query audit (0 HIGH required)', () => {
  try {
    const out = exec('node scripts/audit-unsafe-queries.cjs', 30000);
    // Verify zero HIGH findings — the audit prints "Total HIGH: N"
    if (/Total HIGH:\s*[1-9]/.test(out)) {
      throw new Error('HIGH-severity unsafe queries remain — fix or annotate with PK_SAFE_QUERY');
    }
    return '0 HIGH-severity findings (all queries bounded or paginated)';
  } catch (e) {
    throw new Error(e.stdout || e.message);
  }
});

// 2b. Silent fallback audit (0 unexplained critical required)
//     Every critical .catch(() => []) must be either fixed (removed),
//     reclassified with a documented PK_SAFE_FALLBACK annotation, or
//     removed as dead code. No grandfathered baseline for critical paths.
runCheck('2b. Silent fallback audit (0 unexplained critical)', () => {
  try {
    const out = exec('node scripts/audit-silent-fallbacks.cjs --strict', 30000);
    return '0 unexplained production-critical silent fallbacks';
  } catch (e) {
    const out = e.stdout || e.message || '';
    const match = out.match(/unexplained:\s*(\d+)/);
    const count = match ? parseInt(match[1], 10) : '?';
    throw new Error(`${count} unexplained production-critical silent fallbacks remain — fix, annotate with PK_SAFE_FALLBACK, or remove`);
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

// 9. Apple JWS verifier security tests
runCheck('9.  Apple JWS verifier security tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/appleJwsVerifierSecurity.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Apple JWS security tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 10. Export completeness regression tests
runCheck('10. Export completeness regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/exportCompletenessRegression.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Export completeness tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 11. Analytics parity regression tests
runCheck('11. Analytics parity regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/analyticsParityRegression.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Analytics parity tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 12. Silent fallback hardening regression tests
runCheck('12. Silent fallback hardening regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/silentFallbackHardening.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Silent fallback hardening tests passed';
  } catch (e) {
    const out = e.stdout || e.message;
    throw new Error(out.substring(0, 500));
  }
});

// 13. Apple sync failure regression tests (P0: manscor13@yahoo.com)
runCheck('13. Apple sync failure regression tests', () => {
  try {
    const out = exec('npx vitest run src/__tests__/appleSyncFailureRegression.test.js --reporter=default 2>&1', 120000);
    if (/Test Files.*1 failed/.test(out)) throw new Error('Test failures detected');
    return 'Apple sync failure regression tests passed';
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

console.log('\n✓ RELEASE GATE PASSED — ready for release candidate.\n');
process.exit(0);