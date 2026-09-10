import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/UsersPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-owner-surfaces.css'), 'utf8');

assert.match(page, /admin-roster/);
assert.match(page, /admin-roster__mast/);
assert.match(page, /admin-roster__meters/);
assert.match(page, /admin-roster__card/);
assert.match(page, /admin-roster__role-dd/);
assert.match(page, /admin-roster__danger/);
assert.match(page, /Account floor|أرضية الحسابات/);
assert.match(css, /\.admin-roster__/);
assert.match(css, /\.admin-roster__meter/);

console.log('admin users OK');
