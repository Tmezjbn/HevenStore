import {
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
// PERF-2: defer admin catalog CSS off storefront main chunk (loads with ProductsPage).
void import('../../styles/admin-catalog.css');
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import ProductMedia from '../../components/ui/ProductMedia';
import PageBar from '../../components/dashboard/PageBar';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import DashboardOverflowMenu from '../../components/dashboard/DashboardOverflowMenu';
import ProductEffectsDialog from '../../components/dashboard/ProductEffectsDialog';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import { PRODUCT_EDITOR_COLS } from '../../hooks/useCatalog';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parseProductAuthorLock } from '../../lib/siteSettings';
import { canDeleteProductByAuthor } from '../../lib/productAuthorLock';
import { formatMoney } from '../../lib/formatMoney';
import type { Product } from '../../types';

type AuthorPick = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type ListFilter = 'all' | 'active' | 'inactive' | 'draft' | 'oos' | 'featured';
type PendingConfirm =
  | { kind: 'hide'; product: Product }
  | { kind: 'delete'; id: string };

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function productListTitle(product: Product, lang: 'ar' | 'en'): string {
  if (lang === 'ar') {
    const ar = product.name_ar?.trim();
    if (ar) return ar;
  }
  return product.name;
}

function statusTone(product: Product): 'live' | 'warn' | 'draft' | 'muted' {
  if (product.status === 'draft') return 'draft';
  if (product.status === 'inactive') return 'muted';
  if (product.stock <= 0) return 'warn';
  return 'live';
}

export default function AdminProductsPage() {
  const { t, lang } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useSiteSettings();
  const authorLockOn = parseProductAuthorLock(settings.product_author_lock);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editDeepLinkDone = useRef(false);
  const [effectsOpen, setEffectsOpen] = useState(false);

  const [authorsById, setAuthorsById] = useState<Record<string, AuthorPick>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [stockPulse, setStockPulse] = useState({ units: 0, oos: 0, listings: 0 });

  const profileRole = profile?.role;
  const profileId = profile?.id;

  const refreshStorefront = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  useEffect(() => {
    void import('./ProductEditorPage');
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, listFilter]);

  const refreshStockPulse = async () => {
    const { data, error } = await supabase.from('products').select('stock, status');
    if (error) {
      console.error('AdminProductsPage stock', error);
      return;
    }
    let units = 0;
    let oos = 0;
    for (const row of data ?? []) {
      const s = Number(row.stock) || 0;
      units += Math.max(0, s);
      if (row.status === 'active' && s <= 0) oos += 1;
    }
    setStockPulse({ units, oos, listings: (data ?? []).length });
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      const { from, to } = pageRange(page);
      let query = supabase
        .from('products')
        .select(PRODUCT_EDITOR_COLS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = search.trim().replace(/[%_,]/g, '');
      if (term) query = query.or(`name.ilike.%${term}%,name_ar.ilike.%${term}%`);
      if (listFilter === 'active' || listFilter === 'inactive' || listFilter === 'draft') {
        query = query.eq('status', listFilter);
      } else if (listFilter === 'featured') {
        query = query.eq('is_featured', true);
      } else if (listFilter === 'oos') {
        query = query.eq('status', 'active').lte('stock', 0);
      }
      const [listRes] = await Promise.all([query, refreshStockPulse()]);
      if (cancelled) return;
      const { data: prods, count, error: prodErr } = listRes;
      if (prodErr) {
        console.error('AdminProductsPage fetch', prodErr);
        setProducts([]);
        setTotal(0);
        setFetchError(prodErr.message || t('تعذر تحميل المنتجات', 'Could not load products'));
      } else {
        setProducts((prods as unknown as Product[]) || []);
        setTotal(count ?? 0);
        setFetchError(null);
      }
      setLoading(false);
    };
    const tmr = window.setTimeout(fetchAll, search.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [page, search, listFilter, t]);

  const authorIdsKey = useMemo(
    () =>
      [...new Set(products.map((p) => p.created_by).filter((id): id is string => Boolean(id)))]
        .sort()
        .join(','),
    [products],
  );

  useEffect(() => {
    if (!authorIdsKey) {
      setAuthorsById({});
      return;
    }
    let cancelled = false;
    const ids = authorIdsKey.split(',');
    void supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', ids)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, AuthorPick> = {};
        for (const row of data ?? []) map[row.id] = row as AuthorPick;
        setAuthorsById(map);
      });
    return () => {
      cancelled = true;
    };
  }, [authorIdsKey]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || editDeepLinkDone.current) return;
    editDeepLinkDone.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
    void import('./ProductEditorPage');
    navigate(`/dashboard/products/${editId}/edit`, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  const openEdit = (product: Product) => {
    navigate(`/dashboard/products/${product.slug}/edit`, { state: { product } });
  };
  const openCreate = () => {
    void import('./ProductEditorPage');
    navigate('/dashboard/products/new');
  };

  const toggleFeatured = async (product: Product) => {
    const next = !product.is_featured;
    const { error } = await supabase.from('products').update({ is_featured: next }).eq('id', product.id);
    if (error) {
      setActionError(error.message || t('تعذر تحديث المنتج', 'Could not update the product'));
      setMenuId(null);
      return;
    }
    setActionError(null);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_featured: next } : p)));
    setMenuId(null);
    refreshStorefront();
  };

  const toggleStatus = async (product: Product) => {
    setMenuId(null);
    if (product.status === 'active') {
      setPending({ kind: 'hide', product });
      return;
    }
    const { error } = await supabase
      .from('products')
      .update({ status: 'active' })
      .eq('id', product.id);
    if (error) {
      setActionError(error.message || t('تعذر تحديث المنتج', 'Could not update the product'));
      return;
    }
    setActionError(null);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: 'active' as const } : p)),
    );
    void refreshStockPulse();
    refreshStorefront();
  };

  const runPending = async () => {
    if (!pending || confirmBusy) return;
    setConfirmBusy(true);
    setConfirmError(null);
    if (pending.kind === 'hide') {
      const { error } = await supabase
        .from('products')
        .update({ status: 'inactive' })
        .eq('id', pending.product.id);
      if (error) {
        setConfirmBusy(false);
        setConfirmError(error.message || t('تعذر إخفاء المنتج', 'Could not hide the product'));
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === pending.product.id ? { ...p, status: 'inactive' as const } : p)),
      );
      void refreshStockPulse();
      refreshStorefront();
    } else {
      const { error } = await supabase.from('products').delete().eq('id', pending.id);
      if (error) {
        setConfirmBusy(false);
        setConfirmError(error.message || t('تعذر حذف المنتج', 'Could not delete the product'));
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== pending.id));
      setTotal((n) => Math.max(0, n - 1));
      void refreshStockPulse();
      refreshStorefront();
    }
    setConfirmBusy(false);
    setPending(null);
  };

  const filterLabels: { id: ListFilter; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: 'active', ar: 'نشط', en: 'Active' },
    { id: 'oos', ar: 'بلا مخزون', en: 'No stock' },
    { id: 'featured', ar: 'مميّز', en: 'Featured' },
    { id: 'inactive', ar: 'مخفي', en: 'Hidden' },
    { id: 'draft', ar: 'مسودة', en: 'Draft' },
  ];

  const countWord =
    lang === 'ar' ? (total === 1 ? 'منتج' : 'منتجات') : total === 1 ? 'product' : 'products';

  const statusLabel = (product: Product) => {
    if (product.status === 'active' && product.stock <= 0) {
      return t('نشط بلا مخزون', 'Active · no stock');
    }
    if (product.status === 'active') return t('نشط', 'Active');
    if (product.status === 'inactive') return t('مخفي', 'Hidden');
    return t('مسودة', 'Draft');
  };

  const pendingHot = stockPulse.oos > 0;

  return (
    <div className="admin-catalog mx-auto w-full max-w-6xl text-start">
      <header className="admin-catalog__mast">
        <div className="min-w-0">
          <div className="admin-catalog__mast-row">
            <span className="admin-catalog__badge">{t('مشرف', 'Admin')}</span>
            <span className="admin-catalog__mast-meta">{t('أرضية الكتالوج', 'Ops catalog')}</span>
          </div>
          <h2 className="admin-catalog__title text-balance">{t('المنتجات', 'Products')}</h2>
          <p className="admin-catalog__lede text-pretty">
            {t(
              'عدّل، ميّز، أخفِ — المخزون والسعر والصورة في الصف الأول.',
              'Edit, feature, hide — stock, price, and art lead every row.',
            )}
          </p>
        </div>
        <div className="admin-catalog__mast-actions">
          <button
            type="button"
            className={`admin-catalog__effects-cta ${focusRing}`}
            onClick={() => setEffectsOpen(true)}
          >
            <Sparkles size={14} aria-hidden />
            {t('تأثيرات المنتجات', 'Product effects')}
          </button>
          <button type="button" onClick={openCreate} className={`admin-catalog__cta ${focusRing}`}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            {t('إضافة منتج', 'Add product')}
          </button>
        </div>
      </header>

      <ProductEffectsDialog open={effectsOpen} onClose={() => setEffectsOpen(false)} />

      <section className="admin-catalog__meters" aria-label={t('نبض المخزون', 'Stock pulse')}>
        <article className="admin-catalog__meter">
          <p className="admin-catalog__meter-label">{t('عروض', 'Listings')}</p>
          <p className="admin-catalog__meter-value tabular-nums">{loading ? '—' : stockPulse.listings}</p>
        </article>
        <article className="admin-catalog__meter">
          <p className="admin-catalog__meter-label">{t('وحدات', 'Units')}</p>
          <p className="admin-catalog__meter-value tabular-nums">{loading ? '—' : stockPulse.units}</p>
        </article>
        <button
          type="button"
          className={`admin-catalog__meter admin-catalog__meter--warn${pendingHot ? ' is-hot' : ''} ${focusRing}`}
          onClick={() => setListFilter('oos')}
          disabled={!pendingHot}
        >
          <p className="admin-catalog__meter-label">{t('بلا مخزون', 'Out of stock')}</p>
          <p className="admin-catalog__meter-value tabular-nums">{loading ? '—' : stockPulse.oos}</p>
        </button>
        <article className="admin-catalog__meter admin-catalog__meter--page">
          <p className="admin-catalog__meter-label">{t('هذه الصفحة', 'This page')}</p>
          <p className="admin-catalog__meter-value tabular-nums">
            {loading ? '—' : total}
            <span className="admin-catalog__meter-unit">{countWord}</span>
          </p>
        </article>
      </section>

      <div className="admin-catalog__toolbar">
        <label className="admin-catalog__search">
          <Search size={15} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ابحث بالاسم…', 'Search by name…')}
            aria-label={t('بحث', 'Search')}
          />
          {search ? (
            <button
              type="button"
              className={`admin-catalog__search-clear ${focusRing}`}
              onClick={() => setSearch('')}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <div className="admin-catalog__filters" role="group" aria-label={t('تصفية', 'Filter')}>
          {filterLabels.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`admin-catalog__chip ${listFilter === f.id ? 'is-on' : ''} ${focusRing}`}
              aria-pressed={listFilter === f.id}
              onClick={() => setListFilter(f.id)}
            >
              {t(f.ar, f.en)}
            </button>
          ))}
        </div>
      </div>

      {actionError ? (
        <p className="mb-2 text-sm text-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <div className="admin-catalog__list" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-catalog__row admin-catalog__row--skeleton" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="admin-catalog__empty" role="alert">
          <p className="text-error">{fetchError}</p>
          <p>
            {t(
              'غالباً عمود ناقص — طبّق الهجرات (db push).',
              'Often a missing column — apply migrations (db push).',
            )}
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="admin-catalog__empty">
          <Package size={32} aria-hidden />
          <p>
            {search || listFilter !== 'all'
              ? t('لا نتائج لهذا التصفية', 'No results for this filter')
              : t('لا منتجات بعد — أضف أول عرض.', 'No products yet — add the first listing.')}
          </p>
          {search || listFilter !== 'all' ? (
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setSearch('');
                setListFilter('all');
              }}
            >
              {t('مسح التصفية', 'Clear filters')}
            </button>
          ) : (
            <button type="button" onClick={openCreate} className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
              <Plus size={14} aria-hidden />
              {t('إضافة منتج', 'Add product')}
            </button>
          )}
        </div>
      ) : (
        <ul className="admin-catalog__list" role="list">
          {products.map((product, i) => {
            const title = productListTitle(product, lang);
            const tone = statusTone(product);
            const author = product.created_by ? authorsById[product.created_by] : undefined;
            const authorLabel = product.created_by
              ? author
                ? author.full_name?.trim() || author.email || '…'
                : '…'
              : null;
            const canDelete = canDeleteProductByAuthor({
              lockOn: authorLockOn,
              userId: profileId,
              role: profileRole,
              createdBy: product.created_by,
              createdByRole: author?.role,
            });
            const stockPct =
              product.stock <= 0 ? 0 : Math.min(100, Math.round((product.stock / Math.max(product.stock, 10)) * 100));
            return (
              <li
                key={product.id}
                className="admin-catalog__row-wrap"
                style={{ ['--admin-i' as string]: String(i) }}
              >
                <article
                  className={`admin-catalog__row ${menuId === product.id ? 'is-menu' : ''}`}
                >
                  <button
                    type="button"
                    className={`admin-catalog__media ${focusRing}`}
                    onClick={() => openEdit(product)}
                    onMouseEnter={() => {
                      void import('./ProductEditorPage');
                    }}
                    aria-label={t('تعديل', 'Edit')}
                  >
                    {product.thumbnail_url ? (
                      <ProductMedia
                        src={product.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        width={160}
                        sizes="80px"
                      />
                    ) : (
                      <Package size={22} className="opacity-40" aria-hidden />
                    )}
                    {product.is_featured ? (
                      <span className="admin-catalog__star" title={t('مميّز', 'Featured')}>
                        <Star size={12} className="fill-current" aria-hidden />
                      </span>
                    ) : null}
                  </button>

                  <div className="admin-catalog__copy min-w-0">
                    <p className="admin-catalog__name truncate" title={title}>
                      {title}
                    </p>
                    <div className="admin-catalog__meta">
                      <span className={`admin-catalog__status admin-catalog__status--${tone}`}>
                        {statusLabel(product)}
                      </span>
                      {authorLabel ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate" title={authorLabel}>
                            {authorLabel}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <div
                      className="admin-catalog__stockbar"
                      data-tone={tone}
                      style={{ ['--stock' as string]: `${stockPct}%` }}
                      aria-hidden
                    >
                      <span />
                    </div>
                  </div>

                  <div className="admin-catalog__nums">
                    <p className="admin-catalog__price tabular-nums">{formatMoney(Number(product.price) || 0)}</p>
                    <p className="admin-catalog__stock tabular-nums">
                      {product.stock <= 0
                        ? product.oos_message === 'not_available'
                          ? t('غير متوفر', 'Unavailable')
                          : t('نفد', 'Out of stock')
                        : `${t('مخزون', 'Stock')} ${product.stock}`}
                    </p>
                  </div>

                  <div className="admin-catalog__actions">
                    <button
                      type="button"
                      className={`admin-catalog__edit ${focusRing}`}
                      onClick={() => openEdit(product)}
                      onMouseEnter={() => {
                        void import('./ProductEditorPage');
                      }}
                    >
                      <Pencil size={14} aria-hidden />
                      {t('تعديل', 'Edit')}
                    </button>
                    <DashboardOverflowMenu
                      open={menuId === product.id}
                      onOpenChange={(o) => setMenuId(o ? product.id : null)}
                      ariaLabel={t('المزيد', 'More')}
                      className="admin-catalog__menu"
                      buttonClassName={`admin-catalog__more ${focusRing}`}
                      panelClassName="admin-catalog__menu-panel"
                    >
                      <li role="none">
                        <button type="button" role="menuitem" onClick={() => void toggleFeatured(product)}>
                          <Star
                            size={14}
                            className={product.is_featured ? 'fill-warning text-warning' : ''}
                            aria-hidden
                          />
                          {product.is_featured
                            ? t('إلغاء التمييز', 'Unfeature')
                            : t('تمييز في الرئيسية', 'Feature on homepage')}
                        </button>
                      </li>
                      <li role="none">
                        <button type="button" role="menuitem" onClick={() => void toggleStatus(product)}>
                          {product.status === 'active' ? (
                            <EyeOff size={14} aria-hidden />
                          ) : (
                            <Eye size={14} aria-hidden />
                          )}
                          {product.status === 'active'
                            ? t('إخفاء من المتجر', 'Hide from store')
                            : t('إظهار في المتجر', 'Show in store')}
                        </button>
                      </li>
                      {canDelete ? (
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="is-danger"
                            onClick={() => {
                              setMenuId(null);
                              setPending({ kind: 'delete', id: product.id });
                            }}
                          >
                            <Trash2 size={14} aria-hidden />
                            {t('حذف', 'Delete')}
                          </button>
                        </li>
                      ) : (
                        <li role="none">
                          <span className="admin-catalog__locked">
                            {t('حذف للمؤلّف فقط', 'Delete locked to author')}
                          </span>
                        </li>
                      )}
                    </DashboardOverflowMenu>
                  </div>
                </article>
              </li>
            );
          })}
          <li className="admin-catalog__row-wrap" style={{ ['--admin-i' as string]: String(products.length) }}>
            {stockPulse.oos > 0 ? (
              <button
                type="button"
                className={`admin-catalog__stockfoot ${focusRing}`}
                onClick={() => setListFilter('oos')}
                aria-label={t('عرض بلا مخزون', 'Show out of stock')}
              >
                <Package size={18} aria-hidden />
                <div className="admin-catalog__stockfoot-grid">
                  <p>
                    <strong className="tabular-nums">{stockPulse.units}</strong>
                    <span>{t('وحدة مخزون', 'stock units')}</span>
                  </p>
                  <p className="is-warn">
                    <strong className="tabular-nums">{stockPulse.oos}</strong>
                    <span>{t('بلا مخزون', 'out of stock')}</span>
                  </p>
                  <p>
                    <strong className="tabular-nums">{stockPulse.listings}</strong>
                    <span>{t('عروض', 'listings')}</span>
                  </p>
                </div>
              </button>
            ) : (
              <div className="admin-catalog__stockfoot" role="status">
                <Package size={18} aria-hidden />
                <div className="admin-catalog__stockfoot-grid">
                  <p>
                    <strong className="tabular-nums">{stockPulse.units}</strong>
                    <span>{t('وحدة مخزون', 'stock units')}</span>
                  </p>
                  <p>
                    <strong className="tabular-nums">0</strong>
                    <span>{t('بلا مخزون', 'out of stock')}</span>
                  </p>
                  <p>
                    <strong className="tabular-nums">{stockPulse.listings}</strong>
                    <span>{t('عروض', 'listings')}</span>
                  </p>
                </div>
              </div>
            )}
          </li>
        </ul>
      )}

      <PageBar page={page} total={total} pageSize={DASHBOARD_PAGE_SIZE} onPage={setPage} t={t} />

      <ConfirmDialog
        open={!!pending}
        onClose={() => {
          if (confirmBusy) return;
          setPending(null);
          setConfirmError(null);
        }}
        onConfirm={runPending}
        busy={confirmBusy}
        error={confirmError}
        danger={pending?.kind === 'delete'}
        title={
          pending?.kind === 'hide'
            ? t('إخفاء هذا المنتج من المتجر؟', 'Hide this product from the store?')
            : t('هل أنت متأكد من الحذف؟', 'Are you sure you want to delete?')
        }
        confirmLabel={pending?.kind === 'hide' ? t('إخفاء', 'Hide') : t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}
