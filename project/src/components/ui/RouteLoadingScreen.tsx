import { useI18n } from '../../lib/i18n';

/** Full-viewport route/auth/boot hold — brand + rare progress cue, CSS-only. */
export default function RouteLoadingScreen({
  label,
}: {
  label?: string;
} = {}) {
  const { t } = useI18n();
  const text = label ?? t('جارٍ التحميل', 'Loading');

  return (
    <div
      className="route-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="route-loading__stack">
        <p className="route-loading__brand" aria-hidden>
          HEVEN.FUN
        </p>
        <div className="route-loading__track" aria-hidden>
          <div className="route-loading__bar" />
        </div>
        <p className="route-loading__label">{text}</p>
      </div>
    </div>
  );
}
