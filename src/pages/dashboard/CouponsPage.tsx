import { useState, useEffect, type ReactNode } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import type { Badge, Coupon } from '../../types';
import { BADGE_COLS, COUPON_COLS } from '../../lib/dbCols';

interface CouponForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_amount: string;
  max_uses: string;
  expires_at: string;
  required_badge_id: string;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  max_uses: '',
  expires_at: '',
  required_badge_id: '',
};

export default function CouponsPage() {
  const { t, lang } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('coupons').select(COUPON_COLS).order('created_at', { ascending: false }).limit(100),
      supabase.from('badges').select(BADGE_COLS).order('name_en').limit(100),
    ]).then(([cRes, bRes]) => {
      if (cRes.error) setError(t('تعذر تحميل الكوبونات.', 'Could not load coupons.'));
      setCoupons((cRes.data as Coupon[] | null) || []);
      setBadges((bRes.data as Badge[] | null) || []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeLabel = (id: string | null | undefined) => {
    if (!id) return null;
    const b = badges.find((x) => x.id === id);
    if (!b) return id;
    return lang === 'ar' ? b.name_ar : b.name_en;
  };

  const toggleCoupon = async (coupon: Coupon) => {
    const { error: err } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);
    if (err) {
      setError(t('فشل التحديث. تحقق من الصلاحيات.', 'Update failed. Check your permissions.'));
      return;
    }
    setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const deleteCoupon = (id: string) => {
    setDeleteId(id);
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteId || deleteBusy) return;
    setDeleteBusy(true);
    const { error: err } = await supabase.from('coupons').delete().eq('id', deleteId);
    if (err) {
      setError(t('فشل الحذف — قد يكون الكوبون مستخدماً في طلبات.', 'Delete failed — the coupon may be used by orders.'));
    } else {
      setCoupons((prev) => prev.filter((c) => c.id !== deleteId));
    }
    setDeleteBusy(false);
    setDeleteId(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const setField = (key: keyof CouponForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveCoupon = async () => {
    setFormError('');
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!code) {
      setFormError(t('أدخل كود الكوبون', 'Enter a coupon code'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError(t('قيمة الخصم غير صالحة', 'Invalid discount value'));
      return;
    }
    if (form.discount_type === 'percentage' && value > 100) {
      setFormError(t('النسبة لا تتجاوز 100%', 'Percentage cannot exceed 100%'));
      return;
    }

    setSaving(true);
    const { data, error: err } = await supabase
      .from('coupons')
      .insert({
        code,
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: value,
        min_order_amount: Number(form.min_order_amount) || 0,
        // 0/negative must become null — the server treats uses_count >= max_uses
        // as exhausted, so a stored 0 would make the coupon instantly dead.
        max_uses: Number(form.max_uses) > 0 ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        required_badge_id: form.required_badge_id || null,
        is_active: true,
      })
      .select()
      .single();
    setSaving(false);
    if (err) {
      setFormError(
        err.message.includes('duplicate') || err.message.includes('unique')
          ? t('هذا الكود مستخدم مسبقاً', 'This code already exists')
          : t('فشل الحفظ. تحقق من الصلاحيات.', 'Save failed. Check your permissions.')
      );
      return;
    }
    setCoupons((prev) => [data, ...prev]);
    setModalOpen(false);
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
        <h2 className="text-xl font-bold">{t('الكوبونات', 'Coupons')}</h2>
        <button type="button" onClick={openCreate} className="btn btn-primary btn-sm gap-2">
          <Plus size={14} /> {t('كوبون جديد', 'New Coupon')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4 text-sm py-2">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setError('')} aria-label={t('إغلاق', 'Dismiss')}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12"><span className="loading loading-spinner loading-md text-primary" /></div>
        ) : coupons.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-sm opacity-60">{t('لا توجد كوبونات', 'No coupons')}</div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="bg-base-200 border border-base-300 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-black font-mono tracking-wider">{coupon.code}</span>
                <span className={`badge badge-sm ${coupon.is_active ? 'badge-success' : 'badge-ghost'}`}>
                  {coupon.is_active ? t('نشط', 'Active') : t('معطّل', 'Disabled')}
                </span>
              </div>
              <p className="text-sm text-primary font-bold mb-1">
                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`} {t('خصم', 'off')}
              </p>
              {coupon.description && <p className="text-xs text-base-content/65 mb-2">{coupon.description}</p>}
              {coupon.required_badge_id && (
                <p className="text-xs text-warning mb-3">
                  {t('يتطلب شارة', 'Requires badge')}: {badgeLabel(coupon.required_badge_id)}
                </p>
              )}
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>{coupon.uses_count} / {coupon.max_uses || '∞'} {t('استخدام', 'uses')}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCoupon(coupon)}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={coupon.is_active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                  >
                    {coupon.is_active ? <ToggleRight size={16} className="text-primary" /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCoupon(coupon.id)}
                    className="btn btn-ghost btn-xs btn-square text-error"
                    aria-label={t('حذف', 'Delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        labelledBy="coupon-modal-title"
        boxClassName="max-w-md"
        closeLabel={t('إغلاق', 'Close')}
      >
            <div className="flex items-center justify-between mb-4">
              <h3 id="coupon-modal-title" className="text-lg font-bold">{t('كوبون جديد', 'New Coupon')}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm btn-square" aria-label={t('إغلاق', 'Close')}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {field('الكود', 'Code',
                <input
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                  dir="ltr"
                  className="input input-bordered input-sm w-full font-mono tracking-wider"
                />
              )}
              {field('الوصف (اختياري)', 'Description (optional)',
                <input
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                {field('نوع الخصم', 'Discount type',
                  <select
                    value={form.discount_type}
                    onChange={(e) => setField('discount_type', e.target.value)}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="percentage">{t('نسبة %', 'Percentage %')}</option>
                    <option value="fixed">{t('مبلغ ثابت $', 'Fixed $')}</option>
                  </select>
                )}
                {field(form.discount_type === 'percentage' ? 'النسبة %' : 'المبلغ $', form.discount_type === 'percentage' ? 'Percent %' : 'Amount $',
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) => setField('discount_value', e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('حد أدنى للطلب $ (اختياري)', 'Min order $ (optional)',
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_order_amount}
                    onChange={(e) => setField('min_order_amount', e.target.value)}
                    className="input input-bordered input-sm w-full"
                  />
                )}
                {field('حد الاستخدامات (اختياري)', 'Max uses (optional)',
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setField('max_uses', e.target.value)}
                    placeholder="∞"
                    className="input input-bordered input-sm w-full"
                  />
                )}
              </div>
              {field('تاريخ الانتهاء (اختياري)', 'Expires at (optional)',
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setField('expires_at', e.target.value)}
                  className="input input-bordered input-sm w-full"
                />
              )}
              {field('شارة مطلوبة (اختياري)', 'Required badge (optional)',
                <select
                  value={form.required_badge_id}
                  onChange={(e) => setField('required_badge_id', e.target.value)}
                  className="select select-bordered select-sm w-full"
                >
                  <option value="">{t('بدون', 'None')}</option>
                  {badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {lang === 'ar' ? b.name_ar : b.name_en}
                    </option>
                  ))}
                </select>
              )}

              {formError && <p className="text-error text-sm" role="alert">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost btn-sm">
                  {t('إلغاء', 'Cancel')}
                </button>
                <button type="button" onClick={saveCoupon} disabled={saving} className="btn btn-primary btn-sm gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {t('إنشاء', 'Create')}
                </button>
              </div>
            </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => !deleteBusy && setDeleteId(null)}
        onConfirm={confirmDeleteCoupon}
        busy={deleteBusy}
        danger
        title={t('هل أنت متأكد؟', 'Are you sure?')}
        confirmLabel={t('حذف', 'Delete')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}
