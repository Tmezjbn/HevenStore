/**
 * Asserts storefront nav chrome avoids per-frame layout during collapse,
 * keeps blur precomposited, and route commits reset scroll before paint.
 * Search FX has its own visual contract and is intentionally out of scope.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nav = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');
const scroll = readFileSync(join(root, 'src/components/ui/ScrollToTop.tsx'), 'utf8');
const atmosphere = readFileSync(
  join(root, 'src/components/layout/SiteAtmosphere.tsx'),
  'utf8',
);

const fails = [];

if (!nav.includes('nav-chrome-slot')) {
  fails.push('Navbar.tsx must use nav-chrome-slot for logo/search collapse');
}
if (nav.includes('transition-[max-width') || nav.includes('max-w-0 opacity-0')) {
  fails.push('Navbar.tsx must not animate collapse via max-width / max-w-0');
}
if (!nav.includes('storefront-navbar--scrolled')) {
  fails.push('Navbar must toggle the composited storefront-navbar scroll state');
}
if (!nav.includes('if (window.scrollY <= 16) setScrolled(false)')) {
  fails.push('Navbar must sync its expanded state before a top-reset route paints');
}
if (!css.includes('.nav-chrome-slot--collapsed') || !css.includes('transition-property: opacity, transform')) {
  fails.push('index.css must collapse nav chrome with opacity/transform only');
}
if (!css.includes('.storefront-navbar::before') || !css.includes('backdrop-filter: blur(12px)')) {
  fails.push('Navbar blur must stay on a stable pseudo-element layer');
}
if (!scroll.includes('useLayoutEffect') || !scroll.includes("root.style.scrollBehavior = 'auto'")) {
  fails.push('Route scroll reset must happen before paint and bypass global smooth scrolling');
}
if (!atmosphere.includes('useLayoutEffect(() => {') || !atmosphere.includes("'atm-pattern-behind'")) {
  fails.push('Route atmosphere classes must sync before paint');
}
for (const animation of ['catalog-title-in', 'home-hero-shell']) {
  const start = css.indexOf(`@keyframes ${animation}`);
  const end = css.indexOf('\n}', start);
  if (start < 0 || css.slice(start, end).includes('filter:')) {
    fails.push(`${animation} must not animate filter in Chromium`);
  }
}
if (fails.length) {
  console.error('check-nav-chrome-motion FAILED:');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('check-nav-chrome-motion: ok');
