import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ctrl = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/components/dashboard/StatsResetControl.tsx'),
  'utf8',
);
assert.match(ctrl, /profile\?\.role === 'owner'/);
assert.doesNotMatch(ctrl, /role === 'admin'/);

/** Mirror of parseDashboardStatsResetAt / dashboardStatsSinceIso (no supabase import). */
function parseDashboardStatsResetAt(raw) {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function dashboardStatsSinceIso(resetAt, floorIso) {
  const reset = parseDashboardStatsResetAt(resetAt ?? '');
  const floor = floorIso?.trim() ? parseDashboardStatsResetAt(floorIso) : null;
  if (reset && floor) return reset > floor ? reset : floor;
  return reset ?? floor;
}

assert.equal(parseDashboardStatsResetAt(''), null);
assert.equal(parseDashboardStatsResetAt('nope'), null);

const a = '2026-07-01T00:00:00.000Z';
const b = '2026-07-10T00:00:00.000Z';
assert.equal(parseDashboardStatsResetAt(a), a);
assert.equal(dashboardStatsSinceIso(null, a), a);
assert.equal(dashboardStatsSinceIso(b, a), b);
assert.equal(dashboardStatsSinceIso(a, b), b);
assert.equal(dashboardStatsSinceIso(null, null), null);

console.log('dashboard stats reset helper OK');
