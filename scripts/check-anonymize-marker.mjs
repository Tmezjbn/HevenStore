// Asserts the anonymized_at marker replaced the forgeable full_name='deleted' check.
// Run: node scripts/check-anonymize-marker.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const migName = readdirSync(join(root, 'supabase/migrations'))
  .filter((n) => n.endsWith('_profiles_anonymized_at.sql'))[0];
assert.ok(migName, 'missing *_profiles_anonymized_at.sql migration');
const mig = read(`supabase/migrations/${migName}`);

for (const needle of [
  'ADD COLUMN IF NOT EXISTS anonymized_at',
  "full_name = 'deleted'",
  'anonymized_at = now()',
  'AND anonymized_at IS NULL',
  'NEW.anonymized_at := OLD.anonymized_at',
  'NEW.anonymized_at := null',
]) {
  assert.ok(mig.includes(needle), `migration missing: ${needle}`);
}
// claim fn must not re-wipe anonymized rows (UPDATE filter) but must still
// return every due id so failed deleteUser calls get retried (FROM due).
const claim = mig.slice(
  mig.indexOf('CREATE OR REPLACE FUNCTION public.claim_due_account_deletions'),
  mig.indexOf('CREATE OR REPLACE FUNCTION public.admin_send_notification'),
);
assert.ok(
  claim.includes('AND p.anonymized_at IS NULL'),
  'claim_due_account_deletions must not re-anonymize anonymized_at IS NOT NULL rows',
);
assert.match(
  claim,
  /INTO v_ids FROM due;/,
  'claim_due_account_deletions must return all due ids (deleteUser retries)',
);

// restore_account must refuse anonymized rows.
const restore = mig.slice(
  mig.indexOf('CREATE OR REPLACE FUNCTION public.restore_account'),
  mig.indexOf('CREATE OR REPLACE FUNCTION public.force_member_role_on_insert'),
);
assert.ok(restore.includes('ALREADY_ANONYMIZED'), 'restore_account must refuse anonymized rows');

// Edge fns + staff pickers use the column, not the forgeable name marker.
const hardDelete = read('supabase/functions/hard-delete-user/index.ts');
assert.match(hardDelete, /anonymized_at/);
assert.ok(!hardDelete.includes("full_name !== 'deleted'"), 'hard-delete must not check name marker');

const purge = read('supabase/functions/purge-deleted-accounts/index.ts');
assert.match(purge, /is\('anonymized_at',\s*null\)/, 'purge snapshot must skip anonymized rows');

for (const f of [
  'src/pages/dashboard/UsersPage.tsx',
  'src/pages/dashboard/NotificationsPage.tsx',
]) {
  const src = read(f);
  assert.ok(
    !src.includes(".neq('full_name', 'deleted')") && !src.includes('.neq("full_name", "deleted")'),
    `${f}: name-marker filter remains`,
  );
  assert.match(src, /is\('anonymized_at',\s*null\)/, `${f}: must filter anonymized_at`);
}

console.log('anonymize marker OK');
