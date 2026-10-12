import { UserRound, Search, X } from 'lucide-react';
import { sellerDisplayName } from './sellers';
import { Role } from '../../../types';
import UserAvatar from '../../../components/ui/UserAvatar';
import { roleLabel, ROLE_INFO } from '../../../lib/roles';
import { SellerSort, SellerPick } from './types';
import { ProductForm } from './formModel';
import { type Dispatch, type SetStateAction } from 'react';

type SellerSectionProps = {
  t: (ar: string, en: string) => string;
  form: ProductForm;
  sellers: SellerPick[];
  isSeller: boolean;
  canAssignSeller: boolean;
  lang: 'ar' | 'en';
  sellerQuery: string;
  setSellerQuery: Dispatch<SetStateAction<string>>;
  sellerRoleFilter: string;
  setSellerRoleFilter: Dispatch<SetStateAction<string>>;
  sellerSort: SellerSort;
  setSellerSort: Dispatch<SetStateAction<SellerSort>>;
  pickSeller: (id: string) => void;
  sellerOptions: SellerPick[];
  setForm: Dispatch<SetStateAction<ProductForm>>;
};

export default function SellerSection({
  t,
  form,
  sellers,
  isSeller,
  canAssignSeller,
  lang,
  sellerQuery,
  setSellerQuery,
  sellerRoleFilter,
  setSellerRoleFilter,
  sellerSort,
  setSellerSort,
  pickSeller,
  sellerOptions,
  setForm,
}: SellerSectionProps) {
  return (
    <>
            <details id="pe-seller" className="pe-seller group">
              <summary className="pe-seller__summary">
                <span className="pe-seller__summary-main">
                  <span className="pe-seller__icon" aria-hidden>
                    <UserRound size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-seller__title">{t('البائع', 'Seller')}</span>
                </span>
                <span className="pe-seller__summary-meta">
                  {form.seller_id
                    ? sellerDisplayName(
                        sellers.find((s) => s.id === form.seller_id) ?? {
                          id: form.seller_id,
                          full_name: null,
                          email: null,
                          role: 'seller',
                        },
                      )
                    : t('بدون بائع', 'No seller')}
                </span>
              </summary>
              <div className="pe-seller__body">
                {(() => {
                  const picked =
                form.seller_id
                      ? sellers.find((s) => s.id === form.seller_id) ?? {
                          id: form.seller_id,
                          full_name: null,
                          email: null,
                          role: 'seller' as Role,
                        }
                      : null;
                  const showOnPage = isSeller
                    ? true
                    : Boolean(form.seller_id) && form.show_seller_name;
                  const showToggleLocked = isSeller || (canAssignSeller && !form.seller_id);

                  return (
                    <>
                      <div
                        className="pe-seller__stage"
                        data-mode={picked ? 'picked' : 'empty'}
                        aria-hidden
                      >
                        {picked ? (
                          <>
                            <UserAvatar
                              name={picked.full_name}
                              email={picked.email}
                              sizeClass="w-11 h-11"
                              className="pe-seller__stage-avatar"
                            />
                            <div className="pe-seller__stage-copy">
                              <p className="pe-seller__stage-name">{sellerDisplayName(picked)}</p>
                              <p className="pe-seller__stage-role">{roleLabel(picked.role, lang)}</p>
                            </div>
                            {showOnPage ? (
                              <span className="pe-seller__stage-badge">
                                {t('ظاهر في الصفحة', 'Shown on page')}
                    </span>
                            ) : (
                              <span className="pe-seller__stage-badge pe-seller__stage-badge--muted">
                                {t('مخفي', 'Hidden')}
                              </span>
                            )}
                          </>
                        ) : (
                          <p className="pe-seller__stage-empty">
                            {t('لا بائع — صفحة المنتج بلا إسناد', 'No seller — product page unattributed')}
                          </p>
                        )}
                      </div>

                      {canAssignSeller ? (
                        <div className="pe-seller__pick">
                          <div className="pe-seller__tools">
                            <label className="pe-seller__search">
                              <Search size={14} className="pe-seller__search-icon" aria-hidden />
                        <input
                          value={sellerQuery}
                          onChange={(e) => setSellerQuery(e.target.value)}
                          placeholder={t('ابحث بالاسم أو البريد…', 'Search name or email…')}
                          aria-label={t('بحث عن مستخدم', 'Search users')}
                        />
                              {sellerQuery ? (
                          <button
                            type="button"
                                  className="pe-seller__search-clear"
                            onClick={() => setSellerQuery('')}
                            aria-label={t('مسح البحث', 'Clear search')}
                          >
                            <X size={12} />
                          </button>
                              ) : null}
                      </label>
                      <select
                        value={sellerRoleFilter}
                        onChange={(e) => setSellerRoleFilter(e.target.value)}
                              className="pe-seller__select"
                        aria-label={t('تصفية حسب الرتبة', 'Filter by role')}
                      >
                        <option value="">{t('كل الرتب', 'All roles')}</option>
                        {ROLE_INFO.map((r) => (
                          <option key={r.id} value={r.id}>
                            {lang === 'ar' ? r.labelAr : r.labelEn}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sellerSort}
                        onChange={(e) => setSellerSort(e.target.value as SellerSort)}
                              className="pe-seller__select"
                        aria-label={t('ترتيب القائمة', 'Sort list')}
                      >
                        <option value="name">{t('ترتيب: الاسم', 'Sort: Name')}</option>
                        <option value="role">{t('ترتيب: الرتبة', 'Sort: Role')}</option>
                      </select>
                    </div>

                    <div
                            className="pe-seller__list"
                      role="listbox"
                      aria-label={t('اختر بائع المنتج', 'Choose product seller')}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!form.seller_id}
                        onClick={() => pickSeller('')}
                              className={`pe-seller__row${!form.seller_id ? ' is-active' : ''}`}
                      >
                              <span className="pe-seller__row-avatar pe-seller__row-avatar--empty" aria-hidden>
                                —
                              </span>
                              <span className="pe-seller__row-name">{t('بدون بائع', 'No seller')}</span>
                      </button>
                      {sellerOptions.map((s) => {
                        const selected = form.seller_id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => pickSeller(s.id)}
                                  className={`pe-seller__row${selected ? ' is-active' : ''}`}
                                >
                                  <UserAvatar
                                    name={s.full_name}
                                    email={s.email}
                                    sizeClass="w-8 h-8"
                                    className="pe-seller__row-avatar"
                                  />
                                  <span className="pe-seller__row-copy">
                                    <span className="pe-seller__row-name">{sellerDisplayName(s)}</span>
                                    {s.email ? (
                                      <span className="pe-seller__row-email" dir="ltr">
                                        {s.email}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="pe-seller__row-role" data-role={s.role}>
                              {roleLabel(s.role, lang)}
                            </span>
                          </button>
                        );
                      })}
                            {sellerOptions.length === 0 ? (
                              <p className="pe-seller__empty">{t('لا نتائج', 'No matches')}</p>
                            ) : null}
                    </div>
                  </div>
                ) : (
                        <p className="pe-seller__locked text-pretty">
                    {t('أنت البائع لهذا المنتج.', 'You are the seller of this product.')}
                  </p>
                )}

                      <button
                        type="button"
                        role="switch"
                        aria-checked={showOnPage}
                        disabled={showToggleLocked}
                        className={`pe-seller__switch${showOnPage ? ' is-on' : ''}${showToggleLocked ? ' is-locked' : ''}`}
                        onClick={() => {
                          if (showToggleLocked) return;
                          setForm((prev) => ({ ...prev, show_seller_name: !prev.show_seller_name }));
                        }}
                      >
                        <span className="pe-seller__switch-track" aria-hidden>
                          <span className="pe-seller__switch-knob" />
                        </span>
                        <span className="pe-seller__switch-copy">
                          <span className="pe-seller__switch-label">
                      {t('إظهار ملف البائع في صفحة المنتج', 'Show seller profile on product page')}
                    </span>
                          <span className="pe-seller__switch-hint">
                      {isSeller
                        ? t(
                            'البائعون لا يمكنهم إخفاء هويتهم — يمكن للمالك تغيير ذلك.',
                            'Sellers cannot hide their identity — the owner can change this.',
                          )
                        : t(
                            'التعيين للعرض فقط — لا يغيّر رتبة المستخدم.',
                            'Attribution only — does not change the user’s role.',
                          )}
                    </span>
                  </span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </details>
    </>
  );
}
