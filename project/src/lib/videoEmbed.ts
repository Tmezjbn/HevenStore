/** Progressive file URLs (mp4/webm/mov). GIF stays an image. */
export function isProgressiveVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

export function isStillImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|svg|avif|gif)(\?|#|$)/i.test(url);
}

export function youtubeId(url: string): string | null {
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

export function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('vimeo.com')) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** https page that is not YT/Vimeo/file/image — iframe host (e.g. /e/… embedders). */
export function isGenericEmbedUrl(url: string): boolean {
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

export type MediaResourceKind = 'embed_video' | 'embed_image' | 'image' | 'video_file';

export function classifyMediaUrl(url: string): MediaResourceKind {
  const raw = url.trim();
  if (isStillImageUrl(raw) && !isProgressiveVideoUrl(raw)) {
    // External image used as showcase still → embed_image; storage images → image
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

// ponytail: ceiling = heuristic host/path classify; upgrade = allowlist + oEmbed probe
if (import.meta.env.DEV) {
  console.assert(
    isGenericEmbedUrl('https://bysevepoin.com/e/k25jp4m7xnvs'),
    'videoEmbed: generic /e/ host',
  );
  console.assert(
    !isGenericEmbedUrl('https://cdn.example.com/clip.mp4'),
    'videoEmbed: mp4 not generic',
  );
  console.assert(
    classifyMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'embed_video',
    'videoEmbed: yt kind',
  );
}
