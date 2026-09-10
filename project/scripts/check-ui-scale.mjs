import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const settings = read('src/lib/siteSettings.ts');
const app = read('src/App.tsx');
const css = read('src/index.css');
const html = read('index.html');
const nav = read('src/components/layout/Navbar.tsx');
const settingsHook = read('src/hooks/useSiteSettings.ts');
const themes = read('src/pages/dashboard/ThemesPage.tsx');
const migration = read(
  'supabase/migrations/20260723190000_owner_changelog_ui_scale.sql',
);

assert.match(settings, /'ui_scale'/);
assert.match(settings, /UI_SCALE_DEFAULT = 90/);
assert.match(settings, /UI_SCALE_VALUES = \[75, 80, 85, 90, 95, 100, 105, 110\]/);
assert.match(settings, /export function parseUiScale/);
assert.match(settings, /ui_scale: String\(UI_SCALE_DEFAULT\)/);
assert.match(app, /root\.style\.setProperty\('--ui-scale', `\$\{scale\}%`\)/);
assert.match(app, /pathname\.startsWith\('\/dashboard'\)/);
assert.match(css, /--ui-scale:\s*90%/);
assert.match(css, /font-size:\s*var\(--ui-scale\)/);
assert.match(css, /min-block-size:\s*44px/);
assert.match(css, /safe-area-inset-top/);
assert.match(css, /@media \(max-width:\s*52rem\)/);
assert.match(nav, /nav-chrome-slot--search/);
assert.match(html, /viewport-fit=cover/);
assert.doesNotMatch(css, /html\s*\{[^}]*\bzoom\s*:/);
assert.doesNotMatch(app, /transform:\s*['"`]scale\(/);
assert.match(themes, /id="site-ui-scale"/);
assert.match(themes, /Storefront density only; dashboard stays at 100%/);
assert.match(settingsHook, /setQueryData<SiteSettingsMap>/);
assert.match(migration, /VALUES \('ui_scale', '90'\)/);

console.log('check-ui-scale: ok');
