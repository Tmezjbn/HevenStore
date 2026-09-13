import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  History,
  Inbox,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { roleLabel } from '../../lib/roles';
import { normalizeUsername } from '../../lib/username';
import { fulfillmentDisplay, parseKeyUnits } from '../../lib/fulfillment';
import { parseProductTypesJson, productTypeLabel } from '../../lib/productTypes';
import Modal from '../../components/ui/Modal';
import UserAvatar from '../../components/ui/UserAvatar';
import type { Profile, Role } from '../../types';
import { PROFILE_ADMIN_COLS } from '../../lib/dbCols';
import { formatMoney } from '../../lib/formatMoney';

type Peek = Pick<Profile, 'id' | 'email' | 'full_name' | 'username' | 'avatar_url' | 'role'>;

interface DeletionRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: Peek;
}

type OrderSnapProduct = {
  name?: string | null;
  name_ar?: string | null;
  slug?: string | null;
  product_type?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
  description_ar?: string | null;
};

type OrderSnapItem = {
  id?: string;
  product_id?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  content?: string | null;
  keys?: string | null;
  key_units?: unknown;
  /** Legacy nested shape before flatten. */
  product_keys?: { content?: string | null; details?: string | null }[] | null;
  products?:
    | (OrderSnapProduct & {
        product_secrets?: { content?: string | null } | { content?: string | null }[] | null;
      })
    | null;
};

type OrderSnap = {
  id: string;
  status?: string;
  total?: number;
  currency?: string;
  discount_amount?: number;
  notes?: string | null;
  created_at?: string;
  order_items?: OrderSnapItem[] | null;
};

function itemFulfillment(it: OrderSnapItem): {
  content: string | null;
  keys: string | null;
  key_units: ReturnType<typeof parseKeyUnits>;
} {
  const fromFlat = parseKeyUnits(it.key_units);
  if (it.content != null || it.keys != null || fromFlat) {
    return {
      content: it.content ?? null,
      keys: it.keys ?? null,
      key_units: fromFlat,
    };
  }
  const secrets = it.products?.product_secrets;
  const secretRow = Array.isArray(secrets) ? secrets[0] : secrets;
  const nestedUnits = parseKeyUnits(
    (it.product_keys ?? []).map((k) => ({
      content: k.content,
      details: k.details?.trim() ? k.details : null,
    })),
  );
  const keyLines = (it.product_keys ?? [])
    .map((k) => k.content?.trim())
    .filter((c): c is string => Boolean(c));
  return {
    content: secretRow?.content ?? null,
    keys: keyLines.length ? keyLines.join('\n') : null,
    key_units: nestedUnits,
  };
}

interface DeletionHistoryRow {
  id: string;
  former_user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  role: string | null;
  profile_snapshot: Record<string, unknown>;
  orders_snapshot: OrderSnap[];
  deleted_at: string;
  deleted_by: string | null;
}

type TabId = 'pending' | 'scheduled' | 'history';

const CHIP = 'badge badge-sm font-semibold tracking-wider leading-none';
const ROLE_BADGE: Record<string, string> = {
  owner: 'badge-primary',
  admin: 'badge-error badge-outline',
  moderator: 'badge-warning badge-outline',
  seller: 'badge-info badge-outline',
  buyer: 'badge-accent badge-outline',
  member: 'badge-ghost badge-outline',
};

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));
}

export default function DeletionRequestsPage() {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const graceDays =
    Math.max(1, Math.min(3650, Number.parseInt(settings.account_deletion_grace_days, 10) || 30));
  const locale = lang === 'ar' ? 'ar' : 'en';
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const fieldFocus =
    'focus:outline-none focus:ring-0 focus:border-base-content/40 focus:shadow-none';

  const [pending, setPending] = useState<DeletionRequest[]>([]);
  const [scheduled, setScheduled] = useState<Profile[]>([]);
  const [history, setHistory] = useState<DeletionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<Profile | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgeError, setPurgeError] = useState('');
  const [tab, setTab] = useState<TabId>('pending');
  const [copied, setCopied] = useState<string | null>(null);
  const typeCustoms = parseProductTypesJson(settings.product_types_json);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const [{ data: reqs, error: rErr }, { data: profiles, error: pErr }, { data: hist, error: hErr }] =
      await Promise.all([
        supabase
          .from('account_deletion_requests')
          .select('id, user_id, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('profiles')
          .select(PROFILE_ADMIN_COLS)
          .not('deletion_scheduled_at', 'is', null)
          .order('deletion_scheduled_at', { ascending: true }),
        supabase
          .from('account_deletion_history')
          .select(
            'id, former_user_id, email, full_name, username, role, profile_snapshot, orders_snapshot, deleted_at, deleted_by',
          )
          .order('deleted_at', { ascending: false })
          .limit(50),
      ]);
    if (rErr || pErr) {
      setError(t('تعذر التحميل. شغّل آخر ترحيل SQL.', 'Could not load. Run the latest SQL migration.'));
      setLoading(false);
      return;
    }
    if (hErr) {
      setHistory([]);
    } else {
      setHistory(
        ((hist ?? []) as DeletionHistoryRow[]).map((row) => ({
          ...row,
          orders_snapshot: Array.isArray(row.orders_snapshot) ? row.orders_snapshot : [],
        })),
      );
    }
    const rows = reqs ?? [];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    let byId: Record<string, Peek> = {};
    if (ids.length > 0) {
      const { data: peeps } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, avatar_url, role')
        .in('id', ids);
      byId = Object.fromEntries((peeps ?? []).map((p) => [p.id, p as Peek]));
    }
    setPending(rows.map((r) => ({ ...r, profile: byId[r.user_id] })));
    setScheduled((profiles as unknown as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review = async (id: string, approve: boolean) => {
    setBusyId(id);
    setError('');
    const { error: err } = await supabase.rpc('review_account_deletion', {
      p_request_id: id,
      p_approve: approve,
    });
    setBusyId(null);
    if (err) {
      setError(t('فشلت المراجعة', 'Review failed'));
      return;
    }
    await load();
  };

  const restore = async (userId: string) => {
    setBusyId(userId);
    setError('');
    const { error: err } = await supabase.rpc('restore_account', { p_user_id: userId });
    setBusyId(null);
    if (err) {
      setError(t('فشلت الاستعادة', 'Restore failed'));
      return;
    }
    await load();
  };

  const purgeNow = async () => {
    if (!purgeTarget) return;
    const handle = purgeTarget.username?.trim();
    if (!handle) {
      setPurgeError(t('لا يوجد اسم مستخدم لهذا الحساب', 'This account has no username'));
      return;
    }
    if (normalizeUsername(purgeConfirm.replace(/^@+/, '')) !== normalizeUsername(handle)) {
      setPurgeError(t('اكتب اسم المستخدم للتأكيد', 'Type the username to confirm'));
      return;
    }
    setBusyId(purgeTarget.id);
    setPurgeError('');
    const { data, error: err } = await supabase.functions.invoke('hard-delete-user', {
      body: { user_id: purgeTarget.id },
    });
    setBusyId(null);
    if (err || !data?.ok) {
      let code = '';
      try {
        const body = await (err as { context?: Response })?.context?.json();
        code = body?.error ?? data?.error ?? '';
      } catch {
        code = (data as { error?: string } | null)?.error ?? '';
      }
      const messages: Record<string, [string, string]> = {
        forbidden: ['المالك فقط يمكنه الحذف', 'Only the owner can delete users'],
        not_scheduled: ['الحساب غير مجدول للحذف', 'Account is not scheduled for deletion'],
        cannot_delete_owner: ['لا يمكن حذف المالك', 'Cannot delete an owner'],
        not_found: ['المستخدم غير موجود', 'User not found'],
        archive_failed: [
          'تعذر حفظ سجل الحذف. شغّل ترحيل التاريخ ثم أعد المحاولة.',
          'Could not save deletion history. Apply the history migration and try again.',
        ],
      };
      const msg = messages[code];
      setPurgeError(
        msg
          ? t(msg[0], msg[1])
          : t(
              'فشل الحذف النهائي. انشر دالة hard-delete-user ثم أعد المحاولة.',
              'Hard delete failed. Deploy the hard-delete-user function and try again.',
            ),
      );
      return;
    }
    setPurgeTarget(null);
    setPurgeConfirm('');
    setPurgeError('');
    setTab('history');
    await load();
  };

  const tabs: { id: TabId; ar: string; en: string; count: number; tone: string; Icon: typeof Inbox }[] = [
    {
      id: 'pending',
      ar: 'معلّقة',
      en: 'Pending',
      count: pending.length,
      tone: 'border-warning/40 text-warning',
      Icon: Inbox,
    },
    {
      id: 'scheduled',
      ar: 'مجدولة',
      en: 'Scheduled',
      count: scheduled.length,
      tone: 'border-error/40 text-error',
      Icon: Clock,
    },
    {
      id: 'history',
      ar: 'السجل',
      en: 'History',
      count: history.length,
      tone: 'border-base-content/25 text-base-content/80',
      Icon: History,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <span className="loading loading-spinner loading-md text-primary" aria-label={t('جارٍ التحميل', 'Loading')} />
      </div>
    );
  }

  return (
    <div className="deletion-page-enter w-full max-w-4xl text-start space-y-5">
      <p className="text-sm text-base-content/65 max-w-2xl leading-relaxed text-pretty">
        {t(
          `الموافقة تعطّل فوراً وتجدول الحذف بعد ${graceDays} يوماً (`,
          `Approve disables now and schedules purge in ${graceDays} days (`,
        )}
        <Link to="/dashboard/settings" className="link link-primary font-medium">
          {t('الإعدادات', 'Settings')}
        </Link>
        {t(
          '). الحذف النهائي يحفظ الملف والطلبات في السجل.',
          '). Hard delete archives profile + orders in history.',
        )}
      </p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('أقسام', 'Sections')}>
        {tabs.map(({ id, ar, en, count, tone, Icon }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`btn btn-sm gap-2 border ${focusRing} ${
                on ? `${tone} bg-base-200` : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setTab(id)}
            >
              <Icon size={14} aria-hidden />
              <span className="font-semibold tracking-tight">{t(ar, en)}</span>
              <span className="tabular-nums font-semibold text-primary">{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setError('')} aria-label={t('إغلاق', 'Dismiss')}>
            <X size={14} />
          </button>
        </div>
      )}

      {tab === 'pending' && (
        <section className="space-y-3" aria-labelledby="del-pending-title">
          <h3 id="del-pending-title" className="sr-only">
            {t('طلبات معلّقة', 'Pending requests')}
          </h3>
          {pending.length === 0 ? (
            <Empty
              icon={<Inbox size={28} className="text-base-content/35" aria-hidden />}
              title={t('لا توجد طلبات معلّقة', 'No pending requests')}
              body={t('تظهر هنا عندما يطلب مستخدم حذف حسابه.', 'Shows up when a user requests account deletion.')}
            />
          ) : (
            <ul className="space-y-2.5">
              {pending.map((r, i) => (
                <li
                  key={r.id}
                  className="deletion-card rounded-lg border border-warning/35 bg-warning/5 p-4 flex flex-wrap items-center justify-between gap-3"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={r.profile?.full_name}
                      email={r.profile?.email}
                      avatarUrl={r.profile?.avatar_url}
                      sizeClass="w-10"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight truncate">
                        {r.profile?.full_name || t('بلا اسم', 'No name')}
                      </p>
                      <p className="text-xs text-base-content/55 font-mono truncate" dir="ltr">
                        {r.profile?.username ? `@${r.profile.username}` : '—'}
                        {r.profile?.email ? ` · ${r.profile.email}` : ''}
                      </p>
                      <p className="text-xs text-base-content/50 mt-0.5 tabular-nums">
                        {new Date(r.created_at).toLocaleString(locale)}
                      </p>
                    </div>
                    {r.profile?.role ? (
                      <span className={`${CHIP} shrink-0 ${ROLE_BADGE[r.profile.role] || 'badge-ghost badge-outline'}`}>
                        {roleLabel(r.profile.role, lang)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`btn btn-success btn-sm gap-1 ${focusRing}`}
                      disabled={busyId === r.id}
                      onClick={() => void review(r.id, true)}
                    >
                      {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {t('موافقة', 'Approve')}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm gap-1 text-error border border-error/30 ${focusRing}`}
                      disabled={busyId === r.id}
                      onClick={() => void review(r.id, false)}
                    >
                      <X size={14} />
                      {t('رفض', 'Reject')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'scheduled' && (
        <section className="space-y-3" aria-labelledby="del-sched-title">
          <h3 id="del-sched-title" className="sr-only">
            {t('حسابات مجدولة للحذف', 'Scheduled for deletion')}
          </h3>
          {scheduled.length === 0 ? (
            <Empty
              icon={<Clock size={28} className="text-base-content/35" aria-hidden />}
              title={t('لا حسابات مجدولة', 'No scheduled accounts')}
              body={t('بعد الموافقة تظهر هنا حتى موعد الحذف أو الحذف الآن.', 'After approve, accounts wait here until purge or Delete now.')}
            />
          ) : (
            <ul className="space-y-2.5">
              {scheduled.map((p, i) => {
                const left = p.deletion_scheduled_at ? daysUntil(p.deletion_scheduled_at) : null;
                return (
                  <li
                    key={p.id}
                    className="deletion-card rounded-lg border border-error/35 bg-error/5 p-4 flex flex-wrap items-center justify-between gap-3"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={p.full_name}
                        email={p.email}
                        avatarUrl={p.avatar_url}
                        sizeClass="w-10"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tight truncate">
                          {p.full_name || t('بلا اسم', 'No name')}
                        </p>
                        <p className="text-xs text-base-content/55 font-mono truncate" dir="ltr">
                          {p.username ? `@${p.username}` : '—'}
                          {p.email ? ` · ${p.email}` : ''}
                        </p>
                        {p.deletion_scheduled_at ? (
                          <p className="text-xs text-error/90 mt-0.5 font-medium">
                            {t('موعد الحذف', 'Purge')}:{' '}
                            {new Date(p.deletion_scheduled_at).toLocaleDateString(locale)}
                            {left != null ? (
                              <span className="text-base-content/55 font-normal">
                                {' '}
                                · {t(`${left} يوم متبقّي`, `${left}d left`)}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                      <span className={`${CHIP} shrink-0 ${ROLE_BADGE[p.role] || 'badge-ghost badge-outline'}`}>
                        {roleLabel(p.role, lang)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`btn btn-primary btn-sm gap-1 ${focusRing}`}
                        disabled={busyId === p.id}
                        onClick={() => void restore(p.id)}
                      >
                        {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                        {t('استعادة', 'Restore')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-error btn-sm gap-1 ${focusRing}`}
                        disabled={busyId === p.id}
                        onClick={() => {
                          setError('');
                          setPurgeConfirm('');
                          setPurgeError('');
                          setPurgeTarget(p);
                        }}
                      >
                        <Trash2 size={14} />
                        {t('حذف الآن', 'Delete now')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'history' && (
        <section className="space-y-3" aria-labelledby="del-hist-title">
          <h3 id="del-hist-title" className="sr-only">
            {t('سجل المحذوفين', 'Deletion history')}
          </h3>
          {history.length === 0 ? (
            <Empty
              icon={<History size={28} className="text-base-content/35" aria-hidden />}
              title={t('لا سجل بعد', 'No history yet')}
              body={t('بعد الحذف النهائي يظهر الملف والطلبات هنا.', 'After hard delete, profile + orders land here.')}
            />
          ) : (
            <ul className="space-y-2.5">
              {history.map((h, i) => {
                const orders = h.orders_snapshot;
                const orderCount = orders.length;
                const paidTotal = orders
                  .filter((o) => o.status === 'paid')
                  .reduce((sum, o) => sum + Number(o.total ?? 0), 0);
                const snap = h.profile_snapshot ?? {};
                const displayName =
                  h.full_name && h.full_name !== 'deleted' ? h.full_name : h.username || t('بلا اسم', 'No name');
                return (
                  <li
                    key={h.id}
                    className="deletion-card rounded-lg border border-base-300 bg-base-200 overflow-hidden"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <details className="group">
                      <summary className={`flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 ${focusRing} rounded-lg [&::-webkit-details-marker]:hidden`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar name={displayName} email={h.email} sizeClass="w-10" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold tracking-tight truncate">{displayName}</p>
                            <p className="text-xs text-base-content/55 font-mono truncate" dir="ltr">
                              {h.username ? `@${h.username}` : '—'}
                              {h.email ? ` · ${h.email}` : ''}
                            </p>
                            <p className="text-xs text-base-content/50 mt-0.5 tabular-nums">
                              {t('حُذف', 'Deleted')} {new Date(h.deleted_at).toLocaleString(locale)}
                              {' · '}
                              <span className="text-base-content/70 font-medium">
                                {orderCount} {t('طلب', 'orders')}
                              </span>
                              {paidTotal > 0 ? (
                                <span className="text-primary font-semibold"> · {formatMoney(paidTotal)}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {h.role ? (
                            <span className={`${CHIP} ${ROLE_BADGE[h.role] || 'badge-ghost badge-outline'}`}>
                              {roleLabel(h.role as Role, lang)}
                            </span>
                          ) : null}
                          <ChevronDown
                            size={16}
                            className="opacity-60 motion-safe:transition-transform group-open:rotate-180"
                            aria-hidden
                          />
                        </div>
                      </summary>

                      <div className="border-t border-base-300 px-4 py-4 space-y-4 bg-base-100/30">
                        <div className="grid gap-2 sm:grid-cols-2 text-xs">
                          <Meta label={t('المعرّف السابق', 'Former ID')} mono value={h.former_user_id} />
                          <Meta
                            label={t('الرتبة', 'Role')}
                            value={h.role ? roleLabel(h.role as Role, lang) : '—'}
                          />
                          {'created_at' in snap && snap.created_at ? (
                            <Meta
                              label={t('انضم', 'Joined')}
                              value={new Date(String(snap.created_at)).toLocaleDateString(locale)}
                            />
                          ) : null}
                          {'is_active' in snap ? (
                            <Meta
                              label={t('كان نشطاً', 'Was active')}
                              value={snap.is_active ? t('نعم', 'Yes') : t('لا', 'No')}
                            />
                          ) : null}
                        </div>

                        <div>
                          <p className="text-sm font-semibold tracking-tight mb-2">
                            {t('الطلبات', 'Orders')}
                            <span className="text-base-content/50 font-medium ms-1">({orderCount})</span>
                          </p>
                          {orderCount === 0 ? (
                            <p className="text-xs text-base-content/55">{t('لا طلبات', 'No orders')}</p>
                          ) : (
                            <ul className="space-y-2">
                              {orders.map((o) => {
                                const items = o.order_items ?? [];
                                return (
                                  <li
                                    key={o.id}
                                    className="rounded-lg border border-base-300 bg-base-200/80 overflow-hidden"
                                  >
                                    <details className="group/order">
                                      <summary
                                        className={`flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 ${focusRing} [&::-webkit-details-marker]:hidden`}
                                      >
                                        <span className="font-mono text-xs text-base-content/70" dir="ltr">
                                          {o.id.slice(0, 8)}…
                                        </span>
                                        <span className={`${CHIP} badge-outline gap-1.5`}>
                                          <span
                                            className={`size-1.5 rounded-full ${
                                              o.status === 'paid'
                                                ? 'bg-success'
                                                : o.status === 'pending'
                                                  ? 'bg-warning'
                                                  : 'bg-base-content/40'
                                            }`}
                                            aria-hidden
                                          />
                                          {o.status ?? '—'}
                                        </span>
                                        <span className="font-semibold tabular-nums tracking-tight">
                                          {formatMoney(o.total, o.currency || 'USD')}
                                        </span>
                                        <span className="text-xs text-base-content/55">
                                          {items.length} {t('منتج', 'items')}
                                        </span>
                                        {o.created_at ? (
                                          <span className="text-xs text-base-content/50 tabular-nums ms-auto">
                                            {new Date(o.created_at).toLocaleString(locale)}
                                          </span>
                                        ) : null}
                                        <ChevronDown
                                          size={14}
                                          className="opacity-50 motion-safe:transition-transform group-open/order:rotate-180"
                                          aria-hidden
                                        />
                                      </summary>

                                      <div className="border-t border-base-300/70 px-3 py-3 space-y-3 bg-base-100/40">
                                        {items.length === 0 ? (
                                          <p className="text-xs text-base-content/55">
                                            {t('لا بنود لهذا الطلب', 'No line items on this order')}
                                          </p>
                                        ) : (
                                          items.map((it, idx) => {
                                            const pname =
                                              lang === 'ar'
                                                ? it.products?.name_ar || it.products?.name
                                                : it.products?.name || it.products?.name_ar;
                                            const pdesc =
                                              lang === 'ar'
                                                ? it.products?.description_ar || it.products?.description
                                                : it.products?.description || it.products?.description_ar;
                                            const ptype = it.products?.product_type || 'other';
                                            const [typeAr, typeEn] = productTypeLabel(ptype, typeCustoms);
                                            const ful = itemFulfillment(it);
                                            const fulText = fulfillmentDisplay(
                                              ful.content,
                                              ful.keys,
                                              ful.key_units,
                                            );
                                            const copyKey = `${h.id}-${o.id}-${idx}`;
                                            return (
                                              <article
                                                key={it.id ?? copyKey}
                                                className="rounded-lg border border-base-300/70 bg-base-200/90 p-3 space-y-2"
                                              >
                                                <div className="flex gap-3 min-w-0">
                                                  {it.products?.thumbnail_url ? (
                                                    <img
                                                      src={it.products.thumbnail_url}
                                                      alt=""
                                                      className="size-12 rounded-md object-cover shrink-0 border border-base-300"
                                                    />
                                                  ) : (
                                                    <div
                                                      className="size-12 rounded-md bg-base-300/60 shrink-0"
                                                      aria-hidden
                                                    />
                                                  )}
                                                  <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="text-sm font-semibold tracking-tight truncate">
                                                        {pname || it.product_id || '?'}
                                                      </p>
                                                      <span className="badge badge-ghost badge-sm font-semibold">
                                                        {t(typeAr, typeEn)}
                                                      </span>
                                                      <span className="text-xs text-base-content/50 tabular-nums">
                                                        ×{it.quantity ?? 1}
                                                      </span>
                                                    </div>
                                                    {it.products?.slug ? (
                                                      <p className="text-xs font-mono text-base-content/45 truncate" dir="ltr">
                                                        /product/{it.products.slug}
                                                      </p>
                                                    ) : null}
                                                    {pdesc ? (
                                                      <p className="text-xs text-base-content/60 line-clamp-3 text-pretty">
                                                        {pdesc}
                                                      </p>
                                                    ) : null}
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-base-content/70">
                                                      {it.unit_price != null ? (
                                                        <span>
                                                          {t('الوحدة', 'Unit')}{' '}
                                                          {formatMoney(it.unit_price, o.currency || 'USD')}
                                                        </span>
                                                      ) : null}
                                                      {it.total_price != null ? (
                                                        <span className="font-semibold text-base-content">
                                                          {formatMoney(it.total_price, o.currency || 'USD')}
                                                        </span>
                                                      ) : null}
                                                    </div>
                                                  </div>
                                                </div>

                                                {fulText ? (
                                                  <div className="space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <p className="text-xs font-semibold tracking-tight text-base-content/70">
                                                        {t('التسليم', 'Fulfillment')}
                                                      </p>
                                                      <button
                                                        type="button"
                                                        className={`btn btn-ghost btn-xs gap-1 ${focusRing}`}
                                                        onClick={() => void copyText(copyKey, fulText)}
                                                        aria-label={t('نسخ', 'Copy')}
                                                      >
                                                        {copied === copyKey ? (
                                                          <Check size={12} className="text-success" />
                                                        ) : (
                                                          <Copy size={12} />
                                                        )}
                                                        {copied === copyKey
                                                          ? t('تم', 'Copied')
                                                          : t('نسخ', 'Copy')}
                                                      </button>
                                                    </div>
                                                    <pre className="rounded-md bg-base-100/80 border border-base-300/60 px-2.5 py-2 text-xs font-mono whitespace-pre-wrap break-all text-base-content/85 text-start">
                                                      {fulText}
                                                    </pre>
                                                  </div>
                                                ) : o.status === 'paid' ? (
                                                  <p className="text-xs text-base-content/45">
                                                    {t(
                                                      'لا محتوى تسليم في هذا الأرشيف (احذف بعد نشر الدالة المحدّثة).',
                                                      'No fulfillment in this archive (re-delete after deploying updated function).',
                                                    )}
                                                  </p>
                                                ) : null}
                                              </article>
                                            );
                                          })
                                        )}
                                        {o.notes ? (
                                          <p className="text-xs text-base-content/55">
                                            <span className="font-semibold">{t('ملاحظات', 'Notes')}: </span>
                                            {o.notes}
                                          </p>
                                        ) : null}
                                      </div>
                                    </details>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <Modal
        open={!!purgeTarget}
        onClose={() => {
          if (busyId) return;
          setPurgeTarget(null);
          setPurgeConfirm('');
          setPurgeError('');
        }}
        labelledBy="purge-now-title"
        boxClassName="max-w-md text-start"
        closeLabel={t('إغلاق', 'Close')}
      >
        <h3 id="purge-now-title" className="font-semibold text-lg tracking-tight text-error mb-2">
          {t('حذف الآن؟', 'Delete now?')}
        </h3>
        <p className="text-sm text-base-content/70 mb-3 leading-relaxed text-pretty">
          {t(
            'حذف نهائي من قاعدة البيانات. يُحفظ سجل بالملف والطلبات. المالك فقط. اكتب اسم المستخدم للتأكيد:',
            'Hard delete from the database. Profile + orders are archived. Owner only. Type the username to confirm:',
          )}
        </p>
        <p className="text-sm font-semibold mb-2 font-mono" dir="ltr">
          {purgeTarget?.username ? `@${purgeTarget.username}` : '—'}
        </p>
        <input
          className={`input input-bordered input-sm w-full mb-4 ${fieldFocus}`}
          value={purgeConfirm}
          onChange={(e) => setPurgeConfirm(e.target.value)}
          placeholder={t('اكتب اسم المستخدم هنا', 'Type the username here')}
          autoComplete="off"
          dir="ltr"
          spellCheck={false}
        />
        {purgeError ? (
          <p className="mb-3 text-sm text-error" role="alert">
            {purgeError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={`btn btn-ghost btn-sm ${focusRing}`}
            disabled={!!busyId}
            onClick={() => {
              setPurgeTarget(null);
              setPurgeConfirm('');
              setPurgeError('');
            }}
          >
            {t('إلغاء', 'Cancel')}
          </button>
          <button
            type="button"
            className={`btn btn-error btn-sm gap-1 ${focusRing}`}
            disabled={!!busyId || !purgeConfirm.trim()}
            onClick={() => void purgeNow()}
          >
            {busyId === purgeTarget?.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {t('تأكيد الحذف', 'Confirm delete')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 px-6 py-14 text-center space-y-2">
      <div className="flex justify-center">{icon}</div>
      <p className="text-sm font-semibold tracking-tight text-base-content/80">{title}</p>
      <p className="text-xs text-base-content/55 max-w-sm mx-auto leading-relaxed">{body}</p>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <p>
      <span className="text-base-content/55">{label}: </span>
      <span className={mono ? 'font-mono' : 'font-medium'} dir={mono ? 'ltr' : undefined}>
        {value}
      </span>
    </p>
  );
}
