import { useEffect, useState } from 'react';
import {
  Check, Moon, Sun, Vault, Sparkles, Sunset, Waves, MoonStar, Coffee, Save, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useAppearanceStore } from '../../stores/appearanceStore';
import { useSiteSettings, useSaveSiteSettings } from '../../hooks/useSiteSettings';
import {
  SKINS,
  SKIN_BLURBS,
  normalizeSkinId,
  type SkinId,
} from '../../lib/appearance';
import { originFromElement } from '../../lib/viewTransition';
import { parseUiScale, UI_SCALE_VALUES } from '../../lib/siteSettings';

const SKIN_ICONS: Record<SkinId, LucideIcon> = {
  vault: Vault,
  aurora: Sparkles,
  sunset: Sunset,
  abyss: Waves,
  dim: MoonStar,
  coffee: Coffee,
};

export default function ThemesPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { skin, mode, setSkin, setMode } = useAppearanceStore();
  const { settings, isLoading } = useSiteSettings();
  const saveMutation = useSaveSiteSettings();

  const [defaultSkin, setDefaultSkin] = useState<SkinId>(
    normalizeSkinId(settings.default_skin)
  );
  const [uiScale, setUiScale] = useState(() => parseUiScale(settings.ui_scale));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDefaultSkin(normalizeSkinId(settings.default_skin));
      setUiScale(parseUiScale(settings.ui_scale));
      setSaved(false);
    }
  }, [settings.default_skin, settings.ui_scale, isLoading]);

  const dirty =
    defaultSkin !== normalizeSkinId(settings.default_skin) ||
    uiScale !== parseUiScale(settings.ui_scale);

  const saveDefault = async () => {
    if (!user || !dirty) return;
    try {
      await saveMutation.mutateAsync({
        updates: { default_skin: defaultSkin, ui_scale: String(uiScale) },
        userId: user.id,
      });
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full text-start space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {t('الثيمات', 'Themes')}
        </h2>
        <p className="text-sm text-base-content/55 text-pretty">
          {t(
            'معاينة السمات، الوضع، والسمة الافتراضية لزوار الموقع.',
            'Preview skins, light/dark mode, and the site default for visitors.'
          )}
        </p>
      </header>

      {/* Personal preview */}
      <section className="rounded-xl border border-base-300 bg-base-200/80 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('معاينة الجلسة', 'Session preview')}</h3>
            <p className="text-xs text-base-content/70 mt-0.5">
              {t(
                'يطبَّق على جهازك فقط. لا يغيّر افتراضي الموقع حتى تحفظ أدناه.',
                'Applies on this device only. Does not change the site default until you save below.'
              )}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-base-300 bg-base-100 p-0.5" role="group">
            <button
              type="button"
              onClick={(e) => setMode('dark', originFromElement(e.currentTarget))}
              aria-pressed={mode === 'dark'}
              className={`btn btn-sm gap-1.5 border-0 ${mode === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Moon size={14} aria-hidden />
              {t('داكن', 'Dark')}
            </button>
            <button
              type="button"
              onClick={(e) => setMode('light', originFromElement(e.currentTarget))}
              aria-pressed={mode === 'light'}
              className={`btn btn-sm gap-1.5 border-0 ${mode === 'light' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Sun size={14} aria-hidden />
              {t('فاتح', 'Light')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SKINS.map((s) => {
            const Icon = SKIN_ICONS[s.id];
            const active = skin === s.id;
            const blurb = SKIN_BLURBS[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSkin(s.id)}
                aria-pressed={active}
                className={`rounded-xl border p-4 text-start transition-colors duration-150 ${
                  active
                    ? 'border-primary bg-base-100 ring-1 ring-primary/30'
                    : 'border-base-300/80 bg-base-100/40 hover:border-base-content/25'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-12 h-12 rounded-lg border border-base-content/10 shrink-0 shadow-inner"
                    style={{
                      background: `linear-gradient(145deg, ${s.swatch.base} 40%, ${s.swatch.primary} 100%)`,
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="opacity-70 shrink-0" aria-hidden />
                      <span className="text-sm font-semibold truncate">
                        {t(s.labelAr, s.labelEn)}
                      </span>
                      {active && <Check size={14} className="text-primary ms-auto shrink-0" />}
                    </div>
                    <p className="text-xs text-base-content/70 mt-1 text-pretty leading-relaxed">
                      {lang === 'ar' ? blurb.ar : blurb.en}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Site defaults */}
      <section className="rounded-xl border border-base-300 bg-base-200/80 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t('إعدادات العرض الافتراضية', 'Site display defaults')}</h3>
            <p className="text-xs text-base-content/70 mt-0.5 text-pretty">
              {t(
                'السمة للزوار الجدد، وحجم واجهة المتجر للجميع.',
                'Default skin for new visitors and storefront UI scale for everyone.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={saveDefault}
            disabled={!dirty || saveMutation.isPending}
            className="btn btn-primary btn-sm gap-1.5 self-start sm:self-auto"
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved && !dirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {saved && !dirty
              ? t('تم الحفظ', 'Saved')
              : t('حفظ الإعدادات', 'Save defaults')}
          </button>
        </div>

        <label
          htmlFor="site-ui-scale"
          className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-100/45 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{t('حجم الواجهة', 'UI scale')}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-base-content/70 text-pretty">
              {t(
                'كثافة واجهة المتجر فقط؛ لوحة التحكم تبقى 100٪. الافتراضي 90٪.',
                'Storefront density only; dashboard stays at 100%. Default is 90%.'
              )}
            </span>
          </span>
          <select
            id="site-ui-scale"
            className="select select-bordered min-h-11 w-full shrink-0 sm:w-32"
            value={uiScale}
            onChange={(event) => {
              setUiScale(parseUiScale(event.target.value));
              setSaved(false);
            }}
          >
            {UI_SCALE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}%{value === 90 ? ` — ${t('افتراضي', 'Default')}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SKINS.map((s) => {
            const Icon = SKIN_ICONS[s.id];
            const active = defaultSkin === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setDefaultSkin(s.id);
                  setSaved(false);
                }}
                aria-pressed={active}
                className={`rounded-lg border p-3 text-start transition-colors ${
                  active ? 'border-primary bg-base-100' : 'border-base-300 hover:border-base-content/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-5 h-5 rounded-full border border-base-content/15"
                    style={{
                      background: `linear-gradient(135deg, ${s.swatch.base} 45%, ${s.swatch.primary} 55%)`,
                    }}
                  />
                  <Icon size={12} className="opacity-50" aria-hidden />
                  {active && <Check size={14} className="text-primary ms-auto" />}
                </div>
                <span className="text-xs font-medium block">{t(s.labelAr, s.labelEn)}</span>
                {s.id === 'vault' && (
                  <span className="text-[10px] opacity-50 mt-0.5 block">
                    {t('افتراضي الموقع', 'Site default')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
