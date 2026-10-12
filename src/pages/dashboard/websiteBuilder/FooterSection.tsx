import { Link } from 'react-router-dom';
import { Save, Loader2, Check, ChevronUp, ChevronDown, Trash2, Plus, PanelBottom } from 'lucide-react';
import { DEFAULT_FOOTER_NAV, FOOTER_NAV_COLUMNS_MAX, FOOTER_NAV_LINKS_MAX, type FooterNavColumn, type SiteSettingsMap } from '../../../lib/siteSettings';
import { type UseMutationResult } from '@tanstack/react-query';
import { focusRing, SECTION_SHELL, SECTION_TITLE } from './constants';

interface FooterSectionProps {
  addFooterColumn: () => void;
  addFooterLink: (colId: string) => void;
  footerDirty: boolean;
  footerNav: FooterNavColumn[];
  footerSaved: boolean;
  moveFooterColumn: (index: number, dir: -1 | 1) => void;
  patchFooterColumn: (id: string, patch: Partial<FooterNavColumn>) => void;
  patchFooterLink: (colId: string, linkIndex: number, patch: Partial<{ label_ar: string; label_en: string; href: string; }>) => void;
  removeFooterColumn: (id: string) => void;
  removeFooterLink: (colId: string, linkIndex: number) => void;
  saveFooterNav: () => Promise<void>;
  saveMutation: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  setFooterNav: React.Dispatch<React.SetStateAction<FooterNavColumn[]>>;
  setFooterSaved: React.Dispatch<React.SetStateAction<boolean>>;
  t: (ar: string, en: string) => string;
}

export default function FooterSection({
  addFooterColumn,
  addFooterLink,
  footerDirty,
  footerNav,
  footerSaved,
  moveFooterColumn,
  patchFooterColumn,
  patchFooterLink,
  removeFooterColumn,
  removeFooterLink,
  saveFooterNav,
  saveMutation,
  setFooterNav,
  setFooterSaved,
  t,
}: FooterSectionProps) {
  return (
      <section id="builder-footer" className={SECTION_SHELL} aria-labelledby="builder-footer-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h3 id="builder-footer-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-accent/40 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <PanelBottom size={15} aria-hidden />
              </span>
              {t('تذييل الموقع', 'Site footer')}
              <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
                {footerNav.length}/{FOOTER_NAV_COLUMNS_MAX}
              </span>
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setFooterNav(DEFAULT_FOOTER_NAV);
                setFooterSaved(false);
              }}
            >
              {t('افتراضي', 'Defaults')}
            </button>
            <button
              type="button"
              className={`btn btn-outline btn-sm gap-1 ${focusRing}`}
              disabled={footerNav.length >= FOOTER_NAV_COLUMNS_MAX}
              onClick={addFooterColumn}
            >
              <Plus size={14} />
              {t('عمود', 'Column')}
            </button>
            <button
              type="button"
              onClick={saveFooterNav}
              disabled={!footerDirty || saveMutation.isPending}
              className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : footerSaved && !footerDirty ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {footerSaved && !footerDirty
                ? t('تم الحفظ', 'Saved')
                : t('حفظ التذييل', 'Save footer')}
            </button>
          </div>
        </div>

        <p className="text-sm text-base-content/65 text-pretty">
          {t('الشعار والشبكات من ', 'Brand + socials from ')}
          <Link to="/dashboard/settings" className="link link-primary font-medium">
            {t('الإعدادات', 'Settings')}
          </Link>
          .
        </p>

        {footerNav.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
            <PanelBottom size={28} className="mx-auto text-base-content/35" aria-hidden />
            <p className="text-base font-semibold tracking-tight">
              {t('لا أعمدة', 'No columns')}
            </p>
            <p className="text-sm text-base-content/65">
              {t('أضف عموداً أو استعد الافتراضي.', 'Add a column or restore defaults.')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {footerNav.map((col, colIndex) => (
              <li
                key={col.id}
                className={`footer-col rounded-lg border overflow-hidden transition-colors ${
                  col.enabled
                    ? 'border-accent/35 bg-base-100'
                    : 'border-base-300 bg-base-200/50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 px-3 py-3 border-b border-base-300 bg-base-200/40">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={col.enabled}
                      onChange={(e) => patchFooterColumn(col.id, { enabled: e.target.checked })}
                      aria-label={t('تفعيل العمود', 'Enable column')}
                    />
                    <span className="text-xs font-semibold tracking-wide text-base-content/70 tabular-nums">
                      {colIndex + 1}
                    </span>
                  </label>
                  <input
                    className="input input-bordered input-sm flex-1 min-w-[7rem]"
                    value={col.title_ar}
                    onChange={(e) => patchFooterColumn(col.id, { title_ar: e.target.value })}
                    placeholder={t('العنوان عربي', 'Title AR')}
                    dir="rtl"
                    aria-label={t('عنوان العمود عربي', 'Column title Arabic')}
                  />
                  <input
                    className="input input-bordered input-sm flex-1 min-w-[7rem]"
                    value={col.title_en}
                    onChange={(e) => patchFooterColumn(col.id, { title_en: e.target.value })}
                    placeholder={t('العنوان إنجليزي', 'Title EN')}
                    dir="ltr"
                    aria-label={t('عنوان العمود إنجليزي', 'Column title English')}
                  />
                  <div className="flex items-center gap-0.5 ms-auto">
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                      disabled={colIndex === 0}
                      onClick={() => moveFooterColumn(colIndex, -1)}
                      aria-label={t('أعلى', 'Move up')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                      disabled={colIndex === footerNav.length - 1}
                      onClick={() => moveFooterColumn(colIndex, 1)}
                      aria-label={t('أسفل', 'Move down')}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                      onClick={() => removeFooterColumn(col.id)}
                      aria-label={t('حذف العمود', 'Remove column')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {col.links.length === 0 ? (
                    <p className="text-sm text-base-content/55 px-1 py-2">
                      {t('لا روابط في هذا العمود.', 'No links in this column.')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {col.links.map((link, linkIndex) => (
                        <li
                          key={`${col.id}-l${linkIndex}`}
                          className="rounded-lg border border-base-300 bg-base-200/30 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold tracking-wide text-base-content/55 tabular-nums">
                              {t('رابط', 'Link')} {linkIndex + 1}
                            </span>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                              onClick={() => removeFooterLink(col.id, linkIndex)}
                              aria-label={t('حذف الرابط', 'Remove link')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                AR
                              </span>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={link.label_ar}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { label_ar: e.target.value })
                                }
                                placeholder={t('تسمية', 'Label')}
                                dir="rtl"
                              />
                            </label>
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                EN
                              </span>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={link.label_en}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { label_en: e.target.value })
                                }
                                placeholder={t('تسمية', 'Label')}
                                dir="ltr"
                              />
                            </label>
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                URL
                              </span>
                              <input
                                className="input input-bordered input-sm w-full font-mono text-xs"
                                value={link.href}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { href: e.target.value })
                                }
                                placeholder="/path or https://"
                                dir="ltr"
                              />
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={`btn btn-outline btn-xs gap-1 ${focusRing}`}
                    disabled={col.links.length >= FOOTER_NAV_LINKS_MAX}
                    onClick={() => addFooterLink(col.id)}
                  >
                    <Plus size={12} />
                    {t('رابط', 'Link')}
                    <span className="tabular-nums opacity-70">
                      {col.links.length}/{FOOTER_NAV_LINKS_MAX}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
  );
}
