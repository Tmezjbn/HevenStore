import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/CategoriesPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/styles/dashboard-owner-surfaces.css'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');

assert.match(layout, /\/dashboard\/categories[\s\S]*roles:\s*\[['"]owner['"]\]/);
assert.match(page, /owner-tree/);
assert.match(page, /owner-tree__hero/);
assert.match(page, /owner-tree__rail/);
assert.match(page, /owner-tree__pane/);
assert.match(page, /owner-tree__sort-dd/);
assert.match(page, /dropdown dropdown-end/);
assert.doesNotMatch(page, /owner-tree__sort>\s*<select|owner-tree__sort"\s*>\s*<select/);
assert.match(page, /Vault taxonomy|تصنيف الخزنة/);
assert.match(page, /buildCategoryForest/);
assert.match(page, /ConfirmDialog/);
assert.match(page, /aura_dual/);
assert.doesNotMatch(page, /seller-home__|owner-roster__/);

assert.match(css, /\.owner-tree__/);
assert.match(css, /\.owner-tree__node/);
assert.match(css, /\.owner-tree__level--1/);

console.log('owner categories OK');
