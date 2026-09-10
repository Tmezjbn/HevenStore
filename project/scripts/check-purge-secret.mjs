// Fail if a live purge cron secret is committed (OPS-7).
// Placeholder `<PURGE_CRON_SECRET>` is required; literals like heven_purge_ are banned.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const cronPath = join(root, 'supabase', 'cron', 'purge_due_account_deletions.sql');
const sql = readFileSync(cronPath, 'utf8');

assert.ok(
  sql.includes("'x-purge-secret', '<PURGE_CRON_SECRET>'"),
  'cron SQL must use <PURGE_CRON_SECRET> placeholder (paste live value only in SQL editor)',
);
assert.ok(!/heven_purge_/i.test(sql), 'live heven_purge_ secret must not appear in cron SQL');
assert.ok(
  !/'x-purge-secret',\s*'[^'<][^']{8,}'/.test(sql),
  'x-purge-secret must not be a committed literal',
);

console.log('purge cron secret placeholder OK');
