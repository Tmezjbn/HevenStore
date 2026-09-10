import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/OrdersPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-owner-surfaces.css'), 'utf8');

assert.match(page, /isOwner/);
assert.match(page, /owner-ledger/);
assert.match(page, /owner-ledger__hero/);
assert.match(page, /owner-ledger__card/);
assert.match(page, /Vault ledger|دفتر الخزنة/);
assert.match(page, /get_order_fulfillment/);
assert.match(page, /cancelOrder|deleteOrder/);
assert.match(page, /SellerOrdersPage/);
assert.doesNotMatch(page, /seller-sales__|owner-tree__/);

assert.match(css, /\.owner-ledger__/);
assert.match(css, /\.owner-ledger__card/);
assert.match(css, /\.owner-ledger__amount/);

console.log('owner orders OK');
