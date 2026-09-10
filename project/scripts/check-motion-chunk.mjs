/**
 * framer-motion must stay lazy: the main chunk may list motion-*.js in its
 * Vite preload map (__vite__mapDeps) but must never import it statically.
 * Skips silently when dist/ hasn't been built.
 * Run: node scripts/check-motion-chunk.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'dist', 'assets');

if (!fs.existsSync(assets)) {
  console.log('check-motion-chunk: skipped (no dist/ build)');
  process.exit(0);
}

const index = fs.readdirSync(assets).find((f) => /^index-.*\.js$/.test(f));
assert.ok(index, 'dist/assets/index-*.js not found');
const src = fs.readFileSync(path.join(assets, index), 'utf8');

const staticImport = /(?:from|import)\s*["']\.\/motion-[^"']+\.js["']/.test(src);
assert.ok(!staticImport, `${index} statically imports the motion chunk — framer-motion leaked into first paint`);

console.log(`check-motion-chunk: ok (${index} does not statically import motion-*.js)`);
