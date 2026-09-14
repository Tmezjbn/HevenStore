/**
 * Build-time head/meta shells for static routes + active product PDPs.
 * Run after `vite build`. Missing Supabase env → static shells only.
 *
 *   node scripts/prerender.mjs
 *   (also chained from `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from './load-env.mjs';

loadEnvFile();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ORIGIN = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  'https://heven.fun'
).replace(/\/$/, '');

const DEFAULT_OG = `${ORIGIN}/og-image.png`;
const DEFAULT_TITLE = 'HEVEN.FUN — FUN MORE. PAY LESS.';
const DEFAULT_DESC =
  'HEVEN.FUN - وجهتك الأولى للألعاب الرقمية والاشتراكات المميزة بأفضل الأسعار. Games, subscriptions, and digital keys — more fun, less spend.';

/** @type {[string, string, string][]} path, title, description */
const STATIC = [
  ['/', DEFAULT_TITLE, DEFAULT_DESC],
  [
    '/store',
    'Store — HEVEN.FUN',
    'Browse games, subscriptions, and digital keys on HEVEN.FUN.',
  ],
  [
    '/subscriptions',
    'Subscriptions — HEVEN.FUN',
    'Digital subscriptions at fair prices on HEVEN.FUN.',
  ],
  [
    '/gift-cards',
    'Gift Cards — HEVEN.FUN',
    'Gift cards and prepaid digital credit on HEVEN.FUN.',
  ],
  [
    '/about',
    'About — HEVEN.FUN',
    'About HEVEN.FUN — bilingual digital entertainment storefront.',
  ],
  [
    '/privacy',
    'Privacy — HEVEN.FUN',
    'Privacy policy for HEVEN.FUN.',
  ],
  [
    '/terms',
    'Terms — HEVEN.FUN',
    'Terms of use for HEVEN.FUN.',
  ],
  [
    '/updates',
    'Updates — HEVEN.FUN',
    'Store updates and changelogs from HEVEN.FUN.',
  ],
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

if (escapeHtml('a<"&\'>') !== 'a&lt;&quot;&amp;&#39;&gt;') {
  throw new Error('prerender: escapeHtml self-check failed');
}

function absUrl(u, origin = ORIGIN) {
  if (!u) return DEFAULT_OG;
  const t = String(u).trim();
  if (!t) return DEFAULT_OG;
  if (/^https?:\/\//i.test(t)) return t;
  return `${origin}${t.startsWith('/') ? '' : '/'}${t}`;
}

function setTitle(html, title) {
  const safe = escapeHtml(title);
  if (/<title>[^<]*<\/title>/.test(html)) {
    return html.replace(/<title>[^<]*<\/title>/, `<title>${safe}</title>`);
  }
  return html.replace('</head>', `<title>${safe}</title>\n</head>`);
}

function setMeta(html, attr, key, content) {
  const safe = escapeHtml(content);
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, 'i');
  if (re.test(html)) return html.replace(re, `$1${safe}$2`);
  return html.replace(
    '</head>',
    `<meta ${attr}="${key}" content="${safe}" />\n</head>`,
  );
}

function setCanonical(html, href) {
  const safe = escapeHtml(href);
  const re = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i;
  if (re.test(html)) return html.replace(re, `$1${safe}$2`);
  return html.replace('</head>', `<link rel="canonical" href="${safe}" />\n</head>`);
}

function upsertProductJsonLd(html, data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const block = `<script type="application/ld+json" id="heven-product-jsonld">${json}</script>`;
  if (/id="heven-product-jsonld"/.test(html)) {
    return html.replace(
      /<script type="application\/ld\+json" id="heven-product-jsonld">[\s\S]*?<\/script>/,
      block,
    );
  }
  return html.replace('</head>', `${block}\n</head>`);
}

function applyHead(html, { title, description, url, image, ogType = 'website' }) {
  let out = html;
  out = setTitle(out, title);
  out = setMeta(out, 'name', 'description', description);
  out = setCanonical(out, url);
  out = setMeta(out, 'property', 'og:title', title);
  out = setMeta(out, 'property', 'og:description', description);
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'property', 'og:image', image);
  out = setMeta(out, 'property', 'og:type', ogType);
  out = setMeta(out, 'name', 'twitter:title', title);
  out = setMeta(out, 'name', 'twitter:description', description);
  out = setMeta(out, 'name', 'twitter:image', image);
  return out;
}

function outPathForRoute(routePath) {
  if (routePath === '/') return path.join(dist, 'index.html');
  const parts = routePath.replace(/^\//, '').split('/');
  return path.join(dist, ...parts, 'index.html');
}

function writeShell(routePath, html) {
  const file = outPathForRoute(routePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
}

function productLd(p, origin) {
  const name = (p.name_ar && String(p.name_ar).trim()) || p.name;
  const description =
    (p.description_ar && String(p.description_ar).trim()) ||
    p.description ||
    undefined;
  const image = p.thumbnail_url ? absUrl(p.thumbnail_url, origin) : undefined;
  const pageUrl = `${origin}/product/${p.slug}`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: pageUrl,
    image: image ? [image] : undefined,
    sku: p.id,
    brand: { '@type': 'Brand', name: 'HEVEN.FUN' },
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'USD',
      price: Number(p.price).toFixed(2),
      availability:
        Number(p.stock) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };
  if (Number(p.review_count) > 0 && Number(p.rating) > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.review_count,
    };
  }
  return data;
}

const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('prerender: dist/index.html missing — run vite build first');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexPath, 'utf8');

let staticCount = 0;
for (const [routePath, title, description] of STATIC) {
  const url = `${ORIGIN}${routePath === '/' ? '/' : routePath}`;
  const html = applyHead(baseHtml, {
    title,
    description,
    url,
    image: DEFAULT_OG,
  });
  writeShell(routePath, html);
  staticCount += 1;
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let productCount = 0;
if (url && key) {
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from('products')
    .select(
      'id, slug, name, name_ar, description, description_ar, thumbnail_url, price, stock, rating, review_count',
    )
    .eq('status', 'active')
    .not('slug', 'is', null)
    .limit(2000);
  if (error) {
    console.warn('prerender: product query failed — static only:', error.message);
  } else {
    for (const p of data ?? []) {
      const slug = String(p.slug || '').trim();
      // Slug becomes a filesystem path — only the editor's slugify charset is
      // safe ('..' / '/' via a direct API write must not escape dist/).
      if (!/^[\p{L}\p{N}][\p{L}\p{N}-]*$/u.test(slug)) {
        console.warn(`prerender: skipping unsafe slug ${JSON.stringify(slug)}`);
        continue;
      }
      const titleName = (p.name_ar && String(p.name_ar).trim()) || p.name || slug;
      const title = `${titleName} — HEVEN.FUN`;
      const description =
        (p.description_ar && String(p.description_ar).trim()) ||
        (p.description && String(p.description).trim()) ||
        DEFAULT_DESC;
      const pageUrl = `${ORIGIN}/product/${encodeURIComponent(slug)}`;
      const image = absUrl(p.thumbnail_url);
      let html = applyHead(baseHtml, {
        title,
        description: description.slice(0, 300),
        url: pageUrl,
        image,
        ogType: 'website',
      });
      html = upsertProductJsonLd(html, productLd(p, ORIGIN));
      writeShell(`/product/${slug}`, html);
      productCount += 1;
    }
  }
} else {
  console.warn('prerender: no Supabase env — static route shells only');
}

console.log(`prerender: ${staticCount} static + ${productCount} products → ${dist}`);
