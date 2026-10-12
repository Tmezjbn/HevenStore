import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Save } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { formatMoney } from '../../lib/formatMoney';
import { saveSiteSettings, type SiteSettingsMap } from '../../lib/siteSettings';
import { WALLET_HARD_LIMIT_USD, WALLET_SOFT_LIMIT_USD } from '../../lib/wallet';
import ConfirmDialog from '../dashboard/ConfirmDialog';
import {
  WALLET_CONFIG_QUERY_KEY,
  normalizeAmountInput,
  parseAmount,
  useWalletConfig,
  type WalletSettingKey,
} from './walletQueries';

/**
 * Owner wallet controls. Saved on their own (not via the page-wide Save) so the
 * >$500 risk confirm gates exactly these keys; the DB trigger re-validates limits.
 */
export default function WalletSettingsForm() {
  const { t } = useI18n();
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const { data: cfg, isLoading, isError } = useWalletConfig();

  const [enabled, setEnabled] = useState(false);
  const [minRaw, setMinRaw] = useState('');
  const [maxRaw, setMaxRaw] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!cfg || dirty) return;
    setEnabled(cfg.enabled);
    setMinRaw(String(cfg.minTopup));
    setMaxRaw(String(cfg.maxTopup));
  }, [cfg, dirty]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(id);
  }, [saved]);

  const touch = () => {
    setDirty(true);
    setSaved(false);
    setSaveError('');
  };

  const min = parseAmount(minRaw);
  const max = parseAmount(maxRaw);
  const hardCap = formatMoney(WALLET_HARD_LIMIT_USD);
  const minError =
    !Number.isFinite(min) || min <= 0
      ? t('أدخل حداً أدنى أكبر من صفر.', 'Enter a minimum above zero.')
      : min > WALLET_HARD_LIMIT_USD
        ? t(`لا يمكن أن يتجاوز ${hardCap}.`, `Can't exceed ${hardCap}.`)
        : '';
  const maxError =
    !Number.isFinite(max) || max <= 0
      ? t('أدخل حداً أقصى أكبر من صفر.', 'Enter a maximum above zero.')
      : max > WALLET_HARD_LIMIT_USD
        ? t(`الحد الأقصى المسموح ${hardCap}.`, `The highest allowed limit is ${hardCap}.`)
        : !minError && max < min
          ? t('يجب أن يكون الحد الأقصى مساوياً للحد الأدنى أو أكبر.', 'Maximum must be at least the minimum.')
          : '';
  const invalid = !!minError || !!maxError;

  const persist = async () => {
    if (!userId || invalid) return;
    setBusy(true);
    setSaveError('');
    try {
      const updates: Record<WalletSettingKey, string> = {
        wallet_enabled: enabled ? 'true' : 'false',
        wallet_topup_min_usd: String(min),
        wallet_topup_max_usd: String(max),
      };
      // ponytail: wallet keys are not in SITE_SETTING_KEYS (see walletQueries.ts); same upsert path.
      await saveSiteSettings(updates as unknown as Partial<SiteSettingsMap>, userId);
      await queryClient.invalidateQueries({ queryKey: WALLET_CONFIG_QUERY_KEY });
      setDirty(false);
      setSaved(true);
      setConfirmOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? '');
      setSaveError(
        msg.includes('WALLET_SETTINGS_INVALID')
          ? t('رفض الخادم هذه الحدود. راجع القيم.', 'The server rejected these limits. Check the values.')
          : t('فشل الحفظ', 'Save failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const onSave = () => {
    if (invalid || busy) return;
    // Raising above the soft limit needs an explicit, informed confirm.
    if (max > WALLET_SOFT_LIMIT_USD && max !== cfg?.maxTopup) {
      setSaveError('');
      setConfirmOpen(true);
      return;
    }
    void persist();
  };

  if (isLoading) {
    return <span className="loading loading-spinner loading-sm text-primary" aria-label={t('جارٍ التحميل', 'Loading')} />;
  }
  if (isError) {
    return (
      <p className="text-sm text-error" role="alert">
        {t('تعذر تحميل إعدادات المحفظة.', 'Could not load wallet settings.')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="checkbox checkbox-primary mt-0.5"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            touch();
          }}
        />
        <span className="text-sm">
          <span className="font-medium block">{t('تفعيل المحفظة', 'Enable wallet')}</span>
          <span className="text-base-content/65 text-pretty">
            {t(
              'يسمح للمستخدمين بشحن رصيد متجر بالعملات الرقمية والدفع به. عند الإيقاف يبقى الرصيد محفوظاً.',
              'Lets users top up store credit with crypto and pay with it. When off, balances stay intact.',
            )}
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="settings-field">
          <span className="profile-field-label">{t('أقل مبلغ شحن (USD)', 'Minimum top-up (USD)')}</span>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            className={`input input-bordered w-full text-sm tabular-nums ${minError ? 'input-error' : ''}`}
            value={minRaw}
            onChange={(e) => {
              setMinRaw(normalizeAmountInput(e.target.value));
              touch();
            }}
            aria-invalid={!!minError}
          />
          {minError ? (
            <span className="text-xs text-error" role="alert">
              {minError}
            </span>
          ) : null}
        </label>
        <label className="settings-field">
          <span className="profile-field-label">{t('أعلى مبلغ شحن (USD)', 'Maximum top-up (USD)')}</span>
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            className={`input input-bordered w-full text-sm tabular-nums ${maxError ? 'input-error' : ''}`}
            value={maxRaw}
            onChange={(e) => {
              setMaxRaw(normalizeAmountInput(e.target.value));
              touch();
            }}
            aria-invalid={!!maxError}
          />
          {maxError ? (
            <span className="text-xs text-error" role="alert">
              {maxError}
            </span>
          ) : !invalid && max > WALLET_SOFT_LIMIT_USD ? (
            <span className="text-xs text-warning">
              {t(
                `أعلى من ${formatMoney(WALLET_SOFT_LIMIT_USD)} — مخاطر أعلى.`,
                `Above ${formatMoney(WALLET_SOFT_LIMIT_USD)} — higher risk.`,
              )}
            </span>
          ) : null}
        </label>
      </div>

      <p className="text-xs text-base-content/65 text-pretty">
        {t(
          `الرصيد رصيد متجر غير قابل للسحب. ننصح بحد أقصى ${formatMoney(WALLET_SOFT_LIMIT_USD)} أو أقل؛ السقف ${hardCap}. تُحفظ هذه الإعدادات بزرّها الخاص.`,
          `Balance is non-withdrawable store credit. We recommend a max of ${formatMoney(WALLET_SOFT_LIMIT_USD)} or less; hard cap ${hardCap}. These settings save with their own button.`,
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm gap-2"
          onClick={onSave}
          disabled={busy || invalid || !dirty}
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Save size={14} aria-hidden />}
          {t('حفظ إعدادات المحفظة', 'Save wallet settings')}
        </button>
        {saved ? (
          <span className="settings-save-status text-success" role="status">
            <Check size={14} aria-hidden /> {t('تم الحفظ', 'Saved')}
          </span>
        ) : null}
        {saveError && !confirmOpen ? (
          <span className="settings-save-status text-error" role="alert">
            {saveError}
          </span>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={persist}
        busy={busy}
        danger
        error={confirmOpen ? saveError || null : null}
        title={t(
          `رفع حد الشحن إلى ${formatMoney(max)}؟`,
          `Raise the top-up limit to ${formatMoney(max)}?`,
        )}
        body={t(
          `الحدود الأعلى من ${formatMoney(WALLET_SOFT_LIMIT_USD)} تزيد مخاطر الاحتيال والمبالغ المستردة وغسيل الأموال، وقد تراجع بوابة الدفع حسابك أو تقيّده. ارفع الحد فقط إذا كنت تستطيع التحقق من عملائك.`,
          `Limits above ${formatMoney(WALLET_SOFT_LIMIT_USD)} raise fraud, chargeback and money-laundering risk, and the payment provider may review or restrict your account. Only raise it if you can verify your customers.`,
        )}
        confirmLabel={t('أفهم المخاطر، احفظ', 'I understand, save')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}
