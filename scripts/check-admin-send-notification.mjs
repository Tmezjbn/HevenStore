import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const mig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714240000_admin_send_notification.sql'),
  'utf8',
);
assert.ok(mig.includes('admin_send_notification'), 'RPC missing');
assert.ok(mig.includes("v_role IS DISTINCT FROM 'owner'"), 'RPC must be owner-only');
assert.ok(mig.includes('p_user_ids'), 'RPC must accept target ids');
assert.ok(mig.includes("IN ('owner', 'admin', 'moderator')"), 'insert policy must include owner');

const page = readFileSync(join(root, 'src', 'pages', 'dashboard', 'NotificationsPage.tsx'), 'utf8');
assert.ok(page.includes("rpc('admin_send_notification'"), 'page must call RPC');
assert.ok(page.includes("profile?.role === 'owner'"), 'compose UI owner-only');
assert.ok(page.includes("audience === 'all'"), 'must support all-users audience');
assert.ok(page.includes('selected'), 'must support selected users');
assert.ok(page.includes('notifications-page-enter'), 'page enter animation class');
assert.ok(!page.includes('TYPE_ICONS'), 'emoji type icons removed');
assert.ok(page.includes('TYPE_META'), 'typed Lucide type meta required');

console.log('check-admin-send-notification: ok');
