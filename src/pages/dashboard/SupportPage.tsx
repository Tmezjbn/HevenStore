import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownUp,
  Headphones,
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import {
  SUPPORT_POLL_MS,
  canEscalateSupport,
  supportStandingTier,
  ticketStatusLabel,
  type SupportMessage,
  type SupportTicket,
} from '../../lib/support';
import { UGC_TEXT_CLASS, ugcAlignClass, ugcDir, ugcDisplay } from '../../lib/bidi';

type Bin = 'queue' | 'important' | 'sellers' | 'mine' | 'all';
type SortDir = 'asc' | 'desc';

type ProfileLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  staff_notes: string | null;
  support_standing: number | null;
};

const TICKET_COLS =
  'id, created_by, assignee_id, seller_id, order_id, subject, status, queue, escalate_reason, reject_reason, rejected_by, last_message_at, created_at, updated_at';

function displayName(p: ProfileLite | undefined, fallback: string) {
  if (!p) return fallback;
  return p.full_name?.trim() || p.username?.trim() || fallback;
}

/** Client-side thread filter haystack. Sellers: seller name + subject. Else: subject, opener, id, status. */
function threadSearchBlob(
  r: SupportTicket,
  profiles: Record<string, ProfileLite>,
  mode: 'sellers' | 'threads',
  lang: 'ar' | 'en',
): string {
  if (mode === 'sellers') {
    const p = r.seller_id ? profiles[r.seller_id] : undefined;
    return `${displayName(p, r.seller_id || '')} ${r.subject || ''}`.toLowerCase();
  }
  const opener = profiles[r.created_by];
  return [
    r.subject || '',
    displayName(opener, r.created_by || ''),
    r.id,
    r.status,
    ticketStatusLabel(r.status, lang),
  ]
    .join(' ')
    .toLowerCase();
}

export default function SupportPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();

  const role = profile?.role || 'member';
  const isSupport = role === 'support';
  const isStaff = role === 'support' || role === 'moderator' || role === 'admin' || role === 'owner';
  const isSeller = role === 'seller';
  const isBuyerSide = role === 'buyer' || role === 'member' || role === 'moderator' || role === 'seller';

  const binParam = params.get('bin') as Bin | null;
  const defaultBin: Bin =
    binParam && ['queue', 'important', 'sellers', 'mine', 'all'].includes(binParam)
      ? binParam
      : isSupport
        ? 'queue'
        : role === 'moderator' || role === 'admin' || role === 'owner'
          ? 'important'
          : isSeller
            ? 'sellers'
            : 'mine';

  const [bin, setBin] = useState<Bin>(defaultBin);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [selectedId, setSelectedId] = useState<string | null>(params.get('ticket') || null);
  /** Keeps the open thread when claim/reject moves it out of the current bin list. */
  const [selectedFallback, setSelectedFallback] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgBusy, setMsgBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [composeOpen, setComposeOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSellerId, setNewSellerId] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [myStanding, setMyStanding] = useState(profile?.support_standing ?? 100);

  const orderId = params.get('orderId');

  const bins = useMemo(() => {
    const list: { id: Bin; ar: string; en: string }[] = [];
    if (isSupport) {
      list.push(
        { id: 'queue', ar: 'الطابور', en: 'Queue' },
        { id: 'important', ar: 'مهم', en: 'Important' },
        { id: 'sellers', ar: 'البائعون', en: 'Sellers' },
        { id: 'mine', ar: 'تذاكري', en: 'Mine' },
      );
    } else if (role === 'moderator' || role === 'admin' || role === 'owner') {
      list.push(
        { id: 'important', ar: 'مهم', en: 'Important' },
        { id: 'all', ar: 'الكل', en: 'All' },
        { id: 'sellers', ar: 'البائعون', en: 'Sellers' },
      );
    } else if (isSeller) {
      list.push({ id: 'sellers', ar: 'دعم مشترياتي', en: 'Buyer tickets' });
    }
    if (isBuyerSide && !isSupport) {
      list.push({ id: 'mine', ar: 'تذاكري', en: 'My tickets' });
    }
    return list;
  }, [isSupport, role, isSeller, isBuyerSide]);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, role, staff_notes, support_standing')
      .in('id', uniq);
    if (!data) return;
    setProfiles((prev) => {
      const next = { ...prev };
      for (const row of data as ProfileLite[]) next[row.id] = row;
      return next;
    });
  }, []);

  const loadTickets = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!user) return;
    const quiet = opts?.quiet === true;
    if (!quiet) {
      setLoading(true);
      setError(null);
    }
    let q = supabase.from('support_tickets').select(TICKET_COLS);

    if (bin === 'queue') {
      q = q.eq('queue', 'general').eq('status', 'open');
    } else if (bin === 'important') {
      q = q.eq('status', 'escalated');
    } else if (bin === 'sellers') {
      q = q.eq('queue', 'seller');
      if (isSeller && !isStaff) q = q.eq('seller_id', user.id);
    } else if (bin === 'mine') {
      if (isSupport) q = q.eq('assignee_id', user.id);
      else q = q.eq('created_by', user.id);
    }
    // all: no filter beyond RLS

    q = q.order('last_message_at', { ascending: sortDir === 'asc' });

    const { data, error: err } = await q.limit(200);
    if (err) {
      if (!quiet) {
        setError(err.message);
        setTickets([]);
        setLoading(false);
      }
      return;
    }
    let rows = (data ?? []) as SupportTicket[];
    const ids = rows.flatMap((r) =>
      [r.created_by, r.assignee_id, r.seller_id].filter(Boolean) as string[],
    );
    const searchBins = bin === 'sellers' || bin === 'important' || bin === 'all';
    if (searchBins && listSearch.trim()) {
      const needle = listSearch.trim().toLowerCase();
      const mode = bin === 'sellers' ? 'sellers' : 'threads';
      const personIds = [
        ...new Set(
          rows
            .map((r) => (mode === 'sellers' ? r.seller_id : r.created_by))
            .filter(Boolean) as string[],
        ),
      ];
      const { data: personRows } = await supabase
        .from('profiles')
        .select('id, full_name, username, role, staff_notes, support_standing')
        .in('id', personIds.length ? personIds : ['00000000-0000-0000-0000-000000000000']);
      const map: Record<string, ProfileLite> = {};
      for (const row of (personRows ?? []) as ProfileLite[]) map[row.id] = row;
      rows = rows.filter((r) => threadSearchBlob(r, map, mode, lang).includes(needle));
      setProfiles((prev) => ({ ...prev, ...map }));
    }
    setTickets(rows);
    await loadProfiles(ids);
    if (!quiet) setLoading(false);
  }, [user, bin, sortDir, listSearch, lang, isSeller, isStaff, isSupport, loadProfiles]);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('id, ticket_id, sender_id, body, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(500);
    const rows = (data ?? []) as SupportMessage[];
    setMessages(rows);
    await loadProfiles(rows.map((m) => m.sender_id));
  }, [loadProfiles]);

  const loadTicketById = useCallback(
    async (id: string): Promise<SupportTicket | null> => {
      const { data, error: err } = await supabase
        .from('support_tickets')
        .select(TICKET_COLS)
        .eq('id', id)
        .maybeSingle();
      if (err || !data) return null;
      const row = data as SupportTicket;
      await loadProfiles(
        [row.created_by, row.assignee_id, row.seller_id].filter(Boolean) as string[],
      );
      return row;
    },
    [loadProfiles],
  );

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // FUNC-2: keep ?bin= in sync so moderator Important shortcuts / refresh restore the bin.
  useEffect(() => {
    if (params.get('bin') === bin) return;
    const next = new URLSearchParams(params);
    next.set('bin', bin);
    setParams(next, { replace: true });
  }, [bin, params, setParams]);

  // FUNC-3: refresh the ticket list while the desk is open (pause when tab hidden).
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void loadTickets({ quiet: true });
    }, SUPPORT_POLL_MS);
    return () => window.clearInterval(id);
  }, [user, loadTickets]);

  // Keep a by-id fallback so claim / reject / escalate / deep links do not clear the pane
  // when the ticket leaves the current bin's list.
  useEffect(() => {
    if (!selectedId) {
      setSelectedFallback(null);
      return;
    }
    const inList = tickets.find((x) => x.id === selectedId);
    if (inList) {
      setSelectedFallback(inList);
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await loadTicketById(selectedId);
      if (!cancelled) setSelectedFallback(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, tickets, loadTicketById]);

  useEffect(() => {
    if (profile?.support_standing != null) setMyStanding(profile.support_standing);
  }, [profile?.support_standing]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
    // ponytail: poll until realtime channel enabled for support_messages
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void loadMessages(selectedId);
    }, SUPPORT_POLL_MS);
    return () => window.clearInterval(id);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!orderId) return;
    setComposeOpen(true);
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('orders')
        .select('public_ref')
        .eq('id', orderId)
        .maybeSingle();
      if (cancelled) return;
      const code = data?.public_ref || `${orderId.slice(0, 8)}…`;
      setNewSubject((s) => s || t(`طلب ${code}`, `Order ${code}`));
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, t]);

  const selected =
    tickets.find((x) => x.id === selectedId) ??
    (selectedFallback?.id === selectedId ? selectedFallback : null);

  const selectTicket = (id: string) => {
    setSelectedId(id);
    const next = new URLSearchParams(params);
    next.set('ticket', id);
    setParams(next, { replace: true });
  };

  const openTicket = async () => {
    if (!user || msgBusy) return;
    setMsgBusy(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('open_support_ticket', {
      p_subject: newSubject,
      p_body: newBody,
      p_seller_id: newSellerId.trim() || null,
      p_order_id: orderId || null,
    });
    setMsgBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setComposeOpen(false);
    setNewSubject('');
    setNewBody('');
    setNewSellerId('');
    setBin('mine');
    if (data) selectTicket(String(data));
    void loadTickets();
  };

  const claim = async () => {
    if (!selectedId) return;
    setMsgBusy(true);
    const { error: err } = await supabase.rpc('claim_support_ticket', { p_ticket_id: selectedId });
    setMsgBusy(false);
    if (err) setError(err.message);
    else {
      setBin('mine');
      void loadTickets();
    }
  };

  const escalate = async () => {
    if (!selectedId) return;
    setMsgBusy(true);
    const { error: err } = await supabase.rpc('escalate_support_ticket', {
      p_ticket_id: selectedId,
      p_reason: escalateReason || null,
    });
    setMsgBusy(false);
    if (err) setError(err.message);
    else {
      setEscalateReason('');
      void loadTickets();
    }
  };

  const rejectEsc = async () => {
    if (!selectedId || rejectReason.trim().length < 2) {
      setError(t('اكتب سبب الرفض', 'Write a reject reason'));
      return;
    }
    setMsgBusy(true);
    const { error: err } = await supabase.rpc('reject_support_escalation', {
      p_ticket_id: selectedId,
      p_reason: rejectReason,
    });
    setMsgBusy(false);
    if (err) setError(err.message);
    else {
      setRejectReason('');
      void loadTickets();
    }
  };

  const setStatus = async (status: string) => {
    if (!selectedId) return;
    setMsgBusy(true);
    const { error: err } = await supabase.rpc('set_support_ticket_status', {
      p_ticket_id: selectedId,
      p_status: status,
    });
    setMsgBusy(false);
    if (err) setError(err.message);
    else void loadTickets();
  };

  const send = async () => {
    if (!selectedId || !draft.trim()) return;
    setMsgBusy(true);
    const { error: err } = await supabase.rpc('post_support_message', {
      p_ticket_id: selectedId,
      p_body: draft,
    });
    setMsgBusy(false);
    if (err) setError(err.message);
    else {
      setDraft('');
      void loadMessages(selectedId);
      void loadTickets();
    }
  };

  const standingTier = supportStandingTier(myStanding);
  const opener = selected ? profiles[selected.created_by] : undefined;

  return (
    <div className="support-desk mx-auto w-full max-w-6xl text-start space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Headphones size={20} aria-hidden />
            {t('الدعم', 'Support')}
          </h2>
          <p className="text-sm text-base-content/70 mt-1 text-pretty">
            {t(
              'محادثات تذاكر داخل اللوحة — طابور، مهم، وبائعون.',
              'In-dashboard ticket chats — queue, Important, and Sellers.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSupport ? (
            <span
              className={`badge badge-sm ${
                standingTier === 'restricted'
                  ? 'badge-error'
                  : standingTier === 'trusted'
                    ? 'badge-success'
                    : 'badge-ghost'
              }`}
            >
              {t('التقييم', 'Standing')}: {myStanding} ({standingTier})
            </span>
          ) : null}
          {(isBuyerSide || isStaff) && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setComposeOpen((v) => !v)}
            >
              {t('تذكرة جديدة', 'New ticket')}
            </button>
          )}
        </div>
      </header>

      {composeOpen ? (
        <section className="rounded-lg border border-base-300 bg-base-200 p-4 space-y-3">
          <h3 className="font-medium">{t('فتح تذكرة', 'Open a ticket')}</h3>
          <label className="form-control">
            <span className="label-text text-xs">{t('الموضوع', 'Subject')}</span>
            <input
              className="input input-bordered input-sm"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={160}
            />
          </label>
          <label className="form-control">
            <span className="label-text text-xs">{t('الرسالة', 'Message')}</span>
            <textarea
              className="textarea textarea-bordered text-sm min-h-24"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              maxLength={4000}
            />
          </label>
          {role === 'buyer' || role === 'member' ? (
            <label className="form-control">
              <span className="label-text text-xs">
                {t('معرّف البائع (اختياري — قناة البائع)', 'Seller id (optional — seller channel)')}
              </span>
              <input
                className="input input-bordered input-sm font-mono"
                value={newSellerId}
                onChange={(e) => setNewSellerId(e.target.value)}
                placeholder="uuid"
              />
            </label>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={msgBusy || newSubject.trim().length < 2 || !newBody.trim()}
              onClick={() => void openTicket()}
            >
              {t('إرسال', 'Send')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setComposeOpen(false)}>
              {t('إلغاء', 'Cancel')}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {bins.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`btn btn-sm ${bin === b.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setBin(b.id)}
          >
            {t(b.ar, b.en)}
          </button>
        ))}
      </div>

      {isStaff && (bin === 'sellers' || bin === 'important' || bin === 'all') ? (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="input input-bordered input-sm flex items-center gap-2 max-w-xs">
            <Search size={14} aria-hidden />
            <input
              className="grow bg-transparent outline-none"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder={
                bin === 'sellers'
                  ? t('بحث باسم البائع', 'Search by seller name')
                  : t('بحث بالاسم أو الموضوع', 'Search tickets by name or subject')
              }
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          >
            <ArrowDownUp size={14} aria-hidden />
            {sortDir === 'asc'
              ? t('الأقدم أولاً', 'Oldest first')
              : t('الأحدث أولاً', 'Newest first')}
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          >
            <ArrowDownUp size={12} aria-hidden />
            {sortDir === 'asc' ? t('الأقدم', 'Oldest') : t('الأحدث', 'Newest')}
          </button>
        </div>
      )}

      <div className="support-desk__grid grid gap-3 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] min-h-[28rem]">
        <aside className="rounded-lg border border-base-300 bg-base-200 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-base-300 text-xs font-semibold uppercase tracking-wide text-base-content/60">
            {t('المحادثات', 'Threads')}
          </div>
          <ul className="overflow-y-auto flex-1 max-h-[32rem]">
            {loading ? (
              <li className="p-4 text-sm opacity-60">{t('جارٍ التحميل…', 'Loading…')}</li>
            ) : tickets.length === 0 ? (
              <li className="p-4 text-sm opacity-60">{t('لا تذاكر هنا', 'No tickets here')}</li>
            ) : (
              tickets.map((tk) => {
                const active = tk.id === selectedId;
                return (
                  <li key={tk.id}>
                    <button
                      type="button"
                      className={`w-full text-start px-3 py-2.5 border-b border-base-300/60 hover:bg-base-300/40 ${
                        active ? 'bg-base-300/50' : ''
                      }`}
                      onClick={() => selectTicket(tk.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium line-clamp-1">{tk.subject}</span>
                        {tk.status === 'escalated' ? (
                          <ShieldAlert size={14} className="text-warning shrink-0" aria-hidden />
                        ) : (
                          <MessageSquare size={13} className="opacity-40 shrink-0" aria-hidden />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-base-content/60">
                        <span>{ticketStatusLabel(tk.status, lang)}</span>
                        {tk.queue === 'seller' ? (
                          <span className="badge badge-ghost badge-xs">{t('بائع', 'Seller')}</span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className="rounded-lg border border-base-300 bg-base-200 flex flex-col min-h-[28rem]">
          {!selected ? (
            <div className="m-auto text-sm text-base-content/60 p-6 text-center">
              {t('اختر محادثة من القائمة', 'Pick a thread from the list')}
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-base-300 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">{selected.subject}</h3>
                  <span className="badge badge-sm badge-outline">
                    {ticketStatusLabel(selected.status, lang)}
                  </span>
                </div>
                <p className="text-xs text-base-content/65">
                  {t('من', 'From')}: {displayName(opener, selected.created_by.slice(0, 8))}
                  {selected.seller_id ? (
                    <>
                      {' · '}
                      {t('بائع', 'Seller')}:{' '}
                      {displayName(profiles[selected.seller_id], selected.seller_id.slice(0, 8))}
                    </>
                  ) : null}
                </p>
                {selected.reject_reason ? (
                  <p className="text-xs text-warning flex items-start gap-1">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
                    {t('سبب الرفض', 'Reject reason')}: {selected.reject_reason}
                  </p>
                ) : null}
                {selected.escalate_reason ? (
                  <p className="text-xs text-base-content/70">
                    {t('سبب التصعيد', 'Escalate reason')}: {selected.escalate_reason}
                  </p>
                ) : null}
                {isStaff && opener?.staff_notes ? (
                  <p className="text-xs rounded bg-base-300/50 px-2 py-1 text-pretty">
                    {t('ملاحظات الفريق', 'Staff notes')}: {opener.staff_notes}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {isSupport && selected.status === 'open' && !selected.assignee_id ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      disabled={msgBusy}
                      onClick={() => void claim()}
                    >
                      {t('استلام', 'Claim')}
                    </button>
                  ) : null}
                  {canEscalateSupport(role, myStanding) &&
                  (selected.status === 'open' || selected.status === 'claimed') ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <input
                        className="input input-bordered input-xs w-40"
                        placeholder={t('سبب التصعيد', 'Escalate reason')}
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-warning btn-xs"
                        disabled={msgBusy}
                        onClick={() => void escalate()}
                      >
                        {t('تصعيد', 'Escalate')}
                      </button>
                    </div>
                  ) : null}
                  {(role === 'moderator' || role === 'admin' || role === 'owner') &&
                  selected.status === 'escalated' ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <input
                        className="input input-bordered input-xs w-44"
                        placeholder={t('سبب رفض التصعيد', 'Reject reason')}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-error btn-xs"
                        disabled={msgBusy}
                        onClick={() => void rejectEsc()}
                      >
                        {t('رفض التصعيد', 'Reject escalation')}
                      </button>
                    </div>
                  ) : null}
                  {selected.status !== 'resolved' && selected.status !== 'closed' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={msgBusy}
                        onClick={() => void setStatus('resolved')}
                      >
                        {t('حلّت', 'Resolve')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={msgBusy}
                        onClick={() => void setStatus('closed')}
                      >
                        {t('إغلاق', 'Close')}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <ul className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[22rem]">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  const who = displayName(profiles[m.sender_id], m.sender_id.slice(0, 6));
                  return (
                    <li
                      key={m.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        mine ? 'ms-auto bg-primary/15' : 'me-auto bg-base-300/50'
                      }`}
                    >
                      <div className="text-[10px] opacity-60 mb-0.5">{who}</div>
                      <p
                        className={`text-pretty whitespace-pre-wrap ${UGC_TEXT_CLASS} ${ugcAlignClass(m.body)}`}
                        dir={ugcDir(m.body)}
                      >
                        {ugcDisplay(m.body)}
                      </p>
                    </li>
                  );
                })}
              </ul>

              {selected.status !== 'resolved' && selected.status !== 'closed' ? (
                <div className="p-2 border-t border-base-300 flex gap-2">
                  <textarea
                    className="textarea textarea-bordered textarea-sm flex-1 min-h-12 max-h-32"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t('اكتب رسالة…', 'Write a message…')}
                    maxLength={4000}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm self-end"
                    disabled={msgBusy || !draft.trim()}
                    onClick={() => void send()}
                    aria-label={t('إرسال', 'Send')}
                  >
                    <Send size={16} aria-hidden />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
