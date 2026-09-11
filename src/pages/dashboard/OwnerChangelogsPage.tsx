import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Loader2, Plus, Save, ScrollText, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
// PERF-2: defer changelog CSS off storefront main chunk (loads with OwnerChangelogsPage).
void import('../../styles/dashboard-docs.css');
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useSiteSettings, useSaveSiteSettings } from '../../hooks/useSiteSettings';
import {
  deleteOwnerChangelogEntry,
  emptyChangelogEntry,
  EMPTY_OWNER_LESSON,
  fetchOwnerChangelog,
  insertOwnerChangelogEntry,
  lessonHasContent,
  parseUserChangelog,
  type ChangelogEntry,
  type OwnerChangelogLesson,
  type OwnerChangelogRow,
  type OwnerChangelogWrite,
  type OwnerUpdateScale,
} from '../../lib/changelogs';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';

const OWNER_LOG_KEY = ['owner-changelog'];

const emptyOwnerDraft = (scale: OwnerUpdateScale = 'small'): OwnerChangelogWrite => ({
  entry_date: new Date().toISOString().slice(0, 10),
  title_ar: '',
  title_en: '',
  summary_ar: '',
  summary_en: '',
  lesson: { ...EMPTY_OWNER_LESSON },
  update_scale: scale,
});

const LESSON_SECTIONS: {
  key: keyof Pick<OwnerChangelogLesson, 'what_ar' | 'why_ar' | 'how_ar' | 'benefits_ar'>;
  enKey: keyof Pick<OwnerChangelogLesson, 'what_en' | 'why_en' | 'how_en' | 'benefits_en'>;
  labelAr: string;
  labelEn: string;
  hintAr: string;
  hintEn: string;
}[] = [
  {
    key: 'what_ar',
    enKey: 'what_en',
    labelAr: 'وش صار؟',
    labelEn: 'What happened',
    hintAr: 'بجملة بسيطة: وش تغيّر في المتجر؟',
    hintEn: 'In plain words: what changed in the store?',
  },
  {
    key: 'why_ar',
    enKey: 'why_en',
    labelAr: 'ليش؟',
    labelEn: 'Why',
    hintAr: 'ليش سوينا التغيير — المشكلة أو الخطر اللي كان موجود.',
    hintEn: 'Why we did it — the problem or risk that existed.',
  },
  {
    key: 'how_ar',
    enKey: 'how_en',
    labelAr: 'كيف؟',
    labelEn: 'How',
    hintAr: 'كيف يشتغل النظام الحين من زاوية صاحب المتجر (مو كود).',
    hintEn: 'How it works now in store-owner terms (not code).',
  },
  {
    key: 'benefits_ar',
    enKey: 'benefits_en',
    labelAr: 'وش الفايدة؟',
    labelEn: 'The benefits',
    hintAr: 'وش يستفيد الزبون؟ وش تستفيد أنت؟',
    hintEn: 'What the shopper gains — and what you gain.',
  },
];

export default function OwnerChangelogsPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  const saveSettings = useSaveSiteSettings();

  const ownerQuery = useQuery({
    queryKey: OWNER_LOG_KEY,
    queryFn: fetchOwnerChangelog,
  });

  const [userEntries, setUserEntries] = useState<ChangelogEntry[]>([]);
  const [userSaved, setUserSaved] = useState(false);
  const [draft, setDraft] = useState<OwnerChangelogWrite | null>(null);
  const [logTab, setLogTab] = useState<'internal' | 'public'>('internal');
  const [scaleTab, setScaleTab] = useState<OwnerUpdateScale>('big');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsLoading) {
      setUserEntries(parseUserChangelog(settings.user_changelog_json));
    }
  }, [settings.user_changelog_json, settingsLoading]);

  const refreshOwner = () => qc.invalidateQueries({ queryKey: OWNER_LOG_KEY });

  const insertMut = useMutation({
    mutationFn: insertOwnerChangelogEntry,
    onSuccess: () => {
      setDraft(null);
      refreshOwner();
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteOwnerChangelogEntry,
    onSuccess: refreshOwner,
  });

  const saveUserChangelog = async () => {
    if (!user) return;
    try {
      await saveSettings.mutateAsync({
        updates: { user_changelog_json: JSON.stringify(userEntries) },
        userId: user.id,
      });
      setUserSaved(true);
    } catch {
      setUserSaved(false);
    }
  };

  const updateUser = (i: number, patch: Partial<ChangelogEntry>) => {
    setUserEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
    setUserSaved(false);
  };

  const ar = lang === 'ar';
  const ownerRows = useMemo(() => ownerQuery.data ?? [], [ownerQuery.data]);
  const bigCount = useMemo(
    () => ownerRows.filter((r) => r.update_scale === 'big').length,
    [ownerRows],
  );
  const smallCount = useMemo(
    () => ownerRows.filter((r) => r.update_scale !== 'big').length,
    [ownerRows],
  );
  const scaleRows = useMemo(
    () => ownerRows.filter((r) => (scaleTab === 'big' ? r.update_scale === 'big' : r.update_scale !== 'big')),
    [ownerRows, scaleTab],
  );
  const userDirty = useMemo(
    () => JSON.stringify(userEntries) !== JSON.stringify(parseUserChangelog(settings.user_changelog_json)),
    [userEntries, settings.user_changelog_json],
  );

  useEffect(() => {
    if (!userSaved || userDirty) return;
    const id = window.setTimeout(() => setUserSaved(false), 2200);
    return () => window.clearTimeout(id);
  }, [userSaved, userDirty]);

  return (
    <div className="changelog-page max-w-4xl mx-auto text-start">
      <header className="changelog-page__intro">
        <p className="changelog-page__lede text-pretty">
          {t(
            'السجل الداخلي للمالك فقط. السجل العام يظهر للزوار تحت الموارد.',
            'Internal log is owner-only. The public log appears under Resources for visitors.',
          )}
        </p>
        <div className="changelog-page__tabs" role="tablist" aria-label={t('السجلات', 'Logs')}>
          <button
            type="button"
            role="tab"
            aria-selected={logTab === 'internal'}
            className={`changelog-page__tab${logTab === 'internal' ? ' is-active' : ''}`}
            onClick={() => setLogTab('internal')}
          >
            <ScrollText size={14} aria-hidden />
            {t('داخلي', 'Internal')}
            <span className="changelog-page__tab-count tabular-nums">{ownerRows.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={logTab === 'public'}
            className={`changelog-page__tab${logTab === 'public' ? ' is-active' : ''}`}
            onClick={() => setLogTab('public')}
          >
            <Users size={14} aria-hidden />
            {t('عام', 'Public')}
            <span className="changelog-page__tab-count tabular-nums">{userEntries.length}</span>
          </button>
        </div>
      </header>

      {logTab === 'internal' ? (
        <section className="changelog-panel" aria-labelledby="changelog-internal-title">
          <div className="changelog-panel__head">
            <div className="min-w-0">
              <h3 id="changelog-internal-title" className="changelog-panel__title">
                <span className="changelog-panel__icon" aria-hidden>
                  <ScrollText size={16} strokeWidth={2.25} />
                </span>
                {t('سجل داخلي (مالك فقط)', 'Internal log (owner only)')}
              </h3>
              <p className="changelog-panel__hint text-pretty">
                {t(
                  'التحديثات الكبيرة = محطات. الصغيرة = تفاصيل يومية. الملخص على البطاقة — تحت «المزيد»: وش، ليش، كيف، والفايدة.',
                  'Big updates = milestones. Small = day-to-day notes. Summary on the card — under “More details”: what, why, how, benefits.',
                )}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1 shrink-0"
              onClick={() => setDraft(emptyOwnerDraft(scaleTab))}
            >
              <Plus size={14} aria-hidden /> {t('إضافة', 'Add')}
            </button>
          </div>

          <div
            className="changelog-scale-tabs"
            role="tablist"
            aria-label={t('حجم التحديث', 'Update size')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={scaleTab === 'big'}
              className={`changelog-scale-tabs__tab${scaleTab === 'big' ? ' is-active' : ''}`}
              onClick={() => setScaleTab('big')}
            >
              {t('تحديثات كبيرة', 'Big updates')}
              <span className="changelog-page__tab-count tabular-nums">{bigCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scaleTab === 'small'}
              className={`changelog-scale-tabs__tab${scaleTab === 'small' ? ' is-active' : ''}`}
              onClick={() => setScaleTab('small')}
            >
              {t('تحديثات صغيرة', 'Small updates')}
              <span className="changelog-page__tab-count tabular-nums">{smallCount}</span>
            </button>
          </div>

          {ownerQuery.isLoading && (
            <div className="flex justify-center py-10" aria-busy="true">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          )}
          {ownerQuery.isError && (
            <p className="changelog-panel__error text-pretty">
              {t(
                'تعذر تحميل السجل. طبّق ترحيل قاعدة البيانات إن لزم (lesson_json).',
                'Could not load log. Apply the DB migration if needed (lesson_json).',
              )}
            </p>
          )}

          {draft && (
            <div className="changelog-draft">
              <div className="changelog-draft__head">
                <h4 className="changelog-draft__title">{t('إدخال جديد', 'New entry')}</h4>
                <p className="changelog-draft__hint text-pretty">
                  {t('احفظ بعد اكتمال الملخص والشرح.', 'Save once summary and teaching notes are ready.')}
                </p>
              </div>
              <Field
                label={t('التاريخ', 'Date')}
                value={draft.entry_date}
                onChange={(v) => setDraft((d) => (d ? { ...d, entry_date: v } : d))}
              />
              <div
                className="changelog-scale-tabs changelog-scale-tabs--draft"
                role="group"
                aria-label={t('حجم التحديث', 'Update size')}
              >
                {(
                  [
                    { id: 'big' as const, ar: 'كبير', en: 'Big' },
                    { id: 'small' as const, ar: 'صغير', en: 'Small' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`changelog-scale-tabs__tab${draft.update_scale === opt.id ? ' is-active' : ''}`}
                    aria-pressed={draft.update_scale === opt.id}
                    onClick={() => setDraft((d) => (d ? { ...d, update_scale: opt.id } : d))}
                  >
                    {t(opt.ar, opt.en)}
                  </button>
                ))}
              </div>
              <div className="changelog-draft__grid">
                <Field
                  label={t('العنوان (عربي)', 'Title (AR)')}
                  value={draft.title_ar}
                  onChange={(v) => setDraft((d) => (d ? { ...d, title_ar: v } : d))}
                />
                <Field
                  label={t('العنوان (إنجليزي)', 'Title (EN)')}
                  value={draft.title_en}
                  onChange={(v) => setDraft((d) => (d ? { ...d, title_en: v } : d))}
                />
                <Field
                  label={t('الملخص (عربي)', 'Summary (AR)')}
                  value={draft.summary_ar}
                  onChange={(v) => setDraft((d) => (d ? { ...d, summary_ar: v } : d))}
                  multiline
                />
                <Field
                  label={t('الملخص (إنجليزي)', 'Summary (EN)')}
                  value={draft.summary_en}
                  onChange={(v) => setDraft((d) => (d ? { ...d, summary_en: v } : d))}
                  multiline
                />
              </div>
              <p className="changelog-draft__section-label">
                {t('الشرح التعليمي (يظهر تحت المزيد)', 'Teaching details (shown under More details)')}
              </p>
              <div className="changelog-lesson-stack">
                {LESSON_SECTIONS.map((sec, i) => (
                  <div key={sec.key} className="changelog-lesson-block">
                    <p className="changelog-lesson-block__label">
                      <span className="changelog-lesson-block__n tabular-nums" aria-hidden>
                        {i + 1}
                      </span>
                      {t(sec.labelAr, sec.labelEn)}
                    </p>
                    <p className="changelog-lesson-block__hint text-pretty">
                      {t(sec.hintAr, sec.hintEn)}
                    </p>
                    <div className="changelog-draft__grid">
                      <Field
                        label={t('عربي', 'AR')}
                        value={draft.lesson[sec.key]}
                        onChange={(v) =>
                          setDraft((d) =>
                            d ? { ...d, lesson: { ...d.lesson, [sec.key]: v } } : d,
                          )
                        }
                        multiline
                      />
                      <Field
                        label={t('إنجليزي', 'EN')}
                        value={draft.lesson[sec.enKey]}
                        onChange={(v) =>
                          setDraft((d) =>
                            d ? { ...d, lesson: { ...d.lesson, [sec.enKey]: v } } : d,
                          )
                        }
                        multiline
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="changelog-draft__actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm gap-1"
                  disabled={insertMut.isPending}
                  onClick={() => insertMut.mutate(draft)}
                >
                  {insertMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {t('حفظ', 'Save')}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>
                  {t('إلغاء', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {!ownerQuery.isLoading && !ownerQuery.isError && scaleRows.length === 0 && !draft && (
            <p className="changelog-empty text-pretty">
              {scaleTab === 'big'
                ? t(
                    'لا تحديثات كبيرة بعد — أضف محطة، أو طبّق ترحيل update_scale.',
                    'No big updates yet — add a milestone, or apply the update_scale migration.',
                  )
                : t('لا تحديثات صغيرة بعد.', 'No small updates yet.')}
            </p>
          )}

          <ul className="changelog-feed">
            {scaleRows.map((row, i) => {
              const title = ar ? row.title_ar || row.title_en : row.title_en || row.title_ar;
              const summary =
                ar ? row.summary_ar || row.summary_en : row.summary_en || row.summary_ar;
              return (
                <li
                  key={row.id}
                  className={`changelog-entry${row.update_scale === 'big' ? ' changelog-entry--big' : ''}`}
                  style={{ ['--i' as string]: i }}
                >
                  <div className="changelog-entry__meta">
                    <time className="changelog-entry__date font-mono" dateTime={row.entry_date}>
                      {row.entry_date}
                    </time>
                    <span className={`changelog-entry__scale changelog-entry__scale--${row.update_scale}`}>
                      {row.update_scale === 'big'
                        ? t('كبير', 'Big')
                        : t('صغير', 'Small')}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-xs text-error shrink-0"
                      aria-label={t('حذف', 'Delete')}
                      disabled={deleteMut.isPending}
                      onClick={() => setDeleteId(row.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="changelog-entry__title text-balance">{title}</h4>
                  <div className="changelog-entry__summary">
                    <p className="changelog-entry__kicker">{t('الملخص', 'Summary')}</p>
                    <p className="changelog-entry__body text-pretty whitespace-pre-wrap">
                      {summary || t('لا يوجد ملخص بعد.', 'No summary yet.')}
                    </p>
                  </div>
                  <details className="changelog-entry__details group">
                    <summary className="changelog-entry__more">
                      <span className="changelog-entry__chev" aria-hidden>
                        ▸
                      </span>
                      {t('المزيد من التفاصيل', 'More details')}
                    </summary>
                    <div className="changelog-entry__lesson">
                      <OwnerLessonView row={row} ar={ar} t={t} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="changelog-panel" aria-labelledby="changelog-public-title">
          <div className="changelog-panel__head">
            <div className="min-w-0">
              <h3 id="changelog-public-title" className="changelog-panel__title">
                <span className="changelog-panel__icon" aria-hidden>
                  <Users size={16} strokeWidth={2.25} />
                </span>
                {t('سجل المستخدمين (عام)', 'User changelog (public)')}
              </h3>
              <p className="changelog-panel__hint text-pretty">
                {t('يظهر في /updates وفي تذييل الموارد.', 'Shown at /updates and in the Resources footer.')}{' '}
                <Link to="/updates" className="link link-hover font-semibold inline-flex items-center gap-1">
                  {t('فتح الصفحة', 'Open page')} <ExternalLink size={12} aria-hidden />
                </Link>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1 shrink-0"
              onClick={() => {
                setUserEntries((prev) => [emptyChangelogEntry(), ...prev]);
                setUserSaved(false);
              }}
            >
              <Plus size={14} aria-hidden /> {t('إضافة', 'Add')}
            </button>
          </div>

          {settingsLoading ? (
            <div className="flex justify-center py-10" aria-busy="true">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : (
            <>
              {userEntries.length === 0 && (
                <p className="changelog-empty text-pretty">
                  {t('فارغ — أضف أول تحديث للمستخدمين.', 'Empty — add the first user-facing update.')}
                </p>
              )}
              <ul className="changelog-feed">
                {userEntries.map((e, i) => (
                  <li key={e.id} className="changelog-entry changelog-entry--edit" style={{ ['--i' as string]: i }}>
                    <div className="changelog-entry__meta">
                      <span className="changelog-entry__n tabular-nums" aria-hidden>
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-xs text-error ms-auto"
                        aria-label={t('حذف', 'Delete')}
                        onClick={() => {
                          setUserEntries((prev) => prev.filter((_, idx) => idx !== i));
                          setUserSaved(false);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <Field label={t('التاريخ', 'Date')} value={e.date} onChange={(v) => updateUser(i, { date: v })} />
                    <div className="changelog-draft__grid">
                      <Field
                        label={t('العنوان (عربي)', 'Title (AR)')}
                        value={e.title_ar}
                        onChange={(v) => updateUser(i, { title_ar: v })}
                      />
                      <Field
                        label={t('العنوان (إنجليزي)', 'Title (EN)')}
                        value={e.title_en}
                        onChange={(v) => updateUser(i, { title_en: v })}
                      />
                      <Field
                        label={t('النص (عربي)', 'Body (AR)')}
                        value={e.body_ar}
                        onChange={(v) => updateUser(i, { body_ar: v })}
                        multiline
                      />
                      <Field
                        label={t('النص (إنجليزي)', 'Body (EN)')}
                        value={e.body_en}
                        onChange={(v) => updateUser(i, { body_en: v })}
                        multiline
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <div
                className={`changelog-save-dock${userDirty || userSaved || saveSettings.isError ? ' is-visible' : ''}`}
              >
                <div className="changelog-save-dock__inner">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-1"
                    disabled={saveSettings.isPending || !userDirty}
                    onClick={saveUserChangelog}
                  >
                    {saveSettings.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    {t('حفظ السجل العام', 'Save public changelog')}
                  </button>
                  {userSaved && !userDirty && (
                    <span className="changelog-save-dock__status text-success">
                      <Check size={14} aria-hidden /> {t('تم الحفظ', 'Saved')}
                    </span>
                  )}
                  {saveSettings.isError && (
                    <span className="changelog-save-dock__status text-error">
                      {t('فشل الحفظ', 'Save failed')}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => !deleteMut.isPending && setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          deleteMut.mutate(deleteId, { onSettled: () => setDeleteId(null) });
        }}
        busy={deleteMut.isPending}
        danger
        title={t('حذف هذا الإدخال؟', 'Delete this entry?')}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}

function OwnerLessonView({
  row,
  ar,
  t,
}: {
  row: OwnerChangelogRow;
  ar: boolean;
  t: (a: string, e: string) => string;
}) {
  const hasLesson = lessonHasContent(row.lesson, ar);
  const legacy = ar ? row.body_ar || row.body_en : row.body_en || row.body_ar;

  if (!hasLesson && !legacy.trim()) {
    return (
      <p className="text-sm text-base-content/55">{t('لا تفاصيل إضافية.', 'No extra details.')}</p>
    );
  }

  if (!hasLesson) {
    return (
      <p className="text-sm leading-relaxed text-base-content/80 whitespace-pre-wrap text-pretty">
        {legacy}
      </p>
    );
  }

  return (
    <ol className="changelog-lesson-view">
      {LESSON_SECTIONS.map((sec, i) => {
        const text = ar
          ? row.lesson[sec.key] || row.lesson[sec.enKey]
          : row.lesson[sec.enKey] || row.lesson[sec.key];
        if (!text.trim()) return null;
        return (
          <li key={sec.key} className="changelog-lesson-view__item">
            <p className="changelog-lesson-view__label">
              <span className="changelog-lesson-view__n tabular-nums" aria-hidden>
                {i + 1}
              </span>
              {t(sec.labelAr, sec.labelEn)}
            </p>
            <p className="changelog-lesson-view__text text-pretty whitespace-pre-wrap">{text}</p>
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="changelog-field">
      <span className="profile-field-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="textarea textarea-bordered w-full text-sm resize-y min-h-[5rem]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input input-bordered w-full text-sm"
        />
      )}
    </label>
  );
}
