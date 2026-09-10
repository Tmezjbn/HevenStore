import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
const orders = readFileSync(join(root, 'src/pages/dashboard/OrdersPage.tsx'), 'utf8');
const seller = readFileSync(join(root, 'src/pages/dashboard/SellerOrdersPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');
const migration = readFileSync(
  join(root, 'supabase/migrations/20260720150000_seller_orders_select.sql'),
  'utf8',
);
const listMig = readFileSync(
  join(root, 'supabase/migrations/20260720154000_list_seller_sales.sql'),
  'utf8',
);
const fulMig = readFileSync(
  join(root, 'supabase/migrations/20260720151000_seller_order_fulfillment.sql'),
  'utf8',
);

assert.match(
  layout,
  /labelEn: 'Orders', href: '\/dashboard\/orders', roles: \['owner', 'admin'\]/,
);
assert.match(
  layout,
  /labelEn: 'My sales', href: '\/dashboard\/orders', roles: \['seller'\]/,
);
assert.match(
  layout,
  /labelEn: 'My Orders', href: '\/dashboard\/orders', roles: \['buyer', 'member', 'moderator', 'support'\]/,
);

assert.match(orders, /if \(role === 'seller'\) return <SellerOrdersPage \/>/);
assert.doesNotMatch(orders, /isSellerSales/);
assert.doesNotMatch(orders, /order_items!inner/);

assert.match(seller, /list_seller_sales/);
assert.match(seller, /count_seller_sales/);
assert.match(seller, /get_order_fulfillment/);
assert.match(seller, /seller-sales/);
assert.match(css, /\.seller-sales__fulfill/);

assert.match(migration, /p\.seller_id = auth\.uid\(\)/);
assert.match(listMig, /CREATE OR REPLACE FUNCTION public\.list_seller_sales/);
assert.match(listMig, /CREATE OR REPLACE FUNCTION public\.count_seller_sales/);
assert.match(fulMig, /seller_only/);
assert.match(fulMig, /caller_role = 'seller'/);

const rlsFix = readFileSync(
  join(root, 'supabase/migrations/20260720191000_fix_orders_rls_recursion.sql'),
  'utf8',
);
assert.match(rlsFix, /order_is_visible_to_caller/);
assert.match(rlsFix, /order_item_is_visible_to_caller/);
assert.match(rlsFix, /SECURITY DEFINER/);
assert.match(rlsFix, /USING \(public\.order_is_visible_to_caller\(id, user_id\)\)/);
assert.match(rlsFix, /USING \(public\.order_item_is_visible_to_caller\(order_id, product_id\)\)/);

console.log('seller orders OK');
