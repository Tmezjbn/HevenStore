/** Catalog grid + ProductCard commerce hierarchy stay wired. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');
assert.match(page, /className="catalog-grid"/);
assert.doesNotMatch(page, /xl:grid-cols-5/);

const card = readFileSync(join(root, 'src/components/ui/ProductCard.tsx'), 'utf8');
assert.match(card, /product-card__title/);
assert.match(card, /product-card-cta--oos/);
assert.match(card, /ProductCardBodyFx/);
assert.doesNotMatch(card, /btn btn-primary btn-sm btn-outline product-card-cta/);

const css = readFileSync(join(root, 'src/index.css'), 'utf8');
assert.match(css, /\.catalog-grid\s*\{/);
assert.match(css, /\.product-card-cta\s*\{/);

console.log('check-catalog-grid: ok');
