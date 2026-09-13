import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Copy, KeyRound, Package, Search, ShoppingBag, X } from 'lucide-react';
// PERF-2: seller-sales styles live in dashboard-role-surfaces.css (shared chunk).
void import('../../styles/dashboard-role-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { fulfillmentDisplay, parseKeyUnits } from '../../lib/fulfillment';
import ProductMedia from '../../components/ui/ProductMedia';
import PageBar from '../../components/dashboard/PageBar';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import { formatMoney } from '../../lib/formatMoney';

type SaleRow = {
  order_id: string;
  order_number: string;
  public_ref: string | null;
  created_at: string;
  status: string;
  line_total: number;
  quantity: number;
  product_id: string;
  product_name: string;
  product_name_ar: string | null;
  product_slug: string;
  thumbnail_url: string | null;
};

type FulfillmentItem = {
  product_id: string;
  name: string;
  name_ar: string | null;
  product_type: string;
  quantity: number;
  content: string | null;
  keys: string | null;
  key_units?: unknown;
};

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SellerOrdersPage() {
  const { t, lang } = useI18n();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Record<string, FulfillmentItem[]>>({});
  const [fulfillmentError, setFulfillmentError] = useState<Record<string, boolean>>({});
  const [loadingFul, setLoadingFul] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showFullIds, setShowFullIds] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      const q = search.trim() || null;
      const { from } = pageRange(page);

      const [rowsRes, countRes] = await Promise.all([
        supabase.rpc('list_seller_sales', {
          p_limit: DASHBOARD_PAGE_SIZE,
          p_offset: from,
          p_q: q,
        }),
        supabase.rpc('count_seller_sales', { p_q: q }),
      ]);

      if (cancelled) return;

      if (rowsRes.error || countRes.error) {
        console.error('SellerOrdersPage', rowsRes.error || countRes.error);
        setSales([]);
        setTotal(0);
        setRevenue(0);
        setLoadError(true);
        setLoading(false);
        return;
      }

      const rows = (rowsRes.data ?? []) as SaleRow[];
      setSales(
        rows.map((r) => ({
          ...r,
          line_total: Number(r.line_total) || 0,
          quantity: Number(r.quantity) || 1,
        })),
      );
      const tally = Array.isArray(countRes.data) ? countRes.data[0] : countRes.data;
      setTotal(Number(tally?.sale_count) || 0);
      setRevenue(Number(tally?.revenue) || 0);
      setLoading(false);
    };

    const tmr = window.setTimeout(load, search.trim() ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [page, search, reloadKey]);

  const titleOf = (s: SaleRow) =>
    lang === 'ar' && s.product_name_ar?.trim() ? s.product_name_ar : s.product_name;

  const toggleDetails = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (fulfillment[orderId]) return;
    setLoadingFul(orderId);
    const { data, error } = await supabase.rpc('get_order_fulfillment', { p_order_id: orderId });
    if (error) {
      // Don't cache a fake empty — a transient failure must stay retry-able.
      setFulfillmentError((prev) => ({ ...prev, [orderId]: true }));
    } else {
      setFulfillment((prev) => ({ ...prev, [orderId]: (data as FulfillmentItem[]) ?? [] }));
      setFulfillmentError((prev) => ({ ...prev, [orderId]: false }));
    }
    setLoadingFul(null);
  };

  const copyText = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="seller-sales mx-auto w-full max-w-5xl text-start">
      <header className="seller-sales__hero">
        <div className="min-w-0">
          <p className="seller-sales__eyebrow">{t('دفتر المبيعات', 'Sales ledger')}</p>
          <h2 className="seller-sales__title text-balance">{t('مبيعات عروضك', 'Sales of your listings')}</h2>
          <p className="seller-sales__lede text-pretty">
            {t(
              'كل عملية شراء لعروضك — افتح التفاصيل لنسخ مفاتيح التسليم.',
              'Every paid purchase of your listings — open details to copy delivery keys.',
            )}
          </p>
        </div>
        <div className="seller-sales__stats" aria-live="polite">
          <div>
            <p className="seller-sales__stat-label">{t('مبيعات', 'Sales')}</p>
            <p className="seller-sales__stat-value tabular-nums">{loading ? '—' : total}</p>
          </div>
          <div>
            <p className="seller-sales__stat-label">{t('إيراد عروضك', 'Your revenue')}</p>
            <p className="seller-sales__stat-value tabular-nums">
              {loading ? '—' : formatMoney(revenue)}
            </p>
          </div>
        </div>
      </header>

      <div className="seller-sales__toolbar">
        <label className="seller-sales__search">
          <Search size={15} aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ابحث بالمنتج أو رقم الطلب…', 'Search product or order number…')}
            aria-label={t('بحث', 'Search')}
          />
          {search ? (
            <button
              type="button"
              className={`seller-sales__search-clear ${focusRing}`}
              onClick={() => setSearch('')}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>
        <label
          className={`seller-sales__toggle ${showFullIds ? 'is-on' : ''} ${focusRing}`}
        >
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={showFullIds}
            onChange={(e) => setShowFullIds(e.target.checked)}
          />
          <span>{t('معرّف تقني', 'Technical ID')}</span>
        </label>
      </div>

      {loading ? (
        <div className="seller-sales__skeleton" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="seller-sales__card seller-sales__card--skeleton" />
          ))}
        </div>
      ) : loadError ? (
        <div className="seller-sales__empty" role="alert">
          <p className="text-error">
            {t(
              'تعذر تحميل المبيعات. طبّق ترحيل list_seller_sales ثم أعد المحاولة.',
              'Could not load sales. Apply the list_seller_sales migration, then retry.',
            )}
          </p>
          <button
            type="button"
            className={`btn btn-outline btn-sm ${focusRing}`}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {t('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : sales.length === 0 ? (
        <div className="seller-sales__empty">
          <ShoppingBag size={32} aria-hidden />
          <p>
            {search.trim()
              ? t('لا نتائج لهذا البحث', 'No results for this search')
              : t('لا مبيعات بعد — حدّث عروضك وشارك كشكك.', 'No sales yet — polish listings and share your stall.')}
          </p>
          {search.trim() ? (
            <button type="button" className={`btn btn-ghost btn-sm ${focusRing}`} onClick={() => setSearch('')}>
              {t('مسح البحث', 'Clear search')}
            </button>
          ) : (
            <Link to="/dashboard/products" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
              <Package size={14} aria-hidden />
              {t('عروضي', 'My listings')}
            </Link>
          )}
        </div>
      ) : (
        <ul className="seller-sales__list" role="list">
          {sales.map((sale, i) => {
            const open = expandedId === sale.order_id;
            const items = fulfillment[sale.order_id] ?? [];
            const title = titleOf(sale);
            return (
              <li
                key={`${sale.order_id}-${sale.product_id}-${i}`}
                className="seller-sales__card-wrap"
                style={{ ['--seller-i' as string]: String(i) }}
              >
                <article className={`seller-sales__card ${open ? 'is-open' : ''}`}>
                  <div className="seller-sales__row">
                    <div className="seller-sales__thumb">
                      {sale.thumbnail_url ? (
                        <ProductMedia
                          src={sale.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                          width={96}
                          sizes="56px"
                        />
                      ) : (
                        <Package size={18} className="opacity-40" aria-hidden />
                      )}
                    </div>
                    <div className="seller-sales__copy min-w-0">
                      <p className="seller-sales__name truncate" title={title}>
                        {title}
                        {sale.quantity > 1 ? (
                          <span className="opacity-55 tabular-nums"> ×{sale.quantity}</span>
                        ) : null}
                      </p>
                      <p className="seller-sales__meta">
                        <span className="seller-sales__paid">{t('مدفوع', 'Paid')}</span>
                        <span aria-hidden>·</span>
                        <span className="font-mono text-xs inline-flex flex-col" dir="ltr">
                          <span>{sale.order_number || sale.order_id}</span>
                          {sale.public_ref ? (
                            <span className="text-[10px] opacity-60">{sale.public_ref}</span>
                          ) : null}
                          {showFullIds ? (
                            <span className="text-[10px] opacity-50 break-all">{sale.order_id}</span>
                          ) : null}
                        </span>
                        <span aria-hidden>·</span>
                        <time dateTime={sale.created_at}>{formatDate(sale.created_at, lang)}</time>
                      </p>
                    </div>
                    <div className="seller-sales__aside">
                      <p className="seller-sales__amount tabular-nums">{formatMoney(sale.line_total)}</p>
                      <button
                        type="button"
                        className={`seller-sales__details ${focusRing}`}
                        aria-expanded={open}
                        onClick={() => void toggleDetails(sale.order_id)}
                      >
                        <KeyRound size={14} aria-hidden />
                        {open ? t('إخفاء', 'Hide') : t('التسليم', 'Fulfillment')}
                        <ChevronDown
                          size={14}
                          className={open ? 'rotate-180' : ''}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="seller-sales__fulfill" id={`seller-ful-${sale.order_id}`}>
                      {loadingFul === sale.order_id ? (
                        <div className="flex justify-center py-8" role="status">
                          <span className="loading loading-spinner loading-sm text-primary" />
                        </div>
                      ) : fulfillmentError[sale.order_id] ? (
                        <p className="text-sm text-error text-center py-6" role="alert">
                          {t(
                            'تعذر تحميل بيانات التسليم — أغلق التفاصيل وأعد فتحها للمحاولة.',
                            'Could not load fulfillment — close and reopen details to retry.',
                          )}
                        </p>
                      ) : items.length === 0 ? (
                        <p className="text-sm text-base-content/55 text-center py-6">
                          {t('لا توجد بيانات تسليم لهذا الطلب.', 'No fulfillment data for this order.')}
                        </p>
                      ) : (
                        <ul className="seller-sales__ful-list">
                          {items.map((item, idx) => {
                            const body =
                              item.content || item.keys || parseKeyUnits(item.key_units)
                                ? fulfillmentDisplay(
                                    item.content,
                                    item.keys,
                                    parseKeyUnits(item.key_units),
                                  )
                                : '';
                            const name =
                              lang === 'ar' && item.name_ar?.trim() ? item.name_ar : item.name;
                            const copyKey = `${sale.order_id}-${idx}`;
                            return (
                              <li key={copyKey} className="seller-sales__ful-item">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <p className="text-sm font-semibold truncate">{name}</p>
                                  {item.quantity > 1 ? (
                                    <span className="text-xs opacity-55 tabular-nums">×{item.quantity}</span>
                                  ) : null}
                                </div>
                                <div className="flex items-start gap-2">
                                  <pre className="seller-sales__pre">
                                    {body || t('لا يوجد محتوى', 'No content')}
                                  </pre>
                                  {body ? (
                                    <button
                                      type="button"
                                      className={`btn btn-ghost btn-square btn-sm shrink-0 ${focusRing}`}
                                      onClick={() => void copyText(copyKey, body)}
                                      aria-label={t('نسخ', 'Copy')}
                                    >
                                      {copied === copyKey ? (
                                        <Check size={14} className="text-success" />
                                      ) : (
                                        <Copy size={14} />
                                      )}
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <PageBar page={page} total={total} pageSize={DASHBOARD_PAGE_SIZE} onPage={setPage} t={t} />
    </div>
  );
}
