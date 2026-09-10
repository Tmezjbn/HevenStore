/**
 * Pins admin user disable / schedule-delete / hard-delete history.
 * Run: node scripts/check-admin-user-access.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714210000_admin_user_access.sql'),
  'utf8',
);
const page = readFileSync(join(root, 'src', 'pages', 'dashboard', 'UsersPage.tsx'), 'utf8');
const auth = readFileSync(join(root, 'src', 'stores', 'authStore.ts'), 'utf8');

for (const needle of [
  'disabled_until',
  'admin_disable_user',
  'admin_enable_user',
  'admin_schedule_user_deletion',
  'clear_expired_user_disable',
  'CANNOT_DISABLE_OWNER',
  'CANNOT_DELETE_OWNER',
]) {
  assert.ok(mig.includes(needle), `migration missing: ${needle}`);
}

assert.ok(page.includes('admin_disable_user'), 'UsersPage must call admin_disable_user');
assert.ok(page.includes('admin_schedule_user_deletion'), 'UsersPage must call admin_schedule_user_deletion');
assert.ok(page.includes('danger'), 'UsersPage needs a danger zone');
assert.ok(auth.includes('clear_expired_user_disable'), 'authStore must clear expired disables');

const delPage = readFileSync(
  join(root, 'src', 'pages', 'dashboard', 'DeletionRequestsPage.tsx'),
  'utf8',
);
const hardFn = readFileSync(
  join(root, 'supabase', 'functions', 'hard-delete-user', 'index.ts'),
  'utf8',
);
assert.ok(hardFn.includes('deleteUser'), 'hard-delete-user must call auth.admin.deleteUser');
assert.ok(hardFn.includes("caller?.role !== 'owner'"), 'hard-delete-user must require owner');
assert.ok(hardFn.includes('archiveDeletedUser'), 'hard-delete-user must archive before delete');
assert.ok(delPage.includes("functions.invoke('hard-delete-user'"), 'DeletionRequestsPage must invoke hard-delete-user');
assert.ok(delPage.includes('Delete now') || delPage.includes('حذف الآن'), 'Delete now button missing');
assert.ok(delPage.includes('account_deletion_history'), 'DeletionRequestsPage must load deletion history');

const histMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714230000_account_deletion_history.sql'),
  'utf8',
);
assert.ok(histMig.includes('account_deletion_history'), 'history migration missing table');
assert.ok(histMig.includes("current_user_role() = 'owner'"), 'history SELECT must be owner-only');

const archive = readFileSync(
  join(root, 'supabase', 'functions', '_shared', 'archiveDeletedUser.ts'),
  'utf8',
);
assert.ok(archive.includes('orders_snapshot'), 'archive must store orders');
assert.ok(archive.includes('profile_snapshot'), 'archive must store profile');
assert.ok(archive.includes('product_type'), 'archive must capture product_type');
assert.ok(archive.includes('product_keys'), 'archive must capture claimed keys');
assert.ok(archive.includes('product_secrets'), 'archive must capture product secrets');
assert.ok(delPage.includes('fulfillmentDisplay') || delPage.includes('Fulfillment'), 'history UI must show fulfillment');

console.log('check-admin-user-access: ok');
