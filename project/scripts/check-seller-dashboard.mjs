import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const seller = readFileSync(join(root, 'src/components/dashboard/SellerDashboardHome.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(home, /SellerDashboardHome/);
assert.match(home, /lazy\(\(\) => import\(['"].*SellerDashboardHome['"]\)\)/);
assert.match(home, /if \(role === 'seller'\)/);
assert.match(home, /<SellerDashboardHome \/>/);
assert.match(home, /OwnerDashboardHome|AdminDashboardHome/);
assert.doesNotMatch(seller, /\/dashboard\/analytics/);
assert.doesNotMatch(seller, /recharts|AreaChart/);
assert.doesNotMatch(seller, /mod-home/);
assert.match(seller, /seller_id/);
assert.match(seller, /\/seller\//);
assert.match(seller, /dashboard\/products/);
assert.match(seller, /dashboard\/orders/);
assert.match(seller, /count_seller_sales/);
assert.match(seller, /seller-home__tile--revenue/);
assert.doesNotMatch(seller, /seller-home__tile--add/);
assert.match(css, /\.seller-home__/);
assert.match(css, /\.seller-home__tile--revenue/);

console.log('seller dashboard OK');
