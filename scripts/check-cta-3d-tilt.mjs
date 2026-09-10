/** Lerp constants for Cta3dLink — fails if smoothing drifts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/components/home/Cta3dLink.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');
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
