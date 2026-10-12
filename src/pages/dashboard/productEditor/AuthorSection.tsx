import type { User } from '@supabase/supabase-js';
import { UserPen } from 'lucide-react';
import { sellerDisplayName } from './sellers';
import { canEditProductAuthor } from '../../../lib/productAuthorLock';
import { roleLabel } from '../../../lib/roles';
import { Role, Profile, Product } from '../../../types';
import { ProductForm } from './formModel';
import { SellerPick } from './types';
import { type Dispatch, type SetStateAction } from 'react';

type AuthorSectionProps = {
  t: (ar: string, en: string) => string;
  form: ProductForm;
  user: User | null;
  profile: Profile | null;
  staffAuthors: SellerPick[];
  sellers: SellerPick[];
  editing: Product | null;
  isStaffAuthor: boolean;
  profileRole: Role | undefined;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  isOwner: boolean;
  lang: 'ar' | 'en';
};

export default function AuthorSection({
  t,
  form,
  user,
  profile,
  staffAuthors,
  sellers,
  editing,
  isStaffAuthor,
  profileRole,
  setForm,
  isOwner,
  lang,
}: AuthorSectionProps) {
  return (
    <>
            <details id="pe-author" className="pe-req group">
              <summary className="pe-req__summary">
                <span className="pe-req__summary-main">
                  <span className="pe-req__icon" aria-hidden>
                    <UserPen size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-req__title">{t('أضيف بواسطة', 'Added by')}</span>
                </span>
                <span className="pe-req__summary-meta">
                  {(() => {
                    if (!form.created_by) return t('مشترك', 'Shared');
                    if (form.created_by === user?.id) {
                      return profile?.full_name?.trim() || t('أنا', 'Me');
                    }
                    const hit =
                      staffAuthors.find((s) => s.id === form.created_by) ??
                      sellers.find((s) => s.id === form.created_by);
                    return hit ? sellerDisplayName(hit) : '…';
                  })()}
                </span>
              </summary>
              <div className="pe-req__body space-y-3">
                {(() => {
                  const canEditAuthor =
                    !editing
                      ? Boolean(user?.id) && isStaffAuthor
                      : canEditProductAuthor({
                          userId: user?.id,
                          role: profileRole,
                          createdBy: editing.created_by,
                          addedBy: editing.added_by,
                        });
                  const meLabel =
                    profileRole === 'owner'
                      ? t('أنا (المالك)', 'Me (owner)')
                      : profileRole === 'admin'
                        ? t('أنا (مدير)', 'Me (admin)')
                        : t('أنا (مشرف)', 'Me (moderator)');
                  return (
                    <>
                      <p className="pe-req__hint text-pretty">
                        {form.created_by
                          ? t(
                              'قفل الحذف يتبع هذا الاسم. غيره لا يغيّر «أضيف بواسطة».',
                              'Delete lock follows this name. Others cannot change Added by.',
                            )
                          : t(
                              'مشترك: أي مالك/مدير/مشرف يحذف. تغيير «أضيف بواسطة» لمن أضاف المنتج فقط.',
                              'Shared: any owner/admin/mod can delete. Only the adder can change Added by.',
                            )}
                      </p>
                      {canEditAuthor ? (
                        <label className="form-control w-full max-w-md">
                          <select
                            className="select select-bordered select-sm"
                            value={form.created_by}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, created_by: e.target.value }))
                            }
                            aria-label={t('مؤلّف المنتج', 'Product author')}
                          >
                            <option value="">
                              {t('بدون — مشترك للفريق', 'None — shared for the team')}
                            </option>
                            {user?.id ? (
                              <option value={user.id}>
                                {meLabel}
                                {profile?.full_name ? ` — ${profile.full_name}` : ''}
                              </option>
                            ) : null}
                            {isOwner
                              ? staffAuthors
                                  .filter((s) => s.id !== user?.id)
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {sellerDisplayName(s)} · {roleLabel(s.role, lang)}
                                    </option>
                                  ))
                              : null}
                          </select>
                        </label>
                      ) : (
                        <p className="text-sm">
                          {form.created_by
                            ? (() => {
                                const hit =
                                  staffAuthors.find((s) => s.id === form.created_by) ??
                                  sellers.find((s) => s.id === form.created_by) ??
                                  (form.created_by === user?.id
                                    ? {
                                        id: form.created_by,
                                        full_name: profile?.full_name ?? null,
                                        email: profile?.email ?? null,
                                        role: (profileRole || 'moderator') as Role,
                                      }
                                    : null);
                                return hit ? sellerDisplayName(hit) : t('أنت', 'You');
                              })()
                            : t('مشترك — بلا مؤلّف', 'Shared — no author')}
                          <span className="block text-xs text-base-content/55 mt-1">
                            {t(
                              'لا يمكنك تغيير الإسناد',
                              'You cannot change this attribution',
                            )}
                          </span>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </details>
    </>
  );
}
