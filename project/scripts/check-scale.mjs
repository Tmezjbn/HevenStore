/**
 * Phase 12 scale/dedupe invariants — checkout index, shared money/status, id-list parser.
 * Run: node scripts/check-scale.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const mig = read('supabase/migrations/20260720210000_orders_polar_checkout_idx.sql');
assert.match(mig, /idx_orders_polar_checkout/, 'migration must create polar_checkout_id index');
assert.match(mig, /polar_checkout_id/, 'index must target polar_checkout_id');

assert.ok(fs.existsSync(path.join(root, 'src/lib/formatMoney.ts')), 'formatMoney helper missing');
assert.ok(fs.existsSync(path.join(root, 'src/lib/orderStatus.ts')), 'orderStatus helper missing');
assert.match(read('src/lib/orderStatus.ts'), /ORDER_STATUS_LABEL/, 'ORDER_STATUS_LABEL export missing');
assert.match(read('src/lib/formatMoney.ts'), /export function formatMoney/, 'formatMoney export missing');

const settings = read('src/lib/siteSettings.ts');
assert.match(settings, /export function parseStringIdList/, 'parseStringIdList missing');
assert.match(settings, /parseStringIdList\(raw, HOME_ADS_MAX\)/, 'home ads ids must use parseStringIdList');
assert.match(settings, /parseStringIdList\(raw, FEATURED_PRODUCTS_MAX\)/, 'featured ids must use parseStringIdList');
assert.match(settings, /parseStringIdList\(raw, PRODUCT_FIND_MORE_MAX\)/, 'find-more ids must use parseStringIdList');

const dashFiles = [
  'src/pages/dashboard/OrdersPage.tsx',
  'src/pages/dashboard/BuyerOrdersPage.tsx',
  'src/components/dashboard/BuyerDashboardHome.tsx',
  'src/components/dashboard/AdminDashboardHome.tsx',
  'src/components/dashboard/OwnerDashboardHome.tsx',
  'src/pages/dashboard/AdminProductsPage.tsx',
  'src/pages/dashboard/OwnerProductsPage.tsx',
  'src/pages/dashboard/SellerProductsPage.tsx',
  'src/pages/dashboard/SellerOrdersPage.tsx',
  'src/components/dashboard/SellerDashboardHome.tsx',
  'src/pages/dashboard/DeletionRequestsPage.tsx',
];
for (const f of dashFiles) {
  const src = read(f);
  assert.match(src, /from ['"].*formatMoney['"]/, `${f} must import formatMoney`);
  assert.doesNotMatch(src, /function formatMoney\s*\(/, `${f} must not redeclare formatMoney`);
}
for (const f of [
  'src/pages/dashboard/OrdersPage.tsx',
  'src/pages/dashboard/BuyerOrdersPage.tsx',
  'src/components/dashboard/BuyerDashboardHome.tsx',
  'src/components/dashboard/AdminDashboardHome.tsx',
  'src/components/dashboard/OwnerDashboardHome.tsx',
]) {
  assert.match(read(f), /ORDER_STATUS_LABEL/, `${f} must import ORDER_STATUS_LABEL`);
  assert.doesNotMatch(
    read(f),
    /const STATUS_LABEL:\s*Record/,
    `${f} must not redeclare STATUS_LABEL map`,
  );
}

console.log('check-scale: ok');
