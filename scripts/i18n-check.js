#!/usr/bin/env node
/**
 * i18n Regression Guard
 *
 * Scans src/pages/* and src/components/* for newly introduced hardcoded
 * user-facing strings in JSX so they can be caught before they reach
 * production.  Reuses the proper-noun allowlist and exclude patterns from
 * src/components/i18n/auditConfig.json.jsx.
 *
 * Usage:
 *   npm run i18n:check          # warn mode (default)
 *   npm run i18n:check -- --fail-on-findings   # exit 1 when findings exist
 *
 * See docs/i18n-check.md for full documentation.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load auditConfig ────────────────────────────────────────────────────────
// The file is a .jsx but its content is plain JSON so we strip any leading
// comment lines and parse the first JSON object we encounter.
function loadAuditConfig() {
  const configPath = join(ROOT, 'src/components/i18n/auditConfig.json.jsx');
  try {
    const raw = readFileSync(configPath, 'utf8');
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return JSON.parse(raw.slice(jsonStart, jsonEnd));
    }
  } catch {
    // Config file unavailable – fall back to built-in defaults
  }
  return { properNounAllowlist: [], excludePatterns: [] };
}

const auditConfig = loadAuditConfig();

// ─── Directories to scan ─────────────────────────────────────────────────────
const SCAN_ROOTS = [
  join(ROOT, 'src/pages'),
  join(ROOT, 'src/components'),
];

// ─── Exclusion rules ─────────────────────────────────────────────────────────
// Per-problem-statement requirements
const EXCLUDED_DIRS = [
  join(ROOT, 'src/components/debug'),
];

// Pages whose basenames start with any of these prefixes are excluded
const EXCLUDED_PAGE_PREFIXES = [];

// Patterns from auditConfig that also mark files as excluded
const CONFIG_EXCLUDE_PATTERNS = (auditConfig.excludePatterns || []).map(
  (p) => new RegExp(p),
);

function isExcluded(filePath) {
  const rel = relative(ROOT, filePath);

  // Exclude based on auditConfig patterns
  if (CONFIG_EXCLUDE_PATTERNS.some((re) => re.test(rel))) return true;

  // Exclude admin / debug component directories
  if (EXCLUDED_DIRS.some((dir) => filePath.startsWith(dir + sep))) return true;

  // Exclude specific page files by name prefix
  const basename = filePath.split('/').pop() || '';
  if (
    filePath.includes('/src/pages/') &&
    EXCLUDED_PAGE_PREFIXES.some((prefix) => basename.startsWith(prefix))
  ) {
    return true;
  }

  return false;
}

// ─── Allowlist ───────────────────────────────────────────────────────────────
// Strings that should never be flagged (proper nouns, brand names, etc.)
const PROPER_NOUN_ALLOWLIST = new Set(
  (auditConfig.properNounAllowlist || []).map((s) => s.toLowerCase()),
);

// Additional generic terms that are safe to leave un-translated
const GENERIC_ALLOWLIST = new Set([
  // HTML / technical
  'px', 'em', 'rem', 'vh', 'vw', '%',
  // Single-letter / punctuation-only strings are skipped by length check
]);

function isAllowlisted(text) {
  const lower = text.trim().toLowerCase();
  if (PROPER_NOUN_ALLOWLIST.has(lower)) return true;
  if (GENERIC_ALLOWLIST.has(lower)) return true;
  return false;
}

// ─── Detection patterns ──────────────────────────────────────────────────────
// Each rule has a name, a regex with a capture group for the flagged text, and
// an optional severity ('warn' | 'error').

const RULES = [
  {
    name: 'jsx-text-content',
    // Matches ">  Some Text  <" in JSX (not a translation call, not a variable)
    // Captures text between JSX tags that looks like a human-readable sentence.
    // End class extended to include ':' and ')' to catch labels like "Flavors:"
    // and format strings like "PNG, JPG, WEBP, SVG (multiple files)".
    // Middle class extended with '_' so instruction text with underscores is caught.
    // Minimum middle-char count reduced to 3 so 5-char strings like "Clear" are caught.
    pattern: />\s*([A-Z][a-zA-Z0-9 '",.:\s!?()&/_-]{3,}[a-zA-Z.!?:)])\s*</g,
    severity: 'warn',
  },
  {
    name: 'jsx-placeholder',
    // placeholder="Hardcoded string"
    pattern: /\bplaceholder=["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
  },
  {
    name: 'jsx-aria-label',
    // aria-label="Hardcoded string"
    pattern: /\baria-label=["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
  },
  {
    name: 'jsx-title-attr',
    // title="Hardcoded string"
    pattern: /\btitle=["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
  },
  {
    name: 'jsx-alt-text',
    // alt="Hardcoded string"
    pattern: /\balt=["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
  },
  {
    name: 'toast-hardcoded',
    // toast.success("Hardcoded") or toast.error("Hardcoded")
    pattern: /\btoast\.[a-z]+\(\s*["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
  },
  {
    name: 'jsx-text-before-expr',
    // Catches text that appears before a JSX expression: > Some label: {value}
    // This catches partially-translated lines like "Processed: {count}" and
    // inline labels like "Errors:" that are followed by {expressions}.
    pattern: />\s*([A-Z][a-zA-Z0-9 '",.!?()&/_-]{2,}[a-zA-Z.!?:])\s*\{/g,
    severity: 'warn',
  },
  {
    name: 'jsx-kbd-content',
    // Catches text inside <kbd> elements (keyboard hint labels like "Esc").
    // Symbol-only keys (↑↓, ↵, etc.) are filtered out by shouldIgnoreText.
    // minLength: 2 allows 3-char strings like "Esc" to be detected.
    pattern: /<kbd[^>]*>([A-Za-z][a-zA-Z0-9 ]*)<\/kbd>/g,
    severity: 'warn',
    minLength: 2,
  },
  {
    name: 'jsx-strong-content',
    // Catches literal text inside <strong> or <b> inline elements.
    // This catches field-label patterns like <strong>name</strong> or
    // <strong>Filename Format:</strong> that are missed by jsx-text-content
    // because the text may be lowercase or contain no leading uppercase letter.
    // Excludes expressions ({...}) and tag content (< >) to avoid false positives.
    pattern: /<(?:strong|b)(?:\s[^>]*)?>([A-Za-z][^{}<>]+)<\/(?:strong|b)>/g,
    severity: 'warn',
    minLength: 2,
  },
  {
    name: 't-fallback-literal',
    // Catches t("some.key", "English fallback string") calls where the second
    // argument is a plain string literal rather than an interpolation object.
    // This pattern indicates that the component is relying on an inline English
    // fallback instead of a locale key, which is the antipattern we want to eliminate.
    //
    // Two variants handle both double-quoted and single-quoted fallback strings.
    // Each uses (?:[^"\\]|\\.)*  /  (?:[^'\\]|\\.)*  to correctly match through
    // escaped characters (including escaped quotes and apostrophes inside strings).
    // This replaces the old [^"'] approach which broke on apostrophes and \"-escapes.
    //
    // The trailing [,)] allows matching both 2-arg calls t(key, fallback) and
    // 3-arg calls t(key, fallback, { options }).
    //
    // Captures the first 80 chars of the fallback for reporting; trimming happens
    // in shouldIgnoreText.  minLength set to 2 so even short fallbacks are flagged.
    pattern: /\bt\(\s*['"][^'"]+['"]\s*,\s*"((?:[^"\\]|\\.){2,80})"\s*[,)]/g,
    severity: 'warn',
    minLength: 2,
    // For fallback-literal rules, general ignore patterns (lowercase-start, digit-start)
    // do NOT apply — any literal string as a t() second arg is potentially an issue.
    bypassIgnorePatterns: true,
  },
  {
    name: 't-fallback-literal-single',
    // Same as t-fallback-literal but for single-quoted fallback strings.
    pattern: /\bt\(\s*['"][^'"]+['"]\s*,\s*'((?:[^'\\]|\\.){2,80})'\s*[,)]/g,
    severity: 'warn',
    minLength: 2,
    bypassIgnorePatterns: true,
  },
  {
    name: 't-default-value-literal',
    // Catches t("some.key", { defaultValue: "English text" }) calls where
    // defaultValue is used as an inline English fallback instead of adding
    // the key to the locale file.  This is the object-options variant of the
    // t-fallback-literal antipattern.
    //
    // Matches both double-quoted and single-quoted defaultValue strings and
    // captures the first 80 chars for reporting.
    pattern: /\bt\(\s*['"][^'"]+['"]\s*,\s*\{[^}]*defaultValue\s*:\s*["']([^"']{2,80})["'][^}]*\}/g,
    severity: 'warn',
    minLength: 2,
    bypassIgnorePatterns: true,
  },
  {
    name: 't-or-fallback-literal',
    // Catches t("some.key") || "English fallback" where a t() call is guarded
    // by an OR-expression with a raw string literal.  This indicates that the
    // component relies on an inline English fallback instead of a locale key.
    pattern: /\bt\([^)]+\)\s*\|\|\s*["']([A-Z][^"']{3,})["']/g,
    severity: 'warn',
    minLength: 4,
    bypassIgnorePatterns: true,
  },
];

// Short patterns likely to be false positives (CSS classes, code fragments, etc.)
const IGNORE_PATTERNS = [
  /^[a-z]/, // starts lowercase — not a user-facing string
  /^https?:\/\//, // URLs
  /^\s*\/\//, // comments
  /^[{(<[\]>)}\s]*$/, // only punctuation
  /^\d/, // starts with a digit
  /^[A-Z_]+$/, // ALL_CAPS constants
  /^[a-zA-Z0-9_-]+\.[a-zA-Z]{2,4}$/, // file names / extensions
  /^[a-z][a-zA-Z0-9.]+$/, // camelCase or dotted identifiers
];

function shouldIgnoreText(text, minLength = 4, bypassIgnorePatterns = false) {
  const trimmed = text.trim();
  if (trimmed.length < minLength) return true;
  if (bypassIgnorePatterns) return false;
  if (IGNORE_PATTERNS.some((re) => re.test(trimmed))) return true;
  return false;
}

// ─── File scanner ─────────────────────────────────────────────────────────────
function collectFiles(dir, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, files);
    } else if (/\.(jsx|js|tsx|ts)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function scanFile(filePath) {
  const findings = [];
  const source = readFileSync(filePath, 'utf8');
  const lines = source.split('\n');

  for (const rule of RULES) {
    // Reset lastIndex for global regexes
    rule.pattern.lastIndex = 0;

    let match;
    while ((match = rule.pattern.exec(source)) !== null) {
      const text = match[1].trim();

      if (shouldIgnoreText(text, rule.minLength ?? 4, rule.bypassIgnorePatterns ?? false)) continue;
      // For fallback-literal rules, do NOT skip findings based on the proper-noun
      // allowlist: even a proper noun inline fallback should be replaced with a key.
      if (!rule.bypassIgnorePatterns && isAllowlisted(text)) continue;

      // Determine line number from match offset
      const offset = match.index;
      let lineNum = 1;
      let chars = 0;
      for (let i = 0; i < lines.length; i++) {
        chars += lines[i].length + 1; // +1 for the newline
        if (chars > offset) {
          lineNum = i + 1;
          break;
        }
      }

      findings.push({
        file: relative(ROOT, filePath),
        line: lineNum,
        rule: rule.name,
        severity: rule.severity,
        text,
      });
    }
  }

  return findings;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const failOnFindings = process.argv.includes('--fail-on-findings');

  // --max-findings=N  Fail only when the total finding count exceeds N.
  // This lets CI gate on regressions without requiring full zero-tolerance
  // completion before the cleanup migration is done.
  let maxFindings = Infinity;
  const maxArg = process.argv.find((a) => a.startsWith('--max-findings='));
  if (maxArg) {
    const parsed = parseInt(maxArg.split('=')[1], 10);
    if (!isNaN(parsed) && parsed >= 0) maxFindings = parsed;
  }

  const allFiles = [];
  for (const scanRoot of SCAN_ROOTS) {
    collectFiles(scanRoot, allFiles);
  }

  const includedFiles = allFiles.filter((f) => !isExcluded(f));
  const allFindings = [];

  for (const filePath of includedFiles) {
    const findings = scanFile(filePath);
    allFindings.push(...findings);
  }

  // ── Output ──────────────────────────────────────────────────────────────────
  const warnCount = allFindings.filter((f) => f.severity === 'warn').length;
  const errorCount = allFindings.filter((f) => f.severity === 'error').length;

  if (allFindings.length === 0) {
    console.log('✅  i18n check passed — no hardcoded user-facing strings found.\n');
    console.log(`   Scanned ${includedFiles.length} files across src/pages and src/components.`);
    process.exit(0);
  }

  console.log('⚠️   i18n Regression Guard — Hardcoded String Report');
  console.log('='.repeat(60));
  console.log(`   Files scanned : ${includedFiles.length}`);
  console.log(`   Findings      : ${allFindings.length} (${errorCount} errors, ${warnCount} warnings)\n`);

  // Group by file for readability
  const byFile = {};
  for (const f of allFindings) {
    if (!byFile[f.file]) byFile[f.file] = [];
    byFile[f.file].push(f);
  }

  for (const [file, findings] of Object.entries(byFile).sort()) {
    console.log(`📄  ${file}`);
    for (const finding of findings) {
      const icon = finding.severity === 'error' ? '❌' : '⚠️ ';
      console.log(`  ${icon}  line ${finding.line}  [${finding.rule}]`);
      console.log(`      "${finding.text}"`);
    }
    console.log();
  }

  console.log('─'.repeat(60));
  console.log('How to fix flagged strings:');
  console.log('  1. Add a translation key to translations.js (all languages).');
  console.log('     Example:  common: { saveButton: "Save" }');
  console.log('  2. Import useTranslation in the component:');
  console.log('     const { t } = useTranslation();');
  console.log('  3. Replace the raw string with a t() call:');
  console.log('     Before: <Button>Save</Button>');
  console.log('     After:  <Button>{t("common.saveButton")}</Button>');
  console.log('  4. For t-fallback-literal findings: ensure the locale key exists,');
  console.log('     then remove the inline English fallback string:');
  console.log('     Before: {t("common.saveButton", "Save")}');
  console.log('     After:  {t("common.saveButton")}');
  console.log('  5. If a string is a proper noun or brand name, add it to');
  console.log('     src/components/i18n/auditConfig.json.jsx → properNounAllowlist.');
  console.log('─'.repeat(60));
  console.log();

  const exceedsMax = Number.isFinite(maxFindings) && allFindings.length > maxFindings;
  if (exceedsMax) {
    console.error(`❌  Findings budget exceeded: ${allFindings.length} findings > max allowed ${maxFindings}.`);
    console.error('   Reduce hardcoded strings before merging.');
    process.exit(1);
  }
  if (Number.isFinite(maxFindings)) {
    const remaining = maxFindings - allFindings.length;
    console.log(`ℹ️   Findings budget: ${allFindings.length}/${maxFindings} used (${remaining} remaining before gate triggers).`);
    console.log('   Reduce this number over time by replacing hardcoded strings with t() calls.\n');
  }

  if (failOnFindings || errorCount > 0) {
    process.exit(1);
  }
  // Warning mode: exit 0 so CI is not blocked
  process.exit(0);
}

main();
