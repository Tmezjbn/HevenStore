import type { Product } from '../types';

export type StoreSortKey = 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'rating';

export const STORE_SORT_KEYS: StoreSortKey[] = [
  'popular',
  'newest',
  'price_asc',
  'price_desc',
  'rating',
];

export function parseStoreSort(raw: string | null | undefined): StoreSortKey {
  const v = (raw ?? '').trim();
  return (STORE_SORT_KEYS as string[]).includes(v) ? (v as StoreSortKey) : 'popular';
}

export function sortProducts(products: Product[], sort: StoreSortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case 'newest':
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'price_asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return list.sort((a, b) => b.price - a.price);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'popular':
    default:
      return list.sort((a, b) => b.sales_count - a.sales_count);
  }
}

/** AR/EN labels for store sort — keep Navbar + GamesPage in sync. */
export function storeSortLabel(
  key: StoreSortKey,
  t: (ar: string, en: string) => string,
): string {
  switch (key) {
    case 'newest':
      return t('الأحدث', 'Newest');
    case 'price_asc':
      return t('السعر: الأقل أولاً', 'Price: Low to High');
    case 'price_desc':
      return t('السعر: الأعلى أولاً', 'Price: High to Low');
    case 'rating':
      return t('الأعلى تقييماً', 'Highest Rated');
    case 'popular':
    default:
      return t('الأكثر شعبية', 'Most Popular');
  }
}
