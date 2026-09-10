import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = readFileSync(join(root, 'src/pages/dashboard/DashboardHomePage.tsx'), 'utf8');
const mod = readFileSync(join(root, 'src/components/dashboard/ModeratorDashboardHome.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-role-surfaces.css'), 'utf8');

assert.match(home, /ModeratorDashboardHome/);
assert.match(home, /lazy\(\(\) => import\(['"].*ModeratorDashboardHome['"]\)\)/);
assert.match(home, /if \(role === 'moderator'\)/);
assert.match(home, /<ModeratorDashboardHome \/>/);
assert.doesNotMatch(mod, /\/dashboard\/analytics/);
assert.doesNotMatch(mod, /recharts|AreaChart/);
assert.doesNotMatch(mod, /dashboard\/products/);
assert.match(mod, /dashboard\/support/);
assert.match(css, /\.mod-home__/);

console.log('moderator dashboard OK');
