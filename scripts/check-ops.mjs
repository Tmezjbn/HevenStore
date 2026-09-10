/**
 * Phase 11 ops invariants — runbook present, alert tags, crash beacon dedupe.
 * Run: node scripts/check-ops.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

assert.ok(fs.existsSync(path.join(root, 'OPS.md')), 'OPS.md missing');
const ops = read('OPS.md');
assert.match(ops, /Point-in-Time Recovery|PITR/i, 'OPS.md must cover PITR/backup');
assert.match(ops, /Uptime|uptime/, 'OPS.md must cover uptime checks');
assert.match(ops, /CLIENT_ERROR/, 'OPS.md must list CLIENT_ERROR alert tag');
assert.match(ops, /ORPHAN_PAID_RECEIPT/, 'OPS.md must list ORPHAN_PAID_RECEIPT');
assert.match(ops, /ALERT_TERMINAL_FINALIZE/, 'OPS.md must list ALERT_TERMINAL_FINALIZE');
assert.match(ops, /Polar/, 'OPS.md must mention Polar webhook alerts');

assert.match(read('README.md'), /OPS\.md/, 'README must link OPS.md');

const webhook = read('supabase/functions/polar-webhook/index.ts');
assert.match(webhook, /ORPHAN_PAID_RECEIPT/, 'polar-webhook must log ORPHAN_PAID_RECEIPT');
assert.match(webhook, /ALERT_TERMINAL_FINALIZE/, 'polar-webhook must log ALERT_TERMINAL_FINALIZE');

const report = read('src/lib/reportError.ts');
assert.match(report, /shouldBeacon|BEACON_DEDUP/, 'reportError must dedupe staff beacons');
assert.match(report, /beaconStaffError/, 'staff beacon must remain');

assert.match(
  read('.env.example'),
  /PURGE_CRON_SECRET/,
  '.env.example must document PURGE_CRON_SECRET (server-only)',
);

console.log('check-ops: ok');
