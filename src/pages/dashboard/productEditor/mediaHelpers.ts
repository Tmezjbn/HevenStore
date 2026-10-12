import { supabase } from '../../../lib/supabase';
import { classifyMediaUrl } from '../../../lib/videoEmbed';
import { collectEmbedUrls, normalizeVideoEmbeds, resolveDefaultVideoUrl, type VideoEmbeds } from '../../../lib/videoEmbeds';
import { Product } from '../../../types';
import { MediaPickTarget, ResourceSort, MediaLibraryItem } from './types';
import { ProductForm } from './formModel';

export function uniqueMediaItems(items: MediaLibraryItem[]): MediaLibraryItem[] {
  const seen = new Set<string>();
  const out: MediaLibraryItem[] = [];
  for (const item of items) {
    const url = item.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, kind: item.kind });
  }
  return out;
}

export function urlsToItems(urls: string[]): MediaLibraryItem[] {
  return uniqueMediaItems(urls.map((url) => ({ url, kind: classifyMediaUrl(url) })));
}

export function collectFormMediaUrls(form: ProductForm): string[] {
  return [
    form.thumbnail_url,
    form.ad_banner_url,
    form.hover_image_url,
    form.hero_backdrop_url,
    form.video_url,
    ...collectEmbedUrls(form.video_embeds),
    ...form.galleryUrls,
  ]
    .map((u) => u.trim())
    .filter(Boolean);
}

export function syncVideoUrlFromEmbeds(embeds: VideoEmbeds): Pick<ProductForm, 'video_embeds' | 'video_url'> {
  const video_embeds = normalizeVideoEmbeds(embeds);
  return { video_embeds, video_url: resolveDefaultVideoUrl(video_embeds) || '' };
}

export function collectCatalogMediaUrls(products: Pick<Product, 'thumbnail_url' | 'ad_banner_url' | 'hover_image_url' | 'hero_backdrop_url' | 'video_url'>[]): string[] {
  const urls: string[] = [];
  for (const p of products) {
    if (p.thumbnail_url) urls.push(p.thumbnail_url);
    if (p.ad_banner_url) urls.push(p.ad_banner_url);
    if (p.hover_image_url) urls.push(p.hover_image_url);
    if (p.hero_backdrop_url) urls.push(p.hero_backdrop_url);
    if (p.video_url) urls.push(p.video_url);
  }
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

export async function fetchRecentCatalogMediaUrls(): Promise<string[]> {
  const { data } = await supabase
    .from('products')
    .select('thumbnail_url, ad_banner_url, hover_image_url, hero_backdrop_url, video_url')
    .order('created_at', { ascending: false })
    .limit(40);
  return collectCatalogMediaUrls(data ?? []);
}

export function matchesResourceSort(item: MediaLibraryItem, sort: ResourceSort): boolean {
  if (sort === 'all') return true;
  return item.kind === sort;
}

export function defaultResourceSort(target: MediaPickTarget): ResourceSort {
  if (target.kind === 'gallery') return 'image';
  if (target.kind === 'video' || target.kind === 'videoEmbed') return 'embed_video';
  return 'all';
}
