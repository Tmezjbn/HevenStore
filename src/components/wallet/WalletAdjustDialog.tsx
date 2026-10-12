import { useEffect, useRef, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { formatMoney } from '../../lib/formatMoney';
import { adminAdjustWallet, walletErrorMessage, WALLET_HARD_LIMIT_USD } from '../../lib/wallet';
import Modal from '../ui/Modal';
import { normalizeAmountInput, parseAmount } from './walletQueries';

type Target = { id: string; name: string };

/** Owner/admin credit/debit of a user's wallet (RPC re-checks role, note, limits, balance). */
export default function WalletAdjustDialog({
  target,
  balance,
  onClose,
  onDone,
}: {
  target: Target | null;
  /** undefined = balance unknown (load failed) */
  balance: number | undefined;
  onClose: () => void;
  onDone: (userId: string, newBalance: number) => void;
}) {
  const { t } = useI18n();
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
  const [amountRaw, setAmountRaw] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');

  const targetId = target?.id;
  useEffect(() => {
    setDirection('credit');
    setAmountRaw('');
    setNote('');
    setTouched(false);
    setError('');
  }, [targetId]);

  const amount = parseAmount(amountRaw);
  const signed = direction === 'credit' ? amount : -amount;
  const current = balance ?? 0;
  const next = Number.isFinite(amount) ? Math.round((current + signed) * 100) / 100 : current;
  const noteLen = note.trim().length;
  const amountError =
    !Number.isFinite(amount) || amount <= 0
      ? t('أدخل مبلغاً أكبر من صفر.', 'Enter an amount above zero.')
      : amount > WALLET_HARD_LIMIT_USD
        ? t(`الحد الأقصى ${formatMoney(WALLET_HARD_LIMIT_USD)}.`, `Maximum is ${formatMoney(WALLET_HARD_LIMIT_USD)}.`)
        : balance != null && next < 0
          ? t('الخصم أكبر من الرصيد الحالي.', 'Debit is larger than the current balance.')
          : '';
  const noteError =
    noteLen < 3 || noteLen > 300
      ? t('اكتب سبباً من 3 إلى 300 حرف.', 'Write a reason of 3–300 characters.')
      : '';
  const invalid = !!amountError || !!noteError;

  const submit = async () => {
    setTouched(true);
    if (!target || invalid || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const newBalance = await adminAdjustWallet(target.id, signed, note.trim());
      onDone(target.id, newBalance);
    } catch (err) {
      setError(walletErrorMessage((err as { message?: string })?.message, t));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={() => {
        if (!busy) onClose();
      }}
      labelledBy="wallet-adjust-title"
      boxClassName="max-w-md text-start"
      closeLabel={t('إغلاق', 'Close')}
    >
      <h3 id="wallet-adjust-title" className="font-semibold text-lg tracking-tight mb-1">
        {t('تعديل رصيد المحفظة', 'Adjust wallet balance')}
      </h3>
      <p className="text-sm text-base-content/70 mb-4 truncate">{target?.name}</p>

      <div className="flex flex-col gap-3">
        <div className="join w-full" role="group" aria-label={t('نوع التعديل', 'Adjustment type')}>
          <button
            type="button"
            className={`btn btn-sm join-item flex-1 gap-1 ${direction === 'credit' ? 'btn-success' : 'btn-outline'}`}
            aria-pressed={direction === 'credit'}
            onClick={() => setDirection('credit')}
          >
            <Plus size={14} aria-hidden />
            {t('إضافة', 'Credit')}
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item flex-1 gap-1 ${direction === 'debit' ? 'btn-error' : 'btn-outline'}`}
            aria-pressed={direction === 'debit'}
            onClick={() => setDirection('debit')}
          >
            <Minus size={14} aria-hidden />
            {t('خصم', 'Debit')}
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('المبلغ (USD)', 'Amount (USD)')}</span>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            className={`input input-bordered input-sm w-full tabular-nums ${touched && amountError ? 'input-error' : ''}`}
            value={amountRaw}
            onChange={(e) => setAmountRaw(normalizeAmountInput(e.target.value))}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!amountError}
          />
          {touched && amountError ? (
            <span className="text-xs text-error" role="alert">
              {amountError}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('السبب (مطلوب)', 'Reason (required)')}</span>
          <textarea
            className={`textarea textarea-bordered textarea-sm w-full ${touched && noteError ? 'textarea-error' : ''}`}
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!noteError}
          />
          <span className={`text-xs ${touched && noteError ? 'text-error' : 'text-base-content/60'}`}>
            {touched && noteError ? noteError : `${noteLen}/300`}
          </span>
        </label>

        <div className="rounded-box border border-base-300 bg-base-200/60 px-3 py-2 text-sm flex flex-col gap-1">
          <div className="flex justify-between gap-3">
            <span className="text-base-content/70">{t('الرصيد الحالي', 'Current balance')}</span>
            <span className="tabular-nums" dir="ltr">
              {balance == null ? '—' : formatMoney(current)}
            </span>
          </div>
          <div className="flex justify-between gap-3 font-semibold">
            <span>{t('الرصيد الجديد', 'New balance')}</span>
            <span className={`tabular-nums ${next < 0 ? 'text-error' : ''}`} dir="ltr">
              {balance == null ? '—' : formatMoney(next)}
            </span>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="modal-action mt-4">
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onClose}>
          {t('إلغاء', 'Cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm gap-2"
          disabled={busy || (touched && invalid)}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
          {t('تأكيد التعديل', 'Confirm adjustment')}
        </button>
      </div>
    </Modal>
  );
}
