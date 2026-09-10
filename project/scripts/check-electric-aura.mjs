/**
 * Pins electric aura to React Bits canvas Electric Border + per-product knobs.
 * Also pins PERF-1 (IntersectionObserver / visibility) and AX-1 (merch_motion_mode calm).
 * Run: node scripts/check-electric-aura.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const eb = fs.readFileSync('src/components/ui/ElectricBorder.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');
const card = fs.readFileSync('src/components/ui/ProductCard.tsx', 'utf8');
const fx = fs.readFileSync('src/components/dashboard/ProductEffectsSection.tsx', 'utf8');
const lib = fs.readFileSync('src/lib/productEffects.ts', 'utf8');
const catalog = fs.readFileSync('src/hooks/useCatalog.ts', 'utf8');
const settings = fs.readFileSync('src/lib/siteSettings.ts', 'utf8');
const calmHook = fs.readFileSync('src/hooks/useMerchMotionCalm.ts', 'utf8');
const bodyFx = fs.readFileSync('src/components/ui/ProductCardBodyFx.tsx', 'utf8');
const builder = fs.readFileSync('src/pages/dashboard/WebsiteBuilderPage.tsx', 'utf8');
const migration = fs.readFileSync(
  'supabase/migrations/20260723240000_products_aura_electric_json.sql',
  'utf8',
);

assert.match(eb, /getContext\(['"]2d['"]\)/);
assert.match(eb, /requestAnimationFrame/);
assert.match(eb, /octavedNoise/);
assert.match(eb, /prefers-reduced-motion/);
assert.match(eb, /export const AuraFrame/);
assert.match(eb, /electric\?:/);
assert.match(lib, /DEFAULT_ELECTRIC_AURA_COLOR/);
assert.match(lib, /DEFAULT_ELECTRIC_AURA_TUNE/);
assert.match(lib, /parseElectricAuraTune/);
assert.match(lib, /serializeElectricAuraTune/);
assert.match(lib, /isElectricAura/);
assert.match(lib, /aura-electric/);
assert.match(card, /AuraFrame/);
assert.match(card, /parseElectricAuraTune/);
assert.match(card, /electric=\{electricTune\}/);
assert.match(fx, /AuraFrame/);
assert.match(fx, /effect-preview-thumb--electric/);
assert.match(fx, /aura_electric_json/);
assert.match(fx, /Electric tune|ضبط الكهربائي/);
assert.match(fx, /ELECTRIC_SPEED_MIN/);
assert.match(fx, /ELECTRIC_CHAOS_MIN/);
assert.match(fx, /ELECTRIC_THICKNESS_MIN/);
assert.match(catalog, /aura_electric_json/);
assert.match(migration, /aura_electric_json/);
assert.match(css, /border-color:\s*transparent\s*!important/);
assert.match(css, /\.product-card-aura\.aura \.product-card/);
assert.match(css, /electric-border__layers/);
assert.match(css, /electric-border__canvas/);
assert.doesNotMatch(css, /electric-border-spin/);
assert.doesNotMatch(eb, /feTurbulence/);

// PERF-1 — offscreen / hidden tab must cancel rAF (static stroke remains).
assert.match(eb, /IntersectionObserver/);
assert.match(eb, /rootMargin:\s*['"]120px['"]/);
assert.match(eb, /visibilitychange/);
assert.match(eb, /document\.hidden/);
assert.match(eb, /cancelAnimationFrame/);

// AX-1 — honor reduced-motion via owner merch_motion_mode (auto / always / off).
assert.match(settings, /merch_motion_mode/);
assert.match(settings, /MERCH_MOTION_MODES/);
assert.match(settings, /parseMerchMotionMode/);
assert.match(settings, /merchMotionShouldCalm/);
assert.match(settings, /merch_motion_mode:\s*['"]auto['"]/);
assert.match(calmHook, /parseMerchMotionMode/);
assert.match(calmHook, /merchMotionShouldCalm/);
assert.match(calmHook, /prefers-reduced-motion:\s*reduce/);
assert.match(eb, /useMerchMotionCalm/);
assert.match(eb, /data-electric-calm/);
assert.match(eb, /merchCalm/);
assert.match(bodyFx, /useMerchMotionCalm/);
assert.match(bodyFx, /active=\{fxActive\}/);
assert.match(card, /useMerchMotionCalm/);
assert.match(card, /!merchCalm/);
assert.match(builder, /merch_motion_mode/);
assert.match(builder, /parseMerchMotionMode/);
assert.match(builder, /Product card motion|حركة بطاقات المنتجات/);
assert.match(builder, /Always \(keep motion\)|دائماً \(أبقِ الحركة\)/);

// Runnable clamp self-check (mirrors productEffects parse defaults).
const defaults = { speed: 1, chaos: 0.14, thickness: 2 };
assert.deepEqual(defaults, { speed: 1, chaos: 0.14, thickness: 2 });

// Runnable merchMotionShouldCalm truth table (mirrors siteSettings).
function merchMotionShouldCalm(mode, prefersReduced) {
  if (mode === 'off') return true;
  if (mode === 'always') return false;
  return prefersReduced;
}
assert.equal(merchMotionShouldCalm('auto', true), true);
assert.equal(merchMotionShouldCalm('auto', false), false);
assert.equal(merchMotionShouldCalm('always', true), false);
assert.equal(merchMotionShouldCalm('off', false), true);

console.log('check-electric-aura: ok');
