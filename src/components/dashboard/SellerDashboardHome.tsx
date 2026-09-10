import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import ProductMedia from '../ui/ProductMedia';
import UserAvatar from '../ui/UserAvatar';
import { formatMoney } from '../../lib/formatMoney';

type Notif = {
  id: string;
  title: string;
  title_ar: string | null;
  is_read: boolean;
  created_at: string;
};

type Listing = {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  status: string;
  stock: number;
  price: number;
  thumbnail_url: string | null;
  updated_at: string;
};

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function formatDate(iso: string, lang: 'ar' | 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SellerDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [saleCount, setSaleCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('بائع', 'Seller');
  const handle = (profile?.username || '').trim();
  const publicPath = handle ? `/seller/${encodeURIComponent(handle)}` : null;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const uid = user.id;
      const [listRes, liveRes, draftRes, lowRes, notifRes, salesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, name_ar, slug, status, stock, price, thumbnail_url, updated_at')
          .eq('seller_id', uid)
          .order('updated_at', { ascending: false })
          .limit(12),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', uid)
          .eq('status', 'active'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', uid)
          .eq('status', 'draft'),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', uid)
          .eq('status', 'active')
          .lte('stock', 2),
        supabase
          .from('notifications')
          .select('id, title, title_ar, is_read, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.rpc('count_seller_sales', { p_q: null }),
      ]);
      if (cancelled) return;

      setListings((listRes.data ?? []) as Listing[]);
      setLiveCount(liveRes.count ?? 0);
      setDraftCount(draftRes.count ?? 0);
      setLowStockCount(lowRes.count ?? 0);
      const tally = Array.isArray(salesRes.data) ? salesRes.data[0] : salesRes.data;
      setSaleCount(Number(tally?.sale_count) || 0);
      setRevenue(Number(tally?.revenue) || 0);
      const notifs = (notifRes.data ?? []) as Notif[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const titleOf = (p: Listing) => (lang === 'ar' && p.name_ar?.trim() ? p.name_ar : p.name);

  const statusOf = (p: Listing) => {
    if (p.status === 'draft') return { ar: 'مسودة', en: 'Draft', tone: 'draft' as const };
    if (p.status === 'inactive') return { ar: 'مخفي', en: 'Hidden', tone: 'muted' as const };
    if (p.stock <= 0) return { ar: 'نفد', en: 'Sold out', tone: 'warn' as const };
    if (p.stock <= 2) return { ar: 'مخزون قليل', en: 'Low stock', tone: 'warn' as const };
    return { ar: 'معروض', en: 'Live', tone: 'live' as const };
  };

  return (
    <div className="seller-home mx-auto w-full max-w-6xl text-start">
      <header className="seller-home__stage">
        <div className="seller-home__identity">
          <UserAvatar
            name={profile?.full_name}
            email={user?.email}
            avatarUrl={profile?.avatar_url}
            sizeClass="w-14 h-14"
            className="seller-home__avatar"
          />
          <div className="min-w-0">
            <p className="seller-home__eyebrow">{t('كشكك', 'Your stall')}</p>
            <h2 className="seller-home__title text-balance">
              {t('أهلاً،', 'Hey,')} {firstName}
            </h2>
            {handle ? (
              <p className="seller-home__handle" dir="ltr">
                @{handle}
              </p>
            ) : (
              <p className="seller-home__handle seller-home__handle--muted">
                {t('عيّن اسم مستخدم من ملفي الشخصي', 'Set a username in My Profile')}
              </p>
            )}
            <p className="seller-home__lede text-pretty">
              {t(
                'رفّ عروضك، خلّ الصور والأسعار تبيع عنك، وافتح صفحتك العامة للزبائن.',
                'Stock your shelf, let sharp listings sell for you, and open your public page to buyers.',
              )}
            </p>
          </div>
        </div>

        <div className="seller-home__stage-aside">
          {publicPath ? (
            <Link to={publicPath} className={`seller-home__public ${focusRing}`}>
              <Store size={16} strokeWidth={2.25} aria-hidden />
              <span>{t('افتح كشكي', 'Open my stall')}</span>
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          ) : (
            <Link to="/dashboard/profile" className={`seller-home__public seller-home__public--ghost ${focusRing}`}>
              <Store size={16} strokeWidth={2.25} aria-hidden />
              <span>{t('إعداد الصفحة العامة', 'Set up public page')}</span>
            </Link>
          )}

          <nav className="seller-home__dock" aria-label={t('اختصارات البائع', 'Seller shortcuts')}>
            <Link to="/dashboard/products" className={`seller-home__dock-item ${focusRing}`}>
              <Package size={18} strokeWidth={2.25} aria-hidden />
              <span>{t('عروضي', 'My listings')}</span>
            </Link>
            <Link to="/dashboard/products/new" className={`seller-home__dock-item seller-home__dock-item--hot ${focusRing}`}>
              <Plus size={18} strokeWidth={2.25} aria-hidden />
              <span>{t('عرض جديد', 'New listing')}</span>
            </Link>
            <Link to="/dashboard/orders" className={`seller-home__dock-item ${focusRing}`}>
              <ShoppingBag size={18} strokeWidth={2.25} aria-hidden />
              <span>{t('مبيعاتي', 'My sales')}</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="seller-home__shelf-wrap" aria-labelledby="seller-shelf-title">
        <div className="seller-home__shelf-head">
          <h3 id="seller-shelf-title" className="seller-home__shelf-title">
            {t('رفّك', 'Your shelf')}
          </h3>
          <Link to="/dashboard/products" className={`seller-home__shelf-link ${focusRing}`}>
            {t('إدارة الكل', 'Manage all')}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        </div>

        {loading ? (
          <div className="seller-home__shelf seller-home__shelf--loading" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="seller-home__tile seller-home__tile--skeleton" />
            ))}
          </div>
        ) : (
          <ul className="seller-home__shelf" role="list">
            {listings.map((p, i) => {
              const st = statusOf(p);
              return (
                <li
                  key={p.id}
                  className="seller-home__tile-wrap"
                  style={{ ['--seller-i' as string]: String(i) }}
                >
                  <Link
                    to={`/dashboard/products/${p.slug}/edit`}
                    className={`seller-home__tile ${focusRing}`}
                  >
                    <div className="seller-home__tile-media">
                      {p.thumbnail_url ? (
                        <ProductMedia
                          src={p.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                          width={240}
                          sizes="160px"
                        />
                      ) : (
                        <Package size={22} className="opacity-40" aria-hidden />
                      )}
                      <span className={`seller-home__tile-status seller-home__tile-status--${st.tone}`}>
                        {t(st.ar, st.en)}
                      </span>
                    </div>
                    <div className="seller-home__tile-body">
                      <p className="seller-home__tile-name truncate">{titleOf(p)}</p>
                      <p className="seller-home__tile-meta">
                        <span className="tabular-nums font-semibold">{formatMoney(Number(p.price) || 0)}</span>
                        <span className="opacity-55 tabular-nums">
                          {t('مخزون', 'Stock')} {p.stock}
                        </span>
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
            <li
              className="seller-home__tile-wrap"
              style={{ ['--seller-i' as string]: String(listings.length) }}
            >
              <Link
                to="/dashboard/orders"
                className={`seller-home__tile seller-home__tile--revenue ${focusRing}`}
              >
                <Wallet size={22} strokeWidth={2.25} aria-hidden />
                <p className="seller-home__rev-label">{t('إيراد عروضك', 'Your revenue')}</p>
                <p className="seller-home__rev-value tabular-nums">{formatMoney(revenue)}</p>
                <p className="seller-home__rev-meta tabular-nums">
                  {saleCount} {t('مبيعات', 'sales')}
                </p>
              </Link>
            </li>
          </ul>
        )}

        <p className="seller-home__signals" aria-live="polite">
          <span>
            <strong className="tabular-nums">{loading ? '—' : liveCount}</strong>{' '}
            {t('معروض', 'live')}
          </span>
          <span className="seller-home__signals-dot" aria-hidden />
          <span>
            <strong className="tabular-nums">{loading ? '—' : draftCount}</strong>{' '}
            {t('مسودة', 'draft')}
          </span>
          <span className="seller-home__signals-dot" aria-hidden />
          <span>
            <strong className="tabular-nums">{loading ? '—' : lowStockCount}</strong>{' '}
            {t('مخزون قليل', 'low stock')}
          </span>
          <span className="seller-home__signals-dot" aria-hidden />
          <span>
            <strong className="tabular-nums">{loading ? '—' : unreadCount}</strong>{' '}
            {t('تنبيه', 'alerts')}
          </span>
        </p>
      </section>

      <div className="seller-home__lower">
        <section className="seller-home__feed" aria-labelledby="seller-feed-title">
          <div className="seller-home__feed-head">
            <h3 id="seller-feed-title" className="seller-home__feed-title">
              {t('نبض التنبيهات', 'Alert pulse')}
            </h3>
            <Link to="/dashboard/notifications" className={`seller-home__shelf-link ${focusRing}`}>
              {t('الكل', 'All')}
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          </div>
          {loading ? (
            <div className="seller-home__feed-skeleton" aria-busy="true" />
          ) : notifications.length === 0 ? (
            <div className="seller-home__feed-empty">
              <Bell size={22} aria-hidden />
              <p>{t('صافي الآن — رجّع لما يجي تنبيه.', 'Quiet for now — check back when something pings.')}</p>
            </div>
          ) : (
            <ol className="seller-home__timeline">
              {notifications.map((n) => (
                <li key={n.id} className={n.is_read ? undefined : 'is-unread'}>
                  <span className="seller-home__timeline-mark" aria-hidden />
                  <div>
                    <p className="seller-home__timeline-title">
                      {lang === 'ar' && n.title_ar ? n.title_ar : n.title}
                    </p>
                    <p className="seller-home__timeline-date">{formatDate(n.created_at, lang)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="seller-home__playbook" aria-labelledby="seller-playbook-title">
          <h3 id="seller-playbook-title" className="seller-home__playbook-title">
            {t('كيف تبيع أقوى', 'Sell sharper')}
          </h3>
          <ol className="seller-home__playbook-list">
            <li>
              <span className="seller-home__step" aria-hidden>
                1
              </span>
              <span>
                {t(
                  'صورة غلاف قوية + سعر واضح — أول نظرة تقرّر الشراء.',
                  'Strong cover + clear price — the first glance decides the buy.',
                )}
              </span>
            </li>
            <li>
              <span className="seller-home__step" aria-hidden>
                2
              </span>
              <span>
                {t(
                  'وصف بالعربي والإنجليزي يشرح اللي يستلمه الزبون فوراً.',
                  'AR + EN copy that says what the buyer gets — instantly.',
                )}
              </span>
            </li>
            <li>
              <span className="seller-home__step" aria-hidden>
                3
              </span>
              <span>
                {t(
                  'حدّث المخزون قبل ما ينفد — رفّ ممتلئ يبني ثقة.',
                  'Refresh stock before it hits zero — a full shelf builds trust.',
                )}
              </span>
            </li>
            <li>
              <span className="seller-home__step" aria-hidden>
                4
              </span>
              <span>
                {t(
                  'شارك صفحتك العامة — @اسمك هو واجهة كشكك.',
                  'Share your public page — @handle is your stall front.',
                )}
              </span>
            </li>
          </ol>
        </aside>
      </div>
    </div>
  );
}
