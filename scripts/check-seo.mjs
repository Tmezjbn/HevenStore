/**
 * Phase 6 SEO invariants — empty titles gone, sitemap present, head helper wired.
 * Run: node scripts/check-seo.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
assert.match(html, /<title>[^<]+<\/title>/, 'index.html title must be non-empty');
assert.match(html, /property="og:title" content="[^"]+"/, 'og:title must be non-empty');
assert.match(html, /name="twitter:title" content="[^"]+"/, 'twitter:title must be non-empty');
assert.match(html, /rel="canonical"/, 'index.html needs a canonical link');

assert.ok(fs.existsSync(path.join(root, 'public/sitemap.xml')), 'public/sitemap.xml missing');
const sitemap = read('public/sitemap.xml');
assert.match(sitemap, /https:\/\/heven\.fun\//, 'sitemap needs absolute heven.fun URLs');
assert.match(sitemap, /\/updates/, 'sitemap should list /updates (not /changelog)');
assert.doesNotMatch(sitemap, /\/changelog/, 'sitemap must not list retired /changelog');

const robots = read('public/robots.txt');
assert.match(robots, /Sitemap:\s*https:\/\/heven\.fun\/sitemap\.xml/, 'robots.txt sitemap must be absolute');

assert.match(html, /og:image" content="https:\/\/heven\.fun\/og-image\.png"/, 'og:image must be brand card');
assert.match(html, /twitter:image" content="https:\/\/heven\.fun\/og-image\.png"/, 'twitter:image must match');
assert.match(html, /application\/ld\+json/, 'index.html needs Organization/WebSite JSON-LD');
assert.doesNotMatch(html, /og:image" content="[^"]*favicon\.svg"/, 'og:image must not be favicon');
assert.ok(fs.existsSync(path.join(root, 'public/og-image.png')), 'public/og-image.png missing');

const hook = read('src/hooks/usePageMeta.ts');
assert.match(hook, /export function usePageMeta/, 'usePageMeta hook missing');
assert.match(hook, /canonical/, 'usePageMeta must set canonical');
assert.match(hook, /og:title/, 'usePageMeta must set og:title');
assert.match(hook, /og-image\.png/, 'usePageMeta must default to og-image.png');
assert.match(hook, /upsertHreflang\('ar'/, 'usePageMeta must set hreflang ar');
assert.match(hook, /upsertHreflang\('en'/, 'usePageMeta must set hreflang en');
assert.match(hook, /upsertHreflang\('x-default'/, 'usePageMeta must set hreflang x-default');
assert.match(hook, /no \/ar\|\/en paths/, 'usePageMeta must document same-URL locale decision');

const catalog = read('src/hooks/useCatalog.ts');
assert.match(catalog, /fetchActiveProductsPaged|\.range\(/, 'useProducts must page with range');
assert.match(catalog, /hardCap/, 'catalog fetch must name a hardCap ceiling');
assert.doesNotMatch(catalog, /limit \?\? 500/, 'useProducts must not hard-stop at 500');

const appearance = read('src/components/appearance/AppearanceProvider.tsx');
assert.doesNotMatch(
  appearance,
  /document\.title\s*=/,
  'AppearanceProvider must not fight usePageMeta over document.title',
);

for (const file of [
  'src/pages/HomePage.tsx',
  'src/pages/GamesPage.tsx',
  'src/pages/ProductDetailPage.tsx',
  'src/pages/AboutPage.tsx',
]) {
  assert.match(read(file), /usePageMeta/, `${file} should call usePageMeta`);
}

assert.ok(fs.existsSync(path.join(root, 'scripts/prerender.mjs')), 'scripts/prerender.mjs missing');
const prerender = read('scripts/prerender.mjs');
assert.match(prerender, /function escapeHtml/, 'prerender must define escapeHtml');
assert.match(prerender, /&amp;/, 'prerender escapeHtml must escape amp');
assert.match(
  prerender,
  /id, slug, name, name_ar, description, description_ar, thumbnail_url, price, stock/,
  'prerender product select must include SEO cols',
);
assert.match(prerender, /\.eq\('status',\s*'active'\)/, 'prerender must fetch active products');
assert.match(prerender, /heven-product-jsonld/, 'prerender must inject Product JSON-LD');
assert.match(prerender, /'@type': 'Brand'/, 'prerender Product JSON-LD must include Brand');
assert.match(prerender, /\/store/, 'prerender must cover /store');
assert.match(prerender, /\/updates/, 'prerender must cover /updates');

const pdp = read('src/pages/ProductDetailPage.tsx');
assert.match(pdp, /'@type': 'Brand'/, 'PDP Product JSON-LD must include Brand');
assert.match(pdp, /url: pageUrl/, 'PDP Product JSON-LD must set product url');

const sitemapScript = read('scripts/generate-sitemap.mjs');
assert.match(sitemapScript, /loadEnvFile/, 'sitemap must load repo .env for local node builds');
assert.match(sitemapScript, /\.eq\('status',\s*'active'\)/, 'sitemap must fetch active products');
assert.match(sitemapScript, /\/product\//, 'sitemap must emit product URLs');
assert.match(read('scripts/prerender.mjs'), /loadEnvFile/, 'prerender must load repo .env for local node builds');
// SEO-1: env present + 0 products must fail the build unless ALLOW_EMPTY_SITEMAP=1
assert.match(
  sitemapScript,
  /ALLOW_EMPTY_SITEMAP/,
  'generate-sitemap must honor ALLOW_EMPTY_SITEMAP escape hatch',
);
assert.match(
  sitemapScript,
  /productRows\.length\s*===\s*0/,
  'generate-sitemap must gate on zero products when env present',
);
assert.match(
  sitemapScript,
  /process\.exit\(1\)/,
  'generate-sitemap must exit(1) on empty product sitemap with env',
);
assert.match(
  sitemapScript,
  /no Supabase env — writing static routes only/,
  'generate-sitemap must stay quiet when Supabase env is absent',
);

const pkg = JSON.parse(read('package.json'));
assert.match(String(pkg.scripts?.prerender ?? ''), /prerender\.mjs/, 'package.json prerender script missing');
assert.match(
  String(pkg.scripts?.build ?? ''),
  /generate-sitemap\.mjs/,
  'npm run build must run generate-sitemap before vite',
);
assert.match(
  String(pkg.scripts?.build ?? ''),
  /prerender\.mjs/,
  'npm run build must chain prerender.mjs',
);

console.log('check-seo: ok');
