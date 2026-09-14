/**
 * Phase 7 a11y invariants — shared Modal with Escape/focus-trap, contentDir, labelled modals.
 * Run: node scripts/check-a11y.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const modal = read('src/components/ui/Modal.tsx');
assert.match(modal, /role="dialog"/, 'Modal needs role=dialog');
assert.match(modal, /aria-modal/, 'Modal needs aria-modal');
assert.match(modal, /useFocusTrap/, 'Modal must use shared focus trap');

const trap = read('src/hooks/useFocusTrap.ts');
assert.match(trap, /Escape/, 'focus trap must handle Escape');
assert.match(trap, /Tab/, 'focus trap must trap Tab');
assert.match(trap, /previous\.?focus|previous\?\.focus/, 'focus trap must restore focus');
// Blink scrolls <html> — body-only overflow:hidden still moves the page under modals/drawers.
assert.match(
  trap,
  /document\.documentElement\.style\.overflow\s*=\s*['"]hidden['"]/,
  'focus trap must lock html overflow (Chromium)',
);
assert.match(
  trap,
  /document\.body\.style\.overflow\s*=\s*['"]hidden['"]/,
  'focus trap must lock body overflow',
);

const i18n = read('src/lib/i18n.tsx');
assert.match(i18n, /contentDir/, 'i18n must expose contentDir for Arabic prose');
assert.match(i18n, /document\.documentElement\.dir = 'ltr'/, 'chrome dir must stay LTR');
assert.match(i18n, /useMemo/, 'I18nProvider must memoize context value');
assert.match(i18n, /useCallback/, 'I18nProvider must stabilize t/setLang');
assert.match(i18n, /withViewTransition/, 'lang switch must use shared view transition');
assert.match(i18n, /lang-switching/, 'lang switch marks html.lang-switching');

const vt = read('src/lib/viewTransition.ts');
assert.match(vt, /lang-black-veil/, 'lang switch uses black veil');
assert.match(
  vt,
  /className === 'lang-switching'\) return runLangBlackVeil/,
  'lang must not use Document.startViewTransition (hangs busy lock)',
);
assert.match(vt, /settleAfterLangUpdate|document\.fonts/, 'lang veil waits fonts/paint (Blink shimmer)');
assert.match(vt, /visibility\s*=\s*['"]hidden['"]/, 'lang veil hides shell during AR/EN reflow (Blink)');
assert.match(vt, /veil\.style\.opacity\s*=\s*['"]1['"]/, 'lang veil locks solid black after fade-in');
assert.match(vt, /originFromElement/, 'theme reveal needs button-origin helper');
assert.match(vt, /theme-reveal/, 'theme circle reveal marks html.theme-reveal');
assert.match(i18n, /3_000|3000/, 'lang busy lock needs failsafe unlock');
assert.match(i18n, /document\.documentElement\.lang\s*=\s*l/, 'setLang writes html.lang under veil');

const css = read('src/index.css');
assert.match(css, /\.lang-black-veil[\s\S]{0,400}will-change:\s*opacity/, 'lang veil needs compositor layer');
assert.match(
  css,
  /html\.lang-switching\s+\.storefront-navbar::before[\s\S]{0,200}backdrop-filter:\s*none/,
  'lang switch must disable navbar blur (Blink jank)',
);
assert.match(css, /@keyframes theme-circle-in/, 'theme circle reveal keyframes');
assert.match(css, /clip-path:\s*circle\(var\(--theme-vt-r\)/, 'theme reveal expands to --theme-vt-r');

const nav = read('src/components/layout/Navbar.tsx');
assert.match(nav, /nav-lang-btn/, 'Navbar lang control needs nav-lang-btn');
assert.match(nav, /useFocusTrap/, 'Navbar drawer must use focus trap');
assert.match(nav, /dismissDrawer/, 'Navbar drawer Escape must dismiss');
assert.match(nav, /aria-modal/, 'Navbar drawer needs aria-modal when open');
assert.doesNotMatch(
  nav,
  /heven-skin-join[\s\S]{0,400}focus-visible:outline-none/,
  'skin radios must not kill focus-visible outline in className',
);

assert.match(css, /lang-vt-out/, 'lang VT out keyframes exist');
assert.match(css, /brightness\(0\)/, 'lang VT fades through black');
assert.match(
  css,
  /\.heven-skin-join > \.btn:focus-visible[\s\S]{0,120}outline:\s*2px solid/,
  'skin join must show focus-visible ring',
);
assert.match(
  css,
  /\.nav-search-fx__menu-item:focus-visible[\s\S]{0,80}outline:\s*2px solid/,
  'nav search menu items need focus ring',
);

const games = read('src/pages/GamesPage.tsx');
assert.match(games, /Expand \$\{label\}|Collapse \$\{label\}/, 'cat expand aria-label must name category');
assert.match(games, /ChevronDown[\s\S]{0,40}aria-hidden/, 'expand chevron must be aria-hidden');

const atm = read('src/components/layout/SiteAtmosphere.tsx');
assert.match(atm, /requestAnimationFrame/, 'hero clip-path sync must rAF-throttle scroll');
assert.match(atm, /passive:\s*true/, 'scroll listener should be passive');

const login = read('src/pages/auth/LoginPage.tsx');
assert.match(login, /label-text/, 'LoginPage needs visible field labels');
const register = read('src/pages/auth/RegisterPage.tsx');
assert.match(register, /At least 8 characters/, 'RegisterPage needs static password length hint');
assert.match(register, /label-text/, 'RegisterPage needs visible field labels');
const reset = read('src/pages/auth/ResetPasswordPage.tsx');
assert.match(reset, /At least 8 characters/, 'ResetPasswordPage needs static password length hint');

for (const file of [
  'src/pages/dashboard/CouponsPage.tsx',
  'src/pages/dashboard/UsersPage.tsx',
]) {
  const src = read(file);
  assert.match(src, /from ['"].*Modal['"]/, `${file} should use shared Modal`);
  assert.doesNotMatch(src, /modal modal-open/, `${file} must not use raw daisy modal markup`);
}

assert.doesNotMatch(
  read('src/pages/dashboard/AdminProductsPage.tsx'),
  /modal modal-open/,
  'Admin products list must not use raw daisy modal markup',
);
assert.doesNotMatch(
  read('src/pages/dashboard/OwnerProductsPage.tsx'),
  /modal modal-open/,
  'Owner products list must not use raw daisy modal markup',
);

assert.doesNotMatch(
  read('src/pages/dashboard/ProductEditorPage.tsx'),
  /aria-label="Up"|aria-label="Down"/,
  'gallery reorder buttons need bilingual aria-labels',
);

const ads = read('src/components/home/ProductAdsBanner.tsx');
assert.match(ads, /aria-roledescription="carousel"/, 'ads banner needs carousel role description');
assert.match(
  ads,
  /aria-live=\{userNav \? 'polite' : 'off'\}/,
  'ads banner needs live region that only announces user-driven slide changes',
);
// Autoplay pauses on hover/focus + hidden tab — resumes after (no permanent kill).
// Merch FX (aura/tilt/card canvases) calm via merch_motion_mode — not framer useReducedMotion.
// Ads carousel autoplay stays independent of that gate (hover + tab hidden only).
assert.match(ads, /min-h-11 min-w-11/, 'ads carousel dots need ≥44px hit area');
assert.match(ads, /hoverPaused/, 'ads banner pauses autoplay while hovered/focused');
assert.match(ads, /visibilitychange/, 'ads banner must pause when tab hidden');
assert.match(
  ads,
  /paused = hoverPaused \|\| tabHidden/,
  'ads banner pause must combine hover + hidden tab',
);
assert.doesNotMatch(
  ads,
  /useReducedMotion/,
  'ads carousel autoplay must not use framer useReducedMotion (merch calm is merch_motion_mode)',
);
assert.match(
  read('src/hooks/useMerchMotionCalm.ts'),
  /merchMotionShouldCalm/,
  'merch FX calm must go through useMerchMotionCalm / merch_motion_mode',
);

const pdp = read('src/pages/ProductDetailPage.tsx');
assert.match(pdp, /application\/ld\+json/, 'PDP must emit Product JSON-LD');
assert.match(pdp, /View image/, 'PDP gallery thumbs need bilingual aria-labels');

const layout = read('src/layouts/MainLayout.tsx');
assert.match(layout, /id="main-content"/, 'MainLayout needs #main-content landmark');
assert.match(layout, /href="#main-content"/, 'MainLayout needs skip link');
assert.match(layout, /Skip to content/, 'skip link needs bilingual EN copy');

const cart = read('src/stores/cartStore.ts');
assert.match(cart, /hydrateFromLive/, 'cart must hydrate live product snapshots');
assert.match(cart, /version:\s*1/, 'cart persist needs version');
const wish = read('src/stores/wishlistStore.ts');
assert.match(wish, /hydrateFromLive/, 'wishlist must hydrate live products');
assert.match(wish, /version:\s*1/, 'wishlist persist needs version');
assert.match(read('src/pages/CartPage.tsx'), /hydrateFromLive/, 'CartPage must call hydrate');
assert.match(read('src/pages/WishlistPage.tsx'), /hydrateFromLive/, 'WishlistPage must call hydrate');

console.log('check-a11y: ok');
