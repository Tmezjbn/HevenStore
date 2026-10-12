export function newMediaId() {
  return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Safe storage-path extension — file names may hold spaces, Arabic, or no dot. */
export function safeExt(name: string, fallback: string): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name);
  return m ? m[1].toLowerCase() : fallback;
}

export function kindFromFile(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

export function kindFromUrl(url: string): 'image' | 'video' {
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return 'video';
  return 'image';
}

export function normalizeEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}
