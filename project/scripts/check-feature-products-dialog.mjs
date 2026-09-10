/** Feature Products menu lives on catalog, not buried in builder widgets. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const catalog = read('src/pages/dashboard/OwnerProductsPage.tsx');
assert.match(catalog, /FeatureProductsDialog/);
assert.match(catalog, /feature['"]?\s*===\s*['"]1['"]|get\('feature'\)/);
assert.match(catalog, /Feature Products!/);
assert.doesNotMatch(catalog, /builder\?focus=featured/);

const dialog = read('src/components/dashboard/FeatureProductsDialog.tsx');
assert.match(dialog, /home_featured_product_ids/);
assert.match(dialog, /store_featured_product_ids/);
assert.match(dialog, /store_featured_mirror_home/);
assert.match(dialog, /ProductIdListEditor/);
assert.match(dialog, /Select all|تحديد الكل/);

const editor = read('src/components/dashboard/ProductIdListEditor.tsx');
assert.match(editor, /export default function ProductIdListEditor/);
assert.match(editor, /Deselect all/);

const builder = read('src/pages/dashboard/WebsiteBuilderPage.tsx');
assert.match(builder, /products\?feature=1/);
assert.doesNotMatch(builder, /function ProductIdListEditor/);

console.log('check-feature-products-dialog: ok');
