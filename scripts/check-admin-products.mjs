import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/ProductsPage.tsx'), 'utf8');
const admin = readFileSync(join(root, 'src/pages/dashboard/AdminProductsPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/admin-catalog.css'), 'utf8');

assert.match(page, /AdminProductsPage/);
assert.match(page, /if \(role === 'admin'\) return <AdminProductsPage \/>/);
assert.match(admin, /admin-catalog/);
assert.match(admin, /admin-catalog__meters/);
assert.match(admin, /admin-catalog__mast/);
assert.match(admin, /import\(\s*['"][^'"]*styles\/admin-catalog\.css['"]\s*\)/);
assert.match(admin, /canDeleteProductByAuthor/);
assert.match(admin, /PRODUCT_EDITOR_COLS/);
assert.match(css, /\.admin-catalog__/);
assert.match(css, /\.admin-catalog__meter--warn/);

console.log('admin products OK');
