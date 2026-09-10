/** Guards ad-banner blade edge settings + wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
const banner = readFileSync(join(root, 'src/components/home/ProductAdsBanner.tsx'), 'utf8');
const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

assert.match(settings, /home_ads_blade_enabled/);
assert.match(settings, /home_ads_blade_text_en/);
assert.match(settings, /home_ads_blade_text_ar/);
assert.match(settings, /home_ads_blade_size/);
assert.match(settings, /home_ads_blade_color/);
assert.match(settings, /home_ads_blade_opacity/);
assert.match(settings, /home_ads_glare_hover/);
assert.match(settings, /function parseHomeAdsBladeEnabled/);
assert.match(settings, /function parseHomeAdsBladeText/);
assert.match(settings, /function parseHomeAdsBladeSize/);
assert.match(settings, /function parseHomeAdsBladeColor/);
assert.match(settings, /function parseHomeAdsBladeOpacity/);
assert.match(settings, /function parseHomeAdsGlareHover/);
assert.match(settings, /HOME_ADS_BLADE_TEXT_EN_DEFAULT/);

assert.match(banner, /bladeEnabled/);
assert.match(banner, /glareHover/);
assert.match(banner, /ads-banner-glare/);
assert.match(banner, /AdsBlade/);
assert.match(banner, /ads-blade ads-blade--\$\{edge\}/);
assert.match(banner, /edge="top"/);
assert.match(banner, /edge="bottom"/);
assert.match(banner, /dir="ltr"/);
assert.match(banner, /dir=\{rtl \? 'rtl' : 'ltr'\}/);
assert.match(banner, /ads-blade__half/);
assert.match(banner, /ads-blade__unit/);
assert.match(banner, /className=\{`group relative/);
assert.match(banner, /left-0 flex items-center pl-2/);
assert.match(banner, /right-0 flex items-center pr-2/);
assert.doesNotMatch(banner, /setInteracted/);
assert.doesNotMatch(banner, /animation-direction/);

assert.match(home, /bladeEnabled=\{adsBladeEnabled\}/);
assert.match(home, /bladeText=\{adsBladeText\}/);
assert.match(home, /bladeSize=\{adsBladeSize\}/);
assert.match(home, /bladeColor=\{adsBladeColor\}/);
assert.match(home, /bladeOpacity=\{adsBladeOpacity\}/);
assert.match(home, /glareHover=\{adsGlareHover\}/);

assert.match(builder, /home_ads_blade_enabled/);
assert.match(builder, /home_ads_glare_hover/);
assert.match(builder, /Blade edge strips/);
assert.match(builder, /Glare hover/);
assert.match(builder, /setAdsBladeEnabled/);
assert.match(builder, /setAdsGlareHover/);
assert.match(builder, /home_ads_blade_size/);
assert.match(builder, /home_ads_blade_color/);
assert.match(builder, /home_ads_blade_opacity/);

assert.match(css, /\.ads-blade/);
assert.match(css, /\.ads-banner-glare/);
assert.match(css, /@keyframes ads-blade-marquee/);
assert.match(css, /\.ads-blade__track[^{]*\{[^}]*direction:\s*ltr/);
assert.match(css, /\.ads-blade__half/);
assert.match(css, /\.ads-blade__unit/);
assert.doesNotMatch(css, /ads-blade\.is-rtl[^{]*\{[^}]*animation-direction/);
assert.match(css, /\.ads-blade__track\s*\{\s*\n\s*animation:\s*ads-blade-marquee/);
assert.match(css, /--ads-blade-h/);

console.log('home ads blade ok');
