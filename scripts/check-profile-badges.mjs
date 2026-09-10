/**
 * Asserts profile / badges / deletion / guides frontend stays wired to the migration.
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

const migration = 'supabase/migrations/20260711170000_profile_badges_deletion.sql';

mustInclude(migration, 'request_account_deletion');
mustInclude(migration, 'COUPON_BADGE');
mustInclude(migration, 'Helper');

const graceMigration = 'supabase/migrations/20260712170000_account_deletion_grace_days.sql';
mustInclude(graceMigration, 'account_deletion_grace_days');
mustInclude(graceMigration, 'make_interval');
mustInclude('src/lib/siteSettings.ts', 'account_deletion_grace_days');
mustInclude('src/pages/dashboard/SettingsPage.tsx', 'account_deletion_grace_days');
mustInclude('supabase/cron/purge_due_account_deletions.sql', 'purge-due-account-deletions');
mustInclude('supabase/cron/purge_due_account_deletions.sql', 'purge-deleted-accounts');
mustInclude('supabase/cron/purge_due_account_deletions.sql', 'net.http_post');

const hardPurge = 'supabase/migrations/20260712190000_hard_purge_auth_users.sql';
mustInclude(hardPurge, 'claim_due_account_deletions');
mustInclude(hardPurge, 'ON DELETE SET NULL');
mustInclude('supabase/functions/purge-deleted-accounts/index.ts', 'deleteUser');
mustInclude('supabase/functions/purge-deleted-accounts/index.ts', 'claim_due_account_deletions');
mustInclude('supabase/functions/purge-deleted-accounts/index.ts', 'x-purge-secret');

mustInclude('src/pages/dashboard/GuidesPage.tsx', 'ROLE_GUIDES');
mustInclude('src/pages/dashboard/ProfilePage.tsx', 'request_account_deletion');
mustInclude('src/pages/dashboard/DeletionRequestsPage.tsx', 'review_account_deletion');
mustInclude('src/pages/dashboard/DeletionRequestsPage.tsx', 'restore_account');
mustInclude('src/pages/dashboard/BadgesPage.tsx', 'user_badges');
mustInclude('src/pages/dashboard/MyBadgesPage.tsx', 'user_badges');
mustInclude('src/layouts/DashboardLayout.tsx', '/dashboard/my-badges');
mustInclude('src/App.tsx', 'MyBadgesPage');
mustInclude('src/lib/coupons.ts', 'required_badge_id');
mustInclude('src/lib/coupons.ts', 'user_badges');
mustInclude('src/lib/startPolarCheckout.ts', 'COUPON_BADGE');
mustInclude('src/lib/roleGuides.ts', 'owner');
mustInclude('src/App.tsx', 'GuidesPage');
mustInclude('src/layouts/DashboardLayout.tsx', '/dashboard/deletion-requests');
mustInclude('src/lib/siteSettings.ts', '/dashboard/guides');
mustInclude('src/stores/authStore.ts', 'is_active');
mustInclude('src/index.css', 'badge-strip-motion.is-open .badge-strip-motion__clip');
mustInclude('src/index.css', 'overflow: visible');
mustInclude('src/components/ui/ProfileBadgeStrip.tsx', 'badge-strip-motion__clip');

console.log('check-profile-badges: ok');
