/**
 * Pins storefront hover-3d to whole-card pointer tilt + global tune.
 * Run: node scripts/check-product-hover-3d-whole-card.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const card = fs.readFileSync('src/components/ui/ProductCard.tsx', 'utf8');
const hook = fs.readFileSync('src/hooks/usePointerTilt.ts', 'utf8');
const lib = fs.readFileSync('src/lib/productHover3d.ts', 'utf8');
const settings = fs.readFileSync('src/lib/siteSettings.ts', 'utf8');

assert.match(card, /product-card__tilt-face/);
assert.match(card, /usePointerTilt/);
assert.doesNotMatch(card, /Hover3dZones/);
assert.match(hook, /lerpIn/);
assert.match(hook, /lerpOut/);
assert.match(lib, /hover3dMaxTilt/);
assert.match(lib, /parseProductHover3dTune/);
assert.match(settings, /product_hover_3d_json/);

const clamp = (n) => Math.min(10, Math.max(1, Math.round(n)));
const maxTilt = (m) => 4 + ((clamp(m) - 1) / 9) * 12;
const lerpIn = (s) => 0.06 + ((clamp(s) - 1) / 9) * 0.22;
const lerpOut = (s) => 0.22 - ((clamp(s) - 1) / 9) * 0.17;
assert.ok(maxTilt(10) > maxTilt(1));
assert.ok(lerpIn(10) > lerpIn(1));
assert.ok(lerpOut(10) < lerpOut(1));

console.log('check-product-hover-3d-whole-card: ok');
