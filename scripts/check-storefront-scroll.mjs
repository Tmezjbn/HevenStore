/**
 * Storefront scroll: wheel/trackpad scrolling must stay native — a JS lerp
 * (preventDefault'd wheel + per-frame scrollTo) loses to compositor scrolling
 * under heavy paint. Back-to-top keeps a short rAF ease (Blink animates CSS
 * behavior:'smooth' unevenly under load); reduced-motion → instant.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = readFileSync(join(root, 'src/lib/smoothScroll.ts'), 'utf8');
const back = readFileSync(join(root, 'src/components/ui/BackToTop.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/MainLayout.tsx'), 'utf8');
const dash = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');

const fails = [];

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

try {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(Math.abs(easeInOutCubic(0.5) - 0.5) < 1e-9);
  assert.ok(easeInOutCubic(0.25) < 0.5);
  assert.ok(easeInOutCubic(0.75) > 0.5);
} catch (e) {
  fails.push(`easeInOutCubic math broken: ${e.message}`);
}

if (lib.includes("addEventListener('wheel'") || lib.includes('addEventListener("wheel"')) {
  fails.push('smoothScroll.ts must not intercept wheel events (native scrolling only)');
}
if (!lib.includes('prefers-reduced-motion: reduce')) {
  fails.push('smoothScroll.ts must honor prefers-reduced-motion');
}
if (!lib.includes('smoothScrollWindowTo') || !lib.includes('easeInOutCubic')) {
  fails.push('smoothScroll.ts must expose rAF eased window scroll');
}
if (!back.includes('smoothScrollWindowTo') || back.includes("behavior: 'smooth'")) {
  fails.push('BackToTop must use smoothScrollWindowTo (not native behavior:smooth)');
}
if (layout.includes('installStorefrontWheelSmooth') || dash.includes('installStorefrontWheelSmooth')) {
  fails.push('Layouts must not install a wheel-scroll interceptor');
}

if (fails.length) {
  console.error('check-storefront-scroll FAILED:');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('check-storefront-scroll: ok');
