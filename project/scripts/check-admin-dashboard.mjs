import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const admin = readFileSync(join(root, 'src/components/dashboard/AdminDashboardHome.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(home, /AdminDashboardHome/);
assert.match(home, /lazy\(\(\) => import\(['"].*AdminDashboardHome['"]\)\)/);
assert.match(home, /if \(role === 'admin'\)/);
assert.match(home, /<AdminDashboardHome \/>/);
assert.match(admin, /admin-home/);
assert.match(admin, /admin-home__stage/);
assert.match(admin, /admin-home__meters/);
assert.match(admin, /admin-home__meter--pending/);
assert.match(admin, /AreaChart/);
assert.match(admin, /dashboard\/analytics/);
assert.match(admin, /--admin-i/);
assert.match(css, /\.admin-home__/);
assert.match(css, /\.admin-home__stage/);
assert.match(css, /@keyframes admin-home-rise/);
assert.match(css, /prefers-reduced-motion: no-preference/);

console.log('admin dashboard OK');
