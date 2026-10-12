import { Save, Loader2, Check, ChevronUp, ChevronDown, ImagePlus, Trash2, Film } from 'lucide-react';
import HeroMediaBackdrop from '../../../components/home/HeroMediaBackdrop';
import { HERO_MEDIA_MAX, HERO_ZOOM_DEFAULT, HERO_ZOOM_MIN, HERO_ZOOM_MAX, clampHeroPos, clampHeroZoom, heroMediaPanStyle, type HeroMediaItem, type HeroLogoPlacement, type ProductDetailFxConfig, DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS, type SiteSettingsMap } from '../../../lib/siteSettings';
import { AURA_STYLES, type AuraStyle } from '../../../lib/productEffects';
import { type UseMutationResult } from '@tanstack/react-query';
import { HERO_ACCEPT, focusRing, SECTION_SHELL, SECTION_TITLE, type HeroEditorTab } from './constants';
import HeroRange from './HeroRange';

interface HeroSectionProps {
  detailFx: ProductDetailFxConfig;
  embedHeroUrl: () => void;
  heroBackdropEnabled: boolean;
  heroBlur: number;
  heroBottomFade: boolean;
  heroBottomFadeAnimate: boolean;
  heroCardAura: AuraStyle;
  heroCardOpacity: number;
  heroDirty: boolean;
  heroEditorTab: HeroEditorTab;
  heroEmbedUrl: string;
  heroEnabled: boolean;
  heroFocusId: string | null;
  heroLogoPlacement: HeroLogoPlacement;
  heroLogoUrl: string;
  heroMedia: HeroMediaItem[];
  heroSaved: boolean;
  heroSoftness: number;
  heroUploading: boolean;
  heroZoomLinked: boolean;
  moveHeroMedia: (index: number, dir: -1 | 1) => void;
  removeHeroMedia: (id: string) => void;
  resetAllHeroMediaPos: () => void;
  resetHeroMediaPos: (id: string) => void;
  saveHeroMedia: () => Promise<void>;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  setDetailFx: React.Dispatch<React.SetStateAction<ProductDetailFxConfig>>;
  setDetailFxSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroBackdropEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroBlur: React.Dispatch<React.SetStateAction<number>>;
  setHeroBottomFade: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroBottomFadeAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroCardAura: React.Dispatch<React.SetStateAction<AuraStyle>>;
  setHeroCardOpacity: React.Dispatch<React.SetStateAction<number>>;
  setHeroEditorTab: React.Dispatch<React.SetStateAction<HeroEditorTab>>;
  setHeroEmbedUrl: React.Dispatch<React.SetStateAction<string>>;
  setHeroEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroFocusId: React.Dispatch<React.SetStateAction<string | null>>;
  setHeroLogoPlacement: React.Dispatch<React.SetStateAction<HeroLogoPlacement>>;
  setHeroLogoUrl: React.Dispatch<React.SetStateAction<string>>;
  setHeroMediaPos: (id: string, axis: 'pos_x' | 'pos_y', value: number) => void;
  setHeroMediaZoom: (id: string, value: number) => void;
  setHeroSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setHeroSoftness: React.Dispatch<React.SetStateAction<number>>;
  setHeroZoomLinked: React.Dispatch<React.SetStateAction<boolean>>;
  t: (ar: string, en: string) => string;
  uploadHeroFile: (file: File) => Promise<void>;
}

export default function HeroSection({
  detailFx,
  embedHeroUrl,
  heroBackdropEnabled,
  heroBlur,
  heroBottomFade,
  heroBottomFadeAnimate,
  heroCardAura,
  heroCardOpacity,
  heroDirty,
  heroEditorTab,
  heroEmbedUrl,
  heroEnabled,
  heroFocusId,
  heroLogoPlacement,
  heroLogoUrl,
  heroMedia,
  heroSaved,
  heroSoftness,
  heroUploading,
  heroZoomLinked,
  moveHeroMedia,
  removeHeroMedia,
  resetAllHeroMediaPos,
  resetHeroMediaPos,
  saveHeroMedia,
  saveMutation,
  setDetailFx,
  setDetailFxSaved,
  setHeroBackdropEnabled,
  setHeroBlur,
  setHeroBottomFade,
  setHeroBottomFadeAnimate,
  setHeroCardAura,
  setHeroCardOpacity,
  setHeroEditorTab,
  setHeroEmbedUrl,
  setHeroEnabled,
  setHeroFocusId,
  setHeroLogoPlacement,
  setHeroLogoUrl,
  setHeroMediaPos,
  setHeroMediaZoom,
  setHeroSaved,
  setHeroSoftness,
  setHeroZoomLinked,
  t,
  uploadHeroFile,
}: HeroSectionProps) {
  return (
      <section id="builder-hero" className={SECTION_SHELL} aria-labelledby="builder-hero-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
            <h3 id="builder-hero-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-info/40 bg-info/10 text-info flex items-center justify-center shrink-0">
                <Film size={15} aria-hidden />
              </span>
              {t('خلفية البطل', 'Hero backdrop')}
              <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
                {heroMedia.length}/{HERO_MEDIA_MAX}
              </span>
            </h3>
      </div>
          <button
            type="button"
            onClick={saveHeroMedia}
            disabled={!heroDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : heroSaved && !heroDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {heroSaved && !heroDirty
              ? t('تم الحفظ', 'Saved')
              : t('حفظ الخلفية', 'Save backdrop')}
          </button>
    </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر البطل', 'Hero editor')}>
          {(
            [
              { id: 'panels' as const, ar: 'اللوحات', en: 'Panels' },
              { id: 'look' as const, ar: 'المظهر', en: 'Look' },
              { id: 'welcome' as const, ar: 'الترحيب', en: 'Welcome' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={heroEditorTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                heroEditorTab === tab.id
                  ? 'border-info/40 bg-info/10 text-info'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setHeroEditorTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {heroMedia.length > 0 ? (
          <div className="hero-preview-dock sticky top-[3.25rem] z-10 rounded-lg border border-base-300 bg-base-100 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-xs font-semibold tracking-wide text-base-content/80">
                {t('معاينة حية', 'Live preview')}
              </p>
              <button
                type="button"
                className={`btn btn-ghost btn-xs ${focusRing}`}
                disabled={heroMedia.every(
                  (m) =>
                    clampHeroPos(m.pos_x) === 50 &&
                    clampHeroPos(m.pos_y) === 50 &&
                    clampHeroZoom(m.zoom) === HERO_ZOOM_DEFAULT,
                )}
                onClick={resetAllHeroMediaPos}
              >
                {t('إعادة الكل', 'Reset all')}
              </button>
            </div>
            <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden border border-base-300 bg-base-300/40">
              <HeroMediaBackdrop
                items={heroMedia}
                blur={heroBlur}
                softness={heroSoftness}
                highlightId={heroFocusId}
                previewSharp={heroEditorTab !== 'look'}
              />
            </div>
          </div>
        ) : null}

        {heroEditorTab === 'panels' ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <label
                className={`btn btn-outline btn-sm gap-1.5 ${focusRing} ${
                  heroMedia.length >= HERO_MEDIA_MAX || heroUploading ? 'btn-disabled' : ''
                }`}
              >
                {heroUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {t('رفع ملف', 'Upload file')}
                <input
                  type="file"
                  accept={HERO_ACCEPT}
                  className="hidden"
                  disabled={heroMedia.length >= HERO_MEDIA_MAX || heroUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadHeroFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <div className="flex flex-1 gap-2 min-w-0">
                <input
                  type="url"
                  value={heroEmbedUrl}
                  onChange={(e) => setHeroEmbedUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      embedHeroUrl();
                    }
                  }}
                  placeholder={t('الصق رابط صورة / GIF / فيديو…', 'Paste image / GIF / video URL…')}
                  className="input input-bordered input-sm w-full font-mono text-xs"
                  dir="ltr"
                  disabled={heroMedia.length >= HERO_MEDIA_MAX}
                  aria-label={t('رابط الوسائط', 'Media URL')}
                />
                <button
                  type="button"
                  className={`btn btn-outline btn-sm shrink-0 ${focusRing}`}
                  disabled={heroMedia.length >= HERO_MEDIA_MAX || !heroEmbedUrl.trim()}
                  onClick={embedHeroUrl}
                >
                  {t('تضمين', 'Embed')}
                </button>
              </div>
            </div>

            {heroMedia.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
                <Film size={28} className="mx-auto text-base-content/35" aria-hidden />
                <p className="text-base font-semibold tracking-tight">
                  {t('لا وسائط بعد', 'No media yet')}
                </p>
                <p className="text-sm text-base-content/65">
                  {t('يظهر التدرج الافتراضي حتى ترفع أو تضمّن.', 'Default gradient shows until you upload or embed.')}
                </p>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer w-fit rounded-lg border border-base-300 bg-base-100 px-3 py-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={heroZoomLinked}
                    onChange={(e) => setHeroZoomLinked(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-base-content/80">
                    {t('ربط التكبير بين اللوحات', 'Link zoom across panels')}
                  </span>
                </label>

                <ul className="space-y-2.5" role="list">
                  {heroMedia.map((m, i) => {
                    const px = clampHeroPos(m.pos_x);
                    const py = clampHeroPos(m.pos_y);
                    const zoom = clampHeroZoom(m.zoom);
                    const pan = heroMediaPanStyle(m);
                    const focused = heroFocusId === m.id;
                    const isDefault =
                      px === 50 && py === 50 && zoom === HERO_ZOOM_DEFAULT;
                    return (
                      <li
                        key={m.id}
                        className={`hero-panel rounded-lg border overflow-hidden transition-colors ${
                          focused
                            ? 'border-info/50 bg-info/5'
                            : 'border-base-300 bg-base-100'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2.5 p-3 cursor-pointer ${focusRing}`}
                          onClick={() => setHeroFocusId(m.id)}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setHeroFocusId(m.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="relative w-16 h-12 rounded-md overflow-hidden bg-base-300/50 shrink-0 border border-base-300">
                            {m.kind === 'video' ? (
                              <video
                                key={`thumb-v-${m.id}-${pan.transform}`}
                                src={m.url}
                                className="w-full h-full"
                                style={pan}
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                key={`thumb-i-${m.id}-${pan.transform}`}
                                src={m.url}
                                alt=""
                                className="w-full h-full"
                                style={pan}
                              />
                            )}
                            <span
                              className="absolute size-2 rounded-full bg-info ring-2 ring-base-100 pointer-events-none"
                              style={{
                                left: `${px}%`,
                                top: `${py}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              aria-hidden
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold tracking-tight truncate">
                              {m.kind === 'video' ? t('فيديو', 'Video') : t('صورة', 'Image')}
                              <span className="ms-1.5 text-xs font-medium text-base-content/55 tabular-nums">
                                {i + 1}/{heroMedia.length}
                              </span>
                            </p>
                            <p
                              className="text-xs text-base-content/55 truncate font-mono"
                              dir="ltr"
                              title={m.url}
                            >
                              {m.url}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                              disabled={i === 0}
                              onClick={() => moveHeroMedia(i, -1)}
                              aria-label={t('أعلى', 'Up')}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                              disabled={i === heroMedia.length - 1}
                              onClick={() => moveHeroMedia(i, 1)}
                              aria-label={t('أسفل', 'Down')}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                              onClick={() => removeHeroMedia(m.id)}
                              aria-label={t('حذف', 'Remove')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {focused ? (
                          <div className="border-t border-base-300 px-3 py-3 space-y-3 bg-base-200/40">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <HeroRange
                                label={t('أفقي', 'Horizontal')}
                                value={px}
                                min={0}
                                max={100}
                                onChange={(n) => setHeroMediaPos(m.id, 'pos_x', n)}
                                leftHint={t('يسار', 'Left')}
                                rightHint={t('يمين', 'Right')}
                                ariaLabel={t('موضع أفقي', 'Horizontal position')}
                              />
                              <HeroRange
                                label={t('عمودي', 'Vertical')}
                                value={py}
                                min={0}
                                max={100}
                                onChange={(n) => setHeroMediaPos(m.id, 'pos_y', n)}
                                leftHint={t('أعلى', 'Top')}
                                rightHint={t('أسفل', 'Bottom')}
                                ariaLabel={t('موضع عمودي', 'Vertical position')}
                              />
                              <div className="sm:col-span-2">
                                <HeroRange
                                  label={t('تكبير', 'Zoom')}
                                  value={zoom}
                                  min={HERO_ZOOM_MIN}
                                  max={HERO_ZOOM_MAX}
                                  onChange={(n) => setHeroMediaZoom(m.id, n)}
                                  leftHint={t('بعيد', 'Out')}
                                  rightHint={t('قريب', 'In')}
                                  linkedNote={
                                    heroZoomLinked ? t('(مرتبط)', '(linked)') : undefined
                                  }
                                  ariaLabel={t('تكبير', 'Zoom')}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className={`btn btn-ghost btn-xs ${focusRing}`}
                                disabled={isDefault}
                                onClick={() => resetHeroMediaPos(m.id)}
                              >
                                {t('إعادة للافتراضي', 'Reset to defaults')}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {heroEditorTab === 'look' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-1">
              <HeroRange
                label={t('التمويه', 'Blur')}
                value={heroBlur}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroBlur(n);
                  setHeroSaved(false);
                }}
                leftHint="0%"
                rightHint="100%"
                ariaLabel={t('تمويه الخلفية', 'Backdrop blur')}
              />
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-1">
              <HeroRange
                label={t('نعومة الحواف', 'Edge softness')}
                value={heroSoftness}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroSoftness(n);
                  setHeroSaved(false);
                }}
                leftHint={t('حاد', 'Hard')}
                rightHint={t('ناعم', 'Soft')}
                ariaLabel={t('نعومة حواف الخلفية', 'Backdrop edge softness')}
              />
            </div>
          </div>
        ) : null}

        {heroEditorTab === 'welcome' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={heroEnabled}
                  onChange={(e) => {
                    setHeroEnabled(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="text-sm font-semibold tracking-tight">
                  {t('إظهار بطاقة الترحيب', 'Show welcome card')}
                </span>
              </label>
              <p className="text-xs text-base-content/55 text-pretty ps-7 -mt-2">
                {t(
                  'إيقافها يخفي البطاقة فقط — خلفية البطل تبقى.',
                  'Off hides the card only — hero backdrop stays.',
                )}
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={heroBackdropEnabled}
                  onChange={(e) => {
                    setHeroBackdropEnabled(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="text-sm font-semibold tracking-tight">
                  {t('إظهار خلفية البطل', 'Show hero backdrop')}
                </span>
              </label>
              <p className="text-xs text-base-content/55 text-pretty ps-7 -mt-2">
                {t(
                  'إيقافها يخفي الصورة/الفيديو والغطاء — البطاقة تقدر تبقى لوحدها.',
                  'Off hides media/gradient wash — the card can stay alone.',
                )}
              </p>

              <div className="border-t border-base-300 pt-4 space-y-2">
                <p className="text-xs font-semibold tracking-wide text-base-content/80">
                  {t('أجواء داخل البطاقة', 'Atmosphere inside card')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={detailFx.pages.heroWelcome}
                    onChange={(e) => {
                      setDetailFx((p) => ({
                        ...p,
                        enabled: true,
                        pages: { ...p.pages, heroWelcome: e.target.checked },
                      }));
                      setDetailFxSaved(false);
                    }}
                  />
                  <span className="text-sm font-medium">
                    {t('تفعيل الأنماط / الجزيئات / الشعارات هنا', 'Enable patterns / particles / logos here')}
                  </span>
                </label>
                {detailFx.pages.heroWelcome ? (
                  <div className="flex flex-wrap gap-1.5 ps-7">
                    {(
                      [
                        ['grid', t('أنماط', 'Patterns'), detailFx.grid],
                        ['particles', t('جزيئات', 'Particles'), detailFx.particles],
                        ['logo', t('شعار', 'Logo'), detailFx.logo],
                      ] as const
                    ).map(([layer, layerLabel, masterOn]) => {
                      const on =
                        detailFx.chromeLayers?.heroWelcome?.[layer] ??
                        DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS[layer];
                      return (
                        <button
                          key={layer}
                          type="button"
                          disabled={!masterOn}
                          className={`btn btn-xs border ${focusRing} ${
                            on && masterOn
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/65'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => ({
                              ...p,
                              enabled: true,
                              chromeLayers: {
                                ...p.chromeLayers,
                                heroWelcome: {
                                  ...(p.chromeLayers?.heroWelcome ??
                                    DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS),
                                  [layer]: !on,
                                },
                              },
                            }));
                            setDetailFxSaved(false);
                          }}
                        >
                          {layerLabel}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <p className="text-xs text-base-content/70 text-pretty ps-7">
                  {t(
                    'احفظ أيضاً قسم «أجواء الموقع» أسفل الصفحة لتثبيت الطبقات.',
                    'Also save Site atmosphere below to persist these layers.',
                  )}
                </p>
              </div>

              <HeroRange
                label={t('شفافية البطاقة', 'Card opacity')}
                value={heroCardOpacity}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroCardOpacity(n);
                  setHeroSaved(false);
                }}
                leftHint={t('شفاف', 'Clear')}
                rightHint={t('صلب', 'Solid')}
                ariaLabel={t('شفافية بطاقة الترحيب', 'Welcome card opacity')}
              />

              <div>
                <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                  {t('هالة البطاقة', 'Card aura')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('هالة بطاقة الترحيب', 'Welcome card aura')}>
                  {AURA_STYLES.map((s) => {
                    const on = heroCardAura === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          on
                            ? 'border-info/45 bg-info/15 text-info'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={on}
                        onClick={() => {
                          setHeroCardAura(s.id);
                          setHeroSaved(false);
                        }}
                      >
                        {t(s.labelAr, s.labelEn)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                  {t('شعار البطاقة', 'Card logo')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('موضع شعار البطاقة', 'Welcome card logo placement')}>
                  {(
                    [
                      { id: 'off' as const, ar: 'إخفاء', en: 'Off' },
                      { id: 'above' as const, ar: 'فوق النص', en: 'Above text' },
                      { id: 'behind' as const, ar: 'خلف النص', en: 'Behind text' },
                    ] as const
                  ).map((opt) => {
                    const on = heroLogoPlacement === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          on
                            ? 'border-primary/40 bg-primary/10'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={on}
                        onClick={() => {
                          setHeroLogoPlacement(opt.id);
                          setHeroSaved(false);
                        }}
                      >
                        {t(opt.ar, opt.en)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {heroLogoPlacement !== 'off' ? (
                <label className="flex w-full flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('رابط صورة الشعار (اختياري)', 'Logo image URL (optional)')}
                  </span>
                  <input
                    type="url"
                    className="input input-bordered input-sm w-full font-mono text-xs"
                    value={heroLogoUrl}
                    placeholder="https://…"
                    dir="ltr"
                    onChange={(e) => {
                      setHeroLogoUrl(e.target.value.trim());
                      setHeroSaved(false);
                    }}
                    aria-label={t('رابط صورة الشعار', 'Logo image URL')}
                  />
                </label>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 checkbox-primary"
                  checked={heroBottomFade}
                  onChange={(e) => {
                    setHeroBottomFade(e.target.checked);
                    if (!e.target.checked) setHeroBottomFadeAnimate(false);
                    setHeroSaved(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t('تدرج أسفل الخلفية', 'Bottom fade')}
                  </span>
                  <span className="block text-xs text-base-content/65 mt-0.5 text-pretty">
                    {t('حجاب قصير يدمج الخلفية بالمحتوى.', 'Short veil blending hero into content.')}
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3 ${
                  heroBottomFade ? 'cursor-pointer' : 'opacity-45'
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 checkbox-primary"
                  checked={heroBottomFadeAnimate}
                  disabled={!heroBottomFade}
                  onChange={(e) => {
                    setHeroBottomFadeAnimate(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t('تحريك التدرج', 'Animate fade')}
                  </span>
                  <span className="block text-xs text-base-content/65 mt-0.5 text-pretty">
                    {t('نبض خفيف (يحترم تقليل الحركة).', 'Gentle breathe (honors reduced motion).')}
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : null}
      </section>
  );
}
