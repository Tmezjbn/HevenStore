import { isProgressiveVideoUrl } from './videoEmbed';

/** True when URL path looks like a playable video (mp4/webm/mov). GIF stays an image. */
export function isVideoUrl(url: string): boolean {
  return isProgressiveVideoUrl(url);
}

/**
 * Supabase Storage image transform when the URL is a public object.
 * Falls through unchanged for non-storage URLs (external CDNs, data URIs).
 * Requires Image Transformations enabled on the project (Pro+) and
 * `VITE_SUPABASE_IMAGE_TRANSFORM=true`.
 */
export function storageImageUrl(url: string, width: number, quality = 75): string {
  if (!url || width <= 0) return url;
  // Animated GIF / SVG: transform flattens or breaks — keep original.
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

export function imageTransformsEnabled(): boolean {
  return import.meta.env.VITE_SUPABASE_IMAGE_TRANSFORM === 'true';
}

/** `srcset` candidates (e.g. 320/640/960). Empty string if transforms off / non-storage. */
export function storageImageSrcSet(
  url: string,
  widths: number[],
  quality = 75,
): string {
  if (!imageTransformsEnabled() || !url) return '';
  const uniq = [...new Set(widths.map((w) => Math.round(w)).filter((w) => w > 0))].sort(
    (a, b) => a - b,
  );
  const parts = uniq
    .map((w) => {
      const href = storageImageUrl(url, w, quality);
      return href === url ? '' : `${href} ${w}w`;
    })
    .filter(Boolean);
  return parts.join(', ');
}
