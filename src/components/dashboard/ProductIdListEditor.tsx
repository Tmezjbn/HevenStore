import { Box, ChevronDown, ChevronUp, RefreshCw, Search, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

export type ProductIdListItem = {
  id: string;
  name: string;
  name_ar: string | null;
  thumbnail_url: string | null;
  price: number;
  status: string;
};

type Props = {
  ids: string[];
  setIds: Dispatch<SetStateAction<string[]>>;
  max: number;
  products: ProductIdListItem[];
  productsLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  lang: string;
  t: (ar: string, en: string) => string;
  onDirty: () => void;
  onRefresh: () => void;
  disabled?: boolean;
};

/** Ordered product id picker — Home / Explore featured rails. */
export default function ProductIdListEditor({
  ids,
  setIds,
  max,
  products,
  productsLoading,
  search,
  setSearch,
  lang,
  t,
  onDirty,
  onRefresh,
  disabled = false,
}: Props) {
  const q = search.trim().toLowerCase();
  const activeProducts = products.filter((p) => p.status === 'active');
  const filteredProducts = activeProducts.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.name_ar || '').toLowerCase().includes(q);
  });

  const selectAllVisible = () => {
    setIds((prev) => {
      const next = [...prev];
      for (const p of filteredProducts) {
        if (next.length >= max) break;
        if (!next.includes(p.id)) next.push(p.id);
      }
      return next;
    });
    onDirty();
  };

  const deselectAll = () => {
    if (ids.length === 0) return;
    setIds([]);
    onDirty();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          className="btn btn-ghost btn-xs gap-1"
          onClick={selectAllVisible}
          disabled={productsLoading || disabled || filteredProducts.length === 0 || ids.length >= max}
        >
          {t('تحديد الكل', 'Select all')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs gap-1"
          onClick={deselectAll}
          disabled={productsLoading || disabled || ids.length === 0}
        >
          {t('إلغاء تحديد الكل', 'Deselect all')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs gap-1"
          onClick={onRefresh}
          disabled={productsLoading || disabled}
        >
          <RefreshCw size={12} className={productsLoading ? 'animate-spin' : ''} />
          {t('تحديث القائمة', 'Refresh list')}
        </button>
      </div>
      {ids.length > 0 && (
        <ul className="space-y-1.5">
          {ids.map((id, i) => {
            const p = products.find((row) => row.id === id);
            const label = p ? (lang === 'ar' ? p.name_ar || p.name : p.name) : id.slice(0, 8);
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-2 py-1.5"
              >
                {p?.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-base-300 shrink-0" />
                )}
                <span className="flex-1 text-sm truncate">{label}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  disabled={disabled || i === 0}
                  aria-label={t('أعلى', 'Move up')}
                  onClick={() => {
                    setIds((prev) => {
                      const next = [...prev];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      return next;
                    });
                    onDirty();
                  }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  disabled={disabled || i === ids.length - 1}
                  aria-label={t('أسفل', 'Move down')}
                  onClick={() => {
                    setIds((prev) => {
                      const next = [...prev];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      return next;
                    });
                    onDirty();
                  }}
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square text-error"
                  disabled={disabled}
                  aria-label={t('إزالة', 'Remove')}
                  onClick={() => {
                    setIds((prev) => prev.filter((x) => x !== id));
                    onDirty();
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <label className="input input-bordered input-sm flex items-center gap-2">
        <Search size={14} className="opacity-40 shrink-0" />
        <input
          type="search"
          className="grow bg-transparent"
          placeholder={t('ابحث عن منتج…', 'Search products…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          aria-label={t('بحث منتجات', 'Search products')}
        />
      </label>
      <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
        {productsLoading ? (
          <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
        ) : activeProducts.length === 0 ? (
          <p className="text-xs opacity-50 py-2 text-center">
            {t(
              'لا توجد منتجات نشطة — انشر منتجاً ثم حدّث القائمة.',
              'No active products — publish one, then refresh the list.',
            )}
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-xs opacity-50 py-2 text-center">
            {t('لا نتائج لهذا البحث', 'No matches for this search')}
          </p>
        ) : (
          filteredProducts.map((p) => {
            const selected = ids.includes(p.id);
            const full = ids.length >= max && !selected;
            const label = lang === 'ar' ? p.name_ar || p.name : p.name;
            return (
              <label
                key={p.id}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                  full || disabled ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={selected}
                  disabled={full || disabled}
                  onChange={() => {
                    setIds((prev) => {
                      if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                      if (prev.length >= max) return prev;
                      return [...prev, p.id];
                    });
                    onDirty();
                  }}
                />
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                ) : (
                  <Box size={14} className="opacity-40 shrink-0" />
                )}
                <span className="text-sm truncate flex-1">{label}</span>
                <span className="text-xs tabular-nums opacity-50">${p.price}</span>
              </label>
            );
          })
        )}
      </div>
      <p className="text-xs text-base-content/55 tabular-nums">
        {ids.length}/{max}
      </p>
    </div>
  );
}
