import { Save, Loader2, Check, Clapperboard } from 'lucide-react';
import { PLYR_CONTROL_OPTIONS, type PlyrSiteConfig, type PlyrControlId, type SiteSettingsMap } from '../../../lib/siteSettings';
import { type UseMutationResult } from '@tanstack/react-query';
import { focusRing, SECTION_SHELL, SECTION_TITLE, SECTION_DESC } from './constants';

interface PlayerSectionProps {
  plyrConfig: PlyrSiteConfig;
  plyrDirty: boolean;
  plyrSaved: boolean;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  savePlyr: () => Promise<void>;
  setPlyrConfig: React.Dispatch<React.SetStateAction<PlyrSiteConfig>>;
  setPlyrSaved: React.Dispatch<React.SetStateAction<boolean>>;
  t: (ar: string, en: string) => string;
  togglePlyrControl: (id: PlyrControlId) => void;
}

export default function PlayerSection({
  plyrConfig,
  plyrDirty,
  plyrSaved,
  saveMutation,
  savePlyr,
  setPlyrConfig,
  setPlyrSaved,
  t,
  togglePlyrControl,
}: PlayerSectionProps) {
  return (
      <section id="builder-player" className={SECTION_SHELL} aria-labelledby="builder-player-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="builder-player-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-warning/40 bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <Clapperboard size={15} aria-hidden />
              </span>
              {t('مشغّل فيديو المنتج', 'Product video player')}
            </h3>
            <p className={SECTION_DESC}>
              {t(
                'Plyr لصفحات المنتجات. عطّله لاستخدام مشغّل المتصفح للملفات فقط.',
                'Plyr on product pages. Turn off to use the browser player for file URLs only.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={savePlyr}
            disabled={!plyrDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : plyrSaved && !plyrDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {plyrSaved && !plyrDirty ? t('تم الحفظ', 'Saved') : t('حفظ المشغّل', 'Save player')}
          </button>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100/50 p-3 cursor-pointer">
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary mt-0.5"
            checked={plyrConfig.enabled}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, enabled: e.target.checked }));
              setPlyrSaved(false);
            }}
          />
          <span className="text-sm font-medium">{t('تفعيل Plyr', 'Enable Plyr')}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium opacity-70">{t('لون التمييز', 'Accent')}</label>
          <input
            type="color"
            className="w-10 h-8 rounded border border-base-300 bg-transparent cursor-pointer"
            value={plyrConfig.accent}
            aria-label={t('لون التمييز', 'Accent')}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, accent: e.target.value }));
              setPlyrSaved(false);
            }}
          />
          <span className="font-mono text-xs opacity-60">{plyrConfig.accent}</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium opacity-70">{t('أزرار التحكم', 'Controls')}</p>
          <div className="flex flex-wrap gap-2">
            {PLYR_CONTROL_OPTIONS.map((id) => (
              <label
                key={id}
                className="label cursor-pointer gap-2 rounded-lg border border-base-300 bg-base-100/50 px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary"
                  checked={plyrConfig.controls.includes(id)}
                  onChange={() => togglePlyrControl(id)}
                />
                <span className="label-text text-xs font-mono">{id}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100/50 p-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={plyrConfig.seekTooltips}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, seekTooltips: e.target.checked }));
              setPlyrSaved(false);
            }}
          />
          <span className="text-sm">{t('تلميحات التقديم', 'Seek tooltips')}</span>
        </label>
      </section>
  );
}
