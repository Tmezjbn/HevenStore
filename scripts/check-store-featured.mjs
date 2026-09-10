/** Guards Home/Explore featured ID pools + mirror + builder wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
const store = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');
const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');

assert.match(settings, /home_featured_product_ids/);
assert.match(settings, /store_featured_product_ids/);
assert.match(settings, /store_featured_mirror_home/);
assert.match(settings, /FEATURED_PRODUCTS_MAX\s*=\s*12/);
assert.match(settings, /function parseFeaturedProductIds/);
assert.match(settings, /function parseStoreFeaturedMirrorHome/);
assert.match(settings, /BUILDER_PRESET_KEYS[\s\S]*home_featured_product_ids/);
assert.match(settings, /BUILDER_PRESET_KEYS[\s\S]*store_featured_mirror_home/);

assert.match(home, /parseFeaturedProductIds\(settings\.home_featured_product_ids\)/);
assert.match(home, /useProductsByIds\(homeFeaturedIds\)/);
assert.match(home, /useFeaturedProducts\(8\)/);
assert.match(home, /homeFeaturedIds\.length > 0 \? curatedFeatured : starredFeatured/);

assert.match(store, /parseStoreFeaturedMirrorHome/);
assert.match(store, /exploreFeaturedIds/);
assert.match(store, /t\('مميز', 'Featured'\)/);
assert.match(store, /CategoryProductsSection/);
assert.match(store, /parseCategoryProductsSectionId/);

assert.match(builder, /setHomeFeaturedIds/);
assert.match(builder, /setStoreFeaturedIds/);
assert.match(builder, /setStoreFeaturedMirror/);
assert.match(builder, /home_featured_product_ids/);
assert.match(builder, /store_featured_product_ids/);
assert.match(builder, /store_featured_mirror_home/);
assert.match(builder, /products\?feature=1/);
assert.match(builder, /STORE_CATEGORY_SECTIONS_MAX/);
assert.match(builder, /addStoreCategorySection/);

const catalog = readFileSync(join(root, 'src/pages/dashboard/OwnerProductsPage.tsx'), 'utf8');
assert.match(catalog, /Feature Products!/);
assert.match(catalog, /FeatureProductsDialog/);

const dialog = readFileSync(join(root, 'src/components/dashboard/FeatureProductsDialog.tsx'), 'utf8');
assert.match(dialog, /Mirror Home featured/);
assert.match(dialog, /ProductIdListEditor/);

console.log('store featured ok');
