import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Check, Loader2, Save, Search, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { useSaveSiteSettings, useSiteSettings } from '../../hooks/useSiteSettings';
import {
  AURA_STYLES,
  auraWrapProps,
  DEFAULT_ELECTRIC_AURA_COLOR,
  DEFAULT_ELECTRIC_AURA_TUNE,
  ELECTRIC_CHAOS_MAX,
  ELECTRIC_CHAOS_MIN,
  ELECTRIC_SPEED_MAX,
  ELECTRIC_SPEED_MIN,
  ELECTRIC_THICKNESS_MAX,
  ELECTRIC_THICKNESS_MIN,
  electricAuraTuneEqual,
  isElectricAura,
  normalizeAuraColor,
  parseElectricAuraTune,
  serializeElectricAuraTune,
  type AuraStyle,
  type ElectricAuraTune,
} from '../../lib/productEffects';
import {
  DEFAULT_HOVER_3D_TUNE,
  HOVER_3D_TUNE_MAX,
  HOVER_3D_TUNE_MIN,
  parseProductHover3dTune,
  serializeProductHover3dTune,
  type ProductHover3dTune,
} from '../../lib/productHover3d';
import { AuraFrame } from '../ui/ElectricBorder';
import Hover3dZones from '../ui/Hover3dZones';
import { formatMoney } from '../../lib/formatMoney';

type EffectsProduct = {
  id: string;
  name: string;
  name_ar: string | null;
  thumbnail_url: string | null;
  price: number;
  status: string;
  aura_style: AuraStyle;
  aura_color: string | null;
  aura_electric: ElectricAuraTune;
  hover_3d: boolean;
};

type Draft = {
  aura_style: AuraStyle;
  aura_color: string | null;
  aura_electric: ElectricAuraTune;
  hover_3d: boolean;
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const SHELL =
  'scroll-mt-28 rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5 space-y-4';

const EMBEDDED_SHELL = 'space-y-4';

type Props = {
  /** When false, skip product fetch / focus listeners (dialog closed). Default true. */
  active?: boolean;
  /** Drop outer border/padding when nested in ProductEffectsDialog. */
  embedded?: boolean;
};

/** Product aura + Hover 3D controls (moved from Website Builder). */
export default function ProductEffectsSection({ active = true, embedded = false }: Props) {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  const saveMutation = useSaveSiteSettings();
  const queryClient = useQueryClient();

  const [products, setProducts] = useState<EffectsProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [hover3dTune, setHover3dTune] = useState<ProductHover3dTune>(() =>
    parseProductHover3dTune(settings.product_hover_3d_json),
  );
  const [hover3dTuneSaved, setHover3dTuneSaved] = useState(false);

  useEffect(() => {
    if (!settingsLoading) {
      setHover3dTune(parseProductHover3dTune(settings.product_hover_3d_json));
      setHover3dTuneSaved(false);
    }
  }, [settings.product_hover_3d_json, settingsLoading]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setProductsLoading(true);
      const { data, error: err } = await supabase
        .from('products')
        .select(
          'id, name, name_ar, thumbnail_url, price, status, aura_style, aura_color, aura_electric_json, hover_3d',
        )
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(
          err.message.includes('aura_style') ||
            err.message.includes('hover_3d') ||
            err.message.includes('aura_color') ||
            err.message.includes('aura_electric')
            ? t(
                'شغّل ترحيل products aura/hover_3d/aura_color/aura_electric_json ثم أعد التحميل.',
                'Run the products aura/hover_3d/aura_color/aura_electric_json migration, then reload.',
              )
            : err.message,
        );
        if (!opts?.silent) setProducts([]);
      } else {
        const rows: EffectsProduct[] = (data ?? []).map((p) => ({
          id: p.id as string,
          name: p.name as string,
          name_ar: (p.name_ar as string | null) ?? null,
          thumbnail_url: (p.thumbnail_url as string | null) ?? null,
          price: Number(p.price),
          status: String(p.status),
          aura_style: (p.aura_style as AuraStyle) || 'none',
          aura_color: normalizeAuraColor(p.aura_color as string | null),
          aura_electric: parseElectricAuraTune(p.aura_electric_json),
          hover_3d: Boolean(p.hover_3d),
        }));
        setProducts(rows);
        setDraft((prev) => {
          const next = { ...prev };
          for (const p of rows) {
            if (!next[p.id]) {
              next[p.id] = {
                aura_style: p.aura_style,
                aura_color: p.aura_color ?? null,
                aura_electric: p.aura_electric,
                hover_3d: p.hover_3d,
              };
            }
          }
          return next;
        });
      }
      if (!opts?.silent) setProductsLoading(false);
    };
    void load();
    const onFocus = () => void load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [active, t, tick]);

  const hover3dTuneDirty =
    serializeProductHover3dTune(hover3dTune) !==
    serializeProductHover3dTune(parseProductHover3dTune(settings.product_hover_3d_json));

  const dirtyIds = useMemo(
    () =>
      products
        .filter((p) => {
          const d = draft[p.id];
          if (!d) return false;
          return (
            d.aura_style !== p.aura_style ||
            d.hover_3d !== p.hover_3d ||
            (d.aura_color ?? null) !== (p.aura_color ?? null) ||
            !electricAuraTuneEqual(d.aura_electric, p.aura_electric)
          );
        })
        .map((p) => p.id),
    [products, draft],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.name_ar ?? '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const refreshStorefront = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  }, [queryClient]);

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
    setOkMsg('');
  };

  const saveOne = async (id: string) => {
    const d = draft[id];
    if (!d) return;
    setSavingId(id);
    setError('');
    const electric = serializeElectricAuraTune(d.aura_electric);
    const payload = {
      aura_style: d.aura_style,
      aura_color: d.aura_color,
      aura_electric_json: electric,
      hover_3d: d.hover_3d,
    };
    try {
      const { error: err } = await supabase.from('products').update(payload).eq('id', id);
      if (err) {
        setError(err.message);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('فشل الحفظ', 'Save failed'));
      return;
    } finally {
      setSavingId(null);
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              aura_style: d.aura_style,
              aura_color: d.aura_color,
              aura_electric: electric,
              hover_3d: d.hover_3d,
            }
          : p,
      ),
    );
    setOkMsg(t('تم الحفظ', 'Saved'));
    refreshStorefront();
  };

  const saveAllDirty = async () => {
    if (dirtyIds.length === 0) return;
    setBulkSaving(true);
    setError('');
    try {
      for (const id of dirtyIds) {
        const d = draft[id];
        if (!d) continue;
        const electric = serializeElectricAuraTune(d.aura_electric);
        const { error: err } = await supabase
          .from('products')
          .update({
            aura_style: d.aura_style,
            aura_color: d.aura_color,
            aura_electric_json: electric,
            hover_3d: d.hover_3d,
          })
          .eq('id', id);
        if (err) {
          setError(err.message);
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('فشل الحفظ', 'Save failed'));
      return;
    } finally {
      setBulkSaving(false);
    }
    setProducts((prev) =>
      prev.map((p) => {
        const d = draft[p.id];
        return d
          ? {
              ...p,
              aura_style: d.aura_style,
              aura_color: d.aura_color,
              aura_electric: serializeElectricAuraTune(d.aura_electric),
              hover_3d: d.hover_3d,
            }
          : p;
      }),
    );
    setOkMsg(
      t(
        `تم حفظ ${dirtyIds.length} منتج`,
        `Saved ${dirtyIds.length} product${dirtyIds.length === 1 ? '' : 's'}`,
      ),
    );
    refreshStorefront();
  };

  const setAllAura = (style: AuraStyle) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const p of products) {
        next[p.id] = {
          aura_style: style,
          aura_color: next[p.id]?.aura_color ?? p.aura_color ?? null,
          aura_electric: next[p.id]?.aura_electric ?? p.aura_electric,
          hover_3d: next[p.id]?.hover_3d ?? p.hover_3d,
        };
      }
      return next;
    });
    setOkMsg('');
  };

  const setAllHover3d = (value: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const p of products) {
        next[p.id] = {
          aura_style: next[p.id]?.aura_style ?? p.aura_style,
          aura_color: next[p.id]?.aura_color ?? p.aura_color ?? null,
          aura_electric: next[p.id]?.aura_electric ?? p.aura_electric,
          hover_3d: value,
        };
      }
      return next;
    });
    setOkMsg('');
  };

  const saveHover3dTune = async () => {
    if (!user || !hover3dTuneDirty) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { product_hover_3d_json: serializeProductHover3dTune(hover3dTune) },
        userId: user.id,
      });
      setHover3dTuneSaved(true);
      setOkMsg(t('تم حفظ إعدادات التحويم 3D', 'Hover 3D tune saved'));
    } catch (e) {
      setHover3dTuneSaved(false);
      setError(
        e instanceof Error
          ? e.message
          : t('فشل حفظ إعدادات التحويم 3D', 'Failed to save Hover 3D tune'),
      );
    }
  };

  const sectionLabel = t('تأثيرات المنتجات', 'Product effects');

  return (
    <section
      id="product-effects"
      className={embedded ? EMBEDDED_SHELL : SHELL}
      aria-labelledby={embedded ? undefined : 'product-effects-title'}
      aria-label={embedded ? sectionLabel : undefined}
    >
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
          embedded ? 'sm:justify-end' : 'sm:justify-between'
        }`}
      >
        {embedded ? null : (
          <h3
            id="product-effects-title"
            className="text-lg font-semibold tracking-tight leading-tight text-balance flex items-center gap-2"
          >
            <span className="size-8 rounded-lg border border-primary/35 bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles size={15} aria-hidden />
            </span>
            {sectionLabel}
            {dirtyIds.length > 0 ? (
              <span className="badge badge-warning badge-sm font-semibold tabular-nums">
                {dirtyIds.length}
              </span>
            ) : null}
          </h3>
        )}
        <div className="flex items-center gap-2 self-start">
          {embedded && dirtyIds.length > 0 ? (
            <span className="badge badge-warning badge-sm font-semibold tabular-nums">
              {dirtyIds.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void saveAllDirty()}
            disabled={dirtyIds.length === 0 || bulkSaving}
            className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
          >
            {bulkSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {dirtyIds.length === 0
              ? t('لا تغييرات', 'No changes')
              : t(`حفظ الكل (${dirtyIds.length})`, `Save all (${dirtyIds.length})`)}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="text-sm text-success" role="status">
          {okMsg}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-base-300 bg-base-100 p-3 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-base-content/70">
            {t('هالة للكل', 'Aura for all')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['dual', t('مزدوج', 'Dual')],
                ['rainbow', t('قوس قزح', 'Rainbow')],
                ['gold', t('ذهبي', 'Gold')],
                ['electric', t('كهربائي', 'Electric')],
                ['none', t('مسح', 'Clear')],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn btn-xs border ${focusRing} ${
                  id === 'none'
                    ? 'btn-ghost border-base-300 text-base-content/70'
                    : 'btn-outline border-warning/35'
                }`}
                onClick={() => setAllAura(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-base-300 bg-base-100 p-3 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-base-content/70">
            {t('تحويم 3D للكل', 'Hover 3D for all')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`btn btn-xs btn-outline border-info/40 ${focusRing}`}
              onClick={() => setAllHover3d(true)}
            >
              {t('تفعيل الكل', 'Enable all')}
            </button>
            <button
              type="button"
              className={`btn btn-xs btn-ghost border border-base-300 ${focusRing}`}
              onClick={() => setAllHover3d(false)}
            >
              {t('إلغاء الكل', 'Clear all')}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-info/35 bg-base-100 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">
              {t('ضبط التحويم 3D', 'Hover 3D tune')}
            </p>
            <p className="text-xs text-base-content/65 text-pretty">
              {t(
                'للكل — يميل البطاقة كاملة (صورة + نص + زر).',
                'Global — tilts the whole card (image + body + CTA).',
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`btn btn-ghost btn-xs ${focusRing}`}
              onClick={() => {
                setHover3dTune({ ...DEFAULT_HOVER_3D_TUNE });
                setHover3dTuneSaved(false);
              }}
            >
              {t('افتراضي', 'Defaults')}
            </button>
            <button
              type="button"
              className={`btn btn-primary btn-xs gap-1 ${focusRing}`}
              disabled={!hover3dTuneDirty || saveMutation.isPending}
              onClick={() => void saveHover3dTune()}
            >
              {saveMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : hover3dTuneSaved && !hover3dTuneDirty ? (
                <Check size={12} />
              ) : (
                <Save size={12} />
              )}
              {hover3dTuneSaved && !hover3dTuneDirty
                ? t('تم الحفظ', 'Saved')
                : t('حفظ الضبط', 'Save tune')}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              {
                key: 'motion' as const,
                label: t('الحركة', 'Motion'),
                left: t('خفيف', 'Soft'),
                right: t('قوي', 'Strong'),
              },
              {
                key: 'speed' as const,
                label: t('السرعة', 'Speed'),
                left: t('بطيء', 'Slow'),
                right: t('سريع', 'Fast'),
              },
              {
                key: 'smooth' as const,
                label: t('النعومة', 'Smooth'),
                left: t('حاد', 'Sharp'),
                right: t('ناعم', 'Soft settle'),
              },
            ] as const
          ).map((row) => (
            <label key={row.key} className="flex w-full flex-col gap-1.5">
              <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
                <span>{row.label}</span>
                <span className="tabular-nums text-base-content/65">{hover3dTune[row.key]}</span>
              </span>
              <input
                type="range"
                min={HOVER_3D_TUNE_MIN}
                max={HOVER_3D_TUNE_MAX}
                value={hover3dTune[row.key]}
                onInput={(e) => {
                  const n = Number((e.target as HTMLInputElement).value);
                  setHover3dTune((prev) => ({ ...prev, [row.key]: n }));
                  setHover3dTuneSaved(false);
                }}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setHover3dTune((prev) => ({ ...prev, [row.key]: n }));
                  setHover3dTuneSaved(false);
                }}
                className="range range-primary range-xs"
                aria-label={row.label}
              />
              <span className="flex justify-between text-xs text-base-content/55">
                <span>{row.left}</span>
                <span>{row.right}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-3 py-2 max-w-md">
        <Search size={14} className="text-base-content/50 shrink-0" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="grow bg-transparent text-sm outline-none placeholder:text-base-content/45"
          placeholder={t('بحث عن منتج…', 'Search products…')}
          aria-label={t('بحث عن منتج', 'Search products')}
        />
        {search ? (
          <button
            type="button"
            className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
            onClick={() => setSearch('')}
            aria-label={t('مسح', 'Clear')}
          >
            <X size={12} />
          </button>
        ) : null}
        <button
          type="button"
          className={`btn btn-ghost btn-xs ${focusRing}`}
          onClick={() => setTick((n) => n + 1)}
          aria-label={t('تحديث', 'Refresh')}
        >
          {t('تحديث', 'Refresh')}
        </button>
      </label>

      {productsLoading ? (
        <div className="flex justify-center py-12" role="status">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
          <Box size={28} className="mx-auto text-base-content/35" aria-hidden />
          <p className="text-base font-semibold tracking-tight">
            {search.trim()
              ? t('لا نتائج', 'No matches')
              : t('لا توجد منتجات', 'No products')}
          </p>
          {!search.trim() ? (
            <Link to="/dashboard/products/new" className={`btn btn-primary btn-sm ${focusRing}`}>
              {t('إضافة منتج', 'Add product')}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2.5" role="list">
          {filtered.map((p) => {
            const d = draft[p.id] ?? {
              aura_style: p.aura_style,
              aura_color: p.aura_color ?? null,
              aura_electric: p.aura_electric,
              hover_3d: p.hover_3d,
            };
            const name = lang === 'ar' && p.name_ar ? p.name_ar : p.name;
            const dirty =
              d.aura_style !== p.aura_style ||
              d.hover_3d !== p.hover_3d ||
              (d.aura_color ?? null) !== (p.aura_color ?? null) ||
              !electricAuraTuneEqual(d.aura_electric, p.aura_electric);
            const previewAura = auraWrapProps(d.aura_style, d.aura_color);
            const electricPreview = isElectricAura(previewAura.className);
            const electricColor = d.aura_color ?? DEFAULT_ELECTRIC_AURA_COLOR;
            const thumb = (
              <div
                className={`effect-preview-thumb w-20 h-[3.75rem] rounded-lg bg-base-200 shrink-0${
                  electricPreview ? ' effect-preview-thumb--electric' : ' overflow-hidden'
                }${previewAura.className ? '' : ' border border-base-300'}`}
              >
                {p.thumbnail_url ? (
                  <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base-content/40">
                    <Box size={16} />
                  </div>
                )}
              </div>
            );

            return (
              <li
                key={p.id}
                className={`effect-card rounded-lg border p-3 sm:p-4 space-y-3 transition-colors ${
                  dirty ? 'border-warning/45 bg-warning/5' : 'border-base-300 bg-base-100'
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <AuraFrame
                    className={previewAura.className || undefined}
                    style={previewAura.style}
                    color={d.aura_color}
                    electric={d.aura_electric}
                  >
                    {d.hover_3d ? (
                      <div className="hover-3d is-blink-safe">
                        {thumb}
                        <Hover3dZones />
                      </div>
                    ) : (
                      thumb
                    )}
                  </AuraFrame>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold tracking-tight truncate leading-snug">
                      {name}
                    </p>
                    <p className="text-sm text-base-content/65 tabular-nums">{formatMoney(p.price)}</p>
                    <span
                      className={`badge badge-sm badge-outline font-semibold tracking-wide ${
                        p.status === 'active'
                          ? 'badge-success'
                          : p.status === 'inactive'
                            ? 'badge-ghost'
                            : 'badge-warning'
                      }`}
                    >
                      {p.status === 'active'
                        ? t('نشط', 'Active')
                        : p.status === 'inactive'
                          ? t('غير نشط', 'Inactive')
                          : t('مسودة', 'Draft')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveOne(p.id)}
                    disabled={!dirty || savingId === p.id || bulkSaving}
                    className={`btn btn-sm gap-1 ${focusRing} ${
                      dirty ? 'btn-primary' : 'btn-ghost border border-base-300'
                    }`}
                  >
                    {savingId === p.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    {t('حفظ', 'Save')}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-base-content/70 mb-1.5">
                      {t('الهالة', 'Aura')}
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('الهالة', 'Aura')}>
                      {AURA_STYLES.map((s) => {
                        const on = d.aura_style === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`btn btn-xs border ${focusRing} ${
                              on
                                ? 'border-warning/45 bg-warning/15 text-warning'
                                : 'btn-ghost border-base-300 text-base-content/70'
                            }`}
                            aria-pressed={on}
                            onClick={() => patchDraft(p.id, { aura_style: s.id })}
                          >
                            {t(s.labelAr, s.labelEn)}
                          </button>
                        );
                      })}
                    </div>
                    {d.aura_style === 'electric' ? (
                      <div className="mt-2.5 rounded-lg border border-warning/35 bg-base-200/60 p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold tracking-wide text-base-content/80">
                            {t('ضبط الكهربائي', 'Electric tune')}
                          </p>
                          <button
                            type="button"
                            className={`btn btn-ghost btn-xs ${focusRing}`}
                            onClick={() =>
                              patchDraft(p.id, {
                                aura_color: DEFAULT_ELECTRIC_AURA_COLOR,
                                aura_electric: { ...DEFAULT_ELECTRIC_AURA_TUNE },
                              })
                            }
                          >
                            {t('افتراضي', 'Defaults')}
                          </button>
                        </div>
                        <label className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold tracking-wide text-base-content/80 shrink-0">
                            {t('اللون', 'Color')}
                          </span>
                          <input
                            type="color"
                            value={electricColor}
                            onChange={(e) =>
                              patchDraft(p.id, {
                                aura_color: normalizeAuraColor(e.target.value),
                              })
                            }
                            className={`h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent p-0.5 ${focusRing}`}
                            aria-label={t('لون الهالة الكهربائية', 'Electric aura color')}
                          />
                          <input
                            type="text"
                            value={electricColor}
                            onChange={(e) => {
                              const next = normalizeAuraColor(e.target.value);
                              if (next) patchDraft(p.id, { aura_color: next });
                            }}
                            className={`input input-bordered input-xs w-[7.5rem] font-mono tabular-nums ${focusRing}`}
                            spellCheck={false}
                            aria-label={t('رمز لون الهالة', 'Aura color hex')}
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {(
                            [
                              {
                                key: 'speed' as const,
                                label: t('السرعة', 'Speed'),
                                left: t('بطيء', 'Slow'),
                                right: t('سريع', 'Fast'),
                                min: ELECTRIC_SPEED_MIN,
                                max: ELECTRIC_SPEED_MAX,
                                step: 0.05,
                              },
                              {
                                key: 'chaos' as const,
                                label: t('الفوضى', 'Chaos'),
                                left: t('هادئ', 'Calm'),
                                right: t('حاد', 'Wild'),
                                min: ELECTRIC_CHAOS_MIN,
                                max: ELECTRIC_CHAOS_MAX,
                                step: 0.01,
                              },
                              {
                                key: 'thickness' as const,
                                label: t('السماكة', 'Thickness'),
                                left: t('رفيع', 'Thin'),
                                right: t('سميك', 'Thick'),
                                min: ELECTRIC_THICKNESS_MIN,
                                max: ELECTRIC_THICKNESS_MAX,
                                step: 0.1,
                              },
                            ] as const
                          ).map((row) => (
                            <label key={row.key} className="flex w-full flex-col gap-1.5">
                              <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
                                <span>{row.label}</span>
                                <span className="tabular-nums text-base-content/65">
                                  {d.aura_electric[row.key].toFixed(2)}
                                </span>
                              </span>
                              <input
                                type="range"
                                min={row.min}
                                max={row.max}
                                step={row.step}
                                value={d.aura_electric[row.key]}
                                onInput={(e) => {
                                  const n = Number((e.target as HTMLInputElement).value);
                                  patchDraft(p.id, {
                                    aura_electric: parseElectricAuraTune({
                                      ...d.aura_electric,
                                      [row.key]: n,
                                    }),
                                  });
                                }}
                                onChange={(e) => {
                                  const n = Number(e.target.value);
                                  patchDraft(p.id, {
                                    aura_electric: parseElectricAuraTune({
                                      ...d.aura_electric,
                                      [row.key]: n,
                                    }),
                                  });
                                }}
                                className="range range-warning range-xs"
                                aria-label={row.label}
                              />
                              <span className="flex justify-between text-xs text-base-content/55">
                                <span>{row.left}</span>
                                <span>{row.right}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-base-content/70 mb-1.5">
                      {t('تحويم ثلاثي الأبعاد', 'Hover 3D')}
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="group">
                      <button
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          d.hover_3d
                            ? 'border-info/45 bg-info/15 text-info'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={d.hover_3d}
                        onClick={() => patchDraft(p.id, { hover_3d: true })}
                      >
                        {t('تفعيل', 'Enable')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          !d.hover_3d
                            ? 'border-base-content/25 bg-base-200'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={!d.hover_3d}
                        onClick={() => patchDraft(p.id, { hover_3d: false })}
                      >
                        {t('تعطيل', 'Disable')}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
