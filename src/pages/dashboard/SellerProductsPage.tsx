import {
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
// PERF-2: seller-listings styles live in dashboard-role-surfaces.css (shared chunk).
void import('../../styles/dashboard-role-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import ProductMedia from '../../components/ui/ProductMedia';
import PageBar from '../../components/dashboard/PageBar';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import DashboardOverflowMenu from '../../components/dashboard/DashboardOverflowMenu';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import { PRODUCT_EDITOR_COLS } from '../../hooks/useCatalog';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import {
  parseProductAuthorLock,
  parseSellerDailyProductLimit,
  utcDayStartIso,
} from '../../lib/siteSettings';
import { canDeleteProductByAuthor } from '../../lib/productAuthorLock';
import { formatMoney } from '../../lib/formatMoney';
import type { Product } from '../../types';

type ListFilter = 'all' | 'live' | 'draft' | 'hidden' | 'low';
type PendingConfirm =
  | { kind: 'hide'; product: Product }
  | { kind: 'delete'; id: string };

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function titleOf(product: Product, lang: 'ar' | 'en') {
  if (lang === 'ar') {
    const ar = product.name_ar?.trim();
    if (ar) return ar;
  }
  return product.name;
}

function toneOf(p: Product) {
  if (p.status === 'draft') return 'draft' as const;
  if (p.status === 'inactive') return 'muted' as const;
  if (p.stock <= 0) return 'warn' as const;
  if (p.stock <= 2) return 'warn' as const;
  return 'live' as const;
}

function statusCopy(p: Product, t: (ar: string, en: string) => string) {
  if (p.status === 'draft') return t('مسودة', 'Draft');
  if (p.status === 'inactive') return t('مخفي', 'Hidden');
  if (p.stock <= 0) return t('نفد', 'Sold out');
  if (p.stock <= 2) return t('مخزون قليل', 'Low stock');
  return t('معروض', 'Live');
}

export default function SellerProductsPage() {
  const { t, lang } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useSiteSettings();
  const authorLockOn = parseProductAuthorLock(settings.product_author_lock);
  const dailyLimit = parseSellerDailyProductLimit(settings.seller_daily_product_limit);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [createdToday, setCreatedToday] = useState(0);

  const profileId = profile?.id;
  const handle = (profile?.username || '').trim();
  const publicPath = handle ? `/seller/${encodeURIComponent(handle)}` : null;

  const refreshStorefront = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  useEffect(() => {
    void import('./ProductEditorPage');
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', profileId)
      .gte('created_at', utcDayStartIso())
      .then(({ count }) => {
        if (!cancelled) setCreatedToday(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, products]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId) return;
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
    void import('./ProductEditorPage');
    navigate(`/dashboard/products/${editId}/edit`, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const { from, to } = pageRange(page);
      let query = supabase
        .from('products')
        .select(PRODUCT_EDITOR_COLS, { count: 'exact' })
        .eq('seller_id', profileId)
        .order('updated_at', { ascending: false })
        .range(from, to);

      const term = search.trim().replace(/[%_,]/g, '');
      if (term) query = query.or(`name.ilike.%${term}%,name_ar.ilike.%${term}%`);

      if (listFilter === 'live') query = query.eq('status', 'active').gt('stock', 0);
      else if (listFilter === 'draft') query = query.eq('status', 'draft');
      else if (listFilter === 'hidden') query = query.eq('status', 'inactive');
      else if (listFilter === 'low') query = query.eq('status', 'active').lte('stock', 2);

      const { data, count, error } = await query;
      if (cancelled) return;
      if (error) {
        setProducts([]);
        setTotal(0);
        setFetchError(error.message || t('تعذر تحميل العروض', 'Could not load listings'));
      } else {
        setProducts((data as unknown as Product[]) || []);
        setTotal(count ?? 0);
        setFetchError(null);
      }
      setLoading(false);
    };

    const tmr = window.setTimeout(load, search.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [profileId, page, search, listFilter, t]);

  const openEdit = (product: Product) => {
    navigate(`/dashboard/products/${product.slug}/edit`, { state: { product } });
  };
  const atDailyLimit = dailyLimit > 0 && createdToday >= dailyLimit;
  const remainingToday = dailyLimit > 0 ? Math.max(0, dailyLimit - createdToday) : null;

  const openCreate = () => {
    if (atDailyLimit) return;
    void import('./ProductEditorPage');
    navigate('/dashboard/products/new');
  };

  const toggleStatus = async (product: Product) => {
    if (product.status === 'active') {
      setPending({ kind: 'hide', product });
      return;
    }
    await supabase.from('products').update({ status: 'active' }).eq('id', product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: 'active' as const } : p)),
    );
    refreshStorefront();
  };

  const runPending = async () => {
    if (!pending || confirmBusy) return;
    setConfirmBusy(true);
    if (pending.kind === 'hide') {
      await supabase.from('products').update({ status: 'inactive' }).eq('id', pending.product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === pending.product.id ? { ...p, status: 'inactive' as const } : p)),
      );
      refreshStorefront();
    } else {
      await supabase.from('products').delete().eq('id', pending.id);
      setProducts((prev) => prev.filter((p) => p.id !== pending.id));
      setTotal((n) => Math.max(0, n - 1));
      refreshStorefront();
    }
    setConfirmBusy(false);
    setPending(null);
  };

  const filters: { id: ListFilter; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: 'live', ar: 'معروض', en: 'Live' },
    { id: 'low', ar: 'مخزون قليل', en: 'Low stock' },
    { id: 'draft', ar: 'مسودة', en: 'Draft' },
    { id: 'hidden', ar: 'مخفي', en: 'Hidden' },
  ];

  const countWord =
    lang === 'ar' ? (total === 1 ? 'عرض' : 'عروض') : total === 1 ? 'listing' : 'listings';

  return (
    <div className="seller-listings mx-auto w-full max-w-6xl text-start">
      <header className="seller-listings__hero">
        <div className="min-w-0">
          <p className="seller-listings__eyebrow">{t('رفّ الكشك', 'Stall shelf')}</p>
          <h2 className="seller-listings__title text-balance">{t('عروضي', 'My listings')}</h2>
          <p className="seller-listings__lede text-pretty">
            {t(
              'كل عرض هنا يظهر للزبائن على كشكك — حدّث الصورة والسعر والمخزون قبل ما ينفد.',
              'Everything here shows on your stall — keep image, price, and stock sharp before it sells out.',
            )}
          </p>
          {dailyLimit > 0 ? (
            <p className="seller-listings__quota" aria-live="polite">
              {atDailyLimit
                ? t(
                    `حد اليوم اكتمل — ${dailyLimit} عروض كحد أقصى. تقدر تضيف غداً.`,
                    `Today’s cap is full — max ${dailyLimit} new listings. Add more tomorrow.`,
                  )
                : remainingToday === 1
                  ? t(
                      `باقي عرض واحد اليوم (حد ${dailyLimit}).`,
                      `1 new listing left today (max ${dailyLimit}).`,
                    )
                  : t(
                      `باقي ${remainingToday} عروض اليوم (حد ${dailyLimit}).`,
                      `${remainingToday} new listings left today (max ${dailyLimit}).`,
                    )}
            </p>
          ) : null}
        </div>
        <div className="seller-listings__hero-actions">
          {publicPath ? (
            <Link to={publicPath} className={`seller-listings__ghost ${focusRing}`}>
              <Store size={16} aria-hidden />
              {t('كشكي العام', 'Public stall')}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={openCreate}
            disabled={atDailyLimit}
            className={`seller-listings__cta ${focusRing}`}
            title={
              atDailyLimit
                ? t('وصلت للحد اليومي', 'Daily limit reached')
                : undefined
            }
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            {t('عرض جديد', 'New listing')}
          </button>
        </div>
      </header>

      <div className="seller-listings__toolbar">
        <label className="seller-listings__search">
          <Search size={15} aria-hidden />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('ابحث في عروضك…', 'Search your listings…')}
            aria-label={t('بحث', 'Search')}
          />
          {search ? (
            <button
              type="button"
              className={`seller-listings__search-clear ${focusRing}`}
              onClick={() => {
                setSearch('');
                setPage(0);
              }}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <div className="seller-listings__filters" role="group" aria-label={t('تصفية', 'Filter')}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`seller-listings__chip ${listFilter === f.id ? 'is-on' : ''} ${focusRing}`}
              aria-pressed={listFilter === f.id}
              onClick={() => {
                setListFilter(f.id);
                setPage(0);
              }}
            >
              {t(f.ar, f.en)}
            </button>
          ))}
        </div>
      </div>

      <p className="seller-listings__count" aria-live="polite">
        <strong className="tabular-nums">{loading ? '—' : total}</strong> {countWord}
        {listFilter !== 'all' ? (
          <>
            <span aria-hidden>·</span>
            {t(filters.find((f) => f.id === listFilter)!.ar, filters.find((f) => f.id === listFilter)!.en)}
          </>
        ) : null}
      </p>

      {loading ? (
        <div className="seller-listings__grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="seller-listings__card seller-listings__card--skeleton" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="seller-listings__empty" role="alert">
          <p className="text-error">{fetchError}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="seller-listings__empty">
          <ImagePlus size={34} aria-hidden />
          <p>
            {search || listFilter !== 'all'
              ? t('لا نتائج لهذه التصفية', 'No results for this filter')
              : t('رفّك فاضي — أضف أول عرض.', 'Empty shelf — add your first listing.')}
          </p>
          {search || listFilter !== 'all' ? (
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setSearch('');
                setListFilter('all');
                setPage(0);
              }}
            >
              {t('مسح التصفية', 'Clear filters')}
            </button>
          ) : (
            <button type="button" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`} onClick={openCreate}>
              <Plus size={14} aria-hidden />
              {t('إضافة عرض', 'Add listing')}
            </button>
          )}
        </div>
      ) : (
        <ul className="seller-listings__grid" role="list">
          {products.map((product, i) => {
            const title = titleOf(product, lang);
            const tone = toneOf(product);
            const canDelete = canDeleteProductByAuthor({
              lockOn: authorLockOn,
              userId: profileId,
              role: profile?.role,
              createdBy: product.created_by,
              createdByRole: null,
              sellerId: product.seller_id,
            });
            return (
              <li
                key={product.id}
                className="seller-listings__card-wrap"
                style={{ ['--seller-i' as string]: String(i) }}
              >
                <article className="seller-listings__card">
                  <button
                    type="button"
                    className={`seller-listings__media ${focusRing}`}
                    onClick={() => openEdit(product)}
                    onMouseEnter={() => {
                      void import('./ProductEditorPage');
                    }}
                    aria-label={t(`تعديل ${title}`, `Edit ${title}`)}
                  >
                    {product.thumbnail_url ? (
                      <ProductMedia
                        src={product.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        width={320}
                        sizes="220px"
                      />
                    ) : (
                      <ImagePlus size={28} className="opacity-35" aria-hidden />
                    )}
                    <span className={`seller-listings__status seller-listings__status--${tone}`}>
                      {statusCopy(product, t)}
                    </span>
                  </button>

                  <div className="seller-listings__body">
                    <h3 className="seller-listings__name truncate" title={title}>
                      {title}
                    </h3>
                    <div className="seller-listings__meta">
                      <span className="tabular-nums font-bold">{formatMoney(Number(product.price) || 0)}</span>
                      <span className="tabular-nums opacity-60">
                        {product.stock <= 0
                          ? t('نفد', 'Sold out')
                          : `${t('مخزون', 'Stock')} ${product.stock}`}
                      </span>
                    </div>
                    <div
                      className="seller-listings__stockbar"
                      aria-hidden
                      data-tone={tone}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(4, product.stock <= 0 ? 4 : Math.min(100, product.stock * 12)))}%`,
                        }}
                      />
                    </div>

                    <div className="seller-listings__actions">
                      <button
                        type="button"
                        className={`seller-listings__edit ${focusRing}`}
                        onClick={() => openEdit(product)}
                      >
                        <Pencil size={14} aria-hidden />
                        {t('تعديل', 'Edit')}
                      </button>
                      <DashboardOverflowMenu
                        open={menuId === product.id}
                        onOpenChange={(o) => setMenuId(o ? product.id : null)}
                        ariaLabel={t('المزيد', 'More')}
                        className="seller-listings__menu"
                        buttonClassName={`seller-listings__more ${focusRing}`}
                        panelClassName="seller-listings__menu-panel"
                      >
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuId(null);
                              void toggleStatus(product);
                            }}
                          >
                            {product.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
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
                              <Trash2 size={14} />
                              {t('حذف', 'Delete')}
                            </button>
                          </li>
                        ) : null}
                      </DashboardOverflowMenu>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
          {!atDailyLimit ? (
            <li className="seller-listings__card-wrap">
              <button type="button" onClick={openCreate} className={`seller-listings__add ${focusRing}`}>
                <Plus size={22} strokeWidth={2.25} aria-hidden />
                <span>{t('عرض جديد', 'New listing')}</span>
              </button>
            </li>
          ) : null}
        </ul>
      )}

      <PageBar page={page} total={total} pageSize={DASHBOARD_PAGE_SIZE} onPage={setPage} t={t} />

      <ConfirmDialog
        open={!!pending}
        onClose={() => !confirmBusy && setPending(null)}
        onConfirm={runPending}
        busy={confirmBusy}
        danger={pending?.kind === 'delete'}
        title={
          pending?.kind === 'hide'
            ? t('إخفاء هذا العرض من المتجر؟', 'Hide this listing from the store?')
            : t('هل أنت متأكد من الحذف؟', 'Are you sure you want to delete?')
        }
        confirmLabel={pending?.kind === 'hide' ? t('إخفاء', 'Hide') : t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />

    </div>
  );
}
