/** Mirrors src/lib/mediaUrl.ts — fails if sniffing logic drifts. */
import { strict as assert } from 'node:assert';

function isVideoUrl(url) {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

assert.ok(isVideoUrl('https://x/a.mp4') === true, 'mp4');
assert.ok(isVideoUrl('https://x/a.MP4?v=1') === true, 'mp4 query');
assert.ok(isVideoUrl('https://x/a.gif') === false, 'gif is image');
assert.ok(isVideoUrl('https://x/a.webp') === false, 'webp');

function uniqueUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    const url = String(raw).trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function matchesMediaFilter(url, filter) {
  if (filter === 'any') return true;
  const video = isVideoUrl(url);
  if (filter === 'video') return video || /\.gif(\?|#|$)/i.test(url);
  return !video;
}

assert.ok(uniqueUrls([' a ', 'a', '', 'b']).join(',') === 'a,b', 'unique');
assert.ok(matchesMediaFilter('https://x/a.mp4', 'image') === false, 'image filter');
assert.ok(matchesMediaFilter('https://x/a.gif', 'video') === true, 'gif as showcase');
assert.ok(matchesMediaFilter('https://x/a.png', 'image') === true, 'png image');

function storageImageUrl(url, width, quality = 75) {
  if (!url || width <= 0) return url;
  if (/\.(gif|svg)(\?|#|$)/i.test(url)) return url;
  const m = url.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/i);
  if (!m) return url;
  const q = new URLSearchParams({
    width: String(Math.round(width)),
    resize: 'contain',
    quality: String(quality),
  });
  return `${m[1]}/storage/v1/render/image/public/${m[2]}?${q}`;
}

assert.ok(
  storageImageUrl('https://cdn.example/x.jpg', 400) === 'https://cdn.example/x.jpg',
  'non-storage passthrough',
);
assert.ok(
  storageImageUrl('https://abc.supabase.co/storage/v1/object/public/bucket/a.jpg', 400).includes(
    '/render/image/public/bucket/a.jpg?width=400',
  ),
  'storage transform',
);
assert.ok(
  storageImageUrl('https://abc.supabase.co/storage/v1/object/public/bucket/a.gif', 400).endsWith('/a.gif'),
  'gif skips transform',
);

function storageImageSrcSet(url, widths, quality = 75) {
  const uniq = [...new Set(widths.map((w) => Math.round(w)).filter((w) => w > 0))].sort(
    (a, b) => a - b,
  );
  return uniq
    .map((w) => {
      const href = storageImageUrl(url, w, quality);
      return href === url ? '' : `${href} ${w}w`;
    })
    .filter(Boolean)
    .join(', ');
}

const srcset = storageImageSrcSet(
  'https://abc.supabase.co/storage/v1/object/public/bucket/a.jpg',
  [320, 640],
);
assert.ok(srcset.includes('320w') && srcset.includes('640w'), 'srcset widths');
assert.ok(storageImageSrcSet('https://cdn.example/x.jpg', [320]) === '', 'srcset non-storage empty');

console.log('mediaUrl ok');
