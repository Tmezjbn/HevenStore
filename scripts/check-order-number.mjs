// Asserts human-readable orders.order_number + orders.public_ref wiring (UUID PK unchanged).
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

// public_ref split: random Crockford-style suffix, unique, frozen post-insert,
// generated server-side (client values overwritten), retryable on collision.
const refMigName = readdirSync(migDir)
  .filter((n) => n.endsWith('_orders_public_ref.sql'))
  .sort()
  .at(-1);
assert.ok(refMigName, 'missing *_orders_public_ref.sql migration');
const refSql = readFileSync(join(migDir, refMigName), 'utf8');
for (const needle of [
  'ADD COLUMN IF NOT EXISTS public_ref',
  'orders_new_public_ref',
  'PUBLIC_REF_LOCKED',
  'orders_public_ref_uidx',
  "'23456789ABCDEFGHJKMNPQRSTVWXYZ'",
  'NEW.public_ref := public.orders_new_public_ref',
  'o.public_ref ILIKE',
  'PUBLIC_REF_EXHAUSTED',
]) {
  assert.ok(refSql.includes(needle), `public_ref migration missing: ${needle}`);
}

const types = readFileSync(join(root, 'src/types/index.ts'), 'utf8');
assert.match(types, /order_number\??:\s*string/);
assert.match(types, /public_ref\??:\s*string/);

// Member-facing pages must never select/order/search by the sequential
// order_number — public_ref only (order_number leaks total order count).
const success = readFileSync(join(root, 'src/pages/CheckoutSuccessPage.tsx'), 'utf8');
assert.match(success, /select\('status,\s*public_ref'\)/);
assert.ok(!success.includes('order_number'), 'success page must not select order_number');

const buyer = readFileSync(join(root, 'src/pages/dashboard/BuyerOrdersPage.tsx'), 'utf8');
assert.match(buyer, /public_ref/);
assert.match(buyer, /ilike\('public_ref'/);
assert.ok(!buyer.includes('order_number'), 'buyer orders page must not touch order_number');
assert.ok(
  !/\.select\(\s*['"`]\*/.test(buyer),
  'buyer orders list must not select * (pulls order_number + internal cols)',
);

const buyerHome = readFileSync(join(root, 'src/components/dashboard/BuyerDashboardHome.tsx'), 'utf8');
assert.match(buyerHome, /public_ref/);
assert.ok(!buyerHome.includes('order_number'), 'buyer home must not select order_number');

const support = readFileSync(join(root, 'src/pages/dashboard/SupportPage.tsx'), 'utf8');
assert.match(support, /select\('public_ref'\)/);
assert.ok(!support.includes('order_number'), 'support ticket subject lookup must use public_ref');

// Staff pages keep order_number AND surface public_ref; search matches either.
const orders = readFileSync(join(root, 'src/pages/dashboard/OrdersPage.tsx'), 'utf8');
assert.match(orders, /order_number/);
assert.match(orders, /public_ref\.ilike/);
assert.match(orders, /publicRef=\{order\.public_ref\}/);

const seller = readFileSync(join(root, 'src/pages/dashboard/SellerOrdersPage.tsx'), 'utf8');
assert.match(seller, /order_number/);
assert.match(seller, /public_ref/);

const seeds = readFileSync(join(root, 'src/lib/changelogs.ts'), 'utf8');
assert.match(seeds, /Readable order numbers for shoppers and staff/);

console.log('order number OK');
