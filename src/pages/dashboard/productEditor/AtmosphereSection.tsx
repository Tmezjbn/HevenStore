import { Orbit } from 'lucide-react';
import { ATMOSPHERE_LOGO_CATALOG, atmosphereLogoToneClass } from '../../../lib/atmosphereLogos';
import { type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { ProductForm } from './formModel';

type AtmosphereSectionProps = {
  productAtmOn: boolean;
  t: (ar: string, en: string) => string;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
};

export default function AtmosphereSection({
  productAtmOn,
  t,
  form,
  setForm,
}: AtmosphereSectionProps) {
  return (
    <>
            {productAtmOn && (
              <details id="pe-atm" className="pe-atm group">
                <summary className="pe-atm__summary">
                  <span className="pe-atm__summary-main">
                    <span className="pe-atm__icon" aria-hidden>
                      <Orbit size={14} strokeWidth={2.25} />
                    </span>
                    <span className="pe-atm__title">{t('أجواء صفحة المنتج', 'Product page atmosphere')}</span>
                  </span>
                  <span className="pe-atm__summary-meta">
                    {form.atmosphere_logo_ids.length
                    ? t(`${form.atmosphere_logo_ids.length} أيقونة`, `${form.atmosphere_logo_ids.length} icon(s)`)
                      : t('افتراضي الموقع', 'Site default')}
                  </span>
                </summary>
                <div className="pe-atm__body">
                  <div className="pe-atm__toolbar">
                    <p className="pe-atm__hint text-pretty">
                      {t(
                        'أيقونات الأجواء خلف صفحة المنتج. فارغ = افتراضي الموقع.',
                        'Atmosphere icons behind the product page. Empty = site default.',
                      )}
                    </p>
                    <button
                      type="button"
                      className={`pe-atm__reset${form.atmosphere_logo_ids.length === 0 ? ' is-active' : ''}`}
                      disabled={form.atmosphere_logo_ids.length === 0}
                      onClick={() => setForm((prev) => ({ ...prev, atmosphere_logo_ids: [] }))}
                    >
                      {t('افتراضي الموقع', 'Site default')}
                    </button>
                  </div>

                  <div
                    className="pe-atm__stage"
                    data-mode={form.atmosphere_logo_ids.length ? 'custom' : 'default'}
                    aria-hidden
                  >
                    <div className="pe-atm__stage-glow" />
                    {form.atmosphere_logo_ids.length === 0 ? (
                      <p className="pe-atm__stage-empty">
                        {t('يستخدم أيقونات الموقع العامة', 'Uses the site-wide icon set')}
                      </p>
                    ) : (
                      <div className="pe-atm__stage-orbit">
                        {form.atmosphere_logo_ids.map((id, i) => {
                          const entry = ATMOSPHERE_LOGO_CATALOG.find((e) => e.id === id);
                          if (!entry) return null;
                          return (
                            <img
                              key={id}
                              src={entry.src}
                              alt=""
                              className={`pe-atm__stage-mark ${atmosphereLogoToneClass(entry)}`}
                              style={{ ['--i']: i } as CSSProperties}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className="pe-atm__grid"
                    role="group"
                    aria-label={t('أيقونات الأجواء', 'Atmosphere icons')}
                  >
                    {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                      const on = form.atmosphere_logo_ids.includes(entry.id);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          className={`pe-atm__tile${on ? ' is-active' : ''}`}
                          onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                atmosphere_logo_ids: on
                                  ? prev.atmosphere_logo_ids.filter((id) => id !== entry.id)
                                  : [...prev.atmosphere_logo_ids, entry.id],
                              }));
                            }}
                        >
                          <span className="pe-atm__tile-mark" aria-hidden>
                            <img
                              src={entry.src}
                              alt=""
                              className={atmosphereLogoToneClass(entry)}
                            />
                          </span>
                          <span className="pe-atm__tile-label">{t(entry.labelAr, entry.labelEn)}</span>
                          {on ? <span className="pe-atm__tile-check" aria-hidden>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>
            )}
    </>
  );
}
