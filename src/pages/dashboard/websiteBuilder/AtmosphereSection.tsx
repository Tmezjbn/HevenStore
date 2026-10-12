import { Save, Loader2, Check, ImagePlus, Trash2, Orbit } from 'lucide-react';
import { DEFAULT_PRODUCT_DETAIL_FX, DEFAULT_ATMOSPHERE_PAGES, DEFAULT_ATMOSPHERE_LOGO_IDS, type ProductDetailFxConfig, type AtmospherePageKey, type AtmosphereRouteKey, type AtmospherePatternId, clampAtmospherePatterns, ATMOSPHERE_ROUTE_KEYS, DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS, defaultAtmospherePageLayers, type SiteSettingsMap } from '../../../lib/siteSettings';
import { ATMOSPHERE_LOGO_CATALOG, atmosphereLogoToneClass } from '../../../lib/atmosphereLogos';
import { type UseMutationResult } from '@tanstack/react-query';
import { focusRing, SECTION_SHELL, SECTION_TITLE, type AtmosphereEditorTab } from './constants';

interface AtmosphereSectionProps {
  atmosphereTab: AtmosphereEditorTab;
  detailFx: ProductDetailFxConfig;
  detailFxDirty: boolean;
  detailFxSaved: boolean;
  embedAtmosphereLogoUrl: () => void;
  logoEmbedUrl: string;
  logoPickerOpen: boolean;
  logoUploading: boolean;
  saveDetailFx: () => Promise<void>;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  setAtmosphereTab: React.Dispatch<React.SetStateAction<AtmosphereEditorTab>>;
  setDetailFx: React.Dispatch<React.SetStateAction<ProductDetailFxConfig>>;
  setDetailFxSaved: React.Dispatch<React.SetStateAction<boolean>>;
  setLogoEmbedUrl: React.Dispatch<React.SetStateAction<string>>;
  setLogoPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  t: (ar: string, en: string) => string;
  uploadAtmosphereLogo: (file: File) => Promise<void>;
}

export default function AtmosphereSection({
  atmosphereTab,
  detailFx,
  detailFxDirty,
  detailFxSaved,
  embedAtmosphereLogoUrl,
  logoEmbedUrl,
  logoPickerOpen,
  logoUploading,
  saveDetailFx,
  saveMutation,
  setAtmosphereTab,
  setDetailFx,
  setDetailFxSaved,
  setLogoEmbedUrl,
  setLogoPickerOpen,
  t,
  uploadAtmosphereLogo,
}: AtmosphereSectionProps) {
  return (
      <section id="builder-atmosphere" className={SECTION_SHELL} aria-labelledby="builder-atmosphere-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h3 id="builder-atmosphere-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-success/40 bg-success/10 text-success flex items-center justify-center shrink-0">
                <Orbit size={15} aria-hidden />
              </span>
              {t('أجواء الموقع', 'Site atmosphere')}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-base-300 bg-base-100 px-3 py-1.5">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={detailFx.enabled}
                onChange={(e) => {
                  setDetailFx((p) => ({ ...p, enabled: e.target.checked }));
                  setDetailFxSaved(false);
                }}
              />
              <span className="text-sm font-semibold tracking-tight">
                {detailFx.enabled ? t('مفعّل', 'On') : t('متوقف', 'Off')}
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setDetailFx({
                  ...DEFAULT_PRODUCT_DETAIL_FX,
                  pages: { ...DEFAULT_ATMOSPHERE_PAGES },
                  pageLayers: defaultAtmospherePageLayers(),
                  logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
                  customLogos: [],
                });
                setDetailFxSaved(false);
              }}
            >
              {t('إعادة الافتراضي', 'Reset defaults')}
            </button>
            <button
              type="button"
              onClick={saveDetailFx}
              disabled={!detailFxDirty || saveMutation.isPending}
              className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : detailFxSaved && !detailFxDirty ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {detailFxSaved && !detailFxDirty
                ? t('تم الحفظ', 'Saved')
                : t('حفظ الأجواء', 'Save atmosphere')}
            </button>
          </div>
        </div>

        {!detailFx.enabled ? (
          <p
            role="status"
            className="text-sm text-warning rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-pretty"
          >
            {t('موقوف — فعّل ثم احفظ ليظهر في المتجر.', 'Off — enable, then save to show in the store.')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر الأجواء', 'Atmosphere editor')}>
          {(
            [
              { id: 'pages' as const, ar: 'الصفحات', en: 'Pages' },
              { id: 'layers' as const, ar: 'الطبقات', en: 'Layers' },
              { id: 'tune' as const, ar: 'الضبط', en: 'Tune' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={atmosphereTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                atmosphereTab === tab.id
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setAtmosphereTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {atmosphereTab === 'pages' ? (
          <div className="space-y-3">
            <p className="text-sm text-base-content/65 text-pretty">
              {t(
                'فعّل صفحة، ثم طبقات الأنماط / الجزيئات / الشعار لها.',
                'Enable a page, then its Patterns / Particles / Logo layers.',
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['home', t('الرئيسية', 'Home')],
                  ['store', t('تصفح المتجر', 'Explore Store')],
                  ['subscriptions', t('الاشتراكات', 'Subscriptions')],
                  ['giftCards', t('بطاقات الهدايا', 'Gift Cards')],
                  ['product', t('صفحة المنتج', 'Product page')],
                  ['seller', t('صفحة البائع', 'Seller page')],
                  ['cart', t('السلة', 'Cart')],
                  ['checkout', t('الدفع', 'Checkout')],
                  ['wishlist', t('المفضلة', 'Wishlist')],
                  ['about', t('عنّا / قانوني', 'About / legal')],
                  ['other', t('أخرى', 'Other')],
                  ['heroWelcome', t('بطاقة الترحيب', 'Welcome card')],
                  ['footer', t('التذييل (شفاف)', 'Footer (see-through)')],
                  ['drawer', t('الدرج (شفاف)', 'Drawer (see-through)')],
                ] as const satisfies ReadonlyArray<readonly [AtmospherePageKey, string]>
              ).map(([key, label]) => {
                const isChrome = key === 'footer' || key === 'drawer' || key === 'heroWelcome';
                const routeKey = key as AtmosphereRouteKey;
                const pageOn = detailFx.pages[key];
                const layers =
                  !isChrome && ATMOSPHERE_ROUTE_KEYS.includes(routeKey)
                    ? (detailFx.pageLayers[routeKey] ?? DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS)
                    : key === 'heroWelcome'
                      ? (detailFx.chromeLayers?.heroWelcome ??
                        DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS)
                      : null;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border px-3 py-2.5 space-y-2 transition-colors ${
                      pageOn
                        ? 'border-success/40 bg-success/5'
                        : 'border-base-300 bg-base-100'
                    } ${isChrome ? 'sm:col-span-2 lg:col-span-3' : ''}`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={pageOn}
                        onChange={(e) => {
                          setDetailFx((p) => ({
                            ...p,
                            enabled: true,
                            pages: { ...p.pages, [key]: e.target.checked },
                          }));
                          setDetailFxSaved(false);
                        }}
                      />
                      <span className="text-sm font-semibold tracking-tight">{label}</span>
                    </label>
                    {layers && pageOn ? (
                      <div className="flex flex-wrap gap-1.5 ps-7">
                        {(
                          [
                            ['grid', t('أنماط', 'Patterns'), detailFx.grid],
                            ['particles', t('جزيئات', 'Particles'), detailFx.particles],
                            ['logo', t('شعار', 'Logo'), detailFx.logo],
                          ] as const
                        ).map(([layer, layerLabel, masterOn]) => {
                          const on = layers[layer];
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
                                if (key === 'heroWelcome') {
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
                                } else {
                                  setDetailFx((p) => ({
                                    ...p,
                                    enabled: true,
                                    pageLayers: {
                                      ...p.pageLayers,
                                      [routeKey]: {
                                        ...(p.pageLayers[routeKey] ??
                                          DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS),
                                        [layer]: !on,
                                      },
                                    },
                                  }));
                                }
                                setDetailFxSaved(false);
                              }}
                            >
                              {layerLabel}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {atmosphereTab === 'layers' ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['grid', t('الأنماط', 'Patterns'), detailFx.grid],
                  ['particles', t('الجزيئات', 'Particles'), detailFx.particles],
                  ['logo', t('شعار اللعبة', 'Game logo'), detailFx.logo],
                ] as const
              ).map(([key, label, on]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm justify-between border gap-2 ${focusRing} ${
                    on
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'btn-ghost border-base-300'
                  }`}
                  aria-pressed={on}
                  onClick={() => {
                    if (key === 'logo') {
                      const next = !on;
                      setDetailFx((p) => ({ ...p, logo: next, enabled: true }));
                      setLogoPickerOpen(next);
                    } else {
                      setDetailFx((p) => ({ ...p, [key]: !on, enabled: true }));
                    }
                    setDetailFxSaved(false);
                  }}
                >
                  <span className="font-semibold tracking-tight">{label}</span>
                  {key === 'logo' ? (
                    <span className="badge badge-ghost badge-sm tabular-nums font-semibold">
                      {detailFx.logoIds.length}
                    </span>
                  ) : on ? (
                    <Check size={14} aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>

            {detailFx.grid ? (
              <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                    {t('أنواع الأنماط', 'Pattern types')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['lines', t('شبكة', 'Lines')],
                        ['dots', t('نقاط', 'Dots')],
                        ['diagonal', t('مائل', 'Diagonal')],
                        ['cross', t('تقاطع', 'Cross')],
                        ['plus', t('صلبان', 'Plus')],
                      ] as const satisfies ReadonlyArray<readonly [AtmospherePatternId, string]>
                    ).map(([id, label]) => {
                      const on = detailFx.patterns.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`btn btn-xs border ${focusRing} ${
                            on
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/70'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => {
                              const next = on
                                ? p.patterns.filter((x) => x !== id)
                                : [...p.patterns, id];
                              return {
                                ...p,
                                enabled: true,
                                grid: true,
                                patterns: clampAtmospherePatterns(
                                  next.length > 0 ? next : ['lines'],
                                ),
                              };
                            });
                            setDetailFxSaved(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                    {t('موضع النمط', 'Pattern position')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['behind', t('خلف المحتوى', 'Behind content')],
                        ['above', t('فوق كل شيء', 'Above everything')],
                      ] as const
                    ).map(([id, label]) => {
                      const on =
                        id === 'behind'
                          ? detailFx.patternLayer === 'behind'
                          : detailFx.patternLayer !== 'behind';
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`btn btn-xs border ${focusRing} ${
                            on
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/70'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => ({
                              ...p,
                              enabled: true,
                              patternLayer: id,
                            }));
                            setDetailFxSaved(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {detailFx.logo ? (
              <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('شعارات الأجواء', 'Atmosphere logos')}
                  </p>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs ${focusRing}`}
                    onClick={() => setLogoPickerOpen((o) => !o)}
                  >
                    {logoPickerOpen ? t('إخفاء القائمة', 'Hide list') : t('إظهار القائمة', 'Show list')}
                  </button>
                </div>

                {logoPickerOpen ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <label className={`btn btn-outline btn-xs gap-1 ${focusRing}`}>
                        {logoUploading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ImagePlus size={12} />
                        )}
                        {t('رفع شعار', 'Upload logo')}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadAtmosphereLogo(file);
                          }}
                        />
                      </label>
                      <div className="flex flex-1 gap-1 min-w-[12rem]">
                        <input
                          type="url"
                          className="input input-bordered input-xs flex-1 font-mono"
                          placeholder="https://…/logo.png"
                          value={logoEmbedUrl}
                          aria-label={t('رابط صورة الشعار', 'Logo image URL')}
                          dir="ltr"
                          onChange={(e) => setLogoEmbedUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              embedAtmosphereLogoUrl();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={`btn btn-xs btn-primary ${focusRing}`}
                          onClick={embedAtmosphereLogoUrl}
                        >
                          {t('إضافة', 'Add')}
                        </button>
                      </div>
                    </div>

                    {detailFx.customLogos.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-base-content/70">
                          {t('شعاراتك', 'Your logos')}
                        </p>
                        <ul className="max-h-40 overflow-y-auto rounded-lg border border-base-300 divide-y divide-base-300">
                          {detailFx.customLogos.map((entry) => {
                            const on = detailFx.logoIds.includes(entry.id);
                            return (
                              <li
                                key={entry.id}
                                className={`flex items-center gap-2 px-2 py-1.5 ${on ? 'bg-success/5' : ''}`}
                              >
                                <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-xs checkbox-primary"
                                    checked={on}
                                    onChange={() => {
                                      setDetailFx((p) => {
                                        const next = on
                                          ? p.logoIds.filter((id) => id !== entry.id)
                                          : [...p.logoIds, entry.id];
                                        const fallback =
                                          p.customLogos.length > 0
                                            ? p.customLogos.map((c) => c.id)
                                            : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                        return {
                                          ...p,
                                          enabled: true,
                                          logo: true,
                                          logoIds: next.length > 0 ? next : fallback,
                                        };
                                      });
                                      setDetailFxSaved(false);
                                    }}
                                  />
                                  <img
                                    src={entry.src}
                                    alt=""
                                    className={`w-5 h-5 object-contain ${atmosphereLogoToneClass(entry)}`}
                                  />
                                  <span className="text-sm truncate">
                                    {t(entry.labelAr, entry.labelEn)}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  className={`btn btn-ghost btn-xs text-error ${focusRing}`}
                                  aria-label={t('حذف', 'Remove')}
                                  onClick={() => {
                                    setDetailFx((p) => {
                                      const customLogos = p.customLogos.filter((c) => c.id !== entry.id);
                                      const logoIds = p.logoIds.filter((id) => id !== entry.id);
                                      const fallback =
                                        customLogos.length > 0
                                          ? customLogos.map((c) => c.id)
                                          : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                      return {
                                        ...p,
                                        customLogos,
                                        logoIds: logoIds.length > 0 ? logoIds : fallback,
                                      };
                                    });
                                    setDetailFxSaved(false);
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-base-content/70">
                        {t('أيقونات هندسية', 'Stylized icons')}
                      </p>
                      <ul className="max-h-48 overflow-y-auto rounded-lg border border-base-300 divide-y divide-base-300">
                        {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                          const on = detailFx.logoIds.includes(entry.id);
                          return (
                            <li key={entry.id}>
                              <label
                                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer ${
                                  on ? 'bg-success/5' : 'hover:bg-base-200/70'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs checkbox-primary"
                                  checked={on}
                                  onChange={() => {
                                    setDetailFx((p) => {
                                      const next = on
                                        ? p.logoIds.filter((id) => id !== entry.id)
                                        : [...p.logoIds, entry.id];
                                      const fallback =
                                        p.customLogos.length > 0
                                          ? p.customLogos.map((c) => c.id)
                                          : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                      return {
                                        ...p,
                                        enabled: true,
                                        logo: true,
                                        logoIds: next.length > 0 ? next : fallback,
                                      };
                                    });
                                    setDetailFxSaved(false);
                                  }}
                                />
                                <img
                                  src={entry.src}
                                  alt=""
                                  className={`w-5 h-5 object-contain opacity-80 ${atmosphereLogoToneClass(entry)}`}
                                />
                                <span className="text-sm">{t(entry.labelAr, entry.labelEn)}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/65">
                    {t(
                      `${detailFx.logoIds.length} شعار مختار — أظهر القائمة للتعديل.`,
                      `${detailFx.logoIds.length} logos selected — show list to edit.`,
                    )}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {atmosphereTab === 'tune' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['gridOpacity', t('شفافية الأنماط', 'Pattern opacity'), 0, 100, !detailFx.grid],
                ['particleOpacity', t('شفافية الجزيئات', 'Particle opacity'), 0, 100, !detailFx.particles],
                ['logoOpacity', t('شفافية الشعار', 'Logo opacity'), 0, 100, !detailFx.logo],
                ['particleCount', t('عدد الجزيئات', 'Particle count'), 8, 64, !detailFx.particles],
                ['logoCount', t('عدد الشعارات', 'Logo count'), 1, 12, !detailFx.logo],
                ['gridSize', t('كثافة الشبكة', 'Pattern density'), 25, 250, !detailFx.grid],
                ['particleSize', t('حجم الجزيئات', 'Particle size'), 25, 250, !detailFx.particles],
                ['logoSize', t('حجم الشعار', 'Logo size'), 25, 250, !detailFx.logo],
                ['particleSpeed', t('سرعة الجزيئات', 'Particle speed'), 25, 250, !detailFx.particles],
                ['logoSpeed', t('سرعة الشعار', 'Logo speed'), 25, 250, !detailFx.logo],
              ] as const
            ).map(([key, label, min, max, disabled]) => (
              <div
                key={key}
                className={`rounded-lg border border-base-300 bg-base-100 p-3 ${
                  disabled ? 'opacity-45' : ''
                }`}
              >
                <label className="flex w-full flex-col gap-1.5">
                  <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
                    <span>{label}</span>
                    <span className="tabular-nums text-base-content/65">
                      {key === 'gridSize'
                        ? t(
                            `${detailFx.gridSize}%`,
                            `${detailFx.gridSize}%`,
                          )
                        : key === 'particleCount' || key === 'logoCount'
                          ? detailFx[key]
                          : `${detailFx[key]}%`}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={key.endsWith('Size') || key.endsWith('Speed') || key === 'gridSize' ? 5 : 1}
                    className="range range-xs range-primary"
                    value={detailFx[key]}
                    disabled={disabled}
                    onChange={(e) => {
                      setDetailFx((p) => ({
                        ...p,
                        [key]: Number(e.target.value),
                        enabled: true,
                      }));
                      setDetailFxSaved(false);
                    }}
                    aria-label={label}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </section>
  );
}
