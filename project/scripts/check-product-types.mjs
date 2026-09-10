/** Custom product types: lib + editor + relaxed DB check. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const lib = read('src/lib/productTypes.ts');
assert.match(lib, /BUILTIN_PRODUCT_TYPES/);
assert.match(lib, /parseProductTypesJson/);
assert.match(lib, /slugifyProductType/);

const settings = read('src/lib/siteSettings.ts');
assert.match(settings, /product_types_json/);

const editor = read('src/pages/dashboard/ProductEditorPage.tsx');
assert.match(editor, /parseProductTypesJson/);
assert.match(editor, /Add type/);

const mig = read('supabase/migrations/20260714200000_products_product_type_free.sql');
assert.match(mig, /products_product_type_check/);

console.log('check-product-types: ok');
