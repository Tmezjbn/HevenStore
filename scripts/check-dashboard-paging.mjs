/**
 * Dashboard list pages must page via .range() — no unbounded select('*').
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function src(file) {
  return readFileSync(join(root, file), 'utf8');
}

for (const file of [
  'src/pages/dashboard/UsersPage.tsx',
  'src/pages/dashboard/AdminProductsPage.tsx',
  'src/pages/dashboard/OwnerProductsPage.tsx',
  'src/pages/dashboard/OrdersPage.tsx',
]) {
  const body = src(file);
  assert.ok(body.includes('pageRange') || body.includes('.range('), `${file} must use .range / pageRange`);
  assert.ok(body.includes('PageBar'), `${file} must render PageBar`);
  assert.ok(body.includes("count: 'exact'"), `${file} must request exact count`);
}

assert.ok(src('src/lib/dashboardPage.ts').includes('DASHBOARD_PAGE_SIZE'));
assert.ok(src('src/components/dashboard/PageBar.tsx').includes('join-item'));

console.log('check-dashboard-paging: ok');
