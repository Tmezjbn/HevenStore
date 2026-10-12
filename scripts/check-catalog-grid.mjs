/** Catalog grid + ProductCard commerce hierarchy stay wired. */
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
const page = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');
assert.match(page, /className="catalog-grid"/);
assert.doesNotMatch(page, /xl:grid-cols-5/);

const card = readFileSync(join(root, 'src/components/ui/ProductCard.tsx'), 'utf8');
assert.match(card, /product-card__title/);
assert.match(card, /product-card-cta--oos/);
assert.match(card, /ProductCardBodyFx/);
assert.doesNotMatch(card, /btn btn-primary btn-sm btn-outline product-card-cta/);

const css = readIndexCss();
assert.match(css, /\.catalog-grid\s*\{/);
assert.match(css, /\.product-card-cta\s*\{/);

console.log('check-catalog-grid: ok');
