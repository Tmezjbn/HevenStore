import { Check, Loader2, Save, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchPagedRows } from '../../lib/dashboardPage';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useSaveSiteSettings, useSiteSettings } from '../../hooks/useSiteSettings';
import {
  FEATURED_PRODUCTS_MAX,
  parseFeaturedProductIds,
  parseStoreFeaturedMirrorHome,
} from '../../lib/siteSettings';
import Modal from '../ui/Modal';
import ProductIdListEditor, { type ProductIdListItem } from './ProductIdListEditor';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Home + Explore featured rails — lived in Website Builder widgets; now catalog-local. */
export default function FeatureProductsDialog({ open, onClose }: Props) {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { settings } = useSiteSettings();
  const saveMutation = useSaveSiteSettings();

  const [homeIds, setHomeIds] = useState<string[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [mirrorHome, setMirrorHome] = useState(false);
  const [homeSearch, setHomeSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [pickerProducts, setPickerProducts] = useState<ProductIdListItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerErr, setPickerErr] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [pickerTick, setPickerTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setHomeIds(parseFeaturedProductIds(settings.home_featured_product_ids));
    setStoreIds(parseFeaturedProductIds(settings.store_featured_product_ids));
    setMirrorHome(parseStoreFeaturedMirrorHome(settings.store_featured_mirror_home));
    setHomeSearch('');
    setStoreSearch('');
    setDirty(false);
    setSavedFlash(false);
  }, [
    open,
    settings.home_featured_product_ids,
    settings.store_featured_product_ids,
    settings.store_featured_mirror_home,
  ]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setPickerLoading(true);
      setPickerErr(false);
      // Page past the ~1000-row PostgREST cap so big catalogs list fully.
      const { rows, error } = await fetchPagedRows<ProductIdListItem>((from, to) =>
        supabase
          .from('products')
          .select('id, name, name_ar, thumbnail_url, price, status')
          .order('created_at', { ascending: false })
          .range(from, to),
      );
      if (cancelled) return;
      if (error) {
        setPickerErr(true);
      } else {
        setPickerProducts(rows);
      }
      setPickerLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, pickerTick]);

  const markDirty = () => {
    setDirty(true);
    setSavedFlash(false);
  };

  const save = async () => {
    if (!user || !dirty) return;
    setSaveErr(false);
    try {
      await saveMutation.mutateAsync({
        userId: user.id,
        updates: {
          home_featured_product_ids: JSON.stringify(homeIds),
          store_featured_product_ids: JSON.stringify(storeIds),
          store_featured_mirror_home: mirrorHome ? 'true' : 'false',
        },
      });
      setDirty(false);
      setSavedFlash(true);
    } catch {
      setSaveErr(true);
    }
  };

  const title = t('تمييز المنتجات', 'Feature products');

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="feature-products-title"
      boxClassName="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      closeLabel={t('إغلاق', 'Close')}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="size-9 rounded-lg border border-warning/40 bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
            <Star size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id="feature-products-title" className="font-bold text-lg tracking-tight text-balance">
              {title}
            </h3>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اختر منتجات رئيسية وتصفح المتجر. البحث، تحديد الكل، وإعادة الترتيب هنا.',
                'Pick Home and Explore Store featured products. Search, select all, and reorder here.',
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          onClick={onClose}
          aria-label={t('إغلاق', 'Close')}
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <section className="rounded-lg border border-base-300 bg-base-200/40 p-3.5 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('منتجات مميزة — الرئيسية', 'Featured products — Home')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                `قائمة مرتبة حتى ${FEATURED_PRODUCTS_MAX}. إن كانت فارغة تُستخدم نجوم المنتجات (is_featured).`,
                `Ordered list up to ${FEATURED_PRODUCTS_MAX}. Empty list falls back to starred products (is_featured).`,
              )}
            </p>
          </div>
          <ProductIdListEditor
            ids={homeIds}
            setIds={setHomeIds}
            max={FEATURED_PRODUCTS_MAX}
            products={pickerProducts}
            productsLoading={pickerLoading}
            search={homeSearch}
            setSearch={setHomeSearch}
            lang={lang}
            t={t}
            onDirty={markDirty}
            onRefresh={() => setPickerTick((n) => n + 1)}
          />
        </section>

        <section className="rounded-lg border border-base-300 bg-base-200/40 p-3.5 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('منتجات مميزة — تصفح المتجر', 'Featured products — Explore Store')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'قسم أعلى الكتالوج. القائمة الفارغة تخفي القسم (ما لم تُفعّل المرآة).',
                'Rail above the catalog. Empty list hides the section (unless mirror is on).',
              )}
            </p>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary mt-0.5"
              checked={mirrorHome}
              onChange={(e) => {
                setMirrorHome(e.target.checked);
                markDirty();
              }}
            />
            <span className="text-start">
              <span className="block text-sm font-semibold tracking-tight">
                {t('مرآة رئيسية', 'Mirror Home featured')}
              </span>
              <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
                {t(
                  'استخدم قائمة المنتجات المميزة من الصفحة الرئيسية في تصفح المتجر.',
                  'Use the Home featured product list on Explore Store.',
                )}
              </span>
            </span>
          </label>
          <div className={mirrorHome ? 'opacity-45 pointer-events-none' : ''}>
            <ProductIdListEditor
              ids={storeIds}
              setIds={setStoreIds}
              max={FEATURED_PRODUCTS_MAX}
              products={pickerProducts}
              productsLoading={pickerLoading}
              search={storeSearch}
              setSearch={setStoreSearch}
              lang={lang}
              t={t}
              onDirty={markDirty}
              onRefresh={() => setPickerTick((n) => n + 1)}
              disabled={mirrorHome}
            />
          </div>
        </section>
      </div>

      <div className="modal-action mt-5 sticky bottom-0 bg-base-100 pt-2">
        {saveErr ? (
          <span className="text-sm text-error self-center" role="alert">
            {t('فشل الحفظ', 'Save failed')}
          </span>
        ) : null}
        {pickerErr ? (
          <span className="text-sm text-error self-center" role="alert">
            {t('تعذر تحميل المنتجات', 'Could not load products')}
          </span>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {t('إغلاق', 'Close')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1.5"
          disabled={!dirty || saveMutation.isPending || !user}
          onClick={() => void save()}
        >
          {saveMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : savedFlash && !dirty ? (
            <Check size={14} aria-hidden />
          ) : (
            <Save size={14} aria-hidden />
          )}
          {savedFlash && !dirty ? t('تم الحفظ', 'Saved') : t('حفظ التمييز', 'Save featuring')}
        </button>
      </div>
    </Modal>
  );
}
