/**
 * Embed classification + Resources library wiring.
 * Run: node scripts/check-media-resources.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function isProgressiveVideoUrl(url) {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}
function isStillImageUrl(url) {
  return /\.(png|jpe?g|webp|svg|avif|gif)(\?|#|$)/i.test(url);
}
function youtubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      return u.pathname.slice(1).split('/')[0] || null;
    }
    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com')
    ) {
      const seg = u.pathname.split('/').filter(Boolean);
      if (seg[0] === 'embed' || seg[0] === 'shorts' || seg[0] === 'live') return seg[1] || null;
      return u.searchParams.get('v');
    }
  } catch {
    /* ignore */
  }
  return null;
}
function vimeoId(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('vimeo.com')) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
function isGenericEmbedUrl(url) {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (youtubeId(url) || vimeoId(url)) return false;
    if (isProgressiveVideoUrl(url) || isStillImageUrl(url)) return false;
    return true;
  } catch {
    return false;
  }
}
function classifyMediaUrl(url) {
  const raw = url.trim();
  if (isStillImageUrl(raw) && !isProgressiveVideoUrl(raw)) {
    try {
      const u = new URL(raw);
      if (u.pathname.includes('/storage/v1/object/public/')) return 'image';
    } catch {
      /* fall through */
    }
    return 'embed_image';
  }
  if (isProgressiveVideoUrl(raw)) return 'video_file';
  if (youtubeId(raw) || vimeoId(raw) || isGenericEmbedUrl(raw)) return 'embed_video';
  return 'embed_video';
}

assert.equal(isGenericEmbedUrl('https://bysevepoin.com/e/k25jp4m7xnvs'), true);
assert.equal(isGenericEmbedUrl('https://cdn.example.com/clip.mp4'), false);
assert.equal(isGenericEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
assert.equal(classifyMediaUrl('https://bysevepoin.com/e/k25jp4m7xnvs'), 'embed_video');
assert.equal(classifyMediaUrl('https://cdn.example.com/clip.mp4'), 'video_file');
assert.equal(
  classifyMediaUrl('https://abc.supabase.co/storage/v1/object/public/bucket/a.jpg'),
  'image',
);

const embed = read('src/lib/videoEmbed.ts');
assert.match(embed, /export function isGenericEmbedUrl/);
assert.match(embed, /export function classifyMediaUrl/);

const player = read('src/components/ui/ProductVideoPlayer.tsx');
assert.match(player, /isGenericEmbedUrl/);
assert.match(player, /iframeEmbed/);
// Generic HTTPS embeds are HTML pages: they must take the iframe path, never <video>/Plyr.
assert.match(player, /const iframeEmbed = [^\n]*isGenericEmbedUrl\(src\)/);
assert.match(player, /const isFile = [^\n]*!iframeEmbed/);
assert.match(player, /const usePlyr =[\s\S]{0,240}?!iframeEmbed;/);

const headers = read('public/_headers');
const vercel = read('vercel.json');
assert.match(headers, /frame-src 'self' https:/);
assert.match(vercel, /frame-src 'self' https:/);

const mig = read('supabase/migrations/20260720220000_media_resources.sql');
assert.match(mig, /CREATE TABLE IF NOT EXISTS public\.media_resources/);
assert.match(mig, /embed_video/);
assert.match(mig, /media_resources_select_editors/);

const helpers = read('src/lib/mediaResources.ts');
assert.match(helpers, /upsertMediaResource/);
assert.match(helpers, /listMediaResources/);
assert.match(helpers, /media_resources/);

const editor = read('src/pages/dashboard/ProductEditorPage.tsx');
assert.match(editor, /upsertMediaResource/);
assert.match(editor, /applyEmbedDraft/);
// Pasted embed URL must land in Resources — bounded to the handler body, not any later upsert.
assert.match(
  editor,
  /const applyEmbedDraft = (?:(?!\n {2}const )[\s\S])*?upsertMediaResource\(href\)/,
  'applyEmbedDraft must upsert the pasted embed into Resources',
);
assert.match(editor, /Get from resources/);
assert.match(editor, /Embedded vids/);
assert.match(editor, /resourceSort/);
assert.match(editor, /matchesResourceSort/);
assert.match(editor, /listMediaResources/);

const css = read('src/styles/product-editor.css');
assert.match(css, /\.pe-media__resources-link/);
assert.match(css, /\.pe-media__resource-chip/);

console.log('check-media-resources: ok');
