/** Mirrors src/lib/productOos.ts stock tone. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const LOW_STOCK_THRESHOLD = 5;
function productStockTone(stock) {
  if (stock <= 0) return 'oos';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

assert.equal(productStockTone(0), 'oos');
assert.equal(productStockTone(-1), 'oos');
assert.equal(productStockTone(1), 'low');
assert.equal(productStockTone(5), 'low');
assert.equal(productStockTone(6), 'ok');

const lib = readFileSync(join(root, 'src/lib/productOos.ts'), 'utf8');
assert.match(lib, /productStockTone/);
assert.match(lib, /LOW_STOCK_THRESHOLD = 5/);

const card = readFileSync(join(root, 'src/components/ui/ProductCard.tsx'), 'utf8');
assert.match(card, /product-card__stock/);
assert.match(card, /productStockTone/);
assert.match(card, /stockTone === 'low'/);
assert.match(card, /product-card-cta--oos/);
assert.match(card, /is-oos/);
assert.match(card, /t\('يتبقى', 'Only'\)/);
assert.match(card, /t\('فقط', 'left'\)/);

// UX-2: PDP shows the same low-stock phrase cards use.
const pdp = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.match(pdp, /productStockTone/);
assert.match(pdp, /stockTone === 'low'/);
assert.match(pdp, /t\('يتبقى', 'Only'\)/);
assert.match(pdp, /t\('فقط', 'left'\)/);

const productsPage = readFileSync(join(root, 'src/pages/dashboard/AdminProductsPage.tsx'), 'utf8');
assert.match(productsPage, /productListTitle/);
assert.match(productsPage, /listFilter/);
assert.match(productsPage, /DashboardOverflowMenu/);
assert.match(productsPage, /Hide this product from the store/);
assert.match(productsPage, /openEdit/);
assert.match(productsPage, /state: \{ product \}/);
assert.match(productsPage, /\/dashboard\/products\/new/);

const editorPage = readFileSync(join(root, 'src/pages/dashboard/ProductEditorPage.tsx'), 'utf8');
assert.match(editorPage, /pe-panel/);
assert.match(editorPage, /floatActions/);
assert.match(editorPage, /editorSnapshot/);
assert.match(editorPage, /topSentinelRef/);
assert.match(editorPage, /warmProduct/);
assert.match(editorPage, /product-editor-enter/);

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /Opening editor/);
assert.match(editorPage, /Delivery content/);
assert.match(editorPage, /Site default/);

console.log('check-product-stock: ok');
