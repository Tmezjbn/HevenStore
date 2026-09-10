import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Headphones, Inbox, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { supportStandingTier } from '../../lib/support';

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default function SupportDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t } = useI18n();
  const [openCount, setOpenCount] = useState(0);
  const [escalatedCount, setEscalatedCount] = useState(0);
  const [sellerOpen, setSellerOpen] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const standing = profile?.support_standing ?? 100;
  const tier = supportStandingTier(standing);
  const firstName =
    (profile?.full_name || '').trim().split(/\s+/)[0] || t('الدعم', 'Support');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [openRes, escRes, sellerRes, notifRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('queue', 'general')
          .eq('status', 'open'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'escalated'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('queue', 'seller')
          .in('status', ['open', 'claimed']),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);
      if (cancelled) return;
      setOpenCount(openRes.count ?? 0);
      setEscalatedCount(escRes.count ?? 0);
      setSellerOpen(sellerRes.count ?? 0);
      setUnread(notifRes.count ?? 0);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-5xl text-start space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-content/55">
          {t('مكتب الدعم', 'Support desk')}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('مرحباً،', 'Welcome,')} {firstName}
        </h2>
        <p className="text-sm text-base-content/70 text-pretty max-w-2xl">
          {t(
            'استلم التذاكر، رد في المحادثة، وصعّد فقط عند الحاجة. التصعيد المرفوض يخصم من تقييمك.',
            'Claim tickets, reply in-thread, escalate only when needed. Rejected escalations lower your standing.',
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <span
            className={`badge badge-sm ${
              tier === 'restricted' ? 'badge-error' : tier === 'trusted' ? 'badge-success' : 'badge-ghost'
            }`}
          >
            {t('تقييم التصعيد', 'Escalation standing')}: {standing} · {tier}
          </span>
          {tier === 'restricted' ? (
            <span className="badge badge-error badge-outline badge-sm gap-1">
              <AlertTriangle size={12} aria-hidden />
              {t('التصعيد مقيّد — اطلب إعادة ضبط من المالك/الأدمن', 'Escalation locked — ask Owner/Admin to reset')}
            </span>
          ) : null}
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={t('اختصارات', 'Shortcuts')}>
        <Link to="/dashboard/support" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
          <Headphones size={16} aria-hidden />
          {t('صندوق التذاكر', 'Ticket inbox')}
        </Link>
        <Link to="/dashboard/notifications" className={`btn btn-ghost btn-sm gap-1.5 ${focusRing}`}>
          <Bell size={16} aria-hidden />
          {t('الإشعارات', 'Notifications')}
          {unread > 0 ? <span className="badge badge-sm">{unread}</span> : null}
        </Link>
      </nav>

      <section className="grid gap-3 sm:grid-cols-3" aria-label={t('ملخص الطابور', 'Queue pulse')}>
        <div className="rounded-lg border border-base-300 bg-base-200 p-4">
          <p className="text-xs text-base-content/60 flex items-center gap-1">
            <Inbox size={13} aria-hidden />
            {t('طابور عام مفتوح', 'Open general')}
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{loading ? '—' : openCount}</p>
        </div>
        <div className="rounded-lg border border-base-300 bg-base-200 p-4">
          <p className="text-xs text-base-content/60 flex items-center gap-1">
            <ShieldAlert size={13} aria-hidden />
            {t('مهم / مُصعَّد', 'Important / escalated')}
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{loading ? '—' : escalatedCount}</p>
        </div>
        <div className="rounded-lg border border-base-300 bg-base-200 p-4">
          <p className="text-xs text-base-content/60">{t('قناة البائعين', 'Sellers channel')}</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">{loading ? '—' : sellerOpen}</p>
        </div>
      </section>
    </div>
  );
}
