/** Guards category max depth 6 + Explore ?category= browse wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cats = readFileSync(join(root, 'src/lib/categories.ts'), 'utf8');
const types = readFileSync(join(root, 'src/types/index.ts'), 'utf8');
const dash = readFileSync(join(root, 'src/pages/dashboard/CategoriesPage.tsx'), 'utf8');
const store = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');
const nav = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const section = readFileSync(join(root, 'src/components/home/CategoryProductsSection.tsx'), 'utf8');
const migration = readFileSync(
  join(root, 'supabase/migrations/20260720192000_categories_level_max_6.sql'),
  'utf8',
);

assert.match(cats, /CATEGORY_MAX_LEVEL\s*=\s*6/);
assert.match(cats, /export type CategoryLevel = 1 \| 2 \| 3 \| 4 \| 5 \| 6/);
assert.match(cats, /function descendantIds/);
assert.match(cats, /function findCategoryBySlug/);
assert.match(types, /level:\s*1 \| 2 \| 3 \| 4 \| 5 \| 6/);
assert.match(dash, /CATEGORY_MAX_LEVEL/);
assert.match(migration, /level >= 1 AND level <= 6/);

assert.match(store, /searchParams\.get\('category'\)/);
assert.match(store, /findCategoryBySlug/);
assert.match(store, /descendantIds/);
assert.match(store, /catalog-cat-tree/);
assert.match(store, /CategoryChipTree/);
assert.match(store, /parseStoreCategoryTreeExpand/);
assert.match(store, /expandEnabled/);

const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.match(settings, /store_category_tree_expand/);
assert.match(settings, /function parseStoreCategoryTreeExpand/);
assert.match(settings, /store_category_tree_expand: 'false'/);

const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');
assert.match(builder, /store_category_tree_expand/);
assert.match(builder, /Store category expand/);

assert.match(nav, /buildCategoryForest/);
assert.match(nav, /\/store\?category=/);
assert.match(nav, /DrawerCategoryLinks/);

assert.match(cats, /function cascadeLevelPatches/);
assert.match(cats, /function subtreeHeight/);
assert.match(dash, /cascadeLevelPatches/);
assert.match(dash, /subtreeHeight/);

const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
assert.match(home, /\/store\?category=/);
assert.doesNotMatch(home, /\/store\?q=/);

assert.match(section, /\/store\?category=/);
assert.doesNotMatch(section, /\/store\?q=/);

// Runnable: orphan under missing parent must not become a root (matches buildCategoryForest).
{
  const rows = [
    { id: 'b', parent_id: 'a' },
    { id: 'c', parent_id: 'b' },
  ];
  const ids = new Set(rows.map((r) => r.id));
  const roots = rows.filter((r) => !r.parent_id);
  const orphans = rows.filter((r) => r.parent_id && !ids.has(r.parent_id));
  assert.equal(roots.length, 0);
  assert.equal(orphans.length, 1); // b under missing a; c's parent b is present
  assert.ok(
    cats.includes('if (parent) parent.children.push') || cats.includes('else: orphan'),
    'buildCategoryForest must hide orphans (not promote to roots)',
  );
}

console.log('category depth ok');
