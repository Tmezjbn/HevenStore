/**
 * Asserts category hierarchy + homepage category section helpers stay wired.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function mustInclude(file, needle) {
  const src = readFileSync(join(root, file), 'utf8');
  assert.ok(src.includes(needle), `${file} missing ${JSON.stringify(needle)}`);
}

mustInclude('src/lib/categories.ts', 'buildCategoryForest');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'buildCategoryForest');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'TreeNode');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'New main');
mustInclude('src/lib/categories.ts', 'categoryPathLabel');
mustInclude('src/lib/categories.ts', 'hasSiblingNameConflict');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'hasSiblingNameConflict');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'role="tree"');
mustInclude('src/lib/siteSettings.ts', 'CATEGORY_PRODUCTS_PREFIX');
mustInclude('src/lib/siteSettings.ts', 'isCategoryProductsSection');
mustInclude('src/lib/siteSettings.ts', 'category_products:');
mustInclude('src/hooks/useCatalog.ts', 'useProductsByCategoryId');
mustInclude('src/hooks/useCatalog.ts', ".eq('category_id'");
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'parent_id');
mustInclude('src/pages/dashboard/CategoriesPage.tsx', 'level');
mustInclude('src/pages/HomePage.tsx', 'CategoryProductsSection');
mustInclude('src/pages/HomePage.tsx', 'mainCategories');
mustInclude('src/pages/dashboard/WebsiteBuilderPage.tsx', 'Category product sections');
mustInclude(
  'supabase/migrations/20260711150000_categories_owner_rls.sql',
  "role IN ('owner', 'admin', 'moderator')"
);

const settingsSrc = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.match(settingsSrc, /isCategoryProductsSection\(s\.id\)/);

console.log('check-categories: ok');
