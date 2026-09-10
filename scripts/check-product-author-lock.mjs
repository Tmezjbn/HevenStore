import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseProductAuthorLock(raw) {
  if (!(raw ?? '').trim()) return true;
  const v = String(raw).trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off' && v !== 'no';
}

function canDeleteProductByAuthor({
  lockOn,
  userId,
  role,
  createdBy,
  createdByRole,
  sellerId,
}) {
  if (!userId) return false;
  if (role === 'moderator') return false;
  const staff = role === 'owner' || role === 'admin';
  if (role === 'seller' && sellerId === userId) return true;
  if (lockOn) {
    if (createdBy === userId) return true;
    if (!createdBy) return staff;
    if (role === 'owner') {
      if (createdByRole == null) return true;
      return createdByRole !== 'owner';
    }
    return false;
  }
  if (role === 'owner' || role === 'admin') return true;
  if (role === 'seller') return !createdBy || createdBy === userId;
  return false;
}

function canEditProductAuthor({ userId, role, createdBy, addedBy }) {
  if (!userId) return false;
  if (createdBy) return createdBy === userId;
  if (addedBy) return addedBy === userId;
  return role === 'owner';
}

assert.equal(parseProductAuthorLock(''), true);
assert.equal(parseProductAuthorLock('true'), true);
assert.equal(parseProductAuthorLock('false'), false);

assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'a',
    role: 'admin',
    createdBy: 'b',
  }),
  false,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'owner1',
    role: 'owner',
    createdBy: 'mod1',
    createdByRole: 'moderator',
  }),
  true,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'owner1',
    role: 'owner',
    createdBy: 'owner2',
    createdByRole: 'owner',
  }),
  false,
);
assert.match(
  readFileSync(
    join(root, 'supabase/migrations/20260720133000_owner_delete_staff_products.sql'),
    'utf8',
  ),
  /current_user_role\(\) = 'owner'/,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'a',
    role: 'moderator',
    createdBy: null,
  }),
  false,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'a',
    role: 'moderator',
    createdBy: 'a',
  }),
  false,
);
assert.match(
  readFileSync(
    join(root, 'supabase/migrations/20260720131000_product_author_none.sql'),
    'utf8',
  ),
  /created_by IS NULL/,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: false,
    userId: 'a',
    role: 'admin',
    createdBy: 'b',
  }),
  true,
);
assert.equal(
  canDeleteProductByAuthor({
    lockOn: true,
    userId: 'seller1',
    role: 'seller',
    createdBy: 'admin1',
    sellerId: 'seller1',
  }),
  true,
);
assert.match(
  readFileSync(
    join(root, 'supabase/migrations/20260720152000_seller_delete_no_feature.sql'),
    'utf8',
  ),
  /products_seller_feature_guard/,
);
assert.doesNotMatch(
  readFileSync(join(root, 'src/pages/dashboard/SellerProductsPage.tsx'), 'utf8'),
  /Feature on homepage|toggleFeatured/,
);

const mig = readFileSync(
  join(root, 'supabase/migrations/20260720130000_product_author_lock.sql'),
  'utf8',
);
assert.match(mig, /product_author_lock_enabled/);
assert.match(mig, /products_created_by_guard/);
assert.match(mig, /product_author_lock/);

const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.match(settings, /product_author_lock/);
assert.match(settings, /parseProductAuthorLock/);

assert.equal(
  canEditProductAuthor({
    userId: 'a',
    role: 'admin',
    createdBy: 'a',
    addedBy: 'a',
  }),
  true,
);
assert.equal(
  canEditProductAuthor({
    userId: 'b',
    role: 'owner',
    createdBy: 'a',
    addedBy: 'a',
  }),
  false,
);
assert.equal(
  canEditProductAuthor({
    userId: 'a',
    role: 'moderator',
    createdBy: null,
    addedBy: 'a',
  }),
  true,
);
assert.equal(
  canEditProductAuthor({
    userId: 'b',
    role: 'admin',
    createdBy: null,
    addedBy: 'a',
  }),
  false,
);
assert.match(
  readFileSync(join(root, 'supabase/migrations/20260720132000_product_added_by.sql'), 'utf8'),
  /added_by/,
);

console.log('product author lock OK');
