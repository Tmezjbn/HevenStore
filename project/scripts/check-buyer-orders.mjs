import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const orders = readFileSync(join(root, 'src/pages/dashboard/OrdersPage.tsx'), 'utf8');
const buyer = readFileSync(join(root, 'src/pages/dashboard/BuyerOrdersPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(orders, /BuyerOrdersPage/);
assert.match(
  orders,
  /role === 'buyer' \|\| role === 'member' \|\| role === 'moderator' \|\| role === 'support'/,
);
assert.match(orders, /import BuyerOrdersPage from '\.\/BuyerOrdersPage'/);
assert.doesNotMatch(buyer, /table table-zebra/);
assert.match(buyer, /buyer-ledger/);
assert.match(buyer, /get_order_fulfillment/);
assert.match(buyer, /cancelOrder/);
assert.match(buyer, /--buyer-i/);
assert.match(buyer, /Your vault/);
assert.match(css, /\.buyer-ledger__/);
assert.match(css, /\.buyer-ledger__hero/);
assert.match(css, /\.buyer-ledger__card/);

console.log('buyer orders OK');
