import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Loader2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parseMultiAccountRoles } from '../../lib/siteSettings';
import {
  canAddSecondAccount,
  loadPark,
  subscribePark,
  type ParkedAccount,
} from '../../lib/accountSwitch';

type Props = {
  onDone?: () => void;
  className?: string;
  /** icon = square control; menu = full drawer row naming the other account */
  variant?: 'icon' | 'menu';
};

/**
 * Switch to parked account, or start Add-account flow.
 */
export default function AccountSwitch({
  onDone,
  className = '',
  variant = 'icon',
}: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const addSecondAccount = useAuthStore((s) => s.addSecondAccount);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const { settings } = useSiteSettings();
  const flags = parseMultiAccountRoles(settings.multi_account_roles_json);

  const [park, setPark] = useState<ParkedAccount | null>(() => loadPark());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const sync = () => setPark(loadPark());
    sync();
    return subscribePark(sync);
  }, [user?.id]);

  // Mid-switch park may briefly equal live user — hide self-switch, don't wipe storage.
  const other = park && user?.id && park.userId === user.id ? null : park;
  const canAdd = canAddSecondAccount(profile?.role, flags) && !other;
  if (!canAdd && !other) return null;

  const parkLabel =
    other?.fullName?.trim() ||
    (other?.username ? `@${other.username}` : null) ||
    other?.email ||
    t('الحساب الآخر', 'the other account');

  const switchLabel = t(`التبديل إلى ${parkLabel}`, `Switch to ${parkLabel}`);
  const addLabel = t('إضافة حساب للتبديل', 'Add account to switch');

  const onClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      if (other) {
        const res = await switchAccount();
        if (!res.ok) {
          setPark(loadPark());
          setErr(
            res.error === 'park_refresh_failed'
              ? t(
                  'انتهت جلسة الحساب المحفوظ — سجّله مجدداً.',
                  'Parked session expired — sign that account in again.',
                )
              : res.error === 'restore_failed'
                ? t(
                    'تعذر التبديل وفُقدت الجلسة — سجّل الدخول مجدداً.',
                    'Switch failed and the session was lost — sign in again.',
                  )
                : t('تعذر التبديل. حاول مرة أخرى.', 'Could not switch. Try again.'),
          );
          return;
        }
        onDone?.();
        navigate('/dashboard');
        return;
      }
      // Add parks the live session and signs out locally — confirm first.
      const confirmed = window.confirm(
        t(
          'سيتم حفظ الحساب الحالي على هذا الجهاز ثم فتح تسجيل الدخول لحساب ثانٍ. المتابعة؟',
          'This parks the current account on this device, then opens sign-in for a second account. Continue?',
        ),
      );
      if (!confirmed) return;
      const ok = await addSecondAccount();
      if (!ok) return;
      onDone?.();
      navigate('/auth/login?add=1&next=/dashboard');
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'menu') {
    return (
      <li className={`account-switch-menu ${className}`.trim()}>
        <button
          type="button"
          disabled={busy}
          aria-label={other ? switchLabel : addLabel}
          onClick={(e) => void onClick(e)}
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin shrink-0" aria-hidden />
          ) : other ? (
            <ArrowLeftRight size={20} strokeWidth={2.25} className="shrink-0" aria-hidden />
          ) : (
            <UserPlus size={20} strokeWidth={2.25} className="shrink-0" aria-hidden />
          )}
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="text-xs font-medium opacity-60 leading-none">
              {other ? t('التبديل إلى', 'Switch to') : t('إضافة حساب', 'Add account')}
            </span>
            <span className="truncate font-semibold leading-tight max-w-full">
              {other ? parkLabel : t('حساب ثانٍ على هذا الجهاز', 'Second account on this device')}
            </span>
          </span>
        </button>
        {err ? (
          <p className="account-switch-menu__err px-3 pb-2 text-xs text-error" role="alert">
            {err}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`account-switch-btn ${other ? 'is-parked' : ''}${err ? ' is-err' : ''} ${className}`.trim()}
        disabled={busy}
        title={err || (other ? switchLabel : addLabel)}
        aria-label={err || (other ? switchLabel : addLabel)}
        onClick={(e) => void onClick(e)}
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : other ? (
          <ArrowLeftRight size={16} strokeWidth={2.25} aria-hidden />
        ) : (
          <UserPlus size={16} strokeWidth={2.25} aria-hidden />
        )}
      </button>
      {err ? (
        <span className="sr-only" role="alert">
          {err}
        </span>
      ) : null}
    </>
  );
}
