#!/usr/bin/env node
/**
 * Builds src/components/i18n/locales/generated.audit.jsx from the dotted
 * key→English map produced by i18n-codemod.mjs. The generated pack is merged
 * into every locale at the LOWEST priority, so any real (hand-authored)
 * translation always wins; the generated entries only fill genuine gaps and
 * guarantee that no key ever renders as a raw dotted path.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const KEYS_FILE = join(ROOT, 'scripts/i18n-codemod-keys.json');
const OUT = join(ROOT, 'src/components/i18n/locales/generated.audit.jsx');

if (!existsSync(KEYS_FILE)) {
  console.error('No keys file found.');
  process.exit(1);
}
const map = JSON.parse(readFileSync(KEYS_FILE, 'utf8'));

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

const tree = {};
for (const [k, v] of Object.entries(map)) setDeep(tree, k, v);

const banner = `/**\n * AUTO-GENERATED — do not edit by hand.\n *\n * English source strings extracted by scripts/i18n-codemod.mjs while replacing\n * hardcoded user-facing strings with t() calls. Regenerate with:\n *   node scripts/i18n-codemod.mjs ... && node scripts/gen-audit-locales.mjs\n *\n * Merged at lowest priority into every locale (see locales/index.jsx via the\n * provider), so hand-authored translations always override these defaults and\n * no key ever renders as a raw dotted path.\n */\n`;

const body = `const generatedAudit = ${JSON.stringify(tree, null, 2)};\n\nexport default generatedAudit;\n`;
writeFileSync(OUT, banner + '\n' + body);
console.log(`Wrote ${OUT} with ${Object.keys(map).length} keys.`);
