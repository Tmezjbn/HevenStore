import { parseRequirements } from '../../../lib/productRequirements';
import { emptyVideoEmbeds, normalizeVideoEmbeds, resolveDefaultVideoUrl, type VideoEmbeds } from '../../../lib/videoEmbeds';
import { Product } from '../../../types';
import { parseDeliveryPreset, type DeliveryPreset } from '../../../lib/productDelivery';
import { DEFAULT_VIDEO_AUTOPLAY, DEFAULT_VIDEO_VOLUME, clampVideoVolume } from '../../../lib/videoPlayback';
import { ATMOSPHERE_LOGO_IDS } from '../../../lib/atmosphereLogos';
import { normalizeCardFx, type ProductCardFx } from '../../../lib/productCardFx';
import { KeyOverride, PendingStock } from './stockHelpers';

export type SecretField = { id: string; key: string; value: string };

export interface ProductForm {
  name: string;
  name_ar: string;
  slug: string;
  description: string;
  description_ar: string;
  price: string;
  original_price: string;
  category_id: string;
  stock: string;
  status: Product['status'];
  oos_message: 'out_of_stock' | 'not_available';
  delivery_preset: DeliveryPreset;
  delivery_custom_en: string;
  delivery_custom_ar: string;
  thumbnail_url: string;
  ad_banner_url: string;
  hover_image_url: string;
  hero_backdrop_url: string;
  video_url: string;
  /** Up to 3 embeds × ads/no-ads (+ defaults). video_url = resolved default. */
  video_embeds: VideoEmbeds;
  /** When false, PDP never loads showcase embeds (privacy default). */
  video_enabled: boolean;
  /** Showcase autoplay (default on). */
  video_autoplay: boolean;
  /** Showcase volume 0–100 (default 25). */
  video_volume: number;
  galleryUrls: string[];
  product_type: string;
  secretDetails: string;
  secretFields: SecretField[];
  requirementFields: SecretField[];
  seller_id: string;
  show_seller_name: boolean;
  /** Staff who “added” the product (delete lock). Owner may reassign. */
  created_by: string;
  /** Default stars until buyers review (1–5). */
  rating_seed: string;
  /** Optional atmosphere game icons; empty = site default. */
  atmosphere_logo_ids: string[];
  /** Card-body FX (matrix / logo / …). */
  card_fx: ProductCardFx;
}

let fieldSeq = 0;
export function newField(key = '', value = ''): SecretField {
  fieldSeq += 1;
  return { id: `f-${fieldSeq}`, key, value };
}

export function serializeFields(fields: SecretField[]): string {
  return fields
    .filter((f) => f.key.trim() || f.value.trim())
    .map((f) => `${f.key.trim() || 'Value'}: ${f.value}`)
    .join('\n');
}

export function parseFields(valueLines: string): SecretField[] {
  const lines = valueLines.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return lines.map((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return newField('', line);
    return newField(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
  });
}

export const EMPTY_FORM: ProductForm = {
  name: '',
  name_ar: '',
  slug: '',
  description: '',
  description_ar: '',
  price: '',
  original_price: '',
  category_id: '',
  stock: '0',
  status: 'draft',
  oos_message: 'out_of_stock',
  delivery_preset: 'instant',
  delivery_custom_en: '',
  delivery_custom_ar: '',
  thumbnail_url: '',
  ad_banner_url: '',
  hover_image_url: '',
  hero_backdrop_url: '',
  video_url: '',
  video_embeds: emptyVideoEmbeds(),
  video_enabled: false,
  video_autoplay: DEFAULT_VIDEO_AUTOPLAY,
  video_volume: DEFAULT_VIDEO_VOLUME,
  galleryUrls: [],
  product_type: 'other',
  secretDetails: '',
  secretFields: [],
  requirementFields: [],
  seller_id: '',
  show_seller_name: true,
  created_by: '',
  rating_seed: '5',
  atmosphere_logo_ids: [],
  card_fx: { style: 'none' },
};

/** Snapshot for dirty check — strip ephemeral field ids. */
export function editorSnapshot(
  form: ProductForm,
  pendingStock: PendingStock[] = [],
  keyOverrides: KeyOverride[] = [],
): string {
  return JSON.stringify({
    ...form,
    secretFields: form.secretFields.map((f) => ({ key: f.key, value: f.value })),
    requirementFields: form.requirementFields.map((f) => ({ key: f.key, value: f.value })),
    pendingStock: pendingStock.map((k) => ({
      content: k.content,
      secretDetails: k.secretDetails,
      secretFields: k.secretFields.map((f) => ({ key: f.key, value: f.value })),
    })),
    keyOverrides: keyOverrides.map((k) => ({
      id: k.id,
      content: k.content,
      secretDetails: k.secretDetails,
      secretFields: k.secretFields.map((f) => ({ key: f.key, value: f.value })),
    })),
  });
}

export function buildFormFromProduct(
  product: Product,
  opts: { isSeller: boolean; userId?: string | null },
): ProductForm {
  return {
    name: product.name,
    name_ar: product.name_ar || '',
    slug: product.slug,
    description: product.description || '',
    description_ar: product.description_ar || '',
    price: String(product.price),
    original_price: product.original_price ? String(product.original_price) : '',
    category_id: product.category_id || '',
    stock: String(product.stock),
    status: product.status,
    oos_message: product.oos_message === 'not_available' ? 'not_available' : 'out_of_stock',
    delivery_preset: parseDeliveryPreset(product.delivery_preset),
    delivery_custom_en: product.delivery_custom_en || '',
    delivery_custom_ar: product.delivery_custom_ar || '',
    thumbnail_url: product.thumbnail_url || '',
    ad_banner_url: product.ad_banner_url || '',
    hover_image_url: product.hover_image_url || '',
    hero_backdrop_url: product.hero_backdrop_url || '',
    ...(() => {
      const video_embeds = normalizeVideoEmbeds(product.video_embeds, product.video_url);
      return {
        video_embeds,
        video_url: resolveDefaultVideoUrl(video_embeds) || product.video_url || '',
      };
    })(),
    video_enabled: product.video_enabled === true,
    video_autoplay: product.video_autoplay !== false,
    video_volume: clampVideoVolume(product.video_volume),
    galleryUrls: [],
    product_type: product.product_type || 'other',
    secretDetails: '',
    secretFields: [],
    requirementFields: parseRequirements(product.requirements).map((r) =>
      newField(r.label, r.value),
    ),
    seller_id: product.seller_id || (opts.isSeller && opts.userId ? opts.userId : ''),
    show_seller_name: opts.isSeller ? true : product.show_seller_name !== false,
    created_by: product.created_by ?? '',
    rating_seed: String(
      product.rating_seed ?? (product.review_count === 0 ? product.rating || 5 : 5),
    ),
    atmosphere_logo_ids: Array.isArray(product.atmosphere_logo_ids)
      ? product.atmosphere_logo_ids.filter((id) =>
          ATMOSPHERE_LOGO_IDS.includes(id as (typeof ATMOSPHERE_LOGO_IDS)[number]),
        )
      : [],
    card_fx: normalizeCardFx(product.card_fx),
  };
}


export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** Old edit bookmarks used UUID; prefer slug in the URL. */
export function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
