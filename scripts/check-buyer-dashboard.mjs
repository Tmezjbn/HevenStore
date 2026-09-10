import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const buyer = readFileSync(join(root, 'src/components/dashboard/BuyerDashboardHome.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(home, /BuyerDashboardHome/);
assert.match(home, /lazy\(\(\) => import\(['"].*BuyerDashboardHome['"]\)\)/);
assert.match(home, /<BuyerDashboardHome \/>/);
assert.doesNotMatch(home, /Welcome back,/);

assert.match(buyer, /buyer-home/);
assert.match(buyer, /buyer-home__vault/);
assert.match(buyer, /buyer-home__tickets/);
assert.match(buyer, /buyer-home__pulse/);
assert.match(buyer, /--buyer-i/);
assert.match(buyer, /Personal vault/);
assert.doesNotMatch(buyer, /table table-sm/);

assert.match(css, /\.buyer-home__/);
assert.match(css, /\.buyer-home__vault/);
assert.match(css, /@keyframes buyer-home-rise/);
assert.match(css, /prefers-reduced-motion: no-preference/);

console.log('buyer dashboard OK');
