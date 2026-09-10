import type { Product } from '../types';

type TFn = (ar: string, en: string) => string;

/** Storefront copy when a product has no stock. */
export function productOosLabel(
  t: TFn,
  product: Pick<Product, 'oos_message'> | null | undefined
): string {
  if (product?.oos_message === 'not_available') {
    return t('غير متوفر حالياً', 'Not available currently');
  }
  return t('نفدت الكمية', 'Out of stock');
}

/** Units at or below this count as low stock on the card. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockTone = 'ok' | 'low' | 'oos';

export function productStockTone(stock: number): StockTone {
  if (stock <= 0) return 'oos';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}
