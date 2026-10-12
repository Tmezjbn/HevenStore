import { Link } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, Sparkles, Box, Trash2, RefreshCw, Plus } from 'lucide-react';
import { formatMoney } from '../../../lib/formatMoney';
import { parseHomeAdsBladeSize, parseHomeAdsBladeColor, parseHomeAdsBladeOpacity, parseMerchMotionMode, MERCH_MOTION_MODES, HOME_ADS_SIZES, HOME_ADS_BLADE_SIZES, HOME_ADS_BLADE_TEXT_EN_DEFAULT, HOME_ADS_BLADE_TEXT_AR_DEFAULT, HOME_ADS_BLADE_TEXT_MAX, type HomeAdsSize, HOME_ADS_MAX, HOME_ADS_INTERVAL_MIN, HOME_ADS_INTERVAL_MAX, HOME_CATEGORY_SECTIONS_MAX, STORE_CATEGORY_SECTIONS_MAX } from '../../../lib/siteSettings';
import { indentPrefix } from '../../../lib/categories';
import { AURA_STYLES, type AuraStyle } from '../../../lib/productEffects';
import { type Category } from '../../../types';
import { focusRing, type BuilderProduct } from './constants';

interface SectionsWidgetsAPanelProps {
  addCategoryId: string;
  addCategorySection: () => void;
  addStoreCategoryId: string;
  addStoreCategorySection: () => void;
  adsAura: AuraStyle;
  adsBladeColor: string;
  adsBladeEnabled: boolean;
  adsBladeOpacity: number;
  adsBladeSize: 'sm' | 'md' | 'lg';
  adsBladeTextAr: string;
  adsBladeTextEn: string;
  adsGlareHover: boolean;
  adsIntervalSec: number;
  adsProductIds: string[];
  adsSearch: string;
  adsSize: 'sm' | 'md' | 'lg' | 'xl';
  categorySectionCount: number;
  categoryTree: Category[];
  lang: 'ar' | 'en';
  merchMotionMode: 'off' | 'auto' | 'always';
  products: BuilderProduct[];
  productsLoading: boolean;
  setAddCategoryId: React.Dispatch<React.SetStateAction<string>>;
  setAddStoreCategoryId: React.Dispatch<React.SetStateAction<string>>;
  setAdsAura: React.Dispatch<React.SetStateAction<AuraStyle>>;
  setAdsBladeColor: React.Dispatch<React.SetStateAction<string>>;
  setAdsBladeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setAdsBladeOpacity: React.Dispatch<React.SetStateAction<number>>;
  setAdsBladeSize: React.Dispatch<React.SetStateAction<'sm' | 'md' | 'lg'>>;
  setAdsBladeTextAr: React.Dispatch<React.SetStateAction<string>>;
  setAdsBladeTextEn: React.Dispatch<React.SetStateAction<string>>;
  setAdsGlareHover: React.Dispatch<React.SetStateAction<boolean>>;
  setAdsIntervalSec: React.Dispatch<React.SetStateAction<number>>;
  setAdsProductIds: React.Dispatch<React.SetStateAction<string[]>>;
  setAdsSearch: React.Dispatch<React.SetStateAction<string>>;
  setAdsSize: React.Dispatch<React.SetStateAction<'sm' | 'md' | 'lg' | 'xl'>>;
  setMerchMotionMode: React.Dispatch<React.SetStateAction<'off' | 'auto' | 'always'>>;
  setProductsTick: React.Dispatch<React.SetStateAction<number>>;
  setSectionsSaved: React.Dispatch<React.SetStateAction<boolean>>;
  storeCategorySectionCount: number;
  t: (ar: string, en: string) => string;
  usedCategorySectionIds: Set<string>;
  usedStoreCategorySectionIds: Set<string>;
}

export default function SectionsWidgetsAPanel({
  addCategoryId,
  addCategorySection,
  addStoreCategoryId,
  addStoreCategorySection,
  adsAura,
  adsBladeColor,
  adsBladeEnabled,
  adsBladeOpacity,
  adsBladeSize,
  adsBladeTextAr,
  adsBladeTextEn,
  adsGlareHover,
  adsIntervalSec,
  adsProductIds,
  adsSearch,
  adsSize,
  categorySectionCount,
  categoryTree,
  lang,
  merchMotionMode,
  products,
  productsLoading,
  setAddCategoryId,
  setAddStoreCategoryId,
  setAdsAura,
  setAdsBladeColor,
  setAdsBladeEnabled,
  setAdsBladeOpacity,
  setAdsBladeSize,
  setAdsBladeTextAr,
  setAdsBladeTextEn,
  setAdsGlareHover,
  setAdsIntervalSec,
  setAdsProductIds,
  setAdsSearch,
  setAdsSize,
  setMerchMotionMode,
  setProductsTick,
  setSectionsSaved,
  storeCategorySectionCount,
  t,
  usedCategorySectionIds,
  usedStoreCategorySectionIds,
}: SectionsWidgetsAPanelProps) {
  return (
    <>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('منتجات مميزة', 'Featured products')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اختيار وترتيب المنتجات المميزة صار من قائمة المنتجات — زر «ميّز المنتجات!».',
                'Picking and ordering featured products moved to the Products list — use “Feature Products!”.',
              )}
            </p>
          </div>
          <Link to="/dashboard/products?feature=1" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
            <Sparkles size={14} aria-hidden />
            {t('فتح تمييز المنتجات', 'Open feature products')}
          </Link>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('أقسام منتجات حسب التصنيف (الرئيسية)', 'Category product sections (Home)')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'يعرض فقط المنتجات المرتبطة مباشرة بهذا التصنيف (بدون الأبناء). مثال: «GTA 5» منفصل عن «GTA 5 Gift Card».',
                'Shows only products assigned directly to that category (not children). Example: “GTA 5” separate from “GTA 5 Gift Card”.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex w-full flex-col gap-1.5 flex-1 min-w-48">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('التصنيف', 'Category')}</span>
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
              >
                <option value="">{t('اختر تصنيفاً…', 'Pick a category…')}</option>
                {categoryTree
                  .filter((c) => !usedCategorySectionIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {indentPrefix(c.level)}
                      {lang === 'ar' ? c.name_ar || c.name : c.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              disabled={
                !addCategoryId ||
                categorySectionCount >= HOME_CATEGORY_SECTIONS_MAX
              }
              onClick={addCategorySection}
            >
              <Plus size={14} />
              {t('إضافة قسم', 'Add section')}
            </button>
          </div>
          {categorySectionCount >= HOME_CATEGORY_SECTIONS_MAX && (
            <p className="text-xs text-warning">
              {t(
                `الحد الأقصى ${HOME_CATEGORY_SECTIONS_MAX} أقسام تصنيف.`,
                `Max ${HOME_CATEGORY_SECTIONS_MAX} category sections.`,
              )}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('أقسام منتجات حسب التصنيف (تصفح المتجر)', 'Category product sections (Explore Store)')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'تظهر تحت الكتالوج الكامل. «عرض الكل» يفتح /store?category=slug.',
                'Rendered under the full catalog. “View all” opens /store?category=slug.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex w-full flex-col gap-1.5 flex-1 min-w-48">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('التصنيف', 'Category')}</span>
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={addStoreCategoryId}
                onChange={(e) => setAddStoreCategoryId(e.target.value)}
              >
                <option value="">{t('اختر تصنيفاً…', 'Pick a category…')}</option>
                {categoryTree
                  .filter((c) => !usedStoreCategorySectionIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {indentPrefix(c.level)}
                      {lang === 'ar' ? c.name_ar || c.name : c.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              disabled={
                !addStoreCategoryId ||
                storeCategorySectionCount >= STORE_CATEGORY_SECTIONS_MAX
              }
              onClick={addStoreCategorySection}
            >
              <Plus size={14} />
              {t('إضافة قسم', 'Add section')}
            </button>
          </div>
          {storeCategorySectionCount >= STORE_CATEGORY_SECTIONS_MAX && (
            <p className="text-xs text-warning">
              {t(
                `الحد الأقصى ${STORE_CATEGORY_SECTIONS_MAX} أقسام تصنيف.`,
                `Max ${STORE_CATEGORY_SECTIONS_MAX} category sections.`,
              )}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-semibold tracking-tight">
                {t('منتجات بانر الإعلانات', 'Ad banner products')}
              </h4>
              <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
                {t(
                  `اختر حتى ${HOME_ADS_MAX} منتجات. فعّل قسم «بانر الإعلانات» أعلاه لإظهاره بين الفئات والمنتجات.`,
                  `Pick up to ${HOME_ADS_MAX} products. Enable “Ad banners” above to show them between Categories and Products.`
                )}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs gap-1 self-start"
              onClick={() => setProductsTick((n) => n + 1)}
              disabled={productsLoading}
            >
              <RefreshCw size={12} className={productsLoading ? 'animate-spin' : ''} />
              {t('تحديث القائمة', 'Refresh list')}
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('هالة البانر', 'Banner aura')}</span>
              </span>
              <select
                className="select select-bordered select-sm"
                value={adsAura}
                onChange={(e) => {
                  setAdsAura(e.target.value as AuraStyle);
                  setSectionsSaved(false);
                }}
                aria-label={t('هالة بانر الإعلانات', 'Ad banner aura')}
              >
                {AURA_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelAr, s.labelEn)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">
                  {t('ارتفاع البانر', 'Banner height')}
                </span>
              </span>
              <select
                className="select select-bordered select-sm"
                value={adsSize}
                onChange={(e) => {
                  setAdsSize(e.target.value as HomeAdsSize);
                  setSectionsSaved(false);
                }}
                aria-label={t('ارتفاع بانر الإعلانات', 'Ad banner height')}
              >
                {HOME_ADS_SIZES.map((id) => (
                  <option key={id} value={id}>
                    {id === 'sm'
                      ? t('قصير', 'Short')
                      : id === 'md'
                        ? t('متوسط', 'Medium')
                        : id === 'lg'
                          ? t('طويل', 'Tall')
                          : t('أطول', 'Extra tall')}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs grow">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80 font-medium">
                  {t('ثواني بين الشرائح', 'Seconds between slides')}
                </span>
                <span className="text-xs tabular-nums text-base-content/55">
                  {adsIntervalSec}s
                </span>
              </div>
              <input
                type="range"
                min={HOME_ADS_INTERVAL_MIN}
                max={HOME_ADS_INTERVAL_MAX}
                step={1}
                value={adsIntervalSec}
                onChange={(e) => {
                  setAdsIntervalSec(Number(e.target.value));
                  setSectionsSaved(false);
                }}
                className="range range-primary range-xs"
                aria-label={t('ثواني بين شرائح البانر', 'Ad banner slide interval')}
              />
              <div className="flex justify-between text-xs text-base-content/55 px-0.5 mt-0.5">
                <span>{HOME_ADS_INTERVAL_MIN}s</span>
                <span>{HOME_ADS_INTERVAL_MAX}s</span>
              </div>
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">
                {t('لمعة التحويم', 'Glare hover')}
              </span>
              <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                {t(
                  'لمعة معدنية تمر على البانر عند التحويم.',
                  'Metallic glare sweeps across the banner on hover.',
                )}
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary shrink-0"
              checked={adsGlareHover}
              onChange={(e) => {
                setAdsGlareHover(e.target.checked);
                setSectionsSaved(false);
              }}
              aria-label={t('تفعيل لمعة التحويم', 'Enable glare hover')}
            />
          </label>

          <label className="flex w-full flex-col gap-1.5 rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2.5">
            <span className="text-sm font-semibold tracking-tight">
              {t('حركة بطاقات المنتجات', 'Product card motion')}
            </span>
            <span className="text-xs text-base-content/60 text-pretty">
              {t(
                'الهالة والتأثيرات وإمالة البطاقة. «تلقائي» يحترم إعداد الجهاز لتقليل الحركة. «دائماً» يبقيها إن كان جهازك يفرض التقليل بالخطأ. الأسعار والأزرار تبقى ظاهرة.',
                'Aura, card effects, and tilt. Auto follows the device reduce-motion setting. Always keeps motion if your device forces that setting by mistake. Prices and buttons stay visible.',
              )}
            </span>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={merchMotionMode}
              onChange={(e) => {
                setMerchMotionMode(parseMerchMotionMode(e.target.value));
                setSectionsSaved(false);
              }}
              aria-label={t('حركة بطاقات المنتجات', 'Product card motion')}
            >
              {MERCH_MOTION_MODES.map((id) => (
                <option key={id} value={id}>
                  {id === 'auto'
                    ? t('تلقائي (اتبع الجهاز)', 'Auto (follow device)')
                    : id === 'always'
                      ? t('دائماً (أبقِ الحركة)', 'Always (keep motion)')
                      : t('إيقاف (تهدئة)', 'Off (calm)')}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-base-300/70 bg-base-200/40 p-3 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight">
                  {t('شرائط الحافة', 'Blade edge strips')}
                </span>
                <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                  {t(
                    'شريط متحرك أعلى وأسفل بانر الإعلانات.',
                    'Scrolling strip along the top and bottom of the ad banner.',
                  )}
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary shrink-0"
                checked={adsBladeEnabled}
                onChange={(e) => {
                  setAdsBladeEnabled(e.target.checked);
                  setSectionsSaved(false);
                }}
                aria-label={t('تفعيل شرائط الحافة', 'Enable blade edge strips')}
              />
            </label>
            {adsBladeEnabled ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('النص (إنجليزي)', 'Text (English)')}
                    </span>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      value={adsBladeTextEn}
                      maxLength={HOME_ADS_BLADE_TEXT_MAX}
                      onChange={(e) => {
                        setAdsBladeTextEn(e.target.value.slice(0, HOME_ADS_BLADE_TEXT_MAX));
                        setSectionsSaved(false);
                      }}
                      placeholder={HOME_ADS_BLADE_TEXT_EN_DEFAULT}
                      dir="ltr"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('النص (عربي)', 'Text (Arabic)')}
                    </span>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      value={adsBladeTextAr}
                      maxLength={HOME_ADS_BLADE_TEXT_MAX}
                      onChange={(e) => {
                        setAdsBladeTextAr(e.target.value.slice(0, HOME_ADS_BLADE_TEXT_MAX));
                        setSectionsSaved(false);
                      }}
                      placeholder={HOME_ADS_BLADE_TEXT_AR_DEFAULT}
                      dir="rtl"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('الحجم', 'Size')}
                    </span>
                    <select
                      className="select select-bordered select-sm"
                      value={adsBladeSize}
                      onChange={(e) => {
                        setAdsBladeSize(parseHomeAdsBladeSize(e.target.value));
                        setSectionsSaved(false);
                      }}
                    >
                      {HOME_ADS_BLADE_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'sm'
                            ? t('رفيع', 'Thin')
                            : s === 'lg'
                              ? t('سميك', 'Thick')
                              : t('متوسط', 'Medium')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('اللون', 'Color')}
                    </span>
                    <input
                      type="color"
                      className="h-9 w-full cursor-pointer rounded-lg border border-base-300 bg-base-100 p-1"
                      value={adsBladeColor}
                      onChange={(e) => {
                        setAdsBladeColor(parseHomeAdsBladeColor(e.target.value));
                        setSectionsSaved(false);
                      }}
                      aria-label={t('لون شريط الحافة', 'Blade strip color')}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('الشفافية', 'Opacity')} {adsBladeOpacity}%
                    </span>
                    <input
                      type="range"
                      className="range range-primary range-xs mt-2"
                      min={20}
                      max={100}
                      step={1}
                      value={adsBladeOpacity}
                      onChange={(e) => {
                        setAdsBladeOpacity(parseHomeAdsBladeOpacity(e.target.value));
                        setSectionsSaved(false);
                      }}
                      aria-label={t('شفافية شريط الحافة', 'Blade strip opacity')}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {adsProductIds.length > 0 && (
            <ul className="space-y-1.5">
              {adsProductIds.map((id, i) => {
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
                        setAdsProductIds((prev) => {
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
                      disabled={i === adsProductIds.length - 1}
                      aria-label={t('أسفل', 'Move down')}
                      onClick={() => {
                        setAdsProductIds((prev) => {
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
                        setAdsProductIds((prev) => prev.filter((x) => x !== id));
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
              value={adsSearch}
              onChange={(e) => setAdsSearch(e.target.value)}
              aria-label={t('بحث منتجات الإعلان', 'Search ad products')}
            />
          </label>

          <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
            {(() => {
              const q = adsSearch.trim().toLowerCase();
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
                    {t('لا توجد منتجات نشطة — انشر منتجاً ثم حدّث القائمة.', 'No active products — publish one, then refresh the list.')}
                  </p>
                );
              }
              if (list.length === 0) {
                return (
                  <p className="text-xs opacity-50 py-2 text-center">
                    {t('لا نتائج لهذا البحث', 'No matches for this search')}
                  </p>
                );
              }
              return list.map((p) => {
                const selected = adsProductIds.includes(p.id);
                const full = adsProductIds.length >= HOME_ADS_MAX && !selected;
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
                        setAdsProductIds((prev) => {
                          if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                          if (prev.length >= HOME_ADS_MAX) return prev;
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
        </div>
    </>
  );
}
