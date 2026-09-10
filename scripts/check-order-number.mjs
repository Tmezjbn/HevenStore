// Asserts human-readable orders.order_number wiring (UUID PK unchanged).
// Run: node scripts/check-order-number.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase/migrations');
const mig = readdirSync(migDir)
  .filter((n) => n.endsWith('_orders_order_number.sql'))
  .sort()
  .at(-1);
assert.ok(mig, 'missing *_orders_order_number.sql migration');
const sql = readFileSync(join(migDir, mig), 'utf8');

for (const needle of [
  'orders_order_number_seq',
  'ADD COLUMN IF NOT EXISTS order_number',
  'orders_assign_order_number',
  'ORD-',
  'ORDER_NUMBER_LOCKED',
  'orders_order_number_uidx',
  'list_seller_sales',
  'o.order_number ILIKE',
  'Readable order numbers for shoppers and staff',
]) {
  assert.ok(sql.includes(needle), `migration missing: ${needle}`);
}
assert.ok(!/ALTER TABLE public\.orders[\s\S]{0,80}DROP COLUMN id/.test(sql), 'must not drop orders.id');
assert.ok(sql.includes('BEFORE INSERT ON public.orders'), 'trigger must fire on insert');

const types = readFileSync(join(root, 'src/types/index.ts'), 'utf8');
assert.match(types, /order_number\??:\s*string/);

const success = readFileSync(join(root, 'src/pages/CheckoutSuccessPage.tsx'), 'utf8');
assert.match(success, /order_number/);
assert.match(success, /select\('status,\s*order_number'\)/);

const orders = readFileSync(join(root, 'src/pages/dashboard/OrdersPage.tsx'), 'utf8');
assert.match(orders, /order_number/);
assert.match(orders, /ilike\('order_number'/);

const buyer = readFileSync(join(root, 'src/pages/dashboard/BuyerOrdersPage.tsx'), 'utf8');
assert.match(buyer, /order_number/);

const seller = readFileSync(join(root, 'src/pages/dashboard/SellerOrdersPage.tsx'), 'utf8');
assert.match(seller, /order_number/);

const seeds = readFileSync(join(root, 'src/lib/changelogs.ts'), 'utf8');
assert.match(seeds, /Readable order numbers for shoppers and staff/);

console.log('order number OK');
