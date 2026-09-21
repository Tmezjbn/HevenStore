/** Mirrors product_find_more parsers in src/lib/siteSettings.ts */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX = 8;
const SLOTS_DEFAULT = 4;
const INTERVAL_DEFAULT = 3;
const INTERVAL_MIN = 2;
const INTERVAL_MAX = 15;

function parseEnabled(raw) {
  return String(raw).trim() !== 'false';
}

function parseMode(raw) {
  return String(raw).trim() === 'manual' ? 'manual' : 'auto';
}

function parseSlots(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) return SLOTS_DEFAULT;
  return Math.min(MAX, Math.max(1, Math.round(n)));
}

function parseInterval(raw) {
  const n = Number(raw);
  if (Number.isNaN(n)) return INTERVAL_DEFAULT;
  return Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, Math.round(n)));
}

function parseIds(raw) {
  if (!String(raw).trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function windowAt(pool, start, slots) {
  if (pool.length === 0) return [];
  const n = Math.min(slots, pool.length);
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
}

assert.ok(parseEnabled('true') === true, 'enabled defaultish');
assert.ok(parseEnabled('false') === false, 'enabled off');
assert.ok(parseMode('manual') === 'manual', 'mode manual');
assert.ok(parseMode('auto') === 'auto', 'mode auto');
assert.ok(parseSlots('99') === MAX, 'slots cap');
assert.ok(parseSlots('0') === 1, 'slots floor');
assert.ok(parseInterval('3') === 3, 'interval 3');
assert.ok(parseInterval('1') === INTERVAL_MIN, 'interval floor');
assert.ok(parseIds(JSON.stringify(['a', 'b', ...'cdefghij'.split('')])).length === MAX, 'ids cap');
assert.ok(
  windowAt(['a', 'b', 'c', 'd'], 2, 3).join('') === 'cda',
  'window wrap',
);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fm = readFileSync(join(root, 'src/components/product/FindMoreProducts.tsx'), 'utf8');
assert.ok(fm.includes('className="find-more find-more--editorial"'), 'find-more section class');
assert.ok(fm.includes('id="find-more-products-heading"'), 'heading id for aria-labelledby');
assert.ok(fm.includes("t('المزيد!', 'More!')"), 'heading copy AR+EN');
assert.ok(fm.includes('step(-1)'), 'prev control');
// Blink: page-level overflow ≠ visible flattens FindMore / product-card aura (see HANDOFF).
const pdp = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.ok(pdp.includes('FindMoreProducts'), 'PDP hosts FindMore');
assert.ok(
  !/min-h-screen[^"'>\n]*overflow-hidden/.test(pdp),
  'PDP root must not overflow-hidden (clips FindMore aura on Chromium)',
);
console.log('product_find_more ok');
