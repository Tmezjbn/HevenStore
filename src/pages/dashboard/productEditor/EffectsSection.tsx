import { type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { Sparkles } from 'lucide-react';
import { CARD_FX_STYLES, normalizeCardFx, DEFAULT_CARD_FX_COLOR, DEFAULT_CARD_FX_COLOR2, DEFAULT_CARD_FX_COLOR3, DEFAULT_GLITCH_SPEED, GLITCH_SPEED_MIN, GLITCH_SPEED_MAX, DEFAULT_GLITCH_CHARS, DEFAULT_MATRIX_COLS, MATRIX_COLS_MIN, MATRIX_COLS_MAX, DEFAULT_MATRIX_LETTERS, MATRIX_LETTERS_MIN, MATRIX_LETTERS_MAX, DEFAULT_MATRIX_SPEED, MATRIX_SPEED_MIN, MATRIX_SPEED_MAX } from '../../../lib/productCardFx';
import ProductCardBodyFx from '../../../components/ui/ProductCardBodyFx';
import { ATMOSPHERE_LOGO_CATALOG, atmosphereLogoToneClass } from '../../../lib/atmosphereLogos';
import { ProductForm } from './formModel';

type EffectsSectionProps = {
  form: ProductForm;
  t: (ar: string, en: string) => string;
  summaryName: string;
  setForm: Dispatch<SetStateAction<ProductForm>>;
};

export default function EffectsSection({
  form,
  t,
  summaryName,
  setForm,
}: EffectsSectionProps) {
  return (
    <>
            <details id="pe-fx" className="pe-fx group">
              <summary className="pe-fx__summary">
                <span className="pe-fx__summary-main">
                  <span
                    className={`pe-fx__icon pe-fx__icon--${form.card_fx.style}`}
                    style={
                      form.card_fx.style !== 'none' && form.card_fx.color
                        ? ({
                            ['--pe-fx-icon-tint' as string]: form.card_fx.color,
                          } as CSSProperties)
                        : undefined
                    }
                    aria-hidden
                  >
                    {form.card_fx.style === 'matrix' ? (
                      <span className="pe-fx__icon-matrix">
                        {Array.from({ length: 3 }, (_, i) => (
                          <span
                            key={i}
                            className="pe-fx__icon-matrix-col"
                            style={{ ['--i' as string]: i }}
                          >
                            <span className="pe-fx__icon-matrix-stack">01ｱｲ</span>
                            <span className="pe-fx__icon-matrix-stack" aria-hidden>
                              01ｱｲ
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <Sparkles size={15} strokeWidth={2.4} />
                    )}
                  </span>
                  <span className="pe-fx__title">{t('تأثير جسم البطاقة', 'Card body effect')}</span>
                </span>
                <span className="pe-fx__summary-meta">
                  {(() => {
                    const s = CARD_FX_STYLES.find((x) => x.id === form.card_fx.style);
                    return s ? t(s.labelAr, s.labelEn) : t('بدون', 'None');
                  })()}
                </span>
              </summary>
              <div className="pe-fx__body">
                <p className="pe-fx__hint text-pretty">
                  {t(
                    'خلف العنوان والسعر في بطاقة المتجر — ماتريكس، شعار، خطوط مسح، لمعان، جمرات، أو شق.',
                    'Behind title and price on the storefront card — matrix, logo, scanlines, sheen, embers, or rift.',
                  )}
                </p>

                <div
                  className="pe-fx__stage"
                  style={
                    form.card_fx.style !== 'none' && form.card_fx.color
                      ? ({ ['--pe-fx-tint']: form.card_fx.color } as CSSProperties)
                      : undefined
                  }
                  data-fx={form.card_fx.style}
                  aria-hidden
                >
                  {form.card_fx.style !== 'none' ? (
                    <ProductCardBodyFx fx={form.card_fx} />
                  ) : null}
                  <div className="pe-fx__stage-copy">
                    <p className="pe-fx__stage-name">{summaryName}</p>
                    <p className="pe-fx__stage-price tabular-nums">
                      {form.price.trim() ? `$${form.price}` : '—'}
                    </p>
                  </div>
                </div>

                <div className="pe-fx__styles" role="radiogroup" aria-label={t('النوع', 'Style')}>
                  {CARD_FX_STYLES.map((s) => {
                    const active = form.card_fx.style === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`pe-fx__style${active ? ' is-active' : ''} pe-fx__style--${s.id}`}
                        onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        card_fx: normalizeCardFx({
                          ...prev.card_fx,
                              style: s.id,
                          color: prev.card_fx.color ?? DEFAULT_CARD_FX_COLOR,
                          logoId: prev.card_fx.logoId ?? 'fortnite',
                        }),
                          }))
                        }
                      >
                        <span className="pe-fx__style-swatch" aria-hidden>
                          {s.id === 'matrix' ? (
                            <span className="pe-fx__swatch-matrix">
                              {Array.from({ length: 6 }, (_, i) => (
                                <span
                                  key={i}
                                  className="pe-fx__swatch-matrix-col"
                                  style={{ ['--i' as string]: i }}
                                >
                                  <span className="pe-fx__swatch-matrix-stack">01ｱｲｳｴｵ</span>
                                  <span className="pe-fx__swatch-matrix-stack" aria-hidden>
                                    01ｱｲｳｴｵ
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        <span className="pe-fx__style-label">{t(s.labelAr, s.labelEn)}</span>
                      </button>
                    );
                  })}
                </div>

                {form.card_fx.style === 'matrix' ? (
                  <div className="pe-fx__matrix-opts space-y-3">
                    <div
                      className="pe-fx__matrix-dir"
                      role="radiogroup"
                      aria-label={t('نوع الماتريكس', 'Matrix type')}
                    >
                      <span className="pe-field__label">{t('نوع الماتريكس', 'Matrix type')}</span>
                      <div className="pe-fx__matrix-dir-btns">
                        {(
                          [
                            {
                              id: 1 as const,
                              ar: '١ — خفيف',
                              en: '1 — Light',
                            },
                            {
                              id: 2 as const,
                              ar: '٢ — غني',
                              en: '2 — Rich',
                            },
                            {
                              id: 3 as const,
                              ar: '٣ — جليتش',
                              en: '3 — Glitch',
                            },
                          ] as const
                        ).map((opt) => {
                          const active = (form.card_fx.matrixType ?? 1) === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              className={`pe-fx__matrix-dir-btn${active ? ' is-active' : ''}`}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: opt.id,
                                    ...(opt.id === 3
                                      ? {
                                          color2: prev.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2,
                                          color3: prev.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3,
                                        }
                                      : {}),
                                  }),
                                }))
                              }
                            >
                              {t(opt.ar, opt.en)}
                            </button>
                          );
                        })}
                      </div>
                      <span className="block text-xs text-base-content/55 mt-1 text-pretty">
                        {(form.card_fx.matrixType ?? 1) === 3
                          ? t(
                              'النوع ٣ شبكة حروف متغيرة (Letter Glitch) — متوسط الاستهلاك.',
                              'Type 3 is a shifting letter grid (Letter Glitch) — moderate CPU.',
                            )
                          : (form.card_fx.matrixType ?? 1) === 2
                            ? t(
                                'النوع ٢ أجمل وأكثر استهلاكاً للمعالج — استخدمه بحذر.',
                                'Type 2 looks richer and uses more CPU — use sparingly.',
                              )
                            : t(
                                'النوع ١ أخف على الجهاز (موصى به للمتجر).',
                                'Type 1 is lighter on devices (recommended for the store).',
                              )}
                      </span>
                    </div>
                    {(form.card_fx.matrixType ?? 1) === 3 ? (
                      <>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('سرعة الجليتش', 'Glitch speed')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixGlitchSpeed ?? DEFAULT_GLITCH_SPEED}ms
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={GLITCH_SPEED_MIN}
                            max={GLITCH_SPEED_MAX}
                            step={5}
                            value={form.card_fx.matrixGlitchSpeed ?? DEFAULT_GLITCH_SPEED}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchSpeed: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('سرعة الجليتش بالميلي ثانية', 'Glitch speed in milliseconds')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{t('أسرع', 'Faster')}</span>
                            <span>{t('أبطأ', 'Slower')}</span>
                          </span>
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold tracking-tight">
                              {t('انتقال لوني سلس', 'Smooth colors')}
                            </span>
                            <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                              {t(
                                'مزج الألوان عند تغيّر الحروف بدل القفز الفوري.',
                                'Blend colors when letters change instead of hard snaps.',
                              )}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={form.card_fx.matrixGlitchSmooth !== false}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchSmooth: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('انتقال لوني سلس', 'Smooth colors')}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تظليل الحواف', 'Outer vignette')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={form.card_fx.matrixOuterVignette !== false}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixOuterVignette: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('تظليل الحواف', 'Outer vignette')}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تظليل الوسط', 'Center vignette')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={Boolean(form.card_fx.matrixCenterVignette)}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixCenterVignette: e.target.checked,
                                }),
                              }))
                            }
                            aria-label={t('تظليل الوسط', 'Center vignette')}
                          />
                        </label>
                        <label className="pe-field">
                          <span className="pe-field__label">{t('الحروف', 'Characters')}</span>
                          <input
                            type="text"
                            className="input input-bordered input-sm w-full font-mono"
                            dir="ltr"
                            value={form.card_fx.matrixGlitchChars ?? DEFAULT_GLITCH_CHARS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixType: 3,
                                  matrixGlitchChars: e.target.value,
                                }),
                              }))
                            }
                            aria-label={t('مجموعة حروف الجليتش', 'Glitch character set')}
                          />
                          <span className="block text-xs text-base-content/55 mt-1 text-pretty">
                            {t(
                              'الحروف والرموز التي تظهر في الشبكة.',
                              'Letters and symbols that appear in the grid.',
                            )}
                          </span>
                        </label>
                      </>
                    ) : (
                      <>
                        <div
                          className="pe-fx__matrix-dir"
                          role="radiogroup"
                          aria-label={t('اتجاه المطر', 'Rain direction')}
                        >
                          <span className="pe-field__label">{t('اتجاه المطر', 'Rain direction')}</span>
                          <div className="pe-fx__matrix-dir-btns">
                            {(
                              [
                                { id: 'down' as const, ar: 'للأسفل', en: 'Down' },
                                { id: 'up' as const, ar: 'للأعلى', en: 'Up' },
                              ] as const
                            ).map((opt) => {
                              const active = (form.card_fx.matrixDir ?? 'down') === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  className={`pe-fx__matrix-dir-btn${active ? ' is-active' : ''}`}
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      card_fx: normalizeCardFx({
                                        ...prev.card_fx,
                                        matrixDir: opt.id,
                                      }),
                                    }))
                                  }
                                >
                                  {t(opt.ar, opt.en)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('كثافة المطر', 'Rain amount')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixCols ?? DEFAULT_MATRIX_COLS}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_COLS_MIN}
                            max={MATRIX_COLS_MAX}
                            step={1}
                            value={form.card_fx.matrixCols ?? DEFAULT_MATRIX_COLS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixCols: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('عدد أعمدة المطر', 'Number of rain columns')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_COLS_MIN}</span>
                            <span>{MATRIX_COLS_MAX}</span>
                          </span>
                        </label>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('كمية الحروف', 'Letter amount')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixLetters ?? DEFAULT_MATRIX_LETTERS}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_LETTERS_MIN}
                            max={MATRIX_LETTERS_MAX}
                            step={1}
                            value={form.card_fx.matrixLetters ?? DEFAULT_MATRIX_LETTERS}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixLetters: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('عدد الحروف في كل عمود', 'Letters per rain stream')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_LETTERS_MIN}</span>
                            <span>{MATRIX_LETTERS_MAX}</span>
                          </span>
                        </label>
                        <label className="pe-field pe-fx__matrix-amount">
                          <span className="pe-field__label flex items-center justify-between gap-2">
                            <span>{t('السرعة', 'Speed')}</span>
                            <span className="font-mono tabular-nums text-base-content/70" dir="ltr">
                              {form.card_fx.matrixSpeed ?? DEFAULT_MATRIX_SPEED}
                            </span>
                          </span>
                          <input
                            type="range"
                            className="range range-primary range-sm w-full"
                            min={MATRIX_SPEED_MIN}
                            max={MATRIX_SPEED_MAX}
                            step={1}
                            value={form.card_fx.matrixSpeed ?? DEFAULT_MATRIX_SPEED}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  matrixSpeed: Number(e.target.value),
                                }),
                              }))
                            }
                            aria-label={t('سرعة مطر الماتريكس', 'Matrix rain speed')}
                          />
                          <span className="flex justify-between text-[0.7rem] text-base-content/50 tabular-nums mt-1" dir="ltr">
                            <span>{MATRIX_SPEED_MIN}</span>
                            <span>{MATRIX_SPEED_MAX}</span>
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                ) : null}

                {CARD_FX_STYLES.find((s) => s.id === form.card_fx.style)?.needsColor ? (
                  <div className="pe-fx__colors space-y-3">
                    <label className="pe-field pe-fx__color">
                      <span className="pe-field__label">
                        {(form.card_fx.style === 'matrix' && (form.card_fx.matrixType ?? 1) === 3)
                          ? t('لون الجليتش ١', 'Glitch color 1')
                          : t('لون التأثير', 'Effect color')}
                      </span>
                      <div className="pe-fx__color-row">
                        <input
                          type="color"
                          className="pe-fx__color-input"
                          value={form.card_fx.color ?? DEFAULT_CARD_FX_COLOR}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              card_fx: normalizeCardFx({ ...prev.card_fx, color: e.target.value }),
                            }))
                          }
                          aria-label={t('لون التأثير', 'Effect color')}
                        />
                        <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                          {(form.card_fx.color ?? DEFAULT_CARD_FX_COLOR).toUpperCase()}
                        </span>
                      </div>
                    </label>
                    {form.card_fx.style === 'matrix' && (form.card_fx.matrixType ?? 1) === 3 ? (
                      <>
                        <label className="pe-field pe-fx__color">
                          <span className="pe-field__label">{t('لون الجليتش ٢', 'Glitch color 2')}</span>
                          <div className="pe-fx__color-row">
                            <input
                              type="color"
                              className="pe-fx__color-input"
                              value={form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: 3,
                                    color2: e.target.value,
                                  }),
                                }))
                              }
                              aria-label={t('لون الجليتش ٢', 'Glitch color 2')}
                            />
                            <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                              {(form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2).toUpperCase()}
                            </span>
                          </div>
                        </label>
                        <label className="pe-field pe-fx__color">
                          <span className="pe-field__label">{t('لون الجليتش ٣', 'Glitch color 3')}</span>
                          <div className="pe-fx__color-row">
                            <input
                              type="color"
                              className="pe-fx__color-input"
                              value={form.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  card_fx: normalizeCardFx({
                                    ...prev.card_fx,
                                    matrixType: 3,
                                    color3: e.target.value,
                                  }),
                                }))
                              }
                              aria-label={t('لون الجليتش ٣', 'Glitch color 3')}
                            />
                            <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                              {(form.card_fx.color3 ?? DEFAULT_CARD_FX_COLOR3).toUpperCase()}
                            </span>
                          </div>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="flex items-center justify-between gap-3 cursor-pointer">
                          <span className="text-sm font-semibold tracking-tight">
                            {t('تدرج لوني', 'Gradient color')}
                          </span>
                          <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={Boolean(form.card_fx.gradient)}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                card_fx: normalizeCardFx({
                                  ...prev.card_fx,
                                  gradient: e.target.checked,
                                  color2: prev.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2,
                                }),
                              }))
                            }
                            aria-label={t('تدرج لوني للتأثير', 'Gradient color for effect')}
                          />
                        </label>
                        {form.card_fx.gradient ? (
                          <>
                            <label className="pe-field pe-fx__color">
                              <span className="pe-field__label">{t('لون التدرج', 'Gradient end')}</span>
                              <div className="pe-fx__color-row">
                                <input
                                  type="color"
                                  className="pe-fx__color-input"
                                  value={form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2}
                                  onChange={(e) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      card_fx: normalizeCardFx({
                                        ...prev.card_fx,
                                        gradient: true,
                                        color2: e.target.value,
                                      }),
                                    }))
                                  }
                                  aria-label={t('لون التدرج', 'Gradient end')}
                                />
                                <span className="pe-fx__color-hex font-mono tabular-nums" dir="ltr">
                                  {(form.card_fx.color2 ?? DEFAULT_CARD_FX_COLOR2).toUpperCase()}
                                </span>
                              </div>
                            </label>
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold tracking-tight">
                                  {t('تحريك التدرج', 'Shift gradient')}
                                </span>
                                <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                                  {form.card_fx.style === 'matrix'
                                    ? t(
                                        'ألوان التدرج تنتقل بسلاسة بين حروف المطر.',
                                        'Gradient colors flow smoothly through the rain letters.',
                                      )
                                    : t(
                                        'الألوان تتحرك بسلاسة يمين ويسار.',
                                        'Colors drift smoothly left and right.',
                                      )}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="toggle toggle-primary shrink-0"
                                checked={Boolean(form.card_fx.gradientShift)}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    card_fx: normalizeCardFx({
                                      ...prev.card_fx,
                                      gradient: true,
                                      gradientShift: e.target.checked,
                                    }),
                                  }))
                                }
                                aria-label={
                                  form.card_fx.style === 'matrix'
                                    ? t(
                                        'تحريك ألوان التدرج عبر حروف المطر',
                                        'Shift gradient colors through rain letters',
                                      )
                                    : t('تحريك التدرج يمين ويسار', 'Shift gradient left and right')
                                }
                              />
                            </label>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {form.card_fx.style === 'logo' ? (
                  <div className="pe-fx__logos">
                    <p className="pe-field__label">{t('شعار اللعبة', 'Game logo')}</p>
                    <div className="pe-fx__logo-grid" role="radiogroup" aria-label={t('شعار اللعبة', 'Game logo')}>
                      {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                        const active = (form.card_fx.logoId ?? 'fortnite') === entry.id;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`pe-fx__logo${active ? ' is-active' : ''}`}
                            title={t(entry.labelAr, entry.labelEn)}
                            onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                                card_fx: normalizeCardFx({ ...prev.card_fx, logoId: entry.id }),
                        }))
                      }
                    >
                        <img
                          src={entry.src}
                          alt=""
                              className={atmosphereLogoToneClass(entry)}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>
    </>
  );
}
