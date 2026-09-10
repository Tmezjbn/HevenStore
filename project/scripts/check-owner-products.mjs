import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/ProductsPage.tsx'), 'utf8');
const owner = readFileSync(join(root, 'src/pages/dashboard/OwnerProductsPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-owner-surfaces.css'), 'utf8');

assert.match(page, /OwnerProductsPage/);
assert.match(page, /if \(role === 'owner'\) return <OwnerProductsPage \/>/);
assert.match(page, /SellerProductsPage/);

assert.match(owner, /owner-catalog/);
assert.match(owner, /toggleFeatured|is_featured/);
assert.match(owner, /canDeleteProductByAuthor/);
assert.match(owner, /ConfirmDialog/);
assert.match(owner, /Vault catalog|خزنة الكتالوج/);
assert.match(owner, /owner-catalog__stockfoot/);
assert.match(owner, /refreshStockPulse|stockPulse/);
assert.doesNotMatch(owner, /seller-listings|mod-home/);
assert.doesNotMatch(owner, /owner-catalog__add/);

assert.match(css, /\.owner-catalog__/);
assert.match(css, /\.owner-catalog__row/);
assert.match(css, /\.owner-catalog__stockfoot/);

console.log('owner products OK');
