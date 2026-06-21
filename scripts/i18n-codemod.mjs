#!/usr/bin/env node
/**
 * i18n codemod — automated remediation of hardcoded-string audit findings.
 *
 * Phases are selected via CLI flags:
 *   --fallbacks   strip inline t() fallback literals / defaultValue / OR-fallback
 *   --jsx         wrap hardcoded JSX text + attributes + toast/setError/confirm
 *   --apply       write changes (otherwise dry-run)
 *
 * Generated English values are written to scripts/i18n-codemod-keys.json which
 * is then folded into the generated locale packs by gen-audit-locales.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const KEYS_FILE = join(ROOT, 'scripts/i18n-codemod-keys.json');

const argv = process.argv.slice(2);
const DO_FALLBACKS = argv.includes('--fallbacks');
const DO_JSX = argv.includes('--jsx');
const APPLY = argv.includes('--apply');
const fileArgs = argv.filter((a) => !a.startsWith('--'));

function loadKeys() {
  if (existsSync(KEYS_FILE)) {
    try { return JSON.parse(readFileSync(KEYS_FILE, 'utf8')); } catch { /* ignore */ }
  }
  return {};
}
const generatedKeys = loadKeys();

function parseFile(code, filename) {
  const plugins = ['jsx'];
  if (/\.tsx?$/.test(filename)) plugins.push('typescript');
  return parse(code, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    plugins,
    errorRecovery: true,
  });
}

// ─── slug / key helpers ──────────────────────────────────────────────────────
function slugText(text) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('_')
    .slice(0, 48) || 'text';
}
function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}
function fileNs(filePath) {
  const rel = relative(ROOT, filePath)
    .replace(/^src\//, '')
    .replace(/\.(jsx|js|tsx|ts)$/, '');
  const parts = rel.split('/').map((p) => p.replace(/[^a-zA-Z0-9]/g, ''));
  return parts.map((p, i) => (i === 0 ? p : p)).join('_');
}
function makeKey(filePath, text) {
  return `auto.${fileNs(filePath)}.${slugText(text)}_${hashText(text)}`;
}

function recordKey(key, value) {
  if (!(key in generatedKeys)) generatedKeys[key] = value;
}

// ─── edit application ────────────────────────────────────────────────────────
function applyEdits(code, edits) {
  // edits: {start, end, replacement}; apply from end to start
  edits.sort((a, b) => b.start - a.start);
  let out = code;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

// Determine if `t` is bound in a path's scope chain.
function hasTBinding(path) {
  let p = path;
  while (p) {
    if (p.scope && p.scope.hasOwnBinding && p.scope.hasOwnBinding('t')) return true;
    p = p.parentPath;
  }
  return false;
}

// ─── Fallback stripping ──────────────────────────────────────────────────────
function processFallbacks(ast, code) {
  const edits = [];
  traverse(ast, {
    CallExpression(path) {
      const { node } = path;
      const callee = node.callee;
      const calleeIsT =
        (callee.type === 'Identifier' && callee.name === 't') ||
        (callee.type === 'MemberExpression' && callee.property &&
          callee.property.type === 'Identifier' && callee.property.name === 't');
      if (!calleeIsT) return;
      const args = node.arguments;
      if (args.length < 2) return;
      const key = args[0];
      if (key.type !== 'StringLiteral') return;

      const a1 = args[1];
      // t("key", "fallback" [, opts]) → drop the string fallback
      if (a1.type === 'StringLiteral') {
        recordKey(key.value, a1.value);
        if (args.length >= 3) {
          // remove a1 and its trailing comma: from end of key to start of args[2]
          edits.push({ start: key.end, end: args[2].start, replacement: ', ' });
        } else {
          edits.push({ start: key.end, end: a1.end, replacement: '' });
        }
        return;
      }
      // t("key", { defaultValue: "x", ...rest })
      if (a1.type === 'ObjectExpression') {
        const dvProp = a1.properties.find(
          (p) => p.type === 'ObjectProperty' && !p.computed &&
            ((p.key.type === 'Identifier' && p.key.name === 'defaultValue') ||
             (p.key.type === 'StringLiteral' && p.key.value === 'defaultValue')) &&
            p.value.type === 'StringLiteral',
        );
        if (!dvProp) return;
        recordKey(key.value, dvProp.value.value);
        const others = a1.properties.filter((p) => p !== dvProp);
        if (others.length === 0) {
          // remove entire second arg
          if (args.length >= 3) {
            edits.push({ start: key.end, end: args[2].start, replacement: ', ' });
          } else {
            edits.push({ start: key.end, end: a1.end, replacement: '' });
          }
        } else {
          // remove just the defaultValue property incl. neighbouring comma
          const idx = a1.properties.indexOf(dvProp);
          let start, end;
          if (idx === a1.properties.length - 1) {
            // last prop: remove preceding comma
            start = a1.properties[idx - 1].end;
            end = dvProp.end;
          } else {
            // remove prop and following comma
            start = dvProp.start;
            end = a1.properties[idx + 1].start;
          }
          edits.push({ start, end, replacement: '' });
        }
      }
    },
    LogicalExpression(path) {
      const { node } = path;
      if (node.operator !== '||') return;
      const left = node.left;
      const right = node.right;
      if (right.type !== 'StringLiteral') return;
      // The operand immediately preceding the string fallback. For a chain
      // like `a || t(...) || 'literal'` (parsed left-associatively) that is
      // node.left.right; for `t(...) || 'literal'` it is node.left itself.
      const preceding =
        left.type === 'LogicalExpression' && left.operator === '||'
          ? left.right
          : left;
      if (!preceding || preceding.type !== 'CallExpression') return;
      const callee = preceding.callee;
      const calleeIsT =
        (callee.type === 'Identifier' && callee.name === 't') ||
        (callee.type === 'MemberExpression' && callee.property &&
          callee.property.type === 'Identifier' && callee.property.name === 't');
      if (!calleeIsT) return;
      const firstArg = preceding.arguments[0];
      if (!firstArg || firstArg.type !== 'StringLiteral') return;
      recordKey(firstArg.value, right.value);
      // strip the trailing `|| 'literal'` (from end of preceding operand)
      edits.push({ start: preceding.end, end: node.end, replacement: '' });
    },
  });
  return edits;
}

// ─── main ────────────────────────────────────────────────────────────────────
function run() {
  const files = fileArgs.map((f) => resolve(ROOT, f));
  let changed = 0;
  for (const file of files) {
    let code;
    try { code = readFileSync(file, 'utf8'); } catch { continue; }
    let ast;
    try { ast = parseFile(code, file); } catch (e) {
      console.error(`PARSE FAIL ${relative(ROOT, file)}: ${e.message}`);
      continue;
    }
    let edits = [];
    if (DO_FALLBACKS) edits = edits.concat(processFallbacks(ast, code));
    if (edits.length === 0) continue;
    const out = applyEdits(code, edits);
    if (out !== code) {
      changed++;
      if (APPLY) writeFileSync(file, out);
      console.log(`${APPLY ? 'WROTE' : 'DRY'} ${relative(ROOT, file)} (${edits.length} edits)`);
    }
  }
  if (APPLY) writeFileSync(KEYS_FILE, JSON.stringify(generatedKeys, null, 2));
  console.log(`\n${changed} files ${APPLY ? 'changed' : 'would change'}; ${Object.keys(generatedKeys).length} keys recorded.`);
}

run();
