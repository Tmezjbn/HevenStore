/**
 * Pins dashboard product edit URLs to slug (not UUID).
 * Run: node scripts/check-product-edit-slug.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const products = fs.readFileSync('src/pages/dashboard/AdminProductsPage.tsx', 'utf8');
const owner = fs.readFileSync('src/pages/dashboard/OwnerProductsPage.tsx', 'utf8');
const editor = fs.readFileSync('src/pages/dashboard/ProductEditorPage.tsx', 'utf8');
const detail = fs.readFileSync('src/pages/ProductDetailPage.tsx', 'utf8');

assert.match(app, /products\/:productSlug\/edit/);
assert.match(products, /\$\{product\.slug\}\/edit/);
assert.doesNotMatch(products, /\$\{product\.id\}\/edit/);
assert.match(owner, /\$\{product\.slug\}\/edit/);
assert.doesNotMatch(owner, /\$\{product\.id\}\/edit/);
assert.match(detail, /\$\{product\.slug\}\/edit/);
assert.match(editor, /looksLikeUuid/);
assert.match(editor, /\.eq\(looksLikeUuid\(key\) \? 'id' : 'slug', key\)/);

console.log('check-product-edit-slug: ok');
