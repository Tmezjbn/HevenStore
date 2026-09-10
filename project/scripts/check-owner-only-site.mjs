import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260720134000_owner_only_site_and_roles.sql'),
  'utf8',
);
const users = readFileSync(join(root, 'src/pages/dashboard/UsersPage.tsx'), 'utf8');

for (const href of [
  "/dashboard/categories",
  "/dashboard/themes",
  "/dashboard/builder",
  "/dashboard/settings",
]) {
  const line = layout.split('\n').find((l) => l.includes(`href: '${href}'`));
  assert.ok(line, `missing link ${href}`);
  assert.match(line, /roles:\s*\['owner'\]/, `${href} must be owner-only`);
}

assert.match(mig, /caller_role <> 'owner'/);
assert.match(mig, /categories_insert_owner/);
assert.match(mig, /themes_insert_owner/);
assert.match(mig, /site_settings_insert_owner/);
assert.match(users, /isOwner \? \(/);
assert.match(users, /\{isOwner \? \(/);

console.log('owner-only site + roles OK');
