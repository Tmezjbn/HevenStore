import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/ProductsPage.tsx'), 'utf8');
const seller = readFileSync(join(root, 'src/pages/dashboard/SellerProductsPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');

assert.match(page, /SellerProductsPage/);
assert.match(page, /role === 'seller'/);
assert.match(seller, /seller-listings/);
assert.match(seller, /seller_id/);
assert.doesNotMatch(seller, /<table/);
assert.match(css, /\.seller-listings__/);
assert.match(
  layout,
  /labelEn: 'My listings', href: '\/dashboard\/products', roles: \['seller'\]/,
);

console.log('seller products OK');
