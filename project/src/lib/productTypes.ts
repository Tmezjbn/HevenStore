/** Built-in + custom catalog product types (products.product_type). */

export type ProductTypeDef = {
  id: string;
  labelAr: string;
  labelEn: string;
};

export const BUILTIN_PRODUCT_TYPES: readonly ProductTypeDef[] = [
  { id: 'account', labelAr: 'حساب', labelEn: 'Account' },
  { id: 'gift_card', labelAr: 'بطاقة هدية', labelEn: 'Gift Card' },
  { id: 'code', labelAr: 'كود', labelEn: 'Code' },
  { id: 'other', labelAr: 'أخرى', labelEn: 'Other' },
] as const;

const BUILTIN_IDS = new Set(BUILTIN_PRODUCT_TYPES.map((t) => t.id));

/** Slug for product_type column: a-z 0-9 _ , 1–40 chars. */
export function slugifyProductType(value: string): string {
  const s = value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 40);
  return s || 'custom';
}

export function isValidProductTypeId(id: string): boolean {
  return /^[a-z0-9_]{1,40}$/.test(id);
}

/** Custom types only from site_settings.product_types_json. */
export function parseProductTypesJson(raw: string | null | undefined): ProductTypeDef[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ProductTypeDef[] = [];
    const seen = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue;
      const id = slugifyProductType(String((row as ProductTypeDef).id ?? ''));
      if (!isValidProductTypeId(id) || BUILTIN_IDS.has(id) || seen.has(id)) continue;
      const labelEn = String((row as ProductTypeDef).labelEn ?? '').trim() || id;
      const labelAr = String((row as ProductTypeDef).labelAr ?? '').trim() || labelEn;
      seen.add(id);
      out.push({ id, labelAr, labelEn });
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeProductTypesJson(customs: ProductTypeDef[]): string {
  return JSON.stringify(
    customs
      .filter((t) => isValidProductTypeId(t.id) && !BUILTIN_IDS.has(t.id))
      .map((t) => ({
        id: t.id,
        labelEn: t.labelEn.trim() || t.id,
        labelAr: t.labelAr.trim() || t.labelEn.trim() || t.id,
      })),
  );
}

export function allProductTypes(customs: ProductTypeDef[]): ProductTypeDef[] {
  const extra = customs.filter((t) => !BUILTIN_IDS.has(t.id));
  return [...BUILTIN_PRODUCT_TYPES, ...extra];
}

export function productTypeLabel(
  id: string,
  customs: ProductTypeDef[] = [],
): [labelAr: string, labelEn: string] {
  const hit = allProductTypes(customs).find((t) => t.id === id);
  if (hit) return [hit.labelAr, hit.labelEn];
  const en = id.replace(/_/g, ' ') || 'Product';
  return [en, en];
}
