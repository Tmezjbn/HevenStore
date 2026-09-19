import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  Loader2,
  MessageSquare,
  Percent,
  Send,
  Settings2,
  ShoppingBag,
  Star,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { UGC_TEXT_CLASS, ugcDir, ugcDisplay } from '../../lib/bidi';
import UserAvatar from '../../components/ui/UserAvatar';
import type { Notification, Profile } from '../../types';
import { NOTIFICATION_COLS } from '../../lib/dbCols';

const NOTIF_TYPES = ['info', 'message', 'system', 'discount', 'order', 'review'] as const;
type NotifType = (typeof NOTIF_TYPES)[number];

const TYPE_META: Record<
  NotifType,
  { Icon: LucideIcon; tone: string; ar: string; en: string }
> = {
  info: { Icon: Info, tone: 'bg-info/15 text-info border-info/35', ar: 'معلومة', en: 'Info' },
  message: {
    Icon: MessageSquare,
    tone: 'bg-primary/15 text-primary border-primary/35',
    ar: 'رسالة',
    en: 'Message',
  },
  system: {
    Icon: Settings2,
    tone: 'bg-base-content/10 text-base-content/80 border-base-content/25',
    ar: 'نظام',
    en: 'System',
  },
  discount: {
    Icon: Percent,
    tone: 'bg-warning/15 text-warning border-warning/35',
    ar: 'خصم',
    en: 'Discount',
  },
  order: {
    Icon: ShoppingBag,
    tone: 'bg-success/15 text-success border-success/35',
    ar: 'طلب',
    en: 'Order',
  },
  review: {
    Icon: Star,
    tone: 'bg-warning/10 text-warning border-warning/30',
    ar: 'تقييم',
    en: 'Review',
  },
};

type Audience = 'all' | 'selected';
type ViewTab = 'compose' | 'inbox';
type Peek = Pick<Profile, 'id' | 'email' | 'full_name' | 'username' | 'avatar_url' | 'role'>;
type ComposeLang = 'en' | 'ar';
type InboxFilter = 'all' | 'unread';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
const fieldFocus =
  'focus:outline-none focus:ring-0 focus:border-base-content/40 focus:shadow-none';

export default function NotificationsPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isOwner = profile?.role === 'owner';
  const locale = lang === 'ar' ? 'ar' : 'en';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [view, setView] = useState<ViewTab>(isOwner ? 'compose' : 'inbox');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');

  const [audience, setAudience] = useState<Audience>('all');
  const [composeLang, setComposeLang] = useState<ComposeLang>(lang === 'ar' ? 'ar' : 'en');
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [body, setBody] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [notifType, setNotifType] = useState<NotifType>('info');
  const [selected, setSelected] = useState<Map<string, Peek>>(new Map());
  const [pickerQ, setPickerQ] = useState('');
  const [pickerHits, setPickerHits] = useState<Peek[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');
  const [sendErr, setSendErr] = useState('');

  useEffect(() => {
    if (!isOwner && view === 'compose') setView('inbox');
  }, [isOwner, view]);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadErr(false);
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setLoadErr(true);
    else setNotifications((data as unknown as Notification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!isOwner || audience !== 'selected' || view !== 'compose') return;
    let cancelled = false;
    const run = async () => {
      setPickerLoading(true);
      let q = supabase
        .from('profiles')
        .select('id, email, full_name, username, avatar_url, role')
        .is('anonymized_at', null)
        .order('created_at', { ascending: false })
        .limit(40);
      // PostgREST .or() uses ,()'" as syntax — strip them so the term is inert.
      const term = pickerQ.trim().replace(/[%_,()'"\\]/g, '');
      if (term) {
        q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`);
      }
      const { data } = await q;
      if (!cancelled) {
        setPickerHits((data as Peek[]) || []);
        setPickerLoading(false);
      }
    };
    const tmr = window.setTimeout(run, pickerQ.trim() ? 180 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [isOwner, audience, pickerQ, view]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const toggleUser = (p: Peek) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else {
        if (next.size >= 500) return prev;
        next.set(p.id, p);
      }
      return next;
    });
  };

  const send = async () => {
    if (!isOwner) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setSendErr(t('العنوان مطلوب (EN)', 'English title is required'));
      return;
    }
    if (audience === 'selected' && selected.size === 0) {
      setSendErr(t('اختر مستخدماً واحداً على الأقل', 'Select at least one user'));
      return;
    }
    setSending(true);
    setSendErr('');
    setSendMsg('');
    const { data, error } = await supabase.rpc('admin_send_notification', {
      p_title: trimmed,
      p_body: body.trim() || null,
      p_title_ar: titleAr.trim() || null,
      p_body_ar: bodyAr.trim() || null,
      p_type: notifType,
      p_user_ids: audience === 'all' ? null : Array.from(selected.keys()),
    });
    setSending(false);
    if (error) {
      const code = error.message || '';
      if (code.includes('FORBIDDEN')) setSendErr(t('المالك فقط', 'Owner only'));
      else if (code.includes('TITLE_REQUIRED')) setSendErr(t('العنوان مطلوب', 'Title is required'));
      else if (code.includes('TOO_MANY_TARGETS')) {
        setSendErr(t('حد أقصى 500 مستلم', 'Max 500 recipients'));
      } else setSendErr(t('فشل الإرسال', 'Send failed'));
      return;
    }
    const n = typeof data === 'number' ? data : Number(data) || 0;
    setSendMsg(t(`تم الإرسال إلى ${n}`, `Sent to ${n}`));
    setTitle('');
    setTitleAr('');
    setBody('');
    setBodyAr('');
    setSelected(new Map());
    setView('inbox');
    await loadInbox();
  };

  const unread = notifications.filter((n) => !n.is_read).length;
  const visible =
    inboxFilter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
  const selectedList = Array.from(selected.values());
  const previewTitle =
    composeLang === 'ar' ? titleAr.trim() || title.trim() || '…' : title.trim() || '…';
  const previewBody =
    composeLang === 'ar' ? bodyAr.trim() || body.trim() : body.trim() || bodyAr.trim();
  const TypeIcon = TYPE_META[notifType].Icon;

  return (
    <div className="notifications-page-enter mx-auto w-full max-w-4xl text-start space-y-6">
      {isOwner ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('أقسام', 'Sections')}>
          <TabBtn
            active={view === 'compose'}
            onClick={() => setView('compose')}
            icon={<Send size={14} aria-hidden />}
            label={t('بث', 'Broadcast')}
          />
          <TabBtn
            active={view === 'inbox'}
            onClick={() => setView('inbox')}
            icon={<Bell size={14} aria-hidden />}
            label={t('صندوقك', 'Inbox')}
            count={unread}
          />
        </div>
      ) : null}

      {isOwner && view === 'compose' ? (
        <section className="rounded-lg border border-base-300 bg-base-200 overflow-hidden" aria-labelledby="notif-compose-title">
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-base-300">
            <h2 id="notif-compose-title" className="text-lg font-semibold tracking-tight text-balance min-w-0">
              {t('إرسال إشعار', 'Send notification')}
            </h2>
            <div className="flex gap-1.5" role="group" aria-label={t('الجمهور', 'Audience')}>
              <button
                type="button"
                className={`btn btn-sm gap-1.5 ${focusRing} ${
                  audience === 'all' ? 'btn-primary' : 'btn-ghost border border-base-300'
                }`}
                onClick={() => setAudience('all')}
              >
                <Users size={14} aria-hidden />
                {t('الكل', 'All')}
              </button>
              <button
                type="button"
                className={`btn btn-sm gap-1.5 ${focusRing} ${
                  audience === 'selected' ? 'btn-primary' : 'btn-ghost border border-base-300'
                }`}
                onClick={() => setAudience('selected')}
              >
                {t('محدد', 'Selected')}
                {selected.size > 0 ? (
                  <span className="tabular-nums font-semibold">({selected.size})</span>
                ) : null}
              </button>
            </div>
          </header>

          <div className="grid lg:grid-cols-[1fr_minmax(14rem,18rem)] gap-0 lg:divide-x lg:divide-base-300 rtl:lg:divide-x-reverse">
            <div className="p-4 sm:p-5 space-y-4">
              {audience === 'selected' ? (
                <div className="space-y-2">
                  <input
                    className={`input input-bordered input-sm w-full ${fieldFocus}`}
                    value={pickerQ}
                    onChange={(e) => setPickerQ(e.target.value)}
                    placeholder={t('ابحث بالاسم أو البريد أو @', 'Search name, email, or @')}
                    aria-label={t('بحث مستخدمين', 'Search users')}
                  />
                  {selectedList.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {selectedList.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={`btn btn-xs gap-1 border border-base-300 bg-base-100 ${focusRing}`}
                            onClick={() => toggleUser(p)}
                            aria-label={t('إزالة', 'Remove')}
                          >
                            <span className="truncate max-w-[8rem]">
                              {p.username
                                ? `@${p.username}`
                                : p.full_name || p.email || p.id.slice(0, 6)}
                            </span>
                            <X size={12} aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-semibold text-base-content/65">
                      {t('اختر واحداً أو أكثر من القائمة.', 'Pick one or more from the list.')}
                    </p>
                  )}
                  <ul
                    className="max-h-40 overflow-y-auto rounded-lg border border-base-300 bg-base-100 divide-y divide-base-300"
                    role="listbox"
                    aria-multiselectable
                  >
                    {pickerLoading ? (
                      <li className="flex justify-center py-6">
                        <Loader2 size={16} className="animate-spin text-primary" aria-hidden />
                      </li>
                    ) : pickerHits.length === 0 ? (
                      <li className="text-xs text-base-content/65 py-4 text-center">
                        {t('لا نتائج', 'No results')}
                      </li>
                    ) : (
                      pickerHits.map((p) => {
                        const on = selected.has(p.id);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={on}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 text-start ${focusRing} ${
                                on ? 'bg-base-200' : 'hover:bg-base-200/70'
                              }`}
                              onClick={() => toggleUser(p)}
                            >
                              <span
                                className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                                  on
                                    ? 'border-primary bg-primary text-primary-content'
                                    : 'border-base-content/30'
                                }`}
                                aria-hidden
                              >
                                {on ? <Check size={10} /> : null}
                              </span>
                              <UserAvatar
                                name={p.full_name}
                                email={p.email}
                                avatarUrl={p.avatar_url}
                                sizeClass="w-7"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold tracking-tight truncate">
                                  {p.full_name || t('بلا اسم', 'No name')}
                                </span>
                                <span
                                  className="block text-xs text-base-content/65 font-mono truncate"
                                  dir="ltr"
                                >
                                  {p.username ? `@${p.username}` : ''}
                                  {p.username && p.email ? ' · ' : ''}
                                  {p.email || ''}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-base-content/65">
                    {t('نص الإشعار', 'Message copy')}
                  </p>
                  <div
                    className="flex gap-1"
                    role="group"
                    aria-label={t('لغة التحرير', 'Edit language')}
                  >
                    {(['en', 'ar'] as const).map((l) => {
                      const filled = l === 'en' ? Boolean(title.trim()) : Boolean(titleAr.trim());
                      return (
                        <button
                          key={l}
                          type="button"
                          className={`btn btn-xs min-w-[2.5rem] ${focusRing} ${
                            composeLang === l
                              ? 'btn-primary'
                              : 'btn-ghost border border-base-300'
                          }`}
                          onClick={() => setComposeLang(l)}
                          aria-pressed={composeLang === l}
                        >
                          {l.toUpperCase()}
                          {filled ? (
                            <Check size={10} className="ms-0.5 opacity-80" aria-hidden />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex w-full flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('العنوان', 'Title')}
                    <span className="text-error" aria-hidden>
                      {' '}
                      *
                    </span>
                    <span className="sr-only">
                      {t('مطلوب — العنوان الإنجليزي لازم للإرسال', 'required — English title needed to send')}
                    </span>
                  </span>
                  <input
                    className={`input input-bordered input-sm w-full ${fieldFocus}`}
                    value={composeLang === 'en' ? title : titleAr}
                    onChange={(e) =>
                      composeLang === 'en' ? setTitle(e.target.value) : setTitleAr(e.target.value)
                    }
                    maxLength={200}
                    dir={composeLang === 'ar' ? 'rtl' : 'ltr'}
                    required={composeLang === 'en'}
                    aria-required={composeLang === 'en'}
                  />
                  {composeLang === 'ar' && !title.trim() ? (
                    <span className="text-xs text-warning/90">
                      {t('أضف عنوان EN أيضاً (تبويب EN) قبل الإرسال.', 'Add an EN title (EN tab) before sending.')}
                    </span>
                  ) : null}
                </label>

                <label className="flex w-full flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('النص', 'Body')}
                  </span>
                  <textarea
                    className={`textarea textarea-bordered textarea-sm w-full min-h-[6rem] leading-relaxed ${fieldFocus}`}
                    value={composeLang === 'en' ? body : bodyAr}
                    onChange={(e) =>
                      composeLang === 'en' ? setBody(e.target.value) : setBodyAr(e.target.value)
                    }
                    maxLength={2000}
                    dir={composeLang === 'ar' ? 'rtl' : 'ltr'}
                  />
                </label>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                  {t('النوع', 'Type')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('النوع', 'Type')}>
                  {NOTIF_TYPES.map((ty) => {
                    const meta = TYPE_META[ty];
                    const on = notifType === ty;
                    const Icon = meta.Icon;
                    return (
                      <button
                        key={ty}
                        type="button"
                        className={`btn btn-xs gap-1 border ${focusRing} ${
                          on ? meta.tone : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        onClick={() => setNotifType(ty)}
                        aria-pressed={on}
                      >
                        <Icon size={12} aria-hidden />
                        {t(meta.ar, meta.en)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sendErr ? (
                <div role="alert" className="alert alert-error text-sm py-2">
                  <span>{sendErr}</span>
                </div>
              ) : null}
              {sendMsg ? (
                <div role="status" className="alert alert-success text-sm py-2">
                  <span>{sendMsg}</span>
                </div>
              ) : null}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
                  disabled={sending || !title.trim()}
                  onClick={() => void send()}
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {audience === 'all'
                    ? t('إرسال للجميع', 'Send to all')
                    : t(`إرسال (${selected.size})`, `Send (${selected.size})`)}
                </button>
              </div>
            </div>

            <aside className="border-t lg:border-t-0 border-base-300 bg-base-100/50 p-4 sm:p-5 space-y-3">
              <p className="text-xs font-semibold tracking-wide text-base-content/65">
                {t('معاينة', 'Preview')}
              </p>
              <div className="rounded-lg border border-base-300 bg-base-200 p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <span
                    className={`size-10 rounded-lg border flex items-center justify-center shrink-0 ${TYPE_META[notifType].tone}`}
                  >
                    <TypeIcon size={18} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className="text-base font-semibold tracking-tight leading-snug text-balance"
                      dir={composeLang === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {previewTitle}
                    </p>
                    {previewBody ? (
                      <p
                        className="text-sm text-base-content/70 leading-relaxed text-pretty max-w-prose"
                        dir={composeLang === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {previewBody}
                      </p>
                    ) : (
                      <p className="text-sm text-base-content/55">
                        {t('النص يظهر هنا…', 'Body shows here…')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {(!isOwner || view === 'inbox') && (
        <section className="space-y-4" aria-labelledby="notif-inbox-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="notif-inbox-title" className="text-lg font-semibold tracking-tight text-balance min-w-0">
              {isOwner ? t('صندوقك', 'Your inbox') : t('الإشعارات', 'Notifications')}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1" role="group" aria-label={t('تصفية', 'Filter')}>
                <button
                  type="button"
                  className={`btn btn-xs ${focusRing} ${
                    inboxFilter === 'all' ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                  onClick={() => setInboxFilter('all')}
                >
                  {t('الكل', 'All')}
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${focusRing} ${
                    inboxFilter === 'unread' ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                  onClick={() => setInboxFilter('unread')}
                >
                  {t('غير مقروء', 'Unread')}
                </button>
              </div>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className={`btn btn-ghost btn-xs gap-1.5 border border-base-300 ${focusRing}`}
                >
                  <CheckCheck size={14} aria-hidden />
                  {t('قراءة الكل', 'Mark all read')}
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-14" role="status">
              <span
                className="loading loading-spinner loading-md text-primary"
                aria-label={t('جارٍ التحميل', 'Loading')}
              />
            </div>
          ) : loadErr ? (
            <Empty
              icon={<Bell size={28} className="text-base-content/35" aria-hidden />}
              title={t('تعذر تحميل الإشعارات', 'Could not load notifications')}
            />
          ) : visible.length === 0 ? (
            <Empty
              icon={<Bell size={28} className="text-base-content/35" aria-hidden />}
              title={
                inboxFilter === 'unread'
                  ? t('لا غير مقروء', 'No unread')
                  : t('لا توجد إشعارات', 'No notifications yet')
              }
            />
          ) : (
            <ul className="rounded-lg border border-base-300 bg-base-200 overflow-hidden divide-y divide-base-300">
              {visible.map((n, i) => {
                const ty = (TYPE_META[n.type as NotifType] ? n.type : 'info') as NotifType;
                const meta = TYPE_META[ty];
                const Icon = meta.Icon;
                const nTitle = lang === 'ar' ? n.title_ar || n.title : n.title;
                const nBody = lang === 'ar' ? n.body_ar || n.body : n.body;
                return (
                  <li
                    key={n.id}
                    className="notif-row"
                    style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                  >
                    <button
                      type="button"
                      className={`w-full flex items-start gap-3 px-4 py-3.5 text-start transition-colors ${focusRing} ${
                        n.is_read
                          ? 'bg-transparent hover:bg-base-100/60'
                          : 'bg-base-100/40 hover:bg-base-100/70'
                      }`}
                      onClick={() => {
                        if (!n.is_read) void markRead(n.id);
                      }}
                    >
                      <span
                        className={`size-10 rounded-lg border flex items-center justify-center shrink-0 ${meta.tone}`}
                      >
                        <Icon size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-base font-semibold tracking-tight leading-snug text-balance ${UGC_TEXT_CLASS}`}
                            dir={ugcDir(nTitle)}
                          >
                            {ugcDisplay(nTitle)}
                          </p>
                          <span className={`badge badge-sm border font-semibold ${meta.tone}`}>
                            {t(meta.ar, meta.en)}
                          </span>
                        </div>
                        {nBody ? (
                          <p
                            className={`text-sm text-base-content/70 leading-relaxed text-pretty max-w-prose ${UGC_TEXT_CLASS}`}
                            dir={ugcDir(nBody)}
                          >
                            {ugcDisplay(nBody)}
                          </p>
                        ) : null}
                        <p className="text-xs text-base-content/65 tabular-nums">
                          {new Date(n.created_at).toLocaleString(locale)}
                        </p>
                      </div>
                      {!n.is_read ? (
                        <span
                          className="size-2 rounded-full bg-primary shrink-0 mt-2"
                          aria-label={t('غير مقروء', 'Unread')}
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`btn btn-sm gap-2 border ${focusRing} ${
        active
          ? 'border-base-content/25 bg-base-200 text-base-content'
          : 'btn-ghost border-base-300 text-base-content/70'
      }`}
      onClick={onClick}
    >
      {icon}
      <span className="font-semibold tracking-tight">{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span className="tabular-nums font-semibold text-primary">{count}</span>
      ) : null}
    </button>
  );
}

function Empty({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-base-300 bg-base-200/40 px-6 py-14 text-center space-y-2">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-base font-semibold tracking-tight text-balance">{title}</p>
    </div>
  );
}
