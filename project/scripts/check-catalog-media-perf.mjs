/** PERF-10 card cols + PERF-15 srcset wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = readFileSync(join(root, 'src/hooks/useCatalog.ts'), 'utf8');
const media = readFileSync(join(root, 'src/lib/mediaUrl.ts'), 'utf8');
const productMedia = readFileSync(join(root, 'src/components/ui/ProductMedia.tsx'), 'utf8');
const store = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');

assert.match(catalog, /export const PRODUCT_CARD_COLS/);
assert.match(catalog, /PRODUCT_CARD_COLS/);
assert.match(catalog, /fetchActiveProductsPaged[\s\S]*PRODUCT_CARD_COLS/);
assert.match(catalog, /useProductsByIds[\s\S]*PRODUCT_LIST_COLS/);
assert.match(catalog, /ad_banner_url/);
assert.doesNotMatch(
  catalog.split('export const PRODUCT_CARD_COLS')[1].split('export const PRODUCT_LIST_COLS')[0],
  /description_ar|ad_banner_url|hero_backdrop_url/,
);

assert.match(media, /function storageImageSrcSet/);
assert.match(media, /function imageTransformsEnabled/);
assert.match(productMedia, /storageImageSrcSet/);
assert.match(productMedia, /srcSet=/);
assert.match(productMedia, /height=\{height\}/);

// Catalog search must not require description cols (card fetch omits them).
assert.doesNotMatch(store, /p\.description/);

console.log('catalog card cols + srcset OK');
