import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const owner = readFileSync(join(root, 'src/components/dashboard/OwnerDashboardHome.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(home, /OwnerDashboardHome/);
assert.match(home, /lazy\(\(\) => import\(['"].*OwnerDashboardHome['"]\)\)/);
assert.match(home, /if \(role === 'owner'\)/);
assert.match(home, /<OwnerDashboardHome \/>/);

assert.match(owner, /owner-home/);
assert.match(owner, /StatsResetControl/);
assert.match(owner, /dashboard\/analytics/);
assert.match(owner, /dashboard\/users/);
assert.match(owner, /AreaChart/);
assert.match(owner, /dashboard_stats_reset_at/);
assert.doesNotMatch(owner, /mod-home|seller-home/);

assert.match(css, /\.owner-home__/);
assert.match(css, /\.owner-home__command/);
assert.match(css, /\.owner-home__dock/);

console.log('owner dashboard OK');
