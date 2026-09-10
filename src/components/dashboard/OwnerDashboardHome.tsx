import { useEffect, useMemo, useState } from 'react';
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
  BarChart3,
  Clock3,
  Package,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import StatsResetControl from './StatsResetControl';
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

export default function OwnerDashboardHome() {
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
  const [reloadKey, setReloadKey] = useState(0);

  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('المالك', 'Owner');

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
  }, [user, lang, reloadKey]);

  const chartData = useMemo(() => buildLast7Days(chartOrders, lang), [chartOrders, lang]);
  const weekRevenue = chartData.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="owner-home mx-auto w-full max-w-6xl text-start">
      <header className="owner-home__command">
        <div className="owner-home__command-copy min-w-0">
          <p className="owner-home__kicker">{t('غرفة القيادة', 'Command vault')}</p>
          <h2 className="owner-home__title text-balance">
            {t('أهلاً،', 'Hey,')} {firstName}
          </h2>
          <p className="owner-home__lede text-pretty">
            {t(
              'إيراد المتجر، الطلبات، والكتالوج — اقفز لأي سطح بنقرة.',
              'Store revenue, orders, and catalog — jump to any surface in one tap.',
            )}
          </p>
        </div>
        <div className="owner-home__pulse" aria-live="polite">
          <p className="owner-home__pulse-label">{t('آخر 7 أيام', 'Last 7 days')}</p>
          <p className="owner-home__pulse-value tabular-nums">
            {loading ? '—' : formatMoney(weekRevenue)}
          </p>
          <p className="owner-home__pulse-hint">
            {t('إيراد مدفوع فقط', 'Paid revenue only')}
          </p>
        </div>
      </header>

      <nav className="owner-home__dock" aria-label={t('اختصارات المالك', 'Owner shortcuts')}>
        <Link to="/dashboard/products" className={`owner-home__dock-item owner-home__dock-item--hot ${focusRing}`}>
          <Package size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('المنتجات', 'Products')}</span>
        </Link>
        <Link to="/dashboard/orders" className={`owner-home__dock-item ${focusRing}`}>
          <ShoppingBag size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('الطلبات', 'Orders')}</span>
        </Link>
        <Link to="/dashboard/analytics" className={`owner-home__dock-item ${focusRing}`}>
          <BarChart3 size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('التحليلات', 'Analytics')}</span>
        </Link>
        <Link to="/dashboard/users" className={`owner-home__dock-item ${focusRing}`}>
          <Users size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('المستخدمون', 'Users')}</span>
        </Link>
        <Link to="/dashboard/settings" className={`owner-home__dock-item ${focusRing}`}>
          <Settings size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('الإعدادات', 'Settings')}</span>
        </Link>
        <Link to="/dashboard/notifications" className={`owner-home__dock-item ${focusRing}`}>
          <Bell size={18} strokeWidth={2.25} aria-hidden />
          <span>{t('تنبيهات', 'Alerts')}</span>
          {unreadCount > 0 ? (
            <span className="owner-home__dock-badge tabular-nums">{unreadCount}</span>
          ) : null}
        </Link>
        <div className="owner-home__dock-reset">
          <StatsResetControl onReset={() => setReloadKey((k) => k + 1)} />
        </div>
      </nav>

      <section className="owner-home__signals" aria-label={t('ملخص', 'Summary')}>
        <article className="owner-home__signal owner-home__signal--lead">
          <div className="owner-home__signal-top">
            <Wallet size={16} aria-hidden />
            <span>{t('إجمالي المدفوع', 'Paid revenue')}</span>
          </div>
          <p className="owner-home__signal-value tabular-nums">
            {loading ? '—' : formatMoney(totalRevenue)}
          </p>
          <p className="owner-home__signal-hint">{t('كل الطلبات المدفوعة', 'All paid orders')}</p>
        </article>
        <article className="owner-home__signal">
          <div className="owner-home__signal-top">
            <TrendingUp size={15} aria-hidden />
            <span>{t('مدفوع', 'Paid')}</span>
          </div>
          <p className="owner-home__signal-value tabular-nums">{loading ? '—' : paidCount}</p>
          <p className="owner-home__signal-hint">{t('طلبات مكتملة', 'Completed orders')}</p>
        </article>
        <article className="owner-home__signal owner-home__signal--warn">
          <div className="owner-home__signal-top">
            <Clock3 size={15} aria-hidden />
            <span>{t('معلق', 'Pending')}</span>
          </div>
          <p className="owner-home__signal-value tabular-nums">{loading ? '—' : pendingCount}</p>
          <p className="owner-home__signal-hint">{t('بانتظار الدفع', 'Awaiting payment')}</p>
        </article>
        <article className="owner-home__signal">
          <div className="owner-home__signal-top">
            <Package size={15} aria-hidden />
            <span>{t('منتجات', 'Products')}</span>
          </div>
          <p className="owner-home__signal-value tabular-nums">{loading ? '—' : productCount}</p>
          <p className="owner-home__signal-hint">{t('في الكتالوج', 'In catalog')}</p>
        </article>
      </section>

      <div className="owner-home__mid">
        <section className="owner-home__chart" aria-labelledby="owner-chart-title">
          <div className="owner-home__panel-head">
            <div>
              <h3 id="owner-chart-title" className="owner-home__panel-title">
                {t('إيرادات 7 أيام', '7-day revenue')}
              </h3>
              <p className="owner-home__panel-sub">{t('مدفوع فقط', 'Paid only')}</p>
            </div>
            <Link to="/dashboard/analytics" className={`owner-home__panel-link ${focusRing}`}>
              {t('المزيد', 'More')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          <div className="owner-home__chart-body">
            {loading ? (
              <div className="owner-home__skel owner-home__skel--chart" aria-busy="true" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ownerDashRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="color-mix(in oklch, var(--color-base-content) 10%, transparent)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => `$${v}`}
                  />
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
                    fill="url(#ownerDashRev)"
                    strokeWidth={2.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="owner-home__feed" aria-labelledby="owner-feed-title">
          <div className="owner-home__panel-head">
            <h3 id="owner-feed-title" className="owner-home__panel-title">
              {t('نبض التنبيهات', 'Alert pulse')}
            </h3>
            <Link to="/dashboard/notifications" className={`owner-home__panel-link ${focusRing}`}>
              {t('الكل', 'All')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          {loading ? (
            <div className="owner-home__skel owner-home__skel--feed" aria-busy="true" />
          ) : notifications.length === 0 ? (
            <div className="owner-home__empty">
              <Bell size={26} aria-hidden />
              <p>{t('صافي — لا تنبيهات جديدة.', 'Quiet — no new alerts.')}</p>
            </div>
          ) : (
            <ol className="owner-home__timeline">
              {notifications.map((n) => (
                <li key={n.id} className={n.is_read ? undefined : 'is-unread'}>
                  <span className="owner-home__mark" aria-hidden />
                  <div className="min-w-0">
                    <p className="owner-home__tl-title">
                      {lang === 'ar' && n.title_ar ? n.title_ar : n.title}
                    </p>
                    <p className="owner-home__tl-date">{formatDate(n.created_at, lang)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="owner-home__ledger" aria-labelledby="owner-orders-title">
        <div className="owner-home__panel-head">
          <div>
            <h3 id="owner-orders-title" className="owner-home__panel-title">
              {t('آخر الطلبات', 'Recent orders')}
            </h3>
            <p className="owner-home__panel-sub">{t('أحدث نشاط المتجر', 'Latest store activity')}</p>
          </div>
          <Link to="/dashboard/orders" className={`owner-home__panel-link ${focusRing}`}>
            {t('عرض الكل', 'View all')}
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        {loading ? (
          <div className="owner-home__skel owner-home__skel--list" aria-busy="true" />
        ) : recentOrders.length === 0 ? (
          <div className="owner-home__empty">
            <ShoppingBag size={26} aria-hidden />
            <p>{t('لا طلبات بعد', 'No orders yet')}</p>
          </div>
        ) : (
          <ul className="owner-home__order-list" role="list">
            {recentOrders.map((order, i) => {
              const st = STATUS_LABEL[order.status];
              return (
                <li
                  key={order.id}
                  className="owner-home__order"
                  style={{ ['--owner-i' as string]: String(i) }}
                >
                  <Link to="/dashboard/orders" className={`owner-home__order-link ${focusRing}`}>
                    <div className="min-w-0">
                      <p className="owner-home__order-name truncate">{order.product_name}</p>
                      <p className="owner-home__order-meta">
                        <span className={`owner-home__st owner-home__st--${order.status}`}>
                          {st ? t(st[0], st[1]) : order.status}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="font-mono" dir="ltr">
                          {order.order_number || `${order.id.slice(0, 8)}…`}
                        </span>
                        <span aria-hidden>·</span>
                        <time dateTime={order.created_at}>{formatDate(order.created_at, lang)}</time>
                      </p>
                    </div>
                    <p className="owner-home__order-amt tabular-nums">{formatMoney(order.total)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
