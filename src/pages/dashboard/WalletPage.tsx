import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Coins, Loader2, Wallet, X, ArrowRight } from 'lucide-react';
// PERF-2: buyer-ledger + wallet-vault styles live in dashboard-role-surfaces.css (shared chunk).
void import('../../styles/dashboard-role-surfaces.css');
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { usePageMeta } from '../../hooks/usePageMeta';
import { formatMoney } from '../../lib/formatMoney';
import { fmtDateTime } from '../../lib/dates';
import {
  fetchWalletLedger,
  fetchWalletTopups,
  startWalletTopup,
  type WalletEntry,
  type WalletTopup,
} from '../../lib/wallet';
import {
  normalizeAmountInput,
  parseAmount,
  useWalletBalance,
  useWalletConfig,
} from '../../components/wallet/walletQueries';

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const PRESETS = [10, 25, 50, 100];
const POLL_MS = 10_000;
const POLL_WINDOW_MS = 3 * 60_000;

type Row = {
  key: string;
  at: string;
  label: string;
  amount: number;
  /** pos/neg = moved the balance; muted = top-up invoice that has not credited (yet). */
  tone: 'pos' | 'neg' | 'muted';
  note?: string | null;
  orderId?: string | null;
  status?: { label: string; cls: string };
};

export default function WalletPage() {
  const { t, lang } = useI18n();
  usePageMeta({ title: t('المحفظة', 'Wallet'), noindex: true });
  const userId = useAuthStore((s) => s.user?.id);
  const [params, setParams] = useSearchParams();
  const topupParam = params.get('topup');

  // ?topup=success → poll balance every 10s for up to 3 min (provider confirms async).
  const [pollUntil] = useState(() => (topupParam === 'success' ? Date.now() + POLL_WINDOW_MS : 0));
  const [polling, setPolling] = useState(pollUntil > 0);
  useEffect(() => {
    if (!polling) return;
    const id = window.setTimeout(() => setPolling(false), Math.max(0, pollUntil - Date.now()));
    return () => window.clearTimeout(id);
  }, [polling, pollUntil]);
  const pollInterval = polling ? POLL_MS : false;

  const configQ = useWalletConfig();
  const cfg = configQ.data;
  const balanceQ = useWalletBalance(userId, true, pollInterval);
  const ledgerQ = useQuery({
    queryKey: ['wallet-ledger', userId ?? ''],
    queryFn: () => fetchWalletLedger(50),
    enabled: !!userId,
    refetchInterval: pollInterval,
  });
  const topupsQ = useQuery({
    queryKey: ['wallet-topups', userId ?? ''],
    queryFn: () => fetchWalletTopups(20),
    enabled: !!userId,
    refetchInterval: pollInterval,
  });

  // Stop polling once the credit lands.
  const firstBalance = useRef<number | null>(null);
  const balance = balanceQ.data;
  useEffect(() => {
    if (balance == null) return;
    if (firstBalance.current == null) {
      firstBalance.current = balance;
      return;
    }
    if (polling && balance > firstBalance.current) setPolling(false);
  }, [balance, polling]);

  const [amountRaw, setAmountRaw] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [topupError, setTopupError] = useState('');
  // Back from the provider via bfcache keeps the old spinner — reset it.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        busyRef.current = false;
        setBusy(false);
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  const min = cfg?.minTopup ?? 5;
  const max = cfg?.maxTopup ?? 500;
  const presets = useMemo(
    () => [...new Set(PRESETS.map((v) => Math.min(max, Math.max(min, v))))],
    [min, max],
  );
  const amount = parseAmount(amountRaw);
  const amountError = !amountRaw
    ? t('أدخل مبلغ الشحن.', 'Enter a top-up amount.')
    : !Number.isFinite(amount) || amount <= 0
      ? t('أدخل مبلغاً صحيحاً.', 'Enter a valid amount.')
      : amount < min
        ? t(`الحد الأدنى للشحن ${formatMoney(min)}.`, `Minimum top-up is ${formatMoney(min)}.`)
        : amount > max
          ? t(`الحد الأقصى للشحن ${formatMoney(max)}.`, `Maximum top-up is ${formatMoney(max)}.`)
          : '';
  const showAmountError = touched && !!amountError;

  const submitTopup = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (amountError || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setTopupError('');
    try {
      const res = await startWalletTopup(amount, t);
      if (!res.ok) {
        setTopupError(res.error);
        busyRef.current = false;
        setBusy(false);
      }
      // ok → redirected to the hosted invoice; keep the spinner until unload.
    } catch {
      setTopupError(t('تعذّر بدء الشحن. حاول مجدداً.', 'Could not start the top-up. Please try again.'));
      busyRef.current = false;
      setBusy(false);
    }
  };

  const dismissTopupNotice = () => {
    const next = new URLSearchParams(params);
    next.delete('topup');
    setParams(next, { replace: true });
  };

  const kindLabel = (kind: WalletEntry['kind']) =>
    kind === 'topup'
      ? t('شحن الرصيد', 'Top-up')
      : kind === 'purchase'
        ? t('شراء', 'Purchase')
        : kind === 'refund'
          ? t('استرداد', 'Refund')
          : t('تعديل من الإدارة', 'Adjustment');

  const topupStatus = (tp: WalletTopup): Row['status'] => {
    switch (tp.status) {
      case 'pending':
        return { label: t('بانتظار الدفع', 'Awaiting payment'), cls: 'buyer-ledger__status--pending' };
      case 'partially_paid':
        return {
          label:
            tp.credited_usd != null
              ? t(`مدفوع جزئياً — أُضيف ${formatMoney(tp.credited_usd)}`, `Partially paid — ${formatMoney(tp.credited_usd)} credited`)
              : t('مدفوع جزئياً', 'Partially paid'),
          cls: 'buyer-ledger__status--refunded',
        };
      case 'expired':
        return { label: t('منتهي الصلاحية', 'Expired'), cls: 'buyer-ledger__status--cancelled' };
      default:
        return { label: t('فشل', 'Failed'), cls: 'buyer-ledger__status--failed' };
    }
  };

  const rows: Row[] = (() => {
    const out: Row[] = (ledgerQ.data ?? []).map((e) => ({
      key: `l-${e.id}`,
      at: e.created_at,
      label: kindLabel(e.kind),
      amount: e.amount,
      tone: e.amount >= 0 ? 'pos' : 'neg',
      note: e.note,
      orderId: e.order_id,
    }));
    // Finished top-ups already appear as ledger credits; show the rest as invoices.
    for (const tp of topupsQ.data ?? []) {
      if (tp.status === 'finished') continue;
      out.push({
        key: `t-${tp.id}`,
        at: tp.created_at,
        label: t('شحن بالعملات الرقمية', 'Crypto top-up'),
        amount: tp.amount_usd,
        tone: 'muted',
        status: topupStatus(tp),
      });
    }
    return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  })();

  const pendingCount = (topupsQ.data ?? []).filter((tp) => tp.status === 'pending').length;
  const historyLoading = ledgerQ.isLoading || topupsQ.isLoading;
  const historyError = ledgerQ.isError || topupsQ.isError;
  const enabled = cfg?.enabled === true;

  return (
    <div className="buyer-ledger mx-auto w-full max-w-6xl text-start">
      <header className="buyer-ledger__hero">
        <div className="min-w-0">
          <p className="buyer-ledger__kicker">{t('خزنتك', 'Your vault')}</p>
          <h2 className="buyer-ledger__title text-balance">{t('المحفظة', 'Wallet')}</h2>
          <p className="buyer-ledger__lede text-pretty">
            {t(
              'رصيد متجر تستخدمه في أي عملية شراء — اشحنه بالعملات الرقمية.',
              'Store credit for any purchase — top it up with crypto.',
            )}
          </p>
        </div>
        <div className="buyer-ledger__hero-stats wallet-vault__stats" aria-live="polite">
          <div>
            <p className="buyer-ledger__stat-label">{t('الرصيد المتاح', 'Available balance')}</p>
            <p className="buyer-ledger__stat-value wallet-vault__balance tabular-nums" dir="ltr">
              {balanceQ.isLoading ? '—' : balanceQ.isError ? '—' : formatMoney(balance ?? 0)}
            </p>
            {balanceQ.isError ? (
              <button
                type="button"
                className={`buyer-ledger__retry mt-2 ${focusRing}`}
                onClick={() => void balanceQ.refetch()}
              >
                {t('إعادة المحاولة', 'Retry')}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {topupParam === 'success' ? (
        <div className="alert alert-info text-sm" role="status">
          {polling ? <Loader2 size={16} className="animate-spin shrink-0" aria-hidden /> : null}
          <span className="text-pretty">
            {t(
              'تم استلام الدفع — يتحدّث رصيدك بعد تأكيد الشبكة (عادةً خلال دقائق).',
              'Payment received — your balance updates after the network confirms (usually a few minutes).',
            )}
          </span>
          <button
            type="button"
            className={`btn btn-ghost btn-xs min-h-8 min-w-8 px-0 ms-auto ${focusRing}`}
            onClick={dismissTopupNotice}
            aria-label={t('إغلاق', 'Dismiss')}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : topupParam === 'cancel' ? (
        <div className="alert text-sm" role="status">
          <span className="text-pretty">
            {t('تم إلغاء الشحن. لم يُخصم أي مبلغ.', 'Top-up cancelled. You were not charged.')}
          </span>
          <button
            type="button"
            className={`btn btn-ghost btn-xs min-h-8 min-w-8 px-0 ms-auto ${focusRing}`}
            onClick={dismissTopupNotice}
            aria-label={t('إغلاق', 'Dismiss')}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      {configQ.isLoading ? (
        <div className="buyer-ledger__card buyer-ledger__card--skel" aria-busy="true" />
      ) : !enabled ? (
        <div className="buyer-ledger__empty">
          <Wallet size={30} aria-hidden />
          <p className="buyer-ledger__empty-title">{t('الشحن غير متاح بعد', 'Top-ups are not available yet')}</p>
          <p className="buyer-ledger__empty-sub text-pretty">
            {t(
              'شحن المحفظة قادم قريباً. أي رصيد لديك يبقى محفوظاً.',
              'Wallet top-ups are coming soon. Any balance you have stays safe.',
            )}
          </p>
        </div>
      ) : (
        <form className="buyer-ledger__card wallet-vault__topup" onSubmit={(e) => void submitTopup(e)} noValidate>
          <h3 className="font-bold text-base">{t('شحن الرصيد', 'Top up')}</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('مبالغ سريعة', 'Quick amounts')}>
            {presets.map((v) => {
              const on = amount === v;
              return (
                <button
                  key={v}
                  type="button"
                  className={`buyer-ledger__chip tabular-nums ${on ? 'is-on' : ''} ${focusRing}`}
                  aria-pressed={on}
                  onClick={() => {
                    setAmountRaw(String(v));
                    setTouched(true);
                    setTopupError('');
                  }}
                >
                  <span dir="ltr">{formatMoney(v)}</span>
                </button>
              );
            })}
          </div>
          <label className="flex flex-col gap-1.5 max-w-xs">
            <span className="text-sm font-medium">{t('مبلغ مخصص (USD)', 'Custom amount (USD)')}</span>
            <span className={`input input-bordered flex items-center gap-2 ${showAmountError ? 'input-error' : ''}`}>
              <span className="text-base-content/60" aria-hidden>
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                dir="ltr"
                className="grow bg-transparent min-w-0 tabular-nums"
                value={amountRaw}
                onChange={(e) => {
                  setAmountRaw(normalizeAmountInput(e.target.value));
                  setTopupError('');
                }}
                onBlur={() => setTouched(true)}
                placeholder={String(min)}
                aria-invalid={showAmountError}
                aria-describedby="wallet-amount-help"
              />
            </span>
            <span
              id="wallet-amount-help"
              className={`text-xs ${showAmountError ? 'text-error' : 'text-base-content/65'}`}
              role={showAmountError ? 'alert' : undefined}
            >
              {showAmountError
                ? amountError
                : t(
                    `من ${formatMoney(min)} إلى ${formatMoney(max)} لكل عملية شحن.`,
                    `${formatMoney(min)} to ${formatMoney(max)} per top-up.`,
                  )}
            </span>
          </label>
          {topupError ? (
            <div role="alert" className="alert alert-error text-sm py-2">
              {topupError}
            </div>
          ) : null}
          <div>
            <button type="submit" className="btn btn-primary min-h-12 gap-2" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Coins size={16} aria-hidden />}
              {t('اشحن بالعملات الرقمية', 'Top up with crypto')}
            </button>
          </div>
          <p className="buyer-ledger__hint text-pretty">
            {t(
              'رصيد المحفظة رصيد متجر، يمكن استخدامه في أي عملية شراء، ولا يمكن سحبه نقداً.',
              "Wallet balance is store credit, can be used for any purchase, and can't be withdrawn as cash.",
            )}
          </p>
        </form>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="wallet-history-title">
        <h3 id="wallet-history-title" className="font-bold text-base">
          {t('السجل', 'History')}
          {pendingCount > 0 ? (
            <span className="buyer-ledger__status buyer-ledger__status--pending text-xs ms-2">
              <span className="buyer-ledger__status-dot" aria-hidden />
              {t(`${pendingCount} بانتظار الدفع`, `${pendingCount} pending`)}
            </span>
          ) : null}
        </h3>
        {historyLoading ? (
          <ul className="buyer-ledger__list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="buyer-ledger__card buyer-ledger__card--skel" />
            ))}
          </ul>
        ) : historyError ? (
          <div className="buyer-ledger__empty" role="alert">
            <p className="buyer-ledger__empty-title text-error">
              {t('تعذر تحميل السجل. حاول مجدداً.', 'Could not load history. Try again.')}
            </p>
            <button
              type="button"
              className={`buyer-ledger__retry ${focusRing}`}
              onClick={() => {
                void ledgerQ.refetch();
                void topupsQ.refetch();
              }}
            >
              {t('إعادة المحاولة', 'Retry')}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="buyer-ledger__empty">
            <Wallet size={30} aria-hidden />
            <p className="buyer-ledger__empty-title">{t('لا توجد حركات بعد', 'No wallet activity yet')}</p>
            <p className="buyer-ledger__empty-sub text-pretty">
              {t(
                'عمليات الشحن والمشتريات من المحفظة ستظهر هنا.',
                'Top-ups and wallet purchases will show up here.',
              )}
            </p>
          </div>
        ) : (
          <ul className="buyer-ledger__list" role="list">
            {rows.map((r, i) => (
              <li key={r.key} className="buyer-ledger__card-wrap" style={{ '--buyer-i': i } as CSSProperties}>
                <article className="buyer-ledger__card">
                  <div className="buyer-ledger__row">
                    <div className="buyer-ledger__main min-w-0">
                      <p className="buyer-ledger__product">{r.label}</p>
                      <div className="buyer-ledger__meta">
                        {r.status ? (
                          <span className={`buyer-ledger__status ${r.status.cls}`}>
                            <span className="buyer-ledger__status-dot" aria-hidden />
                            {r.status.label}
                          </span>
                        ) : null}
                        <time className="tabular-nums" dateTime={r.at}>
                          {fmtDateTime(r.at, lang)}
                        </time>
                        {r.orderId ? (
                          <Link
                            to="/dashboard/orders"
                            className={`link link-hover inline-flex items-center gap-1 ${focusRing}`}
                          >
                            {t('عرض الطلبات', 'View orders')}
                            <ArrowRight size={12} className="rtl:rotate-180" aria-hidden />
                          </Link>
                        ) : null}
                      </div>
                      {r.note ? <p className="buyer-ledger__hint mt-1 text-pretty">{r.note}</p> : null}
                    </div>
                    <div className="buyer-ledger__aside">
                      <p
                        className={`buyer-ledger__amount tabular-nums ${
                          r.tone === 'pos' ? 'text-success' : r.tone === 'neg' ? 'text-error' : 'text-base-content/55'
                        }`}
                        dir="ltr"
                      >
                        {r.tone === 'pos' ? '+' : r.tone === 'neg' ? '−' : ''}
                        {formatMoney(Math.abs(r.amount))}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
