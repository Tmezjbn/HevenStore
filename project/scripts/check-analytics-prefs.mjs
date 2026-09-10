/** Guest analytics prefs visibility + helper revoke migration. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nav = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
assert.match(nav, /showAnalyticsPrefs/);
assert.match(nav, /consent === 'declined'/);
assert.match(nav, /Helper badge/);
assert.match(nav, /guestAnalyticsHold/);

const consent = readFileSync(join(root, 'src/lib/analyticsConsent.ts'), 'utf8');
assert.match(
  consent,
  /getAnalyticsConsent\(\) === 'accepted'/,
  'analytics must be opt-in only (banner off ≠ auto-track)',
);
assert.doesNotMatch(
  consent,
  /return !bannerRequired/,
  'must not auto-track when privacy banner disabled',
);

const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');
assert.match(
  builder,
  /analytics stay off until the visitor accepts/,
  'Website Builder must document opt-in when banner off',
);

const sql = readFileSync(
  join(root, 'supabase/migrations/20260712210000_revoke_helper_on_analytics_decline.sql'),
  'utf8',
);
assert.match(sql, /DELETE FROM public\.user_badges/);
assert.match(sql, /slug = 'helper'/);
assert.match(sql, /OLD\.analytics_consent = 'accepted'/);

const analyticsPage = readFileSync(join(root, 'src/pages/dashboard/AnalyticsPage.tsx'), 'utf8');
assert.ok(!analyticsPage.includes('#2dd4bf'), 'Analytics chart must not hardcode teal');
assert.ok(analyticsPage.includes('var(--color-primary)'), 'Analytics chart must use theme primary');
assert.ok(analyticsPage.includes('Daily visitors'), 'Analytics chart needs a visible series legend');
assert.ok(analyticsPage.includes('MetricTile'), 'Analytics overview uses visual metric tiles');
assert.ok(analyticsPage.includes('max-w-7xl'), 'Analytics page uses dashboard-wide canvas');
assert.ok(analyticsPage.includes('Intl.DisplayNames'), 'Analytics maps country codes to full names');
assert.ok(analyticsPage.includes('DevicePlatformList'), 'Devices nest OS platforms under device type');
assert.ok(
  readFileSync(join(root, 'supabase/functions/databuddy-analytics/index.ts'), 'utf8').includes("'os_name'"),
  'databuddy-analytics must query os_name',
);

console.log('check-analytics-prefs: ok');
