import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/UsersPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-owner-surfaces.css'), 'utf8');

assert.match(page, /isOwner/);
assert.match(page, /owner-roster/);
assert.match(page, /owner-roster__hero/);
assert.match(page, /owner-roster__card/);
assert.match(page, /owner-roster__role-dd/);
assert.match(page, /dropdown dropdown-end/);
assert.match(page, /dropdown-content/);
assert.match(page, /popovertarget|popover:\s*['"]auto['"]/);
assert.match(page, /owner-roster__role-opt--/);
assert.match(page, /owner-roster__role-swatch/);
assert.match(page, /owner-roster__danger/);
assert.doesNotMatch(page, /owner-roster__role-select/);
assert.doesNotMatch(
  page,
  /owner-roster__role-dd[\s\S]{0,80}<details/,
  'role menu must use popover (not details) to escape overflow clip',
);
assert.match(page, /Account roster|سجل الحسابات/);
assert.match(page, /set_user_role/);
assert.match(page, /roleSelect/);
assert.match(page, /Change Role/);
assert.doesNotMatch(page, /seller-home__|owner-catalog__/);

assert.match(css, /\.owner-roster__/);
assert.match(css, /\.owner-roster__card/);
assert.match(css, /\.owner-roster__danger/);

console.log('owner users OK');
