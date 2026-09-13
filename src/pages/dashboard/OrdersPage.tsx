import { useState, useEffect, Fragment } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Copy, Check, ChevronDown, Package, ArrowRight, X, Search, AlertTriangle, Trash2, Ban } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
// PERF-2: defer owner ledger CSS off storefront main chunk (loads with OrdersPage).
void import('../../styles/dashboard-owner-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { roleLabel, ROLE_INFO } from '../../lib/roles';
import UserAvatar from '../../components/ui/UserAvatar';
import PageBar from '../../components/dashboard/PageBar';
import { fulfillmentDisplay, parseKeyUnits } from '../../lib/fulfillment';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parseProductTypesJson, productTypeLabel } from '../../lib/productTypes';
import { cancelOrder, deleteOrder } from '../../lib/orderActions';
import Modal from '../../components/ui/Modal';
import { formatMoney } from '../../lib/formatMoney';
import { ORDER_STATUS_LABEL as STATUS_LABEL } from '../../lib/orderStatus';
import type { Order, Profile, Role } from '../../types';
import SellerOrdersPage from './SellerOrdersPage';
import BuyerOrdersPage from './BuyerOrdersPage';

const STAFF_ORDERS_ROLES: Role[] = ['owner', 'admin'];
const BUYER_ORDERS_ROLES: Role[] = ['buyer', 'member', 'moderator', 'support'];
const ORDERS_PAGE_ROLES: Role[] = [...STAFF_ORDERS_ROLES, ...BUYER_ORDERS_ROLES];

export default function OrdersPage() {
  const role = useAuthStore((s) => s.profile?.role);
  if (role === 'seller') return <SellerOrdersPage />;
  if (role === 'buyer' || role === 'member' || role === 'moderator' || role === 'support') {
    return <BuyerOrdersPage />;
  }
  return <StaffBuyerOrdersPage />;
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  paid: { dot: 'bg-success/70', text: 'text-success/90' },
  pending: { dot: 'bg-warning/70', text: 'text-warning/90' },
  failed: { dot: 'bg-error/70', text: 'text-error/90' },
  refunded: { dot: 'bg-info/70', text: 'text-info/90' },
  cancelled: { dot: 'bg-base-content/45', text: 'text-base-content/80' },
};

function OrderStatus({ status, t }: { status: string; t: (ar: string, en: string) => string }) {
  const label = STATUS_LABEL[status];
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.cancelled;
  const badge =
    status === 'paid'
      ? 'badge-success'
      : status === 'pending'
        ? 'badge-warning'
        : status === 'failed'
          ? 'badge-error'
          : 'badge-ghost';
  return (
    <span
      className={`badge badge-sm badge-outline gap-1.5 font-semibold tracking-tight ${badge} ${style.text}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden />
      {label ? t(label[0], label[1]) : status}
    </span>
  );
}

function OrderIdCopy({
  id,
  orderNumber,
  full,
  copied,
  onCopy,
  t,
}: {
  id: string;
  orderNumber: string | null | undefined;
  full: boolean;
  copied: string | null;
  onCopy: (key: string, content: string) => void;
  t: (ar: string, en: string) => string;
}) {
  const code = orderNumber || id;
  const key = `order-id-${id}`;
  const done = copied === key;
  return (
    <span className="mt-0.5 inline-flex flex-col gap-0.5 min-w-0 max-w-full">
      <span className="inline-flex items-center gap-1 min-w-0 max-w-full">
        <span className="font-mono text-xs text-base-content/55 truncate" dir="ltr" title={code}>
          {code}
        </span>
        <button
          type="button"
          className={`btn btn-ghost btn-xs btn-square shrink-0 text-base-content/45 hover:text-base-content ${focusRing}`}
          onClick={() => onCopy(key, code)}
          aria-label={done ? t('تم النسخ', 'Copied') : t('نسخ رقم الطلب', 'Copy order number')}
          title={done ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
        >
          {done ? <Check size={12} className="text-success" aria-hidden /> : <Copy size={12} aria-hidden />}
        </button>
      </span>
      {full ? (
        <span className="font-mono text-[10px] text-base-content/35 break-all" dir="ltr" title={id}>
          {id}
        </span>
      ) : null}
    </span>
  );
}

const TYPE_STYLE: Record<string, string> = {
  account: 'bg-primary/10 text-primary',
  gift_card: 'bg-info/10 text-info',
  code: 'bg-warning/10 text-warning',
  other: 'bg-base-content/8 text-base-content/80',
};

function ProductTypeChip({
  productType,
  t,
}: {
  productType: string;
  t: (ar: string, en: string) => string;
}) {
  const { settings } = useSiteSettings();
  const [ar, en] = productTypeLabel(productType, parseProductTypesJson(settings.product_types_json));
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight ${TYPE_STYLE[productType] ?? TYPE_STYLE.other}`}
    >
      {t(ar, en)}
    </span>
  );
}

type SortMode = 'recent' | 'price_high' | 'price_low' | 'role';

type StaffOrder = Order & {
  buyer?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role'> | null;
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

interface FulfillmentItem {
  product_id: string;
  name: string;
  name_ar: string | null;
  product_type: string;
  quantity: number;
  content: string | null;
  /** Newline-joined one-time keys claimed for this line (key-pool products). */
  keys: string | null;
  key_units?: unknown;
}

function productSummary(order: Order, lang: 'ar' | 'en'): string {
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

function formatOrderDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Paid-order flags written by finalize_paid_order — staff must act. */
const ATTENTION_NOTE_RE = /KEY_SHORTFALL|STOCK_SHORTFALL|AMOUNT_MISMATCH|COUPON_CAP|COUPON_EXPIRED/;

function orderNeedsAttention(notes: string | null | undefined): boolean {
  return !!notes && ATTENTION_NOTE_RE.test(notes);
}

function attentionLabel(notes: string, t: (ar: string, en: string) => string): string {
  if (notes.includes('KEY_SHORTFALL')) return t('نقص مفاتيح', 'Key shortfall');
  if (notes.includes('STOCK_SHORTFALL')) return t('نقص مخزون', 'Stock shortfall');
  if (notes.includes('AMOUNT_MISMATCH')) return t('مبلغ غير مطابق', 'Amount mismatch');
  if (notes.includes('COUPON_CAP')) return t('حد الكوبون', 'Coupon cap');
  if (notes.includes('COUPON_EXPIRED')) return t('كوبون منتهي', 'Coupon expired');
  return t('يحتاج مراجعة', 'Needs review');
}

const ROLE_RANK: Record<string, number> = {
  owner: 0,
  admin: 1,
  moderator: 2,
  seller: 3,
  buyer: 4,
  member: 5,
};

function FulfillmentPanel({
  orderId,
  items,
  loading,
  failed,
  copied,
  onCopy,
  t,
}: {
  orderId: string;
  items: FulfillmentItem[];
  loading: boolean;
  failed?: boolean;
  copied: string | null;
  onCopy: (key: string, content: string) => void;
  t: (ar: string, en: string) => string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.28, ease: EASE_OUT }}
      className="overflow-hidden border-t border-base-300/50 bg-base-300/20"
    >
      {loading ? (
        <div className="flex justify-center py-8" role="status">
          <span className="loading loading-spinner loading-sm text-primary" />
        </div>
      ) : failed ? (
        <p className="px-4 py-6 text-sm text-error text-center" role="alert">
          {t(
            'تعذر تحميل بيانات التسليم — أغلق التفاصيل وأعد فتحها للمحاولة.',
            'Could not load fulfillment — close and reopen details to retry.',
          )}
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-base-content/55 text-center">
          {t('لا توجد بيانات تسليم لهذا الطلب.', 'No fulfillment data for this order.')}
        </p>
      ) : (
        <div className="p-4 space-y-3">
          {items.map((item, idx) => (
              <div
                key={`${orderId}-${item.product_id}-${idx}`}
                className="rounded-lg border border-base-300/60 bg-base-200/80 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <ProductTypeChip productType={item.product_type} t={t} />
                  {item.quantity > 1 && (
                    <span className="text-xs text-base-content/50 tabular-nums">×{item.quantity}</span>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <pre className="flex-1 rounded-lg bg-base-200/50 px-3.5 py-3 text-sm font-mono font-normal leading-relaxed tracking-tight text-base-content/85 whitespace-pre-wrap break-all text-start">
                    {item.content || item.keys || parseKeyUnits(item.key_units)
                      ? fulfillmentDisplay(item.content, item.keys, parseKeyUnits(item.key_units))
                      : t('لا يوجد محتوى', 'No content')}
                  </pre>
                  {(item.content || item.keys || parseKeyUnits(item.key_units)) && (
                    <button
                      type="button"
                      onClick={() =>
                        onCopy(
                          `${orderId}-${idx}`,
                          fulfillmentDisplay(item.content, item.keys, parseKeyUnits(item.key_units)),
                        )
                      }
                      className={`btn btn-ghost btn-square btn-sm shrink-0 ${focusRing}`}
                      aria-label={t('نسخ', 'Copy')}
                    >
                      {copied === `${orderId}-${idx}` ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BuyerChip({
  buyer,
  lang,
  t,
  onClick,
}: {
  buyer?: StaffOrder['buyer'];
  lang: 'ar' | 'en';
  t: (ar: string, en: string) => string;
  onClick?: () => void;
}) {
  if (!buyer) {
    return (
      <span className="text-xs text-base-content/70">{t('مشتري غير معروف', 'Unknown buyer')}</span>
    );
  }
  const name = buyer.full_name?.trim() || buyer.email || t('مستخدم', 'User');
  const inner = (
    <>
      <UserAvatar
        name={buyer.full_name}
        email={buyer.email}
        avatarUrl={buyer.avatar_url}
        sizeClass="w-6"
      />
      <span className="min-w-0 text-start">
        <span className="block text-sm font-medium truncate leading-snug text-base-content/85">{name}</span>
        <span className="block text-xs text-base-content/45 truncate">
          {roleLabel(buyer.role, lang)}
        </span>
      </span>
    </>
  );

  if (!onClick) {
    return <span className="inline-flex items-center gap-2 min-w-0">{inner}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 min-w-0 rounded-md px-1 py-0.5 -ms-1 hover:bg-base-300/30 transition-colors duration-150 ${focusRing}`}
      title={t('عرض كل طلبات هذا المستخدم', 'View all orders from this user')}
    >
      {inner}
    </button>
  );
}

function StaffBuyerOrdersPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const canAccessOrders = !!profile && ORDERS_PAGE_ROLES.includes(profile.role);
  const isBuyer = !!profile && BUYER_ORDERS_ROLES.includes(profile.role);
  const isStaff = !!profile && STAFF_ORDERS_ROLES.includes(profile.role);
  const isOwner = profile?.role === 'owner';
  const reduceMotion = useReducedMotion();

  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [attentionCount, setAttentionCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [filteredUser, setFilteredUser] = useState<Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showPending, setShowPending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Record<string, FulfillmentItem[]>>({});
  const [fulfillmentError, setFulfillmentError] = useState<Record<string, boolean>>({});
  const [loadingFulfillment, setLoadingFulfillment] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { kind: 'cancel' | 'delete'; order: Order }>(null);
  const [confirmId, setConfirmId] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [showFullIds, setShowFullIds] = useState(false);

  const filterUserId = searchParams.get('user') || null;

  useEffect(() => {
    setPage(0);
  }, [filterUserId, roleFilter, sortMode, attentionOnly, showPending, statusFilter]);

  useEffect(() => {
    if (!user || !canAccessOrders) return;
    let cancelled = false;

    const mapRows = (data: unknown[] | null): StaffOrder[] =>
      ((data ?? []) as Record<string, unknown>[]).map((row) => ({
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
      })) as StaffOrder[];

    const attachBuyers = async (rows: StaffOrder[]) => {
      if (!isStaff || rows.length === 0) return rows;
      const ids = [...new Set(rows.map((o) => o.user_id).filter(Boolean))] as string[];
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .in('id', ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      for (const order of rows) {
        order.buyer = order.user_id ? byId.get(order.user_id) ?? null : null;
      }
      return rows;
    };

    const load = async () => {
      setLoading(true);
      setLoadError(false);

      const attentionOr =
        'notes.ilike.%KEY_SHORTFALL%,notes.ilike.%STOCK_SHORTFALL%,notes.ilike.%AMOUNT_MISMATCH%,notes.ilike.%COUPON_CAP%,notes.ilike.%COUPON_EXPIRED%';

      // Buyer header counts + spend (own rows via RLS — small).
      if (isBuyer) {
        const [{ count: paid }, { count: pending }, { data: paidRows }] = await Promise.all([
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('orders').select('total').eq('status', 'paid'),
        ]);
        if (cancelled) return;
        setPaidCount(paid ?? 0);
        setPendingCount(pending ?? 0);
        setTotalSpent((paidRows ?? []).reduce((s, o) => s + Number(o.total), 0));
      }

      if (isStaff) {
        const { count: attn } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .or(attentionOr);
        if (cancelled) return;
        setAttentionCount(attn ?? 0);

        if (filterUserId) {
          const { data: peep } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, role')
            .eq('id', filterUserId)
            .maybeSingle();
          if (cancelled) return;
          setFilteredUser(peep ?? null);
        } else {
          setFilteredUser(null);
        }
      }

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
        );

      if (isBuyer) {
        q = q.in('status', showPending ? ['paid', 'pending'] : ['paid']);
      }
      if (isStaff && filterUserId) q = q.eq('user_id', filterUserId);
      if (isStaff && attentionOnly) q = q.or(attentionOr);
      if (isStaff && !attentionOnly && statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }

      if (isStaff && roleFilter !== 'all') {
        const { data: peeps } = await supabase.from('profiles').select('id').eq('role', roleFilter);
        const ids = (peeps ?? []).map((p) => p.id);
        if (ids.length === 0) {
          if (cancelled) return;
          setOrders([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        q = q.in('user_id', ids);
      }

      const term = searchQuery.trim().replace(/[%_,]/g, '');
      if (term) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
          q = q.eq('id', term);
        } else if (isStaff) {
          const { data: peeps } = await supabase
            .from('profiles')
            .select('id')
            .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(80);
          const ids = (peeps ?? []).map((p) => p.id);
          if (ids.length > 0) {
            q = q.or(
              `order_number.ilike.%${term}%,notes.ilike.%${term}%,user_id.in.(${ids.join(',')})`,
            );
          } else {
            q = q.or(`order_number.ilike.%${term}%,notes.ilike.%${term}%`);
          }
        } else {
          q = q.ilike('order_number', `%${term}%`);
        }
      }

      if (sortMode === 'price_high') q = q.order('total', { ascending: false });
      else if (sortMode === 'price_low') q = q.order('total', { ascending: true });
      else q = q.order('created_at', { ascending: false });

      const { from, to } = pageRange(page);
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (cancelled) return;

      if (error) {
        console.error('OrdersPage load', error);
        setLoadError(true);
        setOrders([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      let rows = mapRows(data as unknown[]);
      if (sortMode === 'role' && isStaff) {
        rows = await attachBuyers(rows);
        rows = [...rows].sort((a, b) => {
          const ra = ROLE_RANK[a.buyer?.role ?? 'member'] ?? 99;
          const rb = ROLE_RANK[b.buyer?.role ?? 'member'] ?? 99;
          if (ra !== rb) return ra - rb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } else {
        rows = await attachBuyers(rows);
        if (isStaff && !attentionOnly) {
          rows = [...rows].sort((a, b) => {
            const aa = orderNeedsAttention(a.notes) ? 0 : 1;
            const bb = orderNeedsAttention(b.notes) ? 0 : 1;
            return aa - bb;
          });
        }
      }

      setOrders(rows);
      setTotal(count ?? 0);
      setLoading(false);
    };

    const tmr = window.setTimeout(load, searchQuery.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [
    user,
    isStaff,
    isBuyer,
    canAccessOrders,
    reloadKey,
    page,
    filterUserId,
    roleFilter,
    sortMode,
    searchQuery,
    attentionOnly,
    showPending,
    statusFilter,
  ]);

  const visibleOrders = orders;

  const filterByUser = (userId: string | null | undefined) => {
    if (!userId) return;
    setSearchParams({ user: userId });
    setExpandedId(null);
  };

  const clearUserFilter = () => {
    setSearchParams({});
  };

  const toggleDetails = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (fulfillment[orderId]) return;

    setLoadingFulfillment(orderId);
    const { data, error } = await supabase.rpc('get_order_fulfillment', { p_order_id: orderId });
    if (error) {
      // Don't cache a fake empty — a transient failure must stay retry-able.
      setFulfillmentError((prev) => ({ ...prev, [orderId]: true }));
    } else {
      setFulfillment((prev) => ({ ...prev, [orderId]: (data as FulfillmentItem[]) ?? [] }));
      setFulfillmentError((prev) => ({ ...prev, [orderId]: false }));
    }
    setLoadingFulfillment(null);
  };

  const copyContent = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* manual copy */ }
  };

  const closeConfirm = () => {
    if (actionBusy) return;
    setConfirmAction(null);
    setConfirmId('');
    setConfirmError(null);
  };

  const idMatches = (typed: string, order: Order) => {
    const v = typed.trim().toLowerCase();
    if (!v) return false;
    if (v === order.id.toLowerCase()) return true;
    return !!order.order_number && v === order.order_number.toLowerCase();
  };

  const runConfirm = async () => {
    if (!confirmAction) return;
    const { kind, order } = confirmAction;
    if (!idMatches(confirmId, order)) {
      setConfirmError(t('رقم الطلب غير مطابق.', 'Order number does not match.'));
      return;
    }
    setActionBusy(order.id);
    setActionMsg(null);
    setConfirmError(null);
    const { error } =
      kind === 'cancel' ? await cancelOrder(order.id) : await deleteOrder(order.id);
    setActionBusy(null);
    if (error) {
      // Keep the dialog open — the error renders inside it, not behind it.
      setConfirmError(
        error === 'cannot_cancel'
          ? t('لا يمكن إلغاء هذا الطلب.', 'This order cannot be cancelled.')
          : error === 'forbidden'
            ? t('غير مسموح.', 'Not allowed.')
            : kind === 'cancel'
              ? t('تعذر الإلغاء.', 'Could not cancel.')
              : t('تعذر الحذف.', 'Could not delete.'),
      );
      return;
    }
    if (kind === 'delete' && expandedId === order.id) setExpandedId(null);
    setConfirmAction(null);
    setConfirmId('');
    setActionMsg({
      kind: 'ok',
      text:
        kind === 'cancel'
          ? t('تم إلغاء الطلب.', 'Order cancelled.')
          : t('تم حذف الطلب.', 'Order deleted.'),
    });
    setReloadKey((k) => k + 1);
  };

  if (!canAccessOrders) {
    return <Navigate to="/dashboard" replace />;
  }

  const canCancel = (order: Order) => {
    if (order.status === 'cancelled') return false;
    // Pending only — paid is not cancellable (use Delete / external refund).
    return order.status === 'pending';
  };

  const detailsBtn = (order: Order, compact?: boolean) => {
    if (order.status !== 'paid') return null;
    const open = expandedId === order.id;
    return (
      <button
        type="button"
        onClick={() => toggleDetails(order.id)}
        className={
          isOwner
            ? `owner-ledger__details ${focusRing}`
            : `inline-flex items-center justify-center gap-1.5 text-sm font-medium text-base-content/75 hover:text-primary transition-colors duration-150 active:scale-[0.98] ${focusRing} ${compact ? 'w-full py-2.5' : 'py-1.5 px-2'}`
        }
        aria-expanded={open}
        aria-controls={`order-fulfillment-${order.id}`}
      >
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: EASE_OUT }}
          className="inline-flex"
        >
          <ChevronDown size={14} aria-hidden />
        </motion.span>
        {open
          ? t('إخفاء التفاصيل', 'Hide details')
          : t('تفاصيل المنتج', 'Product details')}
      </button>
    );
  };

  const rowActions = (order: Order, compact?: boolean) => {
    const busy = actionBusy === order.id;
    const showCancel = isBuyer && canCancel(order);
    const showDelete = isStaff;
    const details = detailsBtn(order, compact);
    if (!showCancel && !showDelete && !details) return null;
    return (
      <div
        className={
          isOwner
            ? 'owner-ledger__actions'
            : `flex flex-wrap items-center gap-1 ${compact ? 'justify-stretch border-t border-base-300/40 pt-0' : 'justify-end'}`
        }
      >
        {details}
        {showCancel ? (
          <button
            type="button"
            className={`btn btn-ghost btn-xs gap-1 text-warning ${focusRing} ${compact ? 'flex-1' : ''}`}
            disabled={busy}
            onClick={() => {
              setConfirmId('');
              setConfirmAction({ kind: 'cancel', order });
            }}
            aria-label={t('إلغاء الطلب', 'Cancel order')}
          >
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Ban size={13} aria-hidden />}
            {t('إلغاء', 'Cancel')}
          </button>
        ) : null}
        {showDelete ? (
          <button
            type="button"
            className={
              isOwner
                ? `owner-ledger__danger ${focusRing}`
                : `btn btn-ghost btn-xs gap-1 text-error ${focusRing} ${compact ? 'flex-1' : ''}`
            }
            disabled={busy}
            onClick={() => {
              setConfirmId('');
              setConfirmAction({ kind: 'delete', order });
            }}
            aria-label={t('حذف الطلب', 'Delete order')}
          >
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={13} aria-hidden />}
            {t('حذف', 'Delete')}
          </button>
        ) : null}
      </div>
    );
  };

  const countLabel =
    lang === 'ar'
      ? total === 1
        ? 'طلب'
        : 'طلبات'
      : total === 1
        ? 'order'
        : 'orders';

  const statusChips: { id: 'all' | 'paid' | 'pending' | 'cancelled'; ar: string; en: string }[] = [
    { id: 'all', ar: 'الكل', en: 'All' },
    { id: 'paid', ar: 'مدفوع', en: 'Paid' },
    { id: 'pending', ar: 'معلق', en: 'Pending' },
    { id: 'cancelled', ar: 'ملغى', en: 'Cancelled' },
  ];

  const renderOrderCard = (order: StaffOrder, index: number) => {
    const attention = orderNeedsAttention(order.notes);
    const open = expandedId === order.id;
    const summary = productSummary(order, lang);

    if (isOwner) {
      return (
        <li
          key={order.id}
          className="owner-ledger__card-wrap"
          style={{ ['--owner-i' as string]: String(index) }}
        >
          <article
            className={[
              'owner-ledger__card',
              attention ? 'is-attention' : '',
              open ? 'is-open' : '',
              order.status === 'pending' ? 'is-pending' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="owner-ledger__row">
              <div className="owner-ledger__main min-w-0">
                <p className="owner-ledger__product truncate text-balance" title={summary}>
                  {summary}
                </p>
                <div className="owner-ledger__meta">
                  <OrderStatus status={order.status} t={t} />
                  <OrderIdCopy
                    id={order.id}
                    orderNumber={order.order_number}
                    full={showFullIds}
                    copied={copied}
                    onCopy={copyContent}
                    t={t}
                  />
                  <time dateTime={order.created_at}>{formatOrderDate(order.created_at, lang)}</time>
                </div>
                {attention && order.notes ? (
                  <p className="owner-ledger__attn">
                    <AlertTriangle size={12} aria-hidden />
                    {attentionLabel(order.notes, t)}
                  </p>
                ) : null}
                <BuyerChip
                  buyer={order.buyer}
                  lang={lang}
                  t={t}
                  onClick={() => filterByUser(order.user_id)}
                />
              </div>
              <div className="owner-ledger__aside">
                <p className="owner-ledger__amount tabular-nums">{formatMoney(order.total)}</p>
                {rowActions(order, true)}
              </div>
            </div>
            <AnimatePresence initial={false}>
              {open && (
                <div id={`order-fulfillment-${order.id}`} className="owner-ledger__fulfill">
                  <FulfillmentPanel
                    orderId={order.id}
                    items={fulfillment[order.id] ?? []}
                    loading={loadingFulfillment === order.id}
                    failed={fulfillmentError[order.id] === true}
                    copied={copied}
                    onCopy={copyContent}
                    t={t}
                  />
                </div>
              )}
            </AnimatePresence>
          </article>
        </li>
      );
    }

    return (
      <motion.li
        key={order.id}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.01 : 0.2,
          delay: reduceMotion ? 0 : Math.min(index, 8) * 0.028,
          ease: EASE_OUT,
        }}
        className={`rounded-lg border overflow-hidden motion-safe:transition-colors ${
          attention
            ? 'border-warning/55 bg-warning/8'
            : `border-base-300 bg-base-200/50 hover:bg-base-200 ${order.status === 'pending' ? 'opacity-70' : ''}`
        }`}
      >
        <div className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-base font-semibold leading-snug text-base-content truncate text-balance" title={summary}>
                {summary}
              </p>
              <OrderIdCopy
                id={order.id}
                orderNumber={order.order_number}
                full={showFullIds}
                copied={copied}
                onCopy={copyContent}
                t={t}
              />
            </div>
            <div className="shrink-0 text-end space-y-1.5">
              <OrderStatus status={order.status} t={t} />
              {isStaff && order.notes && attention && (
                <p className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                  <AlertTriangle size={12} aria-hidden />
                  {attentionLabel(order.notes, t)}
                </p>
              )}
              <p className="text-lg font-bold tabular-nums tracking-tight text-base-content leading-none">
                {formatMoney(order.total)}
              </p>
            </div>
          </div>

          {isStaff && (
            <BuyerChip
              buyer={order.buyer}
              lang={lang}
              t={t}
              onClick={() => filterByUser(order.user_id)}
            />
          )}

          <time className="text-xs text-base-content/50" dateTime={order.created_at}>
            {formatOrderDate(order.created_at, lang)}
          </time>
        </div>
        {rowActions(order, true)}
        <AnimatePresence initial={false}>
          {open && (
            <div id={`order-fulfillment-${order.id}`}>
              <FulfillmentPanel
                orderId={order.id}
                items={fulfillment[order.id] ?? []}
                loading={loadingFulfillment === order.id}
                failed={fulfillmentError[order.id] === true}
                copied={copied}
                onCopy={copyContent}
                t={t}
              />
            </div>
          )}
        </AnimatePresence>
      </motion.li>
    );
  };

  return (
    <div
      className={
        isOwner
          ? 'owner-ledger mx-auto w-full max-w-6xl text-start'
          : 'orders-page-enter w-full text-start space-y-4'
      }
    >
      {isOwner ? (
        <header className="owner-ledger__hero">
          <div className="min-w-0">
            <p className="owner-ledger__kicker">{t('دفتر الخزنة', 'Vault ledger')}</p>
            <h2 className="owner-ledger__title text-balance">{t('الطلبات', 'Orders')}</h2>
            <p className="owner-ledger__lede text-pretty">
              {t(
                'كل طلبات المتجر — صفّ، راقب التنبيهات، وافتح التسليم.',
                'Every store order — filter, watch alerts, open fulfillment.',
              )}
            </p>
          </div>
          <p className="owner-ledger__count" aria-live="polite">
            <strong className="tabular-nums">{loading ? '—' : total}</strong>
            <span>
              {countLabel}
              {statusFilter !== 'all' && !attentionOnly
                ? ` · ${t(
                    statusChips.find((c) => c.id === statusFilter)?.ar ?? '',
                    statusChips.find((c) => c.id === statusFilter)?.en ?? '',
                  )}`
                : ''}
              {attentionOnly ? ` · ${t('مراجعة', 'Review')}` : ''}
            </span>
          </p>
        </header>
      ) : null}

      {actionMsg ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            actionMsg.kind === 'ok'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-error/40 bg-error/10 text-error'
          }`}
          role="status"
        >
          {actionMsg.text}
        </div>
      ) : null}
      {isStaff && attentionCount > 0 && (
        <div
          className={
            isOwner
              ? 'owner-ledger__alert'
              : 'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/45 bg-warning/10 px-3 py-2.5'
          }
          role="status"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle size={16} aria-hidden />
            {t(
              `${attentionCount} يحتاج مراجعة`,
              `${attentionCount} need review`,
            )}
          </span>
          <button
            type="button"
            className={
              isOwner
                ? `owner-ledger__alert-btn ${attentionOnly ? 'is-on' : ''} ${focusRing}`
                : `btn btn-sm ${attentionOnly ? 'btn-warning' : 'btn-ghost border border-warning/40'} ${focusRing}`
            }
            onClick={() => {
              setAttentionOnly((v) => !v);
              if (!attentionOnly) setStatusFilter('all');
            }}
            aria-pressed={attentionOnly}
          >
            {attentionOnly
              ? t('إظهار الكل', 'Show all')
              : t('عرضها فقط', 'Show these only')}
          </button>
        </div>
      )}

      <div className={isOwner ? 'owner-ledger__toolbar' : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'}>
        <label
          className={
            isOwner
              ? 'owner-ledger__search'
              : 'input input-bordered input-sm flex items-center gap-2 w-full max-w-md bg-base-200 border-base-300 focus-within:outline-none focus-within:border-base-content/25 focus-within:shadow-none'
          }
        >
          <Search size={14} className="opacity-50 shrink-0" aria-hidden />
          <input
            type="search"
            className={isOwner ? undefined : 'grow bg-transparent outline-none focus:outline-none focus:ring-0 text-sm'}
            placeholder={
              isStaff
                ? t('بحث...', 'Search...')
                : t('ابحث برقم الطلب…', 'Search order number…')
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            aria-label={t('بحث الطلبات', 'Search orders')}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(0);
              }}
              className={isOwner ? `owner-ledger__search-clear ${focusRing}` : `btn btn-ghost btn-xs btn-square ${focusRing}`}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        {isStaff ? (
          <div
            className={isOwner ? 'owner-ledger__filters' : 'flex flex-wrap items-center gap-1.5'}
            role="group"
            aria-label={t('تصفية', 'Filters')}
          >
            {statusChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={
                  isOwner
                    ? `owner-ledger__chip ${statusFilter === chip.id && !attentionOnly ? 'is-on' : ''} ${focusRing}`
                    : `btn btn-xs ${statusFilter === chip.id && !attentionOnly ? 'btn-primary' : 'btn-ghost border border-base-300'}`
                }
                aria-pressed={statusFilter === chip.id && !attentionOnly}
                disabled={attentionOnly}
                onClick={() => {
                  setStatusFilter(chip.id);
                  setAttentionOnly(false);
                  setPage(0);
                }}
              >
                {t(chip.ar, chip.en)}
              </button>
            ))}
            <select
              className={isOwner ? 'owner-ledger__select' : 'select select-bordered select-xs w-auto bg-base-200 border-base-300'}
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label={t('ترتيب', 'Sort')}
            >
              <option value="recent">{t('الأحدث', 'Newest')}</option>
              <option value="price_high">{t('سعر ↓', 'Price ↓')}</option>
              <option value="price_low">{t('سعر ↑', 'Price ↑')}</option>
              <option value="role">{t('الرتبة', 'By role')}</option>
            </select>
            <select
              className={isOwner ? 'owner-ledger__select' : 'select select-bordered select-xs w-auto bg-base-200 border-base-300'}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
              aria-label={t('الرتبة', 'Role')}
            >
              <option value="all">{t('كل الرتب', 'All roles')}</option>
              {ROLE_INFO.map((r) => (
                <option key={r.id} value={r.id}>
                  {lang === 'ar' ? r.labelAr : r.labelEn}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {isBuyer && pendingCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowPending((v) => !v)}
            className={`btn btn-xs ${showPending ? 'btn-primary' : 'btn-ghost border border-base-300'} ${focusRing}`}
            aria-pressed={showPending}
          >
            {showPending
              ? t('إخفاء غير المكتمل', 'Hide unfinished')
              : t('عرض غير المكتمل', 'Show unfinished')}
          </button>
        ) : null}
      </div>

      {filterUserId ? (
        <div
          className={
            isOwner
              ? 'owner-ledger__user-filter'
              : 'flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-200/50 px-3 py-2'
          }
        >
          <span className="text-xs text-base-content/55">{t('مصفّى:', 'Filtered:')}</span>
          <BuyerChip buyer={filteredUser} lang={lang} t={t} />
          <button
            type="button"
            onClick={clearUserFilter}
            className={`btn btn-ghost btn-xs gap-1 ms-auto ${focusRing}`}
          >
            <X size={12} aria-hidden />
            {t('إلغاء التصفية', 'Clear filter')}
          </button>
        </div>
      ) : null}

      {!isOwner ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-balance" aria-live="polite">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-primary leading-none">
              {loading ? '—' : isBuyer ? paidCount : total}
            </span>
            <span className="text-sm font-medium text-base-content/65">
              {isBuyer
                ? t(
                    `مدفوع${pendingCount ? ` · ${pendingCount} غير مكتمل` : ''}`,
                    `paid${pendingCount ? ` · ${pendingCount} unfinished` : ''}`,
                  )
                : countLabel}
              {isStaff && statusFilter !== 'all' && !attentionOnly ? (
                <>
                  <span className="text-base-content/35 mx-1.5" aria-hidden>·</span>
                  {t(
                    statusChips.find((c) => c.id === statusFilter)?.ar ?? '',
                    statusChips.find((c) => c.id === statusFilter)?.en ?? '',
                  )}
                </>
              ) : null}
              {attentionOnly ? (
                <>
                  <span className="text-base-content/35 mx-1.5" aria-hidden>·</span>
                  {t('مراجعة', 'Review')}
                </>
              ) : null}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {isBuyer && paidCount > 0 ? (
              <p className="text-sm">
                <span className="text-base-content/50">{t('الإجمالي', 'Spent')}</span>{' '}
                <span className="font-bold tabular-nums text-base-content">{formatMoney(totalSpent)}</span>
              </p>
            ) : null}
            <label
              className={`inline-flex items-center gap-2 cursor-pointer rounded-lg border px-2.5 py-1.5 motion-safe:transition-colors ${
                showFullIds
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-base-300 bg-base-200/60 hover:border-base-content/25'
              }`}
            >
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={showFullIds}
                onChange={(e) => setShowFullIds(e.target.checked)}
              />
              <span
                className={`text-sm font-semibold tracking-tight leading-none ${
                  showFullIds ? 'text-base-content' : 'text-base-content/75'
                }`}
              >
                {t('معرّف تقني', 'Technical ID')}
              </span>
            </label>
          </div>
        </div>
      ) : (
        <label className={`owner-ledger__toggle ${showFullIds ? 'is-on' : ''} ${focusRing}`}>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={showFullIds}
            onChange={(e) => setShowFullIds(e.target.checked)}
          />
          <span>{t('معرّف تقني', 'Technical ID')}</span>
        </label>
      )}

      {loading ? (
        isOwner ? (
          <div className="owner-ledger__list" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="owner-ledger__card owner-ledger__card--skeleton" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-14" role="status" aria-live="polite">
            <span className="loading loading-spinner loading-md text-primary" aria-label={t('جارٍ التحميل', 'Loading')} />
          </div>
        )
      ) : loadError ? (
        <div
          className={
            isOwner
              ? 'owner-ledger__empty'
              : 'rounded-lg border border-error/30 bg-error/5 px-6 py-12 text-center space-y-3'
          }
          role="alert"
        >
          <p className="text-sm text-error/90">
            {t('تعذر تحميل الطلبات. حاول مجدداً.', 'Could not load orders. Try again.')}
          </p>
          <button
            type="button"
            className={isOwner ? `owner-ledger__retry ${focusRing}` : 'btn btn-sm btn-outline'}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {t('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div
          className={
            isOwner
              ? 'owner-ledger__empty'
              : 'rounded-lg border border-base-300 bg-base-200/40 px-6 py-14 text-center space-y-3'
          }
        >
          <Package size={32} className="mx-auto text-base-content/35" aria-hidden />
          <p className="text-sm font-medium text-base-content/65">
            {searchQuery.trim()
              ? t('لا نتائج لهذا البحث', 'No results for this search')
              : filterUserId
                ? t('لا توجد طلبات لهذا المستخدم', 'No orders for this user')
                : t('لا توجد طلبات بعد', 'No orders yet')}
          </p>
          {searchQuery.trim() ? (
            <button type="button" onClick={() => setSearchQuery('')} className={`btn btn-ghost btn-sm ${focusRing}`}>
              {t('مسح البحث', 'Clear search')}
            </button>
          ) : filterUserId ? (
            <button type="button" onClick={clearUserFilter} className={`btn btn-ghost btn-sm ${focusRing}`}>
              {t('إظهار الكل', 'Show all')}
            </button>
          ) : isBuyer ? (
            <Link to="/" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
              {t('تصفح المنتجات', 'Browse products')}
              <ArrowRight size={14} aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : isOwner ? (
        <section className="owner-ledger__section">
          <ul className="owner-ledger__list" role="list">
            {visibleOrders.map((order, i) => renderOrderCard(order, i))}
          </ul>
          <PageBar
            page={page}
            total={total}
            pageSize={DASHBOARD_PAGE_SIZE}
            onPage={setPage}
            t={t}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <ul className="md:hidden space-y-2" role="list">
            {visibleOrders.map((order, i) => renderOrderCard(order, i))}
          </ul>

          <div className="hidden md:block overflow-x-auto rounded-box border border-base-300">
            <table className="table table-zebra">
              <thead>
                <tr className="text-base-content/55">
                  {isStaff && <th>{t('المشتري', 'Buyer')}</th>}
                  <th>{t('المنتج', 'Product')}</th>
                  <th>{t('المبلغ', 'Amount')}</th>
                  <th>{t('الحالة', 'Status')}</th>
                  <th>{t('التاريخ', 'Date')}</th>
                  <th className="text-end">{t('إجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order, index) => (
                  <Fragment key={order.id}>
                    <motion.tr
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: reduceMotion ? 0.01 : 0.18,
                        delay: reduceMotion ? 0 : Math.min(index, 10) * 0.022,
                        ease: EASE_OUT,
                      }}
                      className={`border-base-300/50 ${
                        orderNeedsAttention(order.notes) ? 'bg-warning/5' : ''
                      } ${order.status === 'pending' ? 'opacity-75' : ''}`}
                    >
                      {isStaff && (
                        <td className="min-w-[9rem] py-3">
                          <BuyerChip
                            buyer={order.buyer}
                            lang={lang}
                            t={t}
                            onClick={() => filterByUser(order.user_id)}
                          />
                        </td>
                      )}
                      <td className="max-w-[18rem] py-3">
                        <span
                          className="text-sm font-semibold leading-snug line-clamp-2 text-base-content"
                          title={productSummary(order, lang)}
                        >
                          {productSummary(order, lang)}
                        </span>
                        <OrderIdCopy
                          id={order.id}
                          orderNumber={order.order_number}
                          full={showFullIds}
                          copied={copied}
                          onCopy={copyContent}
                          t={t}
                        />
                        {isStaff && order.notes && orderNeedsAttention(order.notes) ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-warning">
                            <AlertTriangle size={11} aria-hidden />
                            {attentionLabel(order.notes, t)}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-base font-bold tabular-nums tracking-tight text-base-content whitespace-nowrap py-3">
                        {formatMoney(order.total)}
                      </td>
                      <td className="py-3">
                        <OrderStatus status={order.status} t={t} />
                      </td>
                      <td className="text-sm text-base-content/55 whitespace-nowrap py-3">
                        <time dateTime={order.created_at}>{formatOrderDate(order.created_at, lang)}</time>
                      </td>
                      <td className="text-end py-3">{rowActions(order)}</td>
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {expandedId === order.id && order.status === 'paid' && (
                        <tr key={`${order.id}-details`}>
                          <td colSpan={isStaff ? 6 : 5} className="p-0">
                            <div id={`order-fulfillment-${order.id}`}>
                              <FulfillmentPanel
                                orderId={order.id}
                                items={fulfillment[order.id] ?? []}
                                loading={loadingFulfillment === order.id}
                                failed={fulfillmentError[order.id] === true}
                                copied={copied}
                                onCopy={copyContent}
                                t={t}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <PageBar
            page={page}
            total={total}
            pageSize={DASHBOARD_PAGE_SIZE}
            onPage={setPage}
            t={t}
          />
        </section>
      )}

      {isBuyer && pendingCount > 0 && !showPending && (
        <p className="text-xs text-base-content/45 text-pretty max-w-prose">
          {t(
            'المحاولات غير المكتملة مخفية. الطلبات المدفوعة فقط هي مشترياتك.',
            'Unfinished checkouts are hidden. Only paid orders are real purchases.',
          )}
        </p>
      )}

      <Modal
        open={!!confirmAction}
        onClose={closeConfirm}
        labelledBy="order-confirm-title"
        boxClassName="max-w-md text-start"
        closeLabel={t('إغلاق', 'Close')}
      >
        {confirmAction ? (
          <>
            <h3
              id="order-confirm-title"
              className={`font-semibold text-lg tracking-tight mb-2 ${
                confirmAction.kind === 'delete' ? 'text-error' : 'text-warning'
              }`}
            >
              {confirmAction.kind === 'delete'
                ? t('تأكيد حذف الطلب', 'Confirm delete order')
                : t('تأكيد إلغاء الطلب', 'Confirm cancel order')}
            </h3>
            <p className="text-sm text-base-content/70 mb-3 leading-relaxed">
              {confirmAction.kind === 'delete' && confirmAction.order.status === 'paid'
                ? t(
                    'حذف نهائي. المفاتيح المسلّمة لن تُعاد للبيع. مخزون المنتجات اليدوية يُعاد. اكتب رقم الطلب للتأكيد:',
                    'Permanent delete. Delivered keys stay claimed. Manual stock is restored. Type the order number to confirm:',
                  )
                : confirmAction.kind === 'delete'
                  ? t(
                      'حذف هذا الطلب نهائياً. اكتب رقم الطلب للتأكيد:',
                      'Permanently delete this order. Type the order number to confirm:',
                    )
                  : t(
                      'إلغاء هذا الطلب. اكتب رقم الطلب للتأكيد:',
                      'Cancel this order. Type the order number to confirm:',
                    )}
            </p>
            <p className="text-xs font-mono font-semibold mb-2 break-all select-all" dir="ltr">
              {confirmAction.order.order_number || confirmAction.order.id}
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
                  void runConfirm();
                }
              }}
            />
            {confirmError ? (
              <p className="mb-3 text-sm text-error" role="alert">
                {confirmError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!!actionBusy}
                onClick={closeConfirm}
              >
                {t('رجوع', 'Back')}
              </button>
              <button
                type="button"
                className={`btn btn-sm gap-1 ${
                  confirmAction.kind === 'delete' ? 'btn-error' : 'btn-warning'
                }`}
                disabled={
                  !!actionBusy || !idMatches(confirmId, confirmAction.order)
                }
                onClick={() => void runConfirm()}
              >
                {actionBusy === confirmAction.order.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : confirmAction.kind === 'delete' ? (
                  <Trash2 size={14} aria-hidden />
                ) : (
                  <Ban size={14} aria-hidden />
                )}
                {confirmAction.kind === 'delete'
                  ? t('تأكيد الحذف', 'Confirm delete')
                  : t('تأكيد الإلغاء', 'Confirm cancel')}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
