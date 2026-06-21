import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const APPLY = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function styleFromOptions(objNode) {
  if (!objNode || objNode.type !== 'ObjectExpression') return 'short';
  const get = (name) => {
    const p = objNode.properties.find(
      (pr) => pr.type === 'ObjectProperty' && (pr.key.name || pr.key.value) === name
    );
    if (!p) return undefined;
    return p.value.value;
  };
  const month = get('month');
  const day = get('day');
  const year = get('year');
  if (month === 'long' && day) return 'long';
  if (month === 'long' && !day) return 'monthYear';
  if (month === 'short' && year === '2-digit') return 'monthShortYear2';
  if (month === 'short' && day) return 'medium';
  if (month === 'numeric' && day) return 'short';
  return 'short';
}

function processFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (e) {
    console.error('PARSE FAIL', file, e.message);
    return null;
  }
  const edits = [];
  const used = new Set();
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type !== 'MemberExpression' || callee.computed) return;
      const prop = callee.property.name;
      if (!['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString'].includes(prop)) return;
      const recv = callee.object;
      const recvSrc = code.slice(recv.start, recv.end);
      let replacement;
      if (prop === 'toLocaleDateString') {
        const style = styleFromOptions(p.node.arguments[1]);
        replacement = `formatDate(${recvSrc}, '${style}')`;
        used.add('formatDate');
      } else {
        replacement = `formatDateTime(${recvSrc})`;
        used.add('formatDateTime');
      }
      edits.push({ start: p.node.start, end: p.node.end, replacement });
    },
  });
  if (edits.length === 0) return { file, changed: false };

  edits.sort((a, b) => b.start - a.start);
  let out = code;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }

  // Ensure import
  const importPath = '@/components/utils/localeFormatters';
  const importRe = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${importPath.replace(/[/]/g, '\\/')}['"]`
  );
  const m = out.match(importRe);
  if (m) {
    const existing = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const need = [...used].filter((u) => !existing.includes(u));
    if (need.length) {
      const merged = [...existing, ...need].join(', ');
      out = out.replace(importRe, `import { ${merged} } from '${importPath}'`);
    }
  } else {
    const importLine = `import { ${[...used].join(', ')} } from '${importPath}';\n`;
    // insert after last top-level import
    const lines = out.split('\n');
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\b/.test(lines[i])) lastImport = i;
    }
    if (lastImport >= 0) {
      lines.splice(lastImport + 1, 0, importLine.trimEnd());
      out = lines.join('\n');
    } else {
      out = importLine + out;
    }
  }

  if (APPLY) fs.writeFileSync(file, out, 'utf8');
  return { file, changed: true, count: edits.length, used: [...used] };
}

let total = 0;
for (const f of files) {
  const r = processFile(f);
  if (r && r.changed) {
    total += r.count;
    console.log(`${APPLY ? 'FIXED' : 'WOULD FIX'} ${r.file} (${r.count}) [${r.used.join(',')}]`);
  }
}
console.log(`Total: ${total} replacements across files`);
