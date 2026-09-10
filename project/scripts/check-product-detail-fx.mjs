/** Mirrors site atmosphere parse + route helper. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_PAGES = {
  home: true,
  store: true,
  subscriptions: false,
  giftCards: false,
  product: true,
  seller: false,
  cart: false,
  checkout: false,
  wishlist: false,
  about: false,
  other: false,
  heroWelcome: false,
  footer: false,
  drawer: false,
};
const ROUTE_KEYS = [
  'home',
  'store',
  'subscriptions',
  'giftCards',
  'product',
  'seller',
  'cart',
  'checkout',
  'wishlist',
  'about',
  'other',
];
const DEFAULT_LAYER = { grid: true, particles: true, logo: true };
function defaultPageLayers() {
  return Object.fromEntries(ROUTE_KEYS.map((k) => [k, { ...DEFAULT_LAYER }]));
}
function parseAtmospherePageLayers(raw) {
  const out = defaultPageLayers();
  if (!raw || typeof raw !== 'object') return out;
  for (const key of ROUTE_KEYS) {
    const v = raw[key];
    if (!v || typeof v !== 'object') continue;
    out[key] = {
      grid: v.grid !== false && v.grid !== 'false' && v.grid !== 0,
      particles: v.particles !== false && v.particles !== 'false' && v.particles !== 0,
      logo: v.logo !== false && v.logo !== 'false' && v.logo !== 0,
    };
  }
  return out;
}
function resolveAtmosphereLayers(config, pageKey) {
  const local = config.pageLayers?.[pageKey] ?? DEFAULT_LAYER;
  return {
    grid: config.grid !== false && local.grid,
    particles: config.particles !== false && local.particles,
    logo: config.logo !== false && local.logo,
  };
}
const DEFAULT_LOGOS = ['rust', 'fortnite', 'gta5', 'cod'];
const ALLOWED = [
  'rust',
  'gta5',
  'cod',
  'fortnite',
  'minecraft',
  'valorant',
  'roblox',
  'lol',
  'apex',
  'cs2',
];
const PATTERN_IDS = ['lines', 'dots', 'diagonal', 'cross', 'plus'];

function clampFxPct(n, fallback) {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v)));
}
function clampFxCount(n, fallback) {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(64, Math.max(8, Math.round(v)));
}
function clampFxSize(n, fallback) {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(250, Math.max(25, Math.round(v)));
}
function clampLogoCount(n, fallback) {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(12, Math.max(1, Math.round(v)));
}
function clampAtmospherePatterns(raw) {
  const allow = new Set(PATTERN_IDS);
  const list = Array.isArray(raw)
    ? raw.filter((id) => typeof id === 'string' && allow.has(id))
    : [];
  return list.length > 0 ? [...new Set(list)] : ['lines'];
}
function parseAtmospherePages(raw) {
  const out = { ...DEFAULT_PAGES };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(out)) {
    if (key in raw) out[key] = raw[key] !== false && raw[key] !== 'false' && raw[key] !== 0;
  }
  return out;
}
function clampAtmosphereLogoIds(raw, allowed, fallback = DEFAULT_LOGOS) {
  const allow = new Set(allowed);
  const list = Array.isArray(raw)
    ? raw.filter((id) => typeof id === 'string' && allow.has(id))
    : [];
  return list.length > 0 ? [...new Set(list)] : [...fallback];
}
function isAtmosphereLogoSrc(src) {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const u = new URL(src);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
function parseAtmosphereCustomLogos(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const src = typeof item.src === 'string' ? item.src.trim() : '';
    if (!id || !src || seen.has(id) || !isAtmosphereLogoSrc(src)) continue;
    seen.add(id);
    out.push({
      id,
      src,
      labelEn: typeof item.labelEn === 'string' && item.labelEn.trim() ? item.labelEn.trim() : id,
      labelAr: typeof item.labelAr === 'string' && item.labelAr.trim() ? item.labelAr.trim() : id,
    });
    if (out.length >= 24) break;
  }
  return out;
}
function parseProductDetailFx(raw) {
  if (!raw.trim()) {
    return {
      enabled: true,
      grid: true,
      particles: true,
      logo: true,
      pages: { ...DEFAULT_PAGES },
      pageLayers: defaultPageLayers(),
      logoIds: [...DEFAULT_LOGOS],
      customLogos: [],
      particleCount: 28,
      logoCount: 4,
      particleSpeed: 100,
      logoSpeed: 100,
      patterns: ['lines'],
    };
  }
  const parsed = JSON.parse(raw);
  const customLogos = parseAtmosphereCustomLogos(parsed.customLogos);
  const allowed = [...ALLOWED, ...customLogos.map((c) => c.id)];
  const fallback =
    customLogos.length > 0 ? customLogos.map((c) => c.id) : [...DEFAULT_LOGOS];
  return {
    enabled: parsed.enabled !== false,
    grid: parsed.grid !== false,
    particles: parsed.particles !== false,
    logo: parsed.logo !== false,
    pages: parseAtmospherePages(parsed.pages),
    pageLayers: parseAtmospherePageLayers(parsed.pageLayers),
    customLogos,
    logoIds: clampAtmosphereLogoIds(parsed.logoIds, allowed, fallback),
    particleCount: clampFxCount(parsed.particleCount, 28),
    logoCount: clampLogoCount(parsed.logoCount, 4),
    gridOpacity: clampFxPct(parsed.gridOpacity, 16),
    gridSize: clampFxSize(parsed.gridSize, 100),
    particleSize: clampFxSize(parsed.particleSize, 100),
    logoSize: clampFxSize(parsed.logoSize, 100),
    particleSpeed: clampFxSize(parsed.particleSpeed, 100),
    logoSpeed: clampFxSize(parsed.logoSpeed, 100),
    patterns: clampAtmospherePatterns(parsed.patterns),
    patternLayer: parsed.patternLayer === 'behind' ? 'behind' : 'above',
  };
}

function atmospherePageFromPath(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'home';
  if (p === '/store') return 'store';
  if (p.startsWith('/product/')) return 'product';
  if (p.startsWith('/seller/')) return 'seller';
  if (p.startsWith('/checkout/')) return 'checkout';
  if (p === '/about' || p === '/privacy') return 'about';
  return 'other';
}

const d = parseProductDetailFx('');
assert.equal(d.pages.home, true);
assert.equal(d.pages.checkout, false);
assert.equal(d.pages.seller, false);
assert.equal(d.pages.footer, false);
assert.equal(d.pages.drawer, false);
assert.equal(d.pages.heroWelcome, false);
assert.equal(d.pageLayers.product.grid, true);
assert.equal(
  parseProductDetailFx(
    JSON.stringify({ pageLayers: { seller: { grid: true, particles: false, logo: false } } }),
  ).pageLayers.seller.particles,
  false,
);
assert.deepEqual(
  resolveAtmosphereLayers(
    {
      grid: true,
      particles: true,
      logo: true,
      pageLayers: {
        ...defaultPageLayers(),
        product: { grid: false, particles: true, logo: false },
      },
    },
    'product',
  ),
  { grid: false, particles: true, logo: false },
);
assert.equal(parseProductDetailFx('{"pages":{"footer":true,"drawer":true}}').pages.footer, true);
assert.equal(parseProductDetailFx('{"pages":{"footer":true,"drawer":true}}').pages.drawer, true);
assert.deepEqual(d.logoIds, DEFAULT_LOGOS);
assert.equal(parseProductDetailFx('{"enabled":false,"pages":{"checkout":true}}').pages.checkout, true);
assert.deepEqual(
  parseProductDetailFx('{"logoIds":["fortnite","nope"]}').logoIds,
  ['fortnite'],
);
assert.equal(atmospherePageFromPath('/product/fortnie'), 'product');
assert.equal(atmospherePageFromPath('/seller/ivygood'), 'seller');
assert.equal(atmospherePageFromPath('/store'), 'store');
assert.equal(parseProductDetailFx('{"gridSize":10,"particleSize":999,"logoSize":100}').gridSize, 25);
assert.equal(parseProductDetailFx('{"gridSize":10,"particleSize":999}').particleSize, 250);
assert.equal(parseProductDetailFx('{"logoSize":150}').logoSize, 150);
assert.equal(parseProductDetailFx('{"logoCount":99}').logoCount, 12);
assert.equal(parseProductDetailFx('{"particleSpeed":10}').particleSpeed, 25);
assert.deepEqual(
  parseProductDetailFx('{"patterns":["dots","nope","diagonal"]}').patterns,
  ['dots', 'diagonal'],
);
assert.deepEqual(parseProductDetailFx('{"patterns":[]}').patterns, ['lines']);
assert.equal(parseProductDetailFx('{"patternLayer":"behind"}').patternLayer, 'behind');
assert.equal(parseProductDetailFx('{"patternLayer":"nope"}').patternLayer, 'above');
assert.equal(
  parseProductDetailFx(
    JSON.stringify({
      customLogos: [{ id: 'custom-1', src: 'https://cdn.example/logo.png', labelEn: 'Real' }],
      logoIds: ['custom-1'],
    }),
  ).customLogos.length,
  1,
);
assert.deepEqual(
  parseProductDetailFx(
    JSON.stringify({
      customLogos: [{ id: 'custom-1', src: 'https://cdn.example/logo.png', labelEn: 'Real' }],
      logoIds: ['custom-1', 'nope'],
    }),
  ).logoIds,
  ['custom-1'],
);
assert.equal(
  parseProductDetailFx(
    JSON.stringify({
      customLogos: [{ id: 'bad', src: 'javascript:alert(1)' }],
    }),
  ).customLogos.length,
  0,
);

for (const id of ALLOWED) {
  assert.ok(existsSync(join(root, 'public/atmosphere-logos', `${id}.svg`)), id);
}

const layout = readFileSync(join(root, 'src/layouts/MainLayout.tsx'), 'utf8');
assert.match(layout, /SiteAtmosphere/);
assert.doesNotMatch(
  readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8'),
  /ProductDetailAtmosphere/,
);

const atm = readFileSync(join(root, 'src/components/layout/SiteAtmosphere.tsx'), 'utf8');
assert.match(atm, /pdp-fx--over/);
assert.match(atm, /pdp-fx--under/);
assert.match(atm, /pdp-fx__pattern--/);
assert.match(atm, /patternLayer/);
assert.match(atm, /atm-pattern-behind/);
assert.match(atm, /resolveAtmosphereLayers/);
assert.match(atm, /atm-solid-footer/);
assert.match(atm, /atm-solid-drawer/);
assert.match(atm, /atm-chrome-hero/);
assert.match(atm, /HeroWelcomeAtmosphere/);
assert.match(atm, /resolveHeroWelcomeLayers/);
assert.match(atm, /preferUnder/);
assert.match(atm, /pageKey === 'product'/);
assert.match(atm, /pdp-fx--contained/);
assert.doesNotMatch(atm, /pages\.home \|\| !config\.pages\.heroWelcome/);

const pdp = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.match(pdp, /product-showcase-stage/);
assert.match(pdp, /ProductVideoPlayer/);

const home = readFileSync(join(root, 'src/pages/HomePage.tsx'), 'utf8');
assert.match(home, /HeroWelcomeAtmosphere/);
assert.match(home, /parseHeroEnabled/);
assert.match(home, /parseHeroBackdropEnabled/);
assert.match(home, /heroEnabled/);
assert.match(home, /heroBackdropEnabled/);
assert.match(home, /hero-welcome-card/);
assert.match(home, /HeroMediaBackdrop/);

const settingsLib = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.match(settingsLib, /chromeLayers/);
assert.match(settingsLib, /resolveHeroWelcomeLayers/);
assert.match(settingsLib, /parseHeroEnabled/);
assert.match(settingsLib, /hero_enabled/);
assert.match(settingsLib, /parseHeroBackdropEnabled/);
assert.match(settingsLib, /hero_backdrop_enabled/);

const css = readFileSync(join(root, 'src/index.css'), 'utf8');
assert.match(css, /\.pdp-fx__pattern--dots/);
assert.match(css, /\.pdp-fx__pattern--diagonal/);
assert.match(css, /pdp-fx-drift-logo/);
assert.match(css, /atm-pattern-behind/);
assert.match(css, /atm-solid-footer/);
assert.match(css, /atm-chrome-drawer/);
assert.match(css, /atm-chrome-hero/);
assert.match(css, /pdp-fx--contained/);
assert.match(css, /product-showcase-stage/);
assert.match(css, /z-index:\s*25/);

const sql = readFileSync(
  join(root, 'supabase/migrations/20260712220000_product_atmosphere_logo_ids.sql'),
  'utf8',
);
assert.match(sql, /atmosphere_logo_ids/);

console.log('check-product-detail-fx: ok');
