import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
const settingsPage = readFileSync(join(root, 'src/pages/dashboard/SettingsPage.tsx'), 'utf8');
const accountSwitch = readFileSync(join(root, 'src/lib/accountSwitch.ts'), 'utf8');
const authStore = readFileSync(join(root, 'src/stores/authStore.ts'), 'utf8');
const authProvider = readFileSync(join(root, 'src/lib/auth.tsx'), 'utf8');
const ui = readFileSync(join(root, 'src/components/dashboard/AccountSwitch.tsx'), 'utf8');
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
const navbar = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const login = readFileSync(join(root, 'src/pages/auth/LoginPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

assert.match(settings, /multi_account_roles_json/);
assert.match(settings, /parseMultiAccountRoles/);
assert.match(settings, /DEFAULT_MULTI_ACCOUNT_ROLES/);
assert.match(settingsPage, /multi_account_roles_json/);
assert.match(settingsPage, /Multi-account sign-in/);

assert.match(accountSwitch, /heven\.account-park/);
assert.match(accountSwitch, /canAddSecondAccount/);
assert.match(accountSwitch, /parkCurrentAndSignOutLocal/);
assert.match(
  accountSwitch,
  /savePark\([\s\S]*?\{\s*emit:\s*false\s*\}/,
  'park-before-signOut must not emit (sync would clear park===live)',
);
assert.match(accountSwitch, /clearLocalSessionNoRevoke/);
assert.doesNotMatch(
  accountSwitch,
  /parkCurrentAndSignOutLocal[\s\S]*?signOut\(\s*\{\s*scope:\s*['"]local['"]/,
  'park must not call signOut(local) — that revokes the parked refresh token',
);
assert.match(accountSwitch, /switchToParked/);
assert.match(accountSwitch, /clearCart/);
assert.match(accountSwitch, /role === 'owner'/);
assert.match(accountSwitch, /isAccountSwitchInFlight/);
assert.match(accountSwitch, /materializeParkSession|createClient/);
assert.match(accountSwitch, /park_refresh_failed/);
assert.match(accountSwitch, /autoRefreshToken:\s*false/);
assert.match(accountSwitch, /stopAutoRefresh/);
assert.match(accountSwitch, /startAutoRefresh/);
assert.match(accountSwitch, /restore_failed/);
assert.match(accountSwitch, /syncAuthStoreFromSupabase/);
assert.match(
  accountSwitch,
  /if \(isAccountSwitchInFlight\(\)\) return/,
  'dropParkIfSameUser must no-op during switch',
);
assert.doesNotMatch(
  accountSwitch,
  /savePark\(outgoing\);[\s\S]*?setSession\(\{\s*access_token: (?:parked|ready|fresh)/,
  'must not overwrite park with outgoing before setSession succeeds',
);

assert.match(authProvider, /isAccountSwitchInFlight/);
assert.match(
  authProvider,
  /!session && isAccountSwitchInFlight\(\)/,
  'must ignore null session during account switch',
);

assert.match(authStore, /addSecondAccount/);
assert.match(authStore, /switchAccount/);
assert.match(authStore, /signOutBoth/);
assert.match(authStore, /removeParkedAccount/);
assert.match(authStore, /profile: null/, 'setSession must clear profile on user change');

assert.match(ui, /account-switch-btn/);
assert.match(ui, /account-switch-menu/);
assert.match(ui, /variant/);
assert.match(ui, /ArrowLeftRight/);
assert.match(ui, /addSecondAccount/);
assert.match(ui, /switchAccount/);
assert.doesNotMatch(ui, /removeParkedAccount\(\)/, 'switch failure must not wipe park');
assert.doesNotMatch(
  ui,
  /clearPark\(\)/,
  'AccountSwitch must not clearPark on sync (races switch; dropParkIfSameUser handles stale)',
);
assert.match(navbar, /variant="menu"/);

const profileSwitch = readFileSync(join(root, 'src/pages/dashboard/ProfilePage.tsx'), 'utf8');
const switchFailBlock = profileSwitch.match(/const res = await switchAccount\(\);[\s\S]{0,400}/)?.[0] ?? '';
assert.doesNotMatch(
  switchFailBlock,
  /removeParkedAccount\(\)/,
  'Profile switch failure must not wipe park',
);

assert.match(layout, /AccountSwitch/);
assert.match(navbar, /AccountSwitch/);
assert.match(navbar, /account-switch-profile/);
assert.doesNotMatch(navbar, /account-switch-slot/);
assert.match(login, /addingAccount/);
assert.match(css, /\.account-switch-btn/);

const profilePage = readFileSync(join(root, 'src/pages/dashboard/ProfilePage.tsx'), 'utf8');
assert.match(profilePage, /Add accounts/);
assert.match(profilePage, /addSecondAccount/);
assert.match(profilePage, /canAddSecondAccount/);

console.log('account switch OK');
