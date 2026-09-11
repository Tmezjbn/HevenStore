import { supabase } from './supabase';
import { classifyMediaUrl, type MediaResourceKind } from './videoEmbed';

export type MediaResource = {
  id: string;
  url: string;
  kind: MediaResourceKind;
  created_at: string;
};

const LIST_CAP = 200;

/** Insert or keep existing URL in Resources (dedupe by UNIQUE url). */
export async function upsertMediaResource(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  let normalized = trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    normalized = u.toString();
  } catch {
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;
  const kind = classifyMediaUrl(normalized);
  const { error } = await supabase.from('media_resources').upsert(
    { url: normalized, kind, created_by: user.id },
    { onConflict: 'url', ignoreDuplicates: true },
  );
  if (error) console.warn('upsertMediaResource', error.message);
}

export async function listMediaResources(): Promise<MediaResource[]> {
  const { data, error } = await supabase
    .from('media_resources')
    .select('id, url, kind, created_at')
    .order('created_at', { ascending: false })
    .limit(LIST_CAP);
  if (error) {
    console.warn('listMediaResources', error.message);
    return [];
  }
  return (data ?? []) as MediaResource[];
}

