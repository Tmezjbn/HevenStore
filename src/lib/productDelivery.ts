import type { Product } from '../types';

export const DELIVERY_PRESETS = ['instant', 'minutes', 'hours', 'days', 'custom'] as const;
export type DeliveryPreset = (typeof DELIVERY_PRESETS)[number];

type TFn = (ar: string, en: string) => string;

type DeliveryFields = Pick<Product, 'delivery_preset' | 'delivery_custom_en' | 'delivery_custom_ar'>;

export function parseDeliveryPreset(raw: unknown): DeliveryPreset {
  const v = typeof raw === 'string' ? raw.trim() : '';
  return (DELIVERY_PRESETS as readonly string[]).includes(v) ? (v as DeliveryPreset) : 'instant';
}

/** Bilingual label for one product. Missing/legacy → Instant. */
export function productDeliveryLabel(
  t: TFn,
  product: DeliveryFields | null | undefined,
  lang: 'ar' | 'en',
): string {
  const preset = parseDeliveryPreset(product?.delivery_preset);
  if (preset === 'custom') {
    const ar = product?.delivery_custom_ar?.trim() || '';
    const en = product?.delivery_custom_en?.trim() || '';
    const custom = lang === 'ar' ? ar || en : en || ar;
    if (custom) return custom;
  }
  switch (preset) {
    case 'minutes':
      return t('خلال دقائق', 'Within minutes');
    case 'hours':
      return t('خلال 24 ساعة', 'Within 24 hours');
    case 'days':
      return t('١–٣ أيام', '1–3 days');
    case 'custom':
    case 'instant':
    default:
      return t('تسليم فوري', 'Instant');
  }
}

/** True when label is the Instant preset (green emphasis). */
export function productDeliveryIsInstant(
  product: DeliveryFields | null | undefined,
): boolean {
  return parseDeliveryPreset(product?.delivery_preset) === 'instant';
}

/** Cart/checkout aggregate: one shared label, or Varies when mixed. */
export function cartDeliveryLabel(
  t: TFn,
  items: { product: DeliveryFields }[],
  lang: 'ar' | 'en',
): { label: string; isInstant: boolean } {
  if (items.length === 0) {
    return { label: t('تسليم فوري', 'Instant'), isInstant: true };
  }
  const labels = items.map((i) => productDeliveryLabel(t, i.product, lang));
  const first = labels[0]!;
  if (labels.every((l) => l === first)) {
    return {
      label: first,
      isInstant: items.every((i) => productDeliveryIsInstant(i.product)),
    };
  }
  return { label: t('يختلف', 'Varies'), isInstant: false };
}
