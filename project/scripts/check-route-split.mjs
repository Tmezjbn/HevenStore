/** PERF-1/2: storefront route split + role-gated dashboard homes (no eager recharts). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const dashHome = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const fx = readFileSync(join(root, 'src/components/ui/ProductCardBodyFx.tsx'), 'utf8');

assert.match(app, /import HomePage from/);
assert.match(app, /import GamesPage from/);
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/CartPage'\)\)/);
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/ProductDetailPage'\)\)/);
assert.match(app, /lazy\(\(\) => import\('\.\/pages\/AboutPage'\)\)/);
assert.doesNotMatch(app, /^import CartPage from/m);
assert.doesNotMatch(app, /^import ProductDetailPage from/m);

assert.match(dashHome, /lazy\(\(\) => import\(['"].*OwnerDashboardHome['"]\)\)/);
assert.match(dashHome, /lazy\(\(\) => import\(['"].*BuyerDashboardHome['"]\)\)/);
assert.doesNotMatch(dashHome, /^import OwnerDashboardHome from/m);

assert.match(fx, /IntersectionObserver/);
assert.match(fx, /inView/);
assert.match(fx, /is-offscreen/);

console.log('route split + fx in-view OK');
