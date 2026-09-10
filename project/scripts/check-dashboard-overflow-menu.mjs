/**
 * Product/roster action menus must use Popover API (escape main overflow-auto).
 * Run: node scripts/check-dashboard-overflow-menu.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const shared = read('src/components/dashboard/DashboardOverflowMenu.tsx');
assert.match(shared, /popovertarget|popover:\s*['"]auto['"]/);
assert.match(shared, /positionAnchor|anchorName/);

for (const file of [
  'src/pages/dashboard/OwnerProductsPage.tsx',
  'src/pages/dashboard/AdminProductsPage.tsx',
  'src/pages/dashboard/SellerProductsPage.tsx',
]) {
  const src = read(file);
  assert.match(src, /DashboardOverflowMenu/, `${file} must use DashboardOverflowMenu`);
  assert.doesNotMatch(
    src,
    /menuRef/,
    `${file} must not keep absolute menuRef click-outside (popover owns dismiss)`,
  );
}

const ownerCss = read('src/styles/dashboard-owner-surfaces.css');
const adminCss = read('src/styles/admin-catalog.css');
const roleCss = read('src/styles/dashboard-role-surfaces.css');
assert.match(ownerCss, /\.owner-catalog__menu-panel\[popover\]/);
assert.match(adminCss, /\.admin-catalog__menu-panel\[popover\]/);
assert.match(roleCss, /\.seller-listings__menu-panel\[popover\]/);
assert.match(ownerCss, /top:\s*calc\(anchor\(bottom\)/);
assert.match(ownerCss, /inset-inline-end:\s*anchor\(end\)/);
assert.match(shared, /placeFallback|anchor\(bottom\)/);

console.log('check-dashboard-overflow-menu: ok');
