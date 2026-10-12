/** Welcome card must not flash default-on before site settings fetch. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBuilderSource } from './builder-source.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const hook = readFileSync(join(root, 'src/hooks/useSiteSettings.ts'), 'utf8');
assert.match(hook, /isPlaceholderData/);
assert.match(hook, /placeholderData:\s*SITE_SETTING_DEFAULTS/);

const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
assert.match(home, /isPlaceholderData/);
assert.match(home, /settingsReady/);
assert.match(home, /settingsReady\s*&&\s*parseHeroEnabled/);

const builder = readBuilderSource(root);
assert.match(builder, /settingsPlaceholder/);
assert.match(builder, /!settingsLoading\s*&&\s*!settingsPlaceholder/);

const defaults = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.match(defaults, /hero_enabled:\s*'true'/);

console.log('check-hero-settings-ready: ok');
