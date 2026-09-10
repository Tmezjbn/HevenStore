/** Guards home_ads_size parse + banner wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
const banner = readFileSync(join(root, 'src/components/home/ProductAdsBanner.tsx'), 'utf8');
const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');

assert.match(settings, /home_ads_size/);
assert.match(settings, /HOME_ADS_SIZES/);
assert.match(settings, /function parseHomeAdsSize/);
assert.match(settings, /function homeAdsSizeClass/);
assert.match(banner, /homeAdsSizeClass/);
assert.match(banner, /CTA outside slide/);
assert.match(home, /size=\{adsSize\}/);
assert.match(builder, /home_ads_size: adsSize/);
assert.match(builder, /Banner height/);

console.log('home_ads_size ok');
