import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'src/pages/dashboard/OwnerChangelogsPage.tsx'), 'utf8');
const lib = readFileSync(join(root, 'src/lib/changelogs.ts'), 'utf8');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260720180000_owner_changelog_update_scale.sql'),
  'utf8',
);

assert.match(mig, /update_scale/);
assert.match(mig, /Money path and stock stay honest/);
assert.match(mig, /Owner dashboard, vault identity/);
assert.match(lib, /OwnerUpdateScale/);
assert.match(lib, /update_scale/);
assert.match(page, /scaleTab/);
assert.match(page, /Big updates|تحديثات كبيرة/);
assert.match(page, /useState<OwnerUpdateScale>\('big'\)/);

console.log('owner changelog scale OK');
