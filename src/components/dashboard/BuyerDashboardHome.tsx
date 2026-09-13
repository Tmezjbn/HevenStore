import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Headphones, Package, ShoppingBag, Store, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { roleLabel } from '../../lib/roles';
import { formatMoney } from '../../lib/formatMoney';
import { ORDER_STATUS_LABEL as STATUS_LABEL } from '../../lib/orderStatus';

type RecentOrder = {
  id: string;
  public_ref: string | null;
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

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function BuyerDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t, lang } = useI18n();
  const role = profile?.role || 'member';

  const [loading, setLoading] = useState(true);
  const [paidCount, setPaidCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [notifications, setNotifications] = useState<RecentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('المستخدم', 'there');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [ordersRes, notifRes, paidRes] = await Promise.all([
        supabase
          .from('orders')
          .select(
            `
            id,
            public_ref,
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
          .limit(5),
        supabase
          .from('notifications')
          .select('id, title, title_ar, is_read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('orders').select('total, status').eq('status', 'paid'),
      ]);

      if (cancelled) return;

      const rows = ordersRes.data ?? [];
      const paidRows = paidRes.data ?? [];
      const mapped: RecentOrder[] = rows
        .filter((row) => row.status === 'paid')
        .slice(0, 5)
        .map((row) => {
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
            public_ref: (row as { public_ref?: string | null }).public_ref ?? null,
            total: Number(row.total),
            status: row.status,
            created_at: row.created_at,
            product_name: names.join(', ') || '—',
          };
        });

      setPaidCount(paidRows.length);
      setTotalSpent(paidRows.reduce((s, o) => s + Number(o.total), 0));
      setRecentOrders(mapped);

      const notifs = (notifRes.data ?? []) as RecentNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, lang]);

  return (
    <div className="buyer-home mx-auto w-full max-w-6xl text-start">
      <header className="buyer-home__mast">
        <div className="buyer-home__mast-copy">
          <div className="buyer-home__mast-row">
            <span className="buyer-home__badge">{roleLabel(role, lang)}</span>
            <span className="buyer-home__mast-meta">{t('خزنتك الشخصية', 'Personal vault')}</span>
          </div>
          <h2 className="buyer-home__title text-balance">
            {t(`أهلاً، ${firstName}`, `Welcome back, ${firstName}`)}
          </h2>
          <p className="buyer-home__lede text-pretty">
            {t(
              'مشترياتك، إيصالاتك، وتنبيهات التسليم — كلها هنا.',
              'Your buys, receipts, and delivery alerts — right here.',
            )}
          </p>
        </div>
        <nav className="buyer-home__dock" aria-label={t('اختصارات المشتري', 'Buyer shortcuts')}>
          <Link to="/" className={`buyer-home__dock-item buyer-home__dock-item--hot ${focusRing}`}>
            <Store size={15} aria-hidden />
            {t('تصفح المتجر', 'Browse store')}
          </Link>
          <Link to="/dashboard/orders" className={`buyer-home__dock-item ${focusRing}`}>
            <ShoppingBag size={15} aria-hidden />
            {t('طلباتي', 'My orders')}
          </Link>
          <Link to="/dashboard/support" className={`buyer-home__dock-item ${focusRing}`}>
            <Headphones size={15} aria-hidden />
            {t('الدعم', 'Support')}
          </Link>
          <Link to="/dashboard/notifications" className={`buyer-home__dock-item ${focusRing}`}>
            <Bell size={15} aria-hidden />
            {t('التنبيهات', 'Alerts')}
            {unreadCount > 0 ? (
              <span className="buyer-home__dock-count tabular-nums">{unreadCount}</span>
            ) : null}
          </Link>
        </nav>
      </header>

      <section className="buyer-home__vault" aria-labelledby="buyer-vault-title">
        <div className="buyer-home__vault-lead">
          <p className="buyer-home__vault-kicker" id="buyer-vault-title">
            <Wallet size={14} aria-hidden />
            {t('إجمالي ما دفعته', 'Total paid')}
          </p>
          <p className="buyer-home__vault-value tabular-nums" aria-live="polite">
            {loading ? '—' : formatMoney(totalSpent)}
          </p>
          <p className="buyer-home__vault-sub">
            {loading
              ? t('…', '…')
              : t(
                  `${paidCount} طلب مدفوع في خزنتك`,
                  `${paidCount} paid order${paidCount === 1 ? '' : 's'} in your vault`,
                )}
          </p>
        </div>
        <div className="buyer-home__vault-meters">
          <article className="buyer-home__meter">
            <p className="buyer-home__meter-label">{t('طلبات مدفوعة', 'Paid orders')}</p>
            <p className="buyer-home__meter-value tabular-nums">{loading ? '—' : paidCount}</p>
          </article>
          <article className="buyer-home__meter buyer-home__meter--signal">
            <p className="buyer-home__meter-label">{t('غير مقروء', 'Unread')}</p>
            <p className="buyer-home__meter-value tabular-nums">{loading ? '—' : unreadCount}</p>
          </article>
        </div>
      </section>

      <div className="buyer-home__split">
        <section className="buyer-home__tickets" aria-labelledby="buyer-tickets-title">
          <div className="buyer-home__panel-head">
            <div className="min-w-0">
              <h3 id="buyer-tickets-title" className="buyer-home__panel-title">
                {t('إيصالات حديثة', 'Recent receipts')}
              </h3>
              <p className="buyer-home__panel-sub">
                {t('آخر المشتريات المدفوعة', 'Latest paid purchases')}
              </p>
            </div>
            <Link to="/dashboard/orders" className={`buyer-home__panel-link ${focusRing}`}>
              {t('الكل', 'View all')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>

          {loading ? (
            <ul className="buyer-home__ticket-list" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="buyer-home__ticket buyer-home__ticket--skel" />
              ))}
            </ul>
          ) : recentOrders.length === 0 ? (
            <div className="buyer-home__empty">
              <Package size={28} aria-hidden />
              <p className="buyer-home__empty-title">{t('الخزنة فاضية بعد', 'Vault is empty')}</p>
              <p className="buyer-home__empty-sub text-pretty">
                {t(
                  'تصفّح المتجر واحصل على أول مفتاحك.',
                  'Browse the store and claim your first key.',
                )}
              </p>
              <Link to="/" className={`buyer-home__empty-cta ${focusRing}`}>
                {t('تصفح المنتجات', 'Browse products')}
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          ) : (
            <ul className="buyer-home__ticket-list" role="list">
              {recentOrders.map((order, i) => {
                const status = STATUS_LABEL[order.status];
                return (
                  <li
                    key={order.id}
                    className="buyer-home__ticket-wrap"
                    style={{ '--buyer-i': i } as CSSProperties}
                  >
                    <Link
                      to="/dashboard/orders"
                      className={`buyer-home__ticket ${focusRing}`}
                    >
                      <div className="buyer-home__ticket-main min-w-0">
                        <p className="buyer-home__ticket-product truncate" title={order.product_name}>
                          {order.product_name}
                        </p>
                        <div className="buyer-home__ticket-meta">
                          <span
                            className={`buyer-home__status buyer-home__status--${order.status}`}
                          >
                            <span className="buyer-home__status-dot" aria-hidden />
                            {status ? t(status[0], status[1]) : order.status}
                          </span>
                          <span className="buyer-home__ticket-id" dir="ltr">
                            {order.public_ref || `${order.id.slice(0, 8)}…`}
                          </span>
                        </div>
                      </div>
                      <div className="buyer-home__ticket-aside">
                        <p className="buyer-home__ticket-amount tabular-nums">
                          {formatMoney(order.total)}
                        </p>
                        <p className="buyer-home__ticket-date">
                          {formatDate(order.created_at, lang)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="buyer-home__pulse" aria-labelledby="buyer-pulse-title">
          <div className="buyer-home__panel-head">
            <h3 id="buyer-pulse-title" className="buyer-home__panel-title">
              {t('نبض التنبيهات', 'Alert pulse')}
            </h3>
            <Link to="/dashboard/notifications" className={`buyer-home__panel-link ${focusRing}`}>
              {t('الكل', 'View all')}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>

          {loading ? (
            <ul className="buyer-home__pulse-list" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="buyer-home__pulse-row buyer-home__pulse-row--skel" />
              ))}
            </ul>
          ) : notifications.length === 0 ? (
            <div className="buyer-home__empty buyer-home__empty--compact">
              <Bell size={22} aria-hidden />
              <p className="buyer-home__empty-title">
                {t('هدوء تام', 'All quiet')}
              </p>
              <p className="buyer-home__empty-sub">
                {t('لا تنبيهات جديدة الآن.', 'No new alerts right now.')}
              </p>
            </div>
          ) : (
            <ul className="buyer-home__pulse-list" role="list">
              {notifications.map((n, i) => (
                <li
                  key={n.id}
                  className={`buyer-home__pulse-row ${n.is_read ? '' : 'is-fresh'}`}
                  style={{ '--buyer-i': i } as CSSProperties}
                >
                  {!n.is_read ? <span className="buyer-home__pulse-dot" aria-hidden /> : null}
                  <div className={`min-w-0 ${n.is_read ? 'ps-3.5' : ''}`}>
                    <p className="buyer-home__pulse-title">
                      {lang === 'ar' && n.title_ar ? n.title_ar : n.title}
                    </p>
                    <p className="buyer-home__pulse-date">{formatDate(n.created_at, lang)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
