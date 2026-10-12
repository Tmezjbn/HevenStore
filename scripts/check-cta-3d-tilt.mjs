/** Lerp constants for Cta3dLink — fails if smoothing drifts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// src/index.css + src/css/*.css (split storefront styles)
function readIndexCss() {
  const _fs = globalThis.process.getBuiltinModule('node:fs');
  const _p = globalThis.process.getBuiltinModule('node:path');
  const _r = _p.resolve(_p.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  const dir = _p.join(_r, 'src/css');
  return [_fs.readFileSync(_p.join(_r, 'src/index.css'), 'utf8'), ..._fs.readdirSync(dir).filter((f) => f.endsWith('.css')).sort().map((f) => _fs.readFileSync(_p.join(dir, f), 'utf8'))].join('\n');
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/components/home/Cta3dLink.tsx'), 'utf8');
const css = readIndexCss();
const layout = readFileSync(join(root, 'src/layouts/MainLayout.tsx'), 'utf8');

assert.match(src, /const LERP = 0\.14/);
assert.match(src, /const MAX_TILT = 9/);
assert.match(src, /requestAnimationFrame/);
assert.match(src, /useMerchMotionCalm/);
assert.match(src, /merchCalm/);

const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
assert.match(home, /Cta3dLink/);
assert.doesNotMatch(home, /hover-3d.*cta-3d-card|cta-3d-card[\s\S]*hover-3d/);

/* Blink: perspective() must live in transform — parent perspective dies under overflow. */
assert.match(css, /perspective\(75rem\)/);
assert.match(css, /--cta-s/);
assert.doesNotMatch(css, /\.cta-3d-tilt\s*\{[^}]*perspective:\s*75rem/s);
assert.doesNotMatch(layout, /overflow-x-hidden/);

console.log('check-cta-3d-tilt: ok');
