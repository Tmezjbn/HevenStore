import { Search, ChevronUp, ChevronDown, Box, Trash2 } from 'lucide-react';
import { formatMoney } from '../../../lib/formatMoney';
import { HOME_HOVER_CARDS_MAX, PRODUCT_FIND_MORE_MAX, PRODUCT_FIND_MORE_INTERVAL_MIN, PRODUCT_FIND_MORE_INTERVAL_MAX, type HoverCardsMode, type ProductFindMoreMode } from '../../../lib/siteSettings';
import { type BuilderProduct } from './constants';

interface SectionsWidgetsBPanelProps {
  findMoreEnabled: boolean;
  findMoreIntervalSec: number;
  findMoreMode: ProductFindMoreMode;
  findMoreProductIds: string[];
  findMoreSearch: string;
  findMoreSlots: number;
  hoverCount: number;
  hoverMode: HoverCardsMode;
  hoverProductIds: string[];
  hoverSearch: string;
  lang: 'ar' | 'en';
  products: BuilderProduct[];
  productsLoading: boolean;
  setFindMoreEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setFindMoreIntervalSec: React.Dispatch<React.SetStateAction<number>>;
  setFindMoreMode: React.Dispatch<React.SetStateAction<ProductFindMoreMode>>;
  setFindMoreProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFindMoreSearch: React.Dispatch<React.SetStateAction<string>>;
  setFindMoreSlots: React.Dispatch<React.SetStateAction<number>>;
  setHoverCount: React.Dispatch<React.SetStateAction<number>>;
  setHoverMode: React.Dispatch<React.SetStateAction<HoverCardsMode>>;
  setHoverProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setHoverSearch: React.Dispatch<React.SetStateAction<string>>;
  setSectionsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  t: (ar: string, en: string) => string;
}

export default function SectionsWidgetsBPanel({
  findMoreEnabled,
  findMoreIntervalSec,
  findMoreMode,
  findMoreProductIds,
  findMoreSearch,
  findMoreSlots,
  hoverCount,
  hoverMode,
  hoverProductIds,
  hoverSearch,
  lang,
  products,
  productsLoading,
  setFindMoreEnabled,
  setFindMoreIntervalSec,
  setFindMoreMode,
  setFindMoreProductIds,
  setFindMoreSearch,
  setFindMoreSlots,
  setHoverCount,
  setHoverMode,
  setHoverProductIds,
  setHoverSearch,
  setSectionsSaved,
  t,
}: SectionsWidgetsBPanelProps) {
  return (
    <>
        <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('بطاقات تفاعلية', 'Hover cards')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                `حتى ${HOME_HOVER_CARDS_MAX} بطاقات تحت المنتجات. فعّل قسم «بطاقات تفاعلية» أعلاه.`,
                `Up to ${HOME_HOVER_CARDS_MAX} cards under Products. Enable “Hover cards” above.`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full flex-col gap-1.5 w-28">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('العدد', 'Count')}</span>
              </span>
              <input
                type="number"
                min={1}
                max={HOME_HOVER_CARDS_MAX}
                className="input input-bordered input-sm"
                value={hoverCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setHoverCount(Math.min(HOME_HOVER_CARDS_MAX, Math.max(1, Math.round(n))));
                  setSectionsSaved(false);
                }}
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs opacity-70 px-0.5">{t('مصدر المنتجات', 'Product source')}</legend>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="hover-mode"
                  className="radio radio-sm radio-primary"
                  checked={hoverMode === 'auto'}
                  onChange={() => {
                    setHoverMode('auto');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار عشوائي تلقائي', 'Auto random picker')}
                </span>
              </label>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="hover-mode"
                  className="radio radio-sm radio-primary"
                  checked={hoverMode === 'manual'}
                  onChange={() => {
                    setHoverMode('manual');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار يدوي من المالك', 'Owner-chosen products')}
                </span>
              </label>
            </fieldset>
          </div>

          {hoverMode === 'manual' && (
            <>
              {hoverProductIds.length > 0 && (
                <ul className="space-y-1.5">
                  {hoverProductIds.map((id, i) => {
                    const p = products.find((row) => row.id === id);
                    const label = p
                      ? lang === 'ar'
                        ? p.name_ar || p.name
                        : p.name
                      : id.slice(0, 8);
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
                          disabled={i === 0}
                          aria-label={t('أعلى', 'Move up')}
                          onClick={() => {
                            setHoverProductIds((prev) => {
                              const next = [...prev];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === hoverProductIds.length - 1}
                          aria-label={t('أسفل', 'Move down')}
                          onClick={() => {
                            setHoverProductIds((prev) => {
                              const next = [...prev];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          aria-label={t('إزالة', 'Remove')}
                          onClick={() => {
                            setHoverProductIds((prev) => prev.filter((x) => x !== id));
                            setSectionsSaved(false);
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
                  value={hoverSearch}
                  onChange={(e) => setHoverSearch(e.target.value)}
                  aria-label={t('بحث منتجات البطاقات', 'Search hover card products')}
                />
              </label>
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
                {(() => {
                  const q = hoverSearch.trim().toLowerCase();
                  const list = products.filter((p) => {
                    if (p.status !== 'active') return false;
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.name_ar || '').toLowerCase().includes(q)
                    );
                  });
                  if (productsLoading) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
                    );
                  }
                  if (list.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا نتائج', 'No matches')}
                      </p>
                    );
                  }
                  return list.map((p) => {
                    const selected = hoverProductIds.includes(p.id);
                    const full = hoverProductIds.length >= HOME_HOVER_CARDS_MAX && !selected;
                    const label = lang === 'ar' ? p.name_ar || p.name : p.name;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                          full ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selected}
                          disabled={full}
                          onChange={() => {
                            setHoverProductIds((prev) => {
                              if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                              if (prev.length >= HOME_HOVER_CARDS_MAX) return prev;
                              return [...prev, p.id];
                            });
                            setSectionsSaved(false);
                          }}
                        />
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                        ) : (
                          <Box size={14} className="opacity-40 shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{label}</span>
                        <span className="text-xs tabular-nums opacity-50">{formatMoney(p.price)}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold tracking-tight">
                {t('اعثر على المزيد', 'Find More Products')}
              </h4>
              <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
                {t(
                  `عرض حتى ${PRODUCT_FIND_MORE_MAX} منتجات أسفل صفحة المنتج، مع تدوير سلس.`,
                  `Up to ${PRODUCT_FIND_MORE_MAX} products under the product page, rotating smoothly.`
                )}
              </p>
            </div>
            <label className="label cursor-pointer gap-2 py-0">
              <span className="label-text text-sm">{t('مفعّل', 'Enabled')}</span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={findMoreEnabled}
                onChange={(e) => {
                  setFindMoreEnabled(e.target.checked);
                  setSectionsSaved(false);
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full flex-col gap-1.5 w-28">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('الخانات', 'Slots')}</span>
              </span>
              <input
                type="number"
                min={1}
                max={PRODUCT_FIND_MORE_MAX}
                className="input input-bordered input-sm"
                value={findMoreSlots}
                disabled={!findMoreEnabled}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setFindMoreSlots(Math.min(PRODUCT_FIND_MORE_MAX, Math.max(1, Math.round(n))));
                  setSectionsSaved(false);
                }}
              />
            </label>
            <label className="flex w-full flex-col gap-1.5 w-36">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('الفترة (ث)', 'Interval (s)')}</span>
              </span>
              <input
                type="number"
                min={PRODUCT_FIND_MORE_INTERVAL_MIN}
                max={PRODUCT_FIND_MORE_INTERVAL_MAX}
                className="input input-bordered input-sm"
                value={findMoreIntervalSec}
                disabled={!findMoreEnabled}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setFindMoreIntervalSec(
                    Math.min(
                      PRODUCT_FIND_MORE_INTERVAL_MAX,
                      Math.max(PRODUCT_FIND_MORE_INTERVAL_MIN, Math.round(n))
                    )
                  );
                  setSectionsSaved(false);
                }}
              />
            </label>
            <fieldset className="flex flex-col gap-1.5" disabled={!findMoreEnabled}>
              <legend className="text-xs opacity-70 px-0.5">{t('مصدر المنتجات', 'Product source')}</legend>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="find-more-mode"
                  className="radio radio-sm radio-primary"
                  checked={findMoreMode === 'auto'}
                  onChange={() => {
                    setFindMoreMode('auto');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار عشوائي تلقائي', 'Auto random picker')}
                </span>
              </label>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="find-more-mode"
                  className="radio radio-sm radio-primary"
                  checked={findMoreMode === 'manual'}
                  onChange={() => {
                    setFindMoreMode('manual');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار يدوي من المالك', 'Owner-chosen products')}
                </span>
              </label>
            </fieldset>
          </div>

          {findMoreEnabled && findMoreMode === 'manual' && (
            <>
              {findMoreProductIds.length > 0 && (
                <ul className="space-y-1.5">
                  {findMoreProductIds.map((id, i) => {
                    const p = products.find((row) => row.id === id);
                    const label = p
                      ? lang === 'ar'
                        ? p.name_ar || p.name
                        : p.name
                      : id.slice(0, 8);
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
                          disabled={i === 0}
                          aria-label={t('أعلى', 'Move up')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => {
                              const next = [...prev];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === findMoreProductIds.length - 1}
                          aria-label={t('أسفل', 'Move down')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => {
                              const next = [...prev];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          aria-label={t('إزالة', 'Remove')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => prev.filter((x) => x !== id));
                            setSectionsSaved(false);
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
                  value={findMoreSearch}
                  onChange={(e) => setFindMoreSearch(e.target.value)}
                  aria-label={t('بحث منتجات المزيد', 'Search find-more products')}
                />
              </label>

              <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
                {(() => {
                  const q = findMoreSearch.trim().toLowerCase();
                  const active = products.filter((p) => p.status === 'active');
                  const list = active.filter((p) => {
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.name_ar || '').toLowerCase().includes(q)
                    );
                  });
                  if (productsLoading) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
                    );
                  }
                  if (active.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا توجد منتجات نشطة', 'No active products')}
                      </p>
                    );
                  }
                  if (list.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا نتائج', 'No matches')}
                      </p>
                    );
                  }
                  return list.map((p) => {
                    const selected = findMoreProductIds.includes(p.id);
                    const full = findMoreProductIds.length >= PRODUCT_FIND_MORE_MAX && !selected;
                    const label = lang === 'ar' ? p.name_ar || p.name : p.name;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                          full ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selected}
                          disabled={full}
                          onChange={() => {
                            setFindMoreProductIds((prev) => {
                              if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                              if (prev.length >= PRODUCT_FIND_MORE_MAX) return prev;
                              return [...prev, p.id];
                            });
                            setSectionsSaved(false);
                          }}
                        />
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                        ) : (
                          <Box size={14} className="opacity-40 shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{label}</span>
                        <span className="text-xs tabular-nums opacity-50">{formatMoney(p.price)}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
    </>
  );
}
