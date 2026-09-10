import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Bell,
  Clock3,
  Package,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import {
  dashboardStatsSinceIso,
  parseDashboardStatsResetAt,
} from '../../lib/siteSettings';
import { formatMoney } from '../../lib/formatMoney';
import { ORDER_STATUS_LABEL as STATUS_LABEL } from '../../lib/orderStatus';

type RecentOrder = {
  id: string;
  order_number: string | null;
  total: number;
  status: string;
  created_at: string;
  product_name: string;
};

type RecentNotification = {
  id: string;
  title: string;
  title_ar: string | null;
  is_read: boolean;
  created_at: string;
};

type DayPoint = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
};

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function buildLast7Days(
  orders: { total: number; status: string; created_at: string }[],
  lang: 'ar' | 'en',
): DayPoint[] {
  const days: DayPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' }),
      revenue: 0,
      orders: 0,
    });
  }
  const map = new Map(days.map((d) => [d.key, d]));
  for (const o of orders) {
    if (o.status !== 'paid') continue;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(o.total) || 0;
    bucket.orders += 1;
  }
  return days;
}

export default function AdminDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [chartOrders, setChartOrders] = useState<
    { total: number; status: string; created_at: string }[]
  >([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [notifications, setNotifications] = useState<RecentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('مشرف', 'Admin');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const since7 = new Date();
      since7.setDate(since7.getDate() - 7);
      since7.setHours(0, 0, 0, 0);

      const { data: resetRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'dashboard_stats_reset_at')
        .maybeSingle();
      if (cancelled) return;
      const resetAt = parseDashboardStatsResetAt(resetRow?.value ?? '');
      const chartSince = dashboardStatsSinceIso(resetAt, since7.toISOString())!;

      let ordersQ = supabase
        .from('orders')
        .select(
          `
            id,
            order_number,
            total,
            status,
            created_at,
            order_items (
              quantity,
              products ( name, name_ar )
            )
          `,
        )
        .order('created_at', { ascending: false })
        .limit(10);
      if (resetAt) ordersQ = ordersQ.gte('created_at', resetAt);

      let paidQ = supabase.from('orders').select('total, status').eq('status', 'paid');
      if (resetAt) paidQ = paidQ.gte('created_at', resetAt);

      let productsQ = supabase.from('products').select('id', { count: 'exact', head: true });
      if (resetAt) productsQ = productsQ.gte('created_at', resetAt);

      const [ordersRes, notifRes, productsRes, paidRes, pendingRes, chartRes] = await Promise.all([
        ordersQ,
        supabase
          .from('notifications')
          .select('id, title, title_ar, is_read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        productsQ,
        paidQ,
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase
          .from('orders')
          .select('total, status, created_at')
          .gte('created_at', chartSince)
          .order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      const rows = ordersRes.data ?? [];
      const paidRows = paidRes.data ?? [];
      const mapped: RecentOrder[] = rows.slice(0, 8).map((row) => {
        const rawItems = (row.order_items ?? []) as unknown as {
          quantity: number;
          products: { name: string; name_ar: string | null } | null;
        }[];
        const names = rawItems.map((item) => {
          const name =
            lang === 'ar' && item.products?.name_ar
              ? item.products.name_ar
              : item.products?.name ?? '?';
          return item.quantity > 1 ? `${name} ×${item.quantity}` : name;
        });
        return {
          id: row.id,
          order_number: (row as { order_number?: string | null }).order_number ?? null,
          total: Number(row.total),
          status: row.status,
          created_at: row.created_at,
          product_name: names.join(', ') || '—',
        };
      });

      setPaidCount(paidRows.length);
      setTotalRevenue(paidRows.reduce((s, o) => s + Number(o.total), 0));
      setPendingCount(pendingRes.count ?? 0);
      setProductCount(productsRes.count ?? 0);
      setChartOrders(chartRes.data ?? []);
      setRecentOrders(mapped);

      const notifs = (notifRes.data ?? []) as RecentNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, lang]);

  const chartData = useMemo(() => buildLast7Days(chartOrders, lang), [chartOrders, lang]);
  const weekRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const weekOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const pendingHot = !loading && pendingCount > 0;

  return (
    <div className="admin-home mx-auto w-full max-w-6xl text-start">
      <header className="admin-home__mast">
        <div className="admin-home__mast-copy min-w-0">
          <div className="admin-home__mast-row">
            <span className="admin-home__badge">{t('مشرف', 'Admin')}</span>
            <span className="admin-home__mast-meta">
              {t('أرضية التشغيل', 'Ops floor')}
            </span>
          </div>
          <h2 className="admin-home__title text-balance">
            {t('مرحباً،', 'Welcome,')} {firstName}
          </h2>
          <p className="admin-home__lede text-pretty">
            {t(
              'إيراد الأسبوع، الطلبات المعلقة، والكتالوج — كلها هنا.',
              'Week revenue, pending queue, and catalog — all on this floor.',
            )}
          </p>
        </div>
        <nav className="admin-home__dock" aria-label={t('اختصارات المشرف', 'Admin shortcuts')}>
          <Link to="/dashboard/products" className={`admin-home__dock-link admin-home__dock-link--hot ${focusRing}`}>
            <Package size={16} strokeWidth={2.25} aria-hidden />
            {t('المنتجات', 'Products')}
          </Link>
          <Link to="/dashboard/orders" className={`admin-home__dock-link ${focusRing}`}>
            <ShoppingBag size={16} strokeWidth={2.25} aria-hidden />
            {t('الطلبات', 'Orders')}
          </Link>
          <Link to="/dashboard/analytics" className={`admin-home__dock-link ${focusRing}`}>
            <TrendingUp size={16} strokeWidth={2.25} aria-hidden />
            {t('التحليلات', 'Analytics')}
          </Link>
          <Link to="/dashboard/notifications" className={`admin-home__dock-link ${focusRing}`}>
            <Bell size={16} strokeWidth={2.25} aria-hidden />
            {t('تنبيهات', 'Alerts')}
            {unreadCount > 0 ? (
              <span className="admin-home__dock-count tabular-nums">{unreadCount}</span>
            ) : null}
          </Link>
        </nav>
      </header>

      <section className="admin-home__stage" aria-labelledby="admin-stage-title">
        <div className="admin-home__stage-overlay">
          <div className="admin-home__stage-copy">
            <p className="admin-home__stage-kicker" id="admin-stage-title">
              {t('إيراد 7 أيام', '7-day revenue')}
            </p>
            <p className="admin-home__stage-value tabular-nums" aria-live="polite">
              {loading ? '—' : formatMoney(weekRevenue)}
            </p>
            <p className="admin-home__stage-sub">
              {loading
                ? t('…', '…')
                : t(
                    `${weekOrders} طلب مدفوع · مدفوع فقط`,
                    `${weekOrders} paid order${weekOrders === 1 ? '' : 's'} · paid only`,
                  )}
            </p>
          </div>
          <Link to="/dashboard/analytics" className={`admin-home__stage-link ${focusRing}`}>
            {t('التحليلات', 'Analytics')}
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
        <div className="admin-home__stage-chart">
          {loading ? (
            <div className="admin-home__skel admin-home__skel--stage" aria-busy="true" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminDashRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="color-mix(in oklch, var(--color-base-content) 8%, transparent)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: 'color-mix(in oklch, var(--color-base-content) 50%, transparent)',
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-base-200)',
                    border:
                      '1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [formatMoney(value), t('الإيراد', 'Revenue')]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  fill="url(#adminDashRev)"
                  strokeWidth={2.25}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="admin-home__meters" aria-label={t('ملخص', 'Summary')}>
        <article className="admin-home__meter admin-home__meter--lead">
          <Wallet size={15} aria-hidden />
          <div className="min-w-0">
            <p className="admin-home__meter-label">{t('إجمالي المدفوع', 'Paid revenue')}</p>
            <p className="admin-home__meter-value tabular-nums">
              {loading ? '—' : formatMoney(totalRevenue)}
            </p>
          </div>
        </article>
        <article className="admin-home__meter">
          <TrendingUp size={15} aria-hidden />
          <div className="min-w-0">
            <p className="admin-home__meter-label">{t('مدفوع', 'Paid')}</p>
            <p className="admin-home__meter-value tabular-nums">{loading ? '—' : paidCount}</p>
          </div>
        </article>
        <Link
          to="/dashboard/orders"
          className={`admin-home__meter admin-home__meter--pending${pendingHot ? ' is-hot' : ''} ${focusRing}`}
        >
          <Clock3 size={15} aria-hidden />
          <div className="min-w-0">
            <p className="admin-home__meter-label">{t('معلق', 'Pending')}</p>
            <p className="admin-home__meter-value tabular-nums">{loading ? '—' : pendingCount}</p>
          </div>
          {pendingHot ? (
            <span className="admin-home__meter-go">
              {t('راجع', 'Review')}
              <ArrowRight size={12} aria-hidden />
            </span>
          ) : null}
        </Link>
        <article className="admin-home__meter">
          <Package size={15} aria-hidden />
          <div className="min-w-0">
            <p className="admin-home__meter-label">{t('منتجات', 'Products')}</p>
            <p className="admin-home__meter-value tabular-nums">{loading ? '—' : productCount}</p>
          </div>
        </article>
      </section>

      <div className="admin-home__split">
        <section className="admin-home__panel" aria-labelledby="admin-feed-title">
          <div className="admin-home__panel-head">
            <div>
              <h3 id="admin-feed-title" className="admin-home__panel-title">
                {t('التنبيهات', 'Alerts')}
              </h3>
              <p className="admin-home__panel-sub">
                {unreadCount > 0
                  ? t(`${unreadCount} غير مقروء`, `${unreadCount} unread`)
                  : t('صندوق هادئ', 'Quiet inbox')}
              </p>
            </div>
            <Link to="/dashboard/notifications" className={`admin-home__panel-link ${focusRing}`}>
              {t('الكل', 'All')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          {loading ? (
            <div className="admin-home__skel admin-home__skel--feed" aria-busy="true" />
          ) : notifications.length === 0 ? (
            <div className="admin-home__empty">
              <Bell size={22} aria-hidden />
              <p>{t('لا تنبيهات جديدة', 'No new alerts')}</p>
            </div>
          ) : (
            <ul className="admin-home__feed" role="list">
              {notifications.map((n, i) => (
                <li
                  key={n.id}
                  className={n.is_read ? undefined : 'is-unread'}
                  style={{ '--admin-i': i } as CSSProperties}
                >
                  <span className="admin-home__dot" aria-hidden />
                  <div className="min-w-0">
                    <p className="admin-home__feed-title">
                      {lang === 'ar' && n.title_ar ? n.title_ar : n.title}
                    </p>
                    <p className="admin-home__feed-date">{formatDate(n.created_at, lang)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-home__panel admin-home__panel--ledger" aria-labelledby="admin-ledger-title">
          <div className="admin-home__panel-head">
            <div>
              <h3 id="admin-ledger-title" className="admin-home__panel-title">
                {t('آخر الطلبات', 'Recent orders')}
              </h3>
              <p className="admin-home__panel-sub">{t('نشاط المتجر', 'Store activity')}</p>
            </div>
            <Link to="/dashboard/orders" className={`admin-home__panel-link ${focusRing}`}>
              {t('عرض الكل', 'View all')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          {loading ? (
            <div className="admin-home__skel admin-home__skel--list" aria-busy="true" />
          ) : recentOrders.length === 0 ? (
            <div className="admin-home__empty">
              <Package size={22} aria-hidden />
              <p>{t('لا طلبات بعد', 'No orders yet')}</p>
            </div>
          ) : (
            <ul className="admin-home__ledger" role="list">
              {recentOrders.map((order, i) => {
                const label = STATUS_LABEL[order.status];
                return (
                  <li key={order.id} style={{ '--admin-i': i } as CSSProperties}>
                    <Link to="/dashboard/orders" className={`admin-home__order ${focusRing}`}>
                      <div className="min-w-0">
                        <p className="admin-home__order-name">{order.product_name}</p>
                        <p className="admin-home__order-meta">
                          <span className={`admin-home__st admin-home__st--${order.status}`}>
                            {label ? t(label[0], label[1]) : order.status}
                          </span>
                          <span className="font-mono" dir="ltr">
                            {order.order_number || `${order.id.slice(0, 8)}…`}
                          </span>
                          <span>{formatDate(order.created_at, lang)}</span>
                        </p>
                      </div>
                      <p className="admin-home__order-amt tabular-nums">{formatMoney(order.total)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
