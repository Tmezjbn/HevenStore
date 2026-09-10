import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight,
  Ban,
  Check,
  ChevronDown,
  Copy,
  KeyRound,
  Package,
  Search,
  X,
} from 'lucide-react';
// PERF-2: buyer-ledger styles live in dashboard-role-surfaces.css (shared chunk).
void import('../../styles/dashboard-role-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { fulfillmentDisplay, parseKeyUnits } from '../../lib/fulfillment';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import PageBar from '../../components/dashboard/PageBar';
import Modal from '../../components/ui/Modal';
import { cancelOrder } from '../../lib/orderActions';
import { formatMoney } from '../../lib/formatMoney';
import { ORDER_STATUS_LABEL as STATUS_LABEL } from '../../lib/orderStatus';
import type { Order, Role } from '../../types';

type BuyerOrder = Order & {
  items?: {
    quantity: number;
    total_price?: number;
    product?: { name: string; name_ar: string | null };
  }[];
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

const BUYER_ROLES: Role[] = ['buyer', 'member', 'moderator', 'support'];

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function orderCode(order: Pick<Order, 'id' | 'order_number'>) {
  return order.order_number || order.id;
}

function productSummary(order: BuyerOrder, lang: 'ar' | 'en'): string {
  const items = order.items ?? [];
  if (items.length === 0) return '—';
  return items
    .map((item) => {
      const name =
        lang === 'ar' && item.product?.name_ar
          ? item.product.name_ar
          : item.product?.name ?? '?';
      return item.quantity > 1 ? `${name} ×${item.quantity}` : name;
    })
    .join(', ');
}

export default function BuyerOrdersPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role;
  const allowed = !!role && BUYER_ROLES.includes(role);

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPending, setShowPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullIds, setShowFullIds] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Record<string, FulfillmentItem[]>>({});
  const [loadingFul, setLoadingFul] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<BuyerOrder | null>(null);
  const [confirmId, setConfirmId] = useState('');

  useEffect(() => {
    setPage(0);
  }, [showPending, searchQuery]);

  useEffect(() => {
    if (!user || !allowed) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(false);

      const [{ count: paid }, { count: pending }, { data: paidRows }] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('total').eq('status', 'paid'),
      ]);
      if (cancelled) return;
      setPaidCount(paid ?? 0);
      setPendingCount(pending ?? 0);
      setTotalSpent((paidRows ?? []).reduce((s, o) => s + Number(o.total), 0));

      let q = supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            quantity,
            total_price,
            products ( name, name_ar )
          )
        `,
          { count: 'exact' },
        )
        .in('status', showPending ? ['paid', 'pending'] : ['paid'])
        .order('created_at', { ascending: false });

      const term = searchQuery.trim().replace(/[%_,]/g, '');
      if (term) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
          q = q.eq('id', term);
        } else {
          q = q.ilike('order_number', `%${term}%`);
        }
      }

      const { from, to } = pageRange(page);
      const { data, count, error } = await q.range(from, to);
      if (cancelled) return;

      if (error) {
        console.error('BuyerOrdersPage load', error);
        setLoadError(true);
        setOrders([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        ...row,
        items: ((row.order_items as {
          quantity: number;
          total_price?: number;
          products: { name: string; name_ar: string | null } | null;
        }[] | null) ?? []).map((item) => ({
          quantity: item.quantity,
          total_price: Number(item.total_price) || 0,
          product: item.products ?? undefined,
        })),
      })) as BuyerOrder[];

      setOrders(rows);
      setTotal(count ?? 0);
      setLoading(false);
    };

    const tmr = window.setTimeout(load, searchQuery.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [user, allowed, reloadKey, page, showPending, searchQuery]);

  if (!allowed) return <Navigate to="/dashboard" replace />;

  const toggleDetails = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (fulfillment[orderId]) return;
    setLoadingFul(orderId);
    const { data } = await supabase.rpc('get_order_fulfillment', { p_order_id: orderId });
    setFulfillment((prev) => ({ ...prev, [orderId]: (data as FulfillmentItem[]) ?? [] }));
    setLoadingFul(null);
  };

  const copyContent = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* manual */
    }
  };

  const confirmMatches = (typed: string, order: BuyerOrder) => {
    const v = typed.trim().toLowerCase();
    if (!v) return false;
    if (v === order.id.toLowerCase()) return true;
    return !!order.order_number && v === order.order_number.toLowerCase();
  };

  const runCancel = async () => {
    if (!confirmOrder || !confirmMatches(confirmId, confirmOrder)) return;
    setActionBusy(confirmOrder.id);
    setActionMsg(null);
    const { error } = await cancelOrder(confirmOrder.id);
    setActionBusy(null);
    if (error) {
      setActionMsg({
        kind: 'err',
        text:
          error === 'cannot_cancel'
            ? t('لا يمكن إلغاء هذا الطلب.', 'This order cannot be cancelled.')
            : error === 'forbidden'
              ? t('غير مسموح.', 'Not allowed.')
              : t('تعذر الإلغاء.', 'Could not cancel.'),
      });
      return;
    }
    setConfirmOrder(null);
    setConfirmId('');
    setActionMsg({ kind: 'ok', text: t('تم إلغاء الطلب.', 'Order cancelled.') });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="buyer-ledger mx-auto w-full max-w-6xl text-start">
      <header className="buyer-ledger__hero">
        <div className="min-w-0">
          <p className="buyer-ledger__kicker">{t('خزنتك', 'Your vault')}</p>
          <h2 className="buyer-ledger__title text-balance">{t('طلباتي', 'My Orders')}</h2>
          <p className="buyer-ledger__lede text-pretty">
            {t(
              'إيصالاتك ومفاتيح التسليم — افتح أي طلب للنسخ.',
              'Your receipts and delivery keys — open any order to copy.',
            )}
          </p>
        </div>
        <div className="buyer-ledger__hero-stats" aria-live="polite">
          <div>
            <p className="buyer-ledger__stat-label">{t('مدفوع', 'Paid')}</p>
            <p className="buyer-ledger__stat-value tabular-nums">{loading ? '—' : paidCount}</p>
          </div>
          <div>
            <p className="buyer-ledger__stat-label">{t('الإجمالي', 'Spent')}</p>
            <p className="buyer-ledger__stat-value tabular-nums">
              {loading ? '—' : formatMoney(totalSpent)}
            </p>
          </div>
        </div>
      </header>

      {actionMsg ? (
        <div
          className={`buyer-ledger__flash ${actionMsg.kind === 'ok' ? 'is-ok' : 'is-err'}`}
          role="status"
        >
          {actionMsg.text}
        </div>
      ) : null}

      <div className="buyer-ledger__toolbar">
        <label className="buyer-ledger__search">
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ابحث برقم الطلب…', 'Search order number…')}
            aria-label={t('بحث الطلبات', 'Search orders')}
          />
          {searchQuery ? (
            <button
              type="button"
              className={`buyer-ledger__search-clear ${focusRing}`}
              onClick={() => setSearchQuery('')}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <div className="buyer-ledger__toolbar-end">
          {pendingCount > 0 ? (
            <button
              type="button"
              className={`buyer-ledger__chip ${showPending ? 'is-on' : ''} ${focusRing}`}
              aria-pressed={showPending}
              onClick={() => setShowPending((v) => !v)}
            >
              {showPending
                ? t('إخفاء غير المكتمل', 'Hide unfinished')
                : t(`عرض غير المكتمل (${pendingCount})`, `Show unfinished (${pendingCount})`)}
            </button>
          ) : null}
          <label className={`buyer-ledger__toggle ${showFullIds ? 'is-on' : ''} ${focusRing}`}>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={showFullIds}
              onChange={(e) => setShowFullIds(e.target.checked)}
            />
            <span>{t('معرّف تقني', 'Technical ID')}</span>
          </label>
        </div>
      </div>

      {loading ? (
        <ul className="buyer-ledger__list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="buyer-ledger__card buyer-ledger__card--skel" />
          ))}
        </ul>
      ) : loadError ? (
        <div className="buyer-ledger__empty" role="alert">
          <p className="buyer-ledger__empty-title text-error">
            {t('تعذر تحميل الطلبات. حاول مجدداً.', 'Could not load orders. Try again.')}
          </p>
          <button
            type="button"
            className={`buyer-ledger__retry ${focusRing}`}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {t('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="buyer-ledger__empty">
          <Package size={30} aria-hidden />
          <p className="buyer-ledger__empty-title">
            {searchQuery.trim()
              ? t('لا نتائج لهذا البحث', 'No results for this search')
              : t('الخزنة فاضية بعد', 'Vault is empty')}
          </p>
          <p className="buyer-ledger__empty-sub text-pretty">
            {searchQuery.trim()
              ? t('جرّب رقم طلب آخر.', 'Try another order number.')
              : t('تصفّح المتجر واحصل على أول مفتاحك.', 'Browse the store and claim your first key.')}
          </p>
          {searchQuery.trim() ? (
            <button
              type="button"
              className={`buyer-ledger__retry ${focusRing}`}
              onClick={() => setSearchQuery('')}
            >
              {t('مسح البحث', 'Clear search')}
            </button>
          ) : (
            <Link to="/" className={`buyer-ledger__empty-cta ${focusRing}`}>
              {t('تصفح المنتجات', 'Browse products')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="buyer-ledger__list" role="list">
            {orders.map((order, i) => {
              const open = expandedId === order.id;
              const summary = productSummary(order, lang);
              const status = STATUS_LABEL[order.status];
              const canCancel = order.status === 'pending';
              const items = fulfillment[order.id] ?? [];
              return (
                <li
                  key={order.id}
                  className="buyer-ledger__card-wrap"
                  style={{ '--buyer-i': i } as CSSProperties}
                >
                  <article
                    className={[
                      'buyer-ledger__card',
                      open ? 'is-open' : '',
                      order.status === 'pending' ? 'is-pending' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="buyer-ledger__row">
                      <div className="buyer-ledger__main min-w-0">
                        <p className="buyer-ledger__product truncate" title={summary}>
                          {summary}
                        </p>
                        <div className="buyer-ledger__meta">
                          <span className={`buyer-ledger__status buyer-ledger__status--${order.status}`}>
                            <span className="buyer-ledger__status-dot" aria-hidden />
                            {status ? t(status[0], status[1]) : order.status}
                          </span>
                          <span className="buyer-ledger__id inline-flex flex-col gap-0.5" dir="ltr">
                            <span className="inline-flex items-center gap-1">
                              {orderCode(order)}
                              <button
                                type="button"
                                className={`buyer-ledger__copy ${focusRing}`}
                                onClick={() => void copyContent(`id-${order.id}`, orderCode(order))}
                                aria-label={
                                  copied === `id-${order.id}`
                                    ? t('تم النسخ', 'Copied')
                                    : t('نسخ رقم الطلب', 'Copy order number')
                                }
                              >
                                {copied === `id-${order.id}` ? (
                                  <Check size={12} aria-hidden />
                                ) : (
                                  <Copy size={12} aria-hidden />
                                )}
                              </button>
                            </span>
                            {showFullIds ? (
                              <span className="text-[10px] opacity-50 break-all">{order.id}</span>
                            ) : null}
                          </span>
                          <time dateTime={order.created_at}>{formatDate(order.created_at, lang)}</time>
                        </div>
                      </div>
                      <div className="buyer-ledger__aside">
                        <p className="buyer-ledger__amount tabular-nums">{formatMoney(Number(order.total))}</p>
                        <div className="buyer-ledger__actions">
                          {order.status === 'paid' ? (
                            <button
                              type="button"
                              className={`buyer-ledger__details ${focusRing}`}
                              aria-expanded={open}
                              aria-controls={`buyer-ful-${order.id}`}
                              onClick={() => void toggleDetails(order.id)}
                            >
                              <KeyRound size={14} aria-hidden />
                              {open ? t('إخفاء', 'Hide') : t('التسليم', 'Fulfillment')}
                              <ChevronDown
                                size={14}
                                className={open ? 'rotate-180' : ''}
                                aria-hidden
                              />
                            </button>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              className={`buyer-ledger__cancel ${focusRing}`}
                              disabled={actionBusy === order.id}
                              onClick={() => {
                                setConfirmId('');
                                setConfirmOrder(order);
                              }}
                            >
                              {actionBusy === order.id ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <Ban size={13} aria-hidden />
                              )}
                              {t('إلغاء', 'Cancel')}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {open ? (
                      <div className="buyer-ledger__fulfill" id={`buyer-ful-${order.id}`}>
                        {loadingFul === order.id ? (
                          <div className="flex justify-center py-8" role="status">
                            <span className="loading loading-spinner loading-sm text-primary" />
                          </div>
                        ) : items.length === 0 ? (
                          <p className="buyer-ledger__fulfill-empty">
                            {t(
                              'لا توجد بيانات تسليم لهذا الطلب.',
                              'No fulfillment data for this order.',
                            )}
                          </p>
                        ) : (
                          <ul className="buyer-ledger__ful-list">
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
                                lang === 'ar' && item.name_ar?.trim()
                                  ? item.name_ar
                                  : item.name;
                              const copyKey = `${order.id}-${idx}`;
                              return (
                                <li key={copyKey} className="buyer-ledger__ful-item">
                                  <div className="buyer-ledger__ful-head">
                                    <p className="buyer-ledger__ful-name truncate">{name}</p>
                                    {item.quantity > 1 ? (
                                      <span className="tabular-nums opacity-55">×{item.quantity}</span>
                                    ) : null}
                                  </div>
                                  <div className="buyer-ledger__ful-body">
                                    <pre>
                                      {body || t('لا يوجد محتوى', 'No content')}
                                    </pre>
                                    {body ? (
                                      <button
                                        type="button"
                                        className={`buyer-ledger__copy buyer-ledger__copy--lg ${focusRing}`}
                                        onClick={() => void copyContent(copyKey, body)}
                                        aria-label={t('نسخ', 'Copy')}
                                      >
                                        {copied === copyKey ? (
                                          <Check size={14} aria-hidden />
                                        ) : (
                                          <Copy size={14} aria-hidden />
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
          <PageBar
            page={page}
            total={total}
            pageSize={DASHBOARD_PAGE_SIZE}
            onPage={setPage}
            t={t}
          />
        </>
      )}

      {pendingCount > 0 && !showPending ? (
        <p className="buyer-ledger__hint text-pretty">
          {t(
            'المحاولات غير المكتملة مخفية. الطلبات المدفوعة فقط هي مشترياتك.',
            'Unfinished checkouts are hidden. Only paid orders are real purchases.',
          )}
        </p>
      ) : null}

      <Modal
        open={!!confirmOrder}
        onClose={() => {
          if (actionBusy) return;
          setConfirmOrder(null);
          setConfirmId('');
        }}
        labelledBy="buyer-cancel-title"
        boxClassName="max-w-md text-start"
        closeLabel={t('إغلاق', 'Close')}
      >
        {confirmOrder ? (
          <>
            <h3 id="buyer-cancel-title" className="font-semibold text-lg tracking-tight mb-2 text-warning">
              {t('تأكيد إلغاء الطلب', 'Confirm cancel order')}
            </h3>
            <p className="text-sm text-base-content/70 mb-3 leading-relaxed">
              {t(
                'إلغاء هذا الطلب. اكتب رقم الطلب للتأكيد:',
                'Cancel this order. Type the order number to confirm:',
              )}
            </p>
            <p className="text-xs font-mono font-semibold mb-2 break-all select-all" dir="ltr">
              {orderCode(confirmOrder)}
            </p>
            <input
              className="input input-bordered input-sm w-full mb-4 font-mono focus:outline-none focus:ring-0 focus:border-base-content/40 focus:shadow-none"
              value={confirmId}
              onChange={(e) => setConfirmId(e.target.value)}
              placeholder={t('الصق رقم الطلب هنا', 'Paste order number here')}
              autoComplete="off"
              dir="ltr"
              spellCheck={false}
              disabled={!!actionBusy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runCancel();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!!actionBusy}
                onClick={() => {
                  setConfirmOrder(null);
                  setConfirmId('');
                }}
              >
                {t('رجوع', 'Back')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-warning gap-1"
                disabled={
                  !!actionBusy ||
                  !confirmMatches(confirmId, confirmOrder)
                }
                onClick={() => void runCancel()}
              >
                {actionBusy === confirmOrder.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Ban size={14} aria-hidden />
                )}
                {t('تأكيد الإلغاء', 'Confirm cancel')}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
