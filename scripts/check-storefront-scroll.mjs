/**
 * Storefront Chromium scroll polish: Blink wheel lerp + rAF back-to-top,
 * reduced-motion instant, nested overflow left alone.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = readFileSync(join(root, 'src/lib/smoothScroll.ts'), 'utf8');
const back = readFileSync(join(root, 'src/components/ui/BackToTop.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/MainLayout.tsx'), 'utf8');

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

if (!lib.includes('needsWheelSmoothPatch') || !lib.includes("'chrome' in window")) {
  fails.push('smoothScroll.ts must gate wheel lerp on Blink (window.chrome)');
}
if (!lib.includes('prefers-reduced-motion: reduce')) {
  fails.push('smoothScroll.ts must honor prefers-reduced-motion');
}
if (!lib.includes('wheelTargetsNestedScroller') || !lib.includes('overflowCanScroll')) {
  fails.push('smoothScroll.ts must skip nested overflow scrollers');
}
if (!lib.includes('documentScrollLocked') || !lib.includes('documentScrollLocked()')) {
  fails.push('smoothScroll.ts must skip wheel lerp while modal/drawer locks scroll');
}
if (!lib.includes('smoothScrollWindowTo') || !lib.includes('easeInOutCubic')) {
  fails.push('smoothScroll.ts must expose rAF eased window scroll');
}
if (!back.includes('smoothScrollWindowTo') || back.includes("behavior: 'smooth'")) {
  fails.push('BackToTop must use smoothScrollWindowTo (not native behavior:smooth)');
}
if (!layout.includes('installStorefrontWheelSmooth')) {
  fails.push('MainLayout must install storefront wheel smooth');
}

const dash = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
if (dash.includes('installStorefrontWheelSmooth')) {
  fails.push('DashboardLayout must not install storefront wheel smooth');
}

if (fails.length) {
  console.error('check-storefront-scroll FAILED:');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('check-storefront-scroll: ok');
