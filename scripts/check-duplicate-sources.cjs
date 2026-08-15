#!/usr/bin/env node
/**
 * check-duplicate-sources.js
 *
 * Fails the build/release if prohibited basename collisions exist.
 * Detects: foo.js + foo.jsx, foo.ts + foo.tsx in the same directory.
 *
 * Vite's default resolve.extensions order is ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'].
 * When both foo.js and foo.jsx exist, imports without extension ALWAYS resolve to foo.js.
 * The .jsx file becomes dead code — fixes made to it never execute.
 *
 * Usage: node scripts/check-duplicate-sources.js
 * Exit code: 0 = pass, 1 = collisions found
 */
const fs = require('fs');
const path = require('path');

const SCAN_DIRS = ['src', 'base44'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const COLLISION_PAIRS = [
  ['.js', '.jsx'],
  ['.ts', '.tsx'],
];

function findCollisions() {
  const collisions = [];

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    const filesInDir = {};
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else {
        const ext = path.extname(entry.name);
        const base = path.basename(entry.name, ext);
        if (!filesInDir[base]) filesInDir[base] = [];
        filesInDir[base].push(ext);
      }
    }

    for (const [base, exts] of Object.entries(filesInDir)) {
      for (const [ext1, ext2] of COLLISION_PAIRS) {
        if (exts.includes(ext1) && exts.includes(ext2)) {
          collisions.push({
            dir: dir.replace(process.cwd() + '/', ''),
            basename: base,
            files: [base + ext1, base + ext2],
          });
        }
      }
    }
  }

  for (const dir of SCAN_DIRS) {
    walk(path.join(process.cwd(), dir));
  }

  return collisions;
}

const collisions = findCollisions();

if (collisions.length === 0) {
  console.log('✓ No duplicate source collisions found.');
  process.exit(0);
}

console.error(`✗ Found ${collisions.length} duplicate source collision(s):\n`);
for (const c of collisions) {
  console.error(`  ${c.dir}/${c.basename} → ${c.files.join(' + ')}`);
  console.error(`    Vite resolves ${c.files[0]} (shadowing ${c.files[1]} as dead code)\n`);
}
console.error('Fix: merge unique functionality into the canonical (.js/.ts) file, then delete the duplicate.');
process.exit(1);