import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Headphones, ShieldAlert, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';

type Notif = {
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

export default function ModeratorDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [escalatedCount, setEscalatedCount] = useState(0);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('المشرف', 'Moderator');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadErr(false);
      try {
        const [escRes, openRes, notifRes, unreadRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'escalated'),
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'claimed', 'escalated']),
          supabase
            .from('notifications')
            .select('id, title, title_ar, is_read, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false),
        ]);
        if (cancelled) return;

        if (escRes.error || openRes.error || notifRes.error || unreadRes.error) {
          setLoadErr(true);
        }
        setEscalatedCount(escRes.count ?? 0);
        setOpenTicketCount(openRes.count ?? 0);
        setNotifications((notifRes.data ?? []) as Notif[]);
        setUnreadCount(unreadRes.count ?? 0);
      } catch {
        if (!cancelled) setLoadErr(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mod-home mx-auto w-full max-w-5xl text-start">
      <header className="mod-home__hero">
        <div className="mod-home__hero-copy">
          <p className="mod-home__kicker">{t('مساحة المشرف', 'Moderator desk')}</p>
          <h2 className="mod-home__title text-balance">
            {t('مرحباً،', 'Welcome,')} {firstName}
          </h2>
          <p className="mod-home__lede text-pretty">
            {t(
              'عينك على التذاكر المُصعَّدة والتقييمات — بلا إدارة منتجات.',
              'Your eye on escalated tickets and reviews — not product management.',
            )}
          </p>
        </div>
        <nav className="mod-home__actions" aria-label={t('اختصارات', 'Shortcuts')}>
          <Link to="/dashboard/support" className={`mod-home__action mod-home__action--primary ${focusRing}`}>
            <Headphones size={18} strokeWidth={2.25} aria-hidden />
            <span>{t('الدعم', 'Support')}</span>
          </Link>
          <Link
            to="/dashboard/support?bin=important"
            className={`mod-home__action ${focusRing}`}
          >
            <ShieldAlert size={18} strokeWidth={2.25} aria-hidden />
            <span>{t('مهم', 'Important')}</span>
            {escalatedCount > 0 ? (
              <span className="mod-home__action-badge tabular-nums">{escalatedCount}</span>
            ) : null}
          </Link>
          <Link to="/dashboard/notifications" className={`mod-home__action ${focusRing}`}>
            <Bell size={18} strokeWidth={2.25} aria-hidden />
            <span>{t('التنبيهات', 'Alerts')}</span>
            {unreadCount > 0 ? (
              <span className="mod-home__action-badge tabular-nums">{unreadCount}</span>
            ) : null}
          </Link>
        </nav>
      </header>

      {loadErr ? (
        <p className="mb-4 text-sm text-error" role="alert">
          {t('تعذر تحميل بعض البيانات — المعروض قد يكون ناقصاً.', 'Some data failed to load — figures shown may be incomplete.')}
        </p>
      ) : null}

      <section className="mod-home__pulse" aria-label={t('ملخص الإشراف', 'Moderation pulse')}>
        <div className="mod-home__pulse-cell">
          <p className="mod-home__pulse-label">{t('مُصعَّد / مهم', 'Escalated / Important')}</p>
          <p className="mod-home__pulse-value tabular-nums">{loading ? '—' : escalatedCount}</p>
        </div>
        <div className="mod-home__pulse-cell">
          <p className="mod-home__pulse-label">{t('تذاكر نشطة', 'Active tickets')}</p>
          <p className="mod-home__pulse-value tabular-nums">{loading ? '—' : openTicketCount}</p>
        </div>
        <div className="mod-home__pulse-cell">
          <p className="mod-home__pulse-label">{t('تنبيهات غير مقروءة', 'Unread alerts')}</p>
          <p className="mod-home__pulse-value tabular-nums">{loading ? '—' : unreadCount}</p>
        </div>
        <div className="mod-home__pulse-cell">
          <p className="mod-home__pulse-label flex items-center gap-1">
            <Star size={12} aria-hidden />
            {t('التقييمات', 'Reviews')}
          </p>
          <p className="mod-home__pulse-value text-sm font-medium leading-snug pt-1">
            {t('من صفحة المنتج', 'On product page')}
          </p>
        </div>
      </section>

      <div className="mod-home__split">
        <section className="mod-home__panel">
          <div className="mod-home__panel-head">
            <h3 className="mod-home__panel-title">{t('آخر التنبيهات', 'Latest alerts')}</h3>
            <Link to="/dashboard/notifications" className={`mod-home__panel-link ${focusRing}`}>
              {t('الكل', 'All')}
            </Link>
          </div>
          {loading ? (
            <div className="mod-home__skeleton" aria-busy="true" aria-label={t('جارٍ التحميل', 'Loading')} />
          ) : notifications.length === 0 ? (
            <p className="mod-home__empty">{t('لا تنبيهات بعد', 'No alerts yet')}</p>
          ) : (
            <ul className="mod-home__list">
              {notifications.map((n) => (
                <li key={n.id} className={`mod-home__list-row${n.is_read ? '' : ' is-unread'}`}>
                  <span className="mod-home__list-title line-clamp-2">
                    {lang === 'ar' && n.title_ar?.trim() ? n.title_ar : n.title}
                  </span>
                  <time className="mod-home__list-meta tabular-nums" dateTime={n.created_at}>
                    {formatDate(n.created_at, lang)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mod-home__panel">
          <div className="mod-home__panel-head">
            <h3 className="mod-home__panel-title">{t('تذكير', 'Reminder')}</h3>
          </div>
          <p className="text-sm text-base-content/70 text-pretty p-3">
            {t(
              'رفض التصعيد يحتاج سبباً واضحاً — يرجع التذكرة لطابور الدعم ويخصم من تقييم الوكيل.',
              'Rejecting an escalation needs a clear reason — the ticket returns to Support and lowers the agent’s standing.',
            )}
          </p>
          <Link to="/dashboard/support" className={`btn btn-sm btn-primary m-3 ${focusRing}`}>
            {t('افتح صندوق الدعم', 'Open Support inbox')}
          </Link>
        </section>
      </div>
    </div>
  );
}
