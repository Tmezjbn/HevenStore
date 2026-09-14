import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Plus, Trash2, X, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import BadgeIcon from '../../components/ui/BadgeIcon';
import { BADGE_ICON_CATALOG, takenBadgeIcons } from '../../lib/badgeIcons';
import { normalizeUsername } from '../../lib/username';
import type { Badge } from '../../types';
import { BADGE_COLS } from '../../lib/dbCols';

interface BadgeForm {
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
}

const EMPTY: BadgeForm = {
  slug: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  icon: '',
};

export default function BadgesPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm] = useState<BadgeForm>(EMPTY);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [awardUser, setAwardUser] = useState('');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [awardMsg, setAwardMsg] = useState('');
  const [awardBusy, setAwardBusy] = useState(false);
  const fieldFocus =
    'focus:outline-none focus:ring-0 focus:border-base-content/40 focus:shadow-none';


  const load = async () => {
    const { data, error: err } = await supabase
      .from('badges')
      .select(BADGE_COLS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) setError(t('تعذر تحميل الشارات', 'Could not load badges'));
    setBadges((data as Badge[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taken = takenBadgeIcons(badges, editing?.id);

  const openCreate = () => {
    const free =
      BADGE_ICON_CATALOG.find((m) => !takenBadgeIcons(badges).has(m.id))?.id ?? 'Award';
    setEditing(null);
    setForm({ ...EMPTY, icon: free });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (b: Badge) => {
    setEditing(b);
    setForm({
      slug: b.slug,
      name_ar: b.name_ar,
      name_en: b.name_en,
      description_ar: b.description_ar,
      description_en: b.description_en,
      icon: b.icon,
    });
    setFormError('');
    setModalOpen(true);
  };

  const setField = (key: keyof BadgeForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setFormError('');
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const icon = form.icon.trim();
    if (!slug || !form.name_en.trim() || !form.name_ar.trim()) {
      setFormError(t('المعرّف والاسم بالعربي والإنجليزي مطلوبة', 'Slug and AR/EN names are required'));
      return;
    }
    if (!icon) {
      setFormError(t('اختر أيقونة فريدة', 'Pick a unique icon'));
      return;
    }
    if (taken.has(icon)) {
      setFormError(t('هذه الأيقونة مستخدمة لشارة أخرى', 'This icon is already used by another badge'));
      return;
    }
    setSaving(true);
    const payload = {
      slug,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      description_ar: form.description_ar.trim(),
      description_en: form.description_en.trim(),
      icon,
    };
    const q = editing
      ? supabase.from('badges').update(payload).eq('id', editing.id).select().single()
      : supabase.from('badges').insert({ ...payload, created_by: user?.id ?? null }).select().single();
    const { data, error: err } = await q;
    setSaving(false);
    if (err) {
      setFormError(
        err.message.includes('unique') || err.message.includes('duplicate')
          ? t('المعرّف أو الأيقونة مستخدمة مسبقاً', 'Slug or icon already in use')
          : t('فشل الحفظ', 'Save failed')
      );
      return;
    }
    if (editing) {
      setBadges((prev) => prev.map((b) => (b.id === editing.id ? data : b)));
    } else {
      setBadges((prev) => [data, ...prev]);
    }
    setModalOpen(false);
  };

  const remove = (id: string) => {
    setDeleteId(id);
  };

  const confirmRemove = async () => {
    if (!deleteId || deleteBusy) return;
    setDeleteBusy(true);
    const { error: err } = await supabase.from('badges').delete().eq('id', deleteId);
    if (err) {
      setError(t('فشل الحذف — قد تكون الشارة مربوطة بكوبون أو مستخدمين', 'Delete failed — badge may be in use'));
    } else {
      setBadges((prev) => prev.filter((b) => b.id !== deleteId));
    }
    setDeleteBusy(false);
    setDeleteId(null);
  };

  const award = async () => {
    setAwardMsg('');
    const raw = awardUser.trim().replace(/^@+/, '');
    if (!raw || !awardBadgeId) {
      setAwardMsg(t('أدخل اسم المستخدم أو البريد واختر شارة', 'Enter username or email and pick a badge'));
      return;
    }
    setAwardBusy(true);
    const byEmail = raw.includes('@');
    let q = supabase.from('profiles').select('id');
    q = byEmail
      ? // Escape ilike wildcards — '%'/'_' in the input must match literally.
        q.ilike('email', raw.toLowerCase().replace(/[%_\\]/g, (ch) => `\\${ch}`))
      : q.eq('username', normalizeUsername(raw));
    const { data: peep, error: pErr } = await q.maybeSingle();
    if (pErr || !peep) {
      setAwardBusy(false);
      setAwardMsg(
        byEmail
          ? t('لم يُعثر على مستخدم بهذا البريد', 'No user found with that email')
          : t('لم يُعثر على مستخدم بهذا الاسم', 'No user found with that username'),
      );
      return;
    }
    const { error: err } = await supabase.from('user_badges').insert({
      user_id: peep.id,
      badge_id: awardBadgeId,
    });
    setAwardBusy(false);
    if (err) {
      setAwardMsg(
        err.message.includes('duplicate') || err.message.includes('unique')
          ? t('المستخدم يملك هذه الشارة مسبقاً', 'User already has this badge')
          : t('فشل المنح', 'Award failed')
      );
      return;
    }
    setAwardMsg(t('تم منح الشارة', 'Badge awarded'));
    setAwardUser('');
  };

  const field = (labelAr: string, labelEn: string, node: ReactNode) => (
    <label className="form-control w-full">
      <span className="label-text text-xs mb-1 opacity-70 text-start">{t(labelAr, labelEn)}</span>
      {node}
    </label>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('الشارات', 'Badges')}</h2>
        <button type="button" onClick={openCreate} className="btn btn-primary btn-sm gap-2">
          <Plus size={14} /> {t('شارة جديدة', 'New badge')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4 text-sm py-2">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setError('')}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="bg-base-200 border border-base-300 rounded-xl p-4 mb-6 space-y-3 max-w-lg mx-auto">
        <h3 className="font-bold flex items-center gap-2">
          <Award size={16} /> {t('منح شارة لمستخدم', 'Award badge to user')}
        </h3>
        <input
          type="text"
          dir="ltr"
          className={`input input-bordered input-sm w-full ${fieldFocus}`}
          placeholder={t('اسم المستخدم أو البريد', 'username or email')}
          value={awardUser}
          onChange={(e) => setAwardUser(e.target.value)}
          aria-label={t('اسم المستخدم أو البريد', 'Username or email')}
        />
        <select
          className={`select select-bordered select-sm w-full ${fieldFocus}`}
          value={awardBadgeId}
          onChange={(e) => setAwardBadgeId(e.target.value)}
        >
          <option value="">{t('اختر شارة…', 'Pick a badge…')}</option>
          {badges.map((b) => (
            <option key={b.id} value={b.id}>
              {lang === 'ar' ? b.name_ar : b.name_en} ({b.slug})
            </option>
          ))}
        </select>
        {awardMsg && <p className="text-sm">{awardMsg}</p>}
        <button type="button" className="btn btn-primary btn-sm gap-2" disabled={awardBusy} onClick={() => void award()}>
          {awardBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {t('منح', 'Award')}
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : badges.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-sm opacity-60">{t('لا توجد شارات', 'No badges')}</div>
        ) : (
          badges.map((b) => (
            <div key={b.id} className="bg-base-200 border border-base-300 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <BadgeIcon icon={b.icon} size={18} className="w-10 h-10" title={b.name_en} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{lang === 'ar' ? b.name_ar : b.name_en}</p>
                  <p className="text-xs font-mono opacity-50" dir="ltr">{b.slug}</p>
                </div>
              </div>
              <p className="text-sm opacity-70 line-clamp-2">
                {lang === 'ar' ? b.description_ar : b.description_en}
              </p>
              <div className="flex gap-2 justify-end mt-auto">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => openEdit(b)}>
                  {t('تعديل', 'Edit')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square text-error"
                  onClick={() => void remove(b.id)}
                  aria-label={t('حذف', 'Delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="badge-modal-title" boxClassName="max-w-md" closeLabel={t('إغلاق', 'Close')}>
        <div className="flex items-center justify-between mb-4">
          <h3 id="badge-modal-title" className="text-lg font-bold">
            {editing ? t('تعديل شارة', 'Edit badge') : t('شارة جديدة', 'New badge')}
          </h3>
          <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm btn-square" aria-label={t('إغلاق', 'Close')}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {field('المعرّف (slug)', 'Slug',
            <input className="input input-bordered input-sm w-full font-mono" dir="ltr" value={form.slug} onChange={(e) => setField('slug', e.target.value)} disabled={!!editing} />
          )}
          {field('الاسم عربي', 'Name AR',
            <input className="input input-bordered input-sm w-full" value={form.name_ar} onChange={(e) => setField('name_ar', e.target.value)} />
          )}
          {field('الاسم إنجليزي', 'Name EN',
            <input className="input input-bordered input-sm w-full" value={form.name_en} onChange={(e) => setField('name_en', e.target.value)} />
          )}
          {field('الوصف عربي', 'Description AR',
            <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2} value={form.description_ar} onChange={(e) => setField('description_ar', e.target.value)} />
          )}
          {field('الوصف إنجليزي', 'Description EN',
            <textarea className="textarea textarea-bordered textarea-sm w-full" rows={2} value={form.description_en} onChange={(e) => setField('description_en', e.target.value)} />
          )}
          <div>
            <p className="label-text text-xs mb-2 opacity-70 text-start">
              {t('أيقونة فريدة (كل شارة أيقونة مختلفة)', 'Unique icon (one per badge)')}
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {BADGE_ICON_CATALOG.map((m) => {
                const used = taken.has(m.id);
                const selected = form.icon === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={used}
                    title={used ? t('مستخدمة', 'Taken') : lang === 'ar' ? m.labelAr : m.labelEn}
                    onClick={() => setField('icon', m.id)}
                    className={`btn btn-square btn-sm p-0 ${selected ? 'btn-primary' : 'btn-ghost'} ${used ? 'opacity-25 cursor-not-allowed' : ''}`}
                  >
                    <BadgeIcon icon={m.id} size={16} className="w-7 h-7" />
                  </button>
                );
              })}
            </div>
          </div>
          {formError && <p className="text-error text-sm" role="alert">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm">{t('إلغاء', 'Cancel')}</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-primary btn-sm gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {t('حفظ', 'Save')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => !deleteBusy && setDeleteId(null)}
        onConfirm={confirmRemove}
        busy={deleteBusy}
        danger
        title={t('حذف هذه الشارة؟', 'Delete this badge?')}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}
