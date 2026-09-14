import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Category, Product, Profile } from '../types';
import { CATEGORY_COLS } from '../lib/dbCols';

/** Slim cols for store grids / rails — no long prose or PDP-only media. */
export const PRODUCT_CARD_COLS = [
  'id',
  'name',
  'name_ar',
  'slug',
  'price',
  'original_price',
  'thumbnail_url',
  'hover_image_url',
  'video_url',
  'video_enabled',
  'video_autoplay',
  'video_volume',
  'category_id',
  'stock',
  'status',
  'oos_message',
  'delivery_preset',
  'delivery_custom_en',
  'delivery_custom_ar',
  'rating',
  'rating_seed',
  'review_count',
  'sales_count',
  'is_featured',
  'aura_style',
  'aura_color',
  'aura_electric_json',
  'hover_3d',
  'card_fx',
  'product_type',
  'seller_id',
  'show_seller_name',
  'created_at',
  'updated_at',
].join(',');

/** Card + search prose + ads/hero media (by-ids rails, seller pages). */
export const PRODUCT_LIST_COLS = [
  PRODUCT_CARD_COLS,
  'description',
  'description_ar',
  'ad_banner_url',
  'hero_backdrop_url',
].join(',');

/** PDP / product editor — list cols + requirements + atmosphere + author + multi-embed. */
export const PRODUCT_EDITOR_COLS = `${PRODUCT_LIST_COLS},requirements,atmosphere_logo_ids,created_by,added_by,video_embeds,review_note`;

/** @deprecated alias — same as PRODUCT_EDITOR_COLS for PDP */
const PRODUCT_DETAIL_COLS = PRODUCT_EDITOR_COLS;

type SellerPublicRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role?: string | null;
};

function toPublicSeller(row: SellerPublicRow): Profile {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    email: null,
    role: (row.role as Profile['role']) || 'seller',
    is_active: true,
    show_seller_name: true,
    created_at: '',
    updated_at: '',
  };
}

/** Attach public seller profiles for cards that opt into show_seller_name. */
async function attachPublicSellers(products: Product[]): Promise<Product[]> {
  const ids = [
    ...new Set(
      products
        .filter((p) => p.seller_id && p.show_seller_name)
        .map((p) => p.seller_id as string),
    ),
  ];
  if (!ids.length) return products;

  const sellers = new Map<string, Profile>();
  const { data } = await supabase.rpc('get_sellers_public', { p_ids: ids });
  for (const row of (data ?? []) as SellerPublicRow[]) {
    if (row?.id) sellers.set(row.id, toPublicSeller(row));
  }

  return products.map((p) => {
    if (!p.seller_id || !p.show_seller_name) return p;
    const seller = sellers.get(p.seller_id);
    return seller ? { ...p, seller } : p;
  });
}

export type UseProductsOpts = {
  /** Limit to these product_type values (server-side). */
  types?: Product['product_type'][];
  /**
   * Soft page size for range fetches (default 200).
   * Keeps walking until a short page — no hard 500 ceiling.
   */
  pageSize?: number;
};

/** Fetch all active products in pages (ponytail: hardCap 5k — raise if catalog grows past that). */
async function fetchActiveProductsPaged(
  types: Product['product_type'][] | undefined,
  pageSize: number,
): Promise<Product[]> {
  const hardCap = 5000;
  const all: Product[] = [];
  for (let from = 0; from < hardCap; from += pageSize) {
    let q = supabase
      .from('products')
      .select(PRODUCT_CARD_COLS)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (types?.length) q = q.in('product_type', types);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as unknown as Product[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return attachPublicSellers(all);
}

export function useProducts(opts: UseProductsOpts = {}) {
  const types = opts.types;
  const pageSize = opts.pageSize ?? 200;
  const typesKey = types?.length ? [...types].sort().join(',') : 'all';
  return useQuery({
    queryKey: ['products', 'active', typesKey, pageSize],
    queryFn: () => fetchActiveProductsPaged(types, pageSize),
    staleTime: 1000 * 60 * 2,
  });
}

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: ['products', 'featured', limit],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_CARD_COLS)
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('sales_count', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return attachPublicSellers((data ?? []) as unknown as Product[]);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useLatestProducts(limit = 12) {
  return useQuery({
    queryKey: ['products', 'latest', limit],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_CARD_COLS)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return attachPublicSellers((data ?? []) as unknown as Product[]);
    },
    staleTime: 1000 * 60 * 2,
  });
}

/** Active products assigned directly to this category (not child categories). */
export function useProductsByCategoryId(categoryId: string | null | undefined, limit = 12) {
  return useQuery({
    queryKey: ['products', 'by-category', categoryId, limit],
    enabled: Boolean(categoryId),
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_CARD_COLS)
        .eq('status', 'active')
        .eq('category_id', categoryId as string)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return attachPublicSellers((data ?? []) as unknown as Product[]);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_COLS)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductsByIds(ids: string[]) {
  const key = ids.join(',');
  return useQuery({
    queryKey: ['products', 'by-ids', key],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_LIST_COLS)
        .eq('status', 'active')
        .in('id', ids);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Product[];
      const byId = new Map(rows.map((p) => [p.id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
      return attachPublicSellers(ordered);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_DETAIL_COLS)
        .eq('slug', slug as string)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Product;

      const { data: gallery } = await supabase
        .from('product_images')
        .select('id, product_id, url, alt_text, sort_order, created_at')
        .eq('product_id', row.id)
        .order('sort_order', { ascending: true });

      let product: Product = {
        ...row,
        images: gallery ?? [],
      };

      if (row.seller_id && row.show_seller_name) {
        const { data: sellerRows } = await supabase.rpc('get_seller_public', { p_key: row.seller_id });
        const seller = (Array.isArray(sellerRows) ? sellerRows[0] : sellerRows) as SellerPublicRow | null;
        if (seller?.id) {
          product = { ...product, seller: toPublicSeller(seller) };
        }
      }
      return product;
    },
    staleTime: 1000 * 60 * 2,
  });
}
