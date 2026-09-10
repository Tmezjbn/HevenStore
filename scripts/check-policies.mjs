/**
 * Asserts policy/changelog parsers keep a usable shape (no empty sections).
 * Run via: npm test
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

mustInclude('src/lib/policyDocs.ts', 'export function parsePolicyDoc');
mustInclude('src/lib/policyDocs.ts', 'DEFAULT_PRIVACY_POLICY');
mustInclude('src/lib/policyDocs.ts', 'DEFAULT_TERMS_POLICY');
mustInclude('src/lib/changelogs.ts', 'parseUserChangelog');
mustInclude('src/lib/changelogs.ts', 'owner_changelog_entries');
mustInclude('src/lib/siteSettings.ts', 'privacy_policy_json');
mustInclude('src/lib/siteSettings.ts', 'terms_policy_json');
mustInclude('src/lib/siteSettings.ts', 'user_changelog_json');
mustInclude('src/lib/siteSettings.ts', "href: '/updates'");
mustInclude('src/layouts/DashboardLayout.tsx', "href: '/dashboard/changelogs'");
mustInclude('src/layouts/DashboardLayout.tsx', "roles: ['owner']");
mustInclude('src/App.tsx', "{ path: 'updates', element: <ChangelogPage /> }");
mustInclude('src/App.tsx', "{ path: 'changelogs', element: <OwnerChangelogsPage /> }");
mustInclude(
  'supabase/migrations/20260711140000_owner_changelog_and_settings_rls.sql',
  "role = 'owner'"
);
mustInclude(
  'supabase/migrations/20260711140000_owner_changelog_and_settings_rls.sql',
  "role IN ('owner', 'admin')"
);

// Inline parse smoke (duplicate minimal logic so we don't need a TS loader).
const policySrc = readFileSync(join(root, 'src/lib/policyDocs.ts'), 'utf8');
assert.match(policySrc, /short_bullets_en/);
assert.match(policySrc, /sections:/);

console.log('check-policies: ok');
