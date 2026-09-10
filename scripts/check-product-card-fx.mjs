/**
 * Assert product card-body FX wiring stays honest.
 * Run: node scripts/check-product-card-fx.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function mustInclude(rel, needle) {
  const text = readFileSync(join(root, rel), 'utf8');
  if (!text.includes(needle)) {
    console.error(`FAIL ${rel}: missing ${JSON.stringify(needle)}`);
    process.exit(1);
  }
}

mustInclude('supabase/migrations/20260714100000_products_card_fx.sql', 'card_fx');
mustInclude('src/lib/productCardFx.ts', 'export function normalizeCardFx');
mustInclude('src/lib/productCardFx.ts', "'sheen'");
mustInclude('src/lib/productCardFx.ts', "'embers'");
mustInclude('src/lib/productCardFx.ts', "'rift'");
mustInclude('src/lib/productCardFx.ts', "o.style === 'pulse'");
mustInclude('src/lib/productCardFx.ts', 'gradient');
mustInclude('src/lib/productCardFx.ts', 'gradientShift');
mustInclude('src/lib/productCardFx.ts', 'matrixDir');
mustInclude('src/lib/productCardFx.ts', 'matrixCols');
mustInclude('src/lib/productCardFx.ts', 'matrixLetters');
mustInclude('src/lib/productCardFx.ts', 'matrixSpeed');
mustInclude('src/lib/productCardFx.ts', 'matrixType');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_MATRIX_TYPE');
mustInclude('src/lib/productCardFx.ts', 'clampMatrixCols');
mustInclude('src/lib/productCardFx.ts', 'clampMatrixLetters');
mustInclude('src/lib/productCardFx.ts', 'clampMatrixSpeed');
mustInclude('src/lib/productCardFx.ts', 'clampGlitchSpeed');
mustInclude('src/lib/productCardFx.ts', 'clampGlitchChars');
mustInclude('src/lib/productCardFx.ts', 'matrixGlitchColors');
mustInclude('src/lib/productCardFx.ts', 'matrixGlitchSpeed');
mustInclude('src/lib/productCardFx.ts', 'matrixGlitchSmooth');
mustInclude('src/lib/productCardFx.ts', 'matrixOuterVignette');
mustInclude('src/lib/productCardFx.ts', 'matrixCenterVignette');
mustInclude('src/lib/productCardFx.ts', 'matrixGlitchChars');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_MATRIX_COLS');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_MATRIX_LETTERS');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_MATRIX_SPEED');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_GLITCH_SPEED');
mustInclude('src/lib/productCardFx.ts', 'DEFAULT_GLITCH_CHARS');
mustInclude('src/lib/productCardFx.ts', 'mixHexColors');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'product-card__fx');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'MatrixRainCanvas');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'LetterGlitchCanvas');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'product-card__fx-matrix-col');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'is-matrix-dom');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'is-matrix-glitch');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'product-card__fx-sheen');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'product-card__fx-embers');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'product-card__fx-rift');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'is-offscreen');
mustInclude('src/components/ui/MatrixRainCanvas.tsx', 'requestAnimationFrame');
mustInclude('src/components/ui/MatrixRainCanvas.tsx', 'getContext');
mustInclude('src/components/ui/MatrixRainCanvas.tsx', 'active');
mustInclude('src/components/ui/MatrixRainCanvas.tsx', 'Math.sin');
mustInclude('src/components/ui/MatrixRainCanvas.tsx', 'inkAt');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'useMerchMotionCalm');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'fxActive');
mustInclude('src/components/ui/LetterGlitchCanvas.tsx', 'requestAnimationFrame');
mustInclude('src/components/ui/LetterGlitchCanvas.tsx', 'getContext');
mustInclude('src/components/ui/LetterGlitchCanvas.tsx', 'outerVignette');
mustInclude('src/components/ui/LetterGlitchCanvas.tsx', 'centerVignette');
mustInclude('src/components/ui/ProductCard.tsx', 'ProductCardBodyFx');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Card body effect');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'card_fx');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Gradient color');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Shift gradient');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'gradientShift');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Matrix type');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Rain direction');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Rain amount');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Letter amount');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', "'Speed'");
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', '3 — Glitch');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Glitch speed');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Outer vignette');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Center vignette');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'Smooth colors');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixCols');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixLetters');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixSpeed');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixType');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixGlitchSpeed');
mustInclude('src/pages/dashboard/ProductEditorPage.tsx', 'matrixGlitchChars');
mustInclude('src/index.css', 'product-card__fx-matrix-canvas');
mustInclude('src/index.css', 'product-card__fx-glitch');
mustInclude('src/index.css', 'product-card__fx-matrix-col');
mustInclude('src/index.css', 'product-card-fx-matrix');
mustInclude('src/index.css', 'is-matrix-dom');
mustInclude('src/index.css', 'product-card__fx-sheen');
mustInclude('src/index.css', 'product-card__fx-embers');
mustInclude('src/index.css', 'product-card__fx-rift');
mustInclude('src/index.css', 'animation-play-state: paused');
mustInclude('src/index.css', 'is-gradient');
mustInclude('src/index.css', 'product-card-fx-shift');
mustInclude('src/index.css', 'container-type: size');
mustInclude('src/index.css', '-webkit-mask-image');
mustInclude('src/styles/product-editor.css', 'pe-fx-matrix-rain');
mustInclude('src/styles/product-editor.css', 'pe-fx__icon-matrix-stack');
mustInclude('src/index.css', 'perspective(75rem) rotate3d');
mustInclude('src/index.css', 'is-blink-safe');
mustInclude('src/index.css', 'filter: none');
mustInclude('src/index.css', 'product-card-aura');
mustInclude('src/components/ui/ProductCard.tsx', 'product-card__tilt-face product-card-aura');
mustInclude('src/components/ui/ProductCard.tsx', 'is-hover3d');
mustInclude('src/pages/HomePage.tsx', 'home-stagger__aura');
mustInclude('src/components/ui/ProductCardBodyFx.tsx', 'is-shift');

const cssFx = readFileSync(join(root, 'src/index.css'), 'utf8');
// Blink killer: old group that clipped catalog / find-more / ads aura wrappers
assert.doesNotMatch(
  cssFx,
  /\.hero,\s*\n\s*\.ads-banner-aura,\s*\n\s*\.find-more__stage,\s*\n\s*\.catalog-page\s*\{/,
);
assert.match(cssFx, /\.find-more__stage\s*\{[^}]*overflow:\s*visible/);
assert.match(cssFx, /\.catalog-page\s*\{\s*overflow:\s*visible/);
assert.match(cssFx, /\.hover-3d\.is-blink-safe\s*\{[^}]*filter:\s*none/);
// Stock daisyUI aura glow must stay (no mask fork). Opaque card face blocks center band.
assert.doesNotMatch(cssFx, /\.product-card\.is-oos\s*\{\s*opacity:/);
// Aura host is the tilt face, so the glow rides the Hover 3D transform instead of framing it.
assert.match(cssFx, /\.product-card__tilt-face\.product-card-aura\.aura\s*\{/);
// Aura host owns the only stroke: card face stays opaque (covers conic center), border killed.
assert.match(
  cssFx,
  /\.product-card-aura\.aura \.product-card,[\s\S]{0,240}?background-color: var\(--color-base-200\);\s*\n\s*border-color: transparent !important;/,
);
assert.doesNotMatch(
  cssFx,
  /\.product-card-aura\.aura::before,\s*\n\s*\.product-card-aura\.aura::after\s*\{\s*\n\s*content:\s*none/,
);
// Universal CSS reduced-motion nuke killed aura/FX — merch calm is JS + merch_motion_mode.
assert.doesNotMatch(
  cssFx,
  /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{\s*animation-duration:\s*0\.01ms\s*!important/,
);
// Do not hard-kill these via CSS media query; calm path is active={false} / tilt enabled=false.
assert.doesNotMatch(cssFx, /\.pdp-fx__mark,\s*\n\s*\.pdp-fx__game-logo\s*\{\s*\n\s*animation:\s*none/);
assert.doesNotMatch(cssFx, /\.cta-3d-tilt__face\s*\{\s*\n\s*--cta-s:\s*1;\s*\n\s*transform:\s*none\s*!important/);
assert.match(cssFx, /\.ads-blade__track\s*\{\s*\n\s*animation:\s*ads-blade-marquee/);
assert.match(
  readFileSync(join(root, 'src/components/ui/ProductCardBodyFx.tsx'), 'utf8'),
  /useMerchMotionCalm/,
  'card-body FX must honor merch_motion_mode calm',
);

const lib = readFileSync(join(root, 'src/lib/productCardFx.ts'), 'utf8');
assert.doesNotMatch(lib, /id: 'pulse'/);
assert.match(lib, /CardFxStyle = 'none' \| 'matrix' \| 'logo' \| 'scan' \| 'sheen' \| 'embers' \| 'rift'/);
assert.match(lib, /gradient\?: boolean/);
assert.match(lib, /matrixDir\?: CardFxMatrixDir/);
assert.match(lib, /matrixCols\?: number/);
assert.match(lib, /matrixLetters\?: number/);
assert.match(lib, /matrixSpeed\?: number/);
assert.match(lib, /matrixType\?: CardFxMatrixType/);
assert.match(lib, /CardFxMatrixType = 1 \| 2 \| 3/);
assert.match(lib, /matrixGlitchSpeed\?: number/);
assert.match(lib, /color3\?: string/);

const body = readFileSync(join(root, 'src/components/ui/ProductCardBodyFx.tsx'), 'utf8');
assert.match(body, /MatrixRainCanvas/);
assert.match(body, /LetterGlitchCanvas/);
assert.match(body, /matrixType === 2/);
assert.match(body, /matrixType === 3/);

console.log('ok check-product-card-fx');
