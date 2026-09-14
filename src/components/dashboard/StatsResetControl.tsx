import { useId, useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { saveSiteSettings } from '../../lib/siteSettings';

const CONFIRM_TOKEN = 'RESET';

type Props = {
  /** Called after watermark saved so parent can reload queries. */
  onReset?: () => void;
  className?: string;
};

/**
 * Owner only: set dashboard_stats_reset_at = now.
 * Affects paid revenue, paid orders, products count, recent orders / sales brief only.
 * Does not delete orders or touch Databuddy traffic / pending.
 */
export default function StatsResetControl({ onReset, className = '' }: Props) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const titleId = useId();
  const canReset = profile?.role === 'owner';

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!canReset || !user) return null;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setStep(1);
    setTyped('');
    setErr(null);
  };

  const runReset = async () => {
    if (typed.trim().toUpperCase() !== CONFIRM_TOKEN) return;
    setBusy(true);
    setErr(null);
    try {
      await saveSiteSettings(
        { dashboard_stats_reset_at: new Date().toISOString() },
        user.id,
      );
      setOpen(false);
      setStep(1);
      setTyped('');
      onReset?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('تعذر إعادة التعيين', 'Reset failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost btn-sm gap-1.5 border border-base-300 text-warning ${className}`}
        onClick={() => {
          setStep(1);
          setTyped('');
          setErr(null);
          setOpen(true);
        }}
      >
        <RotateCcw size={15} aria-hidden />
        {t('تصفير الإحصائيات', 'Reset stats')}
      </button>

      <Modal
        open={open}
        onClose={close}
        labelledBy={titleId}
        closeLabel={t('إغلاق', 'Close')}
        boxClassName="max-w-md"
      >
        <h3 id={titleId} className="font-bold text-lg text-warning">
          {step === 1
            ? t('تصفير إحصائيات المتجر؟', 'Reset store stats?')
            : t('تأكيد نهائي', 'Final confirmation')}
        </h3>

        {step === 1 ? (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-pretty text-base-content/80">
              {t(
                'يعيد عدّاد لوحة التحكم والتحليلات من الآن. لا يحذف طلبات ولا منتجات.',
                'Restarts the dashboard and analytics counters from now. Does not delete orders or products.',
              )}
            </p>
            <ul className="text-sm space-y-1 text-base-content/75 list-disc ps-5">
              <li>{t('الإيراد المدفوع وعدد الطلبات المدفوعة', 'Paid revenue and paid order count')}</li>
              <li>{t('عدد المنتجات (منذ التصفير)', 'Product count (since reset)')}</li>
              <li>{t('آخر الطلبات ومخطط الإيراد', 'Recent orders and revenue chart')}</li>
            </ul>
            <p className="text-xs text-base-content/55 text-pretty">
              {t(
                'لا يؤثر على زيارات Databuddy أو الطلبات المعلّقة أو صفحات الطلبات الكاملة.',
                'Does not affect Databuddy traffic, pending orders, or the full Orders pages.',
              )}
            </p>
            <div className="modal-action mt-4">
              <button type="button" className="btn btn-ghost" onClick={close} disabled={busy}>
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => setStep(2)}
                disabled={busy}
              >
                {t('متابعة', 'Continue')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-pretty">
              {t(
                'اكتب RESET للتأكيد. لا يمكن التراجع عن نقطة البداية — فقط تصفير جديد لاحقاً.',
                'Type RESET to confirm. The baseline cannot be undone — only reset again later.',
              )}
            </p>
            <label className="form-control w-full">
              <span className="label-text text-xs mb-1">
                {t('اكتب', 'Type')} <span className="font-mono font-bold">{CONFIRM_TOKEN}</span>
              </span>
              <input
                type="text"
                className="input input-bordered input-sm font-mono"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                aria-label={t('تأكيد التصفير', 'Confirm reset')}
              />
            </label>
            {err ? <p className="text-sm text-error" role="alert">{err}</p> : null}
            <div className="modal-action mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStep(1);
                  setTyped('');
                  setErr(null);
                }}
                disabled={busy}
              >
                {t('رجوع', 'Back')}
              </button>
              <button
                type="button"
                className="btn btn-warning"
                disabled={busy || typed.trim().toUpperCase() !== CONFIRM_TOKEN}
                onClick={() => void runReset()}
              >
                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                {t('تصفير الآن', 'Reset now')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
